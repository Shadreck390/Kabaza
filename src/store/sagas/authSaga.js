// src/store/sagas/authSaga.js
import { call, put, takeLatest, takeEvery, all, fork } from 'redux-saga/effects';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

// FIXED IMPORT - using alias:
import {
  loginSuccess,
  loginFailure,
  registerSuccess,
  registerFailure,
  logoutSuccess,
  logoutFailure,
  updateProfileSuccess,
  updateProfileFailure,
  verifyPhoneSuccess,
  verifyPhoneFailure,
  resetPasswordSuccess,
  resetPasswordFailure,
} from '@store/slices/authSlice';

// Mock API service - replace with your actual API calls
const AuthService = {
  login: async (email, password) => {
    // Replace with actual API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          user: {
            id: '1',
            email,
            name: 'John Doe',
            phone: '+265881234567',
            role: 'user',
            avatar: null,
            isVerified: true,
          },
          token: 'mock-jwt-token',
          refreshToken: 'mock-refresh-token',
        });
      }, 1000);
    });
  },
  
  register: async (userData) => {
    // Replace with actual API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          user: {
            id: '1',
            ...userData,
            role: 'user',
            isVerified: false,
          },
          token: 'mock-jwt-token',
          message: 'Registration successful. Please verify your phone.',
        });
      }, 1000);
    });
  },
  
  verifyPhone: async (phone, code) => {
    // Replace with actual API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          message: 'Phone verified successfully',
        });
      }, 1000);
    });
  },
  
  resetPassword: async (email, newPassword) => {
    // Replace with actual API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          message: 'Password reset successful',
        });
      }, 1000);
    });
  },
  
  updateProfile: async (userId, profileData) => {
    // Replace with actual API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          user: profileData,
          message: 'Profile updated successfully',
        });
      }, 1000);
    });
  },
};

// Worker sagas
function* loginWorker(action) {
  try {
    const { email, password } = action.payload;
    const response = yield call(AuthService.login, email, password);
    
    // Store tokens
    yield call([AsyncStorage, 'setItem'], 'auth_token', response.token);
    yield call([AsyncStorage, 'setItem'], 'refresh_token', response.refreshToken);
    yield call([AsyncStorage, 'setItem'], 'user', JSON.stringify(response.user));
    
    yield put(loginSuccess(response));
    
    // Show success message
    Alert.alert('Success', 'Logged in successfully');
  } catch (error) {
    yield put(loginFailure(error.message));
    Alert.alert('Error', error.message || 'Login failed');
  }
}

function* registerWorker(action) {
  try {
    const userData = action.payload;
    const response = yield call(AuthService.register, userData);
    
    // Store tokens
    if (response.token) {
      yield call([AsyncStorage, 'setItem'], 'auth_token', response.token);
      yield call([AsyncStorage, 'setItem'], 'user', JSON.stringify(response.user));
    }
    
    yield put(registerSuccess(response));
    
    Alert.alert('Success', response.message || 'Registration successful');
  } catch (error) {
    yield put(registerFailure(error.message));
    Alert.alert('Error', error.message || 'Registration failed');
  }
}

function* logoutWorker() {
  try {
    // Clear storage
    yield call([AsyncStorage, 'removeItem'], 'auth_token');
    yield call([AsyncStorage, 'removeItem'], 'refresh_token');
    yield call([AsyncStorage, 'removeItem'], 'user');
    
    yield put(logoutSuccess());
    
    // Navigate to login screen (you'll handle navigation elsewhere)
  } catch (error) {
    yield put(logoutFailure(error.message));
    Alert.alert('Error', 'Logout failed');
  }
}

function* verifyPhoneWorker(action) {
  try {
    const { phone, code } = action.payload;
    const response = yield call(AuthService.verifyPhone, phone, code);
    
    yield put(verifyPhoneSuccess(response));
    
    Alert.alert('Success', response.message);
  } catch (error) {
    yield put(verifyPhoneFailure(error.message));
    Alert.alert('Error', error.message || 'Verification failed');
  }
}

function* resetPasswordWorker(action) {
  try {
    const { email, newPassword } = action.payload;
    const response = yield call(AuthService.resetPassword, email, newPassword);
    
    yield put(resetPasswordSuccess(response));
    
    Alert.alert('Success', response.message);
  } catch (error) {
    yield put(resetPasswordFailure(error.message));
    Alert.alert('Error', error.message || 'Password reset failed');
  }
}

function* updateProfileWorker(action) {
  try {
    const { userId, profileData } = action.payload;
    const response = yield call(AuthService.updateProfile, userId, profileData);
    
    // Update stored user data
    const storedUser = yield call([AsyncStorage, 'getItem'], 'user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      const updatedUser = { ...user, ...response.user };
      yield call([AsyncStorage, 'setItem'], 'user', JSON.stringify(updatedUser));
    }
    
    yield put(updateProfileSuccess(response));
    
    Alert.alert('Success', response.message);
  } catch (error) {
    yield put(updateProfileFailure(error.message));
    Alert.alert('Error', error.message || 'Profile update failed');
  }
}

// Watcher sagas
function* watchLogin() {
  yield takeLatest('auth/loginRequest', loginWorker);
}

function* watchRegister() {
  yield takeLatest('auth/registerRequest', registerWorker);
}

function* watchLogout() {
  yield takeLatest('auth/logoutRequest', logoutWorker);
}

function* watchVerifyPhone() {
  yield takeLatest('auth/verifyPhoneRequest', verifyPhoneWorker);
}

function* watchResetPassword() {
  yield takeLatest('auth/resetPasswordRequest', resetPasswordWorker);
}

function* watchUpdateProfile() {
  yield takeLatest('auth/updateProfileRequest', updateProfileWorker);
}

// Root saga
export default function* authSaga() {
  yield all([
    fork(watchLogin),
    fork(watchRegister),
    fork(watchLogout),
    fork(watchVerifyPhone),
    fork(watchResetPassword),
    fork(watchUpdateProfile),
  ]);
}