/**
 * Wire-format builders for `POST /properties/add` and
 * `PUT /properties/my-properties/:id`.
 *
 * These two endpoints do NOT share a contract despite both accepting "a
 * property". Read before changing either builder:
 *
 * ADD (`addProperty`, propertyController.js:258) sanitises through a strict
 * field-name WHITELIST (`PROPERTY_ALLOWED_FIELDS`) before `Property.create`.
 * Only fields in that whitelist reach the document at all, and several
 * whitelist entries (`floor`, `age`, `availability`, `builtUpArea` as a flat
 * field, `parkingCovered`/`parkingOpen` as flats, `flooring`, `ownershipType`…)
 * do not correspond to any real schema path — Mongoose's default strict mode
 * silently drops them. This builder only ever sends the INTERSECTION of the
 * whitelist and the real schema (`backend/models/Property.js`), because
 * anything outside that intersection is a field that looks like it saved and
 * did not. `address` is sent as a real nested object here; the whitelist and
 * the schema agree on that shape for this endpoint.
 *
 * EDIT (`updateMyProperty`, propertyController.js:1258) has NO whitelist —
 * whatever is on `req.body` reaches `Property.findByIdAndUpdate` directly,
 * filtered only by Mongoose schema binding. So real schema field names work
 * directly here (including `categoryName`/`propertyTypeName`, which the
 * whitelist also uses, so those two are the same on both paths). The one field
 * that is NOT safe to send as a nested object here is `address`: the
 * controller unconditionally REBUILDS `data.address` from flat top-level
 * `city`/`locality`/`landmark`/`latitude`/`longitude`, and stuffs whatever was
 * sent as `data.address` into a non-schema `address.full` string instead of
 * merging it. There is no way to edit `address.line`/`state`/`pincode` through
 * this endpoint — not a client limitation, a server one — so this app does not
 * offer to.
 *
 * IMAGES on edit are their own landmine: `updateMyProperty` unconditionally
 * REBUILDS `categorizedImages` from `existingCategorizedImages` (JSON) plus any
 * newly uploaded files, and then rebuilds the flat `images` array FROM that. A
 * request that omits `existingCategorizedImages` wipes every photo the listing
 * had, silently, because "no existing images were named" reads to that
 * controller as "there are now no images." This app always sends the current
 * photo set back as `existingCategorizedImages`, tagged with whichever bucket
 * key each photo actually carries (`existingCategorizedPhotos` in
 * `editAdapter.ts`), and new photos go in under the category the owner picked
 * for each one in the form's photo step.
 *
 * ---------------------------------------------------------------------------
 * ADD AND EDIT DISAGREE ON THE WIRE FORMAT FOR NEW CATEGORISED PHOTOS TOO —
 * read this before changing either photo builder below.
 *
 * ADD (`addProperty`, propertyController.js:315-363): new categorised photos
 * go under the file field `categorizedImages` (NOT `images` — that field is
 * "legacy", read separately). `imageCategoryMap` is an OBJECT,
 * `{ [categoryKey]: indices[] }`, and only `indices.length` is ever read —
 * the values inside the array are ignored. Photos are consumed by walking
 * `Object.entries(categoryMap)` in order and taking that many files
 * sequentially off `categorizedUrls`, so the FILES MUST BE UPLOADED PRE-GROUPED
 * BY CATEGORY, in the same order the map's keys are written, not in whatever
 * order the owner picked them. `buildCategorizedImageMap` does that grouping.
 *
 * EDIT (`updateMyProperty`, propertyController.js:1420-1440): new categorised
 * photos go under `images` (not `categorizedImages`). `imageCategoryMap` here
 * is an ARRAY, `[{index, category}, ...]`, but the controller's forEach keys
 * off its own loop index, not the `index` field inside each entry — so the
 * array's POSITION must match the upload order exactly, one entry per file, in
 * the order the owner added them. No pre-grouping needed here, unlike add.
 */

import type { CategorizedPhoto, ListingFormValues } from './types';
import { existingImagesPayload } from './existingImages';
import { appendIfPresent, appendListingFields } from './listingFields';
import { imagePart } from './imagePicker';

