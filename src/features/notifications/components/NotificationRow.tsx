import Ionicons from '@expo/vector-icons/Ionicons';
import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { radius, spacing, useTheme } from '@/theme';
import { Text } from '@/ui';
import type { AppNotification } from '@/types/backend/notification';
import { readNotificationKind, resolveNotificationTarget } from '../targets';

/**
 * One notification.
 *
 * ---------------------------------------------------------------------------
 * THE GLYPH SAYS WHAT KIND OF THING HAPPENED
 *
 * Every row used to be three lines of text behind a dot, and a column of
 * them was a wall: a weekly digest, a new lead and a reward looked the same
 * until read. The tile on the left names the kind at a glance, from the
 * `data.kind` the backend sends (Phase 0), then from the destination the row
 * resolves to, then from the legacy `type` string, so rows from every
 * backend version get one.
 *
 * Unread is the tile's tint and the title's weight. Not a tinted row
 * background: a full-width tint on every unread row turns a list of ten into
 * a block of colour that says nothing about which one matters.
 *
 * ---------------------------------------------------------------------------
 * ROWS DRAW THEIR OWN GROUP EDGES
 *
 * The inbox is day groups on one surface each. The list virtualises rows, so
 * a group cannot be a container; each row is told where it sits in its group
 * and rounds the corners it owns, with a hairline above every row but the
 * first. The effect is a grouped list, built from rows.
 *
 * A row without a resolvable destination is still pressable — pressing marks
 * it read, which is a real action — but it does not navigate. See
 * `targets.ts` for why an unrecognised `actionUrl` yields no destination
 * rather than being opened.
 */

export type NotificationRowPosition = 'only' | 'first' | 'middle' | 'last';

const TILE = 40;

/** Relative time, in the units people actually use for a notification feed. */
function timeAgo(iso: string | undefined): string {
  if (!iso) return '';

  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';

  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));

  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

type Glyph = keyof typeof Ionicons.glyphMap;

const KIND_ICONS: Record<string, Glyph> = {
  property: 'home',
  leads: 'people',
  dealReward: 'gift',
  savedSearches: 'search',
  deal: 'chatbubbles',
  visit: 'calendar',
  message: 'chatbubble-ellipses',
  review: 'star',
  digest: 'stats-chart',
};

/** Legacy `type` values seen before `data.kind` existed. */
const TYPE_ICONS: Record<string, Glyph> = {
  lead: 'people',
  interest: 'people',
  'saved-search': 'search',
  agreement: 'document-text',
  reward: 'gift',
  digest: 'stats-chart',
};

/** The glyph for a notification: by kind, then by destination, then by type. */
export function notificationIcon(notification: AppNotification): Glyph {
  const kind = readNotificationKind(notification.data);
  const byKind = kind ? KIND_ICONS[kind] : undefined;
  if (byKind) return byKind;
  const target = resolveNotificationTarget(notification);
  const byTarget = target ? KIND_ICONS[target.kind] : undefined;
  if (byTarget) return byTarget;
  return TYPE_ICONS[notification.type] ?? 'notifications';
}

export interface NotificationRowProps {
  notification: AppNotification;
  onPress: (notification: AppNotification) => void;
  /** Where the row sits in its day group. Decides which corners it rounds. */
  position?: NotificationRowPosition;
}

function NotificationRowComponent({ notification, onPress, position = 'only' }: NotificationRowProps) {
  const theme = useTheme();
  const handlePress = useCallback(() => onPress(notification), [onPress, notification]);

  const unread = !notification.isRead;
  const navigable = resolveNotificationTarget(notification) !== null;
  const icon = notificationIcon(notification);

  const top = position === 'only' || position === 'first';
  const bottom = position === 'only' || position === 'last';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${unread ? 'Unread. ' : ''}${notification.title}. ${notification.message}`}
      accessibilityHint={navigable ? 'Opens the related screen' : undefined}
      onPress={handlePress}
      className="active:opacity-70"
      style={{
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: top ? radius.lg : 0,
        borderTopRightRadius: top ? radius.lg : 0,
        borderBottomLeftRadius: bottom ? radius.lg : 0,
        borderBottomRightRadius: bottom ? radius.lg : 0,
        paddingLeft: spacing.base,
      }}
    >
      <View
        className="flex-row items-start"
        style={{
          paddingVertical: spacing.md,
          paddingRight: spacing.base,
          // Inset from the leading edge, under the text rather than the tile,
          // so the rule reads as separating two rows of one list.
          borderTopWidth: top ? 0 : StyleSheet.hairlineWidth,
          borderTopColor: theme.colors.border,
        }}
      >
        <View
          className="items-center justify-center"
          style={{
            width: TILE,
            height: TILE,
            borderRadius: radius.md,
            backgroundColor: unread ? theme.colors.accentMuted : theme.colors.surfaceMuted,
          }}
        >
          <Ionicons
            name={icon}
            size={20}
            color={unread ? theme.colors.accent : theme.colors.textMuted}
          />
        </View>

        <View className="ml-md flex-1">
          <View className="flex-row items-start">
            <Text
              variant={unread ? 'bodyEmphasis' : 'body'}
              numberOfLines={2}
              className="flex-1 pr-sm"
            >
              {notification.title}
            </Text>
            <Text variant="caption" tone="muted" style={{ marginTop: 3 }}>
              {timeAgo(notification.createdAt)}
            </Text>
          </View>
          <Text variant="footnote" tone="secondary" numberOfLines={2} className="mt-xs">
            {notification.message}
          </Text>
        </View>

        {navigable ? (
          <Ionicons
            name="chevron-forward"
            size={16}
            color={theme.colors.textMuted}
            style={{ marginLeft: spacing.xs, marginTop: 12 }}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

export const NotificationRow = memo(NotificationRowComponent);
