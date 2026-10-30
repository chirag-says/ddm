# Add property form: fixes plan (2026-10-30)

Status: implemented 2026-10-30, all seven phases, one commit each
(e0a9c61, a066edc, 1c15e91, 03ff191, 5a6f069, c2047ac, 11a40eb). Unit
tests, typecheck and lint green. Not yet walked through on the phone (it
was disconnected); the "Proof" list below is still to do.

Where the build differed from this plan:
- Phase 1 also clears amenities and the commercial configuration on a
  category switch (each category has its own amenity list), and moved the
  form's re-filing effect into `reconcileType` so the Edit case is tested.
- Phase 2 put the step rules (`stepBlocker`, `firstBlockedStep`) in
  `listingFields.ts` so they are tested; Review blocks on the first step
  still missing anything, not only photos.
- Phase 3: Property age (4 options) is chips; BHK (7) is a dropdown.
- Phase 7 needed no rebuild: `expo-file-system` 19.0.24 was already in the
  installed build as a dependency of `expo`. The lockfile was edited with
  npm 10.9.3 in lock-only mode; `npm run relock` re-resolved the whole tree
  and bumped 112 packages (google-signin among them), so it was not used.

Scope agreed with Chirag on 2026-10-30:
- The four complaints from testing build 14 (0.3.0).
- Improvements 1-6, 8 and 9 from the review of the flow.
- NOT the Location step (item 7): it stays exactly as it is.
- Photos stays the 6th step. No step moves.

The form is `src/features/listings/components/ListingForm.tsx`, shared by
Add (`app/owner/property/new.tsx`) and Edit (`app/owner/property/[id]/edit.tsx`).
Steps, unchanged: 1 Category, 2 Basics, 3 Location, 4 Price & area,
5 Details, 6 Photos, 7 Review.

## What the code says

| Issue | Where | Cause |
|---|---|---|
| Can't switch category | `ListingForm.tsx:214-233` | An effect keeps `propertyTypeName` valid for the category. When you tap Commercial with "Villa" chosen, it finds that Villa belongs to Residential and sets the category back. Written for the Edit screen (seeded values), it also runs on taps. |
| No clear | `ListingForm.tsx:370-386` | Category chips only select. The type `Select` has no clear control (`src/ui/Select.tsx` has none). |
| Photos optional | `ListingForm.tsx:95-118`, `1070-1087` | `stepBlocker` returns null for the Photos step. Review shows a red "No photos yet" line but the submit button still works. The backend accepts a listing with no images. |
| Website's photo rule | `client-next .../AddPropertyContent.jsx:596-603` | Requires at least one photo in the type's exterior/facade category before leaving the photo step. Edit on the website has no such rule. |
| Website's other required fields | same file, `:583-591` | BHK for residential (except Studio) and a built-up area are required; mobile asks both as optional. |
| Rooms look like facing | `ListingForm.tsx:1270-1334` | Facing chips, Construction status chips, then the four room chips with no heading or spacing of their own. |
| Chips vs dropdowns | throughout | Facing: 8 chips. Pet friendly: 2-option dropdown. Furnishing: 3-option dropdown. Property age: 4-option dropdown. Tenants: 5-option dropdown. BHK: 7-option dropdown. |
| Floor never asked | `types.ts` has `floorNo`; `ListingForm.tsx` never renders it | The website sends `floorNo`; mobile collects only "Total floors". |
| Commas in money fields | `ListingForm.tsx:698`, `:732`; `listingFields.ts:46` | Price and maintenance strip non-digits; deposit and booking amount do not, and deposit is sent as typed. |
| Draft loses photos | `draft.ts` module doc; `new.tsx` resume alert | Photos are cache URIs the OS may purge, so they are not drafted. |
| Review shows 8 rows | `ListingForm.tsx:1010-1068` | Description, floor, facing, deposit, availability and amenities are not shown before submit. |

## Decisions (agreed)

- **D1 (photos):** at least one photo of any kind blocks Next on Photos and
  Submit on Review. The first photo an owner adds is filed under the type's
  exterior category ("Building Exterior", "Villa Exterior") instead of
  "Other", so the listing meets the website's bar without an extra tap. The
  owner can retag it.
- **D2:** the photo rule applies on Edit too (shared form; prod data is test
  data, so no legacy listing is trapped).
