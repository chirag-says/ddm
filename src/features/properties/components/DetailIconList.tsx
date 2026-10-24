import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';

import { spacing, useTheme } from '@/theme';
import { Card, Text } from '@/ui';

/**
 * Short facts as a two-column list: a small glyph, then the words.
 *
 * Amenities, highlights and nearby places were pills. Pills are the shape of
 * a control, and twenty of them read as twenty buttons that do nothing when
 * pressed. A list of glyph-and-label rows reads as information, which is what
 * these are: things the listing has, in the order the owner gave them.
 *
 * Two columns because the labels are short ("CCTV", "Geyser") and one per
 * line would run a dozen amenities down half a screen. A label too long for
 * its column wraps to a second line rather than being cut.
 */

export interface DetailIconListItem {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}

export interface DetailIconListProps {
  items: DetailIconListItem[];
  /**
   * The glyph colour. `success` for things the listing has (amenities, where
   * the glyph is a check); `muted` where the glyph only names the kind of
   * fact (a compass for facing, a calendar for availability).
   */
  iconTone?: 'muted' | 'success';
  /** On a raised surface, for a list that is a section of its own. */
  surface?: boolean;
}

export function DetailIconList({ items, iconTone = 'muted', surface = false }: DetailIconListProps) {
  const theme = useTheme();
  if (items.length === 0) return null;

  const iconColor = iconTone === 'success' ? theme.colors.success : theme.colors.textMuted;

  const rows = (
    <View className="flex-row flex-wrap" style={{ rowGap: spacing.sm }}>
      {items.map((item) => (
        <View key={item.key} className="flex-row items-start pr-sm" style={{ width: '50%' }}>
          <Ionicons name={item.icon} size={16} color={iconColor} style={{ marginTop: 2 }} />
          <Text variant="callout" className="ml-sm flex-1" numberOfLines={2}>
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );

  if (!surface) return rows;

  return (
    <Card bordered={false} radius="xl">
      {rows}
    </Card>
  );
}
