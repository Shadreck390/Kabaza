module.exports = {
  presets: ['module:@react-native/babel-preset'],
  
  plugins: [
    // ✅ MUST BE FIRST: TypeScript plugin before class features
    '@babel/plugin-transform-typescript',
    
    // ✅ Then class features (in this order)
    '@babel/plugin-transform-class-properties',
    ['@babel/plugin-transform-private-methods', { loose: true }],
    '@babel/plugin-proposal-decorators',
    
    // ✅ Then module resolver
    [
      'module-resolver',
      {
        root: ['./'],
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
        alias: {
          // ========== ROOT LEVEL FOLDERS ==========
          '@screens': './screens',
          '@navigation': './navigation',
          '@assets': './assets',
          
          // ========== SRC FOLDERS ==========
          '@src': './src',
          '@components': './src/components',
          '@config': './src/config',
          '@constants': './src/constants',
          '@context': './src/context',
          '@store': './src/store',
          '@hooks': './src/hooks',
          '@services': './src/services',
          '@api': './src/services/api',
          '@socket': './src/services/socket',
          '@location': './src/services/location',
          '@payment': './src/services/payment',
          '@realtime': './src/services/realtime',
          '@ride': './src/services/ride',
          '@notification': './src/services/notification',
          '@document': './src/services/document',
          '@utils': './src/utils',
        },
      },
    ],
    
    'react-native-reanimated/plugin',
  ],
  
  env: {
    test: {
      plugins: [
        // Same order for test environment
        '@babel/plugin-transform-typescript',
        '@babel/plugin-transform-class-properties',
        ['@babel/plugin-transform-private-methods', { loose: true }],
        '@babel/plugin-proposal-decorators',
        [
          'module-resolver',
          {
            root: ['./'],
            extensions: ['.js', '.jsx', '.ts', '.tsx'],
            alias: {
              '@screens': './screens',
              '@navigation': './navigation',
              '@assets': './assets',
              '@src': './src',
              '@components': './src/components',
              '@config': './src/config',
              '@constants': './src/constants',
              '@context': './src/context',
              '@store': './src/store',
              '@hooks': './src/hooks',
              '@services': './src/services',
              '@utils': './src/utils',
            },
          },
        ],
      ],
    },
  },
};