// services/location/LocationService.js - COMPLETE VERSION
import { Platform, PermissionsAndroid, AppState } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import NetInfo from '@react-native-community/netinfo';

// FIXED IMPORT - using alias:
import realTimeService from '@services/socket/realtimeUpdates';

class LocationService {
  constructor() {
    this.locationWatchers = new Map();
    this.currentUser = null;
    this.isTrackingForRide = false;
    this.currentRideId = null;
    this.appState = 'active';
    this.networkState = 'connected';
    this.locationCache = [];
    this.MAX_CACHE_SIZE = 50;
    this.backgroundTimer = null;
  }

  // ====================
  // INITIALIZATION
  // ====================

  /**
   * Initialize with user context
   */
  async initialize(userData) {
    try {
      this.currentUser = userData;
      
      // Initialize real-time service
      if (userData?.id) {
        await realTimeService.initialize(userData.id, userData.type || 'rider');
      }
      
      // Monitor app state
      AppState.addEventListener('change', this.handleAppStateChange.bind(this));
      
      // Monitor network state
      this.netInfoUnsubscribe = NetInfo.addEventListener(
        this.handleNetworkChange.bind(this)
      );
      
      // Get initial network state
      const netState = await NetInfo.fetch();
      this.networkState = netState.isConnected ? 'connected' : 'disconnected';
      
      console.log('📍 Location service initialized for:', userData?.id);
      return true;
    } catch (error) {
      console.error('❌ Location service init error:', error);
      return false;
    }
  }

  /**
   * Handle app state changes (background/foreground)
   */
  handleAppStateChange(nextAppState) {
    this.appState = nextAppState;
    
    if (nextAppState === 'background' && this.isTrackingForRide) {
      console.log('📱 App in background - optimizing location updates');
      this.optimizeBackgroundUpdates();
    } else if (nextAppState === 'active') {
      console.log('📱 App in foreground - restoring normal updates');
    }
  }

  /**
   * Handle network changes
   */
  handleNetworkChange(state) {
    this.networkState = state.isConnected ? 'connected' : 'disconnected';
    
    if (state.isConnected) {
      console.log('🌐 Network connected - syncing cached locations');
      this.syncCachedLocations();
    } else {
      console.warn('⚠️ Network disconnected - caching locations');
    }
  }

  // ====================
  // PERMISSION METHODS
  // ====================

