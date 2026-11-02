import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DELETION_KEEPS, DELETION_REMOVES, deletionReceipt } from './deletionNotice.ts';

/**
 * Delete account says what actually happens (DPDP plan Phase 3.4), checked
 * against backend/utils/aggregateDelete.js as of backend 1045bd3.
 */

describe('before deleting, the screen says', () => {
  it('names everything the cascade removes', () => {
    for (const thing of ['profile and photo', 'properties you posted', 'saved properties', 'messages you sent', 'reward balance']) {
      assert.match(DELETION_REMOVES, new RegExp(thing), thing);
    }
  });

  it('names everything kept for one year, reviews and conversations', () => {
    for (const thing of ['one year', 'enquiries you made', 'deal records', 'project enquiries', 'without your name', 'other person']) {
      assert.match(DELETION_KEEPS, new RegExp(thing), thing);
    }
  });

  it('no longer claims conversations are removed', () => {
    // The old copy said "conversations ... are permanently removed"; the other
    // person's side stays (Conversation.$pull, not delete).
    assert.doesNotMatch(DELETION_REMOVES, /conversation/i);
  });
});

describe('after deleting, the toast reads the server', () => {
  it("shows the server's kept-list and period", () => {
    assert.equal(
      deletionReceipt({ kept: ['enquiries', 'deals', 'project_enquiries'], retentionDays: 365 }),
      'Account deleted. Your enquiries, deal records and project enquiries are kept for one year.'
    );
  });

  it('follows a different period or a new code from the server', () => {
    assert.equal(
      deletionReceipt({ kept: ['deals', 'site_visits'], retentionDays: 180 }),
      'Account deleted. Your deal records and site visits are kept for 180 days.'
    );
  });

  it('a listing kept as deal evidence comes first', () => {
    assert.equal(
      deletionReceipt({ retainedListings: 2, kept: ['deals'], retentionDays: 365 }),
      'Account deleted. 2 properties tied to a live deal were kept on record.'
    );
    assert.match(deletionReceipt({ retainedListings: 1 }), /1 property tied to a live deal was kept/);
  });

  it('an older server without the kept-list gets the plain line', () => {
    assert.equal(deletionReceipt({}), 'Your account has been deleted.');
  });
});
