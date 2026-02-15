/**
 * ============================================================================
 * screens/driver/DriverHomeScreen.js
 * ============================================================================
 * 
 * DRIVER HOME SCREEN - ENHANCED VERSION
 * 
 * Main dashboard screen for drivers with:
 * - Real-time ride requests via WebSocket
 * - Location tracking and permission handling
 * - Offline mode with queued uploads
 * - Network connectivity monitoring
 * - Active ride management
 * - Earnings and statistics display
 * 
 * Features Added:
 * 1. Network resilience with offline queue
 * 2. Location permission flow with user guidance
 * 3. Real-time socket integration
 * 4. Upload queue for offline document processing
 * 5. Connection status indicators
 * 6. Active ride state management
 * 7. Enhanced error handling and user feedback
 * 
 * ============================================================================
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  PermissionsAndroid,
  Alert,
  Linking,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  BackHandler,
  RefreshControl,
  AppState,
} from 'react-native';

// IMPORT NETWORK CHECK
import NetInfo from '@react-native-community/netinfo';

// FIXED COMPONENT IMPORTS:
import Header from '@components/Header';
import Button from '@components/Button';
import Loading from '@components/Loading';
import DriverCard from '@components/DriverCard';
import MapComponent from '@components/MapComponent';

// FIXED SERVICE IMPORTS:
import { fetchNearbyRides } from '@services/api/rideAPI';
import Geolocation from 'react-native-geolocation-service';
import { getUserData, storeUserData } from '@src/utils/userStorage';
import Icon from 'react-native-vector-icons/FontAwesome';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

// FIX THESE TWO IMPORTS:
import realTimeService from '@services/socket/realtimeUpdates';
import LocationService from '@services/location/LocationService';
import apiClient from '@services/api/client'; 
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Formats distance for display
 */
const formatDistance = (distance) => {
  if (distance < 1) {
    return `${Math.round(distance * 1000)} m`;
  }
  return `${distance.toFixed(1)} km`;
};

/**
 * Formats currency for display
 */
const formatCurrency = (amount) => {
  return `MK${amount?.toLocaleString() || '0'}`;
};

/**
 * Calculates estimated time based on distance
 */
const calculateEstimatedTime = (distance) => {
  const avgSpeed = 30; // km/h
  const timeMinutes = Math.round((distance / avgSpeed) * 60);
  return `${Math.max(3, timeMinutes)} min`;
};

