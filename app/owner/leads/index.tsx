import Ionicons from '@expo/vector-icons/Ionicons';
import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { OwnerOnly } from '@/auth';
import { LEAD_STATUSES, LeadCard, statusLabel, summariseWeek, useLeads } from '@/features/leads';
import { radius, screenPadding, scrollBottomPadding, spacing, useTheme } from '@/theme';
import type { LeadStatus } from '@/types/backend/lead';
import {
  Card,
  Chip,
  EmptyState,
  ErrorState,
  Screen,
  ScreenHeader,
  Skeleton,
  Stat,
  StatRow,
  Text,
} from '@/ui';

/**
 * The owner's leads.
 *
 * ---------------------------------------------------------------------------
 * THE SHAPE, SINCE 2026-10-21
 *
 * Three bands, in the order an owner works: the numbers that say whether
 * anything needs doing (waiting on you, new this week, total), the stages
 * with a count on each so the rail is a pipeline rather than six words, and
 * the list. The numbers scroll away with the list; the rail stays put, so a
 * filter is always one tap away.
 *
 * The earlier version had cut the numbers to a line under the title to give
 * the list the viewport. The line was right about the list being the
 * content and wrong about what an owner opens this screen to learn, which is
 * not "how many" but "does anyone need me". That is one number, it is the
 * first tile, and it is tinted only when it is not zero.
 *
 * "Waiting on you" is `summariseWeek`, the same reading the analytics screen
 * and the Monday digest email use, from rows already fetched. It is computed
 * over the UNFILTERED list, which is a second `useLeads()` that TanStack
 * dedupes against the filtered one whenever no filter is set.
 *
 * ---------------------------------------------------------------------------
 * THE BLANK REGION BETWEEN THE FILTERS AND THE LIST — fixed 2026-08-16
 *
 * The filter rail is a horizontal `ScrollView`, and React Native's
 * `ScrollView` applies `flexGrow: 1` to horizontal ones, which in a column
 * parent claims every remaining point of vertical space. The plain `View`
 * around it caps it at its content height. Keep the wrapper.
 *
 * ---------------------------------------------------------------------------
 * THE STATUS FILTER CAN ARRIVE FROM ANALYTICS
 *
 * `?status=` is read once on mount: the pipeline rows on the analytics screen
 * land here already filtered. It is validated against `LEAD_STATUSES` rather
 * than trusted, so a hand-typed link cannot set a filter no chip can clear.
 */
