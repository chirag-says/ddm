/**
 * The inbox in day groups: Today, Yesterday, This week, Earlier.
 *
 * A hundred rows in one undivided column is a wall; four labelled runs are a
 * feed someone can place themselves in. The groups are coarse on purpose. A
 * heading per calendar day would put a heading over every row on a quiet
 * account, which is most accounts.
 *
 * Rows arrive newest first and stay in that order inside a group. A row with
 * no readable date goes to Earlier rather than being dropped: it is still a
 * notification, it just cannot be placed.
 *
 * No imports, so `node --test` loads this file directly.
 */

export type InboxGroupKey = 'today' | 'yesterday' | 'week' | 'earlier';

export const INBOX_GROUP_LABELS: Record<InboxGroupKey, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  week: 'This week',
  earlier: 'Earlier',
};

const GROUP_ORDER: InboxGroupKey[] = ['today', 'yesterday', 'week', 'earlier'];
const DAY_MS = 24 * 60 * 60 * 1000;

/** Local midnight for the moment given. */
function startOfDay(at: Date): number {
  const d = new Date(at);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function inboxGroupFor(iso: string | undefined, now: Date = new Date()): InboxGroupKey {
  if (!iso) return 'earlier';
  const when = new Date(iso).getTime();
  if (Number.isNaN(when)) return 'earlier';

  const today = startOfDay(now);
  if (when >= today) return 'today';
  if (when >= today - DAY_MS) return 'yesterday';
  if (when >= today - 6 * DAY_MS) return 'week';
  return 'earlier';
}

export interface InboxGroup<T> {
  key: InboxGroupKey;
  label: string;
  items: T[];
}

/** Groups that have at least one row, in Today → Earlier order. */
export function groupInbox<T extends { createdAt?: string }>(
  items: readonly T[],
  now: Date = new Date()
): InboxGroup<T>[] {
  const buckets: Record<InboxGroupKey, T[]> = { today: [], yesterday: [], week: [], earlier: [] };
  for (const item of items) buckets[inboxGroupFor(item.createdAt, now)].push(item);

  return GROUP_ORDER.filter((key) => buckets[key].length > 0).map((key) => ({
    key,
    label: INBOX_GROUP_LABELS[key],
    items: buckets[key],
  }));
}
