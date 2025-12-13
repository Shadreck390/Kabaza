// services/location/LocationService.js - UPDATED VERSION
import { Platform, PermissionsAndroid, Alert, Linking, AppState, NetInfo } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import BackgroundTimer from 'react-native-background-timer';
import RealTimeService from '../socket/realtimeUpdates';

class LocationService {
  static locationWatchers = new Map();
  static currentUser = null;
  static isTrackingForRide = false;
  static currentRideId = null;
  static appState = 'active';
  static networkState = 'connected';
  static locationCache = [];
  static MAX_CACHE_SIZE = 50;

  /**
   * Initialize with user context
   */
  static initialize = async (userData) => {
    try {
      this.currentUser = userData;
      
      // Initialize real-time service
      RealTimeService.initialize(userData?.id, userData?.type || 'rider');
      
      // Monitor app state
      AppState.addEventListener('change', this.handleAppStateChange);
      
      // Monitor network state
      NetInfo.addEventListener(this.handleNetworkChange);
      
      // Get initial network state
      const netState = await NetInfo.fetch();
      this.networkState = netState.isConnected ? 'connected' : 'disconnected';
      
      console.log('📍 Location service initialized for:', userData?.id);
      return true;
    } catch (error) {
      console.error('❌ Location service init error:', error);
      return false;
    }
  };

  /**
   * Handle app state changes (background/foreground)
   */
  static handleAppStateChange = (nextAppState) => {
    this.appState = nextAppState;
    
    if (nextAppState === 'background' && this.isTrackingForRide) {
      console.log('📱 App in background - optimizing location updates');
      this.optimizeBackgroundUpdates();
    } else if (nextAppState === 'active') {
      console.log('📱 App in foreground - restoring normal updates');
    }
  };

  /**
   * Handle network changes
   */
  static handleNetworkChange = (state) => {
    this.networkState = state.isConnected ? 'connected' : 'disconnected';
    
    if (state.isConnected) {
      console.log('🌐 Network connected - syncing cached locations');
      this.syncCachedLocations();
    } else {
      console.warn('⚠️ Network disconnected - caching locations');
    }
  };

  /**
   * Cache location for offline sync
   */
  static cacheLocation = (locationData) => {
    this.locationCache.push({
      ...locationData,
      timestamp: Date.now(),
      synced: false
    });

    // Limit cache size
    if (this.locationCache.length > this.MAX_CACHE_SIZE) {
      this.locationCache.shift();
    }

    // Try to sync if online
    if (this.networkState === 'connected') {
      this.syncCachedLocations();
    }
  };

  /**
   * Sync cached locations
   */
  static syncCachedLocations = async () => {
    if (this.locationCache.length === 0 || this.networkState !== 'connected') {
      return;
    }

    const unsynced = this.locationCache.filter(loc => !loc.synced);
    
    for (const location of unsynced) {
      try {
        await RealTimeService.updateLocation(
          location.userId,
          location.location,
          location.isDriver,
          location.rideId
        );
        location.synced = true;
      } catch (error) {
        console.error('❌ Failed to sync cached location:', error);
        break;
      }
    }

    // Remove synced locations
    this.locationCache = this.locationCache.filter(loc => !loc.synced);
  };

  /**
   * Optimize updates for background mode
   */
  static optimizeBackgroundUpdates = () => {
    // Reduce update frequency in background
    this.stopAllWatchers();
    
    BackgroundTimer.runBackgroundTimer(() => {
      if (this.isTrackingForRide) {
        this.getCurrentPosition({
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 30000
        }).then(location => {
          this.sendRealTimeLocationUpdate(this.currentRideId, location);
        });
      }
    }, 30000); // Every 30 seconds in background
  };

