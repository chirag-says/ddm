const { withGradleProperties } = require('expo/config-plugins');

/**
 * Android release-size tuning for the managed/CNG build.
 *
 * Kept as a local plugin so we do not add another runtime dependency just to
 * change Gradle properties. The generated android/ directory is disposable.
 *
 * Release optimizations are safe for every release build. APK-only settings
 * are opt-in through EAS profile environment variables so the normal preview
 * and production configurations remain broadly compatible.
 */
function setProperty(items, key, value) {
  const existing = items.find((item) => item.type === 'property' && item.key === key);
  if (existing) {
    existing.value = value;
    return;
  }
  items.push({ type: 'property', key, value });
}

module.exports = function withAndroidSizeOptimizations(config) {
  return withGradleProperties(config, (mod) => {
    // R8 removes unreachable Java/Kotlin bytecode from release builds.
    setProperty(mod.modResults, 'android.enableMinifyInReleaseBuilds', 'true');

    // Resource shrinking removes Android resources that survive dependency
    // merging but are not reachable from the final app.
    setProperty(mod.modResults, 'android.enableShrinkResourcesInReleaseBuilds', 'true');

    // Compress the JS bundle inside the APK. This trades a small amount of
    // startup CPU for a smaller artifact, which is appropriate for the APK
    // size goal of this project.
    setProperty(mod.modResults, 'android.enableBundleCompression', 'true');

    // Only apply ABI narrowing when an EAS profile explicitly asks for it.
    // This keeps the existing universal build available as a compatibility
    // fallback while allowing a phone-focused ARM64 APK.
    const archs = process.env.DEALDIRECT_ANDROID_ARCHS?.trim();
    if (archs) setProperty(mod.modResults, 'reactNativeArchitectures', archs);

    // Compress native libraries for direct APK distribution. This is a
    // deliberate APK-size optimization; the compact EAS profile enables it.
    if (process.env.DEALDIRECT_USE_LEGACY_PACKAGING === 'true') {
      setProperty(mod.modResults, 'expo.useLegacyPackaging', 'true');
    }

    return mod;
  });
};
