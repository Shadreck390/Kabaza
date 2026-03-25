const { getDefaultConfig } = require("@react-native/metro-config");
const defaultConfig = getDefaultConfig(__dirname);

module.exports = {
  ...defaultConfig,

  transformer: {
    ...defaultConfig.transformer,
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },

  resolver: {
    ...defaultConfig.resolver,
    assetExts: [...defaultConfig.resolver.assetExts, 'png', 'jpg', 'jpeg', 'gif', 'svg'],
    sourceExts: [...defaultConfig.resolver.sourceExts, 'jsx', 'js', 'ts', 'tsx'],
    blockList: [/.*\/node_modules\/react-native-maps\/lib\/android\/index\.js$/],
    alias: {
      crypto: 'react-native-crypto',
      url: 'react-native-url-polyfill',
      http: '@tradle/react-native-http',
      https: 'react-native-https-polyfill',
      stream: 'readable-stream',
      buffer: '@craftzdog/react-native-buffer',
      '@src': './src',
      '@store': './src/store',
      '@components': './src/components',
      '@screens': './screens',
      '@navigation': './navigation',
    },
  },
};