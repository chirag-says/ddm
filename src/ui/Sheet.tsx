import React, { useCallback, useEffect } from 'react';
import { Modal, Pressable, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { deceleration, gesture, spring, timing, useTheme } from '@/theme';
import { Text } from './Text';
import { useKeyboardHeight } from './useKeyboardHeight';

/**
 * Bottom sheet.
 *
 * The four properties that separate a sheet that feels physical from one that
 * feels like a slideshow:
 *
 *  1. 1:1 tracking. While dragging, the sheet is glued to the finger. Feedback
 *     is continuous through the gesture, not applied once at the end.
 *  2. Interruptibility. The drag can start while the sheet is still animating,
 *     and the spring picks up from the current on-screen value rather than
 *     snapping to the target first.
 *  3. Momentum projection. The dismiss decision uses where the throw is HEADING,
 *     not where the finger happened to lift. A fast flick downward dismisses
 *     even from near the top; a slow drag past halfway also dismisses.
 *  4. Velocity handoff. The release velocity is passed into the spring, so
 *     there is no seam between dragging and animating.
 *
 * Upward drag is rubber-banded rather than hard-stopped: the sheet resists
 * progressively instead of freezing, which reads as "responsive, but there is
 * nothing more up here".
 *
 * Under reduced motion the whole thing becomes an opacity cross-fade and the
 * drag is disabled, since a large translating surface is exactly what that
 * setting exists to suppress.
 */

const RUBBER_BAND_CONSTANT = 0.55;
/** Fraction of sheet height past which a slow drag still dismisses. */
const DISMISS_THRESHOLD = 0.5;

function rubberband(overshoot: number, dimension: number): number {
  'worklet';
  return (
    (overshoot * dimension * RUBBER_BAND_CONSTANT) /
    (dimension + RUBBER_BAND_CONSTANT * Math.abs(overshoot))
  );
}

/**
 * Exponential-decay projection, matching platform scroll deceleration. The
 * textbook v^2/(2a) form is not what the platform ships and reads noticeably
 * differently.
 */
function project(velocity: number): number {
  'worklet';
  const rate = deceleration.fast;
  return (velocity / 1000) * (rate / (1 - rate));
}

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /**
   * Fraction of screen height the sheet may grow to. A CEILING, not a size
   * (2026-09-06): the sheet is as tall as its content up to this, and the
   * content decides. It used to be the sheet's fixed height, and a body a
   * few points taller than the ratio allowed was clipped at the bottom, which
   * is where every sheet keeps its Cancel. Sheets whose content can exceed
   * the ceiling scroll it themselves; the ceiling is what bounds that scroll.
   */
  heightRatio?: number;
}

/**
 * The modal shell. The body is a separate component so that its safe-area
 * insets come from a provider INSIDE the modal (2026-09-06).
 *
 * A React Native Modal on Android is its own native window. The root
 * provider's insets describe the app's window, not this one, and the two
 * disagree exactly when it matters: with three-button navigation the modal
 * either does not extend under the bar (so the root's 48pt bottom inset is
 * spent on nothing) or does (so it is needed). A provider mounted inside the
 * modal measures the modal's own window and answers correctly either way,
 * which is what puts the sheet's Cancel above the bar instead of under it.
 */
export function Sheet(props: SheetProps) {
  return (
    <Modal
      visible={props.visible}
      transparent
      animationType="none"
      onRequestClose={props.onClose}
      // Android. The app draws edge-to-edge, and a Modal that is not told to
      // do the same gets its own window that stops at the system bars, so the
      // scrim ended above the navigation bar. With both bars translucent the
      // modal covers the screen like every other surface.
      statusBarTranslucent
      navigationBarTranslucent
    >
      <SafeAreaProvider>
        <SheetBody {...props} />
      </SafeAreaProvider>
    </Modal>
  );
}

