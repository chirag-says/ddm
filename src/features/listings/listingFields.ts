import type { ListingFormValues } from './types.ts';

/**
 * The listing fields shared by `POST /properties/add` and
 * `PUT /properties/my-properties/:id`, written into anything with `append`.
 *
 * Split out of `formData.ts` on 2026-09-27 so the wire format can be tested:
 * that module imports the native image picker, which the Node test runner
 * cannot load, and the form had been collecting six fields it never sent
 * without any test noticing. See `formData.ts` for the add/edit differences.
 */
export interface FieldSink {
  append(key: string, value: string): void;
}

/**
 * What tapping a category chip does to the form.
 *
 * The type and commercial sub-type belong to a category, so they go in the
 * same write as the category. Written separately, the form's effect that
 * re-files an Edit screen's type under its real category saw "Villa" under
 * Commercial and switched the category straight back, so an owner could not
 * leave Residential once a type was chosen (reported 2026-10-30). Tapping
 * the chosen category again clears it.
 *
 * Amenities and the commercial configuration go too: each category has its
 * own amenity list, so a Swimming Pool ticked under Residential would
 * otherwise be sent with an office.
 */
export function selectCategory(
  values: ListingFormValues,
  name: string
): Pick<
  ListingFormValues,
  'categoryName' | 'propertyTypeName' | 'commercialSubType' | 'amenities' | 'commercialConfig'
> {
  return {
    categoryName: values.categoryName === name ? '' : name,
    propertyTypeName: '',
    commercialSubType: '',
    amenities: [],
    commercialConfig: {},
  };
}

/** The step indexes of the wizard, in order. Photos is the 6th step. */
export const LISTING_STEPS = ['Category', 'Basics', 'Location', 'Price & area', 'Details', 'Photos', 'Review'] as const;
export const PHOTOS_STEP = 5;

/** Server limits (`validators/index.js`): title 5–200. */
export const TITLE_MIN = 5;

/** A Studio has no BHK to choose, on the website and here. */
function isStudio(values: Pick<ListingFormValues, 'propertyTypeName' | 'bhkType'>): boolean {
  return /studio/i.test(values.propertyTypeName) || values.bhkType === 'Studio';
}

function hasPositive(value: string): boolean {
  const n = Number(value.replace(/[^\d.]/g, ''));
  return Number.isFinite(n) && n > 0;
}

/**
 * Why a step cannot be left yet, in the owner's words, or null.
 *
 * Shown in the footer after the first Next press, and on Review for the first
 * step still blocked, so a listing never reaches the server missing what the
 * website requires: a category and type, the locality and city, a price, a
 * built-up area (2026-10-30, website parity), a BHK for homes other than
 * studios (same), and at least one photo (same).
 */
export function stepBlocker(step: number, values: ListingFormValues, photoCount: number): string | null {
  switch (step) {
    case 0:
      if (!values.categoryName.trim()) return 'Choose a category to continue.';
      if (!values.propertyTypeName.trim()) return 'Choose a property type to continue.';
      return null;
    case 1:
      if (values.title.trim().length < TITLE_MIN)
        return `Give the property a title of at least ${TITLE_MIN} characters.`;
      return null;
    case 2:
      if (!values.locality.trim() && !values.city.trim())
        return 'Enter the locality and city, or use your location to fill them in.';
      if (!values.locality.trim()) return 'Enter the locality or area.';
      if (!values.city.trim()) return 'Enter the city.';
      return null;
    case 3:
      if (!values.price.trim())
        return values.listingType === 'Rent' ? 'Enter the monthly rent.' : 'Enter the price.';
      if (!hasPositive(values.builtUpSqft)) return 'Enter the built-up area.';
      return null;
    case 4:
      if (values.categoryName === 'Residential' && !values.bhkType && !isStudio(values))
        return 'Choose the BHK to continue.';
      return null;
    case PHOTOS_STEP:
      if (photoCount < 1) return 'Add at least one photo to continue.';
      return null;
    default:
      return null;
  }
}

/** The first step that is still blocked, for Review to send the owner back to. */
export function firstBlockedStep(
  values: ListingFormValues,
  photoCount: number
): { step: number; reason: string } | null {
  for (let step = 0; step < LISTING_STEPS.length - 1; step += 1) {
    const reason = stepBlocker(step, values, photoCount);
    if (reason) return { step, reason };
  }
  return null;
}

