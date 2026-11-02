# Google Play Data safety: answers derived from code

Written 2026-11-02 from the app (`app/`, `src/`, `app.config.js`, `eas.json`) and
the backend (`D:\DD-CLONE\DealDirectSecure\backend`). Every row cites where the
behaviour lives. Production env values (EAS secrets, backend `.env`) are not
visible from the repos; rows that depend on them say so.

Play's "shared" means transferred to a third party for its own use. Transfers to
service providers acting on our behalf (Cloudinary, SMTP, SMS, Expo push, Sentry,
Hubble as the rewards-store operator) and transfers the user starts themself
(contacting an owner, Google Sign-In) are excluded by Play's definition, so they
are declared as collected, not shared.

## Overview section

| Question | Answer | Why |
|---|---|---|
| Does the app collect or share any required data types? | Yes | see below |
| Is all user data encrypted in transit? | Yes | production and preview EAS profiles use `https://backend.dealdirect.in` (`eas.json:25-26`); backend forces HTTPS with HSTS (`server.js:345-358`); release manifest allows no cleartext. **Caveat:** the local `.env` still has `EXPO_PUBLIC_SOCKET_URL=http://backend.dealdirect.in` (`.env:17`), so a locally Gradle-built release would open the socket in cleartext. Change it to `https://` before any local release build. |
| Do you provide a way for users to request data deletion? | Yes | in-app: Settings > Delete account (`app/settings/delete-account.tsx`), calls `DELETE /api/users/me`; web: `https://dealdirect.in/delete-account` (page exists in client-next but still carries `[To be confirmed]` markers; publish a clean version before quoting the URL) |
| Deletion: is some data retained? | Yes, state it | kept after deletion for one year: enquiries (name, email, phone snapshots), deal records and documents, project enquiries; then anonymised or deleted by the `retention-sweep` job (backend `91773b6`, `jobs/retentionSweep.js`; count-only until `RETENTION_SWEEP_LIVE=true`). Reviews stay without a name. The profile photo is now destroyed on deletion (`utils/aggregateDelete.js`, step 7). |
| Independent security review | No | none done |
| Committed to the Families policy | No | app is 18+ |

## Data types

Req = required to use the app; Opt = optional or only in a flow the user chooses.

