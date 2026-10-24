import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { groupInbox, inboxGroupFor } from './grouping.ts';

// A Wednesday at 15:00 local time, so "yesterday" and "this week" are
// unambiguous.
const NOW = new Date(2026, 9, 21, 15, 0, 0);
const at = (daysAgo: number, hour = 9) => {
  const d = new Date(NOW);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

describe('inboxGroupFor', () => {
  it('places rows by local calendar day, not by 24-hour windows', () => {
    assert.equal(inboxGroupFor(at(0, 1), NOW), 'today');
    assert.equal(inboxGroupFor(at(1, 23), NOW), 'yesterday');
    assert.equal(inboxGroupFor(at(2), NOW), 'week');
    assert.equal(inboxGroupFor(at(6), NOW), 'week');
    assert.equal(inboxGroupFor(at(7), NOW), 'earlier');
    assert.equal(inboxGroupFor(at(40), NOW), 'earlier');
  });

  it('sends an unreadable or missing date to Earlier', () => {
    assert.equal(inboxGroupFor(undefined, NOW), 'earlier');
    assert.equal(inboxGroupFor('not a date', NOW), 'earlier');
  });
});

describe('groupInbox', () => {
  it('returns only the groups with rows, in order, keeping row order inside each', () => {
    const rows = [
      { id: 'a', createdAt: at(0) },
      { id: 'b', createdAt: at(0, 8) },
      { id: 'c', createdAt: at(3) },
      { id: 'd', createdAt: at(30) },
    ];
    const groups = groupInbox(rows, NOW);
    assert.deepEqual(
      groups.map((g) => [g.label, g.items.map((r) => r.id)]),
      [
        ['Today', ['a', 'b']],
        ['This week', ['c']],
        ['Earlier', ['d']],
      ]
    );
  });

  it('is empty for no rows', () => {
    assert.deepEqual(groupInbox([], NOW), []);
  });
});
