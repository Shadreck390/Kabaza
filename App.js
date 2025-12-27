// App.js - FIXED WITH EXPO MODULES SUPPORT
import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { View, Image, Text, StyleSheet, LogBox, StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Store
import { store, persistor } from '@store';

// CORRECT IMPORT - Your AppNavigator is in ./navigation/ folder
import AppNavigator from './navigation/AppNavigator';

// Ignore specific warnings (optional)
LogBox.ignoreLogs([
  'Require cycle:',
  'Non-serializable values were found in the navigation state',
  'Sending `onAnimatedValueUpdate` with no listeners registered',
  'The "EXNativeModulesProxy" native module is not exported',
  'The global process.env.EXPO_OS is not defined',
]);

// ======================
// STYLE SHEETS
// ======================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  text: {
    fontSize: 16,
    color: '#4F46E5',
    marginTop: 10,
  },
  splashContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { 
    width: 150, 
    height: 150, 
    marginBottom: 20,
    resizeMode: 'contain',
  },
  title: { 
    fontSize: 32, 
    fontWeight: '700', 
    color: '#212121', 
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    marginTop: 20,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});

// ======================
// COMPONENTS
// ======================

const Loading = () => (
  <View style={styles.fallback}>
    <Image 
      source={require('./assets/kabaza_logo.png')} 
      style={styles.logo} 
    />
    <Text style={styles.text}>Initializing Kabaza...</Text>
  </View>
);

const InitialSplash = () => (
  <View style={styles.splashContainer}>
    <Image 
      source={require('./assets/kabaza_logo.png')} 
      style={styles.logo} 
    />
    <Text style={styles.title}>Kabaza</Text>
  </View>
);

// ======================
// MAIN APP COMPONENT
// ======================

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 App initialization started...');
        
        // ✅ VALIDATE CONFIG AFTER REACT NATIVE IS READY
        try {
          const AppConfig = require('./src/config').default;
          const validationResult = AppConfig.validate();
          if (AppConfig.ENV?.DEBUG) {
            AppConfig.logConfig();
          }
          console.log('✅ Config validated and loaded');
        } catch (configError) {
          console.warn('⚠️ Config validation error:', configError);
        }
        
        // IMPORTANT: Initialize Expo modules if they exist
        // This prevents the "Cannot find native module 'FileSystem'" error
        try {
          // Optional: Check if we can access Expo modules
          const { Platform } = require('react-native');
          if (Platform.OS !== 'web') {
            // Try to require expo modules (don't import at top level)
            require('expo-modules-core');
            console.log('✅ Expo modules initialized');
          }
        } catch (expoError) {
          console.log('⚠️ Expo modules not available, continuing without them');
        }
        
        // Simulate any necessary initialization (fonts, etc.)
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log('✅ App initialization complete');
        setAppIsReady(true);
        
      } catch (error) {
        console.error('❌ App initialization failed:', error);
        setErrorMessage(error.message);
        setHasError(true);
        setAppIsReady(true); // Still proceed to app even if init fails
      }
    };

    initializeApp();
  }, []);

  // Show initial splash while React Native/JS is loading
  if (!appIsReady) {
    return (
      <SafeAreaProvider>
        <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />
        <GestureHandlerRootView style={styles.container}>
          <InitialSplash />
        </GestureHandlerRootView>
      </SafeAreaProvider>
    );
  }

  // Show error screen if initialization failed
  if (hasError) {
    return (
      <SafeAreaProvider>
        <StatusBar backgroundColor="#DC2626" barStyle="light-content" />
        <GestureHandlerRootView style={styles.container}>
          <View style={styles.fallback}>
            <Image 
              source={require('./assets/kabaza_logo.png')} 
              style={styles.logo} 
            />
            <Text style={[styles.text, { color: '#DC2626' }]}>
              App Initialization Error
            </Text>
            <Text style={styles.errorText}>
              {errorMessage || 'Missing module: FileSystem'}
            </Text>
            <Text style={[styles.text, { marginTop: 20, fontSize: 14 }]}>
              Check if expo-file-system is installed
            </Text>
          </View>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    );
  }

  // Main app with Redux and Navigation
  return (
    <SafeAreaProvider>
      <StatusBar backgroundColor="#4F46E5" barStyle="light-content" />
      <GestureHandlerRootView style={styles.container}>
        <Provider store={store}>
          <PersistGate 
            loading={<Loading />} 
            persistor={persistor}
          >
            <AppNavigator />
          </PersistGate>
        </Provider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}