- **D3 (chips or dropdown):** up to 4 options show as chips, 5 or more as a
  dropdown. Multi-select lists (Amenities, Extra rooms, Compliance
  documents) stay chips.
- **D4 (clearing):** tapping a selected chip clears it; a dropdown gets a
  "Clear" row at the top of its sheet when something is chosen. Category can
  be cleared; the existing "Choose a category to continue" message covers
  the empty state.
- **D5 (required fields, website parity):** Residential needs a BHK (Studio
  types count as chosen) and every listing needs one area figure (built-up,
  or carpet where built-up is not asked). Asked where they are today; the
  step blocker names them.
- **D6 (title):** steps do not move. Title becomes optional on step 2, with a
  tappable "Suggested: …" line built from what is known so far. Entering
  Review with an empty title fills it with the suggestion
  ("3 BHK Apartment for sale in Whitefield"), shown as an editable row.

## Phases

Each phase is one commit, typecheck and tests green, checked on the phone
before the next starts.

### Phase 1: category switch and clear (the bug)
- Step 1: the category chip writes category, type and commercial sub-type in
  ONE `patch` (`{categoryName, propertyTypeName: '', commercialSubType: ''}`);
  tapping the selected chip clears all three. With the type cleared in the
  same write, the rescue effect returns early and no longer flips the
  category back. The effect stays for the Edit screen.
- Pure helper `selectCategory(values, name)` in `listingFields.ts`.
- `src/ui/Select.tsx`: optional `onClear`; renders a "Clear" row at the top
  of the sheet when `value` is set. Property type uses it.
- Tests: "switching to Commercial drops the Villa type and sub-type";
  "tapping the chosen category again clears it"; "an Edit screen seeded with
  Villa under the wrong category is moved, not wiped".

### Phase 2: required fields (photo, BHK, area) and the money fields
- `stepBlocker(step, values, photoCount)`:
  - Photos: "Add at least one photo to continue." when the count is 0.
  - Details (Residential): "Choose the BHK to continue." when `bhkType` is
    empty and the type is not a Studio.
  - Price & area: "Enter the built-up area." (or carpet, per `areaFieldsFor`)
    when no area figure is entered.
- Step 1 gets one line under the heading: "You'll need at least one photo
  and the price." The Details intro drops "Everything here is optional".
- Review: with zero photos, the submit button is replaced by the same
  sentence and an "Add photos" button that goes to Photos. `onSubmit` is
  never called with zero photos.
- First-photo tagging per D1: `defaultPhotoCategory(categoryName,
  propertyTypeName, existingCount)` in `catalog.ts`; `handlePickPhotos` and
  `handleCapturePhoto` use it.
- Deposit and booking amount go through `digits()` like price does.
- Tests: "the Photos step cannot be left with no photo"; "a 2 BHK with no
  BHK chosen cannot leave Details"; "a Studio can"; "the first photo is
  filed as the exterior for the type, the second as Other"; "a type with no
  exterior category files the first photo as Other"; "a deposit typed with
  commas is sent as digits".

### Phase 3: Details step readability and the chips/dropdown rule
- New `src/ui/ChoiceField.tsx`: `label`, `options`, `value`, `onChange`,
  `clearable`, optional `hint`. Chips when `options.length <= 4`, otherwise
  `Select` with `onClear`. One constant holds the threshold. Replaces the
  hand-built chip rows and selects in the form.
- Details: Facing becomes a dropdown; Construction status stays chips; a
  "Floor" input sits beside "Total floors" (`floorNo`, already in the type
  and sent by the website); then a heading "Extra rooms" with the caption
  "Tick the ones this home has" above the four room chips.
- `listingFields.ts` sends `floorNo` the way the website does (check the
  field name against `formData.ts` and the server whitelist first).
- Tests: "floor number is sent when given". Rendering checked on the phone.

### Phase 4: title suggestion (D6)
- Pure `suggestedTitle(values)` in `listingFields.ts`:
  `[bhkType, propertyTypeName, 'for sale'|'for rent', 'in ' + locality]`
  with blanks dropped, e.g. "Villa for sale" on step 2 and
  "3 BHK Apartment for sale in Whitefield" by Review.
- Step 2: Title no longer blocks; a "Suggested: …" line under the field
  fills it on tap. The 5-character minimum still applies to a typed title.
