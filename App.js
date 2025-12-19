import 'react-native-gesture-handler';
import 'react-native-reanimated';
import RNBootSplash from "react-native-bootsplash";
import React, { useEffect, useState } from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './src/store';
import AppNavigator from './navigation/AppNavigator';

// ======================
// STYLE SHEETS
// ======================

// Loading component styles (used early in file)
const loadingStyles = StyleSheet.create({
  fallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  text: {
    fontSize: 16,
    color: '#666',
  },
});

// Splash screen styles (used early in file)
const splashStyles = StyleSheet.create({
  container: {
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
// COMPONENTS (DEFINE BEFORE APP)
// ======================

// Fallback Loading component - MUST BE BEFORE App!
const Loading = ({ message }) => (
  <View style={loadingStyles.fallback}>
    <Text style={loadingStyles.text}>{message || 'Loading...'}</Text>
  </View>
);

// ======================
// MAIN APP COMPONENT
// ======================

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const initApp = async () => {
      try {
        console.log('🚀 Initializing app...');
        
        // Simulate initialization delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Hide splash screen using bootsplash
        RNBootSplash.hide({ fade: true });
        
        setReady(true);
        console.log('✅ App ready');
        
      } catch (e) {
        console.error('❌ App initialization failed:', e);
        setReady(true); // Still proceed
      }
    };

    initApp();
  }, []);

  // Show splash screen while loading
  if (!ready) {
    return (
      <GestureHandlerRootView style={splashStyles.container}>
        <Image 
          source={require('./assets/kabaza_logo.png')} 
          style={splashStyles.logo} 
        />
        <Text style={splashStyles.title}>Kabaza</Text>
      </GestureHandlerRootView>
    );
  }

  // Main app with Redux
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <PersistGate 
          loading={<Loading message="Loading Kabaza..." />} 
          persistor={persistor}
        >
          <AppNavigator />
        </PersistGate>
      </Provider>
    </GestureHandlerRootView>
  );
}