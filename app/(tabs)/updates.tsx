import Ionicons from '@expo/vector-icons/Ionicons';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { RefreshControl, View } from 'react-native';

import { track } from '@/analytics';
import { SignInPrompt } from '@/auth';
import {
  groupInbox,
  hrefForTarget,
  NotificationRow,
  readNotificationKind,
  resolveNotificationTarget,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  type NotificationRowPosition,
} from '@/features/notifications';
import { radius, screenPadding, spacing, tabBarClearance, useTheme } from '@/theme';
import type { AppNotification } from '@/types/backend/notification';
import {
  EmptyState,
  ErrorState,
  HeaderAction,
  Screen,
  ScreenHeader,
  SectionLabel,
  Skeleton,
} from '@/ui';

/**
 * Updates — the event inbox.
 *
 * Promoted from a stack route to a tab on 2026-08-24. It used to be reachable
 * only through a bell inside Home's hero, which is a website's idea of what a
 * notification is: a thing you go and look at if you happen to think of it.
 * Everything the platform has to tell a user arrives here — a lead on your
 * listing, a saved-search match, a deal approved, a reward to claim — and none
 * of it is worth less than the search field it used to sit beside.
 *
 * ---------------------------------------------------------------------------
 * THE SHAPE, SINCE 2026-10-21
 *
 * Day groups (Today, Yesterday, This week, Earlier), each a grouped surface
 * of rows with a glyph for the kind of event. It was one undivided column of
 * text rows on the page colour, where a weekly digest and a new lead looked
 * identical and a month of rows had no beginning or end. The list is still
 * one virtualised list: group headers are rows of their own, and each row
 * draws the corners of the group it sits in. See `NotificationRow`.
 *
 * WHAT THIS SCREEN DOES NOT CLAIM: the count in the subtitle is derived from
 * the rows this screen already holds, not from a server-side unread endpoint,
 * because there is no such endpoint. `GET /notifications` returns the 100 most
 * recent with no cursor and no count, so "unread" here means "unread among the
 * hundred most recent". That is also why there is no dock badge yet: a badge
 * that only becomes true after you open the screen it is meant to send you to
 * is worse than no badge. Both wait on a real `unread-count` route.
 *
 * Not paginated, for the same reason: there is nothing below the hundredth row
 * to fetch, so no "load more" is offered.
 *
 * Tapping a row marks it read and navigates when the notification names a
 * destination this app recognises. It never follows an arbitrary `actionUrl`;
 * see `features/notifications/targets.ts` for why that matters.
 */

type InboxItem =
  | { type: 'header'; key: string; label: string }
  | { type: 'row'; key: string; notification: AppNotification; position: NotificationRowPosition };

/** Headers and rows as one flat list, with each row told where it sits. */
function flattenInbox(items: AppNotification[]): InboxItem[] {
  const out: InboxItem[] = [];
  for (const group of groupInbox(items)) {
    out.push({ type: 'header', key: `h-${group.key}`, label: group.label });
    group.items.forEach((notification, index) => {
      const position: NotificationRowPosition =
        group.items.length === 1
          ? 'only'
          : index === 0
            ? 'first'
            : index === group.items.length - 1
              ? 'last'
              : 'middle';
      out.push({ type: 'row', key: notification._id, notification, position });
    });
  }
  return out;
}

export default function UpdatesScreen() {
  const router = useRouter();
  const theme = useTheme();

  const { items, unreadCount, isLoading, isRefreshing, error, refresh, requiresAuth } =
    useNotifications();
  const { markRead } = useMarkNotificationRead();
  const { markAllRead } = useMarkAllNotificationsRead();

  const rows = useMemo(() => flattenInbox(items), [items]);

  const handlePress = useCallback(
    (notification: AppNotification) => {
      if (!notification.isRead) markRead(notification._id);

      const target = resolveNotificationTarget(notification);
      track('notification_opened', {
        kind: readNotificationKind(notification.data) ?? target?.kind ?? 'unknown',
      });
      if (target) router.push(hrefForTarget(target));
    },
    [markRead, router]
  );

  return (
    <Screen edges={['top']}>
      {/* A root tab has nowhere to go back TO, so no back affordance. */}
      <ScreenHeader
        title="Updates"
        showBack={false}
        subtitle={
          unreadCount > 0
            ? `${unreadCount} unread`
            : items.length > 0
              ? 'All caught up'
              : undefined
        }
        actions={
          unreadCount > 0 ? (
            <HeaderAction
              icon="checkmark-done-outline"
              label="Mark all as read"
              tone="accent"
              onPress={markAllRead}
            />
          ) : null
        }
      />

      {requiresAuth ? (
        <SignInPrompt
          icon="notifications-outline"
          title="Your notifications"
          description="Alerts about your listings, leads and saved searches appear here."
        />
      ) : isLoading ? (
        <NotificationsSkeleton />
      ) : error ? (
        <ErrorState title="Could not load notifications" onRetry={refresh} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={
            <View
              className="items-center justify-center rounded-full"
              style={{ width: 72, height: 72, backgroundColor: theme.colors.accentMuted }}
            >
              <Ionicons name="notifications" size={30} color={theme.colors.accent} />
            </View>
          }
          title="Nothing yet"
          description="A new lead, a saved-search match, a deal update or a reward to claim: it all lands here."
        />
      ) : (
        <FlashList
          data={rows}
          keyExtractor={(item) => item.key}
          getItemType={(item) => item.type}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refresh}
              tintColor={theme.colors.textMuted}
              colors={[theme.colors.accent]}
              progressBackgroundColor={theme.colors.surface}
            />
          }
          // The dock floats over this list rather than sitting below it, so
          // the last row has to clear it — every tab screen pays this.
          contentContainerStyle={{
            paddingHorizontal: screenPadding,
            paddingBottom: tabBarClearance,
          }}
          renderItem={({ item, index }) =>
            item.type === 'header' ? (
              <View style={{ marginTop: index === 0 ? 0 : spacing.xl }}>
                <SectionLabel>{item.label}</SectionLabel>
              </View>
            ) : (
              <NotificationRow
                notification={item.notification}
                position={item.position}
                onPress={handlePress}
              />
            )
          }
        />
      )}
    </Screen>
  );
}

/** A heading and a group of three rows, the shape the loaded list takes. */
function NotificationsSkeleton() {
  return (
    <View style={{ paddingHorizontal: screenPadding }}>
      <Skeleton width={72} height={16} className="mb-sm" />
      <View className="overflow-hidden bg-surface" style={{ borderRadius: radius.lg }}>
        {[0, 1, 2].map((row) => (
          <View key={row} className="flex-row" style={{ padding: spacing.md }}>
            <Skeleton width={40} height={40} radius={radius.md} />
            <View className="ml-md flex-1">
              <Skeleton width="55%" height={16} />
              <Skeleton width="85%" height={13} className="mt-sm" />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
