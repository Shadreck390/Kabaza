module.exports = {
  presets: ['module:@react-native/babel-preset'],
  
  plugins: [
    // ✅ CRITICAL: TypeScript plugin MUST be first
    '@babel/plugin-transform-typescript',
    
    // ✅ Class features plugins (order matters!)
    ['@babel/plugin-transform-class-properties', { loose: true }],
    ['@babel/plugin-transform-private-methods', { loose: true }],
    ['@babel/plugin-transform-private-property-in-object', { loose: true }],
    
    // ✅ Module resolver for alias support
    [
      'module-resolver',
      {
        root: ['./'],
        extensions: [
          '.ios.js',
          '.android.js',
          '.js',
          '.jsx',
          '.ts',
          '.tsx',
          '.json',
          '.native.js'
        ],
        
        alias: {
          // Core folders
          '@src': './src',
          '@components': './src/components',
          '@constants': './src/constants',
          '@hooks': './src/hooks',
          '@services': './src/services',
          '@store': './src/store',
          '@utils': './src/utils',
          '@config': './src/config',
          '@context': './src/context',
          
          // Root level folders
          '@navigation': './navigation',
          '@screens': './screens',
          '@assets': './assets',
          
          // Screen modules
          '@screens/auth': './screens/auth',
          '@screens/common': './screens/common',
          '@screens/driver': './screens/driver',
          '@screens/rider': './screens/rider',
          '@screens/payments': './screens/payments',
          '@screens/MapScreen': './screens/MapScreen',
          '@screens/profile': './screens/profile',
          
          // Feature-specific aliases
          '@auth': './screens/auth',
          '@driver': './screens/driver',
          '@rider': './screens/rider',
          '@payments': './screens/payments',
          '@common': './screens/common',
          
          // Specific services
          '@api': './src/services/api',
          '@location': './src/services/location',
          '@ride': './src/services/ride',
          '@socket': './src/services/socket',
          '@realtime': './src/services/realtime',
          '@payment': './src/services/payment',
          '@notification': './src/services/notification',
          '@document': './src/services/document',
          '@map': './src/services/map',
          '@chat': './src/services/chat',
          '@emergency': './src/services/emergency',
          '@rating': './src/services/rating',
          
          // Navigation aliases
          '@nav': './navigation',
          '@stacks': './navigation/stacks',
          '@tabs': './navigation/tabs',
          '@drawer': './navigation/drawer',
        },
      },
    ],
    
    // React Native Reanimated (must be last)
    'react-native-reanimated/plugin',
  ],
  
  env: {
    production: {
      plugins: [
        'transform-remove-console',
      ],
    },
    development: {
      plugins: [
        // Add development-only plugins here
      ],
    },
    test: {
      plugins: [
        '@babel/plugin-transform-typescript',
        ['@babel/plugin-transform-class-properties', { loose: true }],
        ['@babel/plugin-transform-private-methods', { loose: true }],
        [
          'module-resolver',
          {
            root: ['./'],
            extensions: ['.js', '.jsx', '.ts', '.tsx'],
            alias: {
              '@src': './src',
              '@components': './src/components',
              '@constants': './src/constants',
              '@hooks': './src/hooks',
              '@services': './src/services',
              '@store': './src/store',
              '@utils': './src/utils',
            },
          },
        ],
      ],
    },
  },
};