/**
 * What deleting an account removes and keeps, in the words the user reads.
 *
 * Matches the backend cascade (`deleteUserAggregate` and `USER_RETENTION` in
 * backend/utils/aggregateDelete.js): profile and photo, posted properties,
 * saved properties and searches, sent messages and rewards are deleted;
 * enquiries, deal records and project enquiries are kept for 365 days; reviews
 * stay without a name; a conversation keeps the other person's side.
 *
 * No imports, so `node --test` can load it directly.
 */

export const DELETION_REMOVES =
  'Your profile and photo, the properties you posted, your saved properties and searches, ' +
  'the messages you sent and your reward balance are permanently removed.';

export const DELETION_KEEPS =
  'Kept for one year, then deleted: the enquiries you made, deal records and project enquiries. ' +
  'Reviews you wrote stay, without your name. The other person keeps their side of each conversation.';

/** The server's `kept` codes, as the toast names them. */
const KEPT_LABELS: Record<string, string> = {
  enquiries: 'enquiries',
  deals: 'deal records',
  project_enquiries: 'project enquiries',
};

function listOf(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

function period(days: number): string {
  return days === 365 ? 'one year' : `${days} days`;
}

/**
 * The toast after deletion, from the server's own answer. A listing kept as
 * deal evidence is named first: it contradicts "posted properties are
 * removed", so it is the sentence that must not be lost to the two-line toast.
 */
export function deletionReceipt(response: {
  retainedListings?: number;
  kept?: string[];
  retentionDays?: number;
}): string {
  const n = response.retainedListings ?? 0;
  if (n > 0) {
    return `Account deleted. ${n} ${n === 1 ? 'property' : 'properties'} tied to a live deal ${
      n === 1 ? 'was' : 'were'
    } kept on record.`;
  }
  if (response.kept?.length && response.retentionDays) {
    const labels = response.kept.map((code) => KEPT_LABELS[code] ?? code.replace(/_/g, ' '));
    const sentence = listOf(labels);
    return `Account deleted. Your ${sentence} are kept for ${period(response.retentionDays)}.`;
  }
  return 'Your account has been deleted.';
}