function SheetBody({
  visible,
  onClose,
  title,
  children,
  heightRatio = 0.6,
}: SheetProps) {
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const reduceMotion = useReducedMotion();

  /**
   * The keyboard, which the sheet has to get out of the way of itself
   * (2026-09-14).
   *
   * A `KeyboardAvoidingView` INSIDE a sheet cannot fix this. The sheet is
   * bottom-anchored by the `justify-end` below, so the keyboard covers it from
   * the bottom up — the surface that has to move is the one the sheet's own
   * content sits in, not the content. Every sheet in the app that asks for
   * text (report, close deal, save search, shortlist note, phone verification,
   * book a unit) had its fields under the keyboard for this reason.
   *
   * The keyboard is drawn OVER the bottom system bar, and the sheet already
   * reserves `insets.bottom` for that bar, so only the part above it is new
   * space to find. Adding the raw height would leave a navigation-bar-sized
   * gap between the sheet and the keyboard.
   */
  const keyboardHeight = useKeyboardHeight();
  const keyboardOverlay = Math.max(0, keyboardHeight - insets.bottom);

  /*
    The ceiling, further bounded by what is actually left on screen.

    `heightRatio` is a fraction of the WHOLE screen, so a 0.85 sheet with a
    keyboard up asks for more room than exists and would run off the top under
    the status bar, taking its title and grab handle with it. Clamping here
    also means the body's own scroll view gets a real bound to scroll within
    rather than being pushed past the edge.
  */
  const ceiling = Math.round(screenHeight * heightRatio) + insets.bottom;
  const sheetHeight = Math.max(
    0,
    Math.min(ceiling, screenHeight - insets.top - keyboardOverlay)
  );
  /*
    How far down "off screen" is, which is NOT the sheet's height once the
    keyboard is up: the sheet is sitting `keyboardOverlay` above the bottom of
    the screen, so travelling its own height leaves that much of it still
    visible over the keyboard as it dismisses.
  */
  const dismissDistance = sheetHeight + keyboardOverlay;

  const translateY = useSharedValue(dismissDistance);
  const opacity = useSharedValue(0);
  // The sheet's actual height, measured, since it is content-sized. The
  // drag-to-dismiss threshold is a fraction of what is on screen, not of the
  // ceiling: a short sheet should not need to travel half the screen to close.
  const measured = useSharedValue(sheetHeight);

  const close = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: timing.base });
      translateY.value = reduceMotion
        ? withTiming(0, { duration: timing.base })
        : withSpring(0, {
            dampingRatio: spring.sheet.dampingRatio,
            duration: spring.sheet.duration,
          });
    } else {
      opacity.value = withTiming(0, { duration: timing.fast });
      translateY.value = reduceMotion
        ? withTiming(dismissDistance, { duration: timing.fast })
        : withSpring(dismissDistance, {
            dampingRatio: spring.sheet.dampingRatio,
            duration: spring.sheet.duration,
          });
    }
  }, [visible, reduceMotion, dismissDistance, opacity, translateY]);

  const startY = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .enabled(!reduceMotion)
    .activeOffsetY([-gesture.hysteresis, gesture.hysteresis])
    .onStart(() => {
      // Start from the PRESENTATION value so grabbing a sheet mid-animation
      // continues from where it visibly is instead of jumping to the target.
      startY.value = translateY.value;
    })
    .onUpdate((event) => {
      const next = startY.value + event.translationY;
      translateY.value =
        next < 0 ? rubberband(next, measured.value) : next;
    })
    .onEnd((event) => {
      const projected = translateY.value + project(event.velocityY);

      if (projected > measured.value * DISMISS_THRESHOLD) {
        translateY.value = withSpring(
          dismissDistance,
          {
            dampingRatio: spring.sheet.dampingRatio,
            duration: spring.sheet.duration,
            velocity: event.velocityY,
          },
          () => runOnJS(close)()
        );
      } else {
        translateY.value = withSpring(0, {
          dampingRatio: spring.sheet.dampingRatio,
          duration: spring.sheet.duration,
          velocity: event.velocityY,
        });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const scrimStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const { sheet } = theme.elevation;

  return (
      <View className="flex-1 justify-end">
        <Animated.View
          style={[{ backgroundColor: theme.colors.scrim }, scrimStyle]}
          className="absolute inset-0"
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            className="flex-1"
            onPress={close}
          />
        </Animated.View>

        <GestureDetector gesture={panGesture}>
          <Animated.View
            onLayout={(event) => {
              measured.value = event.nativeEvent.layout.height;
            }}
            style={[
              {
                maxHeight: sheetHeight,
                /*
                  The lift, on the SURFACE rather than on the container above.

                  Padding the container would move the sheet just as well, but
                  the scrim is an absolutely positioned child of it and Yoga
                  resolves `inset-0` against the padding box — so the scrim
                  would stop short of the bottom of the screen and the strip
                  behind the keyboard would go uncovered. A margin here leaves
                  the container full-bleed and moves only what has to move.
                */
                marginBottom: keyboardOverlay,
                paddingBottom: insets.bottom,
                shadowColor: '#000',
                shadowOpacity: sheet.shadowOpacity,
                shadowRadius: sheet.shadowRadius,
                shadowOffset: { width: 0, height: sheet.shadowOffsetY },
                elevation: sheet.elevation,
              },
              sheetStyle,
            ]}
            className="rounded-t-2xl bg-surface"
          >
            <View className="items-center py-md">
              <View className="h-xs w-4xl rounded-full bg-border-strong" />
            </View>

            {title ? (
              <View className="border-b border-border px-base pb-md">
                <Text variant="title3">{title}</Text>
              </View>
            ) : null}

            {/* Shrinkable, not `flex-1`: the body takes its content's height
                and gives way to the ceiling, which is what lets a consumer's
                own ScrollView scroll instead of the sheet clipping it.

                This makes the body an AUTO-HEIGHT container, and children must
                be written for one. A `flex-1` child gets `flexBasis: 0` and
                grows into free space, and an auto-height parent has no free
                space to give — Yoga zeroes the remaining space rather than
                expanding — so it lays out at zero height and disappears. That
                is what emptied the book-a-unit sheet (2026-09-14): it wrapped
                its form in a `flex-1` KeyboardAvoidingView and rendered a
                handle, a title and nothing else. Children that need to fill
                should use `flexShrink: 1` and let their content size them. */}
            <View className="px-base pt-base" style={{ flexShrink: 1 }}>
              {children}
            </View>
          </Animated.View>
        </GestureDetector>
      </View>
  );
}
