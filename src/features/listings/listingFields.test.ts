import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { defaultPhotoCategory } from './catalog.ts';
import {
  appendListingFields,
  firstBlockedStep,
  PHOTOS_STEP,
  reconcileType,
  selectCategory,
  stepBlocker,
} from './listingFields.ts';
import { EMPTY_LISTING_FORM, type ListingFormValues } from './types.ts';

/** The fields as the server receives them. Repeated keys would be a bug, so they throw. */
function fieldsOf(overrides: Partial<ListingFormValues>): Record<string, string> {
  const out: Record<string, string> = {};
  appendListingFields(
    {
      append(key, value) {
        assert.ok(!(key in out), `"${key}" sent twice`);
        out[key] = value;
      },
    },
    {
      ...EMPTY_LISTING_FORM,
      title: '3 BHK in kivale',
      propertyTypeName: 'Apartment / Flat',
      price: '36000',
      ...overrides,
    }
  );
  return out;
}

describe('appendListingFields', () => {
  it('sends the rent-only answers in the website format', () => {
    const f = fieldsOf({ listingType: 'Rent', maintenanceIncluded: true, allowedFor: 'Family', petFriendly: 'Yes' });

    assert.equal(f.priceUnit, 'Monthly');
    assert.equal(f.maintenanceIncluded, 'true');
    assert.equal(f.maintenance, 'Included');
    assert.equal(f.allowedFor, 'Family');
    assert.equal(f.petFriendly, 'Yes');
    assert.equal(f.propertyAge, 'New');
    assert.equal(f.ageOfProperty, 'New');
    assert.ok(!('gstApplicable' in f) && !('bookingAmount' in f), 'sale-only fields stay out of a rental');
  });

  it('sends a maintenance amount when it is not included', () => {
    const f = fieldsOf({ listingType: 'Rent', maintenanceIncluded: false, maintenance: '2500' });
    assert.equal(f.maintenanceIncluded, 'false');
    assert.equal(f.maintenance, '2500');
  });

  it('sends the sale-only answers in the website format', () => {
    const f = fieldsOf({ listingType: 'Sale', price: '9500000', gstApplicable: true, bookingAmount: '100000' });

    assert.equal(f.priceUnit, 'Total');
    assert.equal(f.gstApplicable, 'Yes');
    assert.equal(f.bookingAmount, '100000');
    assert.equal(fieldsOf({ listingType: 'Sale', gstApplicable: false }).gstApplicable, 'No');
    for (const rentOnly of ['maintenanceIncluded', 'allowedFor', 'petFriendly']) {
      assert.ok(!(rentOnly in f), `${rentOnly} is rent-only`);
    }
  });

  it('treats a 0 area as not given, and rates against the first real one', () => {
    const f = fieldsOf({ carpetSqft: '980', builtUpSqft: '1200', superBuiltUpSqft: '0', price: '36000' });
    assert.ok(f.area, 'area is sent');
    const area = JSON.parse(f.area);

    assert.deepEqual(Object.keys(area).sort(), ['builtUpSqft', 'carpetSqft', 'pricePerSqft']);
    assert.equal(area.pricePerSqft, 30, '36000 / 1200, not a division by the 0');
  });

  it('keeps residential-only answers off a commercial listing', () => {
    const f = fieldsOf({ categoryName: 'Commercial', propertyTypeName: 'Office Space', listingType: 'Rent' });
    for (const key of ['propertyAge', 'ageOfProperty', 'allowedFor', 'petFriendly', 'bhk']) {
      assert.ok(!(key in f), `${key} is residential-only`);
    }
  });
});

describe('commercial washrooms', () => {
  // Six commercial types ask "Washrooms" in their per-type configuration as
  // well as in the general field (which defaults to 1). Both were appended, so
  // the server received an array, the number cast failed and the save errored.
  const commercial = (washrooms: string, config: Record<string, string>) =>
    fieldsOf({
      categoryName: 'Commercial',
      propertyTypeName: 'Office Space',
      washrooms,
      commercialConfig: config,
    });

  it('is sent once when the per-type box is filled, and that answer wins', () => {
    const f = commercial('1', { washrooms: '4', workstations: '20' });
    assert.equal(f.washrooms, '4');
    assert.equal(f.workstations, '20');
  });

  it('falls back to the general field when the per-type box is empty', () => {
    const f = commercial('2', { washrooms: '', workstations: '20' });
    assert.equal(f.washrooms, '2');
  });
});