  /**
   * Enhanced location permission with explanation
   */
  static requestLocationPermission = async (withExplanation = true) => {
    try {
      if (Platform.OS === 'ios') {
        const status = await Geolocation.requestAuthorization('always');
        
        if (status === 'denied' && withExplanation) {
          this.showPermissionAlert('We need "Always" location access to track your ride even when the app is in background.');
        }
        
        return status === 'granted' || status === 'restricted';
      }

      // Android: Request background location for Android 10+
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
  };

  /**
   * Get current location with retry logic
   */
  static getCurrentPosition = (options = {}, retryCount = 3) => {
    return new Promise((resolve, reject) => {
      const defaultOptions = {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
        distanceFilter: 0,
        showLocationDialog: true
      };

      const attemptGetLocation = (attempt = 1) => {
        Geolocation.getCurrentPosition(
          (position) => {
            const enhancedLocation = this.enhanceLocationData(position);
            resolve(enhancedLocation);
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
  };

  /**
   * Enhanced location data with battery and network info
   */
  static enhanceLocationData = async (position) => {
    // Get battery info if available
    let batteryLevel = 1.0;
    try {
      if (Platform.OS === 'android') {
        const BatteryManager = require('react-native-battery');
        batteryLevel = await BatteryManager.getBatteryLevel();
      }
    } catch (e) {
      console.log('Battery API not available');
    }

    return {
      coords: {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude,
        heading: position.coords.heading || 0,
        speed: position.coords.speed || 0,
        altitudeAccuracy: position.coords.altitudeAccuracy,
      },
      timestamp: position.timestamp,
      metadata: {
        batteryLevel,
        networkType: this.networkState,
        appState: this.appState,
        isMock: position.coords.isFromMockProvider || false,
        provider: position.coords.provider || 'gps',
        satellites: position.coords.satellites || 0,
        odometer: position.coords.odometer || 0
      }
    };
  };

  /**
   * Watch position with adaptive updates based on state
   */
  static watchPositionForRide = (rideId, onUpdate, onError, options = {}) => {
    try {
      this.currentRideId = rideId;
      this.isTrackingForRide = true;

      // Adaptive settings based on app state
      const adaptiveOptions = {
        enableHighAccuracy: this.appState === 'active',
        distanceFilter: this.appState === 'active' ? 10 : 50,
        interval: this.appState === 'active' ? 5000 : 30000,
        fastestInterval: this.appState === 'active' ? 2000 : 15000,
        useSignificantChanges: this.appState === 'background'
      };

      const watchId = `ride_${rideId}_${Date.now()}`;

      const id = Geolocation.watchPosition(
        (position) => {
          const enhancedLocation = this.enhanceLocationData(position);
          
          // Cache for offline
          this.cacheLocation({
            userId: this.currentUser?.id,
            location: {
              latitude: enhancedLocation.coords.latitude,
              longitude: enhancedLocation.coords.longitude,
              bearing: enhancedLocation.coords.heading,
              speed: enhancedLocation.coords.speed,
              accuracy: enhancedLocation.coords.accuracy
            },
            isDriver: false,
            rideId
          });

          // Send real-time update
          this.sendRealTimeLocationUpdate(rideId, enhancedLocation);
          
          if (onUpdate) {
            onUpdate(enhancedLocation);
          }

          // Log optimization
          if (this.appState === 'background') {
            console.log('📱 Background location update sent');
          }
        },
        (error) => {
          console.error('❌ Ride tracking error:', error);
          if (onError) onError(error);
          
          // Retry logic
          if (this.isTrackingForRide) {
            setTimeout(() => {
              this.watchPositionForRide(rideId, onUpdate, onError, options);
            }, 5000);
          }
        },
        { ...adaptiveOptions, ...options }
      );

      this.locationWatchers.set(watchId, id);
      console.log(`📍 Started adaptive ride tracking: ${watchId}`);
      
      return watchId;
    } catch (error) {
      console.error('❌ Failed to start ride tracking:', error);
      throw error;
    }
  };

  /**
   * Send real-time location update with network awareness
   */
  static sendRealTimeLocationUpdate = async (rideId, location) => {
    try {
      const connectionStatus = RealTimeService.getConnectionStatus();
      
      const locationData = {
        userId: this.currentUser?.id,
        rideId,
        location: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          bearing: location.coords.heading,
          speed: location.coords.speed,
          accuracy: location.coords.accuracy,
          timestamp: Date.now()
        },
        metadata: {
          appState: this.appState,
          networkState: this.networkState,
          batteryLevel: location.metadata?.batteryLevel,
          isMock: location.metadata?.isMock
        }
      };

      if (connectionStatus.isConnected) {
        RealTimeService.updateLocation(
          this.currentUser?.id,
          locationData.location,
          false,
          rideId
        );
        
        console.log('📡 Real-time location sent:', {
          rideId,
          lat: location.coords.latitude,
          lng: location.coords.longitude,
          accuracy: `${location.coords.accuracy}m`,
          state: this.appState
        });
      } else {
        console.log('📦 Location cached (offline):', locationData);
      }
    } catch (error) {
      console.error('❌ Failed to send location update:', error);
    }
  };

  /**
   * Get nearby drivers (real-time)
   */
  static getNearbyDrivers = async (userLocation, radiusKm = 5) => {
    try {
      if (!RealTimeService.getConnectionStatus().isConnected) {
        console.warn('⚠️ Offline - cannot fetch nearby drivers');
        return { success: false, offline: true, drivers: [] };
      }

      // This would call your backend API
      const response = await fetch('https://your-api.com/api/drivers/nearby', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.currentUser?.token}`
        },
        body: JSON.stringify({
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          radius: radiusKm,
          timestamp: Date.now()
        })
      });

      const data = await response.json();
      return { success: true, ...data };
    } catch (error) {
      console.error('❌ Failed to get nearby drivers:', error);
      return { success: false, error: error.message, drivers: [] };
    }
  };

  /**
   * Track driver location (real-time subscription)
   */
  static subscribeToDriverLocation = (driverId, onLocationUpdate) => {
    const subscriptionId = `driver_${driverId}`;
    
    // Listen for driver location updates
    RealTimeService.socket?.on('driver_location_update', (data) => {
      if (data.driverId === driverId) {
        onLocationUpdate(data.location);
      }
    });

    // Request driver location
    RealTimeService.socket?.emit('subscribe_driver_location', { driverId });
    
    console.log(`📍 Subscribed to driver location: ${driverId}`);
    return subscriptionId;
  };

  /**
   * Unsubscribe from driver location
   */
  static unsubscribeFromDriverLocation = (subscriptionId) => {
    const driverId = subscriptionId.replace('driver_', '');
    RealTimeService.socket?.emit('unsubscribe_driver_location', { driverId });
    console.log(`📍 Unsubscribed from driver: ${driverId}`);
  };

  /**
   * Clean up with proper resource management
   */
  static cleanup = () => {
    // Stop all watchers
    this.stopAllWatchers();
    
    // Clear background timer
    BackgroundTimer.stopBackgroundTimer();
    
    // Remove listeners
    AppState.removeEventListener('change', this.handleAppStateChange);
    
    // Disconnect socket
    RealTimeService.disconnect();
    
    // Clear cache
    this.locationCache = [];
    
    // Reset state
    this.currentUser = null;
    this.isTrackingForRide = false;
    this.currentRideId = null;
    
    console.log('📍 Location service cleanup completed');
  };
}

export default LocationService;