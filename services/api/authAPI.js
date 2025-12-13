// services/api/authAPI.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// API Configuration
const API_CONFIG = {
  BASE_URL: Platform.select({
    ios: 'http://localhost:3000/api',
    android: 'http://10.0.2.2:3000/api',
    default: 'https://api.kabaza.mw/api' // Production URL
  }),
  TIMEOUT: 30000,
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
};

// Create axios instance
const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: API_CONFIG.HEADERS,
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Handle token expiration (401)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh token
        const refreshToken = await AsyncStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await api.post('/auth/refresh', { refreshToken });
          const { token, refreshToken: newRefreshToken } = response.data;
          
          await AsyncStorage.setItem('auth_token', token);
          await AsyncStorage.setItem('refresh_token', newRefreshToken);
          
          // Retry original request
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        // Clear tokens and redirect to login
        await AsyncStorage.multiRemove(['auth_token', 'refresh_token', 'user_data']);
      }
    }
    
    return Promise.reject(error);
  }
);

/**
 * Authentication API Service
 * Handles all authentication-related API calls
 */
class AuthAPI {
  /**
   * User Registration
   * @param {Object} userData - User registration data
   * @returns {Promise} - Registration response
   */
  static register = async (userData) => {
    try {
      console.log('📝 Registering user:', { 
        phone: userData.phone, 
        type: userData.userType 
      });
      
      const response = await api.post('/auth/register', userData);
      
      console.log('✅ Registration successful:', response.data);
      return {
        success: true,
        data: response.data,
        message: 'Registration successful'
      };
    } catch (error) {
      console.error('❌ Registration failed:', error.response?.data || error.message);
      return this.handleError(error, 'Registration failed');
    }
  };

  /**
   * User Login
   * @param {String} phone - User phone number
   * @param {String} password - User password
   * @param {String} userType - 'rider' or 'driver'
   * @returns {Promise} - Login response
   */
  static login = async (phone, password, userType = 'rider') => {
    try {
      console.log('🔐 Attempting login:', { phone, userType });
      
      const response = await api.post('/auth/login', {
        phone,
        password,
        userType
      });
      
      const { token, refreshToken, user } = response.data;
      
      // Store tokens and user data
      await AsyncStorage.multiSet([
        ['auth_token', token],
        ['refresh_token', refreshToken],
        ['user_data', JSON.stringify(user)]
      ]);
      
      console.log('✅ Login successful for user:', user.id);
      return {
        success: true,
        data: response.data,
        user,
        message: 'Login successful'
      };
    } catch (error) {
      console.error('❌ Login failed:', error.response?.data || error.message);
      return this.handleError(error, 'Login failed');
    }
  };

  /**
   * Phone OTP Login (One-time password)
   * @param {String} phone - User phone number
   * @returns {Promise} - OTP request response
   */
  static requestOTP = async (phone) => {
    try {
      console.log('📱 Requesting OTP for:', phone);
      
      const response = await api.post('/auth/request-otp', { phone });
      
      console.log('✅ OTP requested successfully');
      return {
        success: true,
        data: response.data,
        message: 'OTP sent successfully'
      };
    } catch (error) {
      console.error('❌ OTP request failed:', error.response?.data || error.message);
      return this.handleError(error, 'Failed to send OTP');
    }
  };

  /**
   * Verify OTP
   * @param {String} phone - User phone number
   * @param {String} otp - OTP code
   * @returns {Promise} - OTP verification response
   */
  static verifyOTP = async (phone, otp) => {
    try {
      console.log('🔢 Verifying OTP:', { phone, otpLength: otp?.length });
      
      const response = await api.post('/auth/verify-otp', {
        phone,
        otp
      });
      
      const { token, refreshToken, user, requiresProfileCompletion } = response.data;
      
      // Store tokens and user data
      await AsyncStorage.multiSet([
        ['auth_token', token],
        ['refresh_token', refreshToken],
        ['user_data', JSON.stringify(user)]
      ]);
      
      console.log('✅ OTP verified successfully');
      return {
        success: true,
        data: response.data,
        user,
        requiresProfileCompletion,
        message: 'OTP verified successfully'
      };
    } catch (error) {
      console.error('❌ OTP verification failed:', error.response?.data || error.message);
      return this.handleError(error, 'Invalid OTP');
    }
  };

