// src/hooks/useLocation.js

import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform, AppState } from 'react-native';
import { LocationService } from '@services/location/LocationService';
import { PermissionUtils } from '@utils/permissions';
import { useDispatch, useSelector } from 'react-redux';
import { locationActions } from '@store/constants';

/**
 * Custom hook for location tracking and management
 * Features:
 * - Real-time location tracking
 * - Background/foreground awareness
 * - Permission handling
 * - Error handling
 * - Redux integration
 */

export const useLocation = (options = {}) => {
  const dispatch = useDispatch();
  
  // Get location from Redux store
  const { currentLocation, locationHistory, trackingEnabled, lastUpdated, error } = 
    useSelector(state => state.location);
  
  // Local state
  const [isLoading, setIsLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState(null);
  
  // Refs
  const watchIdRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const isMountedRef = useRef(true);
  
  // Default options
  const defaultOptions = {
    enableHighAccuracy: true,
    distanceFilter: 10, // meters
    updateInterval: 5000, // milliseconds
    backgroundUpdates: false,
    maxHistoryLength: 100,
    ...options
  };
  
  // ====================
  // PERMISSION HANDLING
  // ====================
  
  /**
   * Check and request location permission
   */
  const checkAndRequestPermission = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const hasPermission = await PermissionUtils.checkLocationPermission();
      setPermissionStatus(hasPermission ? 'granted' : 'denied');
      
      if (hasPermission) {
        dispatch({ type: locationActions.REQUEST_PERMISSION_SUCCESS });
      } else {
        dispatch({ type: locationActions.REQUEST_PERMISSION_FAILURE });
      }
      
      return hasPermission;
    } catch (error) {
      console.error('Error checking location permission:', error);
      setPermissionStatus('error');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [dispatch]);
  
  // ====================
  // LOCATION FETCHING
  // ====================
  
  /**
   * Get current location once
   */
  const getCurrentLocation = useCallback(async (force = false) => {
    if (!force && currentLocation) {
      return currentLocation;
    }
    
    try {
      setIsLoading(true);
      dispatch({ type: locationActions.GET_CURRENT_LOCATION_REQUEST });
      
      const location = await LocationService.getCurrentLocation({
        enableHighAccuracy: defaultOptions.enableHighAccuracy,
        timeout: 15000,
        maximumAge: 0
      });
      
      dispatch({ 
        type: locationActions.GET_CURRENT_LOCATION_SUCCESS,
        payload: location 
      });
      
      return location;
    } catch (error) {
      console.error('Error getting current location:', error);
      dispatch({ 
        type: locationActions.GET_CURRENT_LOCATION_FAILURE,
        payload: error.message 
      });
      
      // Return cached location if available
      return currentLocation;
    } finally {
      setIsLoading(false);
    }
  }, [currentLocation, dispatch, defaultOptions.enableHighAccuracy]);
  
  /**
   * Update current location
   */
  const updateLocation = useCallback((location) => {
    if (!location || !isMountedRef.current) return;
    
    dispatch({ 
      type: locationActions.UPDATE_CURRENT_LOCATION,
      payload: location 
    });
  }, [dispatch]);
  
  // ====================
  // LOCATION TRACKING
  // ====================
  
  /**
   * Start continuous location tracking
   */
  const startTracking = useCallback(async () => {
    try {
      const hasPermission = await checkAndRequestPermission();
      if (!hasPermission) return false;
      
      // Clear any existing watcher
      if (watchIdRef.current) {
        LocationService.stopWatchingLocation(watchIdRef.current);
      }
      
      // Start new watcher
      watchIdRef.current = LocationService.watchLocation(
        (location) => {
          updateLocation(location);
        },
        {
          enableHighAccuracy: defaultOptions.enableHighAccuracy,
          distanceFilter: defaultOptions.distanceFilter,
          interval: defaultOptions.updateInterval,
          fastestInterval: Math.max(1000, defaultOptions.updateInterval / 2),
          useSignificantChanges: defaultOptions.backgroundUpdates
        }
      );
      
      dispatch({ type: locationActions.START_TRACKING });
      return true;
    } catch (error) {
      console.error('Error starting location tracking:', error);
      return false;
    }
  }, [checkAndRequestPermission, updateLocation, defaultOptions, dispatch]);
  
  /**
   * Stop location tracking
   */
  const stopTracking = useCallback(() => {
    if (watchIdRef.current) {
      LocationService.stopWatchingLocation(watchIdRef.current);
      watchIdRef.current = null;
    }
    
    dispatch({ type: locationActions.STOP_TRACKING });
  }, [dispatch]);
  
  /**
   * Toggle tracking on/off
   */
  const toggleTracking = useCallback(() => {
    if (watchIdRef.current) {
      stopTracking();
    } else {
      startTracking();
    }
  }, [startTracking, stopTracking]);
  
  // ====================
  // LOCATION UTILITIES
  // ====================
  
  /**
   * Calculate distance to a target location
   */
  const calculateDistanceTo = useCallback((targetLocation) => {
    if (!currentLocation || !targetLocation) return null;
    
    return LocationService.calculateDistanceBetweenPoints(
      currentLocation,
      targetLocation
    );
  }, [currentLocation]);
  
  /**
   * Check if within radius of a location
   */
  const isWithinRadius = useCallback((targetLocation, radiusKm) => {
    if (!currentLocation || !targetLocation) return false;
    
    return LocationService.isWithinRadius(
      currentLocation,
      targetLocation,
      radiusKm
    );
  }, [currentLocation]);
  
  /**
   * Get nearest location from array
   */
  const getNearestLocation = useCallback((locations) => {
    if (!currentLocation || !locations || locations.length === 0) return null;
    
    const nearest = LocationService.findNearestPoint(currentLocation, locations);
    return nearest;
  }, [currentLocation]);
  
  /**
   * Clear location history
   */
  const clearHistory = useCallback(() => {
    // Keep only the last location
    if (currentLocation) {
      dispatch({
        type: locationActions.UPDATE_CURRENT_LOCATION,
        payload: currentLocation
      });
    }
  }, [currentLocation, dispatch]);
  
  // ====================
  // APP STATE HANDLING
  // ====================
  
  /**
   * Handle app state changes (foreground/background)
   */
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App came to foreground
        if (trackingEnabled) {
          startTracking();
        }
      } else if (
        appStateRef.current === 'active' &&
        nextAppState.match(/inactive|background/)
      ) {
        // App went to background
        if (!defaultOptions.backgroundUpdates) {
          stopTracking();
        }
      }
      
      appStateRef.current = nextAppState;
    };
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription.remove();
    };
  }, [trackingEnabled, startTracking, stopTracking, defaultOptions.backgroundUpdates]);
  
  // ====================
  // INITIALIZATION
  // ====================
  
  useEffect(() => {
    isMountedRef.current = true;
    
    // Initial permission check
    checkAndRequestPermission();
    
    // Get initial location
    getCurrentLocation();
    
    // Start tracking if enabled
    if (trackingEnabled) {
      startTracking();
    }
    
    return () => {
      isMountedRef.current = false;
      stopTracking();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
  // ====================
  // EXPORTED VALUES
  // ====================
  
  return {
    // State
    location: currentLocation,
    locationHistory,
    isLoading,
    error,
    permissionStatus,
    trackingEnabled,
    lastUpdated,
    
    // Actions
    getCurrentLocation,
    startTracking,
    stopTracking,
    toggleTracking,
    updateLocation,
    checkAndRequestPermission,
    calculateDistanceTo,
    isWithinRadius,
    getNearestLocation,
    clearHistory,
    
    // Status
    hasLocation: !!currentLocation,
    hasPermission: permissionStatus === 'granted',
    isTracking: !!watchIdRef.current,
  };
};

// Export hook for specific use cases
export const useRiderLocation = (options) => {
  return useLocation({
    distanceFilter: 10,
    updateInterval: 5000,
    backgroundUpdates: false,
    ...options
  });
};

export const useDriverLocation = (options) => {
  return useLocation({
    distanceFilter: 5,
    updateInterval: 3000,
    backgroundUpdates: true,
    ...options
  });
};

export default useLocation;