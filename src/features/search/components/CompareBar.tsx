import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, ScrollView, View } from 'react-native';

import { gesture, spacing, useTheme } from '@/theme';
import { Button, Image, Text, useDockInset } from '@/ui';
import { MIN_COMPARE, type ComparableProperty } from '../compare';

/**
 * Sticky bar for compare mode. Ported from the website's fixed bottom bar
 * (`PropertyListContent.jsx` ~L2221-2274) - thumbnails-with-remove, Clear,
 * Compare Now.
 *
 * ---------------------------------------------------------------------------
 * IT SHOWS WHENEVER THE MODE IS ON, NOT ONCE SOMETHING IS SELECTED
 *
 * It used to return null at zero items, which left compare mode with no
 * on-screen statement of itself at exactly the moment a user has just entered
 * it and selected nothing: a lit toolbar icon, checkboxes where the hearts
 * were, and no explanation. A mode with an invisible state is the mode error
 * every review of this app is meant to catch.
 *
 * Now the bar IS the mode indicator. It states what to do at zero, the count
 * once there is one, and it always carries the way out - which is the other
 * thing an unmissable mode owes the user.
 *
 * ---------------------------------------------------------------------------
 * THE WAY OUT IS IN THE HEADER, AT EVERY COUNT (2026-10-26)
 *
 * Exit used to be the left button only at zero and turned into Clear on the
 * first selection, so leaving the mode meant scrolling back to the toolbar at
 * the top of the list. "Exit compare" now sits beside the count at every count; Clear
 * stays Clear. The bar also starts above the floating dock: pinned to the
 * screen edge, the dock covered both buttons.
 */
export interface CompareBarProps {
  items: readonly ComparableProperty[];
  /** Compare mode is on. The bar renders on this, not on the item count. */
  active: boolean;
  onRemove: (id: string) => void;
  onClear: () => void;
  onCompare: () => void;
  onExit: () => void;
}

export function CompareBar({
  items,
  active,
  onRemove,
  onClear,
  onCompare,
  onExit,
}: CompareBarProps) {
  const theme = useTheme();
  const dockInset = useDockInset();

  if (!active) return null;

  return (
    <View
      className="absolute inset-x-0 bottom-0 border-t border-border bg-surface px-base pt-sm"
      // The surface runs to the screen edge and the dock floats on it; the
      // controls end above the dock.
      style={{ paddingBottom: dockInset + spacing.sm }}
    >
      <View className="flex-row items-center justify-between">
        <Text variant="footnote" tone="secondary" className="flex-1">
          {items.length === 0
            ? 'Select ' + MIN_COMPARE + ' or more properties to compare'
            : items.length + (items.length === 1 ? ' property' : ' properties') + ' selected for comparison'}
        </Text>
        {/* Tinted like the lit compare toggle in the toolbar, so it reads as
            the off switch for that same mode. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Exit compare mode"
          hitSlop={gesture.hitSlop}
          onPress={onExit}
          className="ml-sm flex-row items-center rounded-full px-md"
          style={{ minHeight: 36, backgroundColor: theme.colors.accentMuted }}
        >
          <Ionicons name="close" size={18} color={theme.colors.accent} />
          <Text variant="callout" tone="accent" className="ml-xs" style={{ fontWeight: '600' }}>
            Exit compare
          </Text>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-sm" contentContainerStyle={CHIP_ROW_STYLE}>
        {items.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${item.title} from comparison`}
            onPress={() => onRemove(item.id)}
            className="flex-row items-center rounded-full border border-border bg-surface-muted py-xs pl-xs pr-sm"
          >
            {item.coverImage ? (
              <Image uri={item.coverImage} size="thumb" style={THUMB_STYLE} />
            ) : (
              <View className="h-6 w-6 rounded-full bg-surface" />
            )}
            <Text variant="caption" numberOfLines={1} className="ml-xs max-w-[120px]">
              {item.title}
            </Text>
            <Ionicons name="close" size={12} color={theme.colors.textMuted} className="ml-xs" />
          </Pressable>
        ))}
      </ScrollView>

      <View className="mt-sm flex-row items-center gap-sm">
        {/* Exit leaves the mode; Clear only empties the selection. Two
            different things, and collapsing them would mean a user who wants
            to keep comparing but start over has to re-enter the mode. */}
        <Button
          label="Clear"
          variant="secondary"
          disabled={items.length === 0}
          onPress={onClear}
          className="flex-1"
        />
        <Button
          label="Compare now"
          disabled={items.length < MIN_COMPARE}
          onPress={onCompare}
          className="flex-1"
        />
      </View>
    </View>
  );
}

const CHIP_ROW_STYLE = { gap: 8 } as const;
const THUMB_STYLE = { width: 24, height: 24, borderRadius: 12 } as const;
