import Ionicons from '@expo/vector-icons/Ionicons';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing, touchTarget } from '@/theme';
import { Image, PressableScale, Text } from '@/ui';
import type { GalleryImage } from '../types';
import { ZoomableImage } from './ZoomableImage';

/**
 * Full-screen photo viewer: swipe, pinch to zoom, filmstrip.
 *
 * Moved out of `app/property/[id]/gallery.tsx` on 2026-10-26 so project and
 * unit photos open in the same viewer instead of a second one. The property
 * route still owns loading and its empty and error states; this owns only the
 * viewing. `PhotoViewerModal` is the same viewer over the current screen, for
 * places that have the photos in hand and no route of their own.
 *
 * ---------------------------------------------------------------------------
 * BLACK IS NOT THE PROBLEM. THE EMPTY BLACK WAS.
 *
 * Black stays: a photo viewer is the one place in this app where the
 * surrounding colour is a tool rather than a style, since anything lighter than
 * the darkest tone in the image competes with it and a light theme's off-white
 * makes every photograph look washed out.
 *
 * What was wrong was that a 3:2 photograph on a 19.5:9 phone leaves roughly 40%
 * of the screen empty, and the old layout put nothing in it but a 12pt "1 of 6"
 * — so the screen read as one image marooned in a void, with no sign that five
 * others existed or how to reach them. The two available answers were both bad:
 * stretching distorts the photograph, cropping to fill throws away the parts of
 * it the owner chose to include.
 *
 * The third answer is to use the space. A thumbnail filmstrip lives in the
 * lower band, and it earns its place three times over — it shows the
 * neighbouring images (which is what §10 asks for, without shrinking the
 * current one by a single point), it makes the set's SIZE visible at a glance,
 * and it is a direct jump to any photo rather than N swipes. The image itself
 * is untouched: same aspect, same size, still centred.
 *
 * One pagination system, per the brief: the filmstrip's selected thumbnail IS
 * the position indicator. The "3 of 6" line above it is a count, not a second
 * set of dots.
 *
 * The strip is dropped for a single image, where there is nothing to navigate
 * and a one-item filmstrip is furniture.
 */

/** Big enough to recognise a room in, small enough to leave the photo alone. */
const THUMB = 52;

export interface PhotoViewerProps {
  /** Non-empty. Callers show their own empty state. */
  images: readonly GalleryImage[];
  initialIndex?: number;
  onClose: () => void;
}

