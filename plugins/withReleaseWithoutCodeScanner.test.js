/**
 * Release builds exclude Google's code scanner, which only the dev launcher's
 * debug code uses. The fixture is the shape of Expo SDK 54's app/build.gradle.
 *
 *   npm test
 */
const test = require('node:test');
const assert = require('node:assert/strict');

const { addReleaseExclusions } = require('./withReleaseWithoutCodeScanner');

const BUILD_GRADLE = `apply plugin: "com.android.application"

android {
    buildTypes {
        debug { }
        release { }
    }
}

dependencies {
    implementation("com.facebook.react:react-android")
}
`;

test('both scanner modules are excluded from release configurations only', () => {
  const out = addReleaseExclusions(BUILD_GRADLE);
  assert.match(out, /configuration\.name\.toLowerCase\(\)\.contains\("release"\)/);
  assert.match(out, /exclude group: "com\.google\.android\.gms", module: "play-services-code-scanner"/);
  assert.match(out, /exclude group: "com\.google\.mlkit", module: "barcode-scanning"/);
  assert.ok(out.indexOf('configurations.configureEach') < out.indexOf('dependencies {'), 'placed before the dependencies block');
  assert.ok(out.includes('implementation("com.facebook.react:react-android")'), 'existing dependencies kept');
});

test('running prebuild twice adds the block once', () => {
  const once = addReleaseExclusions(BUILD_GRADLE);
  assert.equal(addReleaseExclusions(once), once);
});

test('an unrecognised build.gradle fails the build instead of shipping the scanner', () => {
  assert.throws(() => addReleaseExclusions('android { }\n'), /update the plugin/);
});
