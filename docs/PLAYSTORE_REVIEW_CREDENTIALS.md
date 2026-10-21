# Play Store Review Account

Google Play reviewers sign in with a dedicated account, entered in
**Play Console → App content → App access**.

**The credentials are not kept in this repository.** This repo is public on
GitHub. An earlier version of this file held the reviewer email and password
in plain text (removed 2026-10-17); treat that password as exposed and rotate
it, then update Play Console with the new one. Keep the current credentials in
Play Console and the team password manager only.

## Rules for the account

- It is a real account on the production backend. Do not delete it.
- It must stay verified, and its password must not change without updating
  Play Console at the same time, or the next review fails with "unable to log
  in".
- It has no listings, no role, and no personal data. If a reviewer needs to
  see specific screens, seed test data under this account or add navigation
  instructions in Play Console.
- Listing a property, expressing interest, closing a deal and claiming a
  reward all require a verified mobile number (`PHONE_VERIFICATION_REQUIRED`).
  A reviewer cannot receive an OTP on their own phone, so either give this
  account a verified number the team controls, or say in the App access notes
  which features need one and how to reach them.
- If the app adds biometric lock or other gated features, add matching
  instructions in Play Console's App access section.
