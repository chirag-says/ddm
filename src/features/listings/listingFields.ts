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
  appendIfPresent(form, 'deposit', values.deposit);
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
    const bookingAmount = num(values.bookingAmount);
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
    const washrooms = num(values.washrooms);
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
      const value = num(raw);
      if (value !== undefined) form.append(key, String(value));
    }
  }
}