export default function DriverHomeScreen({ route, navigation }) {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  const [region, setRegion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nearbyRides, setNearbyRides] = useState([]);
  const [isOnline, setIsOnline] = useState(false);
  const [selectedRideId, setSelectedRideId] = useState(null);
  const [locationPermission, setLocationPermission] = useState(false);
  const [userData, setUserData] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [earningsToday, setEarningsToday] = useState(0);
  const [ridesCompleted, setRidesCompleted] = useState(0);
  const [activeRide, setActiveRide] = useState(null);
  const [driverStatus, setDriverStatus] = useState('offline');
  const [isConnected, setIsConnected] = useState(true);
  const [uploadQueue, setUploadQueue] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [appState, setAppState] = useState(AppState.currentState);
  const [lastLocationUpdate, setLastLocationUpdate] = useState(null);
  const [batteryOptimizationWarning, setBatteryOptimizationWarning] = useState(false);

  // ============================================================================
  // REFS
  // ============================================================================
  
  const mapRef = useRef(null);
  const locationWatchId = useRef(null);
  const socketSubscriptions = useRef([]);
  const networkSubscription = useRef(null);
  const appStateSubscription = useRef(null);
  const retryTimeoutRef = useRef(null);

  // ============================================================================
  // CONSTANTS
  // ============================================================================
  
  const driverName = userData?.userProfile?.fullName || userData?.socialUserInfo?.name || 'Driver';
  const driverId = userData?.id;
  const vehicleInfo = userData?.vehicle || {
    plate: 'DZ 6757',
    type: 'Honda',
    color: 'Yellow',
    year: '2000'
  };

  const defaultRegion = {
    latitude: -13.9626,
    longitude: 33.7741,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  // ============================================================================
  // NAVIGATION HANDLERS
  // ============================================================================

  const handleViewRideRequests = () => {
    navigation.navigate('RideRequests', { 
      refreshCallback: fetchNearbyRidesData 
    });
  };

  const handleViewTripHistory = () => {
    navigation.navigate('TripHistory', { driverId });
  };

  const handleViewProfile = () => {
    navigation.navigate('DriverProfile', { 
      userData,
      refreshCallback: loadUserData 
    });
  };

  const handleViewEarnings = () => {
    navigation.navigate('Earnings', { driverId });
  };

  const handleViewVehicle = () => {
    navigation.navigate('VehicleDetails', { vehicleInfo });
  };

  const handleEmergencyContact = () => {
    navigation.navigate('EmergencyContact');
  };

  // ============================================================================
  // NETWORK & CONNECTIVITY
  // ============================================================================

  const checkNetworkConnectivity = useCallback(async () => {
    try {
      const netState = await NetInfo.fetch();
      const connected = netState.isConnected && netState.isInternetReachable;
      setIsConnected(connected);
      
      if (!connected && isOnline) {
        showOfflineNotification();
      } else if (connected && !isConnected) {
        showReconnectedNotification();
      }
      
      return connected;
    } catch (error) {
      console.error('Network check error:', error);
      return false;
    }
  }, [isOnline, isConnected]);

  const showOfflineNotification = () => {
    Alert.alert(
      'Connection Lost',
      'You are offline. Ride requests will be paused until connection is restored.',
      [{ text: 'OK' }]
    );
  };

  const showReconnectedNotification = () => {
    Alert.alert(
      'Connection Restored',
      'You are back online! Processing queued actions...',
      [{ text: 'OK' }]
    );
    
    // Process any pending actions
    setTimeout(() => {
      processUploadQueue();
      if (isOnline) {
        realTimeService.reconnect();
      }
    }, 1000);
  };

  // ============================================================================
  // LOCATION SERVICES
  // ============================================================================

  const checkLocationEnabled = async () => {
    try {
      const hasPermission = await Geolocation.requestAuthorization('whenInUse');
      return hasPermission === 'granted';
    } catch (error) {
      console.warn('Location check error:', error);
      return false;
    }
  };

  const requestLocationPermission = useCallback(async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Access Required',
            message: 'Kabaza needs your location to show nearby rides and navigate',
            buttonNeutral: 'Ask Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'Allow',
          }
        );
        
        const backgroundGranted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
          {
            title: 'Background Location',
            message: 'Allow Kabaza to access location while in background for ride tracking',
            buttonNeutral: 'Ask Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'Allow',
          }
        );
        
        const isGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
        setLocationPermission(isGranted);
        
        if (!isGranted) {
          showLocationPermissionAlert();
        }
        
        return isGranted;
      } else {
        const authStatus = await Geolocation.requestAuthorization('whenInUse');
        const isGranted = authStatus === 'granted';
        setLocationPermission(isGranted);
        
        if (!isGranted) {
          showLocationPermissionAlert();
        }
        
        return isGranted;
      }
    } catch (error) {
      console.warn('Location permission error:', error);
      return false;
    }
  }, []);

  const showLocationPermissionAlert = () => {
    Alert.alert(
      'Location Access Required',
      'Kabaza needs location access to function properly. Please enable location permissions in settings.',
      [
        { text: 'Cancel', style: 'cancel' },
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

  // ============================================================================
  // UPLOAD QUEUE MANAGEMENT
  // ============================================================================

  const processUploadQueue = async () => {
    if (!isConnected || uploadQueue.length === 0) return;
    
    try {
      setIsUploading(true);
      const successfulUploads = [];
      const failedUploads = [];

      for (const item of uploadQueue) {
        try {
          // Simulate upload - replace with actual API call
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Increment retry count
          item.retryCount = (item.retryCount || 0) + 1;
          
          if (item.retryCount <= 3) {
            successfulUploads.push(item);
          } else {
            failedUploads.push(item);
          }
        } catch (error) {
          console.error('Upload error:', error);
          failedUploads.push(item);
        }
      }

      // Update queue
      const remainingQueue = failedUploads;
      await AsyncStorage.setItem('uploadQueue', JSON.stringify(remainingQueue));
      setUploadQueue(remainingQueue);

      if (successfulUploads.length > 0) {
        Alert.alert(
          'Upload Complete',
          `${successfulUploads.length} document(s) uploaded successfully.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Queue processing error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const queueDocumentForUpload = async (documentType, fileUri) => {
    try {
      const storedQueue = await AsyncStorage.getItem('uploadQueue');
      const queue = storedQueue ? JSON.parse(storedQueue) : [];
      
      const newItem = {
        id: Date.now().toString(),
        documentType,
        fileUri,
        timestamp: Date.now(),
        retryCount: 0,
        ...vehicleInfo
      };
      
      queue.push(newItem);
      await AsyncStorage.setItem('uploadQueue', JSON.stringify(queue));
      setUploadQueue(queue);
      
      Alert.alert(
        'Saved Offline',
        'Document saved locally. It will automatically upload when you reconnect.',
        [
          {
            text: 'View Queue',
            onPress: () => {
              navigation.navigate('UploadQueue', { queue });
            }
          },
          { text: 'OK' }
        ]
      );
    } catch (error) {
      console.error('Error queuing document:', error);
      Alert.alert('Error', 'Failed to save document offline.');
    }
  };

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  const loadUserData = async () => {
    try {
      const data = await getUserData();
      setUserData(data);
      
      // Load driver statistics
      if (data?.id) {
        await loadDriverStatistics(data.id);
      }
      
      return data;
    } catch (error) {
      console.error('Error loading user data:', error);
      return null;
    }
  };

  const loadDriverStatistics = async (driverId) => {
    try {
      if (!isConnected) return;
      
      const [earningsResponse, ridesResponse] = await Promise.all([
        apiClient.get(`/drivers/${driverId}/earnings/today`).catch(() => ({ data: { total: 0 } })),
        apiClient.get(`/drivers/${driverId}/rides/completed/today`).catch(() => ({ data: { count: 0 } }))
      ]);
      
      setEarningsToday(earningsResponse.data.total || 0);
      setRidesCompleted(ridesResponse.data.count || 0);
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const initializeApp = useCallback(async () => {
    try {
      setLoading(true);
      
      // 1. Load user data
      const data = await loadUserData();
      if (!data) throw new Error('Failed to load user data');
      
      // 2. Initialize services
      LocationService.initialize(data);
      
      // 3. Check network
      await checkNetworkConnectivity();
      
      // 4. Request location permission
      const granted = await requestLocationPermission();
      
      if (granted) {
        // 5. Get current location
        const location = await getCurrentLocation();
        if (location) {
          setCurrentLocation(location);
          setRegion({
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });
        }
      }
      
      // 6. Initialize real-time services if connected
      if (isConnected) {
        initializeRealTimeServices(data);
        await checkActiveRide(data.id);
      }
      
      // 7. Load upload queue
      const storedQueue = await AsyncStorage.getItem('uploadQueue');
      if (storedQueue) {
        setUploadQueue(JSON.parse(storedQueue));
      }
      
    } catch (error) {
      console.error('Initialization error:', error);
      setRegion(defaultRegion);
    } finally {
      setLoading(false);
    }
  }, [isConnected]);

  // ============================================================================
  // REAL-TIME SERVICES
  // ============================================================================

  const initializeRealTimeServices = (userData) => {
    if (!isConnected) return;
    
    try {
      realTimeService.initializeSocket({
        id: userData?.id,
        name: driverName,
        role: 'driver',
        vehicleType: userData?.vehicleType || 'bike',
        location: currentLocation,
      });
      
      setupSocketListeners();
    } catch (error) {
      console.error('Real-time service error:', error);
    }
  };

  const setupSocketListeners = () => {
    // Connection status
    realTimeService.addConnectionListener((connected) => {
      setConnectionStatus(connected ? 'connected' : 'disconnected');
    });
    
    // Nearby rides
    const rideRequestUnsubscribe = realTimeService.subscribeToNearbyRides(
      currentLocation || defaultRegion,
      5,
      [],
      handleNewRideRequests
    );
    socketSubscriptions.current.push(rideRequestUnsubscribe);
    
    // Ride updates
    const rideUpdateUnsubscribe = realTimeService.subscribeToRideUpdates(
      `driver_${driverId}`,
      handleRideUpdate
    );
    socketSubscriptions.current.push(rideUpdateUnsubscribe);
  };

  const handleNewRideRequests = (rides) => {
    const enrichedRides = rides.map(ride => ({
      ...ride,
      type: 'ride_request',
      timestamp: Date.now(),
      estimatedTime: calculateEstimatedTime(ride.distance || 5),
      displayDistance: formatDistance(ride.distance || 5),
    }));
    
    setNearbyRides(prev => {
      // Filter out old rides and merge with new ones
      const now = Date.now();
      const oldRides = prev.filter(r => now - r.timestamp < 300000); // 5 minutes
      const newRides = enrichedRides.filter(newRide => 
        !oldRides.some(oldRide => oldRide.id === newRide.id)
      );
      
      return [...oldRides, ...newRides];
    });
  };

  const handleRideUpdate = (update) => {
    console.log('Ride update received:', update);
    
    switch (update.status) {
      case 'matched':
        handleRideMatched(update);
        break;
      case 'started':
        handleRideStarted(update);
        break;
      case 'completed':
        handleRideCompleted(update);
        break;
      case 'cancelled':
        handleRideCancelled(update);
        break;
    }
  };

  // ============================================================================
  // RIDE MANAGEMENT
  // ============================================================================

  const fetchNearbyRidesData = async (location = currentLocation) => {
    if (!isConnected || !location) return;
    
    try {
      const rides = await fetchNearbyRides(location.latitude, location.longitude, 5);
      handleNewRideRequests(rides);
    } catch (error) {
      console.error('Error fetching rides:', error);
    }
  };

  const checkActiveRide = async (driverId) => {
    try {
      const response = await apiClient.get(`/drivers/${driverId}/active-ride`);
      if (response.data.activeRide) {
        setActiveRide(response.data.activeRide);
        setDriverStatus('on_trip');
        startRideTracking(response.data.activeRide.id);
      }
    } catch (error) {
      console.error('Error checking active ride:', error);
    }
  };

  const handleRideMatched = (update) => {
    setActiveRide(update.ride);
    setDriverStatus('busy');
    
    Alert.alert(
      'New Ride Assigned!',
      `Ride to ${update.ride.destination} for ${formatCurrency(update.ride.fare)}`,
      [
        {
          text: 'View Details',
          onPress: () => navigation.navigate('RideRequest', { rideId: update.ride.id })
        },
        {
          text: 'Navigate',
          onPress: () => navigation.navigate('Navigation', { rideId: update.ride.id })
        }
      ]
    );
  };

  const handleRideStarted = (update) => {
    setDriverStatus('on_trip');
    startRideTracking(update.rideId);
  };

  const handleRideCompleted = (update) => {
    setActiveRide(null);
    setDriverStatus('available');
    setRidesCompleted(prev => prev + 1);
    setEarningsToday(prev => prev + (update.fare || 0));
    
    Alert.alert(
      'Ride Completed!',
      `You earned ${formatCurrency(update.fare)}`,
      [{ text: 'OK' }]
    );
    
    stopRideTracking();
  };

  const handleRideCancelled = (update) => {
    setActiveRide(null);
    setDriverStatus('available');
    
    Alert.alert(
      'Ride Cancelled',
      update.reason || 'Ride was cancelled by rider',
      [{ text: 'OK' }]
    );
    
    stopRideTracking();
  };

  // ============================================================================
  // LOCATION TRACKING
  // ============================================================================

  const getCurrentLocation = async () => {
    try {
      const result = await LocationService.getCurrentPosition();
      const location = {
        latitude: result.coords.latitude,
        longitude: result.coords.longitude,
        accuracy: result.coords.accuracy,
        timestamp: Date.now(),
      };
      
      setLastLocationUpdate(location.timestamp);
      return location;
    } catch (error) {
      console.error('Error getting location:', error);
      return null;
    }
  };

  const startLocationTracking = () => {
    if (locationWatchId.current) {
      Geolocation.clearWatch(locationWatchId.current);
    }
    
    locationWatchId.current = Geolocation.watchPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
          timestamp: Date.now(),
        };
        
        setCurrentLocation(location);
        setLastLocationUpdate(location.timestamp);
        
        // Update map
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }, 500);
        }
        
        // Send location update
        if (isOnline && isConnected && driverId) {
          realTimeService.updateLocation(
            driverId,
            location,
            true,
            activeRide?.id
          );
        }
      },
      (error) => {
        console.error('Location tracking error:', error.code, error.message);
        handleLocationError(error);
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 10,
        interval: 5000,
        fastestInterval: 2000,
        showsBackgroundLocationIndicator: true,
      }
    );
  };

  const startRideTracking = (rideId) => {
    // Enhanced tracking for active rides
    LocationService.startRideTracking(rideId, (location) => {
      if (isConnected) {
        realTimeService.updateRideLocation(rideId, location);
      }
    });
  };

  const stopRideTracking = () => {
    LocationService.stopRideTracking();
  };

  const handleLocationError = (error) => {
    switch (error.code) {
      case 1: // PERMISSION_DENIED
        Alert.alert(
          'Location Permission Denied',
          'Please enable location permissions in settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
        break;
      case 2: // POSITION_UNAVAILABLE
        Alert.alert(
          'Location Unavailable',
          'Unable to retrieve your location. Please check your GPS and try again.'
        );
        break;
      case 3: // TIMEOUT
        console.log('Location request timeout');
        break;
    }
  };

  // ============================================================================
  // ONLINE/OFFLINE MANAGEMENT
  // ============================================================================

  const goOnline = async () => {
    if (activeRide) {
      Alert.alert(
        'Active Ride',
        'Please complete your current ride before going offline.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    // Check network
    const connected = await checkNetworkConnectivity();
    if (!connected) {
      Alert.alert(
        'No Internet Connection',
        'Please connect to the internet to go online.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Try Again', onPress: goOnline }
        ]
      );
      return;
    }
    
    // Check location
    const locationEnabled = await checkLocationEnabled();
    if (!locationEnabled) {
      Alert.alert(
        'Location Required',
        'Please enable location services to go online.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Enable Location', onPress: () => Linking.openSettings() }
        ]
      );
      return;
    }
    
    setLoading(true);
    
    try {
      // Get fresh location
      const location = await getCurrentLocation();
      if (!location) {
        throw new Error('Could not get location');
      }
      
      setCurrentLocation(location);
      
      // Update driver status
      await apiClient.post(`/drivers/${driverId}/status`, {
        status: 'available',
        location,
        timestamp: Date.now(),
      });
      
      realTimeService.emit('driver:availability', {
        driverId,
        isAvailable: true,
        location,
        status: 'available',
      });
      
      // Start services
      startLocationTracking();
      initializeRealTimeServices(userData);
      
      // Update state
      setIsOnline(true);
      setDriverStatus('available');
      
      // Fetch nearby rides
      fetchNearbyRidesData(location);
      
      // Process queue
      if (uploadQueue.length > 0) {
        processUploadQueue();
      }
      
      Alert.alert(
        'You are now online!',
        'You will start receiving ride requests.',
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('Error going online:', error);
      Alert.alert(
        'Failed to go online',
        error.message || 'Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const goOffline = () => {
    Alert.alert(
      'Go Offline?',
      'You will stop receiving ride requests.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Go Offline', 
          style: 'destructive',
          onPress: confirmGoOffline 
        }
      ]
    );
  };

  const confirmGoOffline = async () => {
    try {
      // Update server status
      if (isConnected) {
        await apiClient.post(`/drivers/${driverId}/status`, {
          status: 'offline',
          timestamp: Date.now(),
        });
        
        realTimeService.emit('driver:availability', {
          driverId,
          isAvailable: false,
          status: 'offline',
        });
      }
      
      // Stop services
      stopLocationTracking();
      cleanupSocketSubscriptions();
      
      // Update state
      setIsOnline(false);
      setDriverStatus('offline');
      setNearbyRides([]);
      
      Alert.alert('You are now offline');
      
    } catch (error) {
      console.error('Error going offline:', error);
    }
  };

  // ============================================================================
  // CLEANUP
  // ============================================================================

  const cleanupSocketSubscriptions = () => {
    socketSubscriptions.current.forEach(unsubscribe => {
      if (typeof unsubscribe === 'function') unsubscribe();
    });
    socketSubscriptions.current = [];
  };

  const cleanup = useCallback(() => {
    if (locationWatchId.current) {
      Geolocation.clearWatch(locationWatchId.current);
      locationWatchId.current = null;
    }
    
    cleanupSocketSubscriptions();
    LocationService.cleanup();
    realTimeService.removeAllListeners();
    
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
  }, []);

  // ============================================================================
  // LIFECYCLE
  // ============================================================================

  useEffect(() => {
    initializeApp();
    
    // Network monitoring
    networkSubscription.current = NetInfo.addEventListener(state => {
      const connected = state.isConnected && state.isInternetReachable;
      setIsConnected(connected);
    });
    
    // App state monitoring
    appStateSubscription.current = AppState.addEventListener('change', handleAppStateChange);
    
    // Back handler
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    
    // Cleanup
    return () => {
      cleanup();
      if (networkSubscription.current) networkSubscription.current();
      if (appStateSubscription.current) appStateSubscription.current.remove();
      backHandler.remove();
    };
  }, []);

  const handleAppStateChange = (nextAppState) => {
    if (appState.match(/inactive|background/) && nextAppState === 'active') {
      // App came to foreground
      if (isOnline) {
        checkNetworkConnectivity();
        fetchNearbyRidesData();
      }
    }
    setAppState(nextAppState);
  };

  const handleBackPress = () => {
    if (activeRide) {
      Alert.alert(
        'Active Ride',
        'You have an active ride in progress.',
        [
          { text: 'Stay', style: 'cancel' },
          { 
            text: 'Exit Anyway', 
            style: 'destructive',
            onPress: () => BackHandler.exitApp() 
          }
        ]
      );
      return true;
    }
    return false;
  };

  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================

  const renderConnectionStatus = () => {
    let statusConfig = {
      color: '#FF6B6B',
      text: 'Offline',
      icon: 'cloud-off',
    };
    
    if (!isConnected) {
      statusConfig = {
        color: '#FBBC05',
        text: 'Offline • No Internet',
        icon: 'wifi-off',
      };
    } else if (isOnline) {
      if (connectionStatus === 'connected') {
        statusConfig = {
          color: '#06C167',
          text: 'Online • Live',
          icon: 'wifi',
        };
      } else {
        statusConfig = {
          color: '#FBBC05',
          text: 'Online • Connecting...',
          icon: 'wifi-strength-1',
        };
      }
    }
    
    return (
      <TouchableOpacity 
        style={styles.connectionStatus}
        onPress={checkNetworkConnectivity}
      >
        <MaterialIcon name={statusConfig.icon} size={14} color={statusConfig.color} />
        <Text style={[styles.connectionText, { color: statusConfig.color }]}>
          {statusConfig.text}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderNetworkBanner = () => {
    if (isConnected) return null;
    
    return (
      <View style={styles.networkBanner}>
        <MaterialIcon name="wifi-off" size={16} color="#FFF" />
        <Text style={styles.networkText}>
          No internet connection. Working in offline mode.
        </Text>
        <TouchableOpacity onPress={checkNetworkConnectivity}>
          <MaterialIcon name="refresh" size={16} color="#FFF" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderUploadQueueIndicator = () => {
    if (uploadQueue.length === 0 || isConnected) return null;
    
    return (
      <TouchableOpacity 
        style={styles.uploadQueueBanner}
        onPress={() => navigation.navigate('UploadQueue', { queue: uploadQueue })}
      >
        <MaterialIcon name="cloud-upload" size={16} color="#FFF" />
        <Text style={styles.uploadQueueText}>
          {uploadQueue.length} pending upload{uploadQueue.length !== 1 ? 's' : ''}
        </Text>
        {isUploading && (
          <ActivityIndicator size="small" color="#FFF" style={{ marginLeft: 8 }} />
        )}
      </TouchableOpacity>
    );
  };

  const renderStatsOverview = () => (
    <View style={styles.statsContainer}>
      <TouchableOpacity 
        style={styles.statItem}
        onPress={handleViewEarnings}
      >
        <Text style={styles.statValue}>{formatCurrency(earningsToday)}</Text>
        <Text style={styles.statLabel}>Today</Text>
      </TouchableOpacity>
      
      <View style={styles.statDivider} />
      
      <TouchableOpacity 
        style={styles.statItem}
        onPress={handleViewTripHistory}
      >
        <Text style={styles.statValue}>{ridesCompleted}</Text>
        <Text style={styles.statLabel}>Rides</Text>
      </TouchableOpacity>
      
      <View style={styles.statDivider} />
      
      <View style={styles.statItem}>
        <Text style={[
          styles.statValue,
          { color: driverStatus === 'on_trip' ? '#EA4335' : '#06C167' }
        ]}>
          {driverStatus === 'on_trip' ? 'On Trip' : 'Available'}
        </Text>
        <Text style={styles.statLabel}>Status</Text>
      </View>
    </View>
  );

  const renderRideCard = (ride) => (
    <TouchableOpacity
      key={ride.id}
      style={[
        styles.rideCard,
        selectedRideId === ride.id && styles.rideCardSelected
      ]}
      onPress={() => setSelectedRideId(ride.id)}
    >
      <View style={styles.rideCardHeader}>
        <View style={styles.riderAvatar}>
          <MaterialIcon name="person" size={16} color="#4285F4" />
        </View>
        <View style={styles.riderInfo}>
          <Text style={styles.riderName}>{ride.riderName || 'Customer'}</Text>
          <Text style={styles.rideDestination}>
            To: {ride.destination || 'Unknown'}
          </Text>
        </View>
        <View style={styles.rideMeta}>
          <Text style={styles.rideDistance}>{ride.displayDistance}</Text>
          <Text style={styles.rideTime}>{ride.estimatedTime}</Text>
        </View>
      </View>
      
      <View style={styles.rideCardBody}>
        <View style={styles.fareContainer}>
          <Text style={styles.fareLabel}>Fare:</Text>
          <Text style={styles.fareValue}>{formatCurrency(ride.fare)}</Text>
        </View>
        
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => handleAcceptRide(ride)}
        >
          <Text style={styles.acceptButtonText}>Accept</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const handleAcceptRide = (ride) => {
    Alert.alert(
      'Accept Ride?',
      `Accept ride from ${ride.riderName} for ${formatCurrency(ride.fare)}?`,
      [
        {
          text: 'Reject',
          style: 'destructive',
          onPress: () => {
            realTimeService.rejectRide(ride.id, driverId);
            setNearbyRides(prev => prev.filter(r => r.id !== ride.id));
          }
        },
        {
          text: 'Accept',
          onPress: () => {
            realTimeService.acceptRide(ride.id, driverId);
            setActiveRide(ride);
            setDriverStatus('busy');
            setNearbyRides(prev => prev.filter(r => r.id !== ride.id));
            navigation.navigate('RideRequest', { rideId: ride.id });
          }
        }
      ]
    );
  };

  const renderActiveRideBanner = () => {
    if (!activeRide) return null;
    
    return (
      <TouchableOpacity
        style={styles.activeRideBanner}
        onPress={() => navigation.navigate('ActiveRide', { rideId: activeRide.id })}
      >
        <View style={styles.activeRideContent}>
          <MaterialIcon name="directions-car" size={24} color="#FFF" />
          <View style={styles.activeRideInfo}>
            <Text style={styles.activeRideText}>Active Ride in Progress</Text>
            <Text style={styles.activeRideSubtext}>
              {activeRide.destination} • {formatCurrency(activeRide.fare)}
            </Text>
          </View>
          <MaterialIcon name="chevron-right" size={24} color="#FFF" />
        </View>
      </TouchableOpacity>
    );
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await initializeApp();
    setIsRefreshing(false);
  }, [initializeApp]);

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  if (loading && !region) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <ActivityIndicator size="large" color="#06C167" />
        <Text style={styles.loadingText}>Initializing driver app...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {renderNetworkBanner()}
      {renderUploadQueueIndicator()}
      
      <ScrollView
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#06C167']}
            tintColor="#06C167"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcon name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.driverName}>{driverName}</Text>
            {renderConnectionStatus()}
          </View>
          
          <TouchableOpacity onPress={handleViewProfile}>
            <MaterialIcon name="person" size={24} color="#06C167" />
          </TouchableOpacity>
        </View>

        {/* Stats Overview */}
        {isOnline && renderStatsOverview()}

        {/* Map */}
        <View style={styles.mapContainer}>
          <MapComponent
            ref={mapRef}
            region={region || defaultRegion}
            rides={nearbyRides}
            selectedRideId={selectedRideId}
            onSelectRide={setSelectedRideId}
            userLocation={currentLocation}
            showUserLocation={true}
            isDriver={true}
            driverStatus={driverStatus}
          />
          
          {lastLocationUpdate && (
            <View style={styles.locationTime}>
              <MaterialIcon name="access-time" size={12} color="#666" />
              <Text style={styles.locationTimeText}>
                Updated {Math.round((Date.now() - lastLocationUpdate) / 1000)}s ago
              </Text>
            </View>
          )}
        </View>

        {/* Online/Offline Control */}
        <View style={styles.controlSection}>
          <TouchableOpacity
            style={[
              styles.onlineButton,
              isOnline ? styles.offlineButton : styles.onlineButton,
              !isConnected && styles.disabledButton
            ]}
            onPress={isOnline ? goOffline : goOnline}
            disabled={loading || (!isConnected && !isOnline)}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <MaterialIcon 
                  name={isOnline ? "stop-circle" : "play-circle-filled"} 
                  size={24} 
                  color="#FFF" 
                />
                <Text style={styles.onlineButtonText}>
                  {isOnline ? "Go Offline" : "Go Online"}
                </Text>
              </>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.emergencyButton}
            onPress={handleEmergencyContact}
          >
            <MaterialIcon name="warning" size={20} color="#EA4335" />
          </TouchableOpacity>
        </View>

        {/* Nearby Rides */}
        {nearbyRides.length > 0 && (
          <View style={styles.ridesSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Nearby Rides ({nearbyRides.length})
              </Text>
              <TouchableOpacity onPress={() => setNearbyRides([])}>
                <Text style={styles.clearButton}>Clear</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.ridesScroll}
            >
              {nearbyRides.map(renderRideCard)}
            </ScrollView>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.quickAction}
            onPress={handleViewRideRequests}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#E8F5E9' }]}>
              <MaterialIcon name="notifications" size={24} color="#06C167" />
            </View>
            <Text style={styles.quickActionText}>Requests</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickAction}
            onPress={handleViewTripHistory}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#E3F2FD' }]}>
              <MaterialIcon name="history" size={24} color="#2196F3" />
            </View>
            <Text style={styles.quickActionText}>History</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickAction}
            onPress={handleViewVehicle}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#FFF3E0' }]}>
              <MaterialIcon name="directions-car" size={24} color="#FF9800" />
            </View>
            <Text style={styles.quickActionText}>Vehicle</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickAction}
            onPress={() => navigation.navigate('Support')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#F3E5F5' }]}>
              <MaterialIcon name="help" size={24} color="#9C27B0" />
            </View>
            <Text style={styles.quickActionText}>Help</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      {renderActiveRideBanner()}
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: '#F7F6F3'
  },
  scrollContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 12,
  },
  greeting: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  driverName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
  },
  connectionText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  networkBanner: {
    backgroundColor: '#FBBC05',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  networkText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
    marginHorizontal: 8,
    flex: 1,
  },
  uploadQueueBanner: {
    backgroundColor: '#4285F4',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadQueueText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: '70%',
    backgroundColor: '#F0F0F0',
    marginHorizontal: 8,
  },
  mapContainer: {
    height: 300,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  locationTime: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  locationTimeText: {
    fontSize: 11,
    color: '#666',
    marginLeft: 4,
    fontWeight: '500',
  },
  controlSection: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 20,
    alignItems: 'center',
  },
  onlineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#06C167',
    elevation: 3,
    shadowColor: '#06C167',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  offlineButton: {
    backgroundColor: '#EA4335',
    shadowColor: '#EA4335',
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
    shadowColor: '#999999',
  },
  onlineButtonText: {
    fontSize: 18,
    color: '#FFF',
    fontWeight: 'bold',
    marginLeft: 10,
  },
  emergencyButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  ridesSection: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  clearButton: {
    fontSize: 14,
    color: '#EA4335',
    fontWeight: '500',
  },
  ridesScroll: {
    flexGrow: 0,
  },
  rideCard: {
    width: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  rideCardSelected: {
    borderWidth: 2,
    borderColor: '#06C167',
    backgroundColor: '#F0F9F0',
  },
  rideCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  riderAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  riderInfo: {
    flex: 1,
  },
  riderName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 2,
  },
  rideDestination: {
    fontSize: 13,
    color: '#666',
  },
  rideMeta: {
    alignItems: 'flex-end',
  },
  rideDistance: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4285F4',
    marginBottom: 2,
  },
  rideTime: {
    fontSize: 12,
    color: '#666',
  },
  rideCardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fareContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  fareLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 4,
  },
  fareValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#EA4335',
  },
  acceptButton: {
    backgroundColor: '#06C167',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    elevation: 2,
  },
  acceptButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 16,
    marginBottom: 24,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    elevation: 2,
  },
  quickAction: {
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  activeRideBanner: {
    backgroundColor: '#06C167',
    padding: 16,
    elevation: 8,
    shadowColor: '#06C167',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  activeRideContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activeRideInfo: {
    flex: 1,
    marginHorizontal: 12,
  },
  activeRideText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  activeRideSubtext: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
  },
});