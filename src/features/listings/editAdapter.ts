import type { Property } from '@/types/backend/property';
import { EMPTY_LISTING_FORM, type CategorizedPhoto, type ListingFormValues } from './types.ts';

const asString = (value: unknown): string => (value === undefined || value === null ? '' : String(value));
const positiveString = (value: unknown): string => (Number(value) > 0 ? String(value) : '');

export function propertyToFormValues(property: Property): ListingFormValues {
  /*
    The stored category, verbatim.

    This used to collapse anything that was not exactly `Commercial` down to
    `Residential`, which silently rewrote a `Land & Plots` listing's category
    the moment its owner opened Edit — and then submitted the rewrite.
  */
  return {
    ...EMPTY_LISTING_FORM,
    categoryName: property.categoryName ?? 'Residential',
    propertyTypeName: property.propertyTypeName ?? '',
    listingType: /rent/i.test(property.listingType ?? '') ? 'Rent' : 'Sale',
    title: property.title ?? '',
    description: property.description ?? '',

    addressLine: property.address?.line ?? '',
    city: property.address?.city ?? property.city ?? '',
    locality: property.address?.area ?? property.locality ?? '',
    state: property.address?.state ?? '',
    pincode: property.address?.pincode ?? '',
    landmark: property.address?.landmark ?? '',

    price: asString(property.price),
    negotiable: property.negotiable ?? false,
    deposit: asString(property.deposit),
    // The website stores an inclusive rent as maintenance "Included" (a string
    // in a Mixed field); that is a flag, not an amount for the number input.
    maintenance: property.maintenance === 'Included' ? '' : asString(property.maintenance),
    maintenanceIncluded:
      property.maintenanceIncluded ?? (property.maintenance === 'Included' || !property.maintenance),
    securityDeposit: asString(property.securityDeposit),
    bookingAmount: asString(property.bookingAmount),
    gstApplicable: property.gstApplicable === 'Yes',

    // A stored 0 is "not given", not a measurement; reading it back as "0" made
    // the review show "0 super built-up" and let 0 win the ₹/sqft calculation.
    totalSqft: positiveString(property.area?.totalSqft),
    carpetSqft: positiveString(property.area?.carpetSqft),
    builtUpSqft: positiveString(property.area?.builtUpSqft),
    superBuiltUpSqft: positiveString(property.area?.superBuiltUpSqft),
    plotSqft: positiveString(property.area?.plotSqft),
    // `area.pricePerSqft` is intentionally not read back: it is derived on
    // submit, so round-tripping it would let a stale value survive a price
    // change.

    // The BHK picker and the review both read `bhkType`; filling only `bhk` left
    // the picker blank on every edit.
    bhkType: property.bhk ?? '',
    bhk: property.bhk ?? '',
    bedrooms: asString(property.bedrooms),
    bathrooms: asString(property.bathrooms),
    balconies: asString(property.balconies),
    furnishing: property.furnishing ?? '',
    totalFloors: property.totalFloors ?? '',
    facing: property.facing ?? '',
    constructionStatus: property.constructionStatus ?? '',
    // Empty rather than the new-listing defaults when the listing never had
    // them, so an edit does not assert "New" / "Family" / "No" on the owner's
    // behalf. The website stores age under both names.
    propertyAge: property.propertyAge ?? property.ageOfProperty ?? '',
    allowedFor: property.allowedFor ?? '',
    petFriendly: property.petFriendly ?? '',
    servantRoom: property.extras?.servantRoom ?? false,
    poojaRoom: property.extras?.poojaRoom ?? false,
    studyRoom: property.extras?.studyRoom ?? false,
    storeRoom: property.extras?.storeRoom ?? false,

    washrooms: asString(property.washrooms),
    /*
      Rebuilt from whatever the stored listing happens to carry rather than from
      a fixed field list, because the set of commercial config keys depends on
      the property type. Unknown keys are simply not shown by the form; they are
      also not destroyed, since the form only submits what it holds.
    */
    commercialConfig: {},

    parkingCovered: asString(property.parking?.covered),
    parkingOpen: asString(property.parking?.open),
    reraId: property.legal?.reraId ?? '',
    occupancyCertificate: property.legal?.occupancyCertificate ?? false,
    tradeLicense: property.legal?.tradeLicense ?? false,
    fireNoc: property.legal?.fireNoc ?? false,

    // Schema type is `Date`, so this arrives as an ISO string. The form wants
    // `YYYY-MM-DD`, which is its leading 10 characters.
    availableFrom: property.availableFrom ? String(property.availableFrom).slice(0, 10) : '',

    // Read back so an edit does not silently drop them, even though
    // `updateMyProperty` rebuilds `address` from flat fields and will not
    // persist a change — see `formData.ts`.
    nearby: property.address?.nearby ?? [],

    amenities: property.amenities ?? [],
  };
}

/**
 * Every photo the listing currently has, tagged with the category bucket key
 * it actually lives under. This is what `buildEditFormData` sends back as
 * `existingCategorizedImages` to avoid wiping the gallery — see the module
 * doc in `formData.ts` for why omitting a photo here deletes it, not just
 * hides it.
 *
 * Falls back to the flat `images[]` array (every entry tagged `other`) only
 * when the categorized buckets are empty — a listing added before this
 * feature, or added on mobile before per-room categorisation existed.
 */
export function existingCategorizedPhotos(property: Property): CategorizedPhoto[] {
  const bucket =
    property.categoryName === 'Commercial'
      ? property.categorizedImages?.commercial
      : property.categorizedImages?.residential;

  if (bucket) {
    const fromBucket: CategorizedPhoto[] = [];
    for (const [category, urls] of Object.entries(bucket)) {
      if (!Array.isArray(urls)) continue;
      for (const uri of urls) {
        if (uri) fromBucket.push({ uri, category });
      }
    }
    if (fromBucket.length > 0) return fromBucket;
  }

  return (property.images ?? []).map((uri) => ({ uri, category: 'other' }));
}
