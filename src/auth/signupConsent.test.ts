import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  AGE_CONFIRMATION_REQUIRED,
  ageConfirmationMessage,
  canCreateAccount,
  withSignupConsent,
} from './signupConsent.ts';

/**
 * The signup ticks (DPDP plan Phase 3.1-3.3). The screen reads these three
 * functions and nothing else, so the rules are pinned here; the taps
 * themselves are the phone check.
 */

const form = { name: 'Asha Rao', email: 'asha@example.com', password: 'Str0ng!pass', referralCode: 'DD42' };

describe('signup ticks', () => {
  it('Create account stays disabled until the 18+ tick is on', () => {
    assert.equal(canCreateAccount({ ageConfirmed: false, marketingOptIn: false }), false);
    // Marketing is opt-in and never unlocks anything.
    assert.equal(canCreateAccount({ ageConfirmed: false, marketingOptIn: true }), false);
    assert.equal(canCreateAccount({ ageConfirmed: true, marketingOptIn: false }), true);
  });

  it('register sends ageConfirmed and termsAccepted', () => {
    const body = withSignupConsent(form, { ageConfirmed: true, marketingOptIn: false });
    assert.equal(body.ageConfirmed, true);
    // One tick, two facts: "I am 18 or older AND accept the Terms and Privacy Policy".
    assert.equal(body.termsAccepted, true);
    assert.equal(body.marketingOptIn, false);
  });

  it('sends the marketing opt-in only when ticked', () => {
    assert.equal(withSignupConsent(form, { ageConfirmed: true, marketingOptIn: true }).marketingOptIn, true);
  });

  it('a Google sign-in from the register screen carries the ticks next to the referral code', () => {
    const body = withSignupConsent({ referralCode: 'DD42' }, { ageConfirmed: true, marketingOptIn: true });
    assert.deepEqual(body, { referralCode: 'DD42', ageConfirmed: true, termsAccepted: true, marketingOptIn: true });
  });
});

describe('an older server (before backend 1045bd3)', () => {
  /**
   * `registerUserDirect` as it was at 1045bd3~1: it destructures
   * `{ name, email, password, phone }`, requires the first three, and ignores
   * every other key. A user is created and the session cookie set.
   */
  function oldRegisterDirect(body: { name?: string; email?: string; password?: string }) {
    const { name, email, password } = body;
    if (!name || !email || !password) {
      return { status: 400, body: { message: 'Name, email, and password are required' } };
    }
    return { status: 201, body: { success: true, user: { name, email } } };
  }

  it('an old server that ignores the field still logs the user in', () => {
    const body = withSignupConsent(form, { ageConfirmed: true, marketingOptIn: true });
    const response = oldRegisterDirect(body);
    assert.equal(response.status, 201);
    assert.deepEqual(response.body.user, { name: form.name, email: form.email });
  });

  it('leaves every field the old body had exactly as it was', () => {
    const body = withSignupConsent(form, { ageConfirmed: true, marketingOptIn: false });
    for (const [key, value] of Object.entries(form)) {
      assert.equal(body[key as keyof typeof body], value, key);
    }
  });
});

describe('a refused signup', () => {
  const refusal = { code: AGE_CONFIRMATION_REQUIRED };

  it('AGE_CONFIRMATION_REQUIRED shows as a field error', () => {
    const message = ageConfirmationMessage(refusal, true);
    assert.ok(message, 'the register screen must show a line under the tick');
    assert.match(message, /18 or older/);
  });

  it('a brand-new Google account from the login screen is sent to Create account', () => {
    const message = ageConfirmationMessage(refusal, false);
    assert.ok(message);
    assert.match(message, /Create one first/);
  });

  it('pins the code the backend sends', () => {
    // Shared with signupConsents in backend/controllers/userController.js.
    assert.equal(AGE_CONFIRMATION_REQUIRED, 'AGE_CONFIRMATION_REQUIRED');
  });

  it('leaves every other error to the existing handling', () => {
    assert.equal(ageConfirmationMessage({ code: 'USE_GOOGLE_SIGNIN' }, true), null);
    assert.equal(ageConfirmationMessage({}, true), null);
    assert.equal(ageConfirmationMessage(null, false), null);
    assert.equal(ageConfirmationMessage(undefined, false), null);
  });
});