  /**
   * Enhanced location permission with explanation
   */
  async requestLocationPermission(withExplanation = true) {
    try {
      if (Platform.OS === 'ios') {
        const status = await Geolocation.requestAuthorization('always');
        
        if (status === 'denied' && withExplanation) {
          this.showPermissionAlert('We need "Always" location access to track your ride even when the app is in background.');
        }
        
        return status === 'granted' || status === 'restricted';
      }

      // Android
      if (Platform.Version >= 29) {
        const foregroundGranted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Access Required',
            message: 'Kabaza needs location access to find rides and track trips.',
            buttonPositive: 'Allow'
          }
        );

        if (foregroundGranted === PermissionsAndroid.RESULTS.GRANTED) {
          const backgroundGranted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
            {
              title: 'Background Location Access',
              message: 'Allow Kabaza to track your ride even when the app is not in use?',
              buttonPositive: 'Allow',
              buttonNegative: 'Deny'
            }
          );
          return backgroundGranted === PermissionsAndroid.RESULTS.GRANTED;
        }
      } else {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Access Required',
            message: 'Kabaza needs location access to find rides and track trips.',
            buttonPositive: 'Allow'
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }

      return false;
    } catch (error) {
      console.error('❌ Permission error:', error);
      return false;
    }
  }

  /**
   * Check if location permission is granted
   */
  async checkLocationPermission() {
    try {
      if (Platform.OS === 'ios') {
        const status = await Geolocation.requestAuthorization('always');
        return status === 'granted' || status === 'restricted';
      } else {
        const granted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
    } catch (error) {
      console.error('❌ Check permission error:', error);
      return false;
    }
  }

  // ====================
  // LOCATION METHODS
  // ====================

  /**
   * Get current location with retry logic
   */
  getCurrentPosition(options = {}, retryCount = 3) {
    return new Promise((resolve, reject) => {
      const defaultOptions = {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
        distanceFilter: 0,
      };

      const attemptGetLocation = (attempt = 1) => {
        Geolocation.getCurrentPosition(
          (position) => {
            resolve(position);
          },
          (error) => {
            if (attempt < retryCount) {
              console.log(`🔄 Location attempt ${attempt} failed, retrying...`);
              setTimeout(() => attemptGetLocation(attempt + 1), 1000);
            } else {
              const errorMessage = this.getLocationError(error);
              reject(new Error(errorMessage));
            }
          },
          { ...defaultOptions, ...options }
        );
      };

      attemptGetLocation();
    });
  }

  /**
   * Watch position with adaptive updates
   */
  watchPosition(onSuccess, onError, options = {}) {
    const defaultOptions = {
      enableHighAccuracy: true,
      distanceFilter: 10,
      interval: 5000,
      fastestInterval: 2000,
    };

    const watchId = Geolocation.watchPosition(
      (position) => {
        this.currentLocation = position;
        onSuccess(position);
      },
      onError,
      { ...defaultOptions, ...options }
    );

    this.isTracking = true;
    return watchId;
  }

  /**
   * Stop watching position
   */
  stopWatching(watchId) {
    if (watchId) {
      Geolocation.clearWatch(watchId);
    }
    this.isTracking = false;
  }

  /**
   * Start location tracking for a ride
   */
  startRideTracking(rideId, onLocationUpdate, onError, options = {}) {
    try {
      this.currentRideId = rideId;
      this.isTrackingForRide = true;

      const watchId = this.watchPosition(
        (position) => {
          // Send real-time update
          this.sendRealTimeLocationUpdate(rideId, position);
          
          if (onLocationUpdate) {
            onLocationUpdate(position);
          }
        },
        onError,
        options
      );

      this.locationWatchers.set(`ride_${rideId}`, watchId);
      console.log(`📍 Started ride tracking: ride_${rideId}`);
      
      return watchId;
    } catch (error) {
      console.error('❌ Failed to start ride tracking:', error);
      throw error;
    }
  }

  /**
   * Stop ride tracking
   */
  stopRideTracking(rideId) {
    const watchId = this.locationWatchers.get(`ride_${rideId}`);
    if (watchId) {
      this.stopWatching(watchId);
      this.locationWatchers.delete(`ride_${rideId}`);
      this.isTrackingForRide = false;
      this.currentRideId = null;
      console.log(`📍 Stopped ride tracking: ride_${rideId}`);
    }
  }

  // ====================
  // UTILITY METHODS
  // ====================

  /**
   * Calculate distance between two coordinates (in meters)
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance; // in meters
  }

  /**
   * Calculate distance in kilometers
   */
  calculateDistanceInKm(lat1, lon1, lat2, lon2) {
    const distanceInMeters = this.calculateDistance(lat1, lon1, lat2, lon2);
    return distanceInMeters / 1000;
  }

  /**
   * Get formatted distance
   */
  getFormattedDistance(lat1, lon1, lat2, lon2) {
    const distanceInKm = this.calculateDistanceInKm(lat1, lon1, lat2, lon2);
    
    if (distanceInKm < 1) {
      return `${Math.round(distanceInKm * 1000)} m`;
    } else {
      return `${distanceInKm.toFixed(1)} km`;
    }
  }

  /**
   * Send real-time location update
   */
  async sendRealTimeLocationUpdate(rideId, location) {
    try {
      const locationData = {
        userId: this.currentUser?.id,
        rideId,
        location: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          bearing: location.coords.heading || 0,
          speed: location.coords.speed || 0,
          accuracy: location.coords.accuracy,
          timestamp: Date.now()
        }
      };

      // Check if socket is connected
      if (realTimeService && typeof realTimeService.emit === 'function') {
        realTimeService.emit('location_update', locationData);
      }
    } catch (error) {
      console.error('❌ Failed to send location update:', error);
    }
  }

  /**
   * Get location error message
   */
  getLocationError(error) {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return 'Location permission denied. Please enable location services.';
      case error.POSITION_UNAVAILABLE:
        return 'Location information unavailable.';
      case error.TIMEOUT:
        return 'Location request timed out.';
      default:
        return 'Failed to get location.';
    }
  }

  // ====================
  // CACHE METHODS
  // ====================

  /**
   * Cache location for offline sync
   */
  cacheLocation(locationData) {
    this.locationCache.push({
      ...locationData,
      timestamp: Date.now(),
      synced: false
    });

    // Limit cache size
    if (this.locationCache.length > this.MAX_CACHE_SIZE) {
      this.locationCache.shift();
    }
  }

  /**
   * Sync cached locations
   */
  async syncCachedLocations() {
    if (this.locationCache.length === 0 || this.networkState !== 'connected') {
      return;
    }

    // Implement sync logic here
    // This would typically send cached locations to your backend
    console.log('Syncing cached locations:', this.locationCache.length);
    
    // Clear cache after sync
    this.locationCache = [];
  }

  // ====================
  // BACKGROUND METHODS
  // ====================

  /**
   * Optimize updates for background mode
   */
  optimizeBackgroundUpdates() {
    // Simple implementation - adjust intervals
    console.log('Optimizing for background mode');
  }

  // ====================
  // CLEANUP
  // ====================

  /**
   * Clean up resources
   */
  cleanup() {
    // Stop all watchers
    this.locationWatchers.forEach((watchId) => {
      this.stopWatching(watchId);
    });
    this.locationWatchers.clear();
    
    // Remove listeners
    AppState.removeEventListener('change', this.handleAppStateChange);
    
    if (this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe();
    }
    
    // Clear cache
    this.locationCache = [];
    
    // Reset state
    this.currentUser = null;
    this.isTrackingForRide = false;
    this.currentRideId = null;
    
    console.log('📍 Location service cleanup completed');
  }
}

// Create and export singleton instance
const locationServiceInstance = new LocationService();
export default locationServiceInstance;