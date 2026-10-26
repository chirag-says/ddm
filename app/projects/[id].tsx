import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, Share, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedRef, useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { WEB_URL } from '@/config/env';
import {
  adaptProjectDetail,
  unitSummary,
  type ConnectivityKind,
  type ProjectDetailView,
  type ProjectFactKey,
  useProjectDetail,
  useUnitTypesForProject,
} from '@/features/projects';
import {
  DetailHeader,
  DetailIconList,
  ExpandableText,
  HEADER_BAR_HEIGHT,
} from '@/features/properties';
import { gesture, screenPadding, spacing, useTheme } from '@/theme';
import type { UnitType } from '@/types/backend/project';
import {
  Avatar,
  Badge,
  Button,
  Card,
  ErrorState,
  formatPrice,
  Image,
  PressableScale,
  PriceLabel,
  Screen,
  Skeleton,
  Text,
} from '@/ui';

/**
 * The gallery's height, derived from the width rather than fixed.
 *
 * Same reasoning as `DetailHero.heroHeight`: a fixed height over a variable
 * width is a fixed CROP over a variable one, so the same project showed more
 * sky on a larger phone. Clamped so a tablet-width device does not hand the
 * photo two thirds of the page.
 */
function galleryHeight(width: number): number {
  return Math.round(Math.min(Math.max(width * 0.72, 240), 360));
}

/** Amenities shown before "Show all": three rows of the two-column list. */
const AMENITY_PREVIEW = 6;

const FACT_ICON: Record<ProjectFactKey, keyof typeof Ionicons.glyphMap> = {
  possession: 'key-outline',
  launch: 'flag-outline',
  towers: 'business-outline',
  units: 'home-outline',
  land: 'resize-outline',
};

const CONNECTIVITY_ICON: Record<ConnectivityKind, keyof typeof Ionicons.glyphMap> = {
  metro: 'subway-outline',
  airport: 'airplane-outline',
  railway: 'train-outline',
  bus: 'bus-outline',
};

/**
 * Project detail, laid out like the property detail page (2026-10-26).
 *
 * It used to stop at name, price, description and unit types, while the API
 * returned possession dates, tower counts, distances and nearby places that
 * nothing read, and its amenities never rendered (see `adaptProjectDetail`).
 * The nav bar is the property page's `DetailHeader`, so the page no longer
 * scrolls bare under the status bar. Enquiry happens per unit, so the one
 * action here takes the buyer to the units.
 */
