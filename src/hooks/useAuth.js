// src/hooks/useAuth.js

import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authActions, STORAGE_KEYS } from '@store/constants';
import { ValidationUtils } from '@utils/validation';
import { StorageUtils } from '@utils/userStorage';
import { apiClient } from '@services/api/client';

/**
 * Custom hook for authentication management
 * Features:
 * - Login/Logout functionality
 * - Token management
 * - User session handling
 * - Auto-login on app start
 * - Role-based access control
 */

export const useAuth = () => {
  const dispatch = useDispatch();
  
  // Get auth state from Redux
  const {
    user,
    token,
    refreshToken,
    isAuthenticated,
    isLoading,
    error,
    userRole,
    requiresVerification,
    loginMethod,
    lastLogin
  } = useSelector(state => state.auth);
  
  // Local state
  const [isInitializing, setIsInitializing] = useState(true);
  const [isRefreshingToken, setIsRefreshingToken] = useState(false);
  
  // ====================
  // AUTHENTICATION ACTIONS
  // ====================
  
  /**
   * Login with phone/OTP
   */
  const loginWithPhone = useCallback(async (phone, otp) => {
    try {
      // Validate input
      if (!ValidationUtils.validatePhone(phone)) {
        throw new Error('Invalid phone number format');
      }
      
      if (!ValidationUtils.validatePIN(otp)) {
        throw new Error('OTP must be 4-6 digits');
      }
      
      dispatch({ type: authActions.LOGIN_REQUEST });
      
      // Call API
      const response = await apiClient.post('/auth/login', { phone, otp });
      const { user, token, refreshToken } = response.data;
      
      // Store tokens
      await StorageUtils.setAuthTokens(token, refreshToken);
      await StorageUtils.setUserData(user);
      
      // Update Redux state
      dispatch({
        type: authActions.LOGIN_SUCCESS,
        payload: { user, token, refreshToken }
      });
      
      return { success: true, user };
    } catch (error) {
      console.error('Login error:', error);
      dispatch({
        type: authActions.LOGIN_FAILURE,
        payload: error.message
      });
      
      return { 
        success: false, 
        error: error.message || 'Login failed' 
      };
    }
  }, [dispatch]);
  
  /**
   * Login with Google
   */
  const loginWithGoogle = useCallback(async () => {
    try {
      dispatch({ type: authActions.LOGIN_REQUEST });
      
      // TODO: Implement Google OAuth
      // For now, simulate success
      const mockUser = {
        id: 'user_123',
        name: 'Google User',
        email: 'user@example.com',
        phone: '+265881234567',
        role: 'rider',
        avatar: 'https://example.com/avatar.jpg'
      };
      
      const mockToken = 'google_mock_token';
      const mockRefreshToken = 'google_mock_refresh_token';
      
      await StorageUtils.setAuthTokens(mockToken, mockRefreshToken);
      await StorageUtils.setUserData(mockUser);
      
      dispatch({
        type: authActions.LOGIN_SUCCESS,
        payload: { 
          user: mockUser, 
          token: mockToken, 
          refreshToken: mockRefreshToken,
          loginMethod: 'google'
        }
      });
      
      return { success: true, user: mockUser };
    } catch (error) {
      console.error('Google login error:', error);
      dispatch({
        type: authActions.LOGIN_FAILURE,
        payload: error.message
      });
      
      return { success: false, error: error.message };
    }
  }, [dispatch]);
  
  /**
   * Register new user
   */
  const register = useCallback(async (userData) => {
    try {
      // Validate required fields
      const requiredFields = ['name', 'phone', 'role'];
      for (const field of requiredFields) {
        if (!userData[field]) {
          throw new Error(`${field} is required`);
        }
      }
      
      dispatch({ type: authActions.REGISTER_REQUEST });
      
      // Call API
      const response = await apiClient.post('/auth/register', userData);
      const { user, token, requiresVerification } = response.data;
      
      if (token) {
        await StorageUtils.setAuthTokens(token);
        await StorageUtils.setUserData(user);
        
        dispatch({
          type: authActions.REGISTER_SUCCESS,
          payload: { user, token, requiresVerification }
        });
      } else {
        dispatch({
          type: authActions.REGISTER_SUCCESS,
          payload: { user, requiresVerification: true }
        });
      }
      
      return { 
        success: true, 
        user, 
        requiresVerification 
      };
    } catch (error) {
      console.error('Registration error:', error);
      dispatch({
        type: authActions.REGISTER_FAILURE,
        payload: error.message
      });
      
      return { success: false, error: error.message };
    }
  }, [dispatch]);
  
  /**
   * Verify OTP
   */
  const verifyOTP = useCallback(async (phone, otp) => {
    try {
      dispatch({ type: authActions.VERIFY_OTP_REQUEST });
      
      const response = await apiClient.post('/auth/verify-otp', { phone, otp });
      const { user, token } = response.data;
      
      await StorageUtils.setAuthTokens(token);
      await StorageUtils.setUserData(user);
      
      dispatch({
        type: authActions.VERIFY_OTP_SUCCESS,
        payload: { user, token }
      });
      
      return { success: true, user };
    } catch (error) {
      console.error('OTP verification error:', error);
      dispatch({
        type: authActions.VERIFY_OTP_FAILURE,
        payload: error.message
      });
      
      return { success: false, error: error.message };
    }
  }, [dispatch]);
  
  /**
   * Logout
   */
  const logout = useCallback(async (force = false) => {
    try {
      if (!force) {
        // Confirm logout
        Alert.alert(
          'Logout',
          'Are you sure you want to logout?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Logout', 
              style: 'destructive',
              onPress: () => performLogout()
            }
          ]
        );
      } else {
        await performLogout();
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, []);
  
  /**
   * Perform actual logout
   */
  const performLogout = useCallback(async () => {
    try {
      // Call logout API if token exists
      if (token) {
        try {
          await apiClient.post('/auth/logout');
        } catch (apiError) {
          console.warn('Logout API error:', apiError);
          // Continue with local logout even if API fails
        }
      }
      
      // Clear local storage
      await StorageUtils.clearAuthData();
      
      // Clear Redux state
      dispatch({ type: authActions.LOGOUT });
      
      return { success: true };
    } catch (error) {
      console.error('Logout cleanup error:', error);
      return { success: false, error: error.message };
    }
  }, [token, dispatch]);
  
  /**
   * Refresh access token
   */
  const refreshToken = useCallback(async () => {
    if (!refreshToken || isRefreshingToken) return false;
    
    try {
      setIsRefreshingToken(true);
      dispatch({ type: authActions.REFRESH_TOKEN_REQUEST });
      
      const response = await apiClient.post('/auth/refresh', { refreshToken });
      const { token: newToken, refreshToken: newRefreshToken } = response.data;
      
      await StorageUtils.setAuthTokens(newToken, newRefreshToken);
      
      dispatch({
        type: authActions.REFRESH_TOKEN_SUCCESS,
        payload: { token: newToken, refreshToken: newRefreshToken }
      });
      
      return true;
    } catch (error) {
      console.error('Token refresh error:', error);
      dispatch({
        type: authActions.REFRESH_TOKEN_FAILURE,
        payload: error.message
      });
      
      // If refresh fails, logout user
      logout(true);
      return false;
    } finally {
      setIsRefreshingToken(false);
    }
  }, [refreshToken, isRefreshingToken, dispatch, logout]);
  
  /**
   * Update user profile
   */
  const updateProfile = useCallback(async (profileData) => {
    try {
      dispatch({ type: authActions.UPDATE_PROFILE_REQUEST });
      
      const response = await apiClient.put('/auth/profile', profileData);
      const updatedUser = response.data;
      
      await StorageUtils.setUserData(updatedUser);
      
      dispatch({
        type: authActions.UPDATE_PROFILE_SUCCESS,
        payload: updatedUser
      });
      
      return { success: true, user: updatedUser };
    } catch (error) {
      console.error('Profile update error:', error);
      dispatch({
        type: authActions.UPDATE_PROFILE_FAILURE,
        payload: error.message
      });
      
      return { success: false, error: error.message };
    }
  }, [dispatch]);
  
  // ====================
  // SESSION MANAGEMENT
  // ====================
  
  /**
   * Check if user is logged in on app start
   */
  const checkAuthStatus = useCallback(async () => {
    try {
      setIsInitializing(true);
      
      // Check for stored tokens
      const storedToken = await AsyncStorage.getItem(STORAGE_KEYS.USER_TOKEN);
      const storedUser = await StorageUtils.getUserData();
      
      if (storedToken && storedUser) {
        // Validate token by making a test API call
        try {
          // Set token in API client
          apiClient.setAuthToken(storedToken);
          
          // Verify token is still valid
          const userResponse = await apiClient.get('/auth/me');
          const verifiedUser = userResponse.data;
          
          dispatch({
            type: authActions.LOGIN_SUCCESS,
            payload: { 
              user: verifiedUser, 
              token: storedToken,
              isAutoLogin: true
            }
          });
        } catch (error) {
          // Token is invalid or expired
          console.warn('Auto-login failed:', error);
          
          // Try to refresh token
          const storedRefreshToken = await AsyncStorage.getItem(STORAGE_KEYS.USER_REFRESH_TOKEN);
          if (storedRefreshToken) {
            const refreshSuccess = await refreshToken();
            if (!refreshSuccess) {
              // Clear invalid auth data
              await StorageUtils.clearAuthData();
              dispatch({ type: authActions.LOGOUT });
            }
          } else {
            // No refresh token, clear auth
            await StorageUtils.clearAuthData();
            dispatch({ type: authActions.LOGOUT });
          }
        }
      } else {
        // No stored auth data
        dispatch({ type: authActions.LOGOUT });
      }
    } catch (error) {
      console.error('Auth status check error:', error);
      dispatch({ type: authActions.LOGOUT });
    } finally {
      setIsInitializing(false);
    }
  }, [dispatch, refreshToken]);
  
  /**
   * Set user as online/offline
   */
  const setOnlineStatus = useCallback((isOnline) => {
    dispatch({
      type: isOnline ? authActions.SET_ONLINE : authActions.SET_OFFLINE
    });
  }, [dispatch]);
  
  /**
   * Update user presence (for real-time features)
   */
  const updatePresence = useCallback((presenceData) => {
    dispatch({
      type: authActions.UPDATE_PRESENCE,
      payload: presenceData
    });
  }, [dispatch]);
  
  // ====================
  // ROLE & PERMISSION CHECKS
  // ====================
  
  /**
   * Check if user has specific role
   */
  const hasRole = useCallback((role) => {
    return userRole === role;
  }, [userRole]);
  
  /**
   * Check if user is rider
   */
  const isRider = useCallback(() => {
    return userRole === 'rider';
  }, [userRole]);
  
  /**
   * Check if user is driver
   */
  const isDriver = useCallback(() => {
    return userRole === 'driver';
  }, [userRole]);
  
  /**
   * Check if user is admin
   */
  const isAdmin = useCallback(() => {
    return userRole === 'admin';
  }, [userRole]);
  
  /**
   * Switch user role (if allowed)
   */
  const switchRole = useCallback(async (newRole) => {
    if (!['rider', 'driver'].includes(newRole)) {
      return { success: false, error: 'Invalid role' };
    }
    
    try {
      const response = await apiClient.post('/auth/switch-role', { role: newRole });
      const updatedUser = response.data;
      
      await StorageUtils.setUserData(updatedUser);
      
      dispatch({
        type: authActions.UPDATE_PROFILE_SUCCESS,
        payload: updatedUser
      });
      
      return { success: true, user: updatedUser };
    } catch (error) {
      console.error('Role switch error:', error);
      return { success: false, error: error.message };
    }
  }, [dispatch]);
  
  // ====================
  // INITIALIZATION
  // ====================
  
  useEffect(() => {
    // Check auth status on mount
    checkAuthStatus();
    
    // Set up token refresh interval (every 55 minutes)
    const refreshInterval = setInterval(() => {
      if (isAuthenticated && refreshToken) {
        refreshToken();
      }
    }, 55 * 60 * 1000); // 55 minutes
    
    return () => {
      clearInterval(refreshInterval);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
  // ====================
  // EXPORTED VALUES
  // ====================
  
  return {
    // State
    user,
    token,
    isAuthenticated,
    isLoading: isLoading || isInitializing || isRefreshingToken,
    error,
    userRole,
    requiresVerification,
    loginMethod,
    lastLogin,
    
    // Actions
    loginWithPhone,
    loginWithGoogle,
    register,
    verifyOTP,
    logout,
    refreshToken,
    updateProfile,
    setOnlineStatus,
    updatePresence,
    switchRole,
    
    // Role checks
    hasRole,
    isRider,
    isDriver,
    isAdmin,
    
    // Status
    isRefreshingToken,
    isInitializing,
    hasToken: !!token,
    hasRefreshToken: !!refreshToken,
    
    // Utilities
    getAuthHeaders: () => ({
      Authorization: `Bearer ${token}`,
      'X-User-Role': userRole,
      'X-User-ID': user?.id
    })
  };
};

// Export hook for specific use cases
export const useRiderAuth = () => {
  const auth = useAuth();
  
  // Rider-specific methods
  const requestRide = async (rideData) => {
    if (!auth.isRider()) {
      throw new Error('Only riders can request rides');
    }
    // Implementation would go here
  };
  
  return {
    ...auth,
    requestRide
  };
};

export const useDriverAuth = () => {
  const auth = useAuth();
  
  // Driver-specific methods
  const goOnline = async () => {
    if (!auth.isDriver()) {
      throw new Error('Only drivers can go online');
    }
    // Implementation would go here
  };
  
  const goOffline = async () => {
    if (!auth.isDriver()) {
      throw new Error('Only drivers can go offline');
    }
    // Implementation would go here
  };
  
  return {
    ...auth,
    goOnline,
    goOffline
  };
};

export default useAuth;