// screens/driver/ActiveRideScreen.js
import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSelector, useDispatch } from 'react-redux';
import Slider from '@react-native-community/slider';

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

// FIX THESE IMPORTS:
import { getUserData, saveUserData } from '@src/utils/userStorage'; // Check if named export
import LocationService from '@services/location/LocationService'; // Fixed path
import socketService, { SocketEvents } from '@services/socket/socketService'; // Fixed path
import { calculateFare, formatPrice } from '@services/ride/rideutils';

const windowDimensions = Dimensions.get('window') || { width: 375, height: 667 };
const { width, height } = windowDimensions;;

export default function ActiveRideScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const { currentLocation, isTrackingLocation } = useDriver();
  
  // Redux selectors
  const currentRide = useSelector(selectCurrentRideDetails);
  const driverLocation = useSelector(selectCurrentLocation);
  
  // State
  const [rideStatus, setRideStatus] = useState(currentRide?.status || 'accepted');
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
  
  // Refs
  const mapRef = useRef(null);
  const timerRef = useRef(null);
  const locationWatcherRef = useRef(null);
  const animationRef = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  
  // Mock or real data
  const rideData = currentRide || route.params?.request || {
    id: 'ride_123',
    passengerName: 'John Doe',
    passengerRating: 4.8,
    pickup: 'Area 3, Lilongwe',
    destination: '6th Avenue, Lilongwe, Malawi',
    distance: '3.2 km',
    fare: 'MWK 1,200',
    paymentMethod: 'cash',
    passengerPhone: '+265888123456',
  };

  // Initial coordinates (pickup and destination)
  const initialCoordinates = [
    { latitude: -13.9626, longitude: 33.7741 }, // Pickup
    { latitude: -13.9632, longitude: 33.7750 }, // Destination
  ];

  // ====================
  // LIFECYCLE & INITIALIZATION
  // ====================

  useEffect(() => {
    initializeRide();
    
    return () => {
      cleanupRide();
    };
  }, []);

  useEffect(() => {
    if (rideStatus === 'on_trip') {
      startRideTimer();
      startPulseAnimation();
    } else {
      stopRideTimer();
      stopPulseAnimation();
    }
  }, [rideStatus]);

  useEffect(() => {
    if (driverLocation && rideStatus !== 'completed') {
      updateDriverOnMap(driverLocation);
      calculateETA();
      updateDistanceTraveled();
    }
  }, [driverLocation]);

  // ====================
  // INITIALIZATION FUNCTIONS
  // ====================

  const initializeRide = async () => {
    try {
      setIsLoading(true);
      
      // Start location tracking for the ride
      await startLocationTracking();
      
      // Subscribe to ride updates via socket
      subscribeToRideUpdates();
      
      // Subscribe to chat messages
      subscribeToChat();
      
      // Initialize route coordinates
      await fetchRouteCoordinates();
      
      // Start ride timer
      startRideTimer();
      
      // Update driver location in real-time
      if (driverLocation) {
        setDriverCoordinates(driverLocation);
        animateToLocation(driverLocation);
      }
      
      // Send ride started notification
      if (rideStatus === 'accepted') {
        sendRideStatusUpdate('started');
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error initializing ride:', error);
      Alert.alert('Error', 'Failed to initialize ride tracking');
      setIsLoading(false);
    }
  };

  const startLocationTracking = async () => {
    try {
      // Use LocationService for accurate tracking
      const watchId = await LocationService.watchPositionForRide(
        rideData.id,
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            bearing: position.coords.heading,
            speed: position.coords.speed,
            timestamp: Date.now(),
          };
          
          // Update driver location in state
          setDriverCoordinates(location);
          
          // Send location update via socket
          socketService.emit(SocketEvents.LOCATION_UPDATE, {
            rideId: rideData.id,
            driverId: user?.id,
            location,
            timestamp: Date.now(),
          });
          
          // Dispatch to Redux
          dispatch(updateDriverLocation(location));
        },
        (error) => {
          console.error('Location tracking error:', error);
        },
        {
          enableHighAccuracy: true,
          distanceFilter: 5, // Update every 5 meters
          interval: 3000, // Update every 3 seconds
        }
      );
      
      locationWatcherRef.current = watchId;
      console.log('Location tracking started:', watchId);
    } catch (error) {
      console.error('Failed to start location tracking:', error);
    }
  };

  const subscribeToRideUpdates = () => {
    // Subscribe to ride status updates
    socketService.on(SocketEvents.RIDE_STATUS_UPDATE, (update) => {
      if (update.rideId === rideData.id) {
        handleRideUpdate(update);
      }
    });
    
    // Subscribe to ETA updates
    socketService.on(SocketEvents.ETA_UPDATE, (etaUpdate) => {
      if (etaUpdate.rideId === rideData.id) {
        setEta(etaUpdate.minutes);
      }
    });
    
    // Subscribe to cancellation
    socketService.on(SocketEvents.RIDE_CANCELLED, (cancellation) => {
      if (cancellation.rideId === rideData.id) {
        handleRideCancelled(cancellation);
      }
    });
  };

  const subscribeToChat = () => {
    socketService.on(`${SocketEvents.CHAT_MESSAGE}_${rideData.id}`, (message) => {
      setChatMessages(prev => [...prev, message]);
      
      // Show notification for new message
      if (!isChatOpen) {
        Alert.alert('New Message', `From ${message.senderName}: ${message.message}`, [
          { text: 'Reply', onPress: () => setIsChatOpen(true) },
          { text: 'Close', style: 'cancel' },
        ]);
      }
    });
    
    socketService.on(`${SocketEvents.TYPING}_${rideData.id}`, (typingData) => {
      if (typingData.userId !== user?.id) {
        setIsTyping(typingData.isTyping);
      }
    });
  };

  const fetchRouteCoordinates = async () => {
    // In a real app, you would fetch route from Google Directions API
    // For now, generate intermediate points between pickup and destination
    const points = generateRoutePoints(
      initialCoordinates[0],
      initialCoordinates[1],
      10 // Number of intermediate points
    );
    
    setRouteCoordinates([initialCoordinates[0], ...points, initialCoordinates[1]]);
  };

  // ====================
  // TIMER & ANIMATION
  // ====================

  const startRideTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    timerRef.current = setInterval(() => {
      setTimer(prev => prev + 1);
      setElapsedTime(prev => prev + 1);
    }, 1000);
  };

  const stopRideTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopPulseAnimation = () => {
    pulseAnimation.stopAnimation();
  };

  // ====================
  // RIDE STATUS HANDLERS
  // ====================

  const handlePassengerPickedUp = async () => {
    try {
      setIsLoading(true);
      
      // Update local state
      setRideStatus('on_trip');
      
      // Send update via socket
      await sendRideStatusUpdate('on_trip');
      
      // Start trip timer
      startRideTimer();
      
      // Update ride in storage
      await userStorage.updateRideInHistory(rideData.id, {
        status: 'on_trip',
        startedAt: Date.now(),
      });
      
      setIsLoading(false);
      
      Alert.alert(
        'Ride Started',
        'Trip is now in progress. Please drive safely.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error starting ride:', error);
      Alert.alert('Error', 'Failed to start ride');
      setIsLoading(false);
    }
  };

  const handleCompleteRide = async () => {
    Alert.alert(
      'Complete Ride',
      'Are you sure you want to complete this ride?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              setIsLoading(true);
              
              // Calculate final fare (including waiting time, distance, etc.)
              const finalFare = calculateFinalFare();
              
              // Update local state
              setRideStatus('completed');
              
              // Send completion via socket
              await sendRideStatusUpdate('completed', { fare: finalFare });
              
              // Dispatch Redux action
              await dispatch(completeRideTrip({
                rideId: rideData.id,
                rating: passengerRating,
                review: rideReview,
                paymentData: {
                  amount: finalFare,
                  method: rideData.paymentMethod || 'cash',
                  status: 'completed',
                },
              })).unwrap();
              
              // Stop location tracking
              await cleanupRide();
              
              // Show completion screen
              navigation.replace('RideCompletion', {
                ride: { ...rideData, fare: finalFare },
                rating: passengerRating,
                elapsedTime,
                distanceTraveled,
              });
              
              setIsLoading(false);
            } catch (error) {
              console.error('Error completing ride:', error);
              Alert.alert('Error', 'Failed to complete ride');
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleCancelRide = () => {
    Alert.alert(
      'Cancel Ride',
      'Are you sure you want to cancel this ride? This may affect your rating.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              
              // Show cancellation reason options
              Alert.alert(
                'Cancellation Reason',
                'Please select a reason for cancellation:',
                [
                  { text: 'Passenger Not Ready', onPress: () => cancelWithReason('passenger_not_ready') },
                  { text: 'Vehicle Issue', onPress: () => cancelWithReason('vehicle_issue') },
                  { text: 'Emergency', onPress: () => cancelWithReason('emergency') },
                  { text: 'Other', onPress: () => promptCustomReason() },
                  { text: 'Back', style: 'cancel' },
                ]
              );
            } catch (error) {
              console.error('Error cancelling ride:', error);
              Alert.alert('Error', 'Failed to cancel ride');
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const cancelWithReason = async (reason) => {
    try {
      // Send cancellation via socket
      await sendRideStatusUpdate('cancelled', { reason });
      
      // Dispatch Redux action
      await dispatch(cancelRideRequest({
        rideId: rideData.id,
        reason,
        cancelledBy: 'driver',
      })).unwrap();
      
      // Cleanup
      await cleanupRide();
      
      // Navigate back
      navigation.goBack();
      
      Alert.alert('Ride Cancelled', 'The ride has been cancelled.');
    } catch (error) {
      console.error('Error cancelling ride:', error);
      Alert.alert('Error', 'Failed to cancel ride');
    } finally {
      setIsLoading(false);
    }
  };

  const promptCustomReason = () => {
    // Implement custom reason input
    Alert.prompt(
      'Cancellation Reason',
      'Please enter the reason for cancellation:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: (reason) => cancelWithReason(`other: ${reason}`),
        },
      ]
    );
  };

  const handleRideUpdate = (update) => {
    if (update.status && update.status !== rideStatus) {
      setRideStatus(update.status);
      
      if (update.status === 'cancelled') {
        handleRideCancelled(update);
      }
    }
  };

  const handleRideCancelled = (cancellation) => {
    Alert.alert(
      'Ride Cancelled',
      `This ride has been cancelled${cancellation.reason ? `: ${cancellation.reason}` : ''}.`,
      [
        {
          text: 'OK',
          onPress: () => {
            cleanupRide();
            navigation.goBack();
          },
        },
      ]
    );
  };

  // ====================
  // MAP & LOCATION FUNCTIONS
  // ====================

  const updateDriverOnMap = (location) => {
    setDriverCoordinates(location);
    
    // Animate map to driver location if needed
    if (mapRef.current && rideStatus === 'on_trip') {
      mapRef.current.animateCamera({
        center: location,
        zoom: 15,
      });
    }
  };

  const animateToLocation = (location) => {
    if (mapRef.current) {
      mapRef.current.animateCamera({
        center: location,
        zoom: 15,
        duration: 1000,
      });
    }
  };

  const calculateETA = () => {
    if (!driverCoordinates || !routeCoordinates.length) return;
    
    // Simplified ETA calculation
    // In real app, use Google Distance Matrix API
    const remainingDistance = calculateRemainingDistance();
    const averageSpeed = 30; // km/h
    const etaMinutes = Math.ceil((remainingDistance / averageSpeed) * 60);
    
    setEta(Math.max(1, etaMinutes));
  };

  const calculateRemainingDistance = () => {
    if (!driverCoordinates || routeCoordinates.length < 2) return 0;
    
    // Find closest point on route
    let minDistance = Infinity;
    let closestIndex = 0;
    
    for (let i = 0; i < routeCoordinates.length; i++) {
      const distance = calculateDistance(driverCoordinates, routeCoordinates[i]);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    }
    
    // Calculate remaining distance from closest point to destination
    let remaining = 0;
    for (let i = closestIndex; i < routeCoordinates.length - 1; i++) {
      remaining += calculateDistance(routeCoordinates[i], routeCoordinates[i + 1]);
    }
    
    return remaining;
  };

  const updateDistanceTraveled = () => {
    // In a real app, you would accumulate distance from location updates
    // For now, simulate based on time
    if (rideStatus === 'on_trip') {
      const speed = 30 / 3600; // 30 km/h in km per second
      setDistanceTraveled(prev => prev + speed);
    }
  };

  // ====================
  // CHAT FUNCTIONS
  // ====================

  const sendMessage = () => {
    if (!newMessage.trim()) return;
    
    const message = {
      rideId: rideData.id,
      message: newMessage,
      senderId: user?.id,
      senderName: user?.name || 'Driver',
      senderType: 'driver',
      timestamp: Date.now(),
    };
    
    // Send via socket
    socketService.emit(SocketEvents.CHAT_MESSAGE, message);
    
    // Add to local state
    setChatMessages(prev => [...prev, message]);
    setNewMessage('');
    
    // Stop typing indicator
    sendTypingIndicator(false);
  };

  const sendTypingIndicator = (isTyping) => {
    socketService.emit(SocketEvents.TYPING, {
      rideId: rideData.id,
      userId: user?.id,
      isTyping,
      timestamp: Date.now(),
    });
  };

  // ====================
  // UTILITY FUNCTIONS
  // ====================

  const calculateFinalFare = () => {
    // Base fare calculation
    const baseFare = parseFloat(rideData.fare?.replace(/[^0-9.]/g, '') || 1200);
    
    // Add waiting time charges (if any)
    const waitingMinutes = Math.max(0, timer / 60 - 3); // First 3 minutes free
    const waitingCharge = waitingMinutes * 50; // 50 MWK per minute
    
    // Add distance-based charges
    const distanceCharge = distanceTraveled * 300; // 300 MWK per km
    
    return baseFare + waitingCharge + distanceCharge;
  };

  const sendRideStatusUpdate = async (status, extraData = {}) => {
    try {
      socketService.emit(SocketEvents.RIDE_STATUS_UPDATE, {
        rideId: rideData.id,
        driverId: user?.id,
        status,
        timestamp: Date.now(),
        ...extraData,
      });
    } catch (error) {
      console.error('Error sending status update:', error);
    }
  };

  const generateRoutePoints = (start, end, numPoints) => {
    const points = [];
    for (let i = 1; i <= numPoints; i++) {
      const fraction = i / (numPoints + 1);
      points.push({
        latitude: start.latitude + (end.latitude - start.latitude) * fraction,
        longitude: start.longitude + (end.longitude - start.longitude) * fraction,
      });
    }
    return points;
  };

  const calculateDistance = (coord1, coord2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (coord2.latitude - coord1.latitude) * Math.PI / 180;
    const dLon = (coord2.longitude - coord1.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(coord1.latitude * Math.PI / 180) * Math.cos(coord2.latitude * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const formatDistance = (km) => {
    if (km < 1) {
      return `${Math.round(km * 1000)}m`;
    }
    return `${km.toFixed(1)}km`;
  };

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
    
    // Clear refs
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // ====================
  // RENDER FUNCTIONS
  // ====================

  const renderStatusIndicator = () => {
    const statuses = [
      { key: 'accepted', label: 'Accepted' },
      { key: 'picking_up', label: 'Pickup' },
      { key: 'on_trip', label: 'On Trip' },
      { key: 'completed', label: 'Complete' },
    ];
    
    const currentIndex = statuses.findIndex(s => s.key === rideStatus);
    
    return (
      <View style={styles.statusContainer}>
        {statuses.map((status, index) => (
          <React.Fragment key={status.key}>
            <View style={styles.statusIndicator}>
              <View style={[
                styles.statusDot,
                index <= currentIndex && styles.activeDot,
                index === currentIndex && styles.currentDot,
              ]}>
                {index < currentIndex && (
                  <Icon name="check" size={8} color="#fff" />
                )}
              </View>
              <Text style={[
                styles.statusText,
                index <= currentIndex && styles.activeText,
              ]}>
                {status.label}
              </Text>
            </View>
            {index < statuses.length - 1 && (
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
    switch (rideStatus) {
      case 'accepted':
        return (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handlePassengerPickedUp}
            disabled={isLoading}
          >
            <MaterialIcons name="person-pin-circle" size={24} color="#fff" />
            <Text style={styles.primaryButtonText}>Passenger Picked Up</Text>
            {isLoading && <ActivityIndicator color="#fff" style={{ marginLeft: 10 }} />}
          </TouchableOpacity>
        );
        
      case 'picking_up':
        return (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handlePassengerPickedUp}
            disabled={isLoading}
          >
            <MaterialIcons name="person-pin-circle" size={24} color="#fff" />
            <Text style={styles.primaryButtonText}>Passenger Picked Up</Text>
            {isLoading && <ActivityIndicator color="#fff" style={{ marginLeft: 10 }} />}
          </TouchableOpacity>
        );
        
      case 'on_trip':
        return (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleCompleteRide}
            disabled={isLoading}
          >
            <MaterialIcons name="flag" size={24} color="#fff" />
            <Text style={styles.primaryButtonText}>Complete Ride</Text>
            {isLoading && <ActivityIndicator color="#fff" style={{ marginLeft: 10 }} />}
          </TouchableOpacity>
        );
        
      default:
        return null;
    }
  };

  const renderChatInterface = () => {
    if (!isChatOpen) return null;
    
    return (
      <Animated.View style={[
        styles.chatContainer,
        {
          transform: [{ translateY: animationRef }],
        },
      ]}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatTitle}>Chat with Passenger</Text>
          <TouchableOpacity onPress={() => setIsChatOpen(false)}>
            <Icon name="times" size={24} color="#666" />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.chatMessages}>
          {chatMessages.map((msg, index) => (
            <View
              key={index}
              style={[
                styles.messageBubble,
                msg.senderId === user?.id ? styles.sentMessage : styles.receivedMessage,
              ]}
            >
              <Text style={styles.messageText}>{msg.message}</Text>
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
            placeholder="Type a message..."
            onFocus={() => sendTypingIndicator(true)}
            onBlur={() => sendTypingIndicator(false)}
          />
          <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
            <Icon name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </Animated.View>
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
      >
        {/* Pickup Marker */}
        <Marker coordinate={initialCoordinates[0]} title="Pickup">
          <Animated.View style={[styles.markerContainer, { transform: [{ scale: pulseAnimation }] }]}>
            <View style={styles.pickupMarker}>
              <Icon name="map-marker" size={30} color="#00B894" />
            </View>
          </Animated.View>
        </Marker>

        {/* Destination Marker */}
        <Marker coordinate={initialCoordinates[1]} title="Destination">
          <View style={styles.destinationMarker}>
            <Icon name="flag" size={25} color="#FF6B6B" />
          </View>
        </Marker>

        {/* Driver Marker (if location available) */}
        {driverCoordinates && (
          <Marker coordinate={driverCoordinates} title="You" flat={true}>
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
            lineDashPattern={[10, 10]}
          />
        )}
      </MapView>

      {/* Header Overlay */}
      <View style={styles.headerOverlay}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={20} color="#333" />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Active Ride</Text>
          <Text style={styles.headerSubtitle}>
            {rideStatus === 'on_trip' ? 'Trip in progress' : 'Going to pickup'}
          </Text>
        </View>
        
        <TouchableOpacity
          style={styles.chatButton}
          onPress={() => setIsChatOpen(!isChatOpen)}
        >
          <Icon name="comments" size={20} color="#333" />
          {chatMessages.length > 0 && (
            <View style={styles.chatBadge}>
              <Text style={styles.chatBadgeText}>{chatMessages.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

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
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Passenger Info */}
          <View style={styles.passengerSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {rideData.passengerName?.charAt(0) || 'P'}
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

          {/* ETA & Distance */}
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

          {/* Route Details */}
          <View style={styles.routeSection}>
            <View style={styles.routeItem}>
              <View style={styles.routeIcon}>
                <Icon name="circle" size={12} color="#00B894" />
                <View style={styles.routeLine} />
              </View>
              <View style={styles.routeTextContainer}>
                <Text style={styles.routeLabel}>Pickup</Text>
                <Text style={styles.routeAddress}>
                  {rideData.pickup || 'Pickup location'}
                </Text>
              </View>
            </View>
            <View style={styles.routeItem}>
              <View style={styles.routeIcon}>
                <Icon name="flag" size={12} color="#FF6B6B" />
              </View>
              <View style={styles.routeTextContainer}>
                <Text style={styles.routeLabel}>Destination</Text>
                <Text style={styles.routeAddress}>
                  {rideData.destination || 'Destination'}
                </Text>
              </View>
            </View>
          </View>

          {/* Payment Method */}
          <View style={styles.paymentSection}>
            <Text style={styles.paymentLabel}>Payment Method</Text>
            <View style={styles.paymentMethod}>
              <Icon
                name={rideData.paymentMethod === 'cash' ? 'money' : 'credit-card'}
                size={18}
                color="#666"
              />
              <Text style={styles.paymentText}>
                {rideData.paymentMethod === 'cash' ? 'Cash' : 'Mobile Money'}
              </Text>
            </View>
          </View>

          {/* Rating Slider (for completion) */}
          {rideStatus === 'on_trip' && (
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
                    name="star"
                    size={24}
                    color={star <= passengerRating ? '#FFD700' : '#ddd'}
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
              />
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actions}>
            {renderActionButtons()}
            
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleCancelRide}
              disabled={isLoading}
            >
              <Icon name="times" size={20} color="#666" />
              <Text style={styles.secondaryButtonText}>
                {rideStatus === 'completed' ? 'Close' : 'Cancel Ride'}
              </Text>
            </TouchableOpacity>
            
            {/* Emergency/SOS Button */}
            <TouchableOpacity
              style={styles.emergencyButton}
              onPress={() => {
                Alert.alert(
                  'SOS Emergency',
                  'Are you sure you want to trigger emergency alert?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Call Emergency',
                      style: 'destructive',
                      onPress: () => {
                        // Implement emergency call
                        console.log('Emergency triggered');
                      },
                    },
                  ]
                );
              }}
            >
              <Icon name="exclamation-triangle" size={20} color="#fff" />
              <Text style={styles.emergencyButtonText}>SOS Emergency</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Animated.View>

      {/* Chat Interface */}
      {renderChatInterface()}
    </View>
  );
}

// ====================
// STYLES
// ====================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  map: { flex: 1 },
  
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
  headerInfo: { alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', textShadowColor: 'rgba(0,0,0,0.75)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', textShadowColor: 'rgba(0,0,0,0.75)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
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
  },
  chatBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  
  // Loading
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  
  // Map Markers
  markerContainer: { alignItems: 'center', justifyContent: 'center' },
  pickupMarker: { backgroundColor: '#fff', borderRadius: 20, padding: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
  destinationMarker: { backgroundColor: '#fff', borderRadius: 15, padding: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
  driverMarker: { backgroundColor: '#fff', borderRadius: 20, padding: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 6 },
  
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
  avatarText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  passengerDetails: { flex: 1 },
  passengerName: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 2 },
  ratingContainer: { flexDirection: 'row', alignItems: 'center' },
  rating: { fontSize: 14, color: '#666', marginLeft: 5, marginRight: 10 },
  phone: { fontSize: 14, color: '#666' },
  timerContainer: { alignItems: 'center' },
  timer: { fontSize: 18, fontWeight: '600', color: '#00B894', marginTop: 2 },
  
  // Status Indicator
  statusContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    marginBottom: 25,
    paddingHorizontal: 10,
  },
  statusIndicator: { alignItems: 'center', flex: 1 },
  statusDot: { 
    width: 24, 
    height: 24, 
    borderRadius: 12, 
    backgroundColor: '#e0e0e0',
    marginBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeDot: { backgroundColor: '#00B894' },
  currentDot: { 
    backgroundColor: '#00B894',
    shadowColor: '#00B894',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  statusText: { fontSize: 12, color: '#999', fontWeight: '500' },
  activeText: { color: '#00B894', fontWeight: '600' },
  statusLine: { 
    flex: 1, 
    height: 3, 
    backgroundColor: '#e0e0e0',
    marginHorizontal: 5,
    marginBottom: 10,
  },
  activeLine: { backgroundColor: '#00B894' },
  
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
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#333', marginTop: 5 },
  statLabel: { fontSize: 12, color: '#666', marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: '#e0e0e0' },
  
  // Route Section
  routeSection: { 
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
  },
  routeItem: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    marginVertical: 8,
  },
  routeIcon: { 
    alignItems: 'center',
    marginRight: 15,
    width: 12,
  },
  routeLine: {
    width: 1,
    height: 25,
    backgroundColor: '#ccc',
    marginVertical: 2,
  },
  routeTextContainer: { flex: 1 },
  routeLabel: { fontSize: 12, color: '#999', marginBottom: 2, fontWeight: '500' },
  routeAddress: { fontSize: 14, color: '#333', lineHeight: 20 },
  
  // Payment Section
  paymentSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
  },
  paymentLabel: { fontSize: 14, color: '#666', fontWeight: '500' },
  paymentMethod: { flexDirection: 'row', alignItems: 'center' },
  paymentText: { fontSize: 16, color: '#333', fontWeight: '600', marginLeft: 10 },
  
  // Rating Section
  ratingSection: {
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
  },
  ratingLabel: { fontSize: 14, color: '#666', marginBottom: 10, fontWeight: '500' },
  ratingSlider: { width: '100%', height: 40 },
  ratingStars: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    marginTop: 10,
  },
  ratingValue: { fontSize: 16, fontWeight: 'bold', color: '#333', marginLeft: 10 },
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
  actions: { gap: 12, marginTop: 10 },
  primaryButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: '#00B894', 
    padding: 18, 
    borderRadius: 12,
    gap: 12,
    shadowColor: '#00B894',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
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
  secondaryButtonText: { color: '#666', fontSize: 16, fontWeight: '600' },
  emergencyButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: '#FF6B6B', 
    padding: 18, 
    borderRadius: 12,
    gap: 12,
    marginTop: 5,
  },
  emergencyButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  
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
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  chatTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  chatMessages: { flex: 1, padding: 15 },
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
  messageText: { fontSize: 14, color: '#333' },
  sentMessageText: { color: '#fff' },
  messageTime: { fontSize: 10, color: '#999', marginTop: 4, alignSelf: 'flex-end' },
  typingIndicator: {
    alignSelf: 'flex-start',
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 15,
    marginBottom: 10,
  },
  typingText: { fontSize: 14, color: '#666', fontStyle: 'italic' },
  chatInputContainer: {
    flexDirection: 'row',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 14,
    marginRight: 10,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#00B894',
    justifyContent: 'center',
    alignItems: 'center',
  },
});