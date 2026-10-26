import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';

import { spacing, useTheme } from '@/theme';
import { Card, Text } from '@/ui';

export interface Fact {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}

/**
 * Key facts as one card, two per row: icon, small label, bold value.
 *
 * Replaced five `Stat` tiles on the project page (2026-10-26). Each tile set
 * its value at title2 in a 16pt-padded box, so five facts filled a whole
 * screen and the fifth sat alone beside a gap. The label above the value is
 * what makes "1 tower · G+31" or "720 sq ft" readable at all. Shared by the
 * project and unit pages.
 */
export function FactGrid({ facts, className = '' }: { facts: readonly Fact[]; className?: string }) {
  const theme = useTheme();
  if (facts.length === 0) return null;

  return (
    // The grid is an inner View: `Card` spreads its props after its own
    // `style`, so a `style` passed to it would drop the padding and shadow.
    <Card className={className}>
      <View className="flex-row flex-wrap" style={{ rowGap: spacing.base }}>
        {facts.map((fact) => (
          <View key={fact.key} className="flex-row items-center pr-sm" style={{ width: '50%' }}>
            <View
              className="items-center justify-center rounded-full"
              style={{ width: 36, height: 36, backgroundColor: theme.colors.accentMuted }}
            >
              <Ionicons name={fact.icon} size={18} color={theme.colors.accent} />
            </View>
            <View className="ml-sm flex-1">
              <Text variant="caption" tone="muted">
                {fact.label}
              </Text>
              <Text variant="bodyEmphasis" numberOfLines={2}>
                {fact.value}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}
