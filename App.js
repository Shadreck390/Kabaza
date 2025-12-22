// App.js
import 'react-native-gesture-handler';
import 'react-native-reanimated';
import React, { useEffect, useState } from 'react';
import { View, Image, Text, StyleSheet, LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';

// Store
import { store, persistor } from '@store';
import AppNavigator from '@navigation/AppNavigator';

// Ignore specific warnings (optional)
LogBox.ignoreLogs([
  'Require cycle:',
  'Non-serializable values were found in the navigation state',
  'Sending `onAnimatedValueUpdate` with no listeners registered',
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

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 App initialization started...');
        
        // Simulate any necessary initialization (fonts, etc.)
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setAppIsReady(true);
        console.log('✅ App initialization complete');
        
      } catch (error) {
        console.error('❌ App initialization failed:', error);
        setAppIsReady(true); // Still proceed to app even if init fails
      }
    };

    initializeApp();
  }, []);

  // Show initial splash while React Native/JS is loading
  if (!appIsReady) {
    return (
      <GestureHandlerRootView style={styles.container}>
        <InitialSplash />
      </GestureHandlerRootView>
    );
  }

  // Main app with Redux and Navigation
  return (
    <GestureHandlerRootView style={styles.container}>
      <Provider store={store}>
        <PersistGate 
          loading={<Loading />} 
          persistor={persistor}
        >
          {/* 
            IMPORTANT: AppNavigator already contains NavigationContainer
            and handles ALL navigation logic including:
            - Splash screen
            - Auth flow  
            - Rider/Driver navigation
            - User state management
          */}
          <AppNavigator />
        </PersistGate>
      </Provider>
    </GestureHandlerRootView>
  );
}