  /**
   * Resend OTP
   * @param {String} phone - User phone number
   * @returns {Promise} - OTP resend response
   */
  static resendOTP = async (phone) => {
    try {
      console.log('🔄 Resending OTP for:', phone);
      
      const response = await api.post('/auth/resend-otp', { phone });
      
      console.log('✅ OTP resent successfully');
      return {
        success: true,
        data: response.data,
        message: 'OTP resent successfully'
      };
    } catch (error) {
      console.error('❌ OTP resend failed:', error.response?.data || error.message);
      return this.handleError(error, 'Failed to resend OTP');
    }
  };

  /**
   * Get Current User Profile
   * @returns {Promise} - User profile data
   */
  static getProfile = async () => {
    try {
      console.log('👤 Fetching user profile');
      
      const response = await api.get('/auth/profile');
      
      console.log('✅ Profile fetched successfully');
      return {
        success: true,
        data: response.data,
        user: response.data.user,
        message: 'Profile fetched successfully'
      };
    } catch (error) {
      console.error('❌ Profile fetch failed:', error.response?.data || error.message);
      return this.handleError(error, 'Failed to fetch profile');
    }
  };

  /**
   * Update User Profile
   * @param {Object} profileData - Updated profile data
   * @returns {Promise} - Update response
   */
  static updateProfile = async (profileData) => {
    try {
      console.log('📝 Updating profile:', Object.keys(profileData));
      
      const response = await api.put('/auth/profile', profileData);
      
      // Update stored user data
      const userData = JSON.parse(await AsyncStorage.getItem('user_data') || '{}');
      const updatedUser = { ...userData, ...profileData };
      await AsyncStorage.setItem('user_data', JSON.stringify(updatedUser));
      
      console.log('✅ Profile updated successfully');
      return {
        success: true,
        data: response.data,
        user: updatedUser,
        message: 'Profile updated successfully'
      };
    } catch (error) {
      console.error('❌ Profile update failed:', error.response?.data || error.message);
      return this.handleError(error, 'Failed to update profile');
    }
  };

