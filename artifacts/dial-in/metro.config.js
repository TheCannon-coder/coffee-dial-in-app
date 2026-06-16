const { getDefaultConfig } = require("expo/metro-config");
const { wrapWithReanimatedMetroConfig } = require("react-native-reanimated/metro-config");
const { getBundleModeMetroConfig } = require("react-native-worklets/bundleMode");

// Metro 0.83+ (RN 0.85 / Expo SDK 56) changed the internal bundler structure so
// that Server.getBundler().getBundler() can return undefined.  @expo/metro-config's
// patchTransformFileForPackedMaps blindly calls bundler.transformFile on that result
// and crashes with "Cannot read properties of undefined (reading 'transformFile')".
//
// metro.config.js is require()-d by @expo/cli's loadConfig() before
// patchTransformFileForPackedMaps is invoked, and Node's module cache is shared in
// the same process, so patching the export here prevents the crash in all envs
// (local metro, EAS cloud builds, etc.) without relying on pnpm patch infrastructure.
try {
  const packedMap = require("@expo/metro-config/build/serializer/packedMap");
  const _orig = packedMap.patchTransformFileForPackedMaps;
  packedMap.patchTransformFileForPackedMaps = function patchTransformFileForPackedMaps(bundler) {
    if (!bundler || typeof bundler.transformFile !== "function") return;
    return _orig.call(this, bundler);
  };
} catch (_) {}

const config = getDefaultConfig(__dirname);
getBundleModeMetroConfig(config);
module.exports = wrapWithReanimatedMetroConfig(config);
