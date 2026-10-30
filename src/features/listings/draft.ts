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
 * Photos are drafted since 2026-10-30. Picked photos are cache files the OS
 * may purge, so each one is copied into a folder the app owns and the draft
 * keeps the copy; a resumed draft brings them back. See `draftPhotos.ts`.
 * Drafts written before this carry no photos and resume as before.
 */

import { Directory, File, Paths } from 'expo-file-system';

import { draftStorage } from '@/storage';
import { keepPhotos, releasePhotos, restorePhotos, type PhotoStore } from './draftPhotos';
import { EMPTY_LISTING_FORM, type CategorizedPhoto, type ListingFormValues } from './types';

const DRAFT_KEY = 'listing.new';

interface StoredDraft {
  ownerId: string | null;
  values: Partial<ListingFormValues>;
  photos?: CategorizedPhoto[];
}

function read(): StoredDraft | null {
  const raw = draftStorage.getString(DRAFT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && 'values' in parsed) {
      const stored = parsed as StoredDraft;
      return { ownerId: stored.ownerId ?? null, values: stored.values ?? {}, photos: stored.photos ?? [] };
    }
    // Pre-ownership format: the bare form values.
    return { ownerId: null, values: (parsed ?? {}) as Partial<ListingFormValues>, photos: [] };
  } catch {
    return null;
  }
}

function write(draft: StoredDraft): void {
  draftStorage.set(DRAFT_KEY, JSON.stringify(draft));
}

function belongsTo(draft: StoredDraft, ownerId: string | null | undefined): boolean {
  return draft.ownerId === null || draft.ownerId === (ownerId ?? null);
}

/** The app-owned folder the draft's photo copies live in. */
function photoFolder(): Directory {
  const folder = new Directory(Paths.document, 'listing-draft');
  if (!folder.exists) folder.create({ intermediates: true, idempotent: true });
  return folder;
}

const photoStore: PhotoStore = {
  owns: (uri) => uri.startsWith(photoFolder().uri),
  copyIn: (uri) => {
    // A unique name that keeps the extension, which the upload's MIME type
    // is read from.
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${uri.split('/').pop() ?? 'photo.jpg'}`;
    const copy = new File(photoFolder(), name);
    new File(uri).copy(copy);
    return copy.uri;
  },
  exists: (uri) => new File(uri).exists,
  remove: (uri) => {
    const file = new File(uri);
    if (file.exists) file.delete();
  },
};

export function loadListingDraft(ownerId?: string | null): ListingFormValues {
  const draft = read();
  if (!draft || !belongsTo(draft, ownerId)) return EMPTY_LISTING_FORM;
  return { ...EMPTY_LISTING_FORM, ...draft.values };
}

/** The draft's photos whose copies are still on the phone. */
export function loadListingDraftPhotos(ownerId?: string | null): CategorizedPhoto[] {
  const draft = read();
  if (!draft || !belongsTo(draft, ownerId)) return [];
  return restorePhotos(draft.photos ?? [], photoStore);
}

/** Saves the form; the draft's photos are left as they are. */
export function saveListingDraft(values: ListingFormValues, ownerId?: string | null): void {
  write({ ownerId: ownerId ?? null, values, photos: read()?.photos ?? [] });
}

/**
 * Saves the photos: new ones are copied in, removed ones' copies deleted.
 * Returns the photos as the form should hold them, pointing at the copies.
 */
export function saveListingDraftPhotos(
  photos: readonly CategorizedPhoto[],
  values: ListingFormValues,
  ownerId?: string | null
): CategorizedPhoto[] {
  const before = read()?.photos ?? [];
  const kept = keepPhotos(photos, photoStore);
  releasePhotos(before, kept, photoStore);
  write({ ownerId: ownerId ?? null, values, photos: kept });
  return kept;
}

/** Ends the draft, photo copies included (after posting, or "Start over"). */
export function clearListingDraft(): void {
  const before = read()?.photos ?? [];
  releasePhotos(before, [], photoStore);
  draftStorage.remove(DRAFT_KEY);
}

/** True when there is a draft THIS account may resume. */
export function hasListingDraft(ownerId?: string | null): boolean {
  const draft = read();
  return draft !== null && belongsTo(draft, ownerId);
}
