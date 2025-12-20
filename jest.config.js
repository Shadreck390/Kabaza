module.exports = {
  preset: 'react-native',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  
  // Add this for module resolution with aliases - UPDATED FOR KABAZA STRUCTURE
  moduleNameMapper: {
    // Core aliases
    '^@src/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@store/(.*)$': '<rootDir>/src/store/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@constants/(.*)$': '<rootDir>/src/constants/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@context/(.*)$': '<rootDir>/src/context/$1',
    
    // Screen module aliases (from your folder structure)
    '^@screens/(.*)$': '<rootDir>/screens/$1',
    '^@screens/auth/(.*)$': '<rootDir>/screens/auth/$1',
    '^@screens/common/(.*)$': '<rootDir>/screens/common/$1',
    '^@screens/driver/(.*)$': '<rootDir>/screens/driver/$1',
    '^@screens/rider/(.*)$': '<rootDir>/screens/rider/$1',
    '^@screens/payments/(.*)$': '<rootDir>/screens/payments/$1',
    '^@screens/MapScreen/(.*)$': '<rootDir>/screens/MapScreen/$1',
    '^@screens/profile/(.*)$': '<rootDir>/screens/profile/$1',
    
    // Feature aliases
    '^@auth/(.*)$': '<rootDir>/screens/auth/$1',
    '^@driver/(.*)$': '<rootDir>/screens/driver/$1',
    '^@rider/(.*)$': '<rootDir>/screens/rider/$1',
    '^@payments/(.*)$': '<rootDir>/screens/payments/$1',
    '^@common/(.*)$': '<rootDir>/screens/common/$1',
    
    // Navigation aliases
    '^@navigation/(.*)$': '<rootDir>/navigation/$1',
    '^@nav/(.*)$': '<rootDir>/navigation/$1',
    '^@stacks/(.*)$': '<rootDir>/navigation/stacks/$1',
    '^@tabs/(.*)$': '<rootDir>/navigation/tabs/$1',
    '^@drawer/(.*)$': '<rootDir>/navigation/drawer/$1',
    
    // Service aliases
    '^@api/(.*)$': '<rootDir>/src/services/api/$1',
    '^@location/(.*)$': '<rootDir>/src/services/location/$1',
    '^@ride/(.*)$': '<rootDir>/src/services/ride/$1',
    '^@socket/(.*)$': '<rootDir>/src/services/socket/$1',
    '^@realtime/(.*)$': '<rootDir>/src/services/realtime/$1',
    '^@payment/(.*)$': '<rootDir>/src/services/payment/$1',
    '^@notification/(.*)$': '<rootDir>/src/services/notification/$1',
    '^@document/(.*)$': '<rootDir>/src/services/document/$1',
    '^@map/(.*)$': '<rootDir>/src/services/map/$1',
    '^@chat/(.*)$': '<rootDir>/src/services/chat/$1',
    '^@emergency/(.*)$': '<rootDir>/src/services/emergency/$1',
    '^@rating/(.*)$': '<rootDir>/src/services/rating/$1',
    
    // Assets
    '^@assets/(.*)$': '<rootDir>/assets/$1',
    
    // Image and asset mocks
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/__mocks__/fileMock.js',
    '\\.(css|less)$': '<rootDir>/__mocks__/styleMock.js',
  },
  
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-.*|@react-navigation|@react-native-community|@react-native-async-storage|react-native-vector-icons|react-native-paper|react-native-maps|react-native-svg|react-native-reanimated)/)'
  ],
  
  setupFilesAfterEnv: [
    '@testing-library/jest-native/extend-expect',
    './jest.setup.js'
  ],
  
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    'screens/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{js,jsx,ts,tsx}',
    '!src/**/*.spec.{js,jsx,ts,tsx}',
    '!screens/**/*.test.{js,jsx,ts,tsx}',
    '!screens/**/*.spec.{js,jsx,ts,tsx}'
  ],
  
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
  },
  
  testPathIgnorePatterns: [
    '/node_modules/',
    '/e2e/',
    '/android/',
    '/ios/',
    '/coverage/'
  ],
  
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/',
    '/__mocks__/',
    '/e2e/',
    'src/services/api/mocks/',
    'src/store/slices/__tests__/'
  ],
  
  // Test environment setup
  testEnvironment: 'node',
  
  // Coverage thresholds (adjust as needed)
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  // Watch plugins for better test watching
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Test match patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.{spec,test}.{js,jsx,ts,tsx}',
    '<rootDir>/screens/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/screens/**/*.{spec,test}.{js,jsx,ts,tsx}'
  ]
};