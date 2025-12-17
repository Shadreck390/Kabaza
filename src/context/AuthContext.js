// src/context/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

// Create the context
const AuthContext = createContext();

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authToken, setAuthToken] = useState(null);

  // Load user from storage on app start
  useEffect(() => {
    loadUserFromStorage();
  }, []);

  const loadUserFromStorage = async () => {
    try {
      setIsLoading(true);
      
      // Try to get user data from AsyncStorage
      const [userData, token] = await Promise.all([
        AsyncStorage.getItem('@Kabaza:user'),
        AsyncStorage.getItem('@Kabaza:authToken')
      ]);

      if (userData && token) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setAuthToken(token);
        setIsAuthenticated(true);
        console.log('✅ User loaded from storage:', parsedUser.id);
      }
    } catch (error) {
      console.error('❌ Error loading user from storage:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Login function
  const login = async (userData, token) => {
    try {
      setIsLoading(true);
      
      // Save to AsyncStorage
      await Promise.all([
        AsyncStorage.setItem('@Kabaza:user', JSON.stringify(userData)),
        AsyncStorage.setItem('@Kabaza:authToken', token),
        AsyncStorage.setItem('@Kabaza:refreshToken', userData.refreshToken || ''),
        AsyncStorage.setItem('@Kabaza:userType', userData.type || 'rider')
      ]);

      // Update state
      setUser(userData);
      setAuthToken(token);
      setIsAuthenticated(true);
      
      console.log('✅ User logged in:', userData.id);
      return { success: true, user: userData };
    } catch (error) {
      console.error('❌ Login error:', error);
      Alert.alert('Login Error', 'Failed to save login data');
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      setIsLoading(true);
      
      // Clear AsyncStorage
      await AsyncStorage.multiRemove([
        '@Kabaza:user',
        '@Kabaza:authToken',
        '@Kabaza:refreshToken',
        '@Kabaza:userType'
      ]);

      // Clear state
      setUser(null);
      setAuthToken(null);
      setIsAuthenticated(false);
      
      console.log('✅ User logged out');
      return { success: true };
    } catch (error) {
      console.error('❌ Logout error:', error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  // Register function
  const register = async (userData, token) => {
    try {
      setIsLoading(true);
      
      // Save to AsyncStorage
      await Promise.all([
        AsyncStorage.setItem('@Kabaza:user', JSON.stringify(userData)),
        AsyncStorage.setItem('@Kabaza:authToken', token),
        AsyncStorage.setItem('@Kabaza:userType', userData.type || 'rider')
      ]);

      // Update state
      setUser(userData);
      setAuthToken(token);
      setIsAuthenticated(true);
      
      console.log('✅ User registered:', userData.id);
      return { success: true, user: userData };
    } catch (error) {
      console.error('❌ Registration error:', error);
      Alert.alert('Registration Error', 'Failed to save registration data');
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  // Update user profile
  const updateUser = async (updatedData) => {
    try {
      const updatedUser = { ...user, ...updatedData };
      
      await AsyncStorage.setItem('@Kabaza:user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      
      console.log('✅ User updated:', updatedUser.id);
      return { success: true, user: updatedUser };
    } catch (error) {
      console.error('❌ Update user error:', error);
      return { success: false, error: error.message };
    }
  };

  // Check if user is driver
  const isDriver = () => {
    return user?.type === 'driver';
  };

  // Check if user is rider
  const isRider = () => {
    return user?.type === 'rider';
  };

  // Get user ID
  const getUserId = () => {
    return user?.id;
  };

  // Get user phone
  const getUserPhone = () => {
    return user?.phone;
  };

  // Get auth headers for API calls
  const getAuthHeaders = () => {
    return {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    };
  };

  // Context value
  const value = {
    user,
    isLoading,
    isAuthenticated,
    authToken,
    login,
    logout,
    register,
    updateUser,
    isDriver,
    isRider,
    getUserId,
    getUserPhone,
    getAuthHeaders,
    loadUserFromStorage,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Export the context itself (for class components)
export default AuthContext;