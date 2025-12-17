module.exports = {
  presets: ['module:@react-native/babel-preset'],
  
  plugins: [
    ['@babel/plugin-transform-private-methods', { loose: true }],
    
    [
      'module-resolver',
      {
        root: ['./'],
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
        alias: {
          // Professional aliases (recommended) - ensure these paths exist
          '@src': './src',
          '@components': './src/components',
          '@services': './src/services',
          '@store': './src/store',
          '@utils': './src/utils',
          '@hooks': './src/hooks',
          '@constants': './src/constants',
          '@config': './src/config',
          
          // Folder aliases (optional) - consider using '@' prefix consistently
          'screens': './screens',
          'navigation': './navigation',
          'assets': './assets',
          'src': './src',
        },
      },
    ],
    
    'react-native-reanimated/plugin',
  ],
  
  env: {
    test: {
      plugins: [
        ['@babel/plugin-transform-private-methods', { loose: true }],
        // Add module-resolver for test environment too
        [
          'module-resolver',
          {
            root: ['./'],
            extensions: ['.js', '.jsx', '.ts', '.tsx'],
            alias: {
              '@src': './src',
              '@components': './src/components',
              '@services': './src/services',
              '@store': './src/store',
              '@utils': './src/utils',
              '@hooks': './src/hooks',
              '@constants': './src/constants',
              '@config': './src/config',
            },
          },
        ],
      ],
    },
  },
};