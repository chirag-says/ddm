import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { appendListingFields } from './listingFields.ts';
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
