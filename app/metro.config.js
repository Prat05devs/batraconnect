const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// inlineRem 16 keeps Tailwind sizes identical on Android and iOS (React Native Reusables setup).
module.exports = withNativeWind(config, { input: './global.css', inlineRem: 16 });