export function PhotoViewer({ images, initialIndex = 0, onClose }: PhotoViewerProps) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const count = images.length;

  // Clamped once: an out-of-range deep link lands on the last photo, not on an
  // empty page, and a NaN would make the initial scroll throw.
  const startIndex = useRef(Math.min(Math.max(0, initialIndex || 0), Math.max(0, count - 1))).current;

  const [index, setIndex] = useState(startIndex);
  const [paging, setPaging] = useState(true);

  const pagerRef = useRef<FlatList>(null);
  const stripRef = useRef<FlatList>(null);

  // Read inside the scroll handler, which must not re-subscribe on every page
  // change, so it is held in a ref rather than captured in the closure.
  const widthRef = useRef(width);
  widthRef.current = width;

  const handleMomentumEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(event.nativeEvent.contentOffset.x / widthRef.current));
  }, []);

  // A zoomed photo owns the drag; paging resumes when it snaps back. See
  // ZoomableImage for why this is React state and not a shared value.
  const handleZoomChange = useCallback((zoomed: boolean) => setPaging(!zoomed), []);

  const jumpTo = useCallback((next: number) => {
    setIndex(next);
    pagerRef.current?.scrollToIndex({ index: next, animated: false });
  }, []);

  /**
   * Keeps the selected thumbnail on screen when the page changed by SWIPE
   * rather than by tapping the strip. Without it, swiping past the fourth photo
   * selects a thumbnail nobody can see.
   *
   * `viewPosition: 0.5` centres it, so there is always a neighbour visible on
   * each side — which is the whole reason the strip is here.
   */
  useEffect(() => {
    if (count < 2) return;
    stripRef.current?.scrollToIndex({
      index: Math.min(index, count - 1),
      animated: true,
      viewPosition: 0.5,
    });
  }, [index, count]);

  const safeIndex = Math.min(index, count - 1);
  const current = images[safeIndex];
  const multiple = count > 1;

  /**
   * The strip's band, reserved out of the pager's height rather than laid over
   * it. Overlaying would put the thumbnails on the photograph on a short
   * device, which is exactly the collision the empty band exists to avoid.
   */
  const stripBand = multiple ? THUMB + spacing.base * 2 + 22 : 0;
  const pagerHeight = height - insets.bottom - stripBand;

  return (
    <View className="flex-1 bg-black">
      <StatusBar style="light" />

      <FlatList
        ref={pagerRef}
        data={images}
        horizontal
        pagingEnabled={paging}
        scrollEnabled={paging && multiple}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item, i) => `${item.uri}-${i}`}
        initialScrollIndex={startIndex}
        onMomentumScrollEnd={handleMomentumEnd}
        // Current plus one either side, which is the working set §25 asks for.
        initialNumToRender={1}
        windowSize={3}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        style={{ height: pagerHeight }}
        renderItem={({ item }) => (
          <ZoomableImage uri={item.uri} width={width} height={pagerHeight} onZoomChange={handleZoomChange} />
        )}
      />

      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Close photos"
        onPress={onClose}
        activeScale={0.9}
        style={{
          position: 'absolute',
          left: spacing.md,
          top: insets.top + spacing.sm,
          width: touchTarget.min,
          height: touchTarget.min,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/*
          Darker than the old `white/15`. That fill was invisible against a pale
          photograph, which is exactly when a close button has to be findable;
          a dark disc with a white glyph is legible over every image, the same
          rule the hero's chrome follows.
        */}
        <View
          className="items-center justify-center rounded-full"
          style={{ width: 36, height: 36, backgroundColor: 'rgba(0,0,0,0.55)' }}
        >
          <Ionicons name="close" size={22} color="#ffffff" />
        </View>
      </PressableScale>

      {multiple ? (
        <View style={{ paddingBottom: insets.bottom }}>
          {/*
            Label and count on one line. The room label is per-photo and often
            absent; the count never is, so it is pinned right and the label
            takes whatever is left rather than the two fighting for the centre.
          */}
          <View
            className="flex-row items-center justify-between"
            style={{ paddingHorizontal: spacing.base, height: 22 }}
          >
            <Text variant="caption" numberOfLines={1} className="flex-1 text-white/70">
              {current?.label ?? ''}
            </Text>
            <Text variant="caption" className="ml-sm text-white/70">
              {safeIndex + 1} of {count}
            </Text>
          </View>

          <FlatList
            ref={stripRef}
            data={images}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, i) => `thumb-${item.uri}-${i}`}
            contentContainerStyle={{
              paddingHorizontal: spacing.base,
              paddingVertical: spacing.base,
              gap: spacing.sm,
            }}
            getItemLayout={(_, i) => ({
              length: THUMB + spacing.sm,
              offset: (THUMB + spacing.sm) * i,
              index: i,
            })}
            renderItem={({ item, index: i }) => (
              <Thumb
                uri={item.uri}
                label={item.label}
                position={i + 1}
                total={count}
                selected={i === safeIndex}
                onPress={() => jumpTo(i)}
              />
            )}
          />
        </View>
      ) : // One photo: no strip, no "1 of 1". Just the room, if it has one.
      current?.label ? (
        <View
          className="w-full items-center"
          style={{ paddingBottom: insets.bottom + spacing.lg }}
          pointerEvents="none"
        >
          <Text variant="footnote" className="text-white/70">
            {current.label}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export interface PhotoViewerModalProps {
  images: readonly GalleryImage[];
  /** The photo to open on; `null` keeps the viewer closed. */
  openAt: number | null;
  onClose: () => void;
}

/**
 * The viewer over the current screen, for photos a screen already has.
 *
 * A `Modal` is its own native root on Android, outside the app's
 * `GestureHandlerRootView`, so pinch and pan inside it need a root of their
 * own or `ZoomableImage` never sees a touch. `onRequestClose` is the Android
 * back button, which closes the photos rather than leaving the page.
 */
export function PhotoViewerModal({ images, openAt, onClose }: PhotoViewerModalProps) {
  if (images.length === 0) return null;
  return (
    <Modal visible={openAt !== null} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <GestureHandlerRootView style={{ flex: 1 }}>
        {openAt !== null ? <PhotoViewer images={images} initialIndex={openAt} onClose={onClose} /> : null}
      </GestureHandlerRootView>
    </Modal>
  );
}

/**
 * One filmstrip thumbnail.
 *
 * Selection is carried by a white border AND by full opacity against 45% for
 * the rest — two channels, because a border alone is easy to lose against a
 * pale photograph and opacity alone is not a state a colour-blind user can
 * name. The target runs to the full 44 in height while the visible square stays
 * 52 wide, so the row is thumbable without the thumbnails growing.
 */
function Thumb({
  uri,
  label,
  position,
  total,
  selected,
  onPress,
}: {
  uri: string;
  label?: string;
  position: number;
  total: number;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label ? `${label}, photo ${position} of ${total}` : `Photo ${position} of ${total}`}
      onPress={onPress}
      activeScale={0.92}
      style={{ width: THUMB, height: THUMB }}
    >
      <Image
        uri={uri}
        size="thumb"
        style={{
          width: THUMB,
          height: THUMB,
          borderRadius: 8,
          opacity: selected ? 1 : 0.45,
          borderWidth: 2,
          borderColor: selected ? '#FFFFFF' : 'transparent',
        }}
      />
    </PressableScale>
  );
}