const TAXONOMY = [
  { name: 'Residential', types: ['Apartment / Flat', 'Villa'] },
  { name: 'Commercial', types: ['Office Space', 'Shop / Retail'] },
];

describe('choosing a category', () => {
  const villa: ListingFormValues = {
    ...EMPTY_LISTING_FORM,
    categoryName: 'Residential',
    propertyTypeName: 'Villa',
    amenities: ['Swimming Pool'],
  };

  it('switching to Commercial drops the Villa type, sub-type and amenities', () => {
    const next = { ...villa, ...selectCategory(villa, 'Commercial') };
    assert.equal(next.categoryName, 'Commercial');
    assert.equal(next.propertyTypeName, '');
    assert.deepEqual(next.amenities, []);
    // And the form's re-filing check leaves the switch alone.
    assert.equal(reconcileType(next, TAXONOMY), null);
  });

  it('tapping the chosen category again clears it', () => {
    const next = { ...villa, ...selectCategory(villa, 'Residential') };
    assert.equal(next.categoryName, '');
    assert.equal(next.propertyTypeName, '');
  });

  it('an Edit screen seeded with Villa under the wrong category is moved, not wiped', () => {
    const seeded = { categoryName: 'Commercial', propertyTypeName: 'Villa' };
    assert.deepEqual(reconcileType(seeded, TAXONOMY), { categoryName: 'Residential' });
  });

  it('a type the server does not know is cleared', () => {
    const seeded = { categoryName: 'Residential', propertyTypeName: 'Castle' };
    assert.deepEqual(reconcileType(seeded, TAXONOMY), { propertyTypeName: '' });
  });
});

describe('what each step requires', () => {
  const complete: ListingFormValues = {
    ...EMPTY_LISTING_FORM,
    categoryName: 'Residential',
    propertyTypeName: 'Apartment / Flat',
    title: '2 BHK in Kharghar',
    locality: 'Kharghar',
    city: 'Navi Mumbai',
    price: '9500000',
    builtUpSqft: '950',
    bhkType: '2 BHK',
  };

  it('the Photos step cannot be left with no photo', () => {
    assert.equal(stepBlocker(PHOTOS_STEP, complete, 0), 'Add at least one photo to continue.');
    assert.equal(stepBlocker(PHOTOS_STEP, complete, 1), null);
  });

  it('a home with no BHK chosen cannot leave Details', () => {
    assert.equal(stepBlocker(4, { ...complete, bhkType: '' }, 1), 'Choose the BHK to continue.');
  });

  it('a Studio needs no BHK, and nor does a shop', () => {
    assert.equal(stepBlocker(4, { ...complete, propertyTypeName: 'Studio Apartment', bhkType: '' }, 1), null);
    assert.equal(
      stepBlocker(4, { ...complete, categoryName: 'Commercial', propertyTypeName: 'Shop / Retail', bhkType: '' }, 1),
      null
    );
  });

  it('a price with no built-up area cannot leave Price & area', () => {
    assert.equal(stepBlocker(3, { ...complete, builtUpSqft: '' }, 1), 'Enter the built-up area.');
    assert.equal(stepBlocker(3, { ...complete, builtUpSqft: '0' }, 1), 'Enter the built-up area.');
  });

  it('Review sends the owner to the first step still missing something', () => {
    assert.equal(firstBlockedStep(complete, 1), null);
    assert.deepEqual(firstBlockedStep(complete, 0), { step: PHOTOS_STEP, reason: 'Add at least one photo to continue.' });
    assert.equal(firstBlockedStep({ ...complete, builtUpSqft: '' }, 0)?.step, 3);
  });
});

describe('filing a new photo', () => {
  it('the first photo is filed as the outside of the type, the second as Other', () => {
    assert.equal(defaultPhotoCategory('Residential', 'Villa', 0), 'exterior');
    assert.equal(defaultPhotoCategory('Commercial', 'Office Space', 0), 'facade');
    assert.equal(defaultPhotoCategory('Residential', 'Villa', 1), 'other');
  });

  it('an unknown type falls back to its category set, still the outside first', () => {
    assert.equal(defaultPhotoCategory('Residential', 'Treehouse', 0), 'exterior');
  });
});

describe('money typed with commas', () => {
  it('a deposit and booking amount typed with commas are sent as digits', () => {
    assert.equal(fieldsOf({ listingType: 'Rent', deposit: '50,000' }).deposit, '50000');
    assert.equal(fieldsOf({ listingType: 'Sale', bookingAmount: '1,00,000' }).bookingAmount, '100000');
  });
});
