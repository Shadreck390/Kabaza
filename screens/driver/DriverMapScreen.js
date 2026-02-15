/**
 * ============================================================================
 * screens/driver/DriverMapScreen.js
 * ============================================================================

 * ============================================================================
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Animated,
  Alert,
  Platform,
  ScrollView,
  AppState,
  Linking,
  BackHandler,
  ActivityIndicator,
  Modal,
} from 'react-native';
import MapView, { 
  Marker, 
  PROVIDER_GOOGLE, 
  Polyline,
  Circle,
  Callout,
  UrlTile,
  Overlay,
  LocalTile,
} from 'react-native-maps';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import FontAwesomeIcon from 'react-native-vector-icons/FontAwesome';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Geolocation from 'react-native-geolocation-service';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from '@react-native-community/blur';
import Slider from '@react-native-community/slider';

// Services
import { 
  calculateRoute, 
  estimateFare, 
  getTrafficData,
  getWeatherData,
  downloadOfflineMap,
  getNavigationInstructions,
} from '../utils/location';
import { 
  acceptRideRequest, 
  rejectRideRequest, 
  updateDriverLocation,
  getActiveRide,
  completeRide,
  getRideRequests,
} from  '@services/ride/RideService'; 
import { 
  connectWebSocket, 
  disconnectWebSocket,
  subscribeToRideRequests,
  subscribeToRideUpdates,
  sendLocationUpdate,
} from '@services/socket/socketService';
import { checkPermissions, requestPermissions } from '@utils/permissions';
import { getDriverProfile, updateDriverStatus } from '@services/driver/driverService';
const { width, height } = Dimensions.get('window');

// Map configuration
const MAP_TYPES = {
  STANDARD: 'standard',
  SATELLITE: 'satellite',
  HYBRID: 'hybrid',
  TERRAIN: 'terrain',
};

const MAP_STYLES = [
  { id: 'standard', name: 'Standard', icon: 'map' },
  { id: 'satellite', name: 'Satellite', icon: 'satellite' },
  { id: 'hybrid', name: 'Hybrid', icon: 'layers' },
  { id: 'dark', name: 'Dark', icon: 'dark-mode' },
  { id: 'night', name: 'Night', icon: 'nightlight' },
];

const VEHICLE_TYPES = {
  KABAZA: 'kabaza',
  TAXI: 'taxi',
  COMFORT: 'comfort',
  GREEN: 'green',
  XL: 'xl',
};

export default function DriverMapScreen() {
  const navigation = useNavigation();
  const mapRef = useRef(null);
  const locationWatchId = useRef(null);
  const socketRef = useRef(null);
  const rideRequestTimerRef = useRef(null);
  const navigationTimerRef = useRef(null);
  
  // State Management
  const [driverStatus, setDriverStatus] = useState('offline'); // offline, online, on_trip, busy
  const [currentLocation, setCurrentLocation] = useState({
    latitude: -13.9626,
    longitude: 33.7741,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const [rideRequests, setRideRequests] = useState([]);
  const [activeRide, setActiveRide] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [navigationInstructions, setNavigationInstructions] = useState([]);
  const [currentInstruction, setCurrentInstruction] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigationProgress, setNavigationProgress] = useState(0);
  const [earningsToday, setEarningsToday] = useState(12500);
  const [rideCountToday, setRideCountToday] = useState(8);
  const [onlineHours, setOnlineHours] = useState(6.5);
  const [acceptanceRate, setAcceptanceRate] = useState(85);
  const [isConnected, setIsConnected] = useState(true);
  const [mapType, setMapType] = useState(MAP_TYPES.STANDARD);
  const [showMapControls, setShowMapControls] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const [vehicleType, setVehicleType] = useState(VEHICLE_TYPES.KABAZA);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [offlineMapRegion, setOfflineMapRegion] = useState(null);
  const [trafficData, setTrafficData] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [appState, setAppState] = useState(AppState.currentState);
  
  // Filters
  const [filterDistance, setFilterDistance] = useState(10); // km
  const [filterMinFare, setFilterMinFare] = useState(500);
  const [filterRideTypes, setFilterRideTypes] = useState(['kabaza', 'taxi']);
  const [filterPassengerRating, setFilterPassengerRating] = useState(3.5);
  
  // Animations
  const slideAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const mapOpacityAnim = useRef(new Animated.Value(1)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;
  
  // Stats
  const [stats, setStats] = useState({
    totalEarnings: 12500,
    totalRides: 8,
    onlineHours: 6.5,
    acceptanceRate: 85,
    cancellationRate: 5,
    rating: 4.8,
    peakHours: ['8-10 AM', '5-7 PM'],
    bestDay: 'Tuesday',
    averageFare: 1563,
    distanceDriven: 42.5,
  });

  // Load initial data
  useFocusEffect(
    useCallback(() => {
      initializeApp();
      return () => {
        cleanup();
      };
    }, [])
  );

  // App state monitoring
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  // Network monitoring
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const connected = state.isConnected && state.isInternetReachable;
      setIsConnected(connected);
      
      if (!connected) {
        enableOfflineMode();
      } else if (isOfflineMode) {
        disableOfflineMode();
      }
    });
    
    return () => unsubscribe();
  }, [isOfflineMode]);

  // Back button handling
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => backHandler.remove();
  }, [driverStatus, activeRide]);

  // Initialize app
  const initializeApp = async () => {
    try {
      // Check permissions
      await checkAndRequestPermissions();
      
      // Load driver profile
      await loadDriverProfile();
      
      // Load offline data
      await loadOfflineData();
      
      // Get current location
      await getCurrentLocation();
      
      // Connect to WebSocket
      await connectToWebSocket();
      
      // Load initial ride requests
      await loadRideRequests();
      
      // Start location tracking
      startLocationTracking();
      
      // Load traffic and weather data
      loadTrafficAndWeatherData();
      
      // Start earnings timer
      startOnlineTimer();
      
      // Check battery level
      checkBatteryLevel();
      
    } catch (error) {
      console.error('Initialization error:', error);
      Alert.alert('Initialization Error', 'Failed to initialize app. Please restart.');
    }
  };

  // Cleanup
  const cleanup = () => {
    stopLocationTracking();
    disconnectFromWebSocket();
    clearAllTimers();
    if (activeRide && driverStatus === 'on_trip') {
      updateDriverStatus('offline');
    }
  };

  // Handle app state changes
  const handleAppStateChange = (nextAppState) => {
    if (appState.match(/inactive|background/) && nextAppState === 'active') {
      // App came to foreground
      if (driverStatus === 'online' || driverStatus === 'on_trip') {
        resumeServices();
      }
    } else if (nextAppState.match(/inactive|background/)) {
      // App going to background
      if (driverStatus === 'online' || driverStatus === 'on_trip') {
        pauseServices();
      }
    }
    setAppState(nextAppState);
  };

  // Handle back button press
  const handleBackPress = () => {
    if (driverStatus === 'on_trip') {
      Alert.alert(
        'Active Ride',
        'You have an active ride. Are you sure you want to exit?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Exit', 
            style: 'destructive',
            onPress: () => {
              navigation.goBack();
            }
          }
        ]
      );
      return true;
    }
    
    if (showMapControls || showFilters) {
      setShowMapControls(false);
      setShowFilters(false);
      return true;
    }
    
    return false;
  };

  // Permission handling
  const checkAndRequestPermissions = async () => {
    try {
      const permissions = await checkPermissions([
        'location',
        'notification',
        'background_location',
      ]);
      
      if (!permissions.location) {
        const granted = await requestPermissions(['location', 'background_location']);
        if (!granted) {
          Alert.alert(
            'Permissions Required',
            'Kabaza needs location permissions to function properly.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() }
            ]
          );
        }
      }
    } catch (error) {
      console.error('Permission error:', error);
    }
  };

  // Load driver profile
  const loadDriverProfile = async () => {
    try {
      const profile = await getDriverProfile();
      if (profile) {
        setVehicleType(profile.vehicleType || VEHICLE_TYPES.KABAZA);
        setStats(prev => ({
          ...prev,
          rating: profile.rating || 4.8,
        }));
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  // Load offline data
  const loadOfflineData = async () => {
    try {
      const offlineData = await AsyncStorage.getItem('driver_map_data');
      if (offlineData) {
        const { region, requests, earnings } = JSON.parse(offlineData);
        setOfflineMapRegion(region);
        if (!isConnected) {
          setRideRequests(requests || []);
          setEarningsToday(earnings || 0);
        }
      }
    } catch (error) {
      console.error('Error loading offline data:', error);
    }
  };

  // Save offline data
  const saveOfflineData = async () => {
    try {
      const offlineData = {
        region: currentLocation,
        requests: rideRequests,
        earnings: earningsToday,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem('driver_map_data', JSON.stringify(offlineData));
    } catch (error) {
      console.error('Error saving offline data:', error);
    }
  };

  // Enable offline mode
  const enableOfflineMode = () => {
    setIsOfflineMode(true);
    setShowStats(false);
    Alert.alert(
      'Offline Mode',
      'You are offline. Some features may be limited.',
      [{ text: 'OK' }]
    );
  };

  // Disable offline mode
  const disableOfflineMode = () => {
    setIsOfflineMode(false);
    setShowStats(true);
    syncOfflineData();
  };

  // Sync offline data
  const syncOfflineData = async () => {
    // Sync any pending actions
    console.log('Syncing offline data...');
  };

  // Get current location
  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          const newLocation = {
            latitude,
            longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
            accuracy,
          };
          setCurrentLocation(newLocation);
          
          if (mapRef.current) {
            mapRef.current.animateToRegion(newLocation, 1000);
          }
          
          resolve(newLocation);
        },
        (error) => {
          console.error('Location error:', error);
          reject(error);
        },
        { 
          enableHighAccuracy: true, 
          timeout: 15000, 
          maximumAge: 10000 
        }
      );
    });
  };

  // Start location tracking
  const startLocationTracking = () => {
    if (locationWatchId.current) {
      Geolocation.clearWatch(locationWatchId.current);
    }

    locationWatchId.current = Geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy, heading, speed } = position.coords;
        const newLocation = {
          latitude,
          longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
          accuracy,
          heading,
          speed,
          timestamp: Date.now(),
        };
        
        setCurrentLocation(prev => ({
          ...prev,
          latitude,
          longitude,
        }));

        // Send location update via WebSocket
        if (socketRef.current && isConnected) {
          sendLocationUpdate(socketRef.current, {
            driverId: 'driver_001', // Get from auth
            location: newLocation,
            status: driverStatus,
            vehicleType,
            activeRideId: activeRide?.id,
          });
        }

        // Update navigation progress
        if (isNavigating && routeCoordinates.length > 0) {
          updateNavigationProgress(newLocation);
        }

        // Save location for offline mode
        if (isOfflineMode) {
          saveOfflineData();
        }
      },
      (error) => {
        console.error('Location tracking error:', error);
        handleLocationError(error);
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 10,
        interval: 5000,
        fastestInterval: 2000,
        showsBackgroundLocationIndicator: true,
        useSignificantChanges: false,
      }
    );
  };

  // Stop location tracking
  const stopLocationTracking = () => {
    if (locationWatchId.current) {
      Geolocation.clearWatch(locationWatchId.current);
      locationWatchId.current = null;
    }
  };

  // Handle location errors
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
        console.warn('Location unavailable');
        break;
      case 3: // TIMEOUT
        console.warn('Location request timeout');
        break;
    }
  };

  // Connect to WebSocket
  const connectToWebSocket = async () => {
    try {
      if (!isConnected) return;
      
      const socket = await connectWebSocket({
        driverId: 'driver_001', // Get from auth
        vehicleType,
        location: currentLocation,
      });
      
      socketRef.current = socket;
      
      // Subscribe to ride requests
      subscribeToRideRequests(socket, handleNewRideRequest);
      
      // Subscribe to ride updates
      subscribeToRideUpdates(socket, handleRideUpdate);
      
      // Handle connection events
      socket.on('connect', () => {
        console.log('WebSocket connected');
      });
      
      socket.on('disconnect', () => {
        console.log('WebSocket disconnected');
        Alert.alert('Connection Lost', 'Attempting to reconnect...');
      });
      
      socket.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
      
    } catch (error) {
      console.error('WebSocket connection error:', error);
    }
  };

  // Disconnect from WebSocket
  const disconnectFromWebSocket = () => {
    if (socketRef.current) {
      disconnectWebSocket(socketRef.current);
      socketRef.current = null;
    }
  };

  // Handle new ride request
  const handleNewRideRequest = (request) => {
    // Apply filters
    if (!passesFilters(request)) return;
    
    setRideRequests(prev => {
      const exists = prev.find(r => r.id === request.id);
      if (exists) return prev;
      
      const enrichedRequest = {
        ...request,
        expiresIn: 30, // seconds
        timestamp: Date.now(),
        isNew: true,
      };
      
      // Show notification
      showRideRequestNotification(enrichedRequest);
      
      return [...prev, enrichedRequest];
    });
  };

  // Handle ride updates
  const handleRideUpdate = (update) => {
    switch (update.type) {
      case 'ride_accepted':
        handleRideAccepted(update.ride);
        break;
      case 'ride_cancelled':
        handleRideCancelled(update.rideId, update.reason);
        break;
      case 'ride_completed':
        handleRideCompleted(update.ride);
        break;
      case 'passenger_location_update':
        handlePassengerLocationUpdate(update.location);
        break;
    }
  };

  // Load ride requests
  const loadRideRequests = async () => {
    try {
      if (!isConnected) return;
      
      const requests = await getRideRequests({
        location: currentLocation,
        radius: filterDistance,
        minFare: filterMinFare,
        vehicleTypes: filterRideTypes,
      });
      
      setRideRequests(requests.map(req => ({
        ...req,
        expiresIn: 30,
        timestamp: Date.now(),
        isNew: false,
      })));
    } catch (error) {
      console.error('Error loading ride requests:', error);
    }
  };

  // Filter passes check
  const passesFilters = (request) => {
    if (request.fare < filterMinFare) return false;
    if (!filterRideTypes.includes(request.rideType)) return false;
    if (request.passenger.rating < filterPassengerRating) return false;
    return true;
  };

  // Show ride request notification
  const showRideRequestNotification = (request) => {
    // Start pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      { iterations: 3 }
    ).start();
    
    // Play sound (in production)
    // playNotificationSound();
    
    // Vibrate (in production)
    // if (Platform.OS === 'android') {
    //   Vibration.vibrate(500);
    // }
  };

  // Toggle driver status
  const handleToggleStatus = async () => {
    if (driverStatus === 'on_trip') {
      Alert.alert(
        'Active Ride',
        'Please complete your current ride before going offline.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    const newStatus = driverStatus === 'online' ? 'offline' : 'online';
    
    if (newStatus === 'online') {
      // Check if we can go online
      const canGoOnline = await checkCanGoOnline();
      if (!canGoOnline) return;
    }
    
    try {
      await updateDriverStatus(newStatus);
      setDriverStatus(newStatus);
      
      if (newStatus === 'offline') {
        setRideRequests([]);
        Alert.alert('You\'re Offline', 'You will not receive ride requests.');
      } else {
        Alert.alert('You\'re Online', 'You will now receive ride requests.');
        loadRideRequests();
      }
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', 'Failed to update status. Please try again.');
    }
  };

  // Check if can go online
  const checkCanGoOnline = async () => {
    // Check location permission
    const hasLocationPermission = await checkPermissions(['location']);
    if (!hasLocationPermission) {
      Alert.alert(
        'Location Required',
        'Please enable location services to go online.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Enable', onPress: () => Linking.openSettings() }
        ]
      );
      return false;
    }
    
    // Check internet connection
    if (!isConnected) {
      Alert.alert(
        'No Internet',
        'Please check your internet connection.',
        [{ text: 'OK' }]
      );
      return false;
    }
    
    return true;
  };

  // Handle ride request press
  const handleRideRequestPress = async (request) => {
    setSelectedRequest(request);
    
    // Animate slide up
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    
    // Center map on pickup
    if (mapRef.current && request.pickup.coordinates) {
      mapRef.current.animateToRegion({
        latitude: request.pickup.coordinates.latitude,
        longitude: request.pickup.coordinates.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
    
    // Calculate route
    try {
      const route = await calculateRoute(
        currentLocation,
        request.pickup.coordinates
      );
      setRouteCoordinates(route.coordinates);
      setNavigationInstructions(route.instructions);
    } catch (error) {
      console.error('Route calculation error:', error);
    }
  };

  // Handle accept ride
  const handleAcceptRide = async (request) => {
    try {
      const response = await acceptRideRequest(request.id, {
        driverId: 'driver_001',
        estimatedArrival: calculateETA(request.pickup.coordinates),
        vehicleType,
      });
      
      if (response.success) {
        // Update state
        setActiveRide(request);
        setDriverStatus('on_trip');
        setRideRequests([]);
        setSelectedRequest(null);
        slideAnim.setValue(0);
        
        // Start navigation
        setIsNavigating(true);
        startNavigationToPickup(request.pickup.coordinates);
        
        // Update stats
        setStats(prev => ({
          ...prev,
          acceptanceRate: Math.min(100, prev.acceptanceRate + 1),
        }));
        
      } else {
        Alert.alert('Ride Taken', 'This ride has been taken by another driver.');
        setRideRequests(prev => prev.filter(r => r.id !== request.id));
      }
    } catch (error) {
      console.error('Error accepting ride:', error);
      Alert.alert('Error', 'Failed to accept ride. Please try again.');
    }
  };

  // Handle reject ride
  const handleRejectRide = async (requestId) => {
    try {
      await rejectRideRequest(requestId, 'Driver rejected');
      setRideRequests(prev => prev.filter(req => req.id !== requestId));
      setSelectedRequest(null);
      slideAnim.setValue(0);
      
      // Update stats
      setStats(prev => ({
        ...prev,
        acceptanceRate: Math.max(0, prev.acceptanceRate - 1),
        cancellationRate: prev.cancellationRate + 1,
      }));
    } catch (error) {
      console.error('Error rejecting ride:', error);
    }
  };

  // Calculate ETA
  const calculateETA = (destination) => {
    // Simple calculation - in production, use proper routing
    const distance = calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      destination.latitude,
      destination.longitude
    );
    
    const avgSpeed = 30; // km/h
    const timeMinutes = Math.round((distance / avgSpeed) * 60);
    return `${Math.max(3, timeMinutes)} min`;
  };

  // Calculate distance
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Start navigation to pickup
  const startNavigationToPickup = async (pickupCoordinates) => {
    try {
      // Get detailed route
      const route = await calculateRoute(currentLocation, pickupCoordinates, {
        mode: 'driving',
        alternatives: true,
        overview: 'full',
        steps: true,
      });
      
      setRouteCoordinates(route.coordinates);
      setNavigationInstructions(route.instructions);
      setCurrentInstruction(route.instructions[0]);
      
      // Start navigation timer
      startNavigationTimer(route.duration);
      
      // Show navigation started alert
      Alert.alert(
        'Navigation Started',
        `Navigating to pickup. Estimated time: ${route.duration}`,
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Navigation Error', 'Failed to start navigation.');
    }
  };

  // Update navigation progress
  const updateNavigationProgress = (currentLocation) => {
    if (routeCoordinates.length < 2) return;
    
    // Calculate progress along route
    // This is simplified - in production, use proper route matching
    const progress = calculateRouteProgress(currentLocation, routeCoordinates);
    setNavigationProgress(progress);
    
    // Update current instruction
    updateCurrentInstruction(currentLocation);
  };

  // Calculate route progress
  const calculateRouteProgress = (currentLocation, route) => {
    // Simplified progress calculation
    // In production, use proper route matching algorithms
    return Math.min(100, navigationProgress + 1);
  };

  // Update current instruction
  const updateCurrentInstruction = (currentLocation) => {
    if (navigationInstructions.length === 0) return;
    
    // Find current instruction based on location
    // This is simplified
    const currentIndex = Math.floor(navigationProgress / (100 / navigationInstructions.length));
    if (currentIndex < navigationInstructions.length) {
      setCurrentInstruction(navigationInstructions[currentIndex]);
    }
  };

  // Start navigation timer
  const startNavigationTimer = (estimatedDuration) => {
    if (navigationTimerRef.current) {
      clearInterval(navigationTimerRef.current);
    }
    
    let seconds = 0;
    navigationTimerRef.current = setInterval(() => {
      seconds++;
      setRideTimer(seconds);
    }, 1000);
  };

  // Handle ride accepted
  const handleRideAccepted = (ride) => {
    setActiveRide(ride);
    setDriverStatus('on_trip');
    setRideRequests([]);
  };

  // Handle ride cancelled
  const handleRideCancelled = (rideId, reason) => {
    if (activeRide?.id === rideId) {
      setActiveRide(null);
      setDriverStatus('online');
      setIsNavigating(false);
      Alert.alert('Ride Cancelled', reason || 'Ride was cancelled');
    }
  };

  // Handle ride completed
  const handleRideCompleted = (ride) => {
    // Update earnings
    setEarningsToday(prev => prev + ride.fare);
    setRideCountToday(prev => prev + 1);
    
    // Update stats
    setStats(prev => ({
      ...prev,
      totalEarnings: prev.totalEarnings + ride.fare,
      totalRides: prev.totalRides + 1,
    }));
    
    // Reset state
    setActiveRide(null);
    setDriverStatus('online');
    setIsNavigating(false);
    setRouteCoordinates([]);
    setNavigationInstructions([]);
    setCurrentInstruction(null);
    setNavigationProgress(0);
    
    // Show completion alert
    Alert.alert(
      'Ride Completed!',
      `You earned MK ${ride.fare}. Thank you for the ride!`,
      [{ text: 'OK' }]
    );
  };

  // Handle passenger location update
  const handlePassengerLocationUpdate = (location) => {
    // Update passenger location on map
    console.log('Passenger location update:', location);
  };

  // Handle end ride
  const handleEndRide = () => {
    Alert.alert(
      'End Ride',
      'Are you sure you want to end this ride?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Ride',
          style: 'destructive',
          onPress: async () => {
            try {
              if (activeRide) {
                await completeRide(activeRide.id);
                handleRideCompleted(activeRide);
              }
            } catch (error) {
              console.error('Error ending ride:', error);
              Alert.alert('Error', 'Failed to end ride.');
            }
          }
        },
      ]
    );
  };

  // Handle go to current location
  const handleGoToCurrentLocation = () => {
    if (mapRef.current && currentLocation) {
      mapRef.current.animateToRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  };

  // Handle map type change
  const handleMapTypeChange = (type) => {
    setMapType(type);
    setShowMapControls(false);
  };

  // Handle filter change
  const handleFilterChange = (filters) => {
    setFilterDistance(filters.distance);
    setFilterMinFare(filters.minFare);
    setFilterRideTypes(filters.rideTypes);
    setFilterPassengerRating(filters.passengerRating);
    setShowFilters(false);
    
    // Reload requests with new filters
    loadRideRequests();
  };

  // Handle emergency mode
  const handleEmergencyMode = () => {
    setEmergencyMode(true);
    
    // Flash screen red
    Animated.loop(
      Animated.sequence([
        Animated.timing(mapOpacityAnim, {
          toValue: 0.3,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(mapOpacityAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
    
    // Send emergency alert
    sendEmergencyAlert();
    
    Alert.alert(
      'EMERGENCY MODE ACTIVATED',
      'Help has been alerted. Your location is being shared with emergency contacts.',
      [
        {
          text: 'Cancel Emergency',
          style: 'destructive',
          onPress: () => {
            setEmergencyMode(false);
            mapOpacityAnim.setValue(1);
          }
        },
        { text: 'Call Police', onPress: () => Linking.openURL('tel:997') }
      ]
    );
  };

  // Send emergency alert
  const sendEmergencyAlert = () => {
    // In production, send to server and emergency contacts
    console.log('Emergency alert sent:', currentLocation);
  };

  // Load traffic and weather data
  const loadTrafficAndWeatherData = async () => {
    if (!isConnected) return;
    
    try {
      const [traffic, weather] = await Promise.all([
        getTrafficData(currentLocation),
        getWeatherData(currentLocation),
      ]);
      
      setTrafficData(traffic);
      setWeatherData(weather);
    } catch (error) {
      console.error('Error loading traffic/weather:', error);
    }
  };

  // Start online timer
  const startOnlineTimer = () => {
    if (driverStatus !== 'online' && driverStatus !== 'on_trip') return;
    
    const startTime = Date.now();
    
    const timer = setInterval(() => {
      const elapsedHours = (Date.now() - startTime) / (1000 * 60 * 60);
      setOnlineHours(prev => prev + (elapsedHours / 3600)); // Update every second
    }, 1000);
    
    return () => clearInterval(timer);
  };

  // Check battery level
  const checkBatteryLevel = () => {
    // In production, use battery level API
    // For now, simulate battery drain
    const interval = setInterval(() => {
      setBatteryLevel(prev => Math.max(10, prev - 0.1));
    }, 60000); // Update every minute
    
    return () => clearInterval(interval);
  };

  // Clear all timers
  const clearAllTimers = () => {
    if (rideRequestTimerRef.current) {
      clearInterval(rideRequestTimerRef.current);
    }
    if (navigationTimerRef.current) {
      clearInterval(navigationTimerRef.current);
    }
  };

  // Resume services
  const resumeServices = () => {
    startLocationTracking();
    if (socketRef.current) {
      socketRef.current.connect();
    }
  };

  // Pause services
  const pauseServices = () => {
    stopLocationTracking();
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  };

  // Render status indicator
  const renderStatusIndicator = () => {
    const statusConfig = {
      online: { color: '#22C55E', text: 'Online', icon: 'check-circle' },
      offline: { color: '#6B7280', text: 'Offline', icon: 'cancel' },
      on_trip: { color: '#3B82F6', text: 'On Trip', icon: 'directions-car' },
      busy: { color: '#F59E0B', text: 'Busy', icon: 'schedule' },
    };
    
    const config = statusConfig[driverStatus] || statusConfig.offline;
    
    return (
      <TouchableOpacity 
        style={[styles.statusIndicator, { backgroundColor: `${config.color}15` }]}
        onPress={handleToggleStatus}
      >
        <View style={[styles.statusDot, { backgroundColor: config.color }]} />
        <Text style={[styles.statusText, { color: config.color }]}>{config.text}</Text>
        <MaterialIcon name={config.icon} size={16} color={config.color} />
      </TouchableOpacity>
    );
  };

  // Render network indicator
  const renderNetworkIndicator = () => {
    return (
      <TouchableOpacity 
        style={[
          styles.networkIndicator,
          { backgroundColor: isConnected ? '#22C55E15' : '#EF444415' }
        ]}
        onPress={() => Alert.alert('Network', isConnected ? 'Connected' : 'Disconnected')}
      >
        <MaterialIcon 
          name={isConnected ? 'wifi' : 'wifi-off'} 
          size={16} 
          color={isConnected ? '#22C55E' : '#EF4444'} 
        />
        {isOfflineMode && (
          <Text style={[styles.networkText, { color: '#EF4444' }]}>Offline</Text>
        )}
      </TouchableOpacity>
    );
  };

  // Render battery indicator
  const renderBatteryIndicator = () => {
    let batteryColor = '#22C55E';
    if (batteryLevel < 20) batteryColor = '#EF4444';
    else if (batteryLevel < 50) batteryColor = '#F59E0B';
    
    return (
      <View style={styles.batteryIndicator}>
        <MaterialIcon 
          name="battery-full" 
          size={16} 
          color={batteryColor} 
        />
        <Text style={[styles.batteryText, { color: batteryColor }]}>
          {Math.round(batteryLevel)}%
        </Text>
      </View>
    );
  };

  // Render weather indicator
  const renderWeatherIndicator = () => {
    if (!weatherData) return null;
    
    return (
      <View style={styles.weatherIndicator}>
        <MaterialIcon name="wb-sunny" size={16} color="#F59E0B" />
        <Text style={styles.weatherText}>{weatherData.temperature}°C</Text>
      </View>
    );
  };

  // Render stats panel
  const renderStatsPanel = () => {
    if (!showStats) return null;
    
    return (
      <Animated.View 
        style={[
          styles.statsPanel,
          { 
            opacity: fadeAnim,
            transform: [{ translateY: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [-20, 0],
            })}]
          }
        ]}
      >
        <TouchableOpacity 
          style={styles.statsHeader}
          onPress={() => setShowStats(false)}
        >
          <Text style={styles.statsTitle}>Today's Stats</Text>
          <MaterialIcon name="expand-less" size={20} color="#666" />
        </TouchableOpacity>
        
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <MaterialIcon name="attach-money" size={20} color="#22C55E" />
            <Text style={styles.statValue}>MK {earningsToday.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Earnings</Text>
          </View>
          
          <View style={styles.statItem}>
            <MaterialIcon name="directions-car" size={20} color="#3B82F6" />
            <Text style={styles.statValue}>{rideCountToday}</Text>
            <Text style={styles.statLabel}>Rides</Text>
          </View>
          
          <View style={styles.statItem}>
            <MaterialIcon name="timer" size={20} color="#F59E0B" />
            <Text style={styles.statValue}>{onlineHours.toFixed(1)}h</Text>
            <Text style={styles.statLabel}>Online</Text>
          </View>
          
          <View style={styles.statItem}>
            <MaterialIcon name="trending-up" size={20} color="#8B5CF6" />
            <Text style={styles.statValue}>{acceptanceRate}%</Text>
            <Text style={styles.statLabel}>Acceptance</Text>
          </View>
        </View>
      </Animated.View>
    );
  };

  // Render ride request card
  const renderRideRequestCard = (request) => {
    const isSelected = selectedRequest?.id === request.id;
    const isExpiring = request.expiresIn < 10;
    
    return (
      <Animated.View
        key={request.id}
        style={[
          styles.rideRequestCard,
          isSelected && styles.rideRequestCardSelected,
          request.isNew && { transform: [{ scale: bounceAnim }] }
        ]}
      >
        <TouchableOpacity
          style={styles.rideRequestContent}
          onPress={() => handleRideRequestPress(request)}
          activeOpacity={0.8}
        >
          <View style={styles.requestHeader}>
            <View style={styles.passengerInfo}>
              <View style={styles.passengerAvatar}>
                <Text style={styles.passengerInitials}>
                  {request.passenger.name.split(' ').map(n => n[0]).join('')}
                </Text>
              </View>
              <View>
                <Text style={styles.passengerName}>{request.passenger.name}</Text>
                <View style={styles.ratingContainer}>
                  <MaterialIcon name="star" size={12} color="#F59E0B" />
                  <Text style={styles.ratingText}>{request.passenger.rating}</Text>
                  {request.passenger.verified && (
                    <MaterialIcon name="verified" size={12} color="#22C55E" />
                  )}
                </View>
              </View>
            </View>
            
            <View style={styles.fareContainer}>
              <Text style={styles.fareAmount}>MK {request.fare}</Text>
              <View style={styles.rideTypeBadge}>
                <Text style={styles.rideTypeText}>{request.rideType}</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.requestDetails}>
            <View style={styles.locationRow}>
              <MaterialIcon name="location-pin" size={16} color="#3B82F6" />
              <Text style={styles.locationText} numberOfLines={1}>
                {request.pickup.name}
              </Text>
            </View>
            
            <View style={styles.locationRow}>
              <MaterialIcon name="place" size={16} color="#EF4444" />
              <Text style={styles.locationText} numberOfLines={1}>
                {request.destination.name}
              </Text>
            </View>
          </View>
          
          <View style={styles.requestFooter}>
            <View style={styles.distanceInfo}>
              <MaterialIcon name="map" size={14} color="#666" />
              <Text style={styles.distanceText}>{request.distance}</Text>
              <MaterialIcon name="access-time" size={14} color="#666" />
              <Text style={styles.distanceText}>{request.duration}</Text>
            </View>
            
            <View style={[
              styles.timerContainer,
              isExpiring && styles.timerContainerExpiring
            ]}>
              <MaterialIcon name="timer" size={14} color={isExpiring ? '#EF4444' : '#666'} />
              <Text style={[
                styles.timerText,
                isExpiring && styles.timerTextExpiring
              ]}>
                {request.expiresIn}s
              </Text>
            </View>
          </View>
        </TouchableOpacity>
        
        {request.isNew && (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>NEW</Text>
          </View>
        )}
      </Animated.View>
    );
  };

  // Render selected request detail
  const renderSelectedRequestDetail = () => {
    if (!selectedRequest) return null;
    
    const translateY = slideAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [500, 0],
    });
    
    return (
      <Animated.View 
        style={[
          styles.requestDetailContainer,
          { transform: [{ translateY }] }
        ]}
      >
        <View style={styles.detailHandle}>
          <View style={styles.handleBar} />
        </View>
        
        <ScrollView 
          style={styles.detailContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.detailHeader}>
            <Text style={styles.detailTitle}>Ride Request</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => {
                setSelectedRequest(null);
                Animated.timing(slideAnim, {
                  toValue: 0,
                  duration: 300,
                  useNativeDriver: true,
                }).start();
              }}
            >
              <MaterialIcon name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.passengerDetail}>
            <View style={styles.passengerAvatarLarge}>
              <Text style={styles.passengerInitialsLarge}>
                {selectedRequest.passenger.name.split(' ').map(n => n[0]).join('')}
              </Text>
            </View>
            <View style={styles.passengerInfoDetail}>
              <Text style={styles.passengerNameLarge}>{selectedRequest.passenger.name}</Text>
              <View style={styles.ratingContainerLarge}>
                <MaterialIcon name="star" size={16} color="#F59E0B" />
                <Text style={styles.ratingTextLarge}>{selectedRequest.passenger.rating}</Text>
                <Text style={styles.ridesText}>• 124 rides</Text>
                {selectedRequest.passenger.verified && (
                  <MaterialIcon name="verified" size={16} color="#22C55E" />
                )}
              </View>
              <Text style={styles.passengerNote}>
                {selectedRequest.passenger.notes || 'No special requests'}
              </Text>
            </View>
          </View>
          
          <View style={styles.routeDetail}>
            <View style={styles.routeStop}>
              <View style={[styles.stopIcon, { backgroundColor: '#3B82F6' }]} />
              <View style={styles.stopInfo}>
                <Text style={styles.stopLabel}>Pickup</Text>
                <Text style={styles.stopAddress}>{selectedRequest.pickup.address}</Text>
                <Text style={styles.stopNotes}>
                  {selectedRequest.pickup.notes || 'Meet at entrance'}
                </Text>
              </View>
            </View>
            
            <View style={styles.routeLine}>
              <View style={styles.routeLineDot} />
              <View style={styles.routeLineDot} />
              <View style={styles.routeLineDot} />
            </View>
            
            <View style={styles.routeStop}>
              <View style={[styles.stopIcon, { backgroundColor: '#EF4444' }]} />
              <View style={styles.stopInfo}>
                <Text style={styles.stopLabel}>Destination</Text>
                <Text style={styles.stopAddress}>{selectedRequest.destination.address}</Text>
                <Text style={styles.stopNotes}>
                  {selectedRequest.destination.notes || 'Drop off at main gate'}
                </Text>
              </View>
            </View>
          </View>
          
          <View style={styles.fareDetail}>
            <View style={styles.fareRow}>
              <Text style={styles.fareLabel}>Fare Estimate</Text>
              <Text style={styles.fareValue}>MK {selectedRequest.fare}</Text>
            </View>
            
            <View style={styles.fareRow}>
              <Text style={styles.fareLabel}>Distance</Text>
              <Text style={styles.fareValue}>{selectedRequest.distance}</Text>
            </View>
            
            <View style={styles.fareRow}>
              <Text style={styles.fareLabel}>Duration</Text>
              <Text style={styles.fareValue}>{selectedRequest.duration}</Text>
            </View>
            
            <View style={styles.fareRow}>
              <Text style={styles.fareLabel}>Vehicle Type</Text>
              <View style={styles.vehicleTypeBadge}>
                <Text style={styles.vehicleTypeText}>{selectedRequest.rideType}</Text>
              </View>
            </View>
          </View>
          
          {routeCoordinates.length > 0 && (
            <View style={styles.routePreview}>
              <Text style={styles.routePreviewTitle}>Route Preview</Text>
              <View style={styles.routeStats}>
                <View style={styles.routeStat}>
                  <MaterialIcon name="map" size={16} color="#666" />
                  <Text style={styles.routeStatText}>
                    {calculateRouteDistance(routeCoordinates)} km
                  </Text>
                </View>
                <View style={styles.routeStat}>
                  <MaterialIcon name="access-time" size={16} color="#666" />
                  <Text style={styles.routeStatText}>
                    {calculateRouteTime(routeCoordinates)} min
                  </Text>
                </View>
                <View style={styles.routeStat}>
                  <MaterialIcon name="attach-money" size={16} color="#666" />
                  <Text style={styles.routeStatText}>
                    MK {estimateFuelCost(routeCoordinates)}
                  </Text>
                </View>
              </View>
            </View>
          )}
          
          {trafficData && (
            <View style={styles.trafficInfo}>
              <MaterialIcon name="traffic" size={16} color="#F59E0B" />
              <Text style={styles.trafficText}>
                {trafficData.condition} • {trafficData.delay} min delay
              </Text>
            </View>
          )}
        </ScrollView>
        
        <View style={styles.detailActions}>
          <TouchableOpacity 
            style={styles.rejectButton}
            onPress={() => handleRejectRide(selectedRequest.id)}
          >
            <MaterialIcon name="close" size={20} color="#EF4444" />
            <Text style={styles.rejectButtonText}>Reject</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.acceptButton}
            onPress={() => handleAcceptRide(selectedRequest)}
          >
            <MaterialIcon name="check" size={20} color="#FFFFFF" />
            <Text style={styles.acceptButtonText}>Accept</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  // Render active ride info
  const renderActiveRideInfo = () => {
    if (!activeRide || !isNavigating) return null;
    
    return (
      <View style={styles.activeRideContainer}>
        <View style={styles.activeRideHeader}>
          <View>
            <Text style={styles.activeRideTitle}>Navigating to Pickup</Text>
            <Text style={styles.activeRideSubtitle}>
              Passenger: {activeRide.passenger.name}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.endRideButton}
            onPress={handleEndRide}
          >
            <Text style={styles.endRideText}>End Ride</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.activeRideContent}>
          <View style={styles.navigationProgress}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill,
                  { width: `${navigationProgress}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {Math.round(navigationProgress)}% complete
            </Text>
          </View>
          
          {currentInstruction && (
            <View style={styles.navigationInstruction}>
              <MaterialIcon 
                name={getInstructionIcon(currentInstruction.type)} 
                size={24} 
                color="#3B82F6" 
              />
              <Text style={styles.instructionText}>
                {currentInstruction.text}
              </Text>
              <Text style={styles.instructionDistance}>
                {currentInstruction.distance}
              </Text>
            </View>
          )}
          
          <View style={styles.rideInfo}>
            <View style={styles.rideInfoItem}>
              <MaterialIcon name="attach-money" size={16} color="#22C55E" />
              <Text style={styles.rideInfoText}>MK {activeRide.fare}</Text>
            </View>
            <View style={styles.rideInfoItem}>
              <MaterialIcon name="map" size={16} color="#3B82F6" />
              <Text style={styles.rideInfoText}>
                {calculateDistance(
                  currentLocation.latitude,
                  currentLocation.longitude,
                  activeRide.pickup.coordinates.latitude,
                  activeRide.pickup.coordinates.longitude
                ).toFixed(1)} km
              </Text>
            </View>
            <View style={styles.rideInfoItem}>
              <MaterialIcon name="timer" size={16} color="#F59E0B" />
              <Text style={styles.rideInfoText}>{rideTimer}s</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  // Render map controls
  const renderMapControls = () => {
    if (showMapControls) {
      return (
        <View style={styles.mapControlsPanel}>
          <Text style={styles.mapControlsTitle}>Map Style</Text>
          <View style={styles.mapStyleGrid}>
            {MAP_STYLES.map(style => (
              <TouchableOpacity
                key={style.id}
                style={[
                  styles.mapStyleButton,
                  mapType === style.id && styles.mapStyleButtonActive,
                ]}
                onPress={() => handleMapTypeChange(style.id)}
              >
                <MaterialIcon 
                  name={style.icon} 
                  size={24} 
                  color={mapType === style.id ? '#FFFFFF' : '#666'} 
                />
                <Text style={[
                  styles.mapStyleText,
                  mapType === style.id && styles.mapStyleTextActive,
                ]}>
                  {style.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <View style={styles.mapLayerControls}>
            <Text style={styles.layerTitle}>Map Layers</Text>
            <View style={styles.layerOptions}>
              <TouchableOpacity style={styles.layerOption}>
                <MaterialIcon name="traffic" size={20} color="#666" />
                <Text style={styles.layerText}>Traffic</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.layerOption}>
                <MaterialIcon name="transit-enterexit" size={20} color="#666" />
                <Text style={styles.layerText}>Transit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.layerOption}>
                <MaterialIcon name="terrain" size={20} color="#666" />
                <Text style={styles.layerText}>Terrain</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }
    
    return (
      <TouchableOpacity 
        style={styles.mapControlsButton}
        onPress={() => setShowMapControls(true)}
      >
        <MaterialIcon name="layers" size={24} color="#000000" />
      </TouchableOpacity>
    );
  };

  // Render filters
  const renderFilters = () => {
    if (showFilters) {
      return (
        <Modal
          animationType="slide"
          transparent={true}
          visible={showFilters}
          onRequestClose={() => setShowFilters(false)}
        >
          <View style={styles.filterModal}>
            <View style={styles.filterContent}>
              <View style={styles.filterHeader}>
                <Text style={styles.filterTitle}>Ride Filters</Text>
                <TouchableOpacity onPress={() => setShowFilters(false)}>
                  <MaterialIcon name="close" size={24} color="#000" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.filterBody}>
                <View style={styles.filterSection}>
                  <Text style={styles.filterLabel}>Maximum Distance (km)</Text>
                  <View style={styles.filterValueContainer}>
                    <Text style={styles.filterValue}>{filterDistance} km</Text>
                  </View>
                  <Slider
                    style={styles.filterSlider}
                    minimumValue={1}
                    maximumValue={50}
                    step={1}
                    value={filterDistance}
                    onValueChange={setFilterDistance}
                    minimumTrackTintColor="#22C55E"
                    maximumTrackTintColor="#E5E7EB"
                    thumbTintColor="#22C55E"
                  />
                </View>
                
                <View style={styles.filterSection}>
                  <Text style={styles.filterLabel}>Minimum Fare (MK)</Text>
                  <View style={styles.filterValueContainer}>
                    <Text style={styles.filterValue}>MK {filterMinFare}</Text>
                  </View>
                  <Slider
                    style={styles.filterSlider}
                    minimumValue={100}
                    maximumValue={5000}
                    step={100}
                    value={filterMinFare}
                    onValueChange={setFilterMinFare}
                    minimumTrackTintColor="#22C55E"
                    maximumTrackTintColor="#E5E7EB"
                    thumbTintColor="#22C55E"
                  />
                </View>
                
                <View style={styles.filterSection}>
                  <Text style={styles.filterLabel}>Passenger Minimum Rating</Text>
                  <View style={styles.filterValueContainer}>
                    <Text style={styles.filterValue}>{filterPassengerRating}</Text>
                  </View>
                  <Slider
                    style={styles.filterSlider}
                    minimumValue={1}
                    maximumValue={5}
                    step={0.1}
                    value={filterPassengerRating}
                    onValueChange={setFilterPassengerRating}
                    minimumTrackTintColor="#22C55E"
                    maximumTrackTintColor="#E5E7EB"
                    thumbTintColor="#22C55E"
                  />
                </View>
                
                <View style={styles.filterSection}>
                  <Text style={styles.filterLabel}>Vehicle Types</Text>
                  <View style={styles.vehicleTypeFilters}>
                    {Object.values(VEHICLE_TYPES).map(type => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.vehicleTypeFilter,
                          filterRideTypes.includes(type) && styles.vehicleTypeFilterActive,
                        ]}
                        onPress={() => {
                          const newTypes = filterRideTypes.includes(type)
                            ? filterRideTypes.filter(t => t !== type)
                            : [...filterRideTypes, type];
                          setFilterRideTypes(newTypes);
                        }}
                      >
                        <Text style={[
                          styles.vehicleTypeFilterText,
                          filterRideTypes.includes(type) && styles.vehicleTypeFilterTextActive,
                        ]}>
                          {type}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </ScrollView>
              
              <View style={styles.filterFooter}>
                <TouchableOpacity 
                  style={styles.filterResetButton}
                  onPress={() => {
                    setFilterDistance(10);
                    setFilterMinFare(500);
                    setFilterPassengerRating(3.5);
                    setFilterRideTypes(['kabaza', 'taxi']);
                  }}
                >
                  <Text style={styles.filterResetText}>Reset</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.filterApplyButton}
                  onPress={() => handleFilterChange({
                    distance: filterDistance,
                    minFare: filterMinFare,
                    passengerRating: filterPassengerRating,
                    rideTypes: filterRideTypes,
                  })}
                >
                  <Text style={styles.filterApplyText}>Apply Filters</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      );
    }
    
    return (
      <TouchableOpacity 
        style={styles.filterButton}
        onPress={() => setShowFilters(true)}
      >
        <MaterialIcon name="filter-list" size={24} color="#000000" />
        {filterDistance !== 10 || filterMinFare !== 500 ? (
          <View style={styles.filterBadge}>
            <Text style={styles.filterBadgeText}>!</Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  // Render emergency button
  const renderEmergencyButton = () => {
    if (emergencyMode) return null;
    
    return (
      <TouchableOpacity 
        style={styles.emergencyButton}
        onPress={handleEmergencyMode}
        onLongPress={() => {
          Alert.alert('Emergency', 'Long press for immediate police call');
          Linking.openURL('tel:997');
        }}
      >
        <MaterialIcon name="warning" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    );
  };

  // Render offline mode indicator
  const renderOfflineModeIndicator = () => {
    if (!isOfflineMode) return null;
    
    return (
      <View style={styles.offlineModeIndicator}>
        <MaterialIcon name="cloud-off" size={16} color="#EF4444" />
        <Text style={styles.offlineModeText}>Offline Mode</Text>
      </View>
    );
  };

  // Helper functions
  const getInstructionIcon = (type) => {
    switch(type) {
      case 'turn-left': return 'turn-left';
      case 'turn-right': return 'turn-right';
      case 'continue': return 'straight';
      case 'arrive': return 'flag';
      case 'merge': return 'merge';
      default: return 'navigation';
    }
  };

  const calculateRouteDistance = (coordinates) => {
    // Simplified calculation
    return (coordinates.length * 0.01).toFixed(1);
  };

  const calculateRouteTime = (coordinates) => {
    // Simplified calculation
    return Math.round(coordinates.length * 0.5);
  };

  const estimateFuelCost = (coordinates) => {
    // Simplified calculation
    return Math.round(coordinates.length * 0.1 * 1500);
  };

  return (
    <View style={styles.container}>
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor="transparent" 
        translucent 
      />

      {/* Map */}
      <Animated.View style={[styles.mapContainer, { opacity: emergencyMode ? mapOpacityAnim : 1 }]}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          region={currentLocation}
          showsUserLocation={true}
          showsMyLocationButton={false}
          showsCompass={true}
          showsScale={true}
          showsTraffic={!isOfflineMode}
          showsIndoors={false}
          mapType={mapType}
          zoomControlEnabled={true}
          zoomEnabled={true}
          rotateEnabled={true}
          scrollEnabled={true}
          pitchEnabled={true}
          toolbarEnabled={false}
          loadingEnabled={true}
          loadingIndicatorColor="#22C55E"
          loadingBackgroundColor="#FFFFFF"
        >
          {/* Driver Location */}
          {currentLocation && (
            <Marker
              coordinate={currentLocation}
              title="Your Location"
              flat={true}
              anchor={{ x: 0.5, y: 0.5 }}
              rotation={currentLocation.heading || 0}
            >
              <Animated.View style={[
                styles.driverMarker,
                { transform: [{ scale: pulseAnim }] }
              ]}>
                <MaterialCommunityIcon 
                  name={vehicleType === VEHICLE_TYPES.KABAZA ? "bike" : "car"} 
                  size={24} 
                  color="#FFFFFF" 
                />
              </Animated.View>
            </Marker>
          )}

          {/* Ride Request Markers */}
          {rideRequests.map(request => (
            <Marker
              key={request.id}
              coordinate={request.pickup.coordinates}
              title="Ride Request"
              onPress={() => handleRideRequestPress(request)}
            >
              <Animated.View style={[
                styles.rideRequestMarker,
                { transform: [{ scale: pulseAnim }] }
              ]}>
                <MaterialIcon name="person-pin" size={30} color="#22C55E" />
                <View style={styles.markerPulse} />
              </Animated.View>
            </Marker>
          ))}

          {/* Route Polyline */}
          {routeCoordinates.length > 0 && (
            <Polyline
              coordinates={routeCoordinates}
              strokeWidth={4}
              strokeColor="#3B82F6"
              lineDashPattern={[10, 20]}
            />
          )}

          {/* Traffic Overlay */}
          {trafficData && !isOfflineMode && (
            <UrlTile
              urlTemplate={trafficData.tileUrl}
              maximumZ={19}
              flipY={false}
            />
          )}

          {/* Offline Map Tiles */}
          {isOfflineMode && offlineMapRegion && (
            <LocalTile
              pathTemplate={offlineMapRegion.tilePath}
              tileSize={256}
              zIndex={-1}
            />
          )}
        </MapView>
      </Animated.View>

      {/* Top Controls */}
      <View style={styles.topControls}>
        {/* Status Indicators */}
        <View style={styles.topLeftControls}>
          {renderStatusIndicator()}
          {renderNetworkIndicator()}
          {renderBatteryIndicator()}
          {renderWeatherIndicator()}
        </View>
        
        {/* Earnings Display */}
        <TouchableOpacity 
          style={styles.earningsCard}
          onPress={() => navigation.navigate('DriverEarnings')}
        >
          <MaterialIcon name="attach-money" size={16} color="#22C55E" />
          <Text style={styles.earningsText}>MK {earningsToday.toLocaleString()}</Text>
          <Text style={styles.ridesText}>• {rideCountToday} rides</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Panel */}
      {renderStatsPanel()}

      {/* Ride Requests List */}
      {driverStatus === 'online' && rideRequests.length > 0 && (
        <View style={styles.requestsContainer}>
          <View style={styles.requestsHeader}>
            <View style={styles.requestsTitleContainer}>
              <Text style={styles.requestsTitle}>
                Ride Requests ({rideRequests.length})
              </Text>
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <MaterialIcon name="notifications-active" size={20} color="#EF4444" />
              </Animated.View>
            </View>
            <TouchableOpacity 
              style={styles.clearRequestsButton}
              onPress={() => setRideRequests([])}
            >
              <Text style={styles.clearRequestsText}>Clear All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.requestsList}
          >
            {rideRequests.map(renderRideRequestCard)}
          </ScrollView>
        </View>
      )}

      {/* Bottom Controls */}
      <View style={styles.bottomControls}>
        <View style={styles.controlRow}>
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={handleGoToCurrentLocation}
          >
            <MaterialIcon name="my-location" size={24} color="#000000" />
          </TouchableOpacity>
          
          {renderMapControls()}
          
          {renderFilters()}
          
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={() => navigation.navigate('DriverSchedule')}
          >
            <MaterialIcon name="schedule" size={24} color="#000000" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={() => navigation.navigate('DriverSupport')}
          >
            <MaterialIcon name="help" size={24} color="#000000" />
          </TouchableOpacity>
        </View>
        
        {renderEmergencyButton()}
      </View>

      {/* Offline Mode Indicator */}
      {renderOfflineModeIndicator()}

      {/* Selected Ride Request Detail */}
      {renderSelectedRequestDetail()}

      {/* Active Ride Info */}
      {renderActiveRideInfo()}

      {/* Emergency Overlay */}
      {emergencyMode && (
        <View style={styles.emergencyOverlay}>
          <Text style={styles.emergencyText}>EMERGENCY MODE</Text>
          <Text style={styles.emergencySubtext}>
            Help has been alerted. Stay safe.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  topControls: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  topLeftControls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    maxWidth: '60%',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  networkIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  networkText: {
    fontSize: 12,
    fontWeight: '600',
  },
  batteryIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  batteryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  weatherIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  weatherText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
  },
  earningsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  earningsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
  },
  ridesText: {
    fontSize: 14,
    color: '#666',
  },
  driverMarker: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  rideRequestMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerPulse: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 30,
    backgroundColor: '#22C55E',
    opacity: 0.3,
    zIndex: -1,
  },
  statsPanel: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 120 : 100,
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  requestsContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 220 : 200,
    left: 16,
    right: 16,
    backgroundColor: 'transparent',
  },
  requestsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  requestsTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requestsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  clearRequestsButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  clearRequestsText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  requestsList: {
    flexDirection: 'row',
  },
  rideRequestCard: {
    width: width * 0.8,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
  },
  rideRequestContent: {
    padding: 16,
  },
  rideRequestCardSelected: {
    borderWidth: 2,
    borderColor: '#22C55E',
  },
  newBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#22C55E',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  newBadgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  passengerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  passengerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  passengerInitials: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  passengerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: 12,
    color: '#666',
  },
  fareContainer: {
    alignItems: 'flex-end',
  },
  fareAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#22C55E',
    marginBottom: 2,
  },
  rideTypeBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  rideTypeText: {
    fontSize: 11,
    color: '#666',
    textTransform: 'capitalize',
    fontWeight: '500',
  },
  requestDetails: {
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  distanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  distanceText: {
    fontSize: 12,
    color: '#666',
    marginRight: 8,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    gap: 4,
  },
  timerContainerExpiring: {
    backgroundColor: '#FEE2E2',
  },
  timerText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  timerTextExpiring: {
    color: '#EF4444',
  },
  bottomControls: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 20,
    left: 16,
    right: 16,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapControlsButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapControlsPanel: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  mapControlsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  mapStyleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  mapStyleButton: {
    width: (width - 80) / 3,
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  mapStyleButtonActive: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },
  mapStyleText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontWeight: '500',
  },
  mapStyleTextActive: {
    color: '#FFFFFF',
  },
  mapLayerControls: {
    marginTop: 8,
  },
  layerTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  layerOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  layerOption: {
    alignItems: 'center',
    padding: 8,
  },
  layerText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  filterButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  filterModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  filterContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.8,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
  },
  filterBody: {
    padding: 20,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 8,
  },
  filterValueContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  filterValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#22C55E',
  },
  filterSlider: {
    width: '100%',
    height: 40,
  },
  vehicleTypeFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  vehicleTypeFilter: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  vehicleTypeFilterActive: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },
  vehicleTypeFilterText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  vehicleTypeFilterTextActive: {
    color: '#FFFFFF',
  },
  filterFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  filterResetButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  filterResetText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  filterApplyButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#22C55E',
    alignItems: 'center',
  },
  filterApplyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emergencyButton: {
    position: 'absolute',
    right: 16,
    bottom: 80,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  offlineModeIndicator: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 0,
    right: 0,
    backgroundColor: '#FEE2E2',
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  offlineModeText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '500',
  },
  requestDetailContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  detailHandle: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
  },
  detailContent: {
    paddingHorizontal: 20,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  passengerDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 16,
  },
  passengerAvatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  passengerInitialsLarge: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  passengerInfoDetail: {
    flex: 1,
  },
  passengerNameLarge: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  ratingContainerLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  ratingTextLarge: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
  },
  passengerNote: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  routeDetail: {
    marginBottom: 24,
  },
  routeStop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stopIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginTop: 4,
  },
  stopInfo: {
    flex: 1,
  },
  stopLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  stopAddress: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  stopNotes: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  routeLine: {
    alignItems: 'center',
    height: 20,
    marginVertical: 4,
  },
  routeLineDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    marginVertical: 2,
  },
  fareDetail: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fareLabel: {
    fontSize: 14,
    color: '#666',
  },
  fareValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  vehicleTypeBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  vehicleTypeText: {
    fontSize: 12,
    color: '#0369A1',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  routePreview: {
    marginBottom: 16,
  },
  routePreviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  routeStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 12,
  },
  routeStat: {
    alignItems: 'center',
  },
  routeStatText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  trafficInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
  },
  trafficText: {
    fontSize: 14,
    color: '#92400E',
    flex: 1,
  },
  detailActions: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  rejectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22C55E',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  activeRideContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 120 : 100,
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  activeRideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  activeRideTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  activeRideSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  endRideButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  endRideText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '500',
  },
  activeRideContent: {
    gap: 12,
  },
  navigationProgress: {
    gap: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#22C55E',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  navigationInstruction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: '#000000',
    fontWeight: '500',
  },
  instructionDistance: {
    fontSize: 12,
    color: '#666',
  },
  rideInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 12,
  },
  rideInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rideInfoText: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '500',
  },
  emergencyOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emergencyText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#EF4444',
    marginBottom: 8,
  },
  emergencySubtext: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
  },
});