/**
 * MainActivity: no manifest orientation lock; portrait requested at runtime
 * on phones only. Fixtures are the lines Expo SDK 54's prebuild generates
 * (checked against a real `expo prebuild` on 2026-10-24).
 *
 *   npm test
 */
const test = require('node:test');
const assert = require('node:assert/strict');

const portrait = require('./withPortraitOnPhones');

const MAIN_ACTIVITY = `package \`in\`.dealdirect.mobile
import expo.modules.splashscreen.SplashScreenManager

import android.os.Build
import android.os.Bundle

import com.facebook.react.ReactActivity

class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    SplashScreenManager.registerOnActivity(this)
    super.onCreate(null)
  }

  override fun getMainComponentName(): String = "main"
}
`;

function manifestWithMain(attrs) {
  return {
    manifest: {
      application: [
        {
          activity: [
            { $: { 'android:name': '.MainActivity', ...attrs } },
            { $: { 'android:name': 'com.example.OtherActivity', 'android:screenOrientation': 'portrait' } },
          ],
        },
      ],
    },
  };
}

test('Kotlin package segments that are keywords are escaped', () => {
  assert.equal(portrait.kotlinPackage('in.dealdirect.mobile'), '`in`.dealdirect.mobile');
  assert.equal(portrait.kotlinPackage('com.example.app'), 'com.example.app');
  assert.match(portrait.orientationPolicySource('in.dealdirect.mobile'), /^package `in`\.dealdirect\.mobile\n/);
});

test('the policy treats 600dp smallest width as a large screen, the threshold Android 16 uses', () => {
  const src = portrait.orientationPolicySource('in.dealdirect.mobile');
  assert.match(src, /LARGE_SCREEN_MIN_WIDTH_DP = 600f/);
  assert.match(src, /SCREEN_ORIENTATION_UNSPECIFIED\s+else ActivityInfo\.SCREEN_ORIENTATION_PORTRAIT/);
  assert.match(src, /maximumWindowMetrics/, 'measures the largest window, so split-screen does not count as a phone');
});

test('MainActivity loses its manifest orientation lock; other activities are untouched', () => {
  const out = portrait.removeMainActivityOrientation(manifestWithMain({ 'android:screenOrientation': 'portrait' }));
  const [main, other] = out.manifest.application[0].activity;
  assert.equal(main.$['android:screenOrientation'], undefined);
  assert.equal(other.$['android:screenOrientation'], 'portrait');
});

test('the orientation policy runs before onCreate and after configuration changes', () => {
  const out = portrait.addOrientationPolicyCalls(MAIN_ACTIVITY);
  assert.ok(out.indexOf('import android.content.res.Configuration') > out.indexOf('import android.os.Bundle'));
  assert.ok(out.indexOf('OrientationPolicy.apply(this)') < out.indexOf('super.onCreate(null)'), 'applied before the activity is created');
  assert.match(out, /override fun onConfigurationChanged\(newConfig: Configuration\) \{\n\s+super\.onConfigurationChanged\(newConfig\)\n\s+OrientationPolicy\.apply\(this\)/);
  assert.equal(portrait.addOrientationPolicyCalls(out), out, 'running prebuild twice changes nothing');
});

test('a MainActivity the plugin does not recognise fails the build loudly', () => {
  assert.throws(() => portrait.addOrientationPolicyCalls('class Something {}\n'), /update the plugin/);
  assert.throws(() => portrait.removeMainActivityOrientation({ manifest: { application: [{ activity: [] }] } }), /MainActivity not found/);
});
