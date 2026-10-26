import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Project, UnitType } from '../../types/backend/project.ts';
import { adaptProject, adaptProjectDetail, formatMonthYear, unitSummary } from './adapters.ts';

/** Shaped like the live "One Vaviya" record (GET /projects/:id, 2026-10-26). */
const LIVE: Project = {
  _id: 'p1',
  basics: { name: 'One Vaviya', status: 'Under Construction', description: 'A premium development.' },
  builder: { _id: 'b1', company: 'Neelkanth Developers', name: 'Admin', city: 'Mumbai' } as Project['builder'],
  location: {
    city: 'Mumbai',
    locality: 'Kharghar',
    addressLine: 'Plot No. 5A, Sector 36, Kharghar',
    landmark: 'Next to Harmony School',
    connectivity: { distanceToMetro: '2 km', distanceToAirport: '3 km', distanceToRailway: '', distanceToBusStop: '500 m' },
  },
  overview: {
    launchDate: '2025-05-10T00:00:00.000Z',
    possessionDate: '2029-12-31T00:00:00.000Z',
    totalLandArea: '0.30 Acres',
    totalTowers: 1,
    floorsPerTower: 'G+31',
    totalUnits: 20,
    openSpacePercentage: 0,
  },
  amenities: [
    { category: 'Lifestyle', name: 'Clubhouse' },
    { category: 'Lifestyle', name: 'Swimming Pool' },
    { category: 'Fitness', name: 'Gym' },
    { category: 'Lifestyle', name: 'Clubhouse' },
  ],
  nearbyPlaces: [
    { category: 'Education', name: 'Harmony School', distance: 'Adjacent' },
    { category: 'Healthcare', name: 'Tata Memorial Hospital', distance: '5km' },
  ],
  media: {
    exteriorImages: ['ext.jpg'],
    droneImages: ['drone.jpg'],
    amenityImages: ['pool.jpg', 'ext.jpg'],
    masterPlan: ['plan.jpg'],
    locationMap: ['map.jpg'],
  },
  priceRange: { min: 15_600_000, max: 16_400_000 },
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
};

describe('the project detail page', () => {
  it('shows amenities the admin panel saved as { category, name } objects, without duplicates', () => {
    assert.deepEqual(adaptProjectDetail(LIVE).amenities, ['Clubhouse', 'Swimming Pool', 'Gym']);
  });

  it('still shows amenities from older records that stored plain strings', () => {
    const detail = adaptProjectDetail({ ...LIVE, amenities: ['Lift', ' ', 'Power backup'] });
    assert.deepEqual(detail.amenities, ['Lift', 'Power backup']);
  });

  it('lists the key facts a buyer asks first, skipping zeros and blanks', () => {
    assert.deepEqual(adaptProjectDetail(LIVE).facts, [
      { key: 'possession', label: 'Possession', value: 'Dec 2029' },
      { key: 'launch', label: 'Launched', value: 'May 2025' },
      { key: 'towers', label: 'Building', value: '1 tower · G+31' },
      { key: 'units', label: 'Total units', value: '20' },
      { key: 'land', label: 'Land area', value: '0.30 Acres' },
    ]);
  });

  it('has no facts section at all for a project with no overview', () => {
    assert.deepEqual(adaptProjectDetail({ ...LIVE, overview: undefined }).facts, []);
  });

  it('shows real photos first and never the location map screenshot', () => {
    assert.deepEqual(adaptProjectDetail(LIVE).gallery, ['ext.jpg', 'drone.jpg', 'pool.jpg', 'plan.jpg']);
  });

  it('gives the address with its landmark, and only the distances that were filled in', () => {
    const detail = adaptProjectDetail(LIVE);
    assert.equal(detail.address, 'Plot No. 5A, Sector 36, Kharghar · Next to Harmony School');
    assert.deepEqual(
      detail.connectivity.map((c) => `${c.label} ${c.distance}`),
      ['Metro 2 km', 'Airport 3 km', 'Bus 500 m']
    );
    assert.deepEqual(detail.nearby, [
      { name: 'Harmony School', distance: 'Adjacent' },
      { name: 'Tata Memorial Hospital', distance: '5 km' },
    ]);
  });

  it('spaces distances the same way however they were typed', () => {
    const detail = adaptProjectDetail({
      ...LIVE,
      nearbyPlaces: [{ name: 'Mall', distance: '1.5KM' }, { name: 'Park', distance: 'Adjacent' }],
    });
    assert.deepEqual(detail.nearby.map((p) => p.distance), ['1.5 km', 'Adjacent']);
  });
});

describe('the projects list card', () => {
  it('carries the possession month', () => {
    assert.equal(adaptProject(LIVE).possession, 'Dec 2029');
  });
});

describe('the project summary line', () => {
  const unit = (bedrooms?: number, carpetSqft?: number) =>
    ({ _id: 'u', config: { bedrooms }, area: { carpetSqft } }) as UnitType;

  it('reads "2, 3 BHK" and the carpet range, like the portals lead with', () => {
    assert.deepEqual(unitSummary([unit(3, 980), unit(2, 720), unit(2, 760)]), {
      bhk: '2, 3 BHK',
      carpet: '720 – 980 sq ft carpet',
    });
  });

  it('gives one figure when every unit is the same size, and nothing when sizes are missing', () => {
    assert.equal(unitSummary([unit(2, 1200)]).carpet, '1,200 sq ft carpet');
    assert.deepEqual(unitSummary([unit(undefined, undefined)]), { bhk: undefined, carpet: undefined });
    assert.deepEqual(unitSummary([]), { bhk: undefined, carpet: undefined });
  });
});

describe('formatMonthYear', () => {
  it('reads the stored UTC date, so 1 Jan does not slip into December', () => {
    assert.equal(formatMonthYear('2027-01-01T00:00:00.000Z'), 'Jan 2027');
  });

  it('returns nothing for a missing or broken date', () => {
    assert.equal(formatMonthYear(undefined), undefined);
    assert.equal(formatMonthYear('not a date'), undefined);
  });
});
