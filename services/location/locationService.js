// services/LocationService.js
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import Geolocation from 'react-native-geolocation-service';

class LocationService {
  static locationWatchers = new Map();

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
      'Kabaza needs location access to:\n• Find rides near you\n• Show accurate pickup locations\n• Provide safe and efficient service\n\nPlease enable location permissions in your device settings.',
      [
        { text: 'OK', style: 'default' },
        { 
          text: 'Open Settings', 
          onPress: () => {
            if (Platform.OS === 'ios') {
              // iOS settings deep link
              // Linking.openURL('app-settings:');
            } else {
              // Android settings deep link
              // Linking.openSettings();
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
        timeout: 20000, // Increased timeout for better reliability
        maximumAge: 30000, // Accept cached location up to 30 seconds
        distanceFilter: 5, // More precise updates
      };

      Geolocation.getCurrentPosition(
        (position) => {
          console.log('📍 Current location obtained:', {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date(position.timestamp).toLocaleTimeString(),
          });
          resolve(position);
        },
        (error) => {
          console.error('❌ Error getting location:', {
            code: error.code,
            message: error.message,
          });
          
          const errorMessage = this.getLocationError(error);
          reject(new Error(errorMessage));
        },
        { ...defaultOptions, ...options }
      );
    });
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
      };
    } catch (error) {
      console.error('❌ Failed to initialize location:', error);
      
      return {
        success: false,
        error: error.message,
        fallbackLocation: this.getDefaultLocation(), // Provide fallback
      };
    }
  };

  /**
   * Get default location (Malawi coordinates)
   */
  static getDefaultLocation = () => {
    return {
      latitude: -15.3875, // Lilongwe, Malawi
      longitude: 28.3228,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
  };

  /**
   * Watch position with enhanced tracking
   */
  static watchPosition = (onUpdate, onError, options = {}, watchId = 'default') => {
    try {
      const defaultWatchOptions = {
        enableHighAccuracy: true,
        distanceFilter: 10, // Update every 10 meters
        interval: 5000, // Update every 5 seconds
        fastestInterval: 2000, // Fastest update interval
        useSignificantChanges: false,
      };

      const watchOptions = { ...defaultWatchOptions, ...options };

      const id = Geolocation.watchPosition(
        (position) => {
          const enhancedLocation = {
            coords: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              altitude: position.coords.altitude,
              altitudeAccuracy: position.coords.altitudeAccuracy,
              heading: position.coords.heading,
              speed: position.coords.speed,
            },
            timestamp: position.timestamp,
            watchId: id,
          };

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

      // Store watcher for management
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
   * Get address from coordinates (mock - integrate with real geocoding service)
   */
  static getAddressFromCoords = async (coords) => {
    try {
      // Mock implementation - replace with actual geocoding service
      const mockAddresses = [
        'Lilongwe City Center',
        'Blantyre Commercial Area', 
        'Mzuzu Downtown',
        'Zomba Central',
      ];
      
      // Simple mock based on coordinates
      const randomAddress = mockAddresses[
        Math.floor(Math.random() * mockAddresses.length)
      ];
      
      return {
        address: randomAddress,
        city: 'Lilongwe', // Default city
        country: 'Malawi',
        fullAddress: `${randomAddress}, Malawi`,
      };
    } catch (error) {
      console.error('❌ Geocoding error:', error);
      return null;
    }
  };

  /**
   * Clean up resources
   */
  static cleanup = () => {
    this.stopAllWatchers();
    console.log('📍 Location service cleanup completed');
  };
}

export default LocationService;