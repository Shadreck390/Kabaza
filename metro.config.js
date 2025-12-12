const { getDefaultConfig } = require("@react-native/metro-config");
const defaultConfig = getDefaultConfig(__dirname);

module.exports = {
  ...defaultConfig,

  transformer: {
    ...defaultConfig.transformer,
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true, // required for performance + Reanimated
      },
    }),
  },

  resolver: {
    ...defaultConfig.resolver,
    assetExts: [...defaultConfig.resolver.assetExts, 'png', 'jpg', 'jpeg', 'gif', 'svg'],
    sourceExts: [...defaultConfig.resolver.sourceExts, 'jsx', 'js', 'ts', 'tsx'],
    blockList: [/.*\/node_modules\/react-native-maps\/lib\/android\/index\.js$/],
  },
};