export default function ProjectDetailScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { project, isLoading, error, refresh } = useProjectDetail(id);
  const {
    unitTypes,
    isLoading: unitTypesLoading,
    error: unitTypesError,
    retry: retryUnitTypes,
  } = useUnitTypesForProject(id);

  const detail = useMemo(() => (project ? adaptProjectDetail(project) : null), [project]);

  /**
   * Pull-to-refresh used to pass `refreshing={false}` unconditionally, so the
   * gesture fired the request and showed nothing — the one thing a refresh
   * control exists to communicate. `useProjectDetail` exposes no in-flight
   * flag, so this screen owns one for the duration of the refetch.
   */
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });
  const scrollRef = useAnimatedRef<Animated.ScrollView>();

  const [photoIndex, setPhotoIndex] = useState(0);
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [unitsY, setUnitsY] = useState(0);
  const [actionBarHeight, setActionBarHeight] = useState(88);

  const goBack = useCallback(
    () => (router.canGoBack() ? router.back() : router.replace('/(tabs)')),
    [router]
  );

  // Same rule as the property page: the link only when a web origin is set.
  const handleShare = useCallback(() => {
    if (!detail) return;
    const parts = [
      detail.name,
      detail.priceMin ? `from ${formatPrice(detail.priceMin)}` : undefined,
      detail.locationLabel,
    ].filter(Boolean);
    const link = WEB_URL ? `${WEB_URL}/projects/${detail.id}` : undefined;
    const message = link ? `${parts.join(' — ')}\n${link}` : parts.join(' — ');
    void Share.share({ message, ...(link ? { url: link } : {}) });
  }, [detail]);

  const scrollToUnits = useCallback(() => {
    scrollRef.current?.scrollTo({
      y: Math.max(0, unitsY - insets.top - HEADER_BAR_HEIGHT - spacing.base),
      animated: true,
    });
  }, [scrollRef, unitsY, insets.top]);

  const height = galleryHeight(width);

  if (isLoading) {
    return (
      <Screen edges={['bottom']}>
        <Skeleton height={height} radius={0} />
        <View className="p-base">
          <Skeleton height={28} className="mb-base" />
          <Skeleton height={120} radius={12} />
        </View>
      </Screen>
    );
  }

  if (error || !detail) {
    return (
      <Screen>
        <ErrorState title="Could not load this project" onRetry={refresh} />
      </Screen>
    );
  }

  const { bhk, carpet } = unitSummary(unitTypes);
  const summaryLine = [bhk, carpet].filter(Boolean).join(' · ');
  const hasLocation = Boolean(detail.address) || detail.connectivity.length > 0 || detail.nearby.length > 0;

  return (
    <Screen unsafe>
      <DetailHeader title={detail.name} scrollY={scrollY} onBack={goBack} onShare={handleShare} />

      <Animated.ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: actionBarHeight + spacing.lg }}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.textMuted}
            colors={[theme.colors.accent]}
            progressViewOffset={insets.top + HEADER_BAR_HEIGHT}
          />
        }
      >
        <View style={{ height }}>
          {detail.gallery.length > 0 ? (
            /*
              A windowed `FlatList`, not a mapped `ScrollView`: three images
              decoded at a time, recycled, same choice as `DetailHero`.
              `size="medium"` because this is a carousel, not a full-screen
              viewer.
            */
            <FlatList
              data={detail.gallery}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(uri, index) => `${uri}-${index}`}
              initialNumToRender={1}
              windowSize={3}
              removeClippedSubviews
              getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
              onMomentumScrollEnd={(event) =>
                setPhotoIndex(Math.round(event.nativeEvent.contentOffset.x / width))
              }
              renderItem={({ item }) => <Image uri={item} size="medium" style={{ width, height }} />}
            />
          ) : (
            <View className="h-full w-full items-center justify-center bg-surface-muted">
              <Ionicons name="business-outline" size={40} color={theme.colors.textMuted} />
            </View>
          )}

          {detail.gallery.length > 1 ? (
            <View
              className="flex-row items-center rounded-full px-sm py-xs"
              style={{
                position: 'absolute',
                bottom: spacing.md,
                right: spacing.md,
                backgroundColor: 'rgba(0,0,0,0.6)',
              }}
              accessibilityLabel={`Photo ${photoIndex + 1} of ${detail.gallery.length}`}
            >
              <Ionicons name="images-outline" size={13} color="#FFFFFF" />
              <Text variant="caption" style={{ color: '#FFFFFF', marginLeft: 4 }}>
                {photoIndex + 1}/{detail.gallery.length}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={{ padding: screenPadding }}>
          {detail.status ? <Badge label={detail.status} tone="accent" className="mb-sm" /> : null}
          <Text variant="title1">{detail.name}</Text>

          {detail.locationLabel ? (
            <View className="mt-xs flex-row items-center">
              <Ionicons name="location-outline" size={16} color={theme.colors.brand} />
              <Text variant="callout" tone="secondary" className="ml-xs">
                {detail.locationLabel}
              </Text>
            </View>
          ) : null}

          {detail.priceMin ? (
            <View className="mt-base flex-row items-baseline">
              <PriceLabel price={detail.priceMin} variant="title2" />
              {detail.priceMax && detail.priceMax > detail.priceMin ? (
                <>
                  <Text variant="body" tone="secondary" className="mx-xs">
                    –
                  </Text>
                  <PriceLabel price={detail.priceMax} variant="title2" />
                </>
              ) : null}
            </View>
          ) : null}

          {summaryLine ? (
            <Text variant="callout" tone="secondary" className="mt-xs">
              {summaryLine}
            </Text>
          ) : null}

          {detail.facts.length > 0 ? <FactGrid facts={detail.facts} /> : null}

          {/*
            Units come before the description and amenities: price and size
            decide whether a buyer reads further, features come after.
            `layout.y` is relative to this padded column, which starts below
            the gallery, so the gallery's height is added back.
          */}
          <View className="mt-xl" onLayout={(event) => setUnitsY(height + event.nativeEvent.layout.y)}>
            <Text variant="title3" className="mb-sm">
              Units & prices
            </Text>
            {/*
              "No unit types published yet" is a statement about the BUILDER's
              inventory, on the screen where a buyer decides whether to proceed.
              It was rendered for a failed request too, because `unitTypes` falls
              back to `[]` on error — so our network fault read as the developer
              having listed nothing.
            */}
            {unitTypesLoading ? (
              <Skeleton height={80} radius={12} />
            ) : unitTypesError ? (
              <View>
                <Text variant="callout" tone="danger">
                  We could not load the unit types.
                </Text>
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel="Retry loading unit types"
                  onPress={retryUnitTypes}
                  className="mt-xs"
                >
                  <Text variant="footnote" tone="accent">
                    Try again
                  </Text>
                </PressableScale>
              </View>
            ) : unitTypes.length === 0 ? (
              <Text variant="callout" tone="secondary">
                No unit types published yet.
              </Text>
            ) : (
              <Card padded={false}>
                {unitTypes.map((unitType, index) => (
                  <UnitTypeRow
                    key={unitType._id}
                    unitType={unitType}
                    divided={index > 0}
                    onPress={() => router.push(`/projects/unit/${unitType._id}`)}
                  />
                ))}
              </Card>
            )}
          </View>

          {detail.description ? (
            <Section title="About">
              <ExpandableText text={detail.description} />
            </Section>
          ) : null}

          {detail.amenities.length > 0 ? (
            <Section title={`Amenities (${detail.amenities.length})`}>
              <DetailIconList
                items={(showAllAmenities ? detail.amenities : detail.amenities.slice(0, AMENITY_PREVIEW)).map(
                  (name) => ({ key: name, icon: 'checkmark-circle', label: name })
                )}
                iconTone="success"
                surface
              />
              {detail.amenities.length > AMENITY_PREVIEW ? (
                <PressableScale
                  accessibilityRole="button"
                  onPress={() => setShowAllAmenities((open) => !open)}
                  className="mt-sm self-start"
                  hitSlop={gesture.hitSlop}
                >
                  <Text variant="callout" tone="accent">
                    {showAllAmenities ? 'Show fewer' : `Show all ${detail.amenities.length}`}
                  </Text>
                </PressableScale>
              ) : null}
            </Section>
          ) : null}

          {hasLocation ? (
            <Section title="Location">
              {detail.address ? (
                <View className="mb-base flex-row">
                  <Ionicons name="map-outline" size={18} color={theme.colors.textMuted} />
                  <Text variant="callout" tone="secondary" className="ml-sm flex-1">
                    {detail.address}
                  </Text>
                </View>
              ) : null}
              {detail.connectivity.length > 0 ? <DistanceStrip items={detail.connectivity} /> : null}
              {detail.nearby.length > 0 ? (
                <NearbyList places={detail.nearby} spaced={detail.connectivity.length > 0} />
              ) : null}
            </Section>
          ) : null}

          {detail.builderName ? (
            <Section title="Builder">
              <Card className="flex-row items-center">
                <Avatar uri={detail.builderLogo} name={detail.builderName} />
                <View className="ml-base flex-1">
                  <Text variant="bodyEmphasis">{detail.builderName}</Text>
                  {detail.builderCity ? (
                    <Text variant="footnote" tone="secondary">
                      {detail.builderCity}
                    </Text>
                  ) : null}
                </View>
              </Card>
            </Section>
          ) : null}
        </View>
      </Animated.ScrollView>

      {/* Only once there are units to go to: a button that scrolls to "No
          unit types published yet" would be a promise the page cannot keep. */}
      {unitTypes.length > 0 ? (
        <View
          className="absolute inset-x-0 bottom-0 border-t border-border bg-surface px-base pt-sm"
          style={{ paddingBottom: insets.bottom + spacing.sm }}
          onLayout={(event) => setActionBarHeight(event.nativeEvent.layout.height)}
        >
          <Button label="See units & prices" fullWidth onPress={scrollToUnits} />
        </View>
      ) : null}
    </Screen>
  );
}

