# Android: Play Console findings for Android 15 and 16

Play Console listed two items under "For your next release" for 0.2.0 (version
code 13, built from `2e4f461`). This note records what each one is, what was
changed, what was deliberately not changed, and how it was verified.

Evidence comes from two local release builds of the same code, one before and
one after the change, scanned with `dexdump` and deobfuscated through R8's
`mapping.txt`. The obfuscated name Play showed, `j9.b.b`, is the name R8 gave
the same method in the local build, so the local builds match the store build.

## 1. "Remove resizability and orientation restrictions"

Play found two portrait-locked activities.

**`in.dealdirect.mobile.MainActivity`**, from `orientation: 'portrait'` in
`app.config.js`. From Android 16 (target SDK 36, which this app targets) the
system ignores orientation and resizability locks on large screens (smallest
width of at least 600dp: tablets, unfolded foldables, desktop windows), so the
lock already did nothing there. It only still applied on phones.

Change: `plugins/withPortraitOnPhones.js` removes the manifest attribute and
generates `OrientationPolicy.kt`. MainActivity requests portrait at runtime
when the largest window the app can have is phone-sized, and leaves
orientation unrestricted otherwise. It runs before the activity is created and
after every configuration change, so folding, unfolding and moving between
displays are handled. iOS still reads `orientation` as before.

Consequence for the UI: on large screens the app rotates. That was already
true on Android 16 tablets. The one place that captured the window size once at
import, the focused-search overlay in `HomeHeader`, now reads it live.

**`com.google.mlkit.vision.codescanner.internal.GmsBarcodeScanningDelegateActivity`**,
from Google's `play-services-code-scanner`. The app never scans codes. It came
from `expo-dev-launcher`, the development client's "scan a QR code to connect"
screen. That screen's code is only in the launcher's debug source set, but the
launcher declares `play-services-code-scanner` and `com.google.mlkit:barcode-scanning`
for every variant, so every release build carried them unused, including ML
Kit's native barcode library.

Change: `plugins/withReleaseWithoutCodeScanner.js` excludes those two modules
from the app's release configurations. Debug builds, where the scanner is
used, are untouched, and no library code is changed.

Considered and not done: leaving the whole development client out of release
builds. SDK 54's Gradle settings plugin passes an exclude list to the resolver
as one argument, so a list of more than one package excludes nothing
(expo/expo#38169; checked by running the resolver both ways). Later SDKs pass
each name separately. Revisit on the SDK upgrade; until then the launcher's
inactive release stubs stay, which is Expo's normal Android setup.

## 2. "Your app uses deprecated APIs or parameters for edge-to-edge"

Android 15 deprecated `Window.setStatusBarColor`, `setNavigationBarColor` and
`getStatusBarColor`. With target SDK 35 or higher they do nothing on Android
15+. Play lists any code in the app that references them.

Every reference in the release build is in library code. None is in this app's
code: the app's JavaScript only sets the status-bar icon style, which uses the
non-deprecated `WindowInsetsControllerCompat`.

| Code (deobfuscated) | Library | What it is |
|---|---|---|
| `WindowUtilKt.enableEdgeToEdge` | React Native | Makes Android 14 and below draw edge-to-edge by setting both bars transparent. Still present in React Native 0.88 (checked 2026-10-24). |
| `StatusBarModule.getTypedExportedConstants`, `StatusBarModule$setColor$1.runGuarded` | React Native | Reads the bar colour for a JS constant; `setColor` returns early when edge-to-edge is on, which it always is here. Removed in later React Native (0.88 has none). |
| `ExpoCropImageUtils.applyWindowTheming` (Play's `j9.b.b`) | expo-image-picker 17.0.11, the newest for SDK 54 | Colours the status bar behind the crop toolbar (profile photo crop in Settings). |
| `ScreenWindowTraits` colour setters | react-native-screens | Backs the `statusBarColor` / `navigationBarColor` screen options, which this app does not use. |
| `SplashScreen$Impl31.applyAppSystemUiTheme` | androidx core-splashscreen | Google's own splash library. |
| `EdgeToEdgeUtils.applyEdgeToEdge` | Material Components | Google's own library. |

Not changed, on purpose: removing these means patching library source, and
React Native itself still sets the bar colours in its newest release because
that is how edge-to-edge works on Android 14 and below. Google treats this
finding as advice, not a policy violation. It clears as the libraries move on
(a future Expo SDK); nothing in this app needs to change for it.

What is worth checking on a real Android 15+ phone is the effect, not the
reference: the crop screen's colour call is ignored there, so its toolbar must
still clear the status bar.

## Verification

Before and after, local release builds of this branch:

Baseline (0.2.0 as built), local release build with the same R8 output as the
store build:

- Manifest: MainActivity and `GmsBarcodeScanningDelegateActivity` locked to
  portrait; the scanner activity present.
- Dex: 11 methods reference the deprecated bar-colour APIs (table above).

With this change:

- `expo prebuild`: MainActivity has no `screenOrientation`, `OrientationPolicy.kt`
  is generated and called before `onCreate` and on configuration changes, and
  `app/build.gradle` excludes the two scanner modules from release
  configurations.
- Release manifest merge: MainActivity no longer locked (checked). Scanner
  activity: to confirm with `./gradlew :app:processReleaseMainManifest`.
- Devices: portrait on a phone; rotation on a large screen; profile-photo crop
  screen on Android 15+. Pending.
- Plugin unit tests: `npm test` (plugins/*.test.js).