  /**
   * Upload Profile Picture
   * @param {FormData} formData - Image form data
   * @returns {Promise} - Upload response
   */
  static uploadProfilePicture = async (formData) => {
    try {
      console.log('🖼️ Uploading profile picture');
      
      const response = await api.post('/auth/upload-profile-picture', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // Update stored user data with new photo URL
      const userData = JSON.parse(await AsyncStorage.getItem('user_data') || '{}');
      userData.profilePhoto = response.data.profilePhoto;
      await AsyncStorage.setItem('user_data', JSON.stringify(userData));
      
      console.log('✅ Profile picture uploaded successfully');
      return {
        success: true,
        data: response.data,
        user: userData,
        message: 'Profile picture updated successfully'
      };
    } catch (error) {
      console.error('❌ Profile picture upload failed:', error.response?.data || error.message);
      return this.handleError(error, 'Failed to upload profile picture');
    }
  };

  /**
   * Driver Registration (Extended)
   * @param {Object} driverData - Driver-specific registration data
   * @returns {Promise} - Driver registration response
   */
  static registerDriver = async (driverData) => {
    try {
      console.log('🚗 Registering driver:', {
        phone: driverData.phone,
        vehicleType: driverData.vehicleType
      });
      
      const response = await api.post('/auth/register-driver', driverData);
      
      console.log('✅ Driver registration successful');
      return {
        success: true,
        data: response.data,
        message: 'Driver registration successful'
      };
    } catch (error) {
      console.error('❌ Driver registration failed:', error.response?.data || error.message);
      return this.handleError(error, 'Driver registration failed');
    }
  };

  /**
   * Complete Driver Profile
   * @param {Object} driverProfile - Driver profile completion data
   * @returns {Promise} - Profile completion response
   */
  static completeDriverProfile = async (driverProfile) => {
    try {
      console.log('📋 Completing driver profile');
      
      const response = await api.post('/auth/complete-driver-profile', driverProfile);
      
      // Update stored user data
      const userData = JSON.parse(await AsyncStorage.getItem('user_data') || '{}');
      const updatedUser = { ...userData, ...driverProfile, isProfileComplete: true };
      await AsyncStorage.setItem('user_data', JSON.stringify(updatedUser));
      
      console.log('✅ Driver profile completed successfully');
      return {
        success: true,
        data: response.data,
        user: updatedUser,
        message: 'Driver profile completed successfully'
      };
    } catch (error) {
      console.error('❌ Driver profile completion failed:', error.response?.data || error.message);
      return this.handleError(error, 'Failed to complete driver profile');
    }
  };

  /**
   * Verify Driver Documents
   * @param {FormData} documents - Driver documents form data
   * @returns {Promise} - Documents verification response
   */
  static verifyDriverDocuments = async (documents) => {
    try {
      console.log('📄 Uploading driver documents');
      
      const response = await api.post('/auth/verify-documents', documents, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log('✅ Documents submitted for verification');
      return {
        success: true,
        data: response.data,
        message: 'Documents submitted for verification'
      };
    } catch (error) {
      console.error('❌ Documents upload failed:', error.response?.data || error.message);
      return this.handleError(error, 'Failed to upload documents');
    }
  };

  /**
   * Check Driver Verification Status
   * @returns {Promise} - Verification status
   */
  static checkVerificationStatus = async () => {
    try {
      console.log('🔄 Checking verification status');
      
      const response = await api.get('/auth/verification-status');
      
      console.log('✅ Verification status:', response.data.status);
      return {
        success: true,
        data: response.data,
        status: response.data.status,
        message: 'Verification status fetched'
      };
    } catch (error) {
      console.error('❌ Verification status check failed:', error.response?.data || error.message);
      return this.handleError(error, 'Failed to check verification status');
    }
  };

  /**
   * Logout User
   * @returns {Promise} - Logout response
   */
  static logout = async () => {
    try {
      console.log('👋 Logging out user');
      
      // Get token before clearing storage
      const token = await AsyncStorage.getItem('auth_token');
      
      if (token) {
        // Call logout API to invalidate token on server
        await api.post('/auth/logout', { token });
      }
      
      // Clear all stored data
      await AsyncStorage.multiRemove([
        'auth_token',
        'refresh_token',
        'user_data',
        'fcm_token',
        'ride_history',
        'driver_stats'
      ]);
      
      console.log('✅ Logout successful');
      return {
        success: true,
        message: 'Logged out successfully'
      };
    } catch (error) {
      console.error('❌ Logout failed:', error);
      // Still clear local storage even if API call fails
      await AsyncStorage.multiRemove([
        'auth_token',
        'refresh_token',
        'user_data'
      ]);
      return {
        success: true,
        message: 'Logged out locally'
      };
    }
  };

  /**
   * Change Password
   * @param {String} currentPassword - Current password
   * @param {String} newPassword - New password
   * @returns {Promise} - Password change response
   */
  static changePassword = async (currentPassword, newPassword) => {
    try {
      console.log('🔑 Changing password');
      
      const response = await api.post('/auth/change-password', {
        currentPassword,
        newPassword
      });
      
      console.log('✅ Password changed successfully');
      return {
        success: true,
        data: response.data,
        message: 'Password changed successfully'
      };
    } catch (error) {
      console.error('❌ Password change failed:', error.response?.data || error.message);
      return this.handleError(error, 'Failed to change password');
    }
  };

  /**
   * Request Password Reset
   * @param {String} phone - User phone number
   * @returns {Promise} - Reset request response
   */
  static requestPasswordReset = async (phone) => {
    try {
      console.log('🆘 Requesting password reset for:', phone);
      
      const response = await api.post('/auth/request-password-reset', { phone });
      
      console.log('✅ Password reset requested successfully');
      return {
        success: true,
        data: response.data,
        message: 'Password reset instructions sent'
      };
    } catch (error) {
      console.error('❌ Password reset request failed:', error.response?.data || error.message);
      return this.handleError(error, 'Failed to request password reset');
    }
  };

  /**
   * Reset Password
   * @param {String} phone - User phone number
   * @param {String} otp - OTP code
   * @param {String} newPassword - New password
   * @returns {Promise} - Password reset response
   */
  static resetPassword = async (phone, otp, newPassword) => {
    try {
      console.log('🔄 Resetting password for:', phone);
      
      const response = await api.post('/auth/reset-password', {
        phone,
        otp,
        newPassword
      });
      
      console.log('✅ Password reset successfully');
      return {
        success: true,
        data: response.data,
        message: 'Password reset successfully'
      };
    } catch (error) {
      console.error('❌ Password reset failed:', error.response?.data || error.message);
      return this.handleError(error, 'Failed to reset password');
    }
  };

  /**
   * Check Session Validity
   * @returns {Promise} - Session status
   */
  static checkSession = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      
      if (!token) {
        return {
          success: false,
          isAuthenticated: false,
          message: 'No session found'
        };
      }
      
      const response = await api.get('/auth/check-session');
      
      return {
        success: true,
        isAuthenticated: true,
        data: response.data,
        user: response.data.user,
        message: 'Session is valid'
      };
    } catch (error) {
      console.error('❌ Session check failed:', error.response?.data || error.message);
      
      // Clear invalid session
      if (error.response?.status === 401) {
        await AsyncStorage.multiRemove(['auth_token', 'refresh_token']);
      }
      
      return {
        success: false,
        isAuthenticated: false,
        message: 'Session expired or invalid'
      };
    }
  };