/**
 * Key facts as one card, two per row: icon, small label, bold value.
 *
 * Replaced five `Stat` tiles (2026-10-26). Each tile set its value at title2
 * in a 16pt-padded box, so five facts filled a whole screen and the fifth sat
 * alone beside a gap. The label above the value is what makes "1 · G+31"
 * readable at all.
 */
function FactGrid({ facts }: { facts: ProjectDetailView['facts'] }) {
  const theme = useTheme();
  return (
    // The grid is an inner View: `Card` spreads its props after its own
    // `style`, so a `style` passed to it would drop the padding and shadow.
    <Card className="mt-lg">
      <View className="flex-row flex-wrap" style={{ rowGap: spacing.base }}>
        {facts.map((fact) => (
          <View key={fact.key} className="flex-row items-center" style={{ width: '50%' }}>
            <View
              className="items-center justify-center rounded-full"
              style={{ width: 36, height: 36, backgroundColor: theme.colors.accentMuted }}
            >
              <Ionicons name={FACT_ICON[fact.key]} size={18} color={theme.colors.accent} />
            </View>
            <View className="ml-sm flex-1">
              <Text variant="caption" tone="muted">
                {fact.label}
              </Text>
              <Text variant="bodyEmphasis" numberOfLines={1}>
                {fact.value}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}

/** Distances in one row: the number large, what it is to underneath. */
function DistanceStrip({ items }: { items: ProjectDetailView['connectivity'] }) {
  const theme = useTheme();
  return (
    <Card padded={false} className="flex-row">
      {items.map((item, index) => (
        <View
          key={item.kind}
          className="flex-1 items-center py-md"
          style={index > 0 ? { borderLeftWidth: 1, borderLeftColor: theme.colors.border } : undefined}
        >
          <Ionicons name={CONNECTIVITY_ICON[item.kind]} size={20} color={theme.colors.textMuted} />
          <Text variant="bodyEmphasis" numberOfLines={1} className="mt-xs">
            {item.distance}
          </Text>
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {item.label}
          </Text>
        </View>
      ))}
    </Card>
  );
}

/** One place per line, distance on the right, so neither is cut off. */
function NearbyList({ places, spaced }: { places: ProjectDetailView['nearby']; spaced: boolean }) {
  const theme = useTheme();
  return (
    <Card className={spaced ? 'mt-base' : undefined}>
      <Text variant="footnote" tone="secondary" className="mb-xs">
        Nearby
      </Text>
      {places.map((place, index) => (
        <View
          key={`${place.name}-${index}`}
          className="flex-row items-center py-sm"
          style={index > 0 ? { borderTopWidth: 1, borderTopColor: theme.colors.border } : undefined}
        >
          <Ionicons name="location-outline" size={16} color={theme.colors.textMuted} />
          <Text variant="callout" className="ml-sm flex-1">
            {place.name}
          </Text>
          {place.distance ? (
            <Text variant="footnote" tone="secondary" className="ml-sm">
              {place.distance}
            </Text>
          ) : null}
        </View>
      ))}
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mt-xl">
      <Text variant="title3" className="mb-sm">
        {title}
      </Text>
      {children}
    </View>
  );
}

/**
 * One row of the units table: what it is and how big on the left, the price
 * on the right where the eye compares it with the next row's. Rows share one
 * card with hairlines between them, the configuration table the portals use,
 * instead of a card each.
 */
function UnitTypeRow({
  unitType,
  divided,
  onPress,
}: {
  unitType: UnitType;
  divided: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const price = unitType.pricing?.effectivePrice ?? unitType.pricing?.basePrice;
  // `availableUnits`, not `available` — the latter is not a field on this model
  // and read `undefined` every time, so this row never showed a count.
  const available = unitType.inventory?.availableUnits;
  const carpet = unitType.area?.carpetSqft;
  const name =
    unitType.config?.name ?? (unitType.config?.bedrooms ? `${unitType.config.bedrooms} BHK` : 'Unit type');

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${name}${price ? `, ${formatPrice(price)}` : ''}`}
      onPress={onPress}
      activeScale={0.99}
      className="flex-row items-center px-base py-md"
      style={divided ? { borderTopWidth: 1, borderTopColor: theme.colors.border } : undefined}
    >
      <View className="flex-1 pr-sm">
        <Text variant="bodyEmphasis" numberOfLines={1}>
          {name}
        </Text>
        <Text variant="footnote" tone="secondary" numberOfLines={1} className="mt-xs">
          {[
            carpet ? `${carpet.toLocaleString('en-IN')} sq ft` : undefined,
            typeof available === 'number' ? `${available} available` : undefined,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      </View>
      {price ? <PriceLabel price={price} variant="bodyEmphasis" /> : null}
      <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} style={{ marginLeft: 4 }} />
    </PressableScale>
  );
}
