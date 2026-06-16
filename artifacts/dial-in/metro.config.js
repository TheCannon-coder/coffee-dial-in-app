const { getDefaultConfig } = require("expo/metro-config");
const { wrapWithReanimatedMetroConfig } = require("react-native-reanimated/metro-config");
const { getBundleModeMetroConfig } = require("react-native-worklets/bundleMode");

const config = getDefaultConfig(__dirname);
getBundleModeMetroConfig(config);
module.exports = wrapWithReanimatedMetroConfig(config);
