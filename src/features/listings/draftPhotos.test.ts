import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { keepPhotos, releasePhotos, restorePhotos, type PhotoStore } from './draftPhotos.ts';

/** An in-memory stand-in for the app's draft folder. */
function fakeStore(failOn: string[] = []) {
  const files = new Set<string>();
  const store: PhotoStore = {
    owns: (uri) => uri.startsWith('draft://'),
    copyIn: (uri) => {
      if (failOn.includes(uri)) throw new Error('disk full');
      const copy = `draft://${uri.split('/').pop()}`;
      files.add(copy);
      return copy;
    },
    exists: (uri) => files.has(uri),
    remove: (uri) => void files.delete(uri),
  };
  return { store, files };
}

describe('photos in a draft', () => {
  it('a picked photo is copied into the draft folder, with its room tag', () => {
    const { store, files } = fakeStore();
    const kept = keepPhotos([{ uri: 'cache://a.jpg', category: 'exterior' }], store);
    assert.deepEqual(kept, [{ uri: 'draft://a.jpg', category: 'exterior' }]);
    assert.ok(files.has('draft://a.jpg'));
  });

  it('a photo already copied is not copied again when its tag changes', () => {
    const { store, files } = fakeStore();
    const [first] = keepPhotos([{ uri: 'cache://a.jpg', category: 'other' }], store);
    const kept = keepPhotos([{ ...first!, category: 'kitchen' }], store);
    assert.deepEqual(kept, [{ uri: 'draft://a.jpg', category: 'kitchen' }]);
    assert.equal(files.size, 1);
  });

  it('a photo that cannot be copied still uploads from where it is', () => {
    const { store } = fakeStore(['cache://b.jpg']);
    assert.deepEqual(keepPhotos([{ uri: 'cache://b.jpg', category: 'other' }], store), [
      { uri: 'cache://b.jpg', category: 'other' },
    ]);
  });

  it('removing a photo deletes its copy, and only its copy', () => {
    const { store, files } = fakeStore();
    const both = keepPhotos(
      [
        { uri: 'cache://a.jpg', category: 'other' },
        { uri: 'cache://b.jpg', category: 'other' },
      ],
      store
    );
    releasePhotos(both, [both[1]!], store);
    assert.deepEqual([...files], ['draft://b.jpg']);
  });

  it('a resumed draft offers the photos it had, minus any copy that went missing', () => {
    const { store, files } = fakeStore();
    const kept = keepPhotos(
      [
        { uri: 'cache://a.jpg', category: 'exterior' },
        { uri: 'cache://b.jpg', category: 'other' },
      ],
      store
    );
    files.delete('draft://b.jpg');
    assert.deepEqual(restorePhotos(kept, store), [{ uri: 'draft://a.jpg', category: 'exterior' }]);
  });

  it('a draft from before photos were drafted resumes with none', () => {
    const { store } = fakeStore();
    assert.deepEqual(restorePhotos([], store), []);
  });
});
