// src/config/firebase.js
import { Platform } from 'react-native';
import firebase from '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import messaging from '@react-native-firebase/messaging';

// Your Firebase config - get from Firebase Console
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};

// Initialize Firebase only if not already initialized
let firebaseApp;
try {
  if (!firebase.apps.length) {
    firebaseApp = firebase.initializeApp(firebaseConfig);
    console.log('Firebase initialized successfully');
  } else {
    firebaseApp = firebase.app();
    console.log('Firebase already initialized');
  }
} catch (error) {
  console.error('Firebase initialization error:', error);
}

// Optional: Set Firestore settings
firestore().settings({
  persistence: true,
  cacheSizeBytes: firestore.CACHE_SIZE_UNLIMITED
});

// Optional: Disable analytics in development
if (__DEV__) {
  firebase.analytics().setAnalyticsCollectionEnabled(false);
}

export { firebase, firebaseApp, auth, firestore, storage, messaging };