/**
 * Keeps a SEEDED type valid for its category: the Edit screen's case, where
 * the form defaults the category and the stored type may sit under another.
 * Moving the category to match preserves the owner's data; clearing it
 * destroys it. Only a type the server does not know at all is cleared.
 * Returns the fields to change, or null when nothing should.
 *
 * Taps never reach the "move" branch any more: `selectCategory` clears the
 * type in the same write as the category.
 */
export function reconcileType(
  values: Pick<ListingFormValues, 'categoryName' | 'propertyTypeName'>,
  categories: readonly { name: string; types: readonly string[] }[]
): Partial<ListingFormValues> | null {
  if (categories.length === 0 || !values.propertyTypeName) return null;
  const active = categories.find((c) => c.name === values.categoryName);
  if (active?.types.includes(values.propertyTypeName)) return null;
  const owner = categories.find((c) => c.types.includes(values.propertyTypeName));
  if (owner) return owner.name === values.categoryName ? null : { categoryName: owner.name };
  return { propertyTypeName: '' };
}

export function appendIfPresent(form: FieldSink, key: string, value: string | undefined) {
  if (value !== undefined && value.trim() !== '') form.append(key, value.trim());
}

function num(value: string): number | undefined {
  const n = Number(value);
  return value.trim() !== '' && Number.isFinite(n) ? n : undefined;
}

/** An area figure: 0 means "not given", so it is omitted rather than stored. */
function positive(value: string): number | undefined {
  const n = num(value);
  return n !== undefined && n > 0 ? n : undefined;
}

