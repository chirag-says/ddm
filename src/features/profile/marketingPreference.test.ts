import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isMarketingOn, marketingBody, saveMarketingChoice } from './marketingPreference.ts';

/**
 * The Settings marketing switch (DPDP plan Phase 3.3). The server here mirrors
 * `updateProfile` in backend/controllers/userController.js: each boolean key in
 * `preferences` is set on its own, anything else is ignored.
 */
function fakeServer(initial: Record<string, boolean>) {
  const preferences = { ...initial };
  return {
    preferences,
    put(body: { preferences: Record<string, unknown> }) {
      for (const key of ['emailNotifications', 'smsNotifications', 'marketing']) {
        const value = body.preferences[key];
        if (typeof value === 'boolean') preferences[key] = value;
      }
      return Promise.resolve({ user: { preferences: { ...preferences } } });
    },
  };
}

describe('marketing switch', () => {
  it('marketing toggle round-trips and survives a failed save', async () => {
    const server = fakeServer({ emailNotifications: true, smsNotifications: false, marketing: false });
    const shownValues: boolean[] = [];
    const show = (v: boolean) => shownValues.push(v);

    // On: saved, read back on, and the other preferences untouched.
    assert.equal(await saveMarketingChoice(true, false, show, (v) => server.put(marketingBody(v))), true);
    assert.equal(isMarketingOn({ preferences: server.preferences }), true);
    assert.equal(server.preferences.emailNotifications, true);
    assert.equal(server.preferences.smsNotifications, false);

    // Off, with the network down: the switch goes back to on, the server still says on.
    const saved = await saveMarketingChoice(false, true, show, () => Promise.reject(new Error('offline')));
    assert.equal(saved, false);
    assert.deepEqual(shownValues, [true, false, true]);
    assert.equal(server.preferences.marketing, true);
  });

  it('sends only the marketing key', () => {
    assert.deepEqual(marketingBody(true), { preferences: { marketing: true } });
  });

  it('reads anything but a stored true as off', () => {
    // Default false (opt-in): an account from before the field, or a guest, is off.
    assert.equal(isMarketingOn(null), false);
    assert.equal(isMarketingOn({}), false);
    assert.equal(isMarketingOn({ preferences: {} }), false);
    assert.equal(isMarketingOn({ preferences: { marketing: 'true' } }), false);
    assert.equal(isMarketingOn({ preferences: { marketing: true } }), true);
  });
});
