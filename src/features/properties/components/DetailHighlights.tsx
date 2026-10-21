import type Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';

import { Tag } from '@/ui';
import type { PropertyDetail } from '../types';

/**
 * The listing's character in a row of pills: furnished or not, ready or under
 * construction, which way it faces, when it is free, what parks.
 *
 * Everything here is also in the attribute tables further down, and that is
 * the point. The tables are for checking a fact; this row is for getting the
 * gist before deciding whether to read on, which is what the portals'
 * "key highlights" strip does and what the page lacked between the facts and
 * the owner's own words. Only fields with a value appear, in a fixed order,
 * so two listings read the same way side by side.
 *
 * Capped so the row stays a glance. The cap is a count, not a height, because
 * a wrapped second line is fine and a third is a table.
 */

const MAX_HIGHLIGHTS = 6;

interface Highlight {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}

const text = (value: unknown): string | undefined => {
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : undefined;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const count = (value: unknown): number => {
  const n = typeof value === 'number' ? value : Number(text(value));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/** "New" and "1-5 years" are what the form writes; both need a noun. */
function describeAge(age: string): string {
  if (/^new$/i.test(age)) return 'New construction';
  if (/year/i.test(age) && !/old/i.test(age)) return `${age} old`;
  return age;
}

/** "Available now" once the date has passed; the date itself before that. */
function describeAvailability(iso: string, now: Date): string | undefined {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return undefined;
  if (date.getTime() <= now.getTime()) return 'Available now';
  return `Available from ${date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

export function buildHighlights(property: PropertyDetail, now: Date = new Date()): Highlight[] {
  const raw = property.raw;
  const out: Highlight[] = [];

  const furnishing = text(raw.furnishing);
  if (furnishing) out.push({ key: 'furnishing', icon: 'cube-outline', label: furnishing });

  const construction = text(raw.constructionStatus);
  if (construction) {
    out.push({
      key: 'construction',
      icon: /ready/i.test(construction) ? 'checkmark-circle-outline' : 'construct-outline',
      label: construction,
    });
  }

  const facing = text(raw.facing);
  if (facing) out.push({ key: 'facing', icon: 'compass-outline', label: `${facing} facing` });

  const age = text(raw.propertyAge ?? raw.ageOfProperty);
  if (age) out.push({ key: 'age', icon: 'time-outline', label: describeAge(age) });

  const availability = property.availableFrom
    ? describeAvailability(property.availableFrom, now)
    : undefined;
  if (availability) out.push({ key: 'availability', icon: 'calendar-outline', label: availability });

  const covered = count(raw.parking?.covered);
  const open = count(raw.parking?.open);
  if (covered + open > 0) {
    const parts = [covered > 0 ? `${covered} covered` : null, open > 0 ? `${open} open` : null];
    out.push({ key: 'parking', icon: 'car-outline', label: `${parts.filter(Boolean).join(', ')} parking` });
  }

  // A string on the schema ("Yes" / "No"), never a boolean.
  const pets = text(raw.petFriendly);
  if (pets && /^(yes|true|allowed)$/i.test(pets)) {
    out.push({ key: 'pets', icon: 'paw-outline', label: 'Pets allowed' });
  }

  return out.slice(0, MAX_HIGHLIGHTS);
}

export interface DetailHighlightsProps {
  property: PropertyDetail;
}

export function DetailHighlights({ property }: DetailHighlightsProps) {
  const highlights = buildHighlights(property);
  if (highlights.length === 0) return null;

  return (
    <View className="flex-row flex-wrap gap-sm">
      {highlights.map((item) => (
        <Tag key={item.key} icon={item.icon} label={item.label} />
      ))}
    </View>
  );
}
