import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';
import { Card, Text } from '@/ui';
import type { PropertyDetail } from '../types';

/**
 * The three or four numbers a buyer checks before reading anything else.
 *
 * A grid of icon-beside-value tiles, two to a row, not a label/value table.
 * The full attribute table is a separate surface further down the screen;
 * this is the summary that has to survive being glanced at, so it holds only
 * facts that are meaningful without a heading and that most listings carry.
 *
 * ---------------------------------------------------------------------------
 * TWO COLUMNS, NOT FOUR
 *
 * It was one row of four cells, each a quarter of the card. At that width a
 * value like "Builder Floor" and a label like "Configuration" were cut to
 * "Builder …" and "Configura…" on an ordinary phone, which is the one thing a
 * summary must not do to the fact it exists to show. Half the card is room
 * for any value in the data, and the icon sits beside the text rather than
 * above it so the tile reads as one line of meaning instead of a column.
 *
 * Cells are dropped rather than blanked. An empty tile reading "—" tells the
 * user the data is missing, which is true but not useful. An odd count leaves
 * the last tile to span the row rather than sit against an empty half.
 *
 * Deliberately NOT here: price (it is the focal point above and must not be
 * repeated at this weight), and anything commercial-only. `bathrooms` is
 * residential in practice — commercial listings use `washrooms`, a different
 * field — so the commercial equivalent comes from the field map in the full
 * attribute table rather than being special-cased into this grid.
 */

interface Fact {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
}

/**
 * `bhk` arrives pre-suffixed on real data ("2 BHK", "5+ BHK"), so the suffix
 * is added only when genuinely missing. Same rule as `PropertyCard.specLine`.
 */
function bedroomFact(property: PropertyDetail): Fact | null {
  if (property.bhk) {
    return {
      icon: 'bed-outline',
      value: /bhk/i.test(property.bhk) ? property.bhk : `${property.bhk} BHK`,
      label: 'Configuration',
    };
  }

  if (property.bedrooms) {
    return {
      icon: 'bed-outline',
      value: `${property.bedrooms}`,
      label: property.bedrooms === 1 ? 'Bedroom' : 'Bedrooms',
    };
  }

  return null;
}

function buildFacts(property: PropertyDetail): Fact[] {
  const facts: Fact[] = [];

  const bedrooms = bedroomFact(property);
  if (bedrooms) facts.push(bedrooms);

  if (property.bathrooms) {
    facts.push({
      icon: 'water-outline',
      value: `${property.bathrooms}`,
      label: property.bathrooms === 1 ? 'Bathroom' : 'Bathrooms',
    });
  }

  if (property.areaSqft) {
    facts.push({
      icon: 'resize-outline',
      value: `${property.areaSqft.toLocaleString('en-IN')} sqft`,
      label: 'Area',
    });
  }

  const type = property.propertyTypeName ?? property.subcategoryName ?? property.categoryName;
  if (type) {
    facts.push({ icon: 'home-outline', value: type, label: 'Type' });
  }

  return facts;
}

export interface DetailFactsProps {
  property: PropertyDetail;
}

export function DetailFacts({ property }: DetailFactsProps) {
  const theme = useTheme();
  const facts = buildFacts(property);

  if (facts.length === 0) return null;

  const rule = { borderColor: theme.colors.border, width: StyleSheet.hairlineWidth };

  return (
    <Card bordered={false} radius="xl" padded={false} className="overflow-hidden">
      <View className="flex-row flex-wrap">
        {facts.map((fact, index) => {
          const secondColumn = index % 2 === 1;
          const spansRow = index === facts.length - 1 && facts.length % 2 === 1;
          return (
            <View
              key={fact.label}
              className="flex-row items-center px-base py-md"
              style={{
                width: spansRow ? '100%' : '50%',
                // Hairlines, not borders: a device-pixel rule reads as a
                // division between tiles; a full point reads as a table.
                borderTopWidth: index >= 2 ? rule.width : 0,
                borderLeftWidth: secondColumn ? rule.width : 0,
                borderColor: rule.borderColor,
              }}
            >
              <View
                className="h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: theme.colors.surfaceMuted }}
              >
                <Ionicons name={fact.icon} size={18} color={theme.colors.textPrimary} />
              </View>
              <View className="ml-md flex-1">
                <Text variant="bodyEmphasis" numberOfLines={2}>
                  {fact.value}
                </Text>
                <Text variant="caption" tone="muted" numberOfLines={1}>
                  {fact.label}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </Card>
  );
}