function LeadsScreenContent() {
  const router = useRouter();
  const route = useLocalSearchParams<{ status?: string }>();

  // Read once, on mount, and validated. Re-reading on every render would fight
  // the user: tap a chip, re-render, and the param stamps the old value back.
  const [filter, setFilter] = useState<LeadStatus | undefined>(() =>
    LEAD_STATUSES.find((status) => status === route.status)
  );

  const { leads, stats, isLoading, isRefreshing, isFetchingMore, error, refresh, loadMore } =
    useLeads(filter);
  // Every lead, for the numbers. Same query as the list when no filter is on.
  const all = useLeads();

  const s = (stats ?? all.stats ?? {}) as LeadStats;
  const total = s.total ?? 0;

  const openLead = (id: string) => router.push(`/owner/leads/${id}`);

  return (
    <Screen>
      <ScreenHeader
        title="Leads"
        backTo="/(tabs)/profile"
        subtitle={summaryLine(s, filter, leads.length, isLoading)}
      />

      {/* The rail, capped: see the module doc. */}
      {total > 0 || filter ? (
        <View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: screenPadding,
              paddingBottom: spacing.md,
              gap: spacing.sm,
            }}
            keyboardShouldPersistTaps="handled"
          >
            <Chip
              label={countedLabel('All', s.total)}
              selected={filter === undefined}
              onPress={() => setFilter(undefined)}
            />
            {LEAD_STATUSES.map((status) => (
              <Chip
                key={status}
                label={countedLabel(statusLabel(status), s[status])}
                selected={filter === status}
                onPress={() => setFilter(status)}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {isLoading ? (
        <LeadsSkeleton />
      ) : error ? (
        <ErrorState title="Could not load leads" onRetry={refresh} />
      ) : leads.length === 0 && !filter ? (
        <NoLeadsYet onViewListings={() => router.push('/owner/properties')} />
      ) : leads.length === 0 ? (
        <EmptyState
          title={`No ${statusLabel(filter!).toLowerCase()} leads`}
          description="Nothing is at this stage right now. Clear the filter to see every lead."
          actionLabel="Show all leads"
          onAction={() => setFilter(undefined)}
        />
      ) : (
        <FlashList
          data={leads}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{
            paddingHorizontal: screenPadding,
            paddingBottom: scrollBottomPadding,
          }}
          // A separator, not a container `gap`: FlashList positions cells
          // absolutely, so flex gap on the content container is inert. See
          // `PropertyList` for the full note.
          ItemSeparatorComponent={LeadSeparator}
          ListHeaderComponent={
            <LeadsOverview
              leads={all.leads}
              hasMore={!!all.hasMore}
              loading={all.isLoading}
              total={total}
            />
          }
          refreshing={isRefreshing}
          onRefresh={() => {
            refresh();
            if (filter) all.refresh();
          }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            isFetchingMore ? (
              <View style={{ paddingTop: spacing.md }}>
                <Skeleton height={112} radius={14} />
              </View>
            ) : null
          }
          renderItem={({ item }) => <LeadCard lead={item} onPress={openLead} />}
        />
      )}
    </Screen>
  );
}

/**
 * Owner-gated. See `auth/components/OwnerOnly.tsx` for why a role the server
 * already enforces still needs a client-side refusal.
 */
export default function LeadsScreen() {
  return (
    <OwnerOnly title="Leads">
      <LeadsScreenContent />
    </OwnerOnly>
  );
}

/**
 * The stats block, read from `leadController.getLeads`: a count per status,
 * plus `total` and `today`, computed over ALL of the owner's leads regardless
 * of the filter on the query.
 */
type LeadStats = Partial<Record<LeadStatus | 'total' | 'today', number>>;

/** "New · 3". A zero count is left off: "Lost · 0" is a stage, not news. */
function countedLabel(label: string, count: number | undefined): string {
  return count ? `${label} · ${count}` : label;
}

/**
 * The numbers, above the list and scrolling with it.
 *
 * Waiting first, tinted only when it is not zero: it is the one figure here
 * that is an instruction. Then the week, then the total as the denominator.
 * `lowerBound` means not every page is loaded, so the counts are shown as a
 * floor ("3+") rather than as exact.
 */
function LeadsOverview({
  leads,
  hasMore,
  loading,
  total,
}: {
  leads: Parameters<typeof summariseWeek>[0];
  hasMore: boolean;
  loading: boolean;
  total: number;
}) {
  if (loading) {
    return (
      <View style={{ marginBottom: spacing.lg }}>
        <Skeleton height={96} radius={radius.lg} />
      </View>
    );
  }

  const week = summariseWeek(leads, hasMore);
  const floor = (n: number) => (week.lowerBound ? `${n}+` : n);

  return (
    <View style={{ marginBottom: spacing.lg }}>
      <StatRow>
        <Stat
          label="Waiting on you"
          value={floor(week.waiting)}
          detail={week.waiting > 0 ? 'No reply for a day' : 'All answered'}
          emphasis={week.waiting > 0}
        />
        <Stat label="New this week" value={floor(week.newLeads)} detail="Last 7 days" />
        <Stat label="Total" value={total} detail="All time" />
      </StatRow>
    </View>
  );
}

/**
 * The three counts as one line, in the header's subtitle slot.
 *
 * Ordered by what implies work rather than by magnitude: new first, because it
 * is the number an owner acts on, then today, then the total as context. Zero
 * values are dropped rather than printed.
 *
 * Returns undefined when the stats block has not arrived, so `ScreenHeader`
 * renders the title alone rather than an empty second line that would shift
 * the whole screen down when the data lands.
 */
function summaryLine(
  stats: LeadStats,
  filter: LeadStatus | undefined,
  shown: number,
  loading: boolean
): string | undefined {
  if (loading) return undefined;

  // Filtered: describe what is on screen, because `stats` describes what is
  // not. `shown` is what has loaded so far rather than a server total, so the
  // wording says "showing" instead of asserting a count.
  if (filter) {
    return `Showing ${shown} ${statusLabel(filter).toLowerCase()}`;
  }

  const total = stats.total;
  if (total === undefined) return undefined;

  const parts = [
    stats.new ? `${stats.new} new` : null,
    stats.today ? `${stats.today} today` : null,
  ].filter(Boolean);

  const base = `${total} ${total === 1 ? 'lead' : 'leads'}`;
  return parts.length > 0 ? `${base}  ·  ${parts.join('  ·  ')}` : base;
}

/** Module-level so the reference is stable across renders. */
const LeadSeparator = () => <View style={{ height: spacing.md }} />;

/**
 * No leads at all.
 *
 * A centred sentence in an empty screen told the owner nothing they could use.
 * This says what a lead is, where it comes from and what to do with one, and
 * sends them to the listing the leads will come from. The steps are the
 * product's actual mechanics, not encouragement.
 */
const HOW_LEADS_WORK: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }[] = [
  {
    icon: 'hand-left-outline',
    title: 'A buyer taps "I\'m interested"',
    body: 'On your property. Each buyer can do this on five properties at a time, so it is a real signal.',
  },
  {
    icon: 'call-outline',
    title: 'You get their contact details',
    body: 'Name, phone and email, here and by email. Call or message them directly.',
  },
  {
    icon: 'git-branch-outline',
    title: 'Track where each one stands',
    body: 'Mark the stage as you go: contacted, interested, negotiating, closed.',
  },
];

function NoLeadsYet({ onViewListings }: { onViewListings: () => void }) {
  const theme = useTheme();

  return (
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: screenPadding, paddingBottom: scrollBottomPadding }}
      showsVerticalScrollIndicator={false}
    >
      <EmptyState
        compact
        icon={
          <View
            className="items-center justify-center rounded-full"
            style={{ width: 72, height: 72, backgroundColor: theme.colors.accentMuted }}
          >
            <Ionicons name="people" size={30} color={theme.colors.accent} />
          </View>
        }
        title="No leads yet"
        description="When a buyer is interested in your property, they appear here with their name, phone and email."
        actionLabel="See my property"
        onAction={onViewListings}
      />

      <Card className="mt-lg">
        <Text variant="bodyEmphasis" className="mb-md">
          How leads work
        </Text>
        {HOW_LEADS_WORK.map((step, index) => (
          <View
            key={step.title}
            className="flex-row items-start"
            style={{ marginTop: index === 0 ? 0 : spacing.md }}
          >
            <View
              className="items-center justify-center rounded-full"
              style={{ width: 36, height: 36, backgroundColor: theme.colors.surfaceMuted }}
            >
              <Ionicons name={step.icon} size={18} color={theme.colors.textPrimary} />
            </View>
            <View className="ml-md flex-1">
              <Text variant="callout">{step.title}</Text>
              <Text variant="footnote" tone="secondary" className="mt-xs">
                {step.body}
              </Text>
            </View>
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

/**
 * Matches the loaded layout: the overview tiles, then rows of `LeadCard`'s
 * geometry, so the list does not reflow when the data lands.
 */
function LeadsSkeleton() {
  return (
    <View style={{ paddingHorizontal: screenPadding, gap: spacing.md }}>
      <Skeleton height={96} radius={radius.lg} />
      {[0, 1, 2].map((row) => (
        <View key={row} className="overflow-hidden bg-surface" style={{ borderRadius: 14 }}>
          <View style={{ padding: spacing.base }}>
            <View className="flex-row">
              <Skeleton width={40} height={40} radius={9999} />
              <View className="ml-md flex-1">
                <Skeleton width="52%" height={16} />
                <Skeleton width="70%" height={13} className="mt-xs" />
                <Skeleton width="38%" height={15} className="mt-xs" />
              </View>
            </View>
            <Skeleton width="60%" height={12} className="mt-md" />
          </View>
        </View>
      ))}
    </View>
  );
}
