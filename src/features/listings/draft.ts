/**
 * Add-listing draft autosave.
 *
 * Only the ADD flow drafts. An edit form starts from a listing that already
 * exists on the server, so there is no local-only state to protect against an
 * app kill the way a half-finished new listing has.
 *
 * A draft is stored with the account it belongs to. Drafts now survive a
 * session that ends on its own (expiry, revocation; see
 * `clearUserScopedStorage`), so the next account to sign in on the same phone
 * could otherwise be offered someone else's address and asking price. A draft
 * is only ever offered back to the account that wrote it. Drafts written
 * before this change carry no owner and are offered as before.
 *
 * Photos are NOT drafted: they are local cache-file URIs the OS may purge, and
 * a resumed draft pointing at deleted files would fail at upload rather than
 * here. A resumed draft asks for photos again.
 */

import { draftStorage } from '@/storage';
import { EMPTY_LISTING_FORM, type ListingFormValues } from './types';

const DRAFT_KEY = 'listing.new';

interface StoredDraft {
  ownerId: string | null;
  values: Partial<ListingFormValues>;
}

function read(): StoredDraft | null {
  const raw = draftStorage.getString(DRAFT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && 'values' in parsed) {
      const stored = parsed as StoredDraft;
      return { ownerId: stored.ownerId ?? null, values: stored.values ?? {} };
    }
    // Pre-ownership format: the bare form values.
    return { ownerId: null, values: (parsed ?? {}) as Partial<ListingFormValues> };
  } catch {
    return null;
  }
}

function belongsTo(draft: StoredDraft, ownerId: string | null | undefined): boolean {
  return draft.ownerId === null || draft.ownerId === (ownerId ?? null);
}

export function loadListingDraft(ownerId?: string | null): ListingFormValues {
  const draft = read();
  if (!draft || !belongsTo(draft, ownerId)) return EMPTY_LISTING_FORM;
  return { ...EMPTY_LISTING_FORM, ...draft.values };
}

export function saveListingDraft(values: ListingFormValues, ownerId?: string | null): void {
  const stored: StoredDraft = { ownerId: ownerId ?? null, values };
  draftStorage.set(DRAFT_KEY, JSON.stringify(stored));
}

export function clearListingDraft(): void {
  draftStorage.remove(DRAFT_KEY);
}

/** True when there is a draft THIS account may resume. */
export function hasListingDraft(ownerId?: string | null): boolean {
  const draft = read();
  return draft !== null && belongsTo(draft, ownerId);
}
