import 'react-native-gesture-handler';
import 'react-native-reanimated';
import SplashScreen from 'react-native-splash-screen';
import React, { useEffect, useState } from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './src/store';
import AppNavigator from './navigation/AppNavigator';

// Fallback Loading component
const Loading = ({ message }) => (
  <View style={styles.loadingFallback}>
    <Text style={styles.loadingText}>{message || 'Loading...'}</Text>
  </View>
);

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const initApp = async () => {
      try {
        console.log('🚀 Initializing app...');
        
        // Simulate initialization delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Hide splash screen
        SplashScreen.hide();
        
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
      <GestureHandlerRootView style={styles.splash}>
        <Image 
          source={require('./assets/kabaza_logo.png')} 
          style={styles.logo} 
        />
        <Text style={styles.title}>Kabaza</Text>
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

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  logo: { 
    width: 150, 
    height: 150, 
    marginBottom: 20,
    resizeMode: 'contain'
  },
  title: { 
    fontSize: 32, 
    fontWeight: '700', 
    color: '#212121' 
  },
});