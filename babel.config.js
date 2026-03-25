module.exports = {
  presets: ['module:@react-native/babel-preset'],
  
  plugins: [
    ['module:react-native-dotenv', {
      moduleName: '@env',
      path: '.env',
      safe: false,
      allowUndefined: true,
      verbose: false,
      // Add these options to prevent looking for other .env files
      allowEmptyValues: true,
      systemvars: false,
    }],
    
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
          '.json',
          '.native.js'
        ],
        
        alias: {
          '@src': './src',
          '@components': './src/components',
          '@constants': './src/constants',
          '@hooks': './src/hooks',
          '@services': './src/services',
          '@store': './src/store',
          '@utils': './src/utils',
          '@config': './src/config',
          crypto: 'react-native-crypto',
          '@context': './src/context',
          '@navigation': './navigation',
          '@screens': './screens',
          '@assets': './assets',
          '@screens/auth': './screens/auth',
          '@screens/common': './screens/common',
          '@screens/driver': './screens/driver',
          '@screens/rider': './screens/rider',
          '@screens/payments': './screens/payments',
          '@screens/MapScreen': './screens/MapScreen',
          '@screens/profile': './screens/profile',
          '@auth': './screens/auth',
          '@driver': './screens/driver',
          '@rider': './screens/rider',
          '@payments': './screens/payments',
          '@common': './screens/common',
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
          '@nav': './navigation',
          '@stacks': './navigation/stacks',
          '@tabs': './navigation/tabs',
          '@drawer': './navigation/drawer',
        },
      },
    ],
    
    'react-native-reanimated/plugin',
  ],
  
  env: {
    production: {
      plugins: ['transform-remove-console'],
    },
  },
};