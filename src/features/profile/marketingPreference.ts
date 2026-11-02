/**
 * The marketing opt-in in Settings ("Offers and new projects").
 *
 * Stored as `preferences.marketing` on the user, default false, set at signup
 * by the unticked opt-in and changed here. `PUT /users/profile` with
 * `{ preferences: { marketing } }` sets that one key and nothing else
 * (backend/controllers/userController.js `updateProfile`).
 *
 * No imports, so `node --test` can load it directly.
 */

export function isMarketingOn(user: { preferences?: { marketing?: unknown } } | null | undefined): boolean {
  return user?.preferences?.marketing === true;
}

export function marketingBody(marketing: boolean): { preferences: { marketing: boolean } } {
  return { preferences: { marketing } };
}

/**
 * Shows the new value at once, saves it, and puts the old one back if the
 * save fails, so the switch never claims a choice the server does not hold.
 * Resolves true when saved.
 */
export async function saveMarketingChoice(
  next: boolean,
  previous: boolean,
  show: (value: boolean) => void,
  save: (value: boolean) => Promise<unknown>
): Promise<boolean> {
  show(next);
  try {
    await save(next);
    return true;
  } catch {
    show(previous);
    return false;
  }
}
