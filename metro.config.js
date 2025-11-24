/**
 * Metro configuration for React Native
 * https://github.com/facebook/react-native
 *
 * @format
 */

const { getDefaultConfig } = require("@react-native/metro-config");
const defaultConfig = getDefaultConfig(__dirname);

module.exports = {
  ...defaultConfig,
  
  resolver: {
    ...defaultConfig.resolver,
    
    // Block unnecessary Android index for react-native-maps to prevent duplicate module errors
    blockList: [
      /.*\/node_modules\/react-native-maps\/lib\/android\/index\.js$/,
    ],

    // Optional: support custom extensions if you add TypeScript later
    sourceExts: [...defaultConfig.resolver.sourceExts, 'jsx', 'js', 'ts', 'tsx'],
  },
  
  transformer: {
    ...defaultConfig.transformer,
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true, // ✅ improves startup performance
      },
    }),
  },
};
