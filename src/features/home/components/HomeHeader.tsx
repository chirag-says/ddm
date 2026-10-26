import Ionicons from '@expo/vector-icons/Ionicons';
import { Image as ExpoImage } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { gesture, radius, useTheme } from '@/theme';
import { Avatar, PressableScale, Text } from '@/ui';
import type { City } from '../cities';
import {
  HEADER_ROW_PX,
  HEADER_TOP_PX,
  HERO_BOTTOM_PX,
  HERO_SEARCH_PILL_PX,
  HERO_TEXT,
  useHeroScheme,
  useMockScale,
} from '../heroTheme';
import { HomeSearchField } from './HomeSearchField';

/**
 * The sticky header, drawn to the reference mockup (measured pass, 2026-09-05).
 *
 * Every number below is a reference pixel through `mockPx`; see
 * `heroTheme.ts` for why. Measured from the mockup:
 *
 *   wordmark        x 40, y 95 (25 below the status bar), 258 wide
 *   city chip       right-aligned group, 48 tall, scheme glass (useHeroScheme)
 *   avatar          60 circle, scheme fill (useHeroScheme); 30 from the right edge
 *   controls        centred on the wordmark's line, 14 apart
 *
 * The wordmark is the website's `dealdirect_logo.png`, drawn as it is: no
 * tagline under it (2026-09-06). The city chip is smaller than the circle
 * beside it so the wordmark keeps its full width on a narrow phone;
 * before, a 230-wide chip left the logo's `flex: 1` column too little room
 * and the image shrank to fit. The avatar uses the dock's own glyph at rest,
 * `person-outline`, so the same destination looks the same at the top of the
 * screen and the bottom.
 *
 * No bell (2026-10-26): it opened the Updates tab the dock already holds, and
 * its unread dot moved onto the dock's Updates icon. The owner button took the
 * room, grew to 56 tall, and says "Post property": "listing" is trade jargon.
 *
 * ---------------------------------------------------------------------------
 * TRANSPARENT AT REST, SOLID ONCE SCROLLED
 *
 * At the top of the page the bar has no fill: the photograph runs up under
 * it and the sky is what the wordmark sits on. As the page scrolls the fill
 * fades in to the hero's own near-black over the window in which the search
 * field arrives, so the moment the bar has content to separate from, it has
 * a colour to do it with.
 *
 * THE HANDOVER IS ONE SLAB REPLACING ANOTHER (2026-09-06). The bar's fill has
 * the hero's two bottom corners, and its pinned row ends the same distance
 * under the pill that the hero's block does. The hero reports the pin from
 * the pill's own top, so at the moment the hero's curved bottom edge reaches
 * the bar's bottom, the bar's identical curved edge is already there, and
 * the eye sees the hero stop rather than a second bar appear over it.
 */

export interface HomeHeaderProps {
  /** Live scroll offset, from the reveal host. */
  scrollY: SharedValue<number>;
  /**
   * Scroll offset at which the hero's search field reaches this bar, measured
   * by the hero. 0 while unmeasured, which keeps this copy hidden.
   */
  pinOffset: number;
  name?: string;
  avatarUri?: string;
  city: City | null;
  /** Shared with the hero's copy — they are one field. See `HomeSearchField`. */
  searchValue: string;
  onSearchValueChange: (value: string) => void;
  onSubmitSearch: (term: string) => void;
  onOpenProperty: (id: string) => void;
  onOpenProfile: () => void;
  onOpenCityPicker: () => void;
  /**
   * The signed-in user is an owner with no listing yet. The city chip gives
   * way to "Add listing" for them (2026-09-06): an owner account exists to
   * post one property, and until it has, that is the thing the top of Home
   * should offer. Everyone else keeps the city chip.
   */
  canList?: boolean;
  onAddListing?: () => void;
}

/** How many scrolled pixels the crossfade between the two field copies takes. */
export const SEARCH_PIN_WINDOW = 10;

/**
 * The pinned row: the pill plus the same room under it that the hero keeps,
 * so the bar's bottom lands where the hero's bottom was. See the module doc.
 */
const SEARCH_ROW_PX = HERO_SEARCH_PILL_PX + HERO_BOTTOM_PX;

/** The wordmark asset is 308×82; the reference renders it 258 wide. */
const LOGO_WIDTH_PX = 258;
const LOGO_HEIGHT_PX = (LOGO_WIDTH_PX * 82) / 308;

