import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  composeLocation,
  describeFloor,
  isPlusCode,
  normalizeAmenities,
  readMoney,
  readableAddressLine,
} from './detailFormat.ts';

describe('normalizeAmenities', () => {
  it('expands an entry that is a JSON list, as listings before the server fix carry', () => {
    assert.deepEqual(
      normalizeAmenities(['["CCTV","Parking Covered","AC"]']),
      ['CCTV', 'Parking Covered', 'AC']
    );
  });

  it('keeps plain entries, drops blanks and collapses duplicates', () => {
    assert.deepEqual(normalizeAmenities(['Lift', ' ', 'Gym', 'lift', '']), ['Lift', 'Gym']);
  });

  it('keeps a bracketed entry that is not valid JSON as written', () => {
    assert.deepEqual(normalizeAmenities(['[not a list']), ['[not a list']);
  });

  it('ignores non-strings and an absent field', () => {
    assert.deepEqual(normalizeAmenities([3, null, 'Pool']), ['Pool']);
    assert.deepEqual(normalizeAmenities(undefined), []);
  });
});

describe('plus codes', () => {
  it('recognises the short and full forms', () => {
    assert.equal(isPlusCode('4JVH+2C9'), true);
    assert.equal(isPlusCode('7JWV8G5C+XP'), true);
    assert.equal(isPlusCode(' 4jvh+2c9 '), true);
  });

  it('leaves real addresses alone', () => {
    assert.equal(isPlusCode('12 MG Road'), false);
    assert.equal(isPlusCode('Flat 4, Vayu Vihar'), false);
    assert.equal(isPlusCode(undefined), false);
  });

  it('readableAddressLine hides a plus code and blanks, keeps a street', () => {
    assert.equal(readableAddressLine('4JVH+2C9'), undefined);
    assert.equal(readableAddressLine('  '), undefined);
    assert.equal(readableAddressLine(' 12 MG Road '), '12 MG Road');
  });
});

describe('composeLocation', () => {
  it('joins locality and city', () => {
    assert.equal(composeLocation('Baner', 'Pune'), 'Baner, Pune');
  });

  it('collapses the pair when they name the same place', () => {
    assert.equal(composeLocation('Hunasamaranahalli', 'Hunasamaranahalli'), 'Hunasamaranahalli');
    assert.equal(composeLocation('pune', 'Pune'), 'pune');
  });

  it('drops a missing half', () => {
    assert.equal(composeLocation(undefined, 'Pune'), 'Pune');
    assert.equal(composeLocation('Baner', ''), 'Baner');
    assert.equal(composeLocation(undefined, undefined), '');
  });
});

describe('readMoney', () => {
  it('reads numbers and numeric strings as amounts', () => {
    assert.deepEqual(readMoney(120000), { amount: 120000 });
    assert.deepEqual(readMoney('120000'), { amount: 120000 });
    assert.deepEqual(readMoney('₹1,20,000'), { amount: 120000 });
  });

  it('passes free text through', () => {
    assert.deepEqual(readMoney('Included'), { text: 'Included' });
    assert.deepEqual(readMoney('2 months'), { text: '2 months' });
  });

  it('drops zero, negatives, blanks and other types', () => {
    assert.equal(readMoney(0), undefined);
    assert.equal(readMoney('0'), undefined);
    assert.equal(readMoney(''), undefined);
    assert.equal(readMoney(true), undefined);
  });
});

describe('describeFloor', () => {
  it('joins the floor and the building height', () => {
    assert.equal(describeFloor('3', '12'), '3 of 12');
    assert.equal(describeFloor(3, 12), '3 of 12');
  });

  it('says what it knows when only one is present', () => {
    assert.equal(describeFloor('3', undefined), '3');
    assert.equal(describeFloor(undefined, '5'), '5 floors in the building');
    assert.equal(describeFloor('', '1'), '1 floor in the building');
  });

  it('drops out when neither is present', () => {
    assert.equal(describeFloor(undefined, ''), undefined);
  });
});