/**
 * Groups photos by category, preserving first-seen category order. ADD's
 * wire format needs this grouping — see the module doc above. Returns both
 * the flattened, group-ordered URI list (upload this, in this order) and the
 * map to send as `imageCategoryMap`.
 */
function buildCategorizedImageMap(photos: readonly CategorizedPhoto[]): {
  orderedUris: string[];
  categoryMap: Record<string, number[]>;
} {
  const byCategory = new Map<string, string[]>();
  for (const photo of photos) {
    const bucket = byCategory.get(photo.category);
    if (bucket) bucket.push(photo.uri);
    else byCategory.set(photo.category, [photo.uri]);
  }

  const orderedUris: string[] = [];
  const categoryMap: Record<string, number[]> = {};
  for (const [category, uris] of byCategory) {
    // Only `.length` is read server-side (see the module doc); the actual
    // values just need to be an array of the right length.
    categoryMap[category] = uris.map((_, i) => i);
    orderedUris.push(...uris);
  }

  return { orderedUris, categoryMap };
}

/**
 * A coordinate field as a number, or undefined.
 *
 * `undefined` for anything unparseable AND for exactly 0: a 0/0 coordinate is
 * off the west coast of Africa, and the property adapter already treats it as
 * "no location", so sending it would create the very row the read path has to
 * defend against.
 */
function coord(value: string): number | undefined {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed === 0) return undefined;
  return parsed;
}

/** `POST /properties/add`. New photos only — there is nothing to preserve yet. */
export function buildAddFormData(
  values: ListingFormValues,
  newPhotos: readonly CategorizedPhoto[]
): FormData {
  const form = new FormData();
  appendListingFields(form, values);

  form.append(
    'address',
    JSON.stringify({
      line: values.addressLine.trim(),
      city: values.city.trim(),
      area: values.locality.trim(),
      state: values.state.trim(),
      pincode: values.pincode.trim(),
      landmark: values.landmark.trim() || undefined,
      // `address.nearby: [String]`. Add-path only: `updateMyProperty` rebuilds
      // `data.address` from flat top-level fields and would discard this.
      nearby: values.nearby.length > 0 ? values.nearby : undefined,
      /*
        The pinned coordinate, inside `address` where the schema keeps it.

        Mobile sent none at all before the location step existed, which is a
        large part of why so much of the corpus cannot be placed on the search
        map or distance-sorted. `coord()` drops anything unparseable rather than
        sending NaN, so a half-typed figure in the manual field is omitted
        instead of poisoning the record.
      */
      latitude: coord(values.latitude),
      longitude: coord(values.longitude),
    })
  );
  form.append('city', values.city.trim());
  form.append('locality', values.locality.trim());

  if (newPhotos.length > 0) {
    const { orderedUris, categoryMap } = buildCategorizedImageMap(newPhotos);
    form.append('imageCategoryMap', JSON.stringify(categoryMap));
    orderedUris.forEach((uri, index) => {
      form.append('categorizedImages', imagePart(uri, index));
    });
  }

  return form;
}

/**
 * `PUT /properties/my-properties/:id`. `existingPhotos` MUST be the complete
 * set of photos the listing should keep — see the module doc for why
 * omitting one wipes the gallery instead of leaving it alone.
 */
export function buildEditFormData(
  values: ListingFormValues,
  newPhotos: readonly CategorizedPhoto[],
  existingPhotos: readonly CategorizedPhoto[]
): FormData {
  const form = new FormData();
  appendListingFields(form, values);

  appendIfPresent(form, 'city', values.city);
  appendIfPresent(form, 'locality', values.locality);
  appendIfPresent(form, 'landmark', values.landmark);

  // Flat `{ kitchen: [...] }`; the server picks the bucket. See `existingImagesPayload`.
  form.append('existingCategorizedImages', JSON.stringify(existingImagesPayload(existingPhotos)));

  if (newPhotos.length > 0) {
    const categoryMap = newPhotos.map((photo, index) => ({ index, category: photo.category }));
    form.append('imageCategoryMap', JSON.stringify(categoryMap));
    newPhotos.forEach((photo, index) => {
      form.append('images', imagePart(photo.uri, index));
    });
  }

  return form;
}
