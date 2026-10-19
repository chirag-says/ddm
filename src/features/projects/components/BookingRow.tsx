import { View } from 'react-native';

import { relativeDay } from '@/lib';
import type { ProjectBooking } from '@/types/backend/project';
import { Badge, Card, Text } from '@/ui';

import { enquiryStatus } from '../enquiryStatus';

/**
 * One enquiry about a builder unit, as a row.
 *
 * Lifted out of `app/projects/bookings.tsx` on 2026-08-24 so the Activity tab
 * can show the same rows without a second implementation. The name is the
 * route's (`/bookings`), not the product's: since 2026-10-19 every record is
 * an enquiry and nothing here involves money.
 */

export interface BookingRowProps {
  booking: ProjectBooking;
  onPress: () => void;
  className?: string;
}

export function BookingRow({ booking, onPress, className = 'mb-base' }: BookingRowProps) {
  const projectName = typeof booking.project === 'object' ? booking.project?.basics?.name : undefined;
  const unitName = typeof booking.unitType === 'object' ? booking.unitType?.config?.name : undefined;
  const status = enquiryStatus(booking.status);
  const sent = relativeDay(booking.createdAt);

  /*
    `Card`'s own `onPress`, not a wrapping `Pressable`. The bare Pressable this
    used carried no `style` callback and no accessible label, so the row gave
    no feedback on touch and announced nothing. `projects/[id]` and
    `unit/[unitTypeId]` both document this exact correction; this row and the
    leads list were the two the fix never reached.
  */
  return (
    <Card
      onPress={onPress}
      accessibilityLabel={[projectName, unitName, status.label].filter(Boolean).join(', ')}
      className={`${className} flex-row items-center justify-between`}
    >
      <View className="flex-1 pr-base">
        <Text variant="bodyEmphasis" numberOfLines={1}>
          {projectName ?? 'Project'}
        </Text>
        {unitName ? (
          <Text variant="footnote" tone="secondary" numberOfLines={1}>
            {unitName}
          </Text>
        ) : null}
        {sent ? (
          <Text variant="footnote" tone="secondary" className="mt-xs">
            Enquiry sent {sent}
          </Text>
        ) : null}
      </View>
      <Badge label={status.label} tone={status.tone} />
    </Card>
  );
}
