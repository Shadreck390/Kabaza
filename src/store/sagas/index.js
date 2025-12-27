// src/store/sagas/index.js - ROOT SAGA
import { all, fork } from 'redux-saga/effects';

// Import all your sagas
import authSaga from './authSaga';
import chatSaga from './chatSaga';
import driverSaga from './driverSaga';
import locationSaga from './locationSaga';
import notificationSaga from './notificationSaga';
import paymentSaga from './paymentSaga';
import rideSaga from './rideSaga';
import socketSaga from './socketSaga';

// Root saga that combines all sagas
export default function* rootSaga() {
  try {
    console.log('🚀 Root saga initializing...');
    
    // Fork all sagas in parallel
    yield all([
      fork(authSaga),
      fork(chatSaga),
      fork(driverSaga),
      fork(locationSaga),
      fork(notificationSaga),
      fork(paymentSaga),
      fork(rideSaga),
      fork(socketSaga),
    ]);
    
    console.log('✅ All sagas started successfully');
  } catch (error) {
    console.error('❌ Root saga initialization error:', error);
  }
}