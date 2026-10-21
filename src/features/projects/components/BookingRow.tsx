import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';

import { relativeDay } from '@/lib';
import { radius, spacing, useTheme } from '@/theme';
import type { ProjectBooking } from '@/types/backend/project';
import { Badge, PressableScale, Text } from '@/ui';

import { enquiryStatus } from '../enquiryStatus';

/**
 * One enquiry about a builder unit, as a row.
 *
 * Lifted out of `app/projects/bookings.tsx` on 2026-08-24 so the Activity tab
 * can show the same rows without a second implementation. The name is the
 * route's (`/bookings`), not the product's: since 2026-10-19 every record is
 * an enquiry and nothing here involves money.
 *
 * Same anatomy as `DealRow`, so the Deals and Enquiries segments read as one
 * list style: a tile on the left, the name and the unit beside it, the stage
 * on the right, and one line underneath saying where it stands. The list
 * endpoint populates the project's `basics` and the unit's `config` only, no
 * photo, so the tile is a glyph rather than an empty image frame.
 */

const TILE = 48;

export interface BookingRowProps {
  booking: ProjectBooking;
  onPress: () => void;
  className?: string;
}

/**
 * What the buyer can expect next, in their words rather than the status's,
 * with the date on the same line. One line, kept short enough to fit beside
 * the tile at the caption size on a 360pt screen.
 */
function nextLine(status: string, sent: string | null): string {
  const when = sent ? ` · Sent ${sent}` : '';
  if (status === 'enquiry') return `We'll call you back${when}`;
  if (status === 'cancelled') return `Withdrawn${when}`;
  return `Closed${when}`;
}

export function BookingRow({ booking, onPress, className = 'mb-base' }: BookingRowProps) {
  const theme = useTheme();
  const projectName = typeof booking.project === 'object' ? booking.project?.basics?.name : undefined;
  const unitName = typeof booking.unitType === 'object' ? booking.unitType?.config?.name : undefined;
  const status = enquiryStatus(booking.status);
  const open = booking.status === 'enquiry';
  const sent = relativeDay(booking.createdAt);

  return (
    <View className={className}>
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={[projectName, unitName, status.label, sent ? `sent ${sent}` : null]
        .filter(Boolean)
        .join(', ')}
      onPress={onPress}
      activeScale={0.99}
      style={{
        flexDirection: 'row',
        borderRadius: radius.lg,
        backgroundColor: theme.colors.surface,
        padding: spacing.md,
        // Open enquiries carry the card shadow; closed ones sit flat, so a
        // list of mostly-closed rows reads the one that still matters first.
        ...(open
          ? {
              shadowColor: '#000',
              shadowOpacity: 0.06,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 3 },
              elevation: 2,
            }
          : { opacity: 0.82 }),
      }}
    >
      <View
        className="items-center justify-center"
        style={{
          width: TILE,
          height: TILE,
          borderRadius: radius.md,
          backgroundColor: open ? theme.colors.accentMuted : theme.colors.surfaceMuted,
        }}
      >
        <Ionicons
          name="business-outline"
          size={22}
          color={open ? theme.colors.accent : theme.colors.textMuted}
        />
      </View>

      <View className="ml-md flex-1">
        <View className="flex-row items-start">
          <View className="flex-1 pr-sm">
            <Text variant={open ? 'bodyEmphasis' : 'body'} numberOfLines={1}>
              {projectName ?? 'Project'}
            </Text>
            {unitName ? (
              <Text variant="footnote" tone="secondary" numberOfLines={1} className="mt-xs">
                {unitName}
              </Text>
            ) : null}
          </View>
          <View style={{ flexShrink: 0 }}>
            <Badge label={status.label} tone={status.tone} />
          </View>
        </View>

        <View className="mt-sm flex-row items-center">
          <Ionicons
            name={open ? 'call-outline' : 'time-outline'}
            size={13}
            color={open ? theme.colors.accent : theme.colors.textMuted}
          />
          <Text
            variant="caption"
            tone={open ? 'accent' : 'muted'}
            numberOfLines={1}
            className="ml-xs flex-1"
          >
            {nextLine(booking.status, sent)}
          </Text>
        </View>
      </View>
    </PressableScale>
    </View>
  );
}
