import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Property } from '@/types/backend/property';
import { propertyToFormValues } from './editAdapter.ts';
import { appendListingFields } from './listingFields.ts';

const listing = (extra: Partial<Property>): Property =>
  ({
    _id: 'p1',
    title: '3 BHK Apartment / Flat for Rent in kivale',
    categoryName: 'Residential',
    propertyTypeName: 'Apartment / Flat',
    listingType: 'Rent',
    price: 36000,
    ...extra,
  }) as Property;

function resent(property: Property): Record<string, string> {
  const out: Record<string, string> = {};
  appendListingFields({ append: (k, v) => void (out[k] = v) }, propertyToFormValues(property));
  return out;
}

describe('propertyToFormValues', () => {
  it('fills the BHK picker, which reads bhkType', () => {
    const v = propertyToFormValues(listing({ bhk: '3 BHK' }));
    assert.equal(v.bhkType, '3 BHK');
  });

  it('reads a website "Included" maintenance as the flag, not an amount', () => {
    const v = propertyToFormValues(listing({ maintenance: 'Included' }));
    assert.equal(v.maintenanceIncluded, true);
    assert.equal(v.maintenance, '');
  });

  it('reads an amount as not included', () => {
    const v = propertyToFormValues(listing({ maintenance: 2500 }));
    assert.equal(v.maintenanceIncluded, false);
    assert.equal(v.maintenance, '2500');
  });

  it('reads a stored 0 area as empty', () => {
    const v = propertyToFormValues(listing({ area: { carpetSqft: 980, builtUpSqft: 1200, superBuiltUpSqft: 0 } }));
    assert.equal(v.superBuiltUpSqft, '');
    assert.equal(v.builtUpSqft, '1200');
  });

  it('does not invent answers the listing never had', () => {
    const v = propertyToFormValues(listing({}));
    assert.equal(v.propertyAge, '');
    assert.equal(v.allowedFor, '');
    assert.equal(v.petFriendly, '');
  });

  it('falls back to ageOfProperty, the website\'s other name for age', () => {
    assert.equal(propertyToFormValues(listing({ ageOfProperty: '5-10 Years' })).propertyAge, '5-10 Years');
  });

  it('an untouched edit sends back what was stored', () => {
    const f = resent(
      listing({
        bhk: '3 BHK',
        maintenance: 'Included',
        maintenanceIncluded: true,
        propertyAge: '1-5 Years',
        allowedFor: 'Bachelor Female',
        petFriendly: 'Yes',
      })
    );
    assert.equal(f.bhk, '3 BHK');
    assert.equal(f.maintenance, 'Included');
    assert.equal(f.propertyAge, '1-5 Years');
    assert.equal(f.allowedFor, 'Bachelor Female');
    assert.equal(f.petFriendly, 'Yes');

    const sale = resent(listing({ listingType: 'Sell', gstApplicable: 'Yes', bookingAmount: 100000 }));
    assert.equal(sale.gstApplicable, 'Yes');
    assert.equal(sale.bookingAmount, '100000');
  });
});