  /**
   * Get Stored User Data
   * @returns {Object} - User data from AsyncStorage
   */
  static getStoredUser = async () => {
    try {
      const userData = await AsyncStorage.getItem('user_data');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('❌ Error getting stored user:', error);
      return null;
    }
  };

  /**
   * Handle API Errors
   * @param {Error} error - API error
   * @param {String} defaultMessage - Default error message
   * @returns {Object} - Formatted error response
   */
  static handleError = (error, defaultMessage = 'Something went wrong') => {
    const response = error.response;
    
    if (!response) {
      return {
        success: false,
        message: 'Network error. Please check your connection.',
        error: error.message
      };
    }
    
    // Handle specific error codes
    switch (response.status) {
      case 400:
        return {
          success: false,
          message: response.data.message || 'Invalid request data',
          errors: response.data.errors
        };
      case 401:
        return {
          success: false,
          message: 'Unauthorized. Please login again.',
          shouldLogout: true
        };
      case 403:
        return {
          success: false,
          message: 'Access forbidden. Insufficient permissions.'
        };
      case 404:
        return {
          success: false,
          message: 'Resource not found.'
        };
      case 409:
        return {
          success: false,
          message: response.data.message || 'Conflict - resource already exists'
        };
      case 422:
        return {
          success: false,
          message: 'Validation error',
          errors: response.data.errors
        };
      case 429:
        return {
          success: false,
          message: 'Too many requests. Please try again later.'
        };
      case 500:
      case 502:
      case 503:
      case 504:
        return {
          success: false,
          message: 'Server error. Please try again later.'
        };
      default:
        return {
          success: false,
          message: defaultMessage,
          error: response.data?.message || error.message
        };
    }
  };
}

export default AuthAPI;