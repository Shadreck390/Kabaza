// screens/driver/TripDetailsScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking,
  Alert, ActivityIndicator, Animated, Easing, Share, AppState,
  Platform, Clipboard, RefreshControl
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import socketService from '../../services/socket'; // Your existing socket service
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSelector } from 'react-redux';

export default function TripDetailsScreen({ navigation, route }) {
  const [trip, setTrip] = useState(route.params?.trip || {
    id: '1',
    date: 'Today, 14:30',
    passengerName: 'John M.',
    passengerPhone: '+265 999 888 777',
    passengerRating: 5,
    passengerId: 'passenger_123',
    pickup: 'Shoprite, Lilongwe',
    destination: 'Kameza Roundabout',
    distance: '3.2 km',
    duration: '12 min',
    fare: 'MWK 1,200',
    originalFare: 1200,
    paymentMethod: 'Cash',
    status: 'completed', // completed, in_progress, cancelled, pending
    pickupCoords: { latitude: -13.9626, longitude: 33.7741 },
    destinationCoords: { latitude: -13.9632, longitude: 33.7750 },
    driverRating: 5,
    tip: 0,
    startedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    completedAt: new Date(Date.now() - 3000000).toISOString(), // 50 min ago
    notes: 'Smooth ride, polite passenger'
  });

  const [realTimeData, setRealTimeData] = useState({
    connectionStatus: 'connecting',
    liveLocation: null,
    passengerLocation: null,
    estimatedArrival: null,
    trafficUpdates: null,
    weatherConditions: null,
    lastUpdated: new Date().toISOString(),
    socketConnected: false
  });

  const [tripMetrics, setTripMetrics] = useState({
    fuelCost: 150,
    maintenanceCost: 50,
    netEarnings: 1000,
    carbonSaved: 2.5, // kg
    timeSaved: 15, // minutes
    ratingGiven: true
  });

  const [liveChat, setLiveChat] = useState({
    messages: [],
    unreadCount: 0,
    passengerTyping: false,
    lastMessageTime: null,
    chatEnabled: true
  });

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [mapRegion, setMapRegion] = useState(null);
  const [showRoute, setShowRoute] = useState(true);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [animatedValue] = useState(new Animated.Value(0));
  const [pulseAnim] = useState(new Animated.Value(1));
  
  const mapRef = useRef(null);
  const locationWatchId = useRef(null);
  const appState = useRef(AppState.currentState);
  const reconnectTimeout = useRef(null);
  const updateInterval = useRef(null);

  const user = useSelector(state => state.auth.user);
  const tripId = trip.id;

  // Initialize real-time trip details
  useEffect(() => {
    initializeRealTimeTrip();
    
    // Calculate route
    calculateRoute();
    
    // Setup app state listener
    AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      cleanup();
    };
  }, []);

  // Setup map region
  useEffect(() => {
    if (trip.pickupCoords && trip.destinationCoords) {
      const region = calculateMapRegion(trip.pickupCoords, trip.destinationCoords);
      setMapRegion(region);
      
      // Animate map to show route
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.fitToCoordinates([trip.pickupCoords, trip.destinationCoords], {
            edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
            animated: true,
          });
        }
      }, 500);
    }
  }, [trip]);

  const initializeRealTimeTrip = async () => {
    try {
      setLoading(true);
      
      // Load cached trip data
      await loadCachedTrip();
      
      // Initialize socket connection
      if (!socketService.isConnected?.()) {
        await socketService.initialize();
      }
      
      // Setup trip-specific socket listeners
      setupTripListeners();
      
      // Join trip room for real-time updates
      await joinTripRoom();
      
      // Start location tracking if trip is in progress
      if (trip.status === 'in_progress') {
        startLocationTracking();
      }
      
      // Start real-time updates
      startRealTimeUpdates();
      
      // Fetch additional trip data
      await fetchTripDetails();
      
    } catch (error) {
      console.error('Real-time trip initialization error:', error);
      Alert.alert('Connection Error', 'Could not load real-time trip details');
    } finally {
      setLoading(false);
    }
  };

  const setupTripListeners = () => {
    // Listen for trip status updates
    socketService.on('trip_status_update', handleTripStatusUpdate);
    
    // Listen for passenger location updates
    socketService.on('passenger_location_update', handlePassengerLocationUpdate);
    
    // Listen for traffic updates
    socketService.on('traffic_update', handleTrafficUpdate);
    
    // Listen for weather updates
    socketService.on('weather_update', handleWeatherUpdate);
    
    // Listen for chat messages
    socketService.on('trip_chat_message', handleChatMessage);
    
    // Listen for passenger typing
    socketService.on('passenger_typing', handlePassengerTyping);
    
    // Listen for connection status
    socketService.on('connection_change', handleConnectionChange);
    
    // Listen for fare adjustments
    socketService.on('fare_adjustment', handleFareAdjustment);
    
    // Listen for tip notifications
    socketService.on('tip_added', handleTipAdded);
  };

  const handleTripStatusUpdate = (statusData) => {
    console.log('Trip status update:', statusData);
    
    // Update trip status
    setTrip(prev => ({
      ...prev,
      status: statusData.status,
      ...(statusData.completedAt && { completedAt: statusData.completedAt }),
      ...(statusData.fare && { fare: `MWK ${statusData.fare.toLocaleString()}` }),
      ...(statusData.fare && { originalFare: statusData.fare })
    }));
    
    // Handle specific status changes
    switch(statusData.status) {
      case 'completed':
        handleTripCompleted(statusData);
        break;
      case 'cancelled':
        handleTripCancelled(statusData);
        break;
      case 'in_progress':
        handleTripStarted(statusData);
        break;
    }
    
    // Save updated trip
    saveTripToCache();
  };

  const handleTripCompleted = (data) => {
    console.log('Trip completed:', data);
    
    // Stop location tracking
    stopLocationTracking();
    
    // Show completion animation
    animateCompletion();
    
    // Update metrics
    if (data.fare) {
      const netEarnings = data.fare - tripMetrics.fuelCost - tripMetrics.maintenanceCost;
      setTripMetrics(prev => ({ ...prev, netEarnings }));
    }
    
    // Show notification
    Alert.alert(
      '🎉 Trip Completed!',
      `You earned ${trip.fare} from this trip.`,
      [{ text: 'Great!' }]
    );
  };

  const handleTripCancelled = (data) => {
    console.log('Trip cancelled:', data);
    
    // Stop location tracking
    stopLocationTracking();
    
    Alert.alert(
      'Trip Cancelled',
      data.reason || 'Trip was cancelled.',
      [
        { text: 'OK' },
        { 
          text: 'View Details', 
          onPress: () => showCancellationDetails(data) 
        }
      ]
    );
  };

  const handleTripStarted = (data) => {
    console.log('Trip started:', data);
    
    // Start location tracking
    startLocationTracking();
    
    // Send driver location to passenger
    sendDriverLocation();
  };

  const handlePassengerLocationUpdate = (locationData) => {
    console.log('Passenger location update:', locationData);
    
    setRealTimeData(prev => ({
      ...prev,
      passengerLocation: locationData.location,
      lastUpdated: new Date().toISOString()
    }));
    
    // Update ETA if needed
    if (realTimeData.liveLocation && trip.status === 'in_progress') {
      calculateETA(locationData.location);
    }
  };

  const handleTrafficUpdate = (trafficData) => {
    console.log('Traffic update:', trafficData);
    
    setRealTimeData(prev => ({
      ...prev,
      trafficUpdates: trafficData,
      lastUpdated: new Date().toISOString()
    }));
    
    // Update ETA based on traffic
    if (trafficData.etaAdjustment) {
      updateETA(trafficData.etaAdjustment);
    }
  };

  const handleWeatherUpdate = (weatherData) => {
    console.log('Weather update:', weatherData);
    
    setRealTimeData(prev => ({
      ...prev,
      weatherConditions: weatherData,
      lastUpdated: new Date().toISOString()
    }));
    
    // Show weather alert if severe
    if (weatherData.severity === 'severe') {
      Alert.alert(
        '⚠️ Weather Alert',
        weatherData.message,
        [{ text: 'OK' }]
      );
    }
  };

  const handleChatMessage = (messageData) => {
    console.log('Chat message received:', messageData);
    
    // Add message to chat
    const newMessage = {
      id: Date.now(),
      text: messageData.message,
      sender: 'passenger',
      timestamp: new Date().toISOString(),
      read: false
    };
    
    setLiveChat(prev => ({
      ...prev,
      messages: [...prev.messages, newMessage],
      unreadCount: prev.unreadCount + 1,
      lastMessageTime: new Date().toISOString()
    }));
    
    // Play notification sound
    if (messageData.notification) {
      // playMessageSound();
    }
  };

  const handlePassengerTyping = (typingData) => {
    console.log('Passenger typing:', typingData);
    
    setLiveChat(prev => ({
      ...prev,
      passengerTyping: typingData.isTyping
    }));
  };

  const handleConnectionChange = (data) => {
    console.log('Connection status:', data.status);
    
    setRealTimeData(prev => ({
      ...prev,
      connectionStatus: data.status,
      socketConnected: data.status === 'connected'
    }));
    
    if (data.status === 'connected') {
      // Rejoin trip room
      joinTripRoom();
    } else if (data.status === 'disconnected') {
      // Schedule reconnect
      scheduleReconnect();
    }
  };

  const handleFareAdjustment = (adjustmentData) => {
    console.log('Fare adjustment:', adjustmentData);
    
    // Update fare
    const newFare = trip.originalFare + adjustmentData.adjustment;
    setTrip(prev => ({
      ...prev,
      fare: `MWK ${newFare.toLocaleString()}`,
      originalFare: newFare
    }));
    
    // Show notification
    Alert.alert(
      '💰 Fare Adjustment',
      `Fare ${adjustmentData.adjustment > 0 ? 'increased' : 'decreased'} by MWK ${Math.abs(adjustmentData.adjustment).toLocaleString()}\nReason: ${adjustmentData.reason}`,
      [{ text: 'OK' }]
    );
  };

  const handleTipAdded = (tipData) => {
    console.log('Tip added:', tipData);
    
    // Update trip with tip
    setTrip(prev => ({
      ...prev,
      tip: tipData.amount,
      fare: `MWK ${(prev.originalFare + tipData.amount).toLocaleString()}`
    }));
    
    setTripMetrics(prev => ({
      ...prev,
      netEarnings: prev.netEarnings + tipData.amount
    }));
    
    // Show notification
    Alert.alert(
      '💝 Tip Received!',
      `${trip.passengerName} tipped you MWK ${tipData.amount.toLocaleString()}`,
      [{ text: 'Thank you!' }]
    );
    
    // Send thank you message automatically
    sendThankYouMessage(tipData.amount);
  };

  const handleAppStateChange = (nextAppState) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      // App came to foreground, refresh trip data
      refreshTripData();
    } else if (nextAppState === 'background') {
      // App going to background
      if (trip.status === 'in_progress') {
        // Send background status to passenger
        sendBackgroundStatus();
      }
    }
    
    appState.current = nextAppState;
  };

  const joinTripRoom = async () => {
    try {
      if (socketService.isConnected?.() && user?.id) {
        socketService.emit('join_trip_room', {
          tripId,
          driverId: user.id,
          passengerId: trip.passengerId,
          timestamp: new Date().toISOString()
        });
        
        console.log('Joined trip room:', tripId);
      }
    } catch (error) {
      console.error('Error joining trip room:', error);
    }
  };

  const startLocationTracking = () => {
    if (Platform.OS === 'android') {
      // Request location permission for Android
      // (You should implement permission request logic here)
    }
    
    // Get initial position
    Geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude } = position.coords;
        setRealTimeData(prev => ({
          ...prev,
          liveLocation: { latitude, longitude }
        }));
        
        // Send location to passenger
        sendDriverLocationUpdate(latitude, longitude);
      },
      error => console.error('Location error:', error),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
    
    // Watch position for updates
    locationWatchId.current = Geolocation.watchPosition(
      position => {
        const { latitude, longitude } = position.coords;
        setRealTimeData(prev => ({
          ...prev,
          liveLocation: { latitude, longitude }
        }));
        
        // Send location updates to passenger (throttled)
        sendDriverLocationUpdate(latitude, longitude);
      },
      error => console.error('Watch position error:', error),
      { enableHighAccuracy: true, distanceFilter: 10, interval: 5000 }
    );
  };

  const sendDriverLocationUpdate = (latitude, longitude) => {
    if (socketService.isConnected?.() && trip.status === 'in_progress') {
      socketService.emit('driver_location_update', {
        tripId,
        location: { latitude, longitude },
        timestamp: new Date().toISOString()
      });
    }
  };

  const sendDriverLocation = () => {
    if (realTimeData.liveLocation) {
      sendDriverLocationUpdate(
        realTimeData.liveLocation.latitude,
        realTimeData.liveLocation.longitude
      );
    }
  };

  const sendBackgroundStatus = () => {
    if (socketService.isConnected?.()) {
      socketService.emit('driver_background_status', {
        tripId,
        status: 'background',
        timestamp: new Date().toISOString()
      });
    }
  };

  const sendThankYouMessage = (tipAmount) => {
    if (socketService.isConnected?.()) {
      socketService.emit('trip_chat_message', {
        tripId,
        message: `Thank you for the MWK ${tipAmount.toLocaleString()} tip! 😊`,
        sender: 'driver',
        timestamp: new Date().toISOString()
      });
    }
  };

  const stopLocationTracking = () => {
    if (locationWatchId.current !== null) {
      Geolocation.clearWatch(locationWatchId.current);
      locationWatchId.current = null;
    }
  };

  const loadCachedTrip = async () => {
    try {
      const cachedTrip = await AsyncStorage.getItem(`trip_${tripId}`);
      if (cachedTrip) {
        const parsedTrip = JSON.parse(cachedTrip);
        setTrip(parsedTrip);
      }
    } catch (error) {
      console.error('Error loading cached trip:', error);
    }
  };

  const saveTripToCache = async () => {
    try {
      await AsyncStorage.setItem(`trip_${tripId}`, JSON.stringify(trip));
    } catch (error) {
      console.error('Error saving trip to cache:', error);
    }
  };

  const fetchTripDetails = async () => {
    try {
      if (!user?.id) return;
      
      // Request trip details from server
      socketService.emit('request_trip_details', {
        tripId,
        driverId: user.id,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error fetching trip details:', error);
    }
  };

  const refreshTripData = () => {
    setRefreshing(true);
    fetchTripDetails();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const scheduleReconnect = () => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    
    reconnectTimeout.current = setTimeout(() => {
      if (!realTimeData.socketConnected) {
        initializeRealTimeTrip();
      }
    }, 5000);
  };

  const calculateRoute = async () => {
    // In a real app, you would call a routing API here
    // For now, create a simple straight line route with a few points
    const route = [
      trip.pickupCoords,
      {
        latitude: (trip.pickupCoords.latitude + trip.destinationCoords.latitude) / 2,
        longitude: (trip.pickupCoords.longitude + trip.destinationCoords.longitude) / 2
      },
      trip.destinationCoords
    ];
    
    setRouteCoordinates(route);
  };

  const calculateMapRegion = (pickup, destination) => {
    const minLat = Math.min(pickup.latitude, destination.latitude);
    const maxLat = Math.max(pickup.latitude, destination.latitude);
    const minLng = Math.min(pickup.longitude, destination.longitude);
    const maxLng = Math.max(pickup.longitude, destination.longitude);
    
    const latitudeDelta = (maxLat - minLat) * 1.5;
    const longitudeDelta = (maxLng - minLng) * 1.5;
    
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    
    return {
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: Math.max(latitudeDelta, 0.01),
      longitudeDelta: Math.max(longitudeDelta, 0.01)
    };
  };

  const calculateETA = (passengerLocation) => {
    // Simple ETA calculation (in real app, use routing API)
    if (realTimeData.liveLocation && passengerLocation) {
      const distance = calculateDistance(
        realTimeData.liveLocation.latitude,
        realTimeData.liveLocation.longitude,
        passengerLocation.latitude,
        passengerLocation.longitude
      );
      
      const etaMinutes = Math.round((distance / 40) * 60); // Assuming 40 km/h average speed
      const etaTime = new Date(Date.now() + etaMinutes * 60000);
      
      setRealTimeData(prev => ({
        ...prev,
        estimatedArrival: etaTime.toISOString()
      }));
    }
  };

  const updateETA = (adjustmentMinutes) => {
    if (realTimeData.estimatedArrival) {
      const currentETA = new Date(realTimeData.estimatedArrival);
      const newETA = new Date(currentETA.getTime() + adjustmentMinutes * 60000);
      
      setRealTimeData(prev => ({
        ...prev,
        estimatedArrival: newETA.toISOString()
      }));
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    // Haversine formula
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

  const startRealTimeUpdates = () => {
    // Start pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    ).start();
    
    // Start periodic updates
    updateInterval.current = setInterval(() => {
      if (realTimeData.socketConnected && trip.status === 'in_progress') {
        // Request traffic and weather updates
        socketService.emit('request_traffic_update', { tripId });
        socketService.emit('request_weather_update', { tripId });
      }
    }, 30000); // Every 30 seconds
  };

  const animateCompletion = () => {
    Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 500,
        easing: Easing.ease,
        useNativeDriver: true,
      }),
      Animated.timing(animatedValue, {
        toValue: 0,
        duration: 500,
        easing: Easing.ease,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleCallPassenger = () => {
    const phoneNumber = trip.passengerPhone.replace(/\D/g, '');
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleShareTrip = async () => {
    try {
      const tripDetails = `
🚗 Trip Details:
Passenger: ${trip.passengerName}
From: ${trip.pickup}
To: ${trip.destination}
Fare: ${trip.fare}
Date: ${trip.date}
Trip ID: ${trip.id}
      `.trim();

      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(tripDetails);
        Alert.alert('Copied!', 'Trip details copied to clipboard');
      } else {
        await Share.share({
          message: tripDetails,
          title: 'Trip Details',
        });
      }
    } catch (error) {
      console.error('Error sharing trip:', error);
      Alert.alert('Error', 'Could not share trip details');
    }
  };

  const handleOpenChat = () => {
    if (liveChat.chatEnabled) {
      navigation.navigate('TripChat', {
        tripId,
        passengerName: trip.passengerName,
        passengerId: trip.passengerId,
        messages: liveChat.messages
      });
      
      // Mark messages as read
      setLiveChat(prev => ({
        ...prev,
        unreadCount: 0,
        messages: prev.messages.map(msg => ({ ...msg, read: true }))
      }));
    } else {
      Alert.alert('Chat Disabled', 'Chat is not available for this trip');
    }
  };

  const handleRatePassenger = () => {
    navigation.navigate('RatePassenger', {
      tripId,
      passengerName: trip.passengerName,
      passengerId: trip.passengerId
    });
  };

  const handleReportIssue = () => {
    navigation.navigate('ReportIssue', {
      tripId,
      passengerName: trip.passengerName
    });
  };

  const showCancellationDetails = (cancellationData) => {
    Alert.alert(
      'Cancellation Details',
      `Reason: ${cancellationData.reason}\n\nCancelled by: ${cancellationData.cancelledBy}\nTime: ${new Date(cancellationData.timestamp).toLocaleString()}`,
      [{ text: 'OK' }]
    );
  };

  const formatTime = (dateString) => {
    if (!dateString) return '--:--';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  const getStatusColor = () => {
    switch(trip.status) {
      case 'completed': return '#4CAF50';
      case 'in_progress': return '#2196F3';
      case 'cancelled': return '#F44336';
      case 'pending': return '#FF9800';
      default: return '#666';
    }
  };

  const getStatusIcon = () => {
    switch(trip.status) {
      case 'completed': return 'check-circle';
      case 'in_progress': return 'spinner';
      case 'cancelled': return 'times-circle';
      case 'pending': return 'clock-o';
      default: return 'info-circle';
    }
  };

  const cleanup = () => {
    // Clear intervals and timeouts
    if (updateInterval.current) {
      clearInterval(updateInterval.current);
    }
    
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    
    // Stop animations
    pulseAnim.stopAnimation();
    animatedValue.stopAnimation();
    
    // Stop location tracking
    stopLocationTracking();
    
    // Remove socket listeners
    socketService.off('trip_status_update', handleTripStatusUpdate);
    socketService.off('passenger_location_update', handlePassengerLocationUpdate);
    socketService.off('traffic_update', handleTrafficUpdate);
    socketService.off('weather_update', handleWeatherUpdate);
    socketService.off('trip_chat_message', handleChatMessage);
    socketService.off('passenger_typing', handlePassengerTyping);
    socketService.off('connection_change', handleConnectionChange);
    socketService.off('fare_adjustment', handleFareAdjustment);
    socketService.off('tip_added', handleTipAdded);
    
    // Leave trip room
    if (socketService.isConnected?.()) {
      socketService.emit('leave_trip_room', { tripId });
    }
    
    // Remove app state listener
    AppState.removeEventListener('change', handleAppStateChange);
  };

  const renderConnectionStatus = () => (
    <Animated.View 
      style={[
        styles.connectionStatus,
        { 
          backgroundColor: realTimeData.socketConnected ? '#4CAF50' : '#F44336',
          transform: [{ scale: pulseAnim }]
        }
      ]}
    >
      <View style={styles.connectionDot} />
      <Text style={styles.connectionText}>
        {realTimeData.socketConnected ? 'Live' : 'Offline'}
      </Text>
    </Animated.View>
  );

  const renderRealTimeInfo = () => {
    if (trip.status !== 'in_progress') return null;
    
    return (
      <View style={styles.realTimeInfo}>
        <View style={styles.realTimeItem}>
          <Icon name="clock-o" size={14} color="#2196F3" />
          <Text style={styles.realTimeText}>
            ETA: {realTimeData.estimatedArrival ? formatTime(realTimeData.estimatedArrival) : 'Calculating...'}
          </Text>
        </View>
        
        {realTimeData.trafficUpdates && (
          <View style={styles.realTimeItem}>
            <Icon name="road" size={14} color="#FF9800" />
            <Text style={styles.realTimeText}>
              Traffic: {realTimeData.trafficUpdates.severity}
            </Text>
          </View>
        )}
        
        {realTimeData.weatherConditions && (
          <View style={styles.realTimeItem}>
            <Icon name="cloud" size={14} color="#2196F3" />
            <Text style={styles.realTimeText}>
              {realTimeData.weatherConditions.condition}
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00B894" />
        <Text style={styles.loadingText}>Loading trip details...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={refreshTripData}
          colors={['#00B894']}
          tintColor="#00B894"
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={20} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Trip Details</Text>
          {renderConnectionStatus()}
        </View>
        <View style={styles.headerRight}>
          {liveChat.unreadCount > 0 && (
            <TouchableOpacity 
              style={styles.chatBadge}
              onPress={handleOpenChat}
            >
              <Icon name="comments" size={16} color="#fff" />
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{liveChat.unreadCount}</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Map Preview */}
      <Animated.View 
        style={[
          styles.mapContainer,
          { opacity: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0.7]
          })}
        ]}
      >
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={mapRegion}
          scrollEnabled={false}
          zoomEnabled={false}
        >
          <Marker coordinate={trip.pickupCoords} title="Pickup" pinColor="#00B894" />
          <Marker coordinate={trip.destinationCoords} title="Destination" pinColor="#FF6B6B" />
          
          {realTimeData.liveLocation && trip.status === 'in_progress' && (
            <Marker coordinate={realTimeData.liveLocation} title="You">
              <Icon name="car" size={24} color="#2196F3" />
            </Marker>
          )}
          
          {realTimeData.passengerLocation && trip.status === 'in_progress' && (
            <Marker coordinate={realTimeData.passengerLocation} title="Passenger">
              <Icon name="user" size={20} color="#FF6B6B" />
            </Marker>
          )}
          
          {showRoute && routeCoordinates.length > 0 && (
            <Polyline
              coordinates={routeCoordinates}
              strokeColor="#00B894"
              strokeWidth={3}
            />
          )}
        </MapView>
        
        {trip.status === 'in_progress' && (
          <TouchableOpacity 
            style={styles.locationButton}
            onPress={sendDriverLocation}
          >
            <Icon name="location-arrow" size={16} color="#fff" />
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Real-time Info */}
      {renderRealTimeInfo()}

      {/* Trip Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.statusBadge}>
          <Icon name={getStatusIcon()} size={14} color="#fff" />
          <Text style={styles.statusText}>{trip.status.replace('_', ' ').toUpperCase()}</Text>
        </View>
        
        <View style={styles.fareContainer}>
          <Text style={styles.fareLabel}>Total Fare</Text>
          <Text style={styles.fareAmount}>{trip.fare}</Text>
          {trip.tip > 0 && (
            <Text style={styles.tipText}>+ MWK {trip.tip.toLocaleString()} tip</Text>
          )}
        </View>
        
        <View style={styles.tripMeta}>
          <View style={styles.metaItem}>
            <Icon name="road" size={16} color="#666" />
            <Text style={styles.metaText}>{trip.distance}</Text>
          </View>
          <View style={styles.metaItem}>
            <Icon name="clock-o" size={16} color="#666" />
            <Text style={styles.metaText}>{trip.duration}</Text>
          </View>
          <View style={styles.metaItem}>
            <Icon name="money" size={16} color="#666" />
            <Text style={styles.metaText}>{trip.paymentMethod}</Text>
          </View>
        </View>
      </View>

      {/* Passenger Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Passenger</Text>
        <View style={styles.passengerCard}>
          <View style={styles.passengerInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{trip.passengerName.charAt(0)}</Text>
            </View>
            <View style={styles.passengerDetails}>
              <Text style={styles.passengerName}>{trip.passengerName}</Text>
              <View style={styles.ratingContainer}>
                {[...Array(5)].map((_, i) => (
                  <Icon 
                    key={i} 
                    name="star" 
                    size={14} 
                    color={i < trip.passengerRating ? "#FFD700" : "#ddd"} 
                  />
                ))}
                <Text style={styles.ratingText}>({trip.passengerRating}.0)</Text>
              </View>
            </View>
          </View>
          <View style={styles.passengerActions}>
            <TouchableOpacity style={styles.callButton} onPress={handleCallPassenger}>
              <Icon name="phone" size={18} color="#00B894" />
              <Text style={styles.callText}>Call</Text>
            </TouchableOpacity>
            {liveChat.chatEnabled && (
              <TouchableOpacity style={styles.chatButton} onPress={handleOpenChat}>
                <Icon name="comments" size={18} color="#2196F3" />
                {liveChat.unreadCount > 0 && (
                  <View style={styles.inlineBadge}>
                    <Text style={styles.inlineBadgeText}>{liveChat.unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        {liveChat.passengerTyping && (
          <View style={styles.typingIndicator}>
            <Text style={styles.typingText}>{trip.passengerName} is typing...</Text>
          </View>
        )}
      </View>

      {/* Trip Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trip Details</Text>
        <View style={styles.detailsCard}>
                    {/* Pickup */}
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Icon name="map-marker" size={18} color="#00B894" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Pickup Location</Text>
              <Text style={styles.detailValue}>{trip.pickup}</Text>
              {realTimeData.liveLocation && trip.status === 'in_progress' && (
                <Text style={styles.detailSubtext}>
                  You are {calculateDistance(
                    realTimeData.liveLocation.latitude,
                    realTimeData.liveLocation.longitude,
                    trip.pickupCoords.latitude,
                    trip.pickupCoords.longitude
                  ).toFixed(1)} km away
                </Text>
              )}
            </View>
          </View>

          <View style={styles.divider} />

          {/* Destination */}
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Icon name="flag" size={18} color="#FF6B6B" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Destination</Text>
              <Text style={styles.detailValue}>{trip.destination}</Text>
              {realTimeData.estimatedArrival && trip.status === 'in_progress' && (
                <Text style={styles.detailSubtext}>
                  Arrival: {formatTime(realTimeData.estimatedArrival)}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.divider} />

          {/* Date & Time */}
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Icon name="calendar" size={18} color="#666" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Date & Time</Text>
              <Text style={styles.detailValue}>{trip.date}</Text>
              {trip.startedAt && (
                <Text style={styles.detailSubtext}>
                  Started: {formatTime(trip.startedAt)}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.divider} />

          {/* Trip ID */}
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Icon name="hashtag" size={18} color="#666" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Trip ID</Text>
              <Text style={styles.detailValue}>{trip.id}</Text>
              <TouchableOpacity 
                style={styles.copyButton}
                onPress={() => {
                  Clipboard.setString(trip.id);
                  Alert.alert('Copied!', 'Trip ID copied to clipboard');
                }}
              >
                <Text style={styles.copyText}>Copy ID</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* Trip Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trip Metrics</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Icon name="tachometer" size={20} color="#2196F3" />
            <Text style={styles.metricValue}>MWK {tripMetrics.netEarnings.toLocaleString()}</Text>
            <Text style={styles.metricLabel}>Net Earnings</Text>
          </View>
          
          <View style={styles.metricCard}>
            <Icon name="gas-pump" size={20} color="#FF9800" />
            <Text style={styles.metricValue}>MWK {tripMetrics.fuelCost.toLocaleString()}</Text>
            <Text style={styles.metricLabel}>Fuel Cost</Text>
          </View>
          
          <View style={styles.metricCard}>
            <Icon name="leaf" size={20} color="#4CAF50" />
            <Text style={styles.metricValue}>{tripMetrics.carbonSaved} kg</Text>
            <Text style={styles.metricLabel}>CO₂ Saved</Text>
          </View>
          
          <View style={styles.metricCard}>
            <Icon name="clock" size={20} color="#9C27B0" />
            <Text style={styles.metricValue}>{tripMetrics.timeSaved} min</Text>
            <Text style={styles.metricLabel}>Time Saved</Text>
          </View>
        </View>
      </View>

      {/* Trip Notes */}
      {trip.notes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trip Notes</Text>
          <View style={styles.notesCard}>
            <Icon name="sticky-note" size={16} color="#666" style={styles.notesIcon} />
            <Text style={styles.notesText}>{trip.notes}</Text>
          </View>
        </View>
      )}

      {/* Real-time Updates */}
      {trip.status === 'in_progress' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Live Updates</Text>
          <View style={styles.updatesCard}>
            <View style={styles.updateItem}>
              <Icon name="wifi" size={16} color={realTimeData.socketConnected ? "#4CAF50" : "#F44336"} />
              <Text style={styles.updateLabel}>Connection</Text>
              <Text style={[
                styles.updateValue,
                { color: realTimeData.socketConnected ? "#4CAF50" : "#F44336" }
              ]}>
                {realTimeData.socketConnected ? 'Connected' : 'Offline'}
              </Text>
            </View>
            
            <View style={styles.updateItem}>
              <Icon name="refresh" size={16} color="#2196F3" />
              <Text style={styles.updateLabel}>Last Update</Text>
              <Text style={styles.updateValue}>
                {realTimeData.lastUpdated ? formatTime(realTimeData.lastUpdated) : 'Never'}
              </Text>
            </View>
            
            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={refreshTripData}
              disabled={refreshing}
            >
              <Icon name="sync" size={14} color={refreshing ? "#ccc" : "#00B894"} />
              <Text style={[
                styles.refreshText,
                { color: refreshing ? "#ccc" : "#00B894" }
              ]}>
                {refreshing ? 'Refreshing...' : 'Refresh Now'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.secondaryButton} onPress={handleShareTrip}>
          <Icon name="share-alt" size={18} color="#666" />
          <Text style={styles.secondaryButtonText}>Share Trip</Text>
        </TouchableOpacity>
        
        {trip.status === 'completed' && !tripMetrics.ratingGiven && (
          <TouchableOpacity style={styles.primaryButton} onPress={handleRatePassenger}>
            <Icon name="star" size={18} color="#fff" />
            <Text style={styles.primaryButtonText}>Rate Passenger</Text>
          </TouchableOpacity>
        )}
        
        {trip.status === 'completed' && tripMetrics.ratingGiven && (
          <TouchableOpacity style={styles.tertiaryButton} onPress={() => navigation.navigate('TripHistory')}>
            <Icon name="arrow-left" size={18} color="#fff" />
            <Text style={styles.tertiaryButtonText}>Back to History</Text>
          </TouchableOpacity>
        )}
        
        {trip.status === 'cancelled' && (
          <TouchableOpacity style={styles.reportButton} onPress={handleReportIssue}>
            <Icon name="exclamation-triangle" size={18} color="#fff" />
            <Text style={styles.reportButtonText}>Report Issue</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Last Updated */}
      <Text style={styles.lastUpdated}>
        Last updated: {realTimeData.lastUpdated ? formatTime(realTimeData.lastUpdated) : 'Never'}
        {realTimeData.socketConnected && ' • Live updates active'}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
  },
  backButton: { padding: 5 },
  headerCenter: { 
    flex: 1, 
    alignItems: 'center',
    marginHorizontal: 10,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
    marginTop: 5,
  },
  connectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  connectionText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  headerRight: { 
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 40,
    justifyContent: 'flex-end',
  },
  chatBadge: {
    position: 'relative',
    padding: 5,
  },
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FF6B6B',
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  mapContainer: { 
    height: 200,
    position: 'relative',
  },
  map: { flex: 1 },
  locationButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: '#2196F3',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  realTimeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  realTimeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  realTimeText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  summaryCard: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  statusBadge: {
    position: 'absolute',
    top: -10,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00B894',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  fareContainer: { alignItems: 'center', marginBottom: 15, marginTop: 10 },
  fareLabel: { fontSize: 14, color: '#666', marginBottom: 5 },
  fareAmount: { fontSize: 36, fontWeight: 'bold', color: '#00B894' },
  tipText: {
    fontSize: 12,
    color: '#FFD700',
    fontWeight: '600',
    marginTop: 5,
  },
  tripMeta: { 
    flexDirection: 'row', 
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 15,
  },
  metaItem: { alignItems: 'center' },
  metaText: { fontSize: 12, color: '#666', marginTop: 5 },
  section: { marginHorizontal: 15, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 10 },
  passengerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  passengerInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#00B894',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  passengerDetails: { flex: 1 },
  passengerName: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 5 },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ratingText: { fontSize: 12, color: '#666', marginLeft: 5 },
  passengerActions: { flexDirection: 'row', gap: 10 },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00B894',
    gap: 5,
  },
  callText: { fontSize: 14, color: '#00B894', fontWeight: '500' },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2196F3',
    gap: 5,
    position: 'relative',
  },
  inlineBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF6B6B',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  typingIndicator: {
    backgroundColor: '#E3F2FD',
    padding: 8,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  typingText: {
    fontSize: 12,
    color: '#2196F3',
    fontStyle: 'italic',
  },
  detailsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  detailRow: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    marginVertical: 10,
    minHeight: 50,
  },
  detailIcon: { 
    width: 30, 
    alignItems: 'center',
    paddingTop: 2,
  },
  detailContent: { flex: 1 },
  detailLabel: { fontSize: 12, color: '#999', marginBottom: 2 },
  detailValue: { fontSize: 14, color: '#333', fontWeight: '500' },
  detailSubtext: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
    fontStyle: 'italic',
  },
  divider: { 
    height: 1, 
    backgroundColor: '#eee', 
    marginLeft: 30, 
    marginVertical: 5 
  },
  copyButton: {
    marginTop: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  copyText: {
    fontSize: 10,
    color: '#666',
    fontWeight: '500',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 5,
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  notesCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  notesIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  notesText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  updatesCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  updateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  updateLabel: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
  },
  updateValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00B894',
    marginTop: 5,
    gap: 8,
  },
  refreshText: {
    fontSize: 14,
    fontWeight: '500',
  },
  actionsContainer: { 
    flexDirection: 'row', 
    flexWrap: 'wrap',
    gap: 10, 
    marginHorizontal: 15, 
    marginBottom: 20,
  },
  primaryButton: {
    flex: 1,
    minWidth: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00B894',
    padding: 16,
    borderRadius: 12,
    gap: 10,
  },
  primaryButtonText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  secondaryButton: {
    flex: 1,
    minWidth: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    gap: 10,
  },
  secondaryButtonText: { 
    color: '#666', 
    fontSize: 16, 
    fontWeight: '600' 
  },
  tertiaryButton: {
    flex: 1,
    minWidth: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 12,
    gap: 10,
  },
  tertiaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  reportButton: {
    flex: 1,
    minWidth: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F44336',
    padding: 16,
    borderRadius: 12,
    gap: 10,
  },
  reportButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  lastUpdated: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 15,
    fontStyle: 'italic',
  },
});