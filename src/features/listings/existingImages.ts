import type { CategorizedPhoto } from './types';

/**
 * The `existingCategorizedImages` field for `PUT /properties/my-properties/:id`:
 * a FLAT map of photo category key to URLs, `{ kitchen: [url, ...] }`.
 *
 * Flat, not wrapped in a `residential`/`commercial` bucket. `updateMyProperty`
 * (propertyController.js) iterates the top-level entries and keeps only those
 * whose value is an array, then picks the bucket itself from the listing's
 * category. Until 2026-09-27 this app sent `{ residential: { kitchen: [...] } }`:
 * the single top-level value was an object, so the server kept nothing and
 * rebuilt the gallery empty. Every edit made from the app would have deleted
 * every photo on the listing. The website sends the flat shape, which is why
 * its edits never did.
 *
 * Every photo the listing should keep must be in here; one left out is deleted.
 */
export function existingImagesPayload(photos: readonly CategorizedPhoto[]): Record<string, string[]> {
  const byCategory: Record<string, string[]> = {};
  for (const photo of photos) {
    (byCategory[photo.category] ??= []).push(photo.uri);
  }
  return byCategory;
}
