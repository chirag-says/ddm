import type { CategorizedPhoto } from './types.ts';

/**
 * Photos that survive a draft (2026-10-30).
 *
 * A resumed draft used to ask for every photo again: picked photos are cache
 * files the OS may purge, so only their URIs could be kept, and a URI to a
 * deleted file fails at upload. Each new photo is now copied into a folder
 * the app owns, and the draft keeps the copy. The file operations come in
 * through `PhotoStore` so the rules here run in the Node tests; the real one
 * is in `draft.ts`.
 */
export interface PhotoStore {
  /** True when the URI already points into the draft's own folder. */
  owns(uri: string): boolean;
  /** Copies the file in and returns the copy's URI. Throws when it cannot. */
  copyIn(uri: string): string;
  exists(uri: string): boolean;
  remove(uri: string): void;
}

/**
 * The photos with every new one copied into the store. A photo that cannot
 * be copied keeps its original URI: it still uploads in this session, it just
 * will not come back with a resumed draft, which is how every photo behaved
 * before this.
 */
export function keepPhotos(photos: readonly CategorizedPhoto[], store: PhotoStore): CategorizedPhoto[] {
  return photos.map((photo) => {
    if (store.owns(photo.uri)) return photo;
    try {
      return { ...photo, uri: store.copyIn(photo.uri) };
    } catch {
      return photo;
    }
  });
}

/** Deletes the copies of photos the owner removed. */
export function releasePhotos(
  before: readonly CategorizedPhoto[],
  after: readonly CategorizedPhoto[],
  store: PhotoStore
): void {
  const kept = new Set(after.map((p) => p.uri));
  for (const photo of before) {
    if (store.owns(photo.uri) && !kept.has(photo.uri)) store.remove(photo.uri);
  }
}

/** A stored draft's photos, minus any whose copy has gone missing. */
export function restorePhotos(stored: readonly CategorizedPhoto[], store: PhotoStore): CategorizedPhoto[] {
  return stored.filter((photo) => store.owns(photo.uri) && store.exists(photo.uri));
}
