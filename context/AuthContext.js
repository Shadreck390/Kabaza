// Kabaza/context/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSelector, useDispatch } from 'react-redux';
import { login, logout, updateProfile } from 'src/store/slices/authSlice';
import socketService from 'services/socket/socketService';

// Create the context
export const AuthContext = createContext();

// Provider component
export const AuthProvider = ({ children }) => {
  const dispatch = useDispatch();
  const authState = useSelector(state => state.auth);
  const [isLoading, setIsLoading] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);

  // Initialize auth
  useEffect(() => {
    initializeAuth();
    
    return () => {
      // Cleanup
    };
  }, []);

  const initializeAuth = async () => {
    try {
      setIsLoading(true);
      
      // Load token from storage
      const token = await AsyncStorage.getItem('userToken');
      const userData = await AsyncStorage.getItem('userData');
      
      if (token && userData) {
        // Restore auth state
        const parsedUser = JSON.parse(userData);
        dispatch(login({ 
          token, 
          user: parsedUser,
          isAuthenticated: true 
        }));
        
        // Initialize socket connection
        await initializeSocket(parsedUser);
      }
      
    } catch (error) {
      console.error('Auth initialization error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const initializeSocket = async (userData) => {
    try {
      if (userData?.id) {
        await socketService.initialize(userData);
        setSocketConnected(true);
      }
    } catch (error) {
      console.error('Socket initialization error:', error);
    }
  };

  // Login function
  const signIn = async (credentials) => {
    try {
      setIsLoading(true);
      
      // Here you would call your API
      // For now, simulate API response
      const mockResponse = {
        token: 'mock_token_' + Date.now(),
        user: {
          id: 'user_' + Date.now(),
          name: credentials.name || 'User',
          email: credentials.email || '',
          phone: credentials.phone || '',
          type: credentials.type || 'rider',
          createdAt: new Date().toISOString()
        }
      };
      
      // Save to storage
      await AsyncStorage.setItem('userToken', mockResponse.token);
      await AsyncStorage.setItem('userData', JSON.stringify(mockResponse.user));
      
      // Update Redux store
      dispatch(login({ 
        token: mockResponse.token, 
        user: mockResponse.user,
        isAuthenticated: true 
      }));
      
      // Initialize socket
      await initializeSocket(mockResponse.user);
      
      return { success: true, user: mockResponse.user };
      
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  // Sign out function
  const signOut = async () => {
    try {
      setIsLoading(true);
      
      // Clear storage
      await AsyncStorage.multiRemove(['userToken', 'userData']);
      
      // Disconnect socket
      if (socketService && typeof socketService.disconnect === 'function') {
        await socketService.disconnect();
      }
      
      // Update Redux store
      dispatch(logout());
      
      setSocketConnected(false);
      
      return { success: true };
      
    } catch (error) {
      console.error('Sign out error:', error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  // Update profile function
  const updateUserProfile = async (updates) => {
    try {
      // Update in Redux
      dispatch(updateProfile(updates));
      
      // Update in storage
      const updatedUser = { ...authState.user, ...updates };
      await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
      
      return { success: true, user: updatedUser };
      
    } catch (error) {
      console.error('Update profile error:', error);
      return { success: false, error: error.message };
    }
  };

  // Check authentication status
  const isAuthenticated = () => {
    return authState.isAuthenticated && authState.token;
  };

  // Context value
  const value = {
    user: authState.user,
    token: authState.token,
    isLoading,
    socketConnected,
    isAuthenticated: isAuthenticated(),
    signIn,
    signOut,
    updateUserProfile,
    refreshAuth: initializeAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for using auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Default export
export default AuthContext;