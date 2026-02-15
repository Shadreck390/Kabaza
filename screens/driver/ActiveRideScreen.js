/**
 * ============================================================================
 * screens/driver/ActiveRideScreen.js
 * ============================================================================

 * 
 * ============================================================================
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  ActivityIndicator,
  Animated,
  ScrollView,
  Platform,
  TextInput,
  BackHandler,
  AppState,
  Linking,
  Vibration,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSelector, useDispatch } from 'react-redux';
import Slider from '@react-native-community/slider';
import NetInfo from '@react-native-community/netinfo';

// Import hooks and actions - FIXED WITH ALIASES
import {
  selectCurrentRideDetails,
  selectCurrentLocation,
  completeRideTrip,
  cancelRideRequest,
  updateDriverLocation,
  startRideTracking,
  stopRideTracking
} from '@store/slices/driverSlice';
import { useAuth, useDriver } from '@hooks/useRedux';

// Fixed imports:
import { getUserData, saveUserData } from '@src/utils/userStorage';
import LocationService from '@services/location/LocationService';
import socketService, { SocketEvents } from '@services/socket/socketService';
import { calculateFare, formatPrice } from '@services/ride/rideutils';
import { logRideEvent } from '@utils/analytics/rideAnalytics';
import { checkPermissions, requestPermissions } from '@utils/permissions';
import { debounce } from '@utils/performance';


const { width, height } = Dimensions.get('window');

// Constants
const RIDE_STATUSES = {
  ACCEPTED: 'accepted',
  PICKING_UP: 'picking_up',
  ON_TRIP: 'on_trip',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

const CANCELLATION_REASONS = [
  { id: 'passenger_not_ready', label: 'Passenger Not Ready', description: 'Passenger was not at pickup location' },
  { id: 'vehicle_issue', label: 'Vehicle Issue', description: 'Vehicle breakdown or maintenance' },
  { id: 'emergency', label: 'Emergency', description: 'Personal emergency situation' },
  { id: 'wrong_location', label: 'Wrong Location', description: 'Incorrect pickup/destination' },
  { id: 'safety_concern', label: 'Safety Concern', description: 'Safety or security concerns' },
  { id: 'other', label: 'Other', description: 'Other reason (please specify)' }
];

const EMERGENCY_CONTACTS = [
  { name: 'Police', number: '997', type: 'police' },
  { name: 'Ambulance', number: '998', type: 'ambulance' },
  { name: 'Fire Brigade', number: '999', type: 'fire' },
  { name: 'Kabaza Support', number: '+265888123456', type: 'support' }
];

export default function ActiveRideScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const { currentLocation, isTrackingLocation } = useDriver();
  
  // Redux selectors
  const currentRide = useSelector(selectCurrentRideDetails);
  const driverLocation = useSelector(selectCurrentLocation);
  
  // State
  const [rideStatus, setRideStatus] = useState(currentRide?.status || RIDE_STATUSES.ACCEPTED);
  const [timer, setTimer] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [driverCoordinates, setDriverCoordinates] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [eta, setEta] = useState(currentRide?.eta?.pickup || 5);
  const [distanceTraveled, setDistanceTraveled] = useState(0);
  const [passengerRating, setPassengerRating] = useState(5);
  const [rideReview, setRideReview] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [batteryOptimization, setBatteryOptimization] = useState(false);
  const [appState, setAppState] = useState(AppState.currentState);
  const [lastLocationUpdate, setLastLocationUpdate] = useState(null);
  const [rideAnalytics, setRideAnalytics] = useState({
    waitingTime: 0,
    drivingTime: 0,
    idleTime: 0,
    maxSpeed: 0,
    averageSpeed: 0,
    stops: 0
  });
  const [safetyCheck, setSafetyCheck] = useState({
    lastCheck: null,
    isSafe: true,
    checkCount: 0
  });
  
  // Refs
  const mapRef = useRef(null);
  const timerRef = useRef(null);
  const locationWatcherRef = useRef(null);
  const animationRef = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const networkSubscription = useRef(null);
  const appStateSubscription = useRef(null);
  const rideAnalyticsRef = useRef({
    startTime: Date.now(),
    lastLocation: null,
    totalDistance: 0,
    speedSamples: [],
    lastStopTime: null,
    isMoving: false
  });
  
  // Mock or real data
  const rideData = currentRide || route.params?.request || {
    id: 'ride_123',
    passengerName: 'John Doe',
    passengerRating: 4.8,
    pickup: 'Area 3, Lilongwe',
    pickupCoordinates: { latitude: -13.9626, longitude: 33.7741 },
    destination: '6th Avenue, Lilongwe, Malawi',
    destinationCoordinates: { latitude: -13.9632, longitude: 33.7750 },
    distance: '3.2 km',
    fare: 'MWK 1,200',
    paymentMethod: 'cash',
    passengerPhone: '+265888123456',
    passengerId: 'pass_123',
    estimatedDuration: 12, // minutes
    vehicleType: 'kabaza',
    specialRequests: '',
  };

  // Initial coordinates
  const initialCoordinates = [
    rideData.pickupCoordinates || { latitude: -13.9626, longitude: 33.7741 },
    rideData.destinationCoordinates || { latitude: -13.9632, longitude: 33.7750 },
  ];

  // ====================
  // LIFECYCLE & INITIALIZATION
  // ====================

  useEffect(() => {
    initializeRide();
    setupNetworkMonitoring();
    setupAppStateMonitoring();
    setupBackHandler();
    
    return () => {
      cleanupRide();
      cleanupSubscriptions();
    };
  }, []);

  useEffect(() => {
    if (rideStatus === RIDE_STATUSES.ON_TRIP) {
      startRideTimer();
      startPulseAnimation();
      startSafetyChecks();
    } else {
      stopRideTimer();
      stopPulseAnimation();
      stopSafetyChecks();
    }
    
    // Log ride status change
    logRideEvent('ride_status_change', {
      rideId: rideData.id,
      from: rideStatus,
      to: rideStatus,
      timestamp: Date.now()
    });
  }, [rideStatus]);

  useEffect(() => {
    if (driverLocation && rideStatus !== RIDE_STATUSES.COMPLETED) {
      updateDriverOnMap(driverLocation);
      calculateETA();
      updateDistanceTraveled();
      updateRideAnalytics(driverLocation);
      setLastLocationUpdate(Date.now());
    }
  }, [driverLocation]);

  // ====================
  // INITIALIZATION FUNCTIONS
  // ====================

  const initializeRide = async () => {
    try {
      setIsLoading(true);
      
      // Log ride start
      await logRideEvent('ride_started', {
        rideId: rideData.id,
        driverId: user?.id,
        passengerId: rideData.passengerId,
        timestamp: Date.now()
      });
      
      // Check network connectivity
      await checkNetworkConnectivity();
      
      // Check and request permissions
      await checkAndRequestPermissions();
      
      // Initialize location tracking
      await startLocationTracking();
      
      // Initialize real-time services if connected
      if (isConnected) {
        await initializeRealtimeServices();
      } else {
        showOfflineWarning();
      }
      
      // Fetch route
      await fetchRouteCoordinates();
      
      // Start ride timer
      startRideTimer();
      
      // Send initial status update
      if (rideStatus === RIDE_STATUSES.ACCEPTED) {
        await sendRideStatusUpdate(RIDE_STATUSES.ACCEPTED);
      }
      
      // Check battery optimization
      checkBatteryOptimization();
      
      setIsLoading(false);
      
    } catch (error) {
      console.error('Error initializing ride:', error);
      Alert.alert(
        'Initialization Error',
        'Failed to initialize ride tracking. Please check your connection and permissions.',
        [
          { text: 'Retry', onPress: initializeRide },
          { text: 'Cancel', onPress: () => navigation.goBack() }
        ]
      );
      setIsLoading(false);
    }
  };

  const setupNetworkMonitoring = () => {
    networkSubscription.current = NetInfo.addEventListener(state => {
      const connected = state.isConnected && state.isInternetReachable;
      setIsConnected(connected);
      
      if (!connected && isConnected) {
        showOfflineWarning();
      } else if (connected && !isConnected) {
        showReconnectedNotification();
        initializeRealtimeServices();
      }
    });
  };

  const setupAppStateMonitoring = () => {
    appStateSubscription.current = AppState.addEventListener('change', handleAppStateChange);
  };

  const setupBackHandler = () => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (rideStatus !== RIDE_STATUSES.COMPLETED && rideStatus !== RIDE_STATUSES.CANCELLED) {
        Alert.alert(
          'Active Ride',
          'You have an active ride in progress. Are you sure you want to exit?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Exit', 
              style: 'destructive',
              onPress: () => {
                navigation.goBack();
                return false;
              }
            }
          ]
        );
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  };

  const checkAndRequestPermissions = async () => {
    const permissions = await checkPermissions(['location', 'notifications']);
    
    if (!permissions.location) {
      const granted = await requestPermissions(['location']);
      if (!granted.location) {
        throw new Error('Location permission required');
      }
    }
  };

  const checkNetworkConnectivity = async () => {
    try {
      const netState = await NetInfo.fetch();
      setIsConnected(netState.isConnected && netState.isInternetReachable);
      return netState.isConnected && netState.isInternetReachable;
    } catch (error) {
      console.error('Network check error:', error);
      return false;
    }
  };

  const checkBatteryOptimization = async () => {
    if (Platform.OS === 'android') {
      // Check if app is optimized for battery
      // This would require a native module or third-party library
      // For now, just show a warning for Android devices
      setBatteryOptimization(true);
    }
  };

  // ====================
  // REAL-TIME SERVICES
  // ====================

  const initializeRealtimeServices = async () => {
    if (!isConnected) return;
    
    try {
      // Connect to socket if not connected
      if (!socketService.isConnected()) {
        await socketService.connect();
      }
      
      // Subscribe to ride updates
      subscribeToRideUpdates();
      
      // Subscribe to chat
      subscribeToChat();
      
      // Send initial location if available
      if (driverCoordinates) {
        sendLocationUpdate(driverCoordinates);
      }
      
    } catch (error) {
      console.error('Error initializing real-time services:', error);
    }
  };

  const subscribeToRideUpdates = () => {
    // Ride status updates
    socketService.on(SocketEvents.RIDE_STATUS_UPDATE, debounce((update) => {
      if (update.rideId === rideData.id) {
        handleRideUpdate(update);
      }
    }, 300));
    
    // ETA updates
    socketService.on(SocketEvents.ETA_UPDATE, (etaUpdate) => {
      if (etaUpdate.rideId === rideData.id) {
        setEta(etaUpdate.minutes);
        // Show ETA update notification
        showNotification('ETA Updated', `New ETA: ${etaUpdate.minutes} minutes`);
      }
    });
    
    // Ride cancellation
    socketService.on(SocketEvents.RIDE_CANCELLED, (cancellation) => {
      if (cancellation.rideId === rideData.id) {
        handleRideCancelled(cancellation);
      }
    });
    
    // Passenger location updates
    socketService.on(`${SocketEvents.PASSENGER_LOCATION}_${rideData.id}`, (location) => {
      updatePassengerLocation(location);
    });
  };

  const subscribeToChat = () => {
    // Chat messages
    socketService.on(`${SocketEvents.CHAT_MESSAGE}_${rideData.id}`, (message) => {
      handleNewMessage(message);
    });
    
    // Typing indicators
    socketService.on(`${SocketEvents.TYPING}_${rideData.id}`, (typingData) => {
      if (typingData.userId !== user?.id) {
        setIsTyping(typingData.isTyping);
      }
    });
    
    // Chat read receipts
    socketService.on(`${SocketEvents.CHAT_READ}_${rideData.id}`, (readData) => {
      markMessagesAsRead(readData);
    });
  };

  // ====================
  // LOCATION TRACKING
  // ====================

  const startLocationTracking = async () => {
    try {
      // Configure location tracking based on ride status
      const config = {
        enableHighAccuracy: true,
        distanceFilter: rideStatus === RIDE_STATUSES.ON_TRIP ? 5 : 10,
        interval: rideStatus === RIDE_STATUSES.ON_TRIP ? 3000 : 5000,
        fastestInterval: rideStatus === RIDE_STATUSES.ON_TRIP ? 2000 : 3000,
        showsBackgroundLocationIndicator: true,
        useSignificantChanges: false,
        foregroundService: {
          notificationTitle: 'Kabaza - Active Ride',
          notificationBody: 'Tracking your ride location',
          notificationIcon: 'ic_notification',
          notificationColor: '#00B894'
        }
      };
      
      const watchId = await LocationService.watchPositionForRide(
        rideData.id,
        handleLocationUpdate,
        handleLocationError,
        config
      );
      
      locationWatcherRef.current = watchId;
      
    } catch (error) {
      console.error('Failed to start location tracking:', error);
      throw error;
    }
  };

  const handleLocationUpdate = (position) => {
    const location = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      bearing: position.coords.heading,
      speed: position.coords.speed,
      timestamp: Date.now(),
    };
    
    // Update state
    setDriverCoordinates(location);
    dispatch(updateDriverLocation(location));
    
    // Send location update via socket if connected
    if (isConnected) {
      sendLocationUpdate(location);
    }
    
    // Update map if needed
    if (mapRef.current && shouldUpdateMap()) {
      animateToLocation(location);
    }
    
    // Update analytics
    updateRideAnalytics(location);
  };

  const sendLocationUpdate = debounce((location) => {
    socketService.emit(SocketEvents.LOCATION_UPDATE, {
      rideId: rideData.id,
      driverId: user?.id,
      location,
      timestamp: Date.now(),
      status: rideStatus,
    });
  }, 2000); // Throttle location updates to every 2 seconds

  const handleLocationError = (error) => {
    console.error('Location tracking error:', error.code, error.message);
    
    switch (error.code) {
      case 1: // PERMISSION_DENIED
        showPermissionAlert();
        break;
      case 2: // POSITION_UNAVAILABLE
        showLocationUnavailableAlert();
        break;
      case 3: // TIMEOUT
        console.warn('Location request timeout');
        break;
      default:
        console.error('Unknown location error:', error);
    }
  };

  // ====================
  // ROUTE & NAVIGATION
  // ====================

  const fetchRouteCoordinates = async () => {
    try {
      // In production, use Google Directions API or similar
      if (isConnected && rideData.pickupCoordinates && rideData.destinationCoordinates) {
        // Here you would make API call to get route
        // For now, generate interpolated points
        const points = generateRoutePoints(
          initialCoordinates[0],
          initialCoordinates[1],
          15
        );
        
        setRouteCoordinates([initialCoordinates[0], ...points, initialCoordinates[1]]);
        
        // Calculate initial ETA
        const routeDistance = calculateRouteDistance(points);
        const initialEta = Math.ceil((routeDistance / 30) * 60); // Assuming 30 km/h average
        setEta(Math.max(1, initialEta));
        
      } else {
        // Fallback to straight line route
        const points = generateRoutePoints(
          initialCoordinates[0],
          initialCoordinates[1],
          10
        );
        setRouteCoordinates([initialCoordinates[0], ...points, initialCoordinates[1]]);
      }
    } catch (error) {
      console.error('Error fetching route:', error);
      // Generate basic route as fallback
      const points = generateRoutePoints(
        initialCoordinates[0],
        initialCoordinates[1],
        8
      );
      setRouteCoordinates([initialCoordinates[0], ...points, initialCoordinates[1]]);
    }
  };

  // ====================
  // RIDE STATUS HANDLERS
  // ====================

  const handlePassengerPickedUp = async () => {
    try {
      setIsLoading(true);
      
      // Update status
      const newStatus = RIDE_STATUSES.ON_TRIP;
      setRideStatus(newStatus);
      
      // Send status update
      await sendRideStatusUpdate(newStatus);
      
      // Log event
      await logRideEvent('passenger_picked_up', {
        rideId: rideData.id,
        timestamp: Date.now(),
        location: driverCoordinates,
        waitTime: elapsedTime
      });
      
      // Update location tracking config for trip
      await updateLocationTrackingConfig();
      
      // Show notification
      showNotification('Ride Started', 'Trip is now in progress. Drive safely!');
      
      // Vibration feedback
      Vibration.vibrate(100);
      
      setIsLoading(false);
      
    } catch (error) {
      console.error('Error starting ride:', error);
      Alert.alert('Error', 'Failed to update ride status. Please try again.');
      setIsLoading(false);
    }
  };

  const handleCompleteRide = () => {
    Alert.alert(
      'Complete Ride',
      'Confirm that you have reached the destination and received payment.',
      [
        { text: 'Not Yet', style: 'cancel' },
        {
          text: 'Complete Ride',
          style: 'default',
          onPress: () => showCompletionConfirmation()
        }
      ]
    );
  };

  const showCompletionConfirmation = () => {
    Alert.alert(
      'Final Confirmation',
      `Please confirm:\n\n1. Passenger has been dropped off\n2. Payment received: ${rideData.paymentMethod === 'cash' ? 'Cash' : 'Mobile Money'}\n3. Fare: ${formatPrice(calculateFinalFare())}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm & Complete',
          style: 'default',
          onPress: () => processRideCompletion()
        }
      ]
    );
  };

  const processRideCompletion = async () => {
    try {
      setIsLoading(true);
      
      // Calculate final fare
      const finalFare = calculateFinalFare();
      
      // Update status
      setRideStatus(RIDE_STATUSES.COMPLETED);
      
      // Send completion via socket
      await sendRideStatusUpdate(RIDE_STATUSES.COMPLETED, { 
        fare: finalFare,
        rating: passengerRating,
        review: rideReview 
      });
      
      // Dispatch Redux action
      await dispatch(completeRideTrip({
        rideId: rideData.id,
        rating: passengerRating,
        review: rideReview,
        paymentData: {
          amount: finalFare,
          method: rideData.paymentMethod || 'cash',
          status: 'completed',
          timestamp: Date.now()
        },
        analytics: rideAnalyticsRef.current
      })).unwrap();
      
      // Log completion
      await logRideEvent('ride_completed', {
        rideId: rideData.id,
        fare: finalFare,
        duration: elapsedTime,
        distance: distanceTraveled,
        rating: passengerRating,
        timestamp: Date.now()
      });
      
      // Cleanup
      await cleanupRide();
      
      // Navigate to completion screen
      navigation.replace('RideCompletion', {
        ride: { ...rideData, fare: finalFare },
        rating: passengerRating,
        elapsedTime,
        distanceTraveled,
        analytics: rideAnalyticsRef.current
      });
      
      setIsLoading(false);
      
    } catch (error) {
      console.error('Error completing ride:', error);
      Alert.alert('Error', 'Failed to complete ride. Please try again.');
      setIsLoading(false);
    }
  };

  const handleCancelRide = () => {
    Alert.alert(
      'Cancel Ride',
      'Select cancellation reason:',
      CANCELLATION_REASONS.map(reason => ({
        text: reason.label,
        onPress: () => handleCancellationReason(reason)
      })).concat([
        { text: 'Cancel', style: 'cancel' }
      ])
    );
  };

  const handleCancellationReason = (reason) => {
    if (reason.id === 'other') {
      Alert.prompt(
        'Cancellation Reason',
        'Please specify reason:',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Submit',
            onPress: (customReason) => cancelRideWithReason(`other: ${customReason}`)
          }
        ]
      );
    } else {
      cancelRideWithReason(reason.id);
    }
  };

  const cancelRideWithReason = async (reason) => {
    try {
      setIsLoading(true);
      
      // Send cancellation
      await sendRideStatusUpdate(RIDE_STATUSES.CANCELLED, { reason });
      
      // Dispatch Redux action
      await dispatch(cancelRideRequest({
        rideId: rideData.id,
        reason,
        cancelledBy: 'driver',
        timestamp: Date.now()
      })).unwrap();
      
      // Log cancellation
      await logRideEvent('ride_cancelled', {
        rideId: rideData.id,
        reason,
        cancelledBy: 'driver',
        timestamp: Date.now(),
        status: rideStatus,
        elapsedTime
      });
      
      // Cleanup
      await cleanupRide();
      
      // Navigate back
      navigation.goBack();
      
      Alert.alert('Ride Cancelled', 'The ride has been cancelled.');
      
    } catch (error) {
      console.error('Error cancelling ride:', error);
      Alert.alert('Error', 'Failed to cancel ride. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ====================
  // CHAT FUNCTIONS
  // ====================

  const handleNewMessage = (message) => {
    setChatMessages(prev => [...prev, message]);
    
    // Show notification if chat is closed
    if (!isChatOpen) {
      showNotification(
        'New Message',
        `${message.senderName}: ${message.message}`,
        () => setIsChatOpen(true)
      );
      
      // Play sound or vibration
      Vibration.vibrate(50);
    }
  };

  const sendMessage = () => {
    if (!newMessage.trim()) return;
    
    const message = {
      rideId: rideData.id,
      message: newMessage.trim(),
      senderId: user?.id,
      senderName: user?.name || 'Driver',
      senderType: 'driver',
      timestamp: Date.now(),
      read: false
    };
    
    // Send via socket
    if (isConnected) {
      socketService.emit(SocketEvents.CHAT_MESSAGE, message);
    } else {
      // Queue for later if offline
      queueMessageForLater(message);
    }
    
    // Add to local state
    setChatMessages(prev => [...prev, message]);
    setNewMessage('');
    
    // Stop typing indicator
    sendTypingIndicator(false);
  };

  const sendTypingIndicator = debounce((isTyping) => {
    if (isConnected) {
      socketService.emit(SocketEvents.TYPING, {
        rideId: rideData.id,
        userId: user?.id,
        isTyping,
        timestamp: Date.now(),
      });
    }
  }, 300);

  // ====================
  // SAFETY & EMERGENCY
  // ====================

  const startSafetyChecks = () => {
    // Periodic safety checks during trip
    const safetyInterval = setInterval(() => {
      performSafetyCheck();
    }, 300000); // Every 5 minutes
    
    return () => clearInterval(safetyInterval);
  };

  const performSafetyCheck = () => {
    const checkData = {
      lastCheck: Date.now(),
      location: driverCoordinates,
      rideStatus,
      elapsedTime,
      isConnected
    };
    
    // Update safety state
    setSafetyCheck(prev => ({
      ...prev,
      lastCheck: Date.now(),
      checkCount: prev.checkCount + 1
    }));
    
    // Log safety check
    logRideEvent('safety_check', checkData);
    
    // If no location updates for 5 minutes, trigger warning
    if (lastLocationUpdate && Date.now() - lastLocationUpdate > 300000) {
      showSafetyWarning();
    }
  };

  const handleEmergency = () => {
    Alert.alert(
      'Emergency Assistance',
      'Select emergency contact:',
      EMERGENCY_CONTACTS.map(contact => ({
        text: contact.name,
        onPress: () => initiateEmergencyCall(contact)
      })).concat([
        { text: 'Cancel', style: 'cancel' }
      ])
    );
  };

  const initiateEmergencyCall = (contact) => {
    Alert.alert(
      `Call ${contact.name}?`,
      `Emergency number: ${contact.number}\n\nYour location and ride details will be shared.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          style: 'destructive',
          onPress: () => {
            // Log emergency call
            logRideEvent('emergency_call', {
              rideId: rideData.id,
              contactType: contact.type,
              timestamp: Date.now(),
              location: driverCoordinates
            });
            
            // Make the call
            Linking.openURL(`tel:${contact.number}`);
            
            // Send emergency notification via socket
            if (isConnected) {
              socketService.emit(SocketEvents.EMERGENCY_ALERT, {
                rideId: rideData.id,
                driverId: user?.id,
                contactType: contact.type,
                location: driverCoordinates,
                timestamp: Date.now()
              });
            }
          }
        }
      ]
    );
  };

  // ====================
  // UTILITY FUNCTIONS
  // ====================

  const calculateFinalFare = () => {
    // Base fare from ride data
    const baseFare = parseFloat(rideData.fare?.replace(/[^0-9.]/g, '') || 1200);
    
    // Calculate additional charges
    const additionalCharges = {
      waitingTime: calculateWaitingCharges(),
      distance: calculateDistanceCharges(),
      timeOfDay: calculateTimeOfDayCharges(),
      specialRequests: calculateSpecialRequestCharges()
    };
    
    const totalAdditional = Object.values(additionalCharges).reduce((a, b) => a + b, 0);
    
    return baseFare + totalAdditional;
  };

  const calculateWaitingCharges = () => {
    const waitingMinutes = Math.max(0, elapsedTime / 60 - 3); // First 3 minutes free
    return waitingMinutes * 50; // 50 MWK per minute after free period
  };

  const calculateDistanceCharges = () => {
    return distanceTraveled * 300; // 300 MWK per km
  };

  const calculateTimeOfDayCharges = () => {
    const hour = new Date().getHours();
    if (hour >= 22 || hour < 6) {
      return 200; // Night surcharge
    }
    return 0;
  };

  const calculateSpecialRequestCharges = () => {
    // Add charges for special requests
    return rideData.specialRequests ? 100 : 0;
  };

  const sendRideStatusUpdate = async (status, extraData = {}) => {
    try {
      if (isConnected) {
        socketService.emit(SocketEvents.RIDE_STATUS_UPDATE, {
          rideId: rideData.id,
          driverId: user?.id,
          status,
          timestamp: Date.now(),
          ...extraData
        });
      } else {
        // Queue for later if offline
        await queueStatusUpdateForLater(status, extraData);
      }
    } catch (error) {
      console.error('Error sending status update:', error);
      throw error;
    }
  };

  const updateRideAnalytics = (location) => {
    const analytics = rideAnalyticsRef.current;
    const now = Date.now();
    
    // Calculate distance from last location
    if (analytics.lastLocation) {
      const distance = calculateDistance(analytics.lastLocation, location);
      analytics.totalDistance += distance;
      setDistanceTraveled(analytics.totalDistance);
      
      // Calculate speed
      if (location.speed && location.speed > 0) {
        analytics.speedSamples.push(location.speed);
        analytics.maxSpeed = Math.max(analytics.maxSpeed, location.speed);
        analytics.isMoving = true;
        analytics.lastStopTime = null;
      } else {
        // Vehicle stopped
        if (!analytics.lastStopTime) {
          analytics.lastStopTime = now;
        }
        analytics.isMoving = false;
      }
    }
    
    analytics.lastLocation = location;
    
    // Update average speed
    if (analytics.speedSamples.length > 0) {
      const sum = analytics.speedSamples.reduce((a, b) => a + b, 0);
      analytics.averageSpeed = sum / analytics.speedSamples.length;
    }
    
    // Update state for UI
    setRideAnalytics({
      waitingTime: analytics.waitingTime,
      drivingTime: analytics.drivingTime,
      idleTime: analytics.idleTime,
      maxSpeed: analytics.maxSpeed,
      averageSpeed: analytics.averageSpeed,
      stops: analytics.stops
    });
  };

  // ====================
  // UI HELPER FUNCTIONS
  // ====================

  const showNotification = (title, message, onPress = null) => {
    Alert.alert(title, message, [
      { text: 'OK', onPress: onPress || (() => {}) }
    ]);
  };

  const showOfflineWarning = () => {
    Alert.alert(
      'Offline Mode',
      'You are currently offline. Some features may be limited. Ride tracking will continue locally.',
      [{ text: 'OK' }]
    );
  };

  const showReconnectedNotification = () => {
    Alert.alert(
      'Back Online',
      'Connection restored. Syncing ride data...',
      [{ text: 'OK' }]
    );
  };

  const showSafetyWarning = () => {
    Alert.alert(
      'Safety Check',
      'No location updates for 5 minutes. Are you safe?',
      [
        { text: 'I\'m Safe', onPress: () => logRideEvent('safety_confirmed', { rideId: rideData.id }) },
        { text: 'Need Help', onPress: handleEmergency }
      ]
    );
  };

  const shouldUpdateMap = () => {
    // Only update map if significant movement or status change
    return rideStatus === RIDE_STATUSES.ON_TRIP || 
           rideStatus === RIDE_STATUSES.PICKING_UP;
  };

  // ====================
  // CLEANUP
  // ====================

  const cleanupRide = async () => {
    // Stop timers
    stopRideTimer();
    stopPulseAnimation();
    
    // Stop location tracking
    if (locationWatcherRef.current) {
      await LocationService.stopWatching(locationWatcherRef.current);
      locationWatcherRef.current = null;
    }
    
    // Unsubscribe from socket events
    socketService.off(SocketEvents.RIDE_STATUS_UPDATE);
    socketService.off(SocketEvents.ETA_UPDATE);
    socketService.off(SocketEvents.RIDE_CANCELLED);
    socketService.off(`${SocketEvents.CHAT_MESSAGE}_${rideData.id}`);
    socketService.off(`${SocketEvents.TYPING}_${rideData.id}`);
    
    // Clear intervals
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const cleanupSubscriptions = () => {
    if (networkSubscription.current) {
      networkSubscription.current();
    }
    if (appStateSubscription.current) {
      appStateSubscription.current.remove();
    }
  };

  // ====================
  // RENDER FUNCTIONS
  // ====================

  const renderStatusIndicator = () => {
    const statusConfigs = [
      { key: RIDE_STATUSES.ACCEPTED, label: 'Accepted', icon: 'check-circle' },
      { key: RIDE_STATUSES.PICKING_UP, label: 'Pickup', icon: 'person-pin-circle' },
      { key: RIDE_STATUSES.ON_TRIP, label: 'On Trip', icon: 'directions-car' },
      { key: RIDE_STATUSES.COMPLETED, label: 'Complete', icon: 'flag' },
    ];
    
    const currentIndex = statusConfigs.findIndex(s => s.key === rideStatus);
    
    return (
      <View style={styles.statusContainer}>
        {statusConfigs.map((status, index) => (
          <React.Fragment key={status.key}>
            <View style={styles.statusIndicator}>
              <View style={[
                styles.statusDot,
                index <= currentIndex && styles.activeDot,
                index === currentIndex && styles.currentDot,
              ]}>
                <MaterialIcons 
                  name={status.icon} 
                  size={index === currentIndex ? 14 : 12} 
                  color="#fff" 
                />
              </View>
              <Text style={[
                styles.statusText,
                index <= currentIndex && styles.activeText,
              ]}>
                {status.label}
              </Text>
            </View>
            {index < statusConfigs.length - 1 && (
              <View style={[
                styles.statusLine,
                index < currentIndex && styles.activeLine,
              ]} />
            )}
          </React.Fragment>
        ))}
      </View>
    );
  };

  const renderActionButtons = () => {
    const buttonConfigs = {
      [RIDE_STATUSES.ACCEPTED]: {
        text: 'Passenger Picked Up',
        icon: 'person-pin-circle',
        onPress: handlePassengerPickedUp,
        color: '#00B894'
      },
      [RIDE_STATUSES.PICKING_UP]: {
        text: 'Passenger Picked Up',
        icon: 'person-pin-circle',
        onPress: handlePassengerPickedUp,
        color: '#00B894'
      },
      [RIDE_STATUSES.ON_TRIP]: {
        text: 'Complete Ride',
        icon: 'flag',
        onPress: handleCompleteRide,
        color: '#00B894'
      },
    };
    
    const config = buttonConfigs[rideStatus];
    if (!config) return null;
    
    return (
      <TouchableOpacity
        style={[styles.primaryButton, { backgroundColor: config.color }]}
        onPress={config.onPress}
        disabled={isLoading}
      >
        <MaterialIcons name={config.icon} size={24} color="#fff" />
        <Text style={styles.primaryButtonText}>{config.text}</Text>
        {isLoading && <ActivityIndicator color="#fff" style={{ marginLeft: 10 }} />}
      </TouchableOpacity>
    );
  };

  const renderConnectionStatus = () => (
    <View style={[
      styles.connectionStatus,
      { backgroundColor: isConnected ? 'rgba(0,184,148,0.9)' : 'rgba(255,107,107,0.9)' }
    ]}>
      <Icon name={isConnected ? "wifi" : "wifi-off"} size={12} color="#fff" />
      <Text style={styles.connectionStatusText}>
        {isConnected ? 'Live' : 'Offline'}
      </Text>
    </View>
  );

  const renderBatteryWarning = () => {
    if (!batteryOptimization || Platform.OS !== 'android') return null;
    
    return (
      <TouchableOpacity style={styles.batteryWarning} onPress={showBatteryOptimizationInfo}>
        <Icon name="battery-quarter" size={14} color="#FF9800" />
        <Text style={styles.batteryWarningText}>Battery optimization may affect tracking</Text>
      </TouchableOpacity>
    );
  };

  // ====================
  // MAIN RENDER
  // ====================

  if (isLoading && !rideData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00B894" />
        <Text style={styles.loadingText}>Loading ride details...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Map View */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: initialCoordinates[0].latitude,
          longitude: initialCoordinates[0].longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
        showsTraffic={false}
        showsBuildings={true}
        zoomControlEnabled={true}
        rotateEnabled={true}
        pitchEnabled={false}
      >
        {/* Pickup Marker */}
        <Marker coordinate={initialCoordinates[0]} title="Pickup" description={rideData.pickup}>
          <Animated.View style={[styles.markerContainer, { transform: [{ scale: pulseAnimation }] }]}>
            <View style={styles.pickupMarker}>
              <MaterialIcons name="location-on" size={30} color="#00B894" />
            </View>
          </Animated.View>
        </Marker>

        {/* Destination Marker */}
        <Marker coordinate={initialCoordinates[1]} title="Destination" description={rideData.destination}>
          <View style={styles.destinationMarker}>
            <MaterialIcons name="flag" size={25} color="#FF6B6B" />
          </View>
        </Marker>

        {/* Driver Marker */}
        {driverCoordinates && (
          <Marker coordinate={driverCoordinates} title="You" flat={true} anchor={{ x: 0.5, y: 0.5 }}>
            <Animated.View style={[styles.driverMarker, { transform: [{ scale: pulseAnimation }] }]}>
              <Icon name="car" size={24} color="#007AFF" />
            </Animated.View>
          </Marker>
        )}

        {/* Route Polyline */}
        {routeCoordinates.length > 1 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#00B894"
            strokeWidth={4}
            lineDashPattern={rideStatus === RIDE_STATUSES.ON_TRIP ? [] : [10, 10]}
            lineCap="round"
            lineJoin="round"
          />
        )}
      </MapView>

      {/* Connection Status */}
      {renderConnectionStatus()}
      {renderBatteryWarning()}

      {/* Header Overlay */}
      <View style={styles.headerOverlay}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (rideStatus === RIDE_STATUSES.COMPLETED || rideStatus === RIDE_STATUSES.CANCELLED) {
              navigation.goBack();
            } else {
              handleBackPress();
            }
          }}
        >
          <Icon name="arrow-left" size={20} color="#333" />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Active Ride</Text>
          <Text style={styles.headerSubtitle}>
            {rideStatus === RIDE_STATUSES.ON_TRIP ? 'Trip in progress' : 
             rideStatus === RIDE_STATUSES.PICKING_UP ? 'Going to pickup' : 
             'Ride accepted'}
          </Text>
          {lastLocationUpdate && (
            <Text style={styles.locationUpdateTime}>
              Updated {Math.floor((Date.now() - lastLocationUpdate) / 1000)}s ago
            </Text>
          )}
        </View>
        
        <TouchableOpacity
          style={styles.chatButton}
          onPress={() => setIsChatOpen(!isChatOpen)}
        >
          <Icon name="comments" size={20} color="#333" />
          {chatMessages.filter(m => !m.read && m.senderId !== user?.id).length > 0 && (
            <View style={styles.chatBadge}>
              <Text style={styles.chatBadgeText}>
                {chatMessages.filter(m => !m.read && m.senderId !== user?.id).length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Emergency Button */}
      {rideStatus === RIDE_STATUSES.ON_TRIP && (
        <TouchableOpacity
          style={styles.emergencyFloatingButton}
          onPress={handleEmergency}
        >
          <Icon name="exclamation-triangle" size={24} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Ride Info Panel */}
      <Animated.View style={[
        styles.infoPanel,
        {
          transform: [{
            translateY: animationRef.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -height * 0.3],
            }),
          }],
        },
      ]}>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Passenger Info */}
          <View style={styles.passengerSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {rideData.passengerName?.charAt(0)?.toUpperCase() || 'P'}
              </Text>
            </View>
            <View style={styles.passengerDetails}>
              <Text style={styles.passengerName}>
                {rideData.passengerName || 'Passenger'}
              </Text>
              <View style={styles.ratingContainer}>
                <Icon name="star" size={14} color="#FFD700" />
                <Text style={styles.rating}>
                  {rideData.passengerRating || '4.8'}
                </Text>
                <Text style={styles.phone}>
                  {rideData.passengerPhone || '+265 XXX XXX XXX'}
                </Text>
              </View>
            </View>
            <View style={styles.timerContainer}>
              <Icon name="clock-o" size={18} color="#00B894" />
              <Text style={styles.timer}>{formatTime(timer)}</Text>
            </View>
          </View>

          {/* Status Indicator */}
          {renderStatusIndicator()}

          {/* Stats Overview */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Icon name="clock-o" size={20} color="#666" />
              <Text style={styles.statValue}>{eta} min</Text>
              <Text style={styles.statLabel}>ETA</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Icon name="road" size={20} color="#666" />
              <Text style={styles.statValue}>
                {formatDistance(distanceTraveled)}
              </Text>
              <Text style={styles.statLabel}>Traveled</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Icon name="money" size={20} color="#666" />
              <Text style={styles.statValue}>
                {formatPrice(calculateFinalFare())}
              </Text>
              <Text style={styles.statLabel}>Fare</Text>
            </View>
          </View>

          {/* Detailed Stats */}
          {rideStatus === RIDE_STATUSES.ON_TRIP && (
            <View style={styles.detailedStats}>
              <Text style={styles.detailedStatsTitle}>Trip Analytics</Text>
              <View style={styles.detailedStatsGrid}>
                <View style={styles.detailedStatItem}>
                  <Text style={styles.detailedStatValue}>{rideAnalytics.maxSpeed.toFixed(0)} km/h</Text>
                  <Text style={styles.detailedStatLabel}>Max Speed</Text>
                </View>
                <View style={styles.detailedStatItem}>
                  <Text style={styles.detailedStatValue}>{rideAnalytics.averageSpeed.toFixed(0)} km/h</Text>
                  <Text style={styles.detailedStatLabel}>Avg Speed</Text>
                </View>
                <View style={styles.detailedStatItem}>
                  <Text style={styles.detailedStatValue}>{rideAnalytics.stops}</Text>
                  <Text style={styles.detailedStatLabel}>Stops</Text>
                </View>
              </View>
            </View>
          )}

          {/* Route Details */}
          <View style={styles.routeSection}>
            <View style={styles.routeItem}>
              <View style={styles.routeIcon}>
                <View style={[styles.routeDot, { backgroundColor: '#00B894' }]} />
                <View style={styles.routeLine} />
              </View>
              <View style={styles.routeTextContainer}>
                <Text style={styles.routeLabel}>Pickup</Text>
                <Text style={styles.routeAddress}>
                  {rideData.pickup || 'Pickup location'}
                </Text>
              </View>
              {rideStatus === RIDE_STATUSES.ACCEPTED && (
                <TouchableOpacity style={styles.navigateButton}>
                  <Icon name="location-arrow" size={16} color="#007AFF" />
                  <Text style={styles.navigateButtonText}>Navigate</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.routeItem}>
              <View style={styles.routeIcon}>
                <View style={[styles.routeDot, { backgroundColor: '#FF6B6B' }]} />
              </View>
              <View style={styles.routeTextContainer}>
                <Text style={styles.routeLabel}>Destination</Text>
                <Text style={styles.routeAddress}>
                  {rideData.destination || 'Destination'}
                </Text>
              </View>
              {rideStatus === RIDE_STATUSES.ON_TRIP && (
                <TouchableOpacity style={styles.navigateButton}>
                  <Icon name="location-arrow" size={16} color="#007AFF" />
                  <Text style={styles.navigateButtonText}>Navigate</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Payment & Vehicle Info */}
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Payment</Text>
              <View style={styles.infoValueContainer}>
                <Icon
                  name={rideData.paymentMethod === 'cash' ? 'money' : 'credit-card'}
                  size={16}
                  color="#666"
                />
                <Text style={styles.infoValue}>
                  {rideData.paymentMethod === 'cash' ? 'Cash' : 'Mobile Money'}
                </Text>
              </View>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Vehicle</Text>
              <Text style={styles.infoValue}>{rideData.vehicleType || 'Kabaza'}</Text>
            </View>
          </View>

          {/* Special Requests */}
          {rideData.specialRequests && (
            <View style={styles.specialRequests}>
              <Text style={styles.specialRequestsTitle}>Special Requests</Text>
              <Text style={styles.specialRequestsText}>{rideData.specialRequests}</Text>
            </View>
          )}

          {/* Rating Section */}
          {rideStatus === RIDE_STATUSES.ON_TRIP && (
            <View style={styles.ratingSection}>
              <Text style={styles.ratingLabel}>Rate Passenger (Optional)</Text>
              <Slider
                style={styles.ratingSlider}
                minimumValue={1}
                maximumValue={5}
                step={0.5}
                value={passengerRating}
                onValueChange={setPassengerRating}
                minimumTrackTintColor="#FFD700"
                maximumTrackTintColor="#ddd"
                thumbTintColor="#FFD700"
              />
              <View style={styles.ratingStars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Icon
                    key={star}
                    name={star <= passengerRating ? "star" : "star-o"}
                    size={24}
                    color="#FFD700"
                  />
                ))}
                <Text style={styles.ratingValue}>{passengerRating.toFixed(1)}</Text>
              </View>
              <TextInput
                style={styles.reviewInput}
                placeholder="Add a review (optional)"
                value={rideReview}
                onChangeText={setRideReview}
                multiline
                numberOfLines={2}
                placeholderTextColor="#999"
              />
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actions}>
            {renderActionButtons()}
            
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleCancelRide}
              disabled={isLoading || rideStatus === RIDE_STATUSES.COMPLETED}
            >
              <Icon name="times" size={20} color="#666" />
              <Text style={styles.secondaryButtonText}>
                {rideStatus === RIDE_STATUSES.COMPLETED ? 'Close' : 'Cancel Ride'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Animated.View>

      {/* Chat Interface */}
      {isChatOpen && (
        <View style={styles.chatContainer}>
          <View style={styles.chatHeader}>
            <View style={styles.chatHeaderLeft}>
              <View style={styles.chatAvatar}>
                <Text style={styles.chatAvatarText}>
                  {rideData.passengerName?.charAt(0)?.toUpperCase() || 'P'}
                </Text>
              </View>
              <View>
                <Text style={styles.chatTitle}>{rideData.passengerName || 'Passenger'}</Text>
                <Text style={styles.chatSubtitle}>
                  {isTyping ? 'Typing...' : 'Online'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setIsChatOpen(false)}>
              <Icon name="times" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            style={styles.chatMessages}
            ref={scrollViewRef => {
              if (scrollViewRef) {
                setTimeout(() => {
                  scrollViewRef.scrollToEnd({ animated: true });
                }, 100);
              }
            }}
          >
            {chatMessages.map((msg, index) => (
              <View
                key={index}
                style={[
                  styles.messageBubble,
                  msg.senderId === user?.id ? styles.sentMessage : styles.receivedMessage,
                ]}
              >
                <Text style={[
                  styles.messageText,
                  msg.senderId === user?.id && styles.sentMessageText
                ]}>
                  {msg.message}
                </Text>
                <Text style={styles.messageTime}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            ))}
            {isTyping && (
              <View style={styles.typingIndicator}>
                <Text style={styles.typingText}>Passenger is typing...</Text>
              </View>
            )}
          </ScrollView>
          
          <View style={styles.chatInputContainer}>
            <TextInput
              style={styles.chatInput}
              value={newMessage}
              onChangeText={setNewMessage}
              onChange={() => sendTypingIndicator(true)}
              onBlur={() => sendTypingIndicator(false)}
              placeholder="Type a message..."
              placeholderTextColor="#999"
              multiline
              maxLength={500}
            />
            <TouchableOpacity 
              style={[
                styles.sendButton,
                !newMessage.trim() && styles.sendButtonDisabled
              ]} 
              onPress={sendMessage}
              disabled={!newMessage.trim()}
            >
              <Icon name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

// ====================
// STYLES (Enhanced)
// ====================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  map: { flex: 1 },
  
  // Connection Status
  connectionStatus: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 80,
    right: 15,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    zIndex: 1000,
  },
  connectionStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 5,
  },
  
  // Battery Warning
  batteryWarning: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 140 : 120,
    right: 15,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 152, 0, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    zIndex: 1000,
  },
  batteryWarningText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 5,
  },
  
  // Header
  headerOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    zIndex: 1000,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerInfo: { 
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 10,
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#fff', 
    textShadowColor: 'rgba(0,0,0,0.75)', 
    textShadowOffset: { width: 0, height: 1 }, 
    textShadowRadius: 3 
  },
  headerSubtitle: { 
    fontSize: 12, 
    color: 'rgba(255,255,255,0.8)', 
    textShadowColor: 'rgba(0,0,0,0.75)', 
    textShadowOffset: { width: 0, height: 1 }, 
    textShadowRadius: 3,
    marginTop: 2,
  },
  locationUpdateTime: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  chatButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  chatBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  chatBadgeText: { 
    color: '#fff', 
    fontSize: 10, 
    fontWeight: 'bold' 
  },
  
  // Emergency Floating Button
  emergencyFloatingButton: {
    position: 'absolute',
    bottom: height * 0.4,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  
  // Loading
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#fff' 
  },
  loadingText: { 
    marginTop: 10, 
    fontSize: 16, 
    color: '#666' 
  },
  
  // Map Markers
  markerContainer: { 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  pickupMarker: { 
    backgroundColor: '#fff', 
    borderRadius: 20, 
    padding: 5, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.2, 
    shadowRadius: 4, 
    elevation: 4 
  },
  destinationMarker: { 
    backgroundColor: '#fff', 
    borderRadius: 15, 
    padding: 5, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.2, 
    shadowRadius: 4, 
    elevation: 4 
  },
  driverMarker: { 
    backgroundColor: '#fff', 
    borderRadius: 20, 
    padding: 8, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 3 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 6, 
    elevation: 6 
  },
  
  // Info Panel
  infoPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 20,
    maxHeight: height * 0.75,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  
  // Passenger Section
  passengerSection: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 20,
  },
  avatar: { 
    width: 55, 
    height: 55, 
    borderRadius: 27.5, 
    backgroundColor: '#00B894', 
    justifyContent: 'center', 
    alignItems: 'center',
    marginRight: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarText: { 
    color: '#fff', 
    fontSize: 24, 
    fontWeight: 'bold' 
  },
  passengerDetails: { 
    flex: 1 
  },
  passengerName: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#333', 
    marginBottom: 2 
  },
  ratingContainer: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  rating: { 
    fontSize: 14, 
    color: '#666', 
    marginLeft: 5, 
    marginRight: 10 
  },
  phone: { 
    fontSize: 14, 
    color: '#666' 
  },
  timerContainer: { 
    alignItems: 'center' 
  },
  timer: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: '#00B894', 
    marginTop: 2 
  },
  
  // Status Indicator
  statusContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    marginBottom: 25,
    paddingHorizontal: 10,
  },
  statusIndicator: { 
    alignItems: 'center', 
    flex: 1 
  },
  statusDot: { 
    width: 30, 
    height: 30, 
    borderRadius: 15, 
    backgroundColor: '#e0e0e0',
    marginBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeDot: { 
    backgroundColor: '#00B894' 
  },
  currentDot: { 
    backgroundColor: '#00B894',
    shadowColor: '#00B894',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  statusText: { 
    fontSize: 12, 
    color: '#999', 
    fontWeight: '500',
    textAlign: 'center',
  },
  activeText: { 
    color: '#00B894', 
    fontWeight: '600' 
  },
  statusLine: { 
    flex: 1, 
    height: 3, 
    backgroundColor: '#e0e0e0',
    marginHorizontal: 5,
    marginBottom: 10,
  },
  activeLine: { 
    backgroundColor: '#00B894' 
  },
  
  // Stats
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
  },
  statItem: { 
    alignItems: 'center', 
    flex: 1 
  },
  statValue: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#333', 
    marginTop: 5 
  },
  statLabel: { 
    fontSize: 12, 
    color: '#666', 
    marginTop: 2 
  },
  statDivider: { 
    width: 1, 
    height: 30, 
    backgroundColor: '#e0e0e0' 
  },
  
  // Detailed Stats
  detailedStats: {
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
  },
  detailedStatsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  detailedStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailedStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  detailedStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  detailedStatLabel: {
    fontSize: 11,
    color: '#666',
  },
  
  // Route Section
  routeSection: { 
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
  },
  routeItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginVertical: 8,
  },
  routeIcon: { 
    alignItems: 'center',
    marginRight: 15,
    width: 12,
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  routeLine: {
    width: 1,
    height: 25,
    backgroundColor: '#ccc',
    marginVertical: 2,
  },
  routeTextContainer: { 
    flex: 1 
  },
  routeLabel: { 
    fontSize: 12, 
    color: '#999', 
    marginBottom: 2, 
    fontWeight: '500' 
  },
  routeAddress: { 
    fontSize: 14, 
    color: '#333', 
    lineHeight: 20 
  },
  navigateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginLeft: 10,
  },
  navigateButtonText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
    marginLeft: 5,
  },
  
  // Info Grid
  infoGrid: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 5,
    fontWeight: '500',
  },
  infoValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
    marginLeft: 8,
  },
  
  // Special Requests
  specialRequests: {
    backgroundColor: '#FFF3E0',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  specialRequestsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9800',
    marginBottom: 5,
  },
  specialRequestsText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  
  // Rating Section
  ratingSection: {
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
  },
  ratingLabel: { 
    fontSize: 14, 
    color: '#666', 
    marginBottom: 10, 
    fontWeight: '500' 
  },
  ratingSlider: { 
    width: '100%', 
    height: 40 
  },
  ratingStars: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    marginTop: 10,
  },
  ratingValue: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#333', 
    marginLeft: 10 
  },
  reviewInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginTop: 15,
    fontSize: 14,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minHeight: 50,
    textAlignVertical: 'top',
  },
  
  // Actions
  actions: { 
    gap: 12, 
    marginTop: 10 
  },
  primaryButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    padding: 18, 
    borderRadius: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  secondaryButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: '#f8f9fa', 
    padding: 18, 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 12,
  },
  secondaryButtonText: { 
    color: '#666', 
    fontSize: 16, 
    fontWeight: '600' 
  },
  
  // Chat
  chatContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: height * 0.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 2000,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  chatHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#00B894',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  chatAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  chatTitle: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#333' 
  },
  chatSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  chatMessages: { 
    flex: 1, 
    padding: 15 
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 18,
    marginBottom: 10,
  },
  sentMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#00B894',
    borderBottomRightRadius: 4,
  },
  receivedMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#f0f0f0',
    borderBottomLeftRadius: 4,
  },
  messageText: { 
    fontSize: 14, 
    color: '#333',
    lineHeight: 20,
  },
  sentMessageText: { 
    color: '#fff' 
  },
  messageTime: { 
    fontSize: 10, 
    color: '#999', 
    marginTop: 4, 
    alignSelf: 'flex-end' 
  },
  typingIndicator: {
    alignSelf: 'flex-start',
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 15,
    marginBottom: 10,
  },
  typingText: { 
    fontSize: 14, 
    color: '#666', 
    fontStyle: 'italic' 
  },
  chatInputContainer: {
    flexDirection: 'row',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'flex-end',
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 14,
    marginRight: 10,
    maxHeight: 100,
    minHeight: 40,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#00B894',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
});