export function appendListingFields(form: FieldSink, values: ListingFormValues) {
  const isRent = values.listingType === 'Rent';

  form.append('title', values.title.trim());
  appendIfPresent(form, 'description', values.description);
  form.append('categoryName', values.categoryName);
  form.append('propertyTypeName', values.propertyTypeName);
  form.append('listingType', values.listingType);
  form.append('negotiable', String(values.negotiable));
  // What the website sends. Omitted, the schema default "Lac" applied, and the
  // website's home page scales a "Lac" price by 1e5 when ranking listings.
  form.append('priceUnit', isRent ? 'Monthly' : 'Total');

  const price = num(values.price);
  if (price !== undefined) form.append('price', String(price));
  // Digits only: "50,000" reached the server with its comma (2026-10-30), and
  // a draft saved before the form stripped commas can still hold one.
  appendIfPresent(form, 'deposit', values.deposit.replace(/[^\d]/g, ''));
  const securityDeposit = num(values.securityDeposit);
  if (securityDeposit !== undefined) form.append('securityDeposit', String(securityDeposit));

  /*
    The money questions that differ by listing type, sent in the website's
    format. The form collected all of these and, until 2026-09-27, sent none.
  */
  if (isRent) {
    form.append('maintenanceIncluded', String(values.maintenanceIncluded));
    if (values.maintenanceIncluded) form.append('maintenance', 'Included');
    else appendIfPresent(form, 'maintenance', values.maintenance);
  } else {
    appendIfPresent(form, 'maintenance', values.maintenance);
    const bookingAmount = num(values.bookingAmount.replace(/[^\d]/g, ''));
    if (bookingAmount !== undefined) form.append('bookingAmount', String(bookingAmount));
    form.append('gstApplicable', values.gstApplicable ? 'Yes' : 'No');
  }

  /**
   * Nested `area.*`, which is where the schema actually keeps these. The FLAT
   * `builtUpArea`/`carpetArea`/`superBuiltUpArea`/`plotArea` whitelist entries
   * are a trap — see the module doc; Mongoose drops them silently.
   *
   * `pricePerSqft` is DERIVED here rather than asked for, the way the website
   * derives it. Asking an owner for a number that is arithmetic over two
   * numbers they already gave invites a contradiction between the three.
   * Computed from super-built-up when present, since that is the area Indian
   * listings conventionally quote a rate against, else built-up, else total.
   */
  const area: Record<string, number> = {};
  const totalSqft = positive(values.totalSqft);
  const carpetSqft = positive(values.carpetSqft);
  const builtUpSqft = positive(values.builtUpSqft);
  const superBuiltUpSqft = positive(values.superBuiltUpSqft);
  const plotSqft = positive(values.plotSqft);
  if (totalSqft !== undefined) area.totalSqft = totalSqft;
  if (carpetSqft !== undefined) area.carpetSqft = carpetSqft;
  if (builtUpSqft !== undefined) area.builtUpSqft = builtUpSqft;
  if (superBuiltUpSqft !== undefined) area.superBuiltUpSqft = superBuiltUpSqft;
  if (plotSqft !== undefined) area.plotSqft = plotSqft;

  const rateArea = superBuiltUpSqft ?? builtUpSqft ?? totalSqft;
  if (price !== undefined && rateArea !== undefined) {
    area.pricePerSqft = Math.round(price / rateArea);
  }

  if (Object.keys(area).length > 0) form.append('area', JSON.stringify(area));

  appendIfPresent(form, 'availableFrom', values.availableFrom);

  if (values.amenities.length > 0) form.append('amenities', JSON.stringify(values.amenities));

  if (values.parkingCovered || values.parkingOpen) {
    form.append(
      'parking',
      JSON.stringify({ covered: values.parkingCovered || '0', open: values.parkingOpen || '0' })
    );
  }

  /**
   * `legal` is sent whole or not at all — it is one nested object, so sending
   * only `reraId` (as this did before 2026-08-13) would leave the three
   * compliance booleans unsettable. They are only included when true: a
   * blanket `false` on every listing asserts "no fire NOC" where the owner
   * simply did not answer.
   */
  const legal: Record<string, string | boolean> = {};
  if (values.reraId.trim()) legal.reraId = values.reraId.trim();
  if (values.occupancyCertificate) legal.occupancyCertificate = true;
  if (values.tradeLicense) legal.tradeLicense = true;
  if (values.fireNoc) legal.fireNoc = true;
  if (Object.keys(legal).length > 0) form.append('legal', JSON.stringify(legal));

  if (values.categoryName === 'Residential') {
    appendIfPresent(form, 'bhk', values.bhk);
    const bedrooms = num(values.bedrooms);
    if (bedrooms !== undefined) form.append('bedrooms', String(bedrooms));
    const bathrooms = num(values.bathrooms);
    if (bathrooms !== undefined) form.append('bathrooms', String(bathrooms));
    const balconies = num(values.balconies);
    if (balconies !== undefined) form.append('balconies', String(balconies));
    appendIfPresent(form, 'furnishing', values.furnishing);
    appendIfPresent(form, 'totalFloors', values.totalFloors);
    appendIfPresent(form, 'facing', values.facing);
    appendIfPresent(form, 'constructionStatus', values.constructionStatus);
    // The website writes age under both names; readers use either.
    appendIfPresent(form, 'propertyAge', values.propertyAge);
    appendIfPresent(form, 'ageOfProperty', values.propertyAge);
    if (isRent) {
      appendIfPresent(form, 'allowedFor', values.allowedFor);
      appendIfPresent(form, 'petFriendly', values.petFriendly);
    }
    form.append(
      'extras',
      JSON.stringify({
        servantRoom: values.servantRoom,
        poojaRoom: values.poojaRoom,
        studyRoom: values.studyRoom,
        storeRoom: values.storeRoom,
      })
    );
  } else {
    // Six types also ask "Washrooms" in their per-type configuration below.
    // Sending both put an array on the wire, which the numeric schema field
    // rejects, so the save failed. One value goes: the per-type answer when the
    // owner gave one (the general field defaults to 1), else the general field.
    const washrooms = num(values.commercialConfig.washrooms ?? '') ?? num(values.washrooms);
    if (washrooms !== undefined) form.append('washrooms', String(washrooms));
    appendIfPresent(form, 'commercialSubType', values.commercialSubType);
    appendIfPresent(form, 'floorHeight', values.floorHeight);
    appendIfPresent(form, 'powerLoad', values.powerLoad);

    /*
      The per-type configuration, flattened.

      The website spreads `COMMERCIAL_CONFIGS[type].fields` flat into `features`
      and sends only the truthy ones, so an Office Space listing carries
      `workstations` and a Warehouse carries `loadingDocks` without either
      needing a column of its own. Empty values are omitted rather than sent as
      0, because "not stated" and "zero loading docks" are different claims.
    */
    for (const [key, raw] of Object.entries(values.commercialConfig)) {
      if (key === 'washrooms') continue; // sent once, above
      const value = num(raw);
      if (value !== undefined) form.append(key, String(value));
    }
  }
}
