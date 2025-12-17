module.exports = {
  preset: 'react-native',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  
  // Add this for module resolution with aliases
  moduleNameMapper: {
    '^@src/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@store/(.*)$': '<rootDir>/src/store/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@constants/(.*)$': '<rootDir>/src/constants/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^screens/(.*)$': '<rootDir>/screens/$1',
    '^navigation/(.*)$': '<rootDir>/navigation/$1',
    '^assets/(.*)$': '<rootDir>/assets/$1',
    '^src/(.*)$': '<rootDir>/src/$1',
  },
  
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-.*|@react-navigation|@react-native-community)/)'
  ],
  
  setupFilesAfterEnv: [
    '@testing-library/jest-native/extend-expect',
    './jest.setup.js'  // Optional: create this for global test setup
  ],
  
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{js,jsx,ts,tsx}',
    '!src/**/*.spec.{js,jsx,ts,tsx}'
  ],
  
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
  },
  
  // Add these for better test performance
  testPathIgnorePatterns: ['/node_modules/', '/e2e/'],
  coveragePathIgnorePatterns: ['/node_modules/'],
  
  // For TypeScript support
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.test.json'  // Optional: if you create separate test config
    }
  }
};