| Play category | Data type | Collected | Shared | Req/Opt | Purposes | Evidence |
|---|---|---|---|---|---|---|
| Location | Precise location | Yes, only when an owner taps "Use my location" on the listing form; stored as the property's pin | No | Opt | App functionality | `src/features/listings/components/LocationPicker.tsx:128-146`, `formData.ts:140-141` |
| Location | Approximate location | No. City detection runs on the device and only the chosen city name is sent as a search filter | No | — | — | `src/native/location.ts:98-127`, `src/features/home/detectCity.ts` |
| Personal info | Name | Yes | **Yes** (builders, project enquiries) | Req | Account management, app functionality, advertising or marketing (only with the opt-in) | `src/types/backend/user.ts:108-131` |
| Personal info | Email address | Yes | **Yes** (builders, project enquiries) | Req | Account management, app functionality, advertising or marketing (only with the opt-in) | `user.ts:108-148` |
| Personal info | Phone number | Yes | **Yes** (builders, project enquiries) | Opt at signup; required to post, enquire or contact | Account management (OTP), app functionality, advertising or marketing (only with the opt-in) | `src/auth/phoneGate.ts`, `user.ts:112-124` |
| Personal info | User IDs | Yes (account id, referral code) | No | Req | Account management, analytics | `src/observability/sentry.ts:88-91` |
| Personal info | Address | Yes (profile home address; property address) | No | Opt | App functionality | `user.ts:24-46`, `formData.ts:122-145` |
| Personal info | Other info | Yes (date of birth, gender, bio) | No | Opt | App functionality | `src/features/profile/hooks.ts:40-45` |
| Financial info | any | No. Hubble/Razorpay checkout runs on their domains inside a WebView; the app never sees card or UPI data | No | — | — | `src/features/rewards/hubble.ts:107-117` |
| Health and fitness | any | No | | | | |
| Messages | Other in-app messages | Yes (chat, enquiry notes, contact form, visit feedback) | No | Opt | App functionality | `src/types/backend/chat.ts:93-97`, `misc.ts:63-67` |
| Photos and videos | Photos | Yes (profile photo, listing photos) | No | Opt | App functionality | `src/features/listings/imagePicker.ts:46-58`, `app/settings/index.tsx:164-180` |
| Photos and videos | Videos | No | | | | |
| Audio | any | No (microphone permission removed) | | | | `app.config.js:216` |
| Files and docs | Files and docs | Yes (deal-closure documents, image or PDF) | No | Opt | App functionality | `src/features/listings/hooks.ts:137-148`, `backend/middleware/documentUpload.js:96-118` |
| Calendar | any | No | | | | `package.json` has no calendar package |
| Contacts | any | No | | | | no package, no permission |
| App activity | App interactions | Yes (19 whitelisted first-party events with IDs only, 90-day TTL) | No | Req (no opt-out toggle) | Analytics | `src/analytics/events.ts:15-38`, `backend/models/Event.js:12-27` |
| App activity | In-app search history | Yes (saved searches: name, filters, notify flag). Free-text queries are not stored server-side; recent searches stay on the device | No | Opt | App functionality | `src/types/backend/savedSearch.ts:83-91`, `src/storage/mmkv.ts:93` |
| App activity | Other user-generated content | Yes (property listings, reviews, reports) | No | Opt | App functionality | `src/types/backend/review.ts:47-53` |
| App activity | Installed apps / other actions | No | | | | |
| Web browsing | any | No | | | | |
| App info and performance | Crash logs | Yes: `EXPO_PUBLIC_SENTRY_DSN` is set in the `preview` and `production` profiles of `eas.json` (Sentry org `dealdirect`, EU region, since 2026-11-02). Sentry sends account id and role only, no PII, no replay | No | Req | Analytics (Play's wording for crash reporting) | `src/observability/sentry.ts:43-91` |
| App info and performance | Diagnostics | Same as crash logs (10% traces) | No | Req when enabled | Analytics | `sentry.ts:43-81` |
| App info and performance | Other performance data | No | | | | |
| Device or other IDs | Device or other IDs | Yes (random install UUID sent as `anon` and `deviceHash`; Expo push token with app version) | No | Opt (push only after the OS grant); install id always | Analytics, fraud prevention, app functionality (push) | `src/analytics/installationId.ts:52-68`, `src/auth/deviceLink.ts:26-35`, `src/notifications/pushToken.ts:113-157` |

Advertising ID: not collected (no AD_ID permission, no ads SDK).

## Third parties that receive data (for the privacy policy, not the Play form)

| Party | Role under Play's rules | What they get | Evidence |
|---|---|---|---|
| Cloudinary | service provider | profile, listing and deal-document files | `backend/middleware/upload.js:508,628` |
| Meta WhatsApp Cloud API, or WAHA on Railway when Meta is not configured | service provider | phone + notification text; owner gets enquirer name/email/phone; admin alerts with signup name/email/phone and contact-form text. Which one production uses is an env question | `backend/services/whatsappService.js:1-13,29-47,264-340` |
| Hostinger SMTP | service provider | welcome and enquiry emails | `backend/utils/emailService.js:55-94,421-440` |
| Equence | service provider | phone + OTP text | `backend/services/smsService.js:23-39,135-143` |
| Expo push, then FCM | service provider | push token, chat preview (120 chars), sender name | `backend/services/pushService.js:17,49,79-84` |
| Sentry | service provider | error details with account id and role | `sentry.ts:43-91`, `backend/instrument.js:40-79` |
| Hubble (rewards store) | service provider; Razorpay inside its WebView | userId, name, email, phone on SSO; coin balance | `backend/controllers/hubbleController.js:134-212` |
| Google Sign-In | user-initiated | idToken; backend reads sub, email, name, picture | `src/auth/googleSignIn.ts:148` |
| OpenStreetMap tiles, unpkg (Leaflet) | map rendering in a WebView | IP and the map area viewed | `src/features/properties/components/map/leafletHtml.ts:91,118,130` |
| OS geocoder (Android `Geocoder`) | on-device API, may call Google | coordinates or typed address | `src/native/location.ts:98-100,170-184` |
| Builders | third party, by hand | enquirer name, phone, email for project enquiries: admin relays them to the builder (decided 2026-11-02). The enquiry confirmation tells the user so. Declared as **shared** on the form, because the user learns it on confirmation rather than choosing it beforehand |  |

## Play Console text for release 0.5.0 (Phase 5.1)

Chirag pastes; every answer above is the Data safety form. Also:

- **Data deletion URL:** `https://dealdirect.in/delete-account` (live once the Phase 2 website push lands; check it shows no "To be confirmed").
- **Privacy policy URL (store listing):** `https://dealdirect.in/privacy`.
- **Target audience and content:** age groups "18 and over" only. Appeals to children: No. Content rating questionnaire: a property marketplace with user-to-user chat and user-generated listings; no violence, sexual content, gambling or drugs; users can interact and share their location only as a property pin.
- **Release notes, en-IN** (281 characters, counted with `wc -m`, limit 500):

```
What's new in 0.5.0
- Confirm you are 18 or older when you sign up
- Choose whether you get offers by email, SMS or WhatsApp, and change it any time in Settings
- Clearer account deletion: see exactly what is removed and what is kept for one year
- Updated Privacy Policy and Terms
```

## Before the form is submitted

1. ~~`.env:17` socket URL to `https://`~~ (Phase 3 session).
2. Publish `/delete-account` and `/privacy` on the website without `[To be confirmed]` markers (Phase 2, then push).
3. ~~Sentry DSN~~ set in `eas.json` preview and production since 2026-11-02: crash logs and diagnostics are collected.
4. ~~Builder sharing~~ decided: declared as shared.
5. Known gaps the policy must not contradict: no analytics opt-out; deal documents public on Cloudinary unless `SENSITIVE_UPLOADS_PRIVATE` is set; the retention sweep writes only after `RETENTION_SWEEP_LIVE=true`.
