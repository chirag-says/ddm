# DPDP compliance and production release: implementation plan

Written 2026-11-02. Inputs: `docs/dpdp-checklist-v3.xlsx` (every decision and the
client's answers), `docs/play-data-safety.md` (the Play form, derived from code),
project memory `dealdirect-dpdp-compliance`. Nothing in this plan is implemented
yet. Each phase is run in its own session, in order, with a BRIEF before the first
edit and a REPORT after the last (CLAUDE.md PACT 2 and W8).

## 0. Ground rules for the implementing sessions

| Repo | Folder | Branch | Deploys |
|---|---|---|---|
| Backend | `D:\DD-CLONE\DealDirectSecure\backend` | `main` | Hostinger auto-deploys on push to main |
| Website | `D:\DD-CLONE\DealDirectSecure\client-next` | `master` (note: not main) | Hostinger auto-deploys on push |
| Admin | `D:\DD-CLONE\DealDirectSecure\Admin` | `main` | Vite build; deploy as today |
| Mobile | `D:\dealdirecr-mobile` | `main` | EAS build, Play Console upload by Chirag |

- Push only on Chirag's OK (W6). Backend and website pushes are releases.
- No build of any kind (local release or EAS) without his OK (memory `dealdirect-ask-before-builds`).
- Order within every phase: backend first, additive and compatible with app 0.4.0; website; app; admin. The app that is live in the closed test keeps working against the new backend at every step.
- Test commands: backend `npm test` and `npm run test:integration`; website `npm test`, `npm run lint`; mobile `npm run typecheck`, `npm test`, `npm run lint`.
- None of the four repos has a `MAP.md`. The first session in each repo proposes one from a read of the repo (sakha MAP protocol) before adding shared things; Chirag approves before it is committed.
- Verification on a phone: dev run against Chirag's backend and `.env` via localhost, `JOBS_ENABLED=false` on that backend (memory `dealdirect-verify-before-release`).

## 1. Decisions this plan implements

| Decision | Value |
|---|---|
| Age rule | 18+ only. Tick at signup, enforced server-side. |
| Rights mechanism | Write to the Grievance Officer. No dashboard, no nominee feature. |
| Grievance Officer | Mrs. Arti Ashok Jadhav, Data Protection & Grievance Officer, grievance@dealdirect.in, +91 22 4608 9735, 129 Growmore Tower, Sec 2, Kharghar, Navi Mumbai 410210 |
| Response time | Within 90 days |
| Breach owner | Sanjay Goel, CEO, goel@gtc.in (internal procedure only) |
| Marketing | Yes, with opt-in at signup (unticked) and a toggle in settings |
| Builder enquiries | Admin relays to the builder; the user sees "Our team has it and will pass your details to the builder" |
| Retention after account deletion | Leads, deals, project enquiries, backups, logs: 1 year, then deleted |
| Vendors | Standard terms. Recipients: Cloudinary, Meta WhatsApp or WAHA on Railway, Hostinger SMTP, Equence SMS, Expo push/FCM, Sentry, Hubble (Razorpay inside), Google Sign-In, OpenStreetMap tiles |
| Languages | English binding; all 22 Eighth Schedule languages machine-translated after the English text is final |
| Service area | India only |
| Agreement generator | Parked; not mentioned until it ships |

Out of scope, deliberately: parental consent for under-18s, privacy dashboard, nominee registration, analytics opt-out toggle, data export endpoint (the access right is answered by email).

## 2. Phases

### Phase 0: environment and account checks (no code, Chirag)

| # | Item | How to verify |
|---|---|---|
| 0.1 | Mobile `.env:17` `EXPO_PUBLIC_SOCKET_URL` is `http://backend.dealdirect.in`; change to `https://` | one-character edit; `.env` is untracked |
| 0.2 | ~~Sentry DSN in EAS~~ Done 2026-11-02 in another session: new Sentry org `dealdirect`, EU region, mobile DSN in `eas.json`. Crash logs are declared on the Play form; Sentry's region is EU in the notice | memory `dealdirect-sentry-org` |
| 0.3 | ~~MongoDB Atlas: cluster region and snapshot retention~~ Checked 2026-11-02: cluster `dealdirect`, AWS Mumbai (ap-south-1), Free M0 tier, **no backups** (M0 cannot have them). Notice: data held in India; nothing retained in backups. Separate business risk, not DPDP: production has no backup; Flex tier (~$8/mo) or a nightly mongodump is the fix, client's cost decision | done |
| 0.4 | WhatsApp sender: production env already configured (Chirag, 2026-11-02). The notice names both possible senders, "Meta (WhatsApp Business) or our WhatsApp gateway hosted on Railway", so it stays true whichever the env selects | no action |
| 0.5 | ~~Sanjay Goel's email~~ goel@gtc.in (Chirag, 2026-11-02) | done |

### Phase 1: backend (session 1, repo `backend`)

**DONE 2026-11-02**, commits `91773b6` and `1045bd3` on backend `main`, pushed and live (the new admin route answered 401 instead of 404 after the deploy). Tests: unit 808/808, integration 1198/1198; the 23 new tests failed before the change. Deviations from the table below, all smaller: 1.3 is one boolean `preferences.marketing` (both UIs are one tick), not three channels; 1.4 has no "refuse an admin" check because admins are a separate collection a `User` id cannot reach; 1.5 reuses `utils/cloudinaryAssets.js` `destroyAssets` (public id from the URL) instead of storing a `publicId`; 1.6 sweep is count-only until `RETENTION_SWEEP_LIVE=true`; 1.8 chose the 1-year TTL. Debt: accounts deleted before 2026-11-02 have no `DeletedAccount` marker, so their retained records are not swept (production holds test data only). Backend `MAP.md` drafted, uncommitted, awaiting Chirag's read.

Everything here is additive. App 0.4.0 keeps working.

| # | Change | Where | Notes |
|---|---|---|---|
| 1.1 | Age and terms confirmation at registration | `controllers/userController.js` `registerUser` (:240) and `registerUserDirect` (:341); `controllers/authGoogleController.js` `User.create` (:158); `models/userModel.js` | Accept `ageConfirmed: boolean` and `termsAccepted: boolean`; store `ageConfirmedAt` and `termsAcceptedAt`. Enforcement behind env `REQUIRE_AGE_CONFIRMATION` (default `false`) because app 0.4.0 does not send the field; flip to `true` on the day the new app is in production, then remove the flag (dated task in the REPORT). Error code `AGE_CONFIRMATION_REQUIRED`, 400, named field. |
| 1.2 | Google signup confirmation | `authGoogleController.js` | First Google sign-in creates the account server-side, so the app must send `ageConfirmed` with the idToken. Missing field under the flag returns `AGE_CONFIRMATION_REQUIRED` and creates nothing. |
| 1.3 | Marketing preference | `models/userModel.js` `preferences` (:112), `PUT /users/me` handler, register body | Add `preferences.marketing: { email, sms, whatsapp }`, all default `false`. Register accepts the opt-in. There is no promotional send in code today; the first one built must read this field and honour "STOP"/unsubscribe. Record that as the rule in MAP.md. |
| 1.4 | Admin delete-user | `routes/adminRoutes.js` (only `PUT /users/:id/verification` exists at :68), `controllers/adminController.js`, `utils/aggregateDelete.js` | `DELETE /admin/users/:id` with `reason` in the body, `protectAdmin`, an `AuditLog` entry, calls the same `aggregateDelete` the user path uses so the kept-list is identical. Refuses to delete an admin account. Available to every admin (there are two; Chirag's decision 2026-11-02), no new permission. |
| 1.5 | Profile photo removed on deletion | `middleware/upload.js` (:508 profiles folder), `models/userModel.js` `profileImage` (:79), `utils/aggregateDelete.js` | Store the Cloudinary `publicId` alongside the URL at upload; destroy it in `aggregateDelete`. Existing users with only a URL: derive the public id from the URL path (`dealdirect/profiles/<id>`), one helper, tested. |
| 1.6 | Retention sweep job | new `jobs/retentionSweep.js`, registered in `jobs/registry.js` | Daily. For users deleted more than 365 days ago: anonymise `Lead` and `ProjectBooking` snapshots, delete `TransactionVerification` documents and their Cloudinary assets, keep `Agreement` (parked feature, revisit when it ships). `aggregateDelete.js:222-264` already lists the intent per model; this implements it. Needs a `deletedAt` marker: the user document is hard-deleted today, so add a small `DeletedAccount { userId, deletedAt }` record written by `aggregateDelete` (anonymous: no name, email or phone). Dry-run flag that logs counts without writing, run once in production before enabling. |
| 1.7 | Deletion response lists what is kept | `DELETE /users/me` handler | Return `{ kept: ['leads', 'deals', 'reviews'] }` so the app screen can say exactly that (Phase 3.4). |
| 1.8 | `AuditLog` retention | `models/AuditLog.js` | No TTL today. Decide with the retention line: 1 year TTL index, or keep and say so in the notice. Recommend 1 year. |

Tests (backend `tests/*.test.js`, follow `account-and-routes.test.js`):
- "registering without the 18+ tick is refused when the flag is on" and "...accepted when the flag is off" (T5, T3 old client)
- "Google first sign-in without the tick creates no account" (T7)
- "marketing opt-in defaults to off and round-trips through PUT /users/me" (T5)
- "admin delete removes the same records as self-delete and writes an audit row" (T7, T8), "admin cannot delete an admin"
- "deleting an account destroys the profile photo" (I)
- "retention sweep anonymises a lead 366 days after deletion and leaves one at 364" (U, fixed clock)
- "retention sweep dry-run writes nothing" (U)
- Double fire on admin delete: second call is a clean 404, not an error (T1)

Estimate: ~+350/−20 across 8 files plus tests. If the retention job alone passes ~150 lines, split it into its own commit.

### Phase 2: website (session 2, repo `client-next`, branch `master`)

**DONE 2026-11-02**, `6c53ffd` (final legal text), `9915b81`, `5ea4abe`, `a8c1e44`, `05a7ba3`; pushed to `origin/main` and live (dealdirect.in/privacy shows the Grievance Officer, 0 markers on /privacy and /delete-account). Tests 63/63, lint at baseline. Correction: local `master` tracks `origin/main`; the deploy branch is `main` (a first `git push origin master` created a stray remote branch `master`, still there, Chirag to decide on deleting it). Chirag's calls: effective date stays 3 October 2026; no rewards notice period; builder disclosure on the confirmation only. Unverified in a browser: Google sign-in with consents, login redirect on `AGE_CONFIRMATION_REQUIRED` (needs the flag on), profile toggle save; covered in the 5.2 gate.

### Phase 3 and 4 status

**Phase 3 DONE 2026-11-02**: mobile `230282b`, `41a5d0e`, `a16dbbc`, `928e3ac`, `c74d5b1` (0.5.0), `5dc742b`, `3d6b57f` (legal text from website `6c53ffd`, 8/8 sampled sentences verbatim); not pushed. Typecheck clean, 499/499, lint 0 errors. `.env` socket now https (untracked). Size +479/−44 source, accepted by Chirag. Debt: a shared `ui/Checkbox` should replace the local `Tick` and three inline copies in ListingForm; existing bug, a referral code typed just before tapping Google may not be sent.

**Phase 4 DONE 2026-11-02**: admin `b6eaf61`, pushed. Tests 9/9, eslint clean on changed files. Size +125 (shared `ReasonModal` also used by Block), accepted by Chirag. No admin page shows audit logs; `user_deleted` rows are visible via the API only. Live delete with a throwaway account is in the 5.2 gate.

MAP.md committed in all four repos 2026-11-02 (backend `0d69519`, website `66e6d31`, admin `9457036`, mobile `f8e8469`), approved by Chirag; not yet pushed.

| # | Change | Where |
|---|---|---|
| 2.1 | Resolve every `[To be confirmed]` from the decisions table | `src/app/privacy/PrivacyContent.jsx`, `src/app/terms/TermsContent.jsx`, `src/app/rewards/terms/RewardsTermsContent.jsx`, `src/app/delete-account/page.js`. Then delete `ToConfirm` from `src/components/Legal/LegalDocument.jsx` and the local copy in `delete-account/page.js` once no caller remains. |
| 2.2 | Children section final; Terms eligibility clause "18 or older and competent to contract under the Indian Contract Act, 1872" | `PrivacyContent.jsx:335`, `TermsContent.jsx` |
| 2.3 | Recipients table: add the production WhatsApp sender (Phase 0.4), Atlas region (0.3), builders as recipients of name, phone and email for project enquiries | `PrivacyContent.jsx:91-100` |
| 2.4 | Retention section: the 1-year rule, the kept-list, `AuditLog` decision | `PrivacyContent.jsx:256-270`, `delete-account/page.js:137-170` |
| 2.5 | Signup tick: "I am 18 or older and accept the Terms and Privacy Policy", unticked, submit disabled until ticked, sends `ageConfirmed` and `termsAccepted`; Google button gated by the same tick | `src/app/register/RegisterContent.jsx`, login page's Google button |
| 2.6 | Marketing opt-in tick at signup (unticked) and a toggle on the profile/settings page | `RegisterContent.jsx`, `src/app/profile` |
| 2.7 | Project enquiry confirmation copy: "Enquiry sent. Our team has it and will pass your details to the builder." | `src/app/projects/[id]/units/[unitTypeId]/UnitDetailContent.jsx:117` and any other enquiry success state (grep "Enquiry sent") |
| 2.8 | Privacy policy and delete-account URLs are final: `https://dealdirect.in/privacy`, `https://dealdirect.in/delete-account` | these go into the Play Console in Phase 5 |

Tests: `src/**/*.test.mjs` for the register form state (tick gates submit, both fields sent); `npm run lint`; `npm run build` (webpack via `scripts/build.mjs`, the Turbopack path fails on Hostinger). Manual: read all four legal pages in the browser pane; grep the built output for "To be confirmed" and expect zero.

Estimate: legal copy ~+120/−160 (markers out, final text in), forms ~+60.

### Phase 3: mobile app (session 3, this repo)

| # | Change | Where |
|---|---|---|
| 3.1 | Signup tick (same wording as web), unticked, Create account disabled until ticked; sends `ageConfirmed` and `termsAccepted` | `app/(auth)/register.tsx` (fields at :143-220), `src/api/endpoints/users.ts` register request type, `src/types/backend/user.ts` |
| 3.2 | Google path: the tick on the register screen gates the Google button too; `GoogleAuthButton` passes `ageConfirmed` with the idToken; an old-server `AGE_CONFIRMATION_REQUIRED` error is shown as a field error, not a crash | `src/auth/components/GoogleAuthButton.tsx`, `src/auth/googleSignIn.ts`, `src/auth/AuthProvider.tsx` |
| 3.3 | Marketing opt-in: tick at signup (unticked); toggle in Settings under a new "Messages" group | `app/(auth)/register.tsx`, `app/settings/index.tsx` (ListGroup "Account" at :97 is the pattern), `src/features/profile/hooks.ts` |
| 3.4 | Delete-account wording matches reality: profile, posted properties, saved properties, your sent messages and reward balance are removed; enquiries you made, deals, project bookings and reviews are kept for one year; the other party keeps the conversation. Read the kept-list from the server response (1.7) when present | `app/settings/delete-account.tsx:131-137` |
| 3.5 | Project enquiry confirmation copy, same sentence as the website | `app/projects/booking/[bookingId].tsx:218` and the enquiry submit success (grep "Enquiry sent") |
| 3.6 | Legal pages replaced with the website's final text, verbatim, same structure | `src/features/content/pages/privacy.ts`, `terms.ts`, `rewardsTerms.ts`; the `ContentPage` model in `model.ts` already supports sections, bullets, callouts and contact cards. `contact.ts` grievance block: name, designation, landline, address from the decisions table |
| 3.7 | Legal page links from the signup tick open `app/legal/[id].tsx` for `privacy` and `terms` | `app/(auth)/register.tsx` |
| 3.8 | Version bump to 0.5.0 | `app.config.js:51`, `package.json` (still says 0.1.0; align it) |

Tests (`src/**/*.test.ts`, `node --test`):
- "Create account stays disabled until the 18+ tick is on" (U, form state)
- "register sends ageConfirmed and termsAccepted" (U, request builder)
- "an old server that ignores the field still logs the user in" (T3)
- "AGE_CONFIRMATION_REQUIRED shows as a field error" (T5)
- "marketing toggle round-trips and survives a failed save" (T2, T6)
- Content pages test (`pages.test.ts`) still passes with the new copy; zero "To be confirmed" strings in `src/features/content`
- Phone (M): signup with tick, signup via Google, settings toggle, delete account end to end against the dev backend, OTP autofill (T9)

Estimate: ~+260/−90 across 10 files, plus the legal copy (content only, excluded from the count).

### Phase 4: admin (session 4, repo `Admin`)

| # | Change | Where |
|---|---|---|
| 4.1 | Delete user from the clients list: confirm dialog that requires a reason, calls `DELETE /admin/users/:id`, shows the kept-list from the response | `src/pages/AllClients.jsx`, `src/api/adminApi.js` |
| 4.2 | The audit entry is visible wherever admin audit entries are shown today (check before adding anything) | grep `AuditLog` in Admin |

Tests: Admin has no test runner in `package.json`; verify by running the Vite dev server against the dev backend and deleting a seeded test user. Estimate ~+80.

### Phase 5: Play Console and production release (session 5, this repo, Chirag at the console)

5.1 Console forms (Chirag clicks, I supply the text):
- Data safety: fill from `docs/play-data-safety.md`, adjusted by Phase 0.2 (Sentry) and 0.4 (WhatsApp sender). Deletion URL `https://dealdirect.in/delete-account`.
- Target audience and content: 18 and over only. Content rating questionnaire as an adult-only service.
- Store listing: privacy policy URL `https://dealdirect.in/privacy`.
- Release notes for 0.5.0: counted with a tool, under 500 characters (memory `count-dont-estimate-limits`).

5.2 Pre-production verification of the APK, one last time. This is the gate; nothing ships until every row is green.

| Step | What | Pass condition |
|---|---|---|
| a | `npm run typecheck`, `npm test`, `npm run lint` on the release commit | all green, output in the REPORT |
| b | Backend and website for this release are deployed and `https://backend.dealdirect.in/api/health` (or the equivalent) answers | 200 |
| c | EAS **preview** build (APK, `eas.json` preview profile), with Chirag's OK | build succeeds; download link recorded |
| d | Upgrade path: install the preview APK **over** the 0.4.0 closed-test install on a phone, do not uninstall first | app opens, session survives or asks to log in cleanly, MMKV data intact |
| e | Fresh install on a second phone or after uninstall | first-run flow, city detection, guest browsing |
| f | Signup with email + OTP, with the 18+ tick; signup via Google; login; forgot password | each completes; OTP autofill works (T9) |
| g | Search, filters, property detail, map, full-screen photos, shortlist, compare, saved search | no crash, no blank state, loading and empty states show |
| h | Post property: photos from camera and library, map pin from typed address and from "Use my location", save draft, kill the app, resume draft with photos, publish | listing live on the website too |
| i | Enquire on a property, chat both ways between two accounts, owner receives email and WhatsApp | messages arrive; push notification tap opens the right screen |
| j | Project enquiry: confirmation sentence shows; admin sees it | |
| k | Rewards: store opens in the WebView, back navigation returns to the app | |
| l | Settings: change password, active devices, marketing toggle, delete account (then confirm the kept-list wording) | |
| m | Lifecycle: background mid-upload, airplane mode toggle during a search, rotation, notification tap into a stale screen (T9) | outcome survives or the user sees what happened |
| n | Android 16 large screen or tablet emulator: no letterboxing, orientation free (`docs/android-play-readiness.md`) | |
| o | Sentry receives a test event from the preview build if the DSN is set (0.2) | event visible in Sentry |
| p | Network: every request in the preview build goes to `https://` (0.1); check with the app's own logs or a proxy | no cleartext |
| q | Play pre-launch report on the internal track for the preview build | no new crashes, no new policy flags |
| r | Demo and friends-and-family listings: **kept** for launch (Chirag, 2026-11-02); the 5 `*.demo@example.com` owners are removed later, once real users post (ids and steps in memory `dealdirect-demo-listings-2026-10-31`) | no action now |

5.3 Production build and rollout:
- EAS **production** build (AAB), with Chirag's OK, from the tagged commit `v0.5.0`.
- Upload to the production track with a **staged rollout at 20%**. Release notes from 5.1.
- Flip `REQUIRE_AGE_CONFIRMATION=true` on the backend only after the new build is the one users install; remove the flag two weeks later (dated task).
- Monitor Android vitals and Sentry for 48 hours; raise the rollout to 100% if crash-free sessions hold. Rollback = halt the rollout in the console; the backend stays compatible with 0.4.0 throughout, so no backend rollback is needed.
- Memory and `docs/` updated with the release date and version.

### Phase 6: translations (session 6, after the English text has stopped changing)

- Pipeline: English source → Bhashini (MeitY) or Google Translate for the 22 Eighth Schedule languages → Hindi and Marathi read by a person → stored per language. Re-run on every change to the English text.
- Website: language picker on the legal pages only; `LegalDocument.jsx` takes a `lang` prop; files per language under `src/content/legal/<lang>/`.
- App: `ContentPage` gets a `lang` variant; picker on `app/legal/[id].tsx`; English stays the bundled default, other languages fetched from the website's JSON so the APK does not grow by 22 copies.
- "English prevails" sentence stays on every translated page (it is already in the Terms).
- Estimate: pipeline script ~150 lines, website ~120, app ~150, plus the generated content. Not before Phase 5 ships.

## 3. Sequencing and compatibility

```
Phase 0 (Chirag checks)
  └─ Phase 1 backend ──push──► live, compatible with app 0.4.0
       ├─ Phase 2 website ──push──► live legal pages and signup
       ├─ Phase 3 mobile (needs 1.1, 1.3, 1.7 deployed to test against)
       └─ Phase 4 admin  (needs 1.4)
            └─ Phase 5 verify + release ──► flag flip ──► 100% rollout
                 └─ Phase 6 translations
```

Phases 2, 3 and 4 can run in parallel sessions once Phase 1 is deployed; they touch different repos. Phase 5 needs all three merged.

## 4. L12 rows that apply to every state-changing action added

| Action | T1 double fire | T2 abort | T3 stale client | T5 clumsy input | T7 wrong order | T8 permissions |
|---|---|---|---|---|---|---|
| Register with tick | server dedupes email/phone | OTP step resumes | 0.4.0 app vs flag on → named error | tick without terms link read is still valid | Google first sign-in without tick → no account | n/a |
| Marketing toggle | idempotent PUT | optimistic UI reverts on failure | last write wins, recorded | n/a | n/a | logged out mid-save → clear error |
| Admin delete user | second call 404 | partial delete impossible: `aggregateDelete` refuses before destroying | admin session expired → 401, nothing deleted | reason required, trimmed | cannot delete admin or self | audit row always |
| Retention sweep | re-run is a no-op | crash mid-run resumes next day | n/a | fixed clock in tests | dry-run before live | runs under the jobs runner only |
| Delete account (wording) | existing | existing | existing | existing | existing | existing |

## 5. Open items that need a person

| Item | Who |
|---|---|
| Mobile `.env:17` socket URL to https (0.1) | Chirag, one-character edit |
| Production database has no backup (0.3) | Client's cost decision: Atlas Flex tier or a nightly mongodump |
| Atlas organisation has no security/operations contact | Chirag adds Sanjay Goel and himself in Organization Settings |
| Leaked secrets (Cloudinary, JWT live; Gemini, Mappls unused) | Chirag decided 2026-11-02: no rotation for now. Recorded as accepted risk (J5); revisit before real users sign up, since a JWT rotation then logs them all out |
| Play Console clicks and the two builds | Chirag, with my text and his OK per build |
| Lawyer's read of the final English notice before translations | Client |
