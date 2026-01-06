// src/config/firebase.js - CORRECT VERSION FOR REACT NATIVE
import { Platform } from 'react-native';
import firebase from '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import messaging from '@react-native-firebase/messaging';

// Initialize Firebase only if not already initialized
let firebaseApp;
try {
  if (!firebase.apps.length) {
    // NO CONFIG NEEDED - React Native Firebase reads from google-services.json
    firebaseApp = firebase.initializeApp();
    console.log('✅ Firebase initialized successfully (using google-services.json)');
  } else {
    firebaseApp = firebase.app();
    console.log('✅ Firebase already initialized');
  }
} catch (error) {
  console.error('❌ Firebase initialization error:', error.message);
  
  // If Firebase fails, you can still run the app without it
  console.log('⚠️ App will run without Firebase features');
}

// Optional: Set Firestore settings
try {
  firestore().settings({
    persistence: true,
    cacheSizeBytes: firestore.CACHE_SIZE_UNLIMITED
  });
} catch (error) {
  console.warn('Firestore settings error:', error.message);
}

// Optional: Disable analytics in development
if (__DEV__) {
  try {
    firebase.analytics().setAnalyticsCollectionEnabled(false);
  } catch (error) {
    console.warn('Analytics disable error:', error.message);
  }
}

export { 
  firebase, 
  firebaseApp, 
  auth, 
  firestore, 
  storage, 
  messaging 
};