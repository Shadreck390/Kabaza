// src/store/sagas/paymentSaga.js
import { call, put, takeLatest, takeEvery, all, fork } from 'redux-saga/effects';
import { Alert } from 'react-native';

// Mock services
const PaymentService = {
  processPayment: async (paymentData) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, transactionId: 'txn_' + Date.now() });
      }, 2000);
    });
  },
  
  addPaymentMethod: async (method) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, method });
      }, 1000);
    });
  },
};

// Worker sagas
function* processPaymentWorker(action) {
  try {
    const paymentData = action.payload;
    const response = yield call(PaymentService.processPayment, paymentData);
    yield put({ type: 'payment/paymentSuccess', payload: response });
    Alert.alert('Success', 'Payment processed successfully');
  } catch (error) {
    yield put({ type: 'payment/paymentFailed', payload: error.message });
    Alert.alert('Error', 'Payment failed');
  }
}

// Watcher sagas
function* watchProcessPayment() {
  yield takeLatest('payment/processPaymentRequest', processPaymentWorker);
}

// Root saga
export default function* paymentSaga() {
  yield all([
    fork(watchProcessPayment),
  ]);
}