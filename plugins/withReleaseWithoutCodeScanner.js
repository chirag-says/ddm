const { withAppBuildGradle } = require('expo/config-plugins');
const { mergeContents } = require('@expo/config-plugins/build/utils/generateCode');

/**
 * Keeps Google's code scanner out of release builds.
 *
 * The development client's launcher (`expo-dev-launcher`) has a "scan a QR
 * code to connect" screen. Its code lives only in the launcher's DEBUG source
 * set, but the launcher declares the libraries behind it for every variant:
 *
 *   com.google.android.gms:play-services-code-scanner
 *   com.google.mlkit:barcode-scanning
 *
 * So every release build carried them, unused: Google's
 * `GmsBarcodeScanningDelegateActivity`, which its own manifest locks to
 * portrait (Play: "Remove resizability and orientation restrictions ... to
 * support large screen devices"), and ML Kit's native barcode library. The
 * app itself never scans codes.
 *
 * The app's release configurations exclude both modules. Nothing in a release
 * build references them, so this removes code that could never run; debug
 * builds, where the scanner is used, are untouched. No library code changes.
 *
 * Leaving the whole development client out of release builds would be
 * tidier, but SDK 54's Gradle settings plugin passes an exclude list to the
 * resolver as one argument, so a list of more than one package excludes
 * nothing (expo/expo#38169; fixed in later SDKs). Revisit on the SDK upgrade.
 */

const TAG = 'dealdirect-release-without-code-scanner';

const RELEASE_EXCLUSIONS = `// Release builds only: the dev launcher's QR scanner is debug code. See
// plugins/withReleaseWithoutCodeScanner.js.
configurations.configureEach { configuration ->
    if (configuration.name.toLowerCase().contains("release")) {
        configuration.exclude group: "com.google.android.gms", module: "play-services-code-scanner"
        configuration.exclude group: "com.google.mlkit", module: "barcode-scanning"
    }
}`;

function addReleaseExclusions(buildGradle) {
  const anchor = /^dependencies \{/m;
  if (!anchor.test(buildGradle)) {
    throw new Error(
      'withReleaseWithoutCodeScanner: app/build.gradle has no top-level "dependencies {" block; update the plugin for this template.'
    );
  }
  return mergeContents({
    tag: TAG,
    src: buildGradle,
    newSrc: RELEASE_EXCLUSIONS,
    anchor,
    offset: 0,
    comment: '//',
  }).contents;
}

function withReleaseWithoutCodeScanner(config) {
  return withAppBuildGradle(config, (mod) => {
    if (mod.modResults.language !== 'groovy') {
      throw new Error('withReleaseWithoutCodeScanner: expected a Groovy app/build.gradle.');
    }
    mod.modResults.contents = addReleaseExclusions(mod.modResults.contents);
    return mod;
  });
}

module.exports = withReleaseWithoutCodeScanner;
module.exports.addReleaseExclusions = addReleaseExclusions;