- Entering Review with an empty title patches it with the suggestion; the
  Title row shows it and taps back to step 2 as before.
- Tests: "the suggestion uses only what is known"; "a typed title is never
  overwritten".

### Phase 5: fuller Review
- Rows added: Description (first line, or "none"), Floor ("3 of 12"),
  Facing, Deposit (rent) or Booking amount (sale), Available from,
  Amenities ("6 chosen"), Extra rooms. Each taps back to its step.
- No tests beyond typecheck; checked on the phone.

### Phase 6: amenities grouped
- `catalog.ts`: the two amenity lists gain a group per item (Building,
  Inside the home, Outdoors, Safety for residential; Building, Services,
  Safety for commercial). Values sent to the server do not change.
- The Amenities card renders a heading per group, chips under it.
- Note for later: "Store Room" and "Servant Room" exist both as amenities
  and as the Extra rooms toggles. Left as is for website parity; worth
  removing from the amenity list on both clients together.
- Tests: "every amenity has a group"; "grouping keeps the original order".

### Phase 7: photos survive the draft (needs a new build)
- Add `expo-file-system`. On pick or capture, copy each photo into the
  app's document directory and draft the copied URI and its room tag.
- `draft.ts` stores `photos: CategorizedPhoto[]`; resume restores them and
  the alert drops "Photos need to be added again". Copies are deleted when
  the draft is cleared (submit or "Start over").
- Because `expo-file-system` is a native module, the debug build on the
  phone must be rebuilt (`npx expo run:android --no-bundler`, about 10
  minutes) before this phase can be tested. That build waits for Chirag's
  OK. The next EAS production build picks it up automatically.
- Tests: "a resumed draft offers the photos it had"; "clearing the draft
  removes the copies" (file ops behind a small interface so the test can
  fake them).

## Size

| Phase | Est. source lines (net) |
|---|---|
| 1 | +35 |
| 2 | +55 |
| 3 | +40 (ChoiceField +70, form −60, floor +15, sender +5) |
| 4 | +35 |
| 5 | +30 |
| 6 | +45 |
| 7 | +70 |
| Total | about +310, plus about +120 of tests |

Over the 300-line mark for one feature, which is why it is seven commits
with a phone check between each, and why Phase 7 is last and separate.

## Blast radius

- Add and Edit share the form. Phase 1's clearing only runs on taps; seeded
  Edit values go through the unchanged effect. Phase 2's blockers apply to
  Edit too (D2, D5); an existing listing missing BHK or area will have to
  fill them before saving, which is the point.
- The draft (`draft.ts`) stores the same values; a cleared type is persisted
  as cleared. Phase 7 changes its shape; old drafts without `photos` still
  load.
- `Select` is used on other screens (search filters, settings); `onClear` is
  optional and off by default, so they do not change.
- `floorNo` is a new field in the request: confirm the server accepts it on
  add and edit before sending it (it is on the website's payload).
- No backend, website or admin changes. The backend still accepts a listing
  without images or BHK; only the app stops sending one.
- At 10x load nothing changes: all of this is on-device form logic.

## Proof

- `npm test` for every pure helper above, each test failing before its
  change and passing after.
- `npm run typecheck`, lint on the touched files.
- On the phone, with Metro, after each phase: walk all seven steps for
  Residential/Villa, then switch to Commercial/Office Space on step 1 and
  walk again; try Next on Photos with none; try Submit from Review with
  none; open Edit on an existing listing and confirm its type, BHK and area
  are still there; check Facing as a dropdown, the Floor input, the Extra
  rooms heading, the title suggestion, the fuller Review, the grouped
  amenities; after Phase 7, kill the app mid-form and resume with photos.
- L12 rows: T1 double-tap on a category chip (select then clear) behaves
  like every toggle chip in the form, accepted; T2 abort midway is the
  draft, extended to photos in Phase 7; T5 clumsy input is the comma fix and
  the pincode digit cap already there; T9 returning from the photo picker
  is unchanged; T3 stale client: an Edit of a listing that no longer meets
  the new rules is asked to fill them, never silently saved.

## Not in this plan

- The Location step (kept as it is, by decision).
- Moving any step.
- Making the server reject a listing without images or BHK.
- The website's Edit page (no photo rule there either).
