# Play Store Review Credentials

A dedicated account for Google Play Store reviewers to access the app
during review. Entered in **Play Console → App content → App access**.

## Account Details

| Field    | Value                              |
| -------- | ---------------------------------- |
| Name     | Play Store Reviewer                |
| Email    | `playstore-reviewer@dealdirect.in` |
| Password | *(stored in Play Console only)*    |

## Notes

- This is a real account on the production backend. Do not delete it.
- The account must stay verified and the password must not be changed
  without updating Play Console at the same time, or the next review
  will be rejected for "unable to log in".
- The account has no listings, no role, and no personal data. If a
  reviewer needs to see specific screens, seed test data under this
  account or add instructions in Play Console explaining how to navigate.
- If the app adds biometric lock or phone-gated features, add
  corresponding instructions in Play Console's "App access" section.
