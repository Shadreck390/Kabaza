module.exports = {
  presets: ['module:@react-native/babel-preset'],

  plugins: [
    ['@babel/plugin-transform-private-methods', { loose: true }],

    // ✅ FIX: Reanimated must always be LAST
    [
      'module-resolver',
      {
        root: ['./'],
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
        alias: {
          screens: './screens',
          navigation: './navigation',
          components: './src/components',
          services: './services',
          src: './src',
          assets: './assets',
        },
      },
    ],

    // ⚠️ MUST ALWAYS BE LAST PLUGIN
    'react-native-reanimated/plugin',
  ],

  // Jest config
  env: {
    test: {
      presets: ['module:@react-native/babel-preset'],
      plugins: [['@babel/plugin-transform-private-methods', { loose: true }]],
    },
  },
};