export function HomeHeader({
  scrollY,
  pinOffset,
  name,
  avatarUri,
  city,
  searchValue,
  onSearchValueChange,
  onSubmitSearch,
  onOpenProperty,
  onOpenProfile,
  onOpenCityPicker,
  canList = false,
  onAddListing,
}: HomeHeaderProps) {
  const insets = useSafeAreaInsets();
  const mockPx = useMockScale();
  const hero = useHeroScheme();
  const theme = useTheme();
  // Read live, not once at import: on a large screen the app rotates, and a
  // height captured at launch would leave the focused search short or tall.
  const { height: windowHeight } = useWindowDimensions();

  const [searchFocused, setSearchFocused] = useState(false);

  // Nothing until the hero has reported where its field actually is. A
  // guessed pin would hand over at the wrong pixel, which is the one failure
  // this whole arrangement exists to avoid.
  const armed = pinOffset > 0;

  const fillStyle = useAnimatedStyle(() => {
    if (searchFocused) return { opacity: 1 };
    if (!armed) return { opacity: 0 };
    return {
      opacity: interpolate(scrollY.value, [0, Math.max(pinOffset, 1)], [0, 1], Extrapolation.CLAMP),
    };
  }, [pinOffset, armed, searchFocused]);

  const searchRow = mockPx(SEARCH_ROW_PX);

  const searchRowStyle = useAnimatedStyle(() => {
    if (searchFocused) return { height: windowHeight, opacity: 1 };
    if (!armed) return { height: 0, opacity: 0 };

    const progress = interpolate(
      scrollY.value,
      [pinOffset, pinOffset + SEARCH_PIN_WINDOW],
      [0, 1],
      Extrapolation.CLAMP
    );

    // Full height the instant the pin is crossed, rather than growing with
    // the fade: a growing box would clip the field and reveal it top-down.
    return {
      height: progress > 0 ? searchRow : 0,
      opacity: progress,
    };
  }, [pinOffset, armed, searchFocused, searchRow, windowHeight]);

  const control = {
    width: mockPx(60),
    height: mockPx(60),
    borderRadius: mockPx(30),
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: hero.headerGlass,
  };

  return (
    <View style={[styles.host, { paddingTop: insets.top + mockPx(HEADER_TOP_PX) }]}>
      {/* The hero is a photograph in every scheme, so the status bar is light
          on Home regardless of the theme. */}
      <StatusBar style="light" />

      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: hero.slab,
            // The hero's own corners, so the pinned bar reads as the hero's
            // slab held in place rather than a strip laid over the page.
            borderBottomLeftRadius: radius.xl,
            borderBottomRightRadius: radius.xl,
          },
          fillStyle,
        ]}
      />

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          height: mockPx(HEADER_ROW_PX),
          paddingLeft: mockPx(40),
          paddingRight: mockPx(30),
        }}
      >
        {/* Identity: the website's wordmark, and what it stands for. */}
        <View style={{ flex: 1 }}>
          <ExpoImage
            source={require('../../../../assets/home/brand/logo.png')}
            style={{ width: mockPx(LOGO_WIDTH_PX), height: mockPx(LOGO_HEIGHT_PX) }}
            contentFit="contain"
            contentPosition="left"
            accessibilityLabel="DealDirect"
            cachePolicy="memory"
          />
        </View>

        {/* The controls sit on the wordmark's line, not the block's centre. */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            height: mockPx(LOGO_HEIGHT_PX),
            marginTop: mockPx(-8),
            gap: mockPx(14),
          }}
        >
          {canList && onAddListing ? (
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Post your property"
              onPress={onAddListing}
              activeScale={0.96}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: mockPx(8),
                height: mockPx(56),
                paddingHorizontal: mockPx(22),
                borderRadius: mockPx(28),
                backgroundColor: theme.colors.brand,
              }}
            >
              <Ionicons name="add-circle-outline" size={mockPx(26)} color={HERO_TEXT} />
              <Text
                variant="bodyEmphasis"
                numberOfLines={1}
                style={{ color: HERO_TEXT, fontSize: mockPx(24), lineHeight: mockPx(30) }}
              >
                Post property
              </Text>
            </PressableScale>
          ) : (
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={
                city ? `Searching in ${city.label}. Change city` : 'Choose a city to search in'
              }
              onPress={onOpenCityPicker}
              activeScale={0.96}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: mockPx(8),
                height: mockPx(48),
                maxWidth: mockPx(210),
                paddingHorizontal: mockPx(16),
                borderRadius: mockPx(24),
                backgroundColor: hero.headerGlass,
              }}
            >
              <Ionicons name="location-outline" size={mockPx(22)} color={hero.headerInk} />
              <Text
                variant="bodyEmphasis"
                numberOfLines={1}
                style={{ color: hero.headerInk, fontSize: mockPx(21), lineHeight: mockPx(26), flexShrink: 1 }}
              >
                {city ? city.label : 'All cities'}
              </Text>
              <Ionicons name="chevron-down" size={mockPx(18)} color={hero.headerInk} />
            </PressableScale>
          )}

          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Your account"
            hitSlop={gesture.hitSlop}
            onPress={onOpenProfile}
            activeScale={0.94}
            style={{ ...control, backgroundColor: hero.avatarFill }}
          >
            {name ? (
              <Avatar uri={avatarUri} name={name} size="sm" />
            ) : (
              <Ionicons name="person-outline" size={mockPx(32)} color={hero.headerInk} />
            )}
          </PressableScale>
        </View>
      </View>

      {/* The pinned copy of the hero's field. Same component, same geometry.
          `overflow: 'hidden'` keeps it clipped to zero before the pin, which
          is also what stops the not-yet-pinned copy from taking taps meant for
          the hero underneath. */}
      <Animated.View style={[styles.searchRow, { paddingHorizontal: mockPx(34) }, searchRowStyle]}>
        <HomeSearchField
          city={city}
          value={searchValue}
          onChangeText={onSearchValueChange}
          onSubmit={onSubmitSearch}
          onOpenProperty={onOpenProperty}
          onFocusChange={setSearchFocused}
          flush
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  searchRow: {
    overflow: 'hidden',
  },
});
