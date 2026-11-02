/**
 * The signup ticks, as the backend reads them (`signupConsents` in
 * backend/controllers/userController.js, shared by register, register-direct
 * and Google).
 *
 * One tick carries two facts: "I am 18 or older and accept the Terms and
 * Privacy Policy" sends both `ageConfirmed` and `termsAccepted`. Marketing is
 * its own tick, unticked by default, and never gates anything.
 *
 * With REQUIRE_AGE_CONFIRMATION on, a signup without `ageConfirmed` is refused
 * with 400 AGE_CONFIRMATION_REQUIRED and nothing is created; for Google only
 * when the sign-in would create an account. An older server ignores all three
 * fields, so sending them is always safe.
 *
 * No imports, so `node --test` can load it directly.
 */

export interface SignupTicks {
  ageConfirmed: boolean;
  marketingOptIn: boolean;
}

export interface SignupConsentFields {
  ageConfirmed: boolean;
  termsAccepted: boolean;
  marketingOptIn: boolean;
}

export const AGE_CONFIRMATION_REQUIRED = 'AGE_CONFIRMATION_REQUIRED';

/** Create account, and Continue with Google on the register screen, wait for the 18+ tick. */
export function canCreateAccount(ticks: SignupTicks): boolean {
  return ticks.ageConfirmed;
}

/** Adds the ticks to a register or Google body, leaving every other field as it was. */
export function withSignupConsent<T extends object>(body: T, ticks: SignupTicks): T & SignupConsentFields {
  return {
    ...body,
    ageConfirmed: ticks.ageConfirmed,
    termsAccepted: ticks.ageConfirmed,
    marketingOptIn: ticks.marketingOptIn,
  };
}

/**
 * The field message for a refused signup, or null for any other error.
 *
 * `onRegisterScreen` picks the sentence: there the tick is on screen; anywhere
 * else (a brand-new Google account from the login screen) the user is sent to
 * Create account, where the tick is.
 */
export function ageConfirmationMessage(
  error: { code?: string } | null | undefined,
  onRegisterScreen: boolean
): string | null {
  if (error?.code !== AGE_CONFIRMATION_REQUIRED) return null;
  return onRegisterScreen
    ? 'Tick the box to confirm you are 18 or older and accept the Terms and Privacy Policy.'
    : 'No DealDirect account uses this Google account yet. Create one first: it takes a tick to confirm you are 18 or older.';
}
