// services/location/LocationService.js
import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import realTimeService from '../socket/realtimeUpdates'; // Import for real-time updates

class LocationService {
  static locationWatchers = new Map();
  static currentUser = null;
  static isTrackingForRide = false;
  static currentRideId = null;

  /**
   * Initialize with user context
   */
  static initialize = (userData) => {
    this.currentUser = userData;
    console.log('📍 Location service initialized for user:', userData?.id);
  };

  /**
   * Comprehensive location permission request
   */
  static requestLocationPermission = async () => {
    try {
      console.log('🔄 Requesting location permission...');

      if (Platform.OS === 'ios') {
        const status = await Geolocation.requestAuthorization('whenInUse');
        const granted = status === 'granted';
        
        if (!granted) {
          console.warn('🚫 Location permission denied on iOS');
          this.showPermissionAlert();
        }
        
        return granted;
      }

      // Android runtime permission
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Kabaza Location Permission',
          message: 'Kabaza needs access to your location to find rides near you and provide accurate pickup services.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'Allow Location',
        }
      );

      const isGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
      
      if (!isGranted) {
        console.warn('🚫 Location permission denied on Android');
        this.showPermissionAlert();
      }

      return isGranted;
    } catch (error) {
      console.error('❌ Permission request error:', error);
      return false;
    }
  };

  /**
   * Show helpful alert when permission is denied
   */
  static showPermissionAlert = () => {
    Alert.alert(
      'Location Access Required',
      'Kabaza needs location access to:\n• Find rides near you\n• Show accurate pickup locations\n• Provide safe and efficient service\n• Enable real-time ride tracking\n\nPlease enable location permissions in your device settings.',
      [
        { text: 'OK', style: 'default' },
        { 
          text: 'Open Settings', 
          onPress: () => {
            if (Platform.OS === 'ios') {
              Linking.openURL('app-settings:');
            } else {
              Linking.openSettings();
            }
          } 
        }
      ]
    );
  };

  /**
   * Get current location with enhanced options
   */
  static getCurrentPosition = (options = {}) => {
    return new Promise((resolve, reject) => {
      const defaultOptions = {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
        distanceFilter: 0,
      };

      Geolocation.getCurrentPosition(
        (position) => {
          const enhancedLocation = this.enhanceLocationData(position);
          console.log('📍 Current location obtained:', enhancedLocation);
          resolve(enhancedLocation);
        },
        (error) => {
          console.error('❌ Error getting location:', error);
          const errorMessage = this.getLocationError(error);
          reject(new Error(errorMessage));
        },
        { ...defaultOptions, ...options }
      );
    });
  };

  /**
   * Enhance location data with additional information
   */
  static enhanceLocationData = (position) => {
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
      batteryLevel: 1.0, // You can get this from Battery API if needed
      networkType: 'wifi/cellular', // You can get this from NetInfo
      isMock: position.coords.isFromMockProvider || false,
      provider: position.coords.provider || 'gps',
    };
  };

  /**
   * Get user-friendly error messages
   */
  static getLocationError = (error) => {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return 'Location access was denied. Please enable location permissions in settings.';
      case error.POSITION_UNAVAILABLE:
        return 'Location information is unavailable. Please check your connection.';
      case error.TIMEOUT:
        return 'Location request timed out. Please try again.';
      default:
        return 'Unable to get your location. Please try again.';
    }
  };

  /**
   * Initialize location service with comprehensive setup
   */
  static initializeLocation = async (options = {}) => {
    try {
      console.log('📍 Initializing location service...');

      const hasPermission = await this.requestLocationPermission();
      if (!hasPermission) {
        throw new Error('Location permission denied by user');
      }

      const location = await this.getCurrentPosition(options);
      
      return {
        success: true,
        location: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy,
          altitude: location.coords.altitude,
          heading: location.coords.heading,
          speed: location.coords.speed,
          timestamp: location.timestamp,
        },
        coords: location.coords,
        metadata: {
          isMalawi: this.isValidMalawiLocation(location.coords),
          accuracyLevel: this.getAccuracyLevel(location.coords.accuracy),
        }
      };
    } catch (error) {
      console.error('❌ Failed to initialize location:', error);
      
      return {
        success: false,
        error: error.message,
        fallbackLocation: this.getDefaultLocation(),
      };
    }
  };

  /**
   * Get default location (Lilongwe, Malawi)
   */
  static getDefaultLocation = () => {
    return {
      latitude: -13.9626, // Lilongwe City Center
      longitude: 33.7741,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
  };

  /**
   * Get accuracy level description
   */
  static getAccuracyLevel = (accuracy) => {
    if (accuracy < 20) return 'high';
    if (accuracy < 100) return 'medium';
    return 'low';
  };

  /**
   * Watch position with real-time updates for ride tracking
   */
  static watchPositionForRide = (rideId, onUpdate, onError, options = {}) => {
    try {
      this.currentRideId = rideId;
      this.isTrackingForRide = true;

      const defaultWatchOptions = {
        enableHighAccuracy: true,
        distanceFilter: 10, // Update every 10 meters
        interval: 5000, // Update every 5 seconds
        fastestInterval: 2000,
        useSignificantChanges: false,
      };

      const watchOptions = { ...defaultWatchOptions, ...options };
      const watchId = `ride_${rideId}`;

      console.log(`📍 Starting ride location tracking for: ${rideId}`);

      const id = Geolocation.watchPosition(
        (position) => {
          const enhancedLocation = this.enhanceLocationData(position);
          
          // Send location update via socket
          this.sendRealTimeLocationUpdate(rideId, enhancedLocation);
          
          // Call the provided update callback
          if (onUpdate) {
            onUpdate(enhancedLocation);
          }

          console.log('📍 Ride location update:', {
            rideId,
            latitude: enhancedLocation.coords.latitude,
            longitude: enhancedLocation.coords.longitude,
            accuracy: enhancedLocation.coords.accuracy,
          });
        },
        (error) => {
          console.error('❌ Ride location tracking error:', error);
          if (onError) {
            onError(error);
          }
        },
        watchOptions
      );

      this.locationWatchers.set(watchId, id);
      return id;
    } catch (error) {
      console.error('❌ Failed to start ride location tracking:', error);
      throw error;
    }
  };

  /**
   * Send real-time location update via socket
   */
  static sendRealTimeLocationUpdate = (rideId, location) => {
    try {
      if (!realTimeService.getConnectionStatus().isConnected) {
        console.warn('⚠️ Socket not connected, skipping location update');
        return;
      }

      const locationData = {
        userId: this.currentUser?.id,
        rideId: rideId,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        bearing: location.coords.heading,
        speed: location.coords.speed,
        accuracy: location.coords.accuracy,
        timestamp: Date.now(),
        isRider: true,
      };

      realTimeService.updateLocation(
        this.currentUser?.id,
        {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          bearing: location.coords.heading,
          speed: location.coords.speed,
        },
        false, // isDriver
        rideId
      );

      console.log('📡 Sent real-time location update:', locationData);
    } catch (error) {
      console.error('❌ Failed to send real-time location update:', error);
    }
  };

  /**
   * Watch position with enhanced tracking
   */
  static watchPosition = (onUpdate, onError, options = {}, watchId = 'default') => {
    try {
      const defaultWatchOptions = {
        enableHighAccuracy: true,
        distanceFilter: 10,
        interval: 5000,
        fastestInterval: 2000,
        useSignificantChanges: false,
      };

      const watchOptions = { ...defaultWatchOptions, ...options };

      const id = Geolocation.watchPosition(
        (position) => {
          const enhancedLocation = this.enhanceLocationData(position);
          
          console.log('📍 Location update:', {
            latitude: enhancedLocation.coords.latitude,
            longitude: enhancedLocation.coords.longitude,
            accuracy: `${enhancedLocation.coords.accuracy?.toFixed(1)}m`,
          });

          onUpdate(enhancedLocation);
        },
        (error) => {
          console.error('❌ Watch position error:', error);
          if (onError) {
            onError(error);
          }
        },
        watchOptions
      );

      this.locationWatchers.set(watchId, id);
      console.log(`📍 Started location watcher: ${watchId}`);

      return id;
    } catch (error) {
      console.error('❌ Failed to start location watching:', error);
      throw error;
    }
  };

  /**
   * Stop specific location watcher
   */
  static stopWatching = (watchId = 'default') => {
    const id = this.locationWatchers.get(watchId);
    if (id) {
      Geolocation.clearWatch(id);
      this.locationWatchers.delete(watchId);
      
      // If stopping ride tracking, reset flags
      if (watchId.startsWith('ride_')) {
        this.isTrackingForRide = false;
        this.currentRideId = null;
      }
      
      console.log(`📍 Stopped location watcher: ${watchId}`);
      return true;
    }
    console.warn(`📍 No active watcher found: ${watchId}`);
    return false;
  };

  /**
   * Stop all location watchers
   */
  static stopAllWatchers = () => {
    this.locationWatchers.forEach((id, watchId) => {
      Geolocation.clearWatch(id);
      console.log(`📍 Stopped location watcher: ${watchId}`);
    });
    
    this.locationWatchers.clear();
    this.isTrackingForRide = false;
    this.currentRideId = null;
    
    console.log('📍 All location watchers stopped');
  };

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  static calculateDistance = (coord1, coord2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.deg2rad(coord2.latitude - coord1.latitude);
    const dLon = this.deg2rad(coord2.longitude - coord1.longitude);
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(coord1.latitude)) * Math.cos(this.deg2rad(coord2.latitude)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const distance = R * c; // Distance in kilometers
    
    return distance;
  };

  /**
   * Convert degrees to radians
   */
  static deg2rad = (deg) => {
    return deg * (Math.PI/180);
  };

  /**
   * Format distance for display
   */
  static formatDistance = (distanceInKm) => {
    if (distanceInKm < 1) {
      return `${Math.round(distanceInKm * 1000)}m`;
    }
    return `${distanceInKm.toFixed(1)}km`;
  };

  /**
   * Calculate estimated travel time
   */
  static calculateEstimatedTime = (distanceInKm, averageSpeed = 30) => {
    const hours = distanceInKm / averageSpeed;
    const minutes = Math.round(hours * 60);
    return Math.max(3, minutes); // Minimum 3 minutes
  };

  /**
   * Check if location is within reasonable bounds (Malawi)
   */
  static isValidMalawiLocation = (location) => {
    const MALAWI_BOUNDS = {
      north: -9.0,
      south: -17.5,
      east: 36.0,
      west: 32.5,
    };

    return (
      location.latitude >= MALAWI_BOUNDS.south &&
      location.latitude <= MALAWI_BOUNDS.north &&
      location.longitude >= MALAWI_BOUNDS.west &&
      location.longitude <= MALAWI_BOUNDS.east
    );
  };

  /**
   * Get city based on coordinates
   */
  static getMalawiCityFromCoords = (coords) => {
    const cities = [
      { name: 'Lilongwe', lat: -13.9626, lng: 33.7741, radius: 0.5 },
      { name: 'Blantyre', lat: -15.7861, lng: 35.0058, radius: 0.5 },
      { name: 'Mzuzu', lat: -11.4528, lng: 34.0219, radius: 0.5 },
      { name: 'Zomba', lat: -15.3861, lng: 35.3189, radius: 0.3 },
    ];

    for (const city of cities) {
      const distance = this.calculateDistance(coords, { latitude: city.lat, longitude: city.lng });
      if (distance <= city.radius) {
        return city.name;
      }
    }

    return 'Malawi';
  };

  /**
   * Get address from coordinates
   */
  static getAddressFromCoords = async (coords) => {
    try {
      const city = this.getMalawiCityFromCoords(coords);
      
      // Mock addresses - in production, use Google Maps Geocoding API
      const addressTemplates = {
        'Lilongwe': [
          'City Center, Lilongwe',
          'Area 3, Lilongwe',
          'Old Town, Lilongwe',
          'Kanengo, Lilongwe',
        ],
        'Blantyre': [
          'City Center, Blantyre',
          'Chichiri, Blantyre',
          'Nyambadwe, Blantyre',
          'Limbe, Blantyre',
        ],
        'Mzuzu': ['City Center, Mzuzu', 'Katoto, Mzuzu'],
        'Zomba': ['City Center, Zomba', 'Chancellor College, Zomba'],
      };

      const addresses = addressTemplates[city] || ['Unknown Location, Malawi'];
      const randomAddress = addresses[Math.floor(Math.random() * addresses.length)];
      
      return {
        address: randomAddress,
        city: city,
        country: 'Malawi',
        fullAddress: `${randomAddress}, ${city}, Malawi`,
        coordinates: coords,
      };
    } catch (error) {
      console.error('❌ Geocoding error:', error);
      return null;
    }
  };

  /**
   * Get nearby points of interest
   */
  static getNearbyPOI = async (coords, radius = 1) => {
    // Mock implementation - integrate with Google Places API
    const mockPOIs = [
      { name: 'Shoprite', type: 'shopping', distance: 0.3 },
      { name: 'KCH Hospital', type: 'hospital', distance: 0.5 },
      { name: 'Bingu Stadium', type: 'stadium', distance: 1.2 },
      { name: 'Game Complex', type: 'shopping', distance: 0.8 },
    ];

    return mockPOIs.filter(poi => poi.distance <= radius);
  };

  /**
   * Clean up resources
   */
  static cleanup = () => {
    this.stopAllWatchers();
    this.currentUser = null;
    this.isTrackingForRide = false;
    this.currentRideId = null;
    console.log('📍 Location service cleanup completed');
  };
}

export default LocationService;