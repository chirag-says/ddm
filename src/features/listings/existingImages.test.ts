import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { existingImagesPayload } from './existingImages.ts';

describe('existingImagesPayload', () => {
  it('is flat: every top-level value is an array of urls', () => {
    // `updateMyProperty` keeps only top-level entries whose value is an array.
    // A `{ residential: {...} }` wrapper is one non-array entry, so the server
    // would keep nothing and wipe the gallery.
    const payload = existingImagesPayload([
      { uri: 'https://res.cloudinary.com/x/kitchen-1.jpg', category: 'kitchen' },
      { uri: 'https://res.cloudinary.com/x/exterior-1.jpg', category: 'exterior' },
      { uri: 'https://res.cloudinary.com/x/kitchen-2.jpg', category: 'kitchen' },
    ]);

    assert.deepEqual(payload, {
      kitchen: ['https://res.cloudinary.com/x/kitchen-1.jpg', 'https://res.cloudinary.com/x/kitchen-2.jpg'],
      exterior: ['https://res.cloudinary.com/x/exterior-1.jpg'],
    });
    for (const value of Object.values(payload)) assert.ok(Array.isArray(value));
    assert.ok(!('residential' in payload) && !('commercial' in payload));
  });

  it('keeps every photo, in order', () => {
    const photos = Array.from({ length: 5 }, (_, i) => ({ uri: `u${i}`, category: 'other' }));
    assert.deepEqual(existingImagesPayload(photos), { other: ['u0', 'u1', 'u2', 'u3', 'u4'] });
  });

  it('is empty for a listing with no photos', () => {
    assert.deepEqual(existingImagesPayload([]), {});
  });
});
