// screens/driver/RideRequestsScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert,
  AppState, Vibration, Platform, Animated, Easing, ActivityIndicator,
  PermissionsAndroid
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import Geolocation from 'react-native-geolocation-service';
import socketService from 'services/socket'; // Your existing socket service
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSelector } from 'react-redux';

export default function RideRequestsScreen({ navigation }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [newRequestsCount, setNewRequestsCount] = useState(0);
  const [driverLocation, setDriverLocation] = useState(null);
  const [settings, setSettings] = useState({
    autoDeclineExpired: true,
    soundNotifications: true,
    vibrationNotifications: true,
    showRouteOnMap: true,
    autoAcceptEnabled: false,
    autoAcceptCriteria: {
      minFare: 500,
      maxDistance: 15,
      minRating: 4.0
    }
  });
  
  const [activeFilters, setActiveFilters] = useState({
    distance: 'all', // all, nearby (<5km), mid (5-10km), far (>10km)
    fare: 'all', // all, low (<1000), medium (1000-3000), high (>3000)
    rating: 'all' // all, high (>4.5), medium (4.0-4.5)
  });
  
  const appState = useRef(AppState.currentState);
  const watchId = useRef(null);
  const requestTimeoutRefs = useRef({});
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const newRequestAnim = useRef(new Animated.Value(0)).current;
  
  const user = useSelector(state => state.auth.user);

  // Initialize real-time ride requests
  useEffect(() => {
    initializeRealTimeRequests();
    
    // Request location permission and start tracking
    requestLocationPermission();
    
    // Listen for app state changes
    AppState.addEventListener('change', handleAppStateChange);
    
    // Load saved settings
    loadSettings();
    
    return () => {
      cleanup();
    };
  }, []);

  const initializeRealTimeRequests = async () => {
    try {
      setLoading(true);
      
      // Initialize socket if not connected
      if (!socketService.isConnected?.()) {
        await socketService.initialize();
      }
      
      // Set up socket listeners for ride requests
      setupSocketListeners();
      
      // Load existing requests from cache
      await loadCachedRequests();
      
      // Request current ride requests from server
      await fetchCurrentRequests();
      
      // Start real-time updates
      startRealTimeUpdates();
      
    } catch (error) {
      console.error('Real-time requests initialization error:', error);
      setConnectionStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const setupSocketListeners = () => {
    // Listen for new ride requests in real-time
    socketService.on('new_ride_request', handleNewRideRequest);
    
    // Listen for request cancellations
    socketService.on('ride_request_cancelled', handleRequestCancelled);
    
    // Listen for request expiry
    socketService.on('ride_request_expired', handleRequestExpired);
    
    // Listen for connection status
    socketService.on('connection_change', handleConnectionChange);
    
    // Listen for nearby drivers updates
    socketService.on('nearby_drivers_update', handleNearbyDriversUpdate);
    
    // Listen for surge pricing updates
    socketService.on('surge_pricing_update', handleSurgePricingUpdate);
  };

  const handleNewRideRequest = (requestData) => {
    console.log('New ride request received:', requestData);
    
    // Animate for new request
    animateNewRequest();
    
    // Check if request meets auto-accept criteria
    if (settings.autoAcceptEnabled && meetsAutoAcceptCriteria(requestData)) {
      autoAcceptRequest(requestData);
      return;
    }
    
    // Add to requests list
    const newRequest = {
      id: requestData.requestId,
      passengerName: requestData.passenger?.name || 'Passenger',
      passengerRating: requestData.passenger?.rating || 4.5,
      passengerId: requestData.passengerId,
      pickup: requestData.pickupAddress || 'Pickup location',
      destination: requestData.destinationAddress || 'Destination',
      distance: `${requestData.distance?.toFixed(1) || '3.2'} km`,
      fare: `MWK ${requestData.fare?.toLocaleString() || '1,200'}`,
      originalFare: requestData.fare || 1200,
      pickupCoords: requestData.pickupLocation || { latitude: -13.9626, longitude: 33.7741 },
      destinationCoords: requestData.destinationLocation || { latitude: -13.9632, longitude: 33.7750 },
      timeAgo: 'Just now',
      receivedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60000).toISOString(), // 1 minute expiry
      surgeMultiplier: requestData.surgeMultiplier || 1.0,
      estimatedDuration: requestData.estimatedDuration || 15,
      paymentMethod: requestData.paymentMethod || 'cash',
      specialRequests: requestData.specialRequests || null
    };
    
    setRequests(prev => [newRequest, ...prev]);
    setNewRequestsCount(prev => prev + 1);
    
    // Play notification if enabled
    playNotification();
    
    // Set expiry timeout
    setRequestExpiryTimeout(newRequest.id, newRequest.expiresAt);
    
    // Cache the request
    cacheRequests([newRequest, ...requests]);
    
    // Update connection status
    setConnectionStatus('connected');
  };

  const handleRequestCancelled = (cancellationData) => {
    console.log('Ride request cancelled:', cancellationData);
    
    // Remove from requests list
    setRequests(prev => prev.filter(request => request.id !== cancellationData.requestId));
    
    // Clear timeout if exists
    clearRequestTimeout(cancellationData.requestId);
    
    // Show notification
    Alert.alert(
      'Ride Cancelled',
      `Passenger cancelled the ride request`,
      [{ text: 'OK' }]
    );
  };

  const handleRequestExpired = (expiredData) => {
    console.log('Ride request expired:', expiredData);
    
    // Remove expired request
    setRequests(prev => prev.filter(request => request.id !== expiredData.requestId));
    
    // Clear timeout
    clearRequestTimeout(expiredData.requestId);
    
    if (settings.autoDeclineExpired) {
      console.log(`Auto-declined expired request: ${expiredData.requestId}`);
    }
  };

  const handleConnectionChange = (data) => {
    console.log('Connection status:', data.status);
    setConnectionStatus(data.status);
    
    if (data.status === 'connected') {
      // Sync data when reconnected
      syncRideRequests();
    }
  };

  const handleNearbyDriversUpdate = (data) => {
    console.log('Nearby drivers update:', data);
    // You can use this to show driver competition
  };

  const handleSurgePricingUpdate = (data) => {
    console.log('Surge pricing update:', data);
    // Update fares based on surge multiplier
    setRequests(prev => prev.map(request => {
      if (data.area === request.pickupArea) {
        return {
          ...request,
          fare: `MWK ${Math.round(request.originalFare * data.multiplier).toLocaleString()}`,
          surgeMultiplier: data.multiplier
        };
      }
      return request;
    }));
  };

  const handleAppStateChange = (nextAppState) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      // App came to foreground, refresh requests
      refreshRequests();
    } else if (nextAppState === 'background') {
      // App going to background, stop location updates
      stopLocationTracking();
    }
    
    appState.current = nextAppState;
  };

  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Kabaza Location Permission',
            message: 'Kabaza needs access to your location to show nearby ride requests',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          startLocationTracking();
        }
      } catch (err) {
        console.warn('Location permission error:', err);
      }
    } else {
      // iOS - update Info.plist with location permissions
      startLocationTracking();
    }
  };

  const startLocationTracking = () => {
    // Get initial position
    Geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude } = position.coords;
        setDriverLocation({ latitude, longitude });
        
        // Send location to server
        sendLocationToServer(latitude, longitude);
      },
      error => console.error('Location error:', error),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
    
    // Watch position for updates
    watchId.current = Geolocation.watchPosition(
      position => {
        const { latitude, longitude } = position.coords;
        setDriverLocation({ latitude, longitude });
        
        // Send location updates to server (throttled)
        sendLocationToServer(latitude, longitude);
      },
      error => console.error('Watch position error:', error),
      { enableHighAccuracy: true, distanceFilter: 50, interval: 10000 }
    );
  };

  const sendLocationToServer = (latitude, longitude) => {
    if (socketService.isConnected?.() && user?.id) {
      socketService.emit('driver_location_update', {
        driverId: user.id,
        location: { latitude, longitude },
        timestamp: new Date().toISOString()
      });
    }
  };

  const stopLocationTracking = () => {
    if (watchId.current !== null) {
      Geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
  };

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('ride_request_settings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadCachedRequests = async () => {
    try {
      const cachedRequests = await AsyncStorage.getItem('cached_ride_requests');
      if (cachedRequests) {
        const parsedRequests = JSON.parse(cachedRequests);
        
        // Filter out expired requests
        const now = new Date();
        const validRequests = parsedRequests.filter(request => {
          const expiry = new Date(request.expiresAt);
          return expiry > now;
        });
        
        setRequests(validRequests);
        
        // Set timeouts for remaining requests
        validRequests.forEach(request => {
          setRequestExpiryTimeout(request.id, request.expiresAt);
        });
      }
    } catch (error) {
      console.error('Error loading cached requests:', error);
    }
  };

  const cacheRequests = async (requestsToCache) => {
    try {
      await AsyncStorage.setItem('cached_ride_requests', JSON.stringify(requestsToCache));
    } catch (error) {
      console.error('Error caching requests:', error);
    }
  };

  const fetchCurrentRequests = async () => {
    try {
      if (!user?.id) return;
      
      // Fetch current ride requests from server
      socketService.emit('get_current_requests', {
        driverId: user.id,
        location: driverLocation,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error fetching current requests:', error);
    }
  };

  const refreshRequests = () => {
    setRefreshing(true);
    fetchCurrentRequests();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const syncRideRequests = () => {
    if (user?.id && socketService.isConnected?.()) {
      socketService.emit('sync_ride_requests', {
        driverId: user.id,
        lastSync: new Date(Date.now() - 300000).toISOString(), // Last 5 minutes
        timestamp: new Date().toISOString()
      });
    }
  };

  const startRealTimeUpdates = () => {
    // Start pulse animation for connection status
    startPulseAnimation();
    
    // Start new request indicator animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
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
  };

  const animateNewRequest = () => {
    // Reset and start animation
    newRequestAnim.setValue(0);
    Animated.sequence([
      Animated.timing(newRequestAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.ease,
        useNativeDriver: true,
      }),
      Animated.timing(newRequestAnim, {
        toValue: 0,
        duration: 300,
        easing: Easing.ease,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const playNotification = () => {
    if (settings.vibrationNotifications) {
      Vibration.vibrate([300, 100, 300]);
    }
    
    // You can add sound notification here using react-native-sound
    if (settings.soundNotifications) {
      // playNotificationSound();
    }
  };

  const setRequestExpiryTimeout = (requestId, expiresAt) => {
    const expiryTime = new Date(expiresAt).getTime();
    const now = Date.now();
    const timeRemaining = expiryTime - now;
    
    if (timeRemaining > 0) {
      requestTimeoutRefs.current[requestId] = setTimeout(() => {
        handleRequestExpiry(requestId);
      }, timeRemaining);
    }
  };

  const clearRequestTimeout = (requestId) => {
    if (requestTimeoutRefs.current[requestId]) {
      clearTimeout(requestTimeoutRefs.current[requestId]);
      delete requestTimeoutRefs.current[requestId];
    }
  };

  const handleRequestExpiry = (requestId) => {
    setRequests(prev => prev.filter(request => request.id !== requestId));
    
    if (settings.autoDeclineExpired) {
      // Notify server about auto-decline
      socketService.emit('request_auto_declined', {
        requestId,
        reason: 'expired',
        timestamp: new Date().toISOString()
      });
    }
    
    delete requestTimeoutRefs.current[requestId];
  };

  const meetsAutoAcceptCriteria = (requestData) => {
    if (!settings.autoAcceptEnabled) return false;
    
    const criteria = settings.autoAcceptCriteria;
    
    // Check minimum fare
    if (requestData.fare < criteria.minFare) return false;
    
    // Check maximum distance
    if (requestData.distance > criteria.maxDistance) return false;
    
    // Check passenger rating
    if (requestData.passenger?.rating < criteria.minRating) return false;
    
    return true;
  };

  const autoAcceptRequest = async (requestData) => {
    try {
      console.log('Auto-accepting ride request:', requestData);
      
      // Accept the request via socket
      socketService.emit('accept_ride_request', {
        requestId: requestData.requestId,
        driverId: user.id,
        timestamp: new Date().toISOString()
      });
      
      // Remove from local list
      setRequests(prev => prev.filter(req => req.requestId !== requestData.requestId));
      
      // Clear timeout
      clearRequestTimeout(requestData.requestId);
      
      // Show notification
      Alert.alert(
        '🚗 Ride Auto-Accepted!',
        `Auto-accepted ride to ${requestData.destinationAddress}`,
        [{ 
          text: 'View Ride', 
          onPress: () => navigation.navigate('ActiveRide', { 
            request: requestData,
            autoAccepted: true 
          }) 
        }]
      );
      
    } catch (error) {
      console.error('Auto-accept error:', error);
    }
  };

  const handleAcceptRide = async (requestId) => {
    try {
      const request = requests.find(r => r.id === requestId);
      
      Alert.alert(
        'Accept Ride?',
        `Accept ride from ${request.passengerName} for ${request.fare}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Accept', 
            onPress: async () => {
              // Send accept to server
              if (socketService.isConnected?.()) {
                socketService.emit('accept_ride_request', {
                  requestId,
                  driverId: user.id,
                  timestamp: new Date().toISOString()
                });
              }
              
              // Remove from local list
              setRequests(prev => prev.filter(r => r.id !== requestId));
              clearRequestTimeout(requestId);
              
              // Navigate to ActiveRideScreen
              navigation.navigate('ActiveRide', { 
                request,
                driverLocation 
              });
            }
          }
        ]
      );
    } catch (error) {
      console.error('Accept ride error:', error);
      Alert.alert('Error', 'Failed to accept ride. Please try again.');
    }
  };

  const handleRejectRide = async (requestId) => {
    try {
      // Send reject to server
      if (socketService.isConnected?.()) {
        socketService.emit('reject_ride_request', {
          requestId,
          driverId: user.id,
          reason: 'manual_rejection',
          timestamp: new Date().toISOString()
        });
      }
      
      // Remove from local list
      setRequests(prev => prev.filter(r => r.id !== requestId));
      clearRequestTimeout(requestId);
      
      // Show notification
      Alert.alert('Ride Rejected', 'Ride request removed');
      
    } catch (error) {
      console.error('Reject ride error:', error);
    }
  };

  const applyFilter = (filterType, value) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const getFilteredRequests = () => {
    let filtered = [...requests];
    
    // Apply distance filter
    if (activeFilters.distance !== 'all') {
      filtered = filtered.filter(request => {
        const distanceValue = parseFloat(request.distance.split(' ')[0]);
        switch(activeFilters.distance) {
          case 'nearby': return distanceValue < 5;
          case 'mid': return distanceValue >= 5 && distanceValue <= 10;
          case 'far': return distanceValue > 10;
          default: return true;
        }
      });
    }
    
    // Apply fare filter
    if (activeFilters.fare !== 'all') {
      filtered = filtered.filter(request => {
        const fareValue = request.originalFare;
        switch(activeFilters.fare) {
          case 'low': return fareValue < 1000;
          case 'medium': return fareValue >= 1000 && fareValue <= 3000;
          case 'high': return fareValue > 3000;
          default: return true;
        }
      });
    }
    
    // Apply rating filter
    if (activeFilters.rating !== 'all') {
      filtered = filtered.filter(request => {
        switch(activeFilters.rating) {
          case 'high': return request.passengerRating > 4.5;
          case 'medium': return request.passengerRating >= 4.0 && request.passengerRating <= 4.5;
          default: return true;
        }
      });
    }
    
    return filtered;
  };

  const cleanup = () => {
    // Clear all timeouts
    Object.values(requestTimeoutRefs.current).forEach(timeout => {
      clearTimeout(timeout);
    });
    requestTimeoutRefs.current = {};
    
    // Stop animations
    pulseAnim.stopAnimation();
    fadeAnim.stopAnimation();
    newRequestAnim.stopAnimation();
    
    // Remove socket listeners
    socketService.off('new_ride_request', handleNewRideRequest);
    socketService.off('ride_request_cancelled', handleRequestCancelled);
    socketService.off('ride_request_expired', handleRequestExpired);
    socketService.off('connection_change', handleConnectionChange);
    socketService.off('nearby_drivers_update', handleNearbyDriversUpdate);
    socketService.off('surge_pricing_update', handleSurgePricingUpdate);
    
    // Stop location tracking
    stopLocationTracking();
    
    // Remove app state listener
    AppState.removeEventListener('change', handleAppStateChange);
  };

  const renderConnectionStatus = () => {
    const statusConfig = {
      connected: { color: '#4CAF50', text: 'Live', icon: 'wifi' },
      connecting: { color: '#FF9800', text: 'Connecting...', icon: 'refresh' },
      disconnected: { color: '#F44336', text: 'Offline', icon: 'wifi' },
      error: { color: '#FF5722', text: 'Error', icon: 'exclamation-triangle' }
    };
    
    const config = statusConfig[connectionStatus] || statusConfig.disconnected;
    
    return (
      <Animated.View 
        style={[
          styles.connectionStatus,
          { 
            backgroundColor: config.color,
            transform: [{ scale: pulseAnim }]
          }
        ]}
      >
        <Icon name={config.icon} size={12} color="#fff" />
        <Text style={styles.connectionText}>{config.text}</Text>
        {newRequestsCount > 0 && (
          <View style={styles.newRequestsBadge}>
            <Text style={styles.newRequestsText}>{newRequestsCount}</Text>
          </View>
        )}
      </Animated.View>
    );
  };

  const renderFilters = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.filtersContainer}
    >
      <TouchableOpacity
        style={[
          styles.filterButton,
          activeFilters.distance === 'all' && styles.filterButtonActive
        ]}
        onPress={() => applyFilter('distance', 'all')}
      >
        <Text style={[
          styles.filterText,
          activeFilters.distance === 'all' && styles.filterTextActive
        ]}>All Distances</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.filterButton,
          activeFilters.distance === 'nearby' && styles.filterButtonActive
        ]}
        onPress={() => applyFilter('distance', 'nearby')}
      >
        <Text style={[
          styles.filterText,
          activeFilters.distance === 'nearby' && styles.filterTextActive
        ]}>Nearby</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.filterButton,
          activeFilters.fare === 'high' && styles.filterButtonActive
        ]}
        onPress={() => applyFilter('fare', 'high')}
      >
        <Text style={[
          styles.filterText,
          activeFilters.fare === 'high' && styles.filterTextActive
        ]}>High Fare</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.filterButton,
          activeFilters.rating === 'high' && styles.filterButtonActive
        ]}
        onPress={() => applyFilter('rating', 'high')}
      >
        <Text style={[
          styles.filterText,
          activeFilters.rating === 'high' && styles.filterTextActive
        ]}>High Rating</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.settingsButton}
        onPress={() => navigation.navigate('RideRequestSettings')}
      >
        <Icon name="sliders" size={16} color="#666" />
      </TouchableOpacity>
    </ScrollView>
  );

  const renderRequestCard = (request) => {
    const timeRemaining = Math.max(0, Math.floor((new Date(request.expiresAt) - new Date()) / 1000));
    
    return (
      <Animated.View 
        key={request.id} 
        style={[
          styles.requestCard,
          { 
            opacity: newRequestAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 0.7]
            })
          }
        ]}
      >
        <View style={styles.requestHeader}>
          <View style={styles.passengerInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {request.passengerName.charAt(0)}
              </Text>
            </View>
            <View>
              <Text style={styles.passengerName}>{request.passengerName}</Text>
              <View style={styles.ratingContainer}>
                <Icon name="star" size={12} color="#FFD700" />
                <Text style={styles.rating}>{request.passengerRating.toFixed(1)}</Text>
                {request.surgeMultiplier > 1 && (
                  <View style={styles.surgeBadge}>
                    <Icon name="bolt" size={10} color="#fff" />
                    <Text style={styles.surgeText}>{request.surgeMultiplier}x</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
          <View>
            <Text style={styles.timeAgo}>{request.timeAgo}</Text>
            <Text style={styles.timeRemaining}>{timeRemaining}s remaining</Text>
          </View>
        </View>

        {settings.showRouteOnMap && (
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              provider={PROVIDER_GOOGLE}
              initialRegion={{
                latitude: request.pickupCoords.latitude,
                longitude: request.pickupCoords.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
            >
              <Marker coordinate={request.pickupCoords} title="Pickup" pinColor="#00B894" />
              <Marker coordinate={request.destinationCoords} title="Destination" pinColor="#FF6B6B" />
              {driverLocation && (
                <Marker coordinate={driverLocation} title="You" pinColor="#2196F3">
                  <Icon name="car" size={24} color="#2196F3" />
                </Marker>
              )}
            </MapView>
          </View>
        )}

        <View style={styles.routeInfo}>
          <View style={styles.routeItem}>
            <Icon name="map-marker" size={16} color="#00B894" />
            <Text style={styles.routeText} numberOfLines={1}>{request.pickup}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.routeItem}>
            <Icon name="flag" size={16} color="#FF6B6B" />
            <Text style={styles.routeText} numberOfLines={1}>{request.destination}</Text>
          </View>
        </View>

        {request.specialRequests && (
          <View style={styles.specialRequest}>
            <Icon name="exclamation-circle" size={14} color="#FF9800" />
            <Text style={styles.specialRequestText}>{request.specialRequests}</Text>
          </View>
        )}

        <View style={styles.footer}>
          <View style={styles.fareInfo}>
            <Text style={styles.distance}>{request.distance} • {request.estimatedDuration} min</Text>
            <View style={styles.fareContainer}>
              <Text style={styles.fare}>{request.fare}</Text>
              <Text style={styles.paymentMethod}>{request.paymentMethod.toUpperCase()}</Text>
            </View>
          </View>
          <View style={styles.actions}>
            <TouchableOpacity 
              style={styles.rejectButton}
              onPress={() => handleRejectRide(request.id)}
            >
              <Icon name="times" size={18} color="#FF6B6B" />
              <Text style={styles.rejectText}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.acceptButton}
              onPress={() => handleAcceptRide(request.id)}
            >
              <Icon name="check" size={18} color="#fff" />
              <Text style={styles.acceptText}>Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00B894" />
        <Text style={styles.loadingText}>Connecting to ride requests...</Text>
      </View>
    );
  }

  const filteredRequests = getFilteredRequests();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Ride Requests</Text>
          {renderConnectionStatus()}
        </View>
        <Text style={styles.subtitle}>New requests from passengers</Text>
        
        {renderFilters()}
        
        <Animated.View style={[styles.newRequestIndicator, { opacity: fadeAnim }]}>
          <Icon name="bell" size={12} color="#FFD700" />
          <Text style={styles.newRequestText}>Listening for new requests...</Text>
        </Animated.View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={refreshRequests}
            colors={['#00B894']}
            tintColor="#00B894"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {filteredRequests.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="bell-slash" size={60} color="#ccc" />
            <Text style={styles.emptyText}>No ride requests at the moment</Text>
            <Text style={styles.emptySubtext}>
              {connectionStatus === 'connected' 
                ? 'You will be notified when new rides come in'
                : 'Connect to internet to receive ride requests'
              }
            </Text>
            {connectionStatus !== 'connected' && (
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={initializeRealTimeRequests}
              >
                <Text style={styles.retryText}>Retry Connection</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            <Text style={styles.resultsCount}>
              {filteredRequests.length} ride{filteredRequests.length !== 1 ? 's' : ''} available
            </Text>
            {filteredRequests.map(renderRequestCard)}
          </>
        )}
      </ScrollView>

      <TouchableOpacity 
        style={styles.floatingButton}
        onPress={() => navigation.navigate('RideRequestSettings')}
      >
        <Icon name="sliders" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
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
    padding: 20, 
    backgroundColor: '#fff', 
    paddingBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 15 },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    gap: 6,
  },
  connectionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  newRequestsBadge: {
    backgroundColor: '#fff',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  newRequestsText: {
    color: '#333',
    fontSize: 10,
    fontWeight: 'bold',
  },
  filtersContainer: {
    marginBottom: 10,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    marginRight: 10,
  },
  filterButtonActive: {
    backgroundColor: '#00B894',
  },
  filterText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
  },
  settingsButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newRequestIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 5,
  },
  newRequestText: {
    fontSize: 11,
    color: '#FF9800',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
    padding: 15,
  },
  resultsCount: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    fontWeight: '500',
  },
  emptyState: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 50,
    marginTop: 50,
  },
  emptyText: { 
    fontSize: 18, 
    color: '#666', 
    marginTop: 20, 
    fontWeight: '600' 
  },
  emptySubtext: { 
    fontSize: 14, 
    color: '#999', 
    marginTop: 10, 
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 25,
    paddingVertical: 10,
    backgroundColor: '#00B894',
    borderRadius: 25,
  },
  retryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  requestCard: { 
    backgroundColor: '#fff', 
    marginBottom: 15, 
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  requestHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  passengerInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: '#00B894', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 10 
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  passengerName: { fontSize: 16, fontWeight: '600', color: '#333' },
  ratingContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 2,
    gap: 5,
  },
  rating: { fontSize: 12, color: '#666', marginLeft: 2 },
  surgeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF9800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 3,
    marginLeft: 5,
  },
  surgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  timeAgo: { fontSize: 12, color: '#999' },
  timeRemaining: {
    fontSize: 11,
    color: '#F44336',
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'right',
  },
  mapContainer: { 
    height: 150, 
    borderRadius: 10, 
    overflow: 'hidden', 
    marginBottom: 15 
  },
  map: { flex: 1 },
  routeInfo: { marginBottom: 10 },
  routeItem: { flexDirection: 'row', alignItems: 'center', marginVertical: 5 },
  routeText: { fontSize: 14, color: '#333', marginLeft: 10, flex: 1 },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 5, marginLeft: 26 },
  specialRequest: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
    gap: 8,
  },
  specialRequestText: {
    fontSize: 12,
    color: '#E65100',
    flex: 1,
  },
  footer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginTop: 5,
  },
  fareInfo: { flex: 1 },
  distance: { fontSize: 14, color: '#666', marginBottom: 5 },
  fareContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fare: { fontSize: 18, fontWeight: 'bold', color: '#00B894' },
  paymentMethod: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  actions: { flexDirection: 'row', gap: 10 },
  rejectButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 15, 
    paddingVertical: 8, 
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  rejectText: { color: '#FF6B6B', marginLeft: 5, fontWeight: '600' },
  acceptButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 8, 
    borderRadius: 8,
    backgroundColor: '#00B894',
  },
  acceptText: { color: '#fff', marginLeft: 5, fontWeight: '600' },
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#00B894',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});