// services/api/authAPI.js - FULLY FIXED VERSION
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from './client'; // Import the shared apiClient from client.js

/**
 * Authentication API Service
 * Uses the shared apiClient from client.js which connects to your backend
 */
class AuthAPI {
  /**
   * User Registration
   */
  static register = async (userData) => {
    try {
      console.log('📝 Registering user:', { 
        phone: userData.phone, 
        type: userData.userType 
      });
      
      const response = await apiClient.post('/auth/register', userData);
      
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
   */
  static login = async (phone, password, userType = 'rider') => {
    try {
      console.log('🔐 Attempting login:', { phone, userType });
      
      const response = await apiClient.post('/auth/login', {
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
   * Phone OTP Login
   */
  static requestOTP = async (phone) => {
    try {
      console.log('📱 Requesting OTP for:', phone);
      
      const response = await apiClient.post('/auth/request-otp', { phone });
      
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
   */
  static verifyOTP = async (phone, otp) => {
    try {
      console.log('🔢 Verifying OTP:', { phone, otpLength: otp?.length });
      
      const response = await apiClient.post('/auth/verify-otp', {
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
   */
  static resendOTP = async (phone) => {
    try {
      console.log('🔄 Resending OTP for:', phone);
      
      const response = await apiClient.post('/auth/resend-otp', { phone });
      
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
   */
  static getProfile = async () => {
    try {
      console.log('👤 Fetching user profile');
      
      const response = await apiClient.get('/auth/profile');
      
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
   */
  static updateProfile = async (profileData) => {
    try {
      console.log('📝 Updating profile:', Object.keys(profileData));
      
      const response = await apiClient.put('/auth/profile', profileData);
      
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
   */
  static uploadProfilePicture = async (formData) => {
    try {
      console.log('🖼️ Uploading profile picture');
      
      const response = await apiClient.uploadFile(formData, '/auth/upload-profile-picture');
      
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
   * Driver Registration
   */
  static registerDriver = async (driverData) => {
    try {
      console.log('🚗 Registering driver:', {
        phone: driverData.phone,
        vehicleType: driverData.vehicleType
      });
      
      const response = await apiClient.post('/auth/register-driver', driverData);
      
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
   */
  static completeDriverProfile = async (driverProfile) => {
    try {
      console.log('📋 Completing driver profile');
      
      const response = await apiClient.post('/auth/complete-driver-profile', driverProfile);
      
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
   */
  static verifyDriverDocuments = async (documents) => {
    try {
      console.log('📄 Sending document metadata to backend');
      
      const response = await apiClient.post('/auth/verify-documents', {
        documentCount: Object.keys(documents).length,
        documentTypes: Object.keys(documents),
        uploadedAt: new Date().toISOString(),
        status: 'pending'
      });
      
      console.log('✅ Documents metadata submitted');
      return {
        success: true,
        data: response.data,
        message: 'Document information submitted for verification'
      };
    } catch (error) {
      console.error('❌ Documents submission failed:', error);
      return {
        success: false,
        message: 'Failed to submit document information'
      };
    }
  };

  /**
   * Check Driver Verification Status
   */
  static checkVerificationStatus = async () => {
    try {
      console.log('🔄 Checking verification status');
      
      const response = await apiClient.get('/auth/verification-status');
      
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
   */
  static logout = async () => {
    try {
      console.log('👋 Logging out user');
      
      const token = await AsyncStorage.getItem('auth_token');
      
      if (token) {
        await apiClient.post('/auth/logout', { token });
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
      await AsyncStorage.multiRemove(['auth_token', 'refresh_token', 'user_data']);
      return {
        success: true,
        message: 'Logged out locally'
      };
    }
  };

  /**
   * Change Password
   */
  static changePassword = async (currentPassword, newPassword) => {
    try {
      console.log('🔑 Changing password');
      
      const response = await apiClient.post('/auth/change-password', {
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
   */
  static requestPasswordReset = async (phone) => {
    try {
      console.log('🆘 Requesting password reset for:', phone);
      
      const response = await apiClient.post('/auth/request-password-reset', { phone });
      
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
   */
  static resetPassword = async (phone, otp, newPassword) => {
    try {
      console.log('🔄 Resetting password for:', phone);
      
      const response = await apiClient.post('/auth/reset-password', {
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
      
      const response = await apiClient.get('/auth/check-session');
      
      return {
        success: true,
        isAuthenticated: true,
        data: response.data,
        user: response.data.user,
        message: 'Session is valid'
      };
    } catch (error) {
      console.error('❌ Session check failed:', error.response?.data || error.message);
      
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