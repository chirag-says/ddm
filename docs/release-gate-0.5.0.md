# Release gate 0.5.0 (plan section 5.2)

Preview APK: EAS build `02057f8e-13b5-4235-8698-1cb7e3fb2230` from mobile `924b477`, profile `preview` (talks to `https://backend.dealdirect.in`, the production backend and database). Every account made here is real: use throwaway addresses (`dpdp.gate1@example.com` ...) and delete each at the end (row l).

Mark each row PASS or FAIL with one line of what you saw. Nothing ships until every row is PASS.

| Row | Who | Steps | Pass when | Result |
|---|---|---|---|---|
| a | Sakha | `npm run typecheck`, `npm test`, `npm run lint` on `3d6b57f` (HEAD `924b477` adds docs only) | all green | PASS: exit 0; 499/499; 0 errors, 17 warnings (baseline 18) |
| b | Sakha | backend `/api/health`; website `/privacy` | 200; new text live | PASS: 200; Grievance Officer shown, 0 "To be confirmed" on /privacy and /delete-account |
| c | Sakha | EAS preview build | build finished, APK link | PASS 2026-11-03 00:31: https://expo.dev/artifacts/eas/2UvFjY9oULbBEneexxvws73QGIYwe790xI0yJUw3vCU.apk (0.5.0, versionCode 15) |
| d | Chirag | On the phone with **0.4.0** from the closed test, install the preview APK over it (do not uninstall) | opens; still signed in or asks to sign in cleanly; shortlist and recent searches still there | |
| e | Chirag | Second phone, or uninstall and install fresh | welcome flow, city detection, guest browsing all work | |
| f | Chirag | Create account: both boxes unticked, buttons grey until the 18+ box is ticked; tap "Terms" and "Privacy Policy" links and come back; create with email + phone OTP (code autofills); log out; Create account with 18+ ticked → Continue with Google; log out; Login with Google again; Forgot password | each completes; OTP autofill works | |
| g | Chirag | Search with filters, open a property, map, full-screen photos, shortlist, compare, save a search | no crash, no blank screen; loading and empty states show | |
| h | Chirag | Post property: photos from camera and library, pin from typed address and from "Use my location", leave mid-form, kill the app, reopen, resume draft (photos still there), publish | listing appears in the app and on dealdirect.in | |
| i | Chirag | Second account enquires on that property; chat both ways; tap the push notification | messages arrive both sides; owner gets email and WhatsApp; push opens the right chat | |
| j | Chirag | Builder projects > a unit > Enquire > Send | toast "Enquiry sent. Our team has it and will pass your details to the builder."; enquiry visible in admin Booking Management | |
| k | Chirag | Rewards > open the store, then back | store opens inside the app; back returns to the app | |
| l | Chirag | Settings: change password; Active devices; Messages > "Offers and new project updates" on, off, airplane-mode failure reverts; Delete account on every gate account | red box lists removed vs kept for one year; after delete the toast names what is kept | |
| l2 | Chirag | Admin panel (logged in with MFA) > All Clients > Delete on one throwaway account, reason "gate test" | row disappears; toast "Kept for 365 days: enquiries, deals, project enquiries; reviews stay without a name" | |
| m | Chirag | Background the app during a photo upload; airplane mode during a search; rotate on a tablet; tap an old notification after deleting its chat | outcome survives or the app says what happened | |
| n | Chirag | Tablet or Android 16 large-screen emulator | no letterboxing; rotation free (`docs/android-play-readiness.md`) | |
| o | Sakha | Sentry org `dealdirect`: a crash or test event from the preview build | event visible with user id and role only | |
| p | Sakha | Preview profile URLs | both https | PASS by config: `eas.json` preview API and socket are https |
| q | Chirag | Play tracks take an AAB, not the preview APK: after rows d-p pass, the production AAB (built on Chirag's go) goes to the **internal testing** track first; install it from Play over 0.4.0 and read the pre-launch report. Internal, not open testing: no review delay and no public users before the gate passes | no new crashes or policy warnings; that same AAB is then promoted to production | |
| r | n/a | Demo listings kept for launch | no action | PASS (decision) |

After all rows PASS: production AAB (`eas build --profile production --platform android`) only on Chirag's "go", upload to production at 20% staged rollout with the release notes in `docs/play-data-safety.md`, then flip `REQUIRE_AGE_CONFIRMATION=true` on Hostinger once 0.5.0 is the installed build.
