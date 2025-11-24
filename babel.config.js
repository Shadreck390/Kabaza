module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    ['@babel/plugin-transform-private-methods', { loose: true }],
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
    'react-native-reanimated/plugin',
  ],
  // ✅ ADD THIS SECTION FOR JEST
  env: {
    test: {
      presets: ['module:@react-native/babel-preset'],
      plugins: [
        ['@babel/plugin-transform-private-methods', { loose: true }],
      ],
    },
  },
};