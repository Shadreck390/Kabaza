// App.js - SECURE VERSION
import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { 
  View, 
  Image, 
  Text, 
  StyleSheet, 
  LogBox, 
  StatusBar,
  ActivityIndicator,
  TouchableOpacity 
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';

// ======================
// SAFE FIREBASE INITIALIZATION (No Hardcoded Keys)
// ======================

const initializeFirebase = async () => {
  try {
    const firebaseApp = require('@react-native-firebase/app').default;
    
    if (!firebaseApp.apps.length) {
      // CRITICAL: Get config from environment variables
      const Config = require('react-native-config');
      
      const firebaseConfig = {
        apiKey: Config.FIREBASE_API_KEY || '', // Will be empty if not set
        authDomain: Config.FIREBASE_AUTH_DOMAIN || '',
        projectId: Config.FIREBASE_PROJECT_ID || '',
        storageBucket: Config.FIREBASE_STORAGE_BUCKET || '',
        messagingSenderId: Config.FIREBASE_MESSAGING_SENDER_ID || '',
        appId: Config.FIREBASE_APP_ID || '',
        measurementId: Config.FIREBASE_MEASUREMENT_ID || ''
      };
      
      // Only initialize if we have at least apiKey
      if (firebaseConfig.apiKey) {
        firebaseApp.initializeApp(firebaseConfig);
        console.log('✅ Firebase initialized successfully');
        return { success: true, firebase: firebaseApp };
      } else {
        console.log('⚠️ Firebase not configured - running without it');
        return { success: false, message: 'Firebase API key not found' };
      }
    } else {
      console.log('✅ Firebase already initialized');
      return { success: true, firebase: firebaseApp };
    }
  } catch (error) {
    console.warn('⚠️ Firebase initialization error:', error.message);
    return { success: false, error: error.message };
  }
};

// ======================
// SAFE CONFIG LOADING
// ======================

const loadConfig = async () => {
  try {
    const Config = require('react-native-config');
    
    return {
      // These will come from .env file (not in git)
      GOOGLE_MAPS_API_KEY: Config.GOOGLE_MAPS_API_KEY || '',
      API_BASE_URL: Config.API_BASE_URL || 'http://localhost:3000',
      ENVIRONMENT: Config.ENVIRONMENT || 'development',
      DEBUG: Config.DEBUG === 'true',
      
      // Firebase config from .env
      FIREBASE_API_KEY: Config.FIREBASE_API_KEY || '',
      FIREBASE_AUTH_DOMAIN: Config.FIREBASE_AUTH_DOMAIN || '',
      FIREBASE_PROJECT_ID: Config.FIREBASE_PROJECT_ID || '',
      FIREBASE_STORAGE_BUCKET: Config.FIREBASE_STORAGE_BUCKET || '',
      FIREBASE_MESSAGING_SENDER_ID: Config.FIREBASE_MESSAGING_SENDER_ID || '',
      FIREBASE_APP_ID: Config.FIREBASE_APP_ID || '',
      FIREBASE_MEASUREMENT_ID: Config.FIREBASE_MEASUREMENT_ID || '',
      
      success: true
    };
  } catch (error) {
    console.warn('⚠️ Config not loaded:', error.message);
    return {
      GOOGLE_MAPS_API_KEY: '',
      API_BASE_URL: 'http://localhost:3000',
      ENVIRONMENT: 'development',
      DEBUG: true,
      success: false
    };
  }
};

// ======================
// IGNORE WARNINGS
// ======================
LogBox.ignoreLogs([
  'Require cycle:',
  'Non-serializable values were found in the navigation state',
]);

// ======================
// STYLES
// ======================

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  logo: { 
    width: 150, 
    height: 150, 
    marginBottom: 20,
    resizeMode: 'contain',
  },
  loadingText: {
    fontSize: 16,
    color: '#4F46E5',
    marginTop: 10,
  },
});

// ======================
// LOADING COMPONENT
// ======================

const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <Image 
      source={require('./assets/kabaza_logo.png')} 
      style={styles.logo} 
    />
    <ActivityIndicator size="large" color="#4F46E5" />
    <Text style={styles.loadingText}>Starting Kabaza...</Text>
  </View>
);

// ======================
// MAIN APP COMPONENT
// ======================

export default function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 Initializing app...');
        
        // Load config from .env (safe)
        const config = await loadConfig();
        console.log('✅ Environment:', config.ENVIRONMENT);
        
        // Initialize Firebase if configured
        if (config.FIREBASE_API_KEY) {
          await initializeFirebase();
        } else {
          console.log('ℹ️ Running without Firebase');
        }
        
        // Load store (delayed import)
        const storeModule = require('@store');
        
      } catch (error) {
        console.error('❌ App initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  if (isLoading) {
    return (
      <SafeAreaProvider>
        <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />
        <LoadingScreen />
      </SafeAreaProvider>
    );
  }

  // Delayed imports for store and navigation
  const { store, persistor } = require('@store');
  const AppNavigator = require('./navigation/AppNavigator').default;

  return (
    <SafeAreaProvider>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />
      <GestureHandlerRootView style={styles.container}>
        <Provider store={store}>
          <PersistGate loading={<LoadingScreen />} persistor={persistor}>
            <AppNavigator />
          </PersistGate>
        </Provider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}