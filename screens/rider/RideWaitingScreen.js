// screens/rider/RideWaitingScreen.js - ENHANCED VERSION
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  Platform,
  Dimensions,
  Animated,
  Easing,
  PanResponder,
  SafeAreaView,
  TextInput,
  Modal,
} from 'react-native';
import { MaterialIconFallback as MaterialIcon } from '@src/utils/iconUtils';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, Circle } from 'react-native-maps';
import LinearGradient from 'react-native-linear-gradient';
import { BlurView } from '@react-native-community/blur';

import realTimeService from '@src/services/socket/realtimeUpdates';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';

const { width, height } = Dimensions.get('window');

// Animated Components
const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);
const AnimatedText = Animated.createAnimatedComponent(Text);
const AnimatedMap = Animated.createAnimatedComponent(MapView);
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export default function RideWaitingScreen({ route, navigation }) {
  const { 
    rideId, 
    rideData, 
    pickup, 
    destination, 
    paymentMethod,
    pickupCoords,
    destinationCoords,
    riderInfo,
    selectedDriver,
    isMock,
    socketRequestId,
  } = route.params || {};
  
  // States
  const [status, setStatus] = useState('searching'); // searching, matched, accepted, enroute, arrived
  const [driver, setDriver] = useState(selectedDriver || null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [estimatedArrival, setEstimatedArrival] = useState(rideData?.estimatedTime || '5-10 min');
  const [timer, setTimer] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [driverPath, setDriverPath] = useState([]);
  const [showDriverInfo, setShowDriverInfo] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [showDriverDetails, setShowDriverDetails] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [searchRadius, setSearchRadius] = useState(500); // meters
  const [showSearchAnimation, setShowSearchAnimation] = useState(true);
  const [driverETA, setDriverETA] = useState(null);
  const [driverBearing, setDriverBearing] = useState(0);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const headerOpacity = useRef(new Animated.Value(1)).current;
  const mapScale = useRef(new Animated.Value(1)).current;
  const mapOpacity = useRef(new Animated.Value(1)).current;
  const driverScale = useRef(new Animated.Value(0.9)).current;
  const driverOpacity = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const searchPulseAnim = useRef(new Animated.Value(1)).current;
  const driverMarkerScale = useRef(new Animated.Value(0)).current;
  const driverMarkerOpacity = useRef(new Animated.Value(0)).current;
  const routeLineAnim = useRef(new Animated.Value(0)).current;
  const modalScale = useRef(new Animated.Value(0.8)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;
  
  // Bottom sheet states
  const bottomSheetRef = useRef(null);
  const [snapPoints, setSnapPoints] = useState(['15%', '40%', '80%']); // Minimized, medium, expanded
  const [sheetIndex, setSheetIndex] = useState(1); // Start at medium
  
  // Map reference
  const mapRef = useRef(null);
  
  // Status colors
  const STATUS_COLORS = {
    searching: '#FBBC05',
    matched: '#4285F4',
    accepted: '#34A853',
    enroute: '#06C167',
    arrived: '#EA4335',
    cancelled: '#EF4444',
    no_drivers: '#9CA3AF',
  };
  
  // Status icons
  const STATUS_ICONS = {
    searching: 'search',
    matched: 'person-search',
    accepted: 'check-circle',
    enroute: 'directions-car',
    arrived: 'location-on',
    cancelled: 'cancel',
    no_drivers: 'error-outline',
  };
  
  // Status messages
  const STATUS_MESSAGES = {
    searching: 'Finding nearby drivers...',
    matched: 'Driver has been assigned',
    accepted: 'Driver accepted your ride',
    enroute: 'Driver is on the way',
    arrived: 'Driver has arrived!',
    cancelled: 'Ride was cancelled',
    no_drivers: 'No drivers available',
  };
  
  // Status descriptions
  const STATUS_DESCRIPTIONS = {
    searching: 'We\'re searching for available drivers near you',
    matched: 'Your ride has been matched with a driver',
    accepted: 'Driver confirmed and is preparing to pick you up',
    enroute: 'Driver is heading to your pickup location',
    arrived: 'Your driver is waiting for you at the pickup point',
    cancelled: 'The ride has been cancelled',
    no_drivers: 'No drivers are currently available in your area',
  };

  // Handle sheet changes
  const handleSheetChanges = (index) => {
    setSheetIndex(index);
  };

  // Animation on mount
  useEffect(() => {
    animateIn();
    
    // Check initial connection status
    const status = realTimeService.getConnectionStatus();
    setConnectionStatus(status.isConnected ? 'connected' : 'disconnected');
    
    // If in mock mode, simulate driver matching
    if (isMock) {
      simulateMockDriver();
    }
    
    // Listen for connection changes
    realTimeService.addConnectionListener((connected) => {
      setConnectionStatus(connected ? 'connected' : 'disconnected');
      
      if (connected && connectionStatus === 'disconnected') {
        // Reconnected - resubscribe to updates
        setupSubscriptions();
      }
    });

    // Set up all subscriptions
    const cleanupFunctions = setupSubscriptions();

    // Start search timer
    const timerInterval = setInterval(() => {
      setTimer(prev => prev + 1);
    }, 1000);

    // Search radius animation
    const radiusInterval = setInterval(() => {
      if (status === 'searching') {
        setSearchRadius(prev => (prev % 1000) + 100);
      }
    }, 500);

    // Start pulse animation
    startPulseAnimation();

    return () => {
      // Cleanup all subscriptions
      cleanupFunctions.forEach(cleanup => cleanup && cleanup());
      clearInterval(timerInterval);
      clearInterval(radiusInterval);
      realTimeService.removeConnectionListener();
    };
  }, []);

  // Update animations based on status
  useEffect(() => {
    if (status === 'enroute' && driverLocation) {
      animateDriverMarker();
      startRouteAnimation();
    }
    
    if (status === 'arrived') {
      animateArrival();
    }
  }, [status, driverLocation]);

  const animateIn = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(slideUpAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.spring(driverScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
        delay: 300,
      }),
      Animated.timing(driverOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
        delay: 300,
      }),
    ]).start();
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
      ])
    ).start();
  };

  const startSearchPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(searchPulseAnim, {
          toValue: 1.5,
          duration: 1500,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(searchPulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
      ])
    ).start();
  };

  const animateDriverMarker = () => {
    driverMarkerScale.setValue(0);
    driverMarkerOpacity.setValue(0);
    
    Animated.parallel([
      Animated.spring(driverMarkerScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 60,
        friction: 7,
      }),
      Animated.timing(driverMarkerOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateArrival = () => {
    Animated.sequence([
      Animated.timing(mapOpacity, {
        toValue: 0.7,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(mapOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(mapScale, {
        toValue: 1.1,
        useNativeDriver: true,
        tension: 150,
        friction: 3,
      }),
      Animated.spring(mapScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 150,
        friction: 3,
      }),
    ]).start();
  };

  const startRouteAnimation = () => {
    routeLineAnim.setValue(0);
    
    Animated.timing(routeLineAnim, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: true,
      easing: Easing.out(Easing.quad),
    }).start();
  };

  const animateModalIn = (modalType) => {
    if (modalType === 'cancel') {
      setShowCancelModal(true);
    } else if (modalType === 'sos') {
      setShowSOSModal(true);
    }
    
    modalScale.setValue(0.8);
    modalOpacity.setValue(0);
    
    Animated.parallel([
      Animated.spring(modalScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
      Animated.timing(modalOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateModalOut = (modalType) => {
    Animated.parallel([
      Animated.spring(modalScale, {
        toValue: 0.8,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
      Animated.timing(modalOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (modalType === 'cancel') {
        setShowCancelModal(false);
        setCancelReason('');
      } else if (modalType === 'sos') {
        setShowSOSModal(false);
      }
    });
  };

  const simulateMockDriver = () => {
    // Simulate driver matching after 3 seconds
    setTimeout(() => {
      setStatus('matched');
      setDriver({
        id: 'mock_driver_1',
        name: 'John Banda',
        rating: 4.8,
        totalRides: 245,
        vehicleType: rideData?.vehicleType?.includes('bike') ? 'bike' : 'car',
        vehicleModel: rideData?.vehicleType?.includes('bike') ? 'Honda CG 125' : 'Toyota Corolla',
        vehiclePlate: 'LL 1234 A',
        phone: '0999999999',
        color: rideData?.vehicleType?.includes('bike') ? '#FBBC05' : '#34A853',
      });
      setShowDriverInfo(true);
      
      // Simulate driver acceptance after 2 seconds
      setTimeout(() => {
        setStatus('accepted');
        
        // Simulate driver location
        const driverStartLocation = {
          latitude: pickupCoords.latitude + 0.01,
          longitude: pickupCoords.longitude + 0.01,
        };
        setDriverLocation(driverStartLocation);
        setDriverETA('5 min');
        
        // Simulate enroute after 3 seconds
        setTimeout(() => {
          setStatus('enroute');
          
          // Start simulated driver movement
          simulateDriverMovement(driverStartLocation);
        }, 3000);
      }, 2000);
    }, 3000);
  };

  const simulateDriverMovement = (startLocation) => {
    let currentLocation = { ...startLocation };
    const targetLocation = pickupCoords;
    const steps = 20;
    let step = 0;
    
    const moveDriver = () => {
      if (step >= steps || status !== 'enroute') return;
      
      step++;
      const progress = step / steps;
      
      // Calculate intermediate position
      const newLocation = {
        latitude: startLocation.latitude + (targetLocation.latitude - startLocation.latitude) * progress,
        longitude: startLocation.longitude + (targetLocation.longitude - startLocation.longitude) * progress,
      };
      
      // Calculate bearing (direction)
      const y = Math.sin(targetLocation.longitude - startLocation.longitude) * Math.cos(targetLocation.latitude);
      const x = Math.cos(startLocation.latitude) * Math.sin(targetLocation.latitude) -
                Math.sin(startLocation.latitude) * Math.cos(targetLocation.latitude) * 
                Math.cos(targetLocation.longitude - startLocation.longitude);
      const bearing = Math.atan2(y, x) * (180 / Math.PI);
      
      setDriverLocation(newLocation);
      setDriverBearing(bearing);
      setDriverETA(`${Math.round((1 - progress) * 5)} min`);
      
      // Update driver path
      setDriverPath(prev => [...prev.slice(-9), newLocation]);
      
      // Update map view
      if (mapRef.current && step % 5 === 0) {
        mapRef.current.animateToCoordinate(newLocation, 1000);
      }
      
      if (progress < 1) {
        setTimeout(moveDriver, 1000);
      } else {
        // Arrived
        setStatus('arrived');
        setDriverETA('Arrived');
        
        // Navigate to active ride after delay
        setTimeout(() => {
          navigation.navigate('ActiveRide', {
            rideId,
            driver: driver,
            pickup,
            destination,
            pickupCoords,
            destinationCoords,
            paymentMethod,
            rideData,
            riderInfo,
            isMock: true,
          });
        }, 2000);
      }
    };
    
    moveDriver();
  };

  const setupSubscriptions = () => {
    const cleanupFunctions = [];

    // Only setup real subscriptions if not in mock mode
    if (!isMock) {
      // 1. Subscribe to ride updates
      const unsubscribeRide = realTimeService.subscribeToRideUpdates(
        rideId || socketRequestId,
        handleRideUpdate
      );
      cleanupFunctions.push(unsubscribeRide);

      // 2. Subscribe to SOS responses
      const unsubscribeSOS = realTimeService.subscribeToSOSResponse(
        rideId || socketRequestId,
        handleSOSResponse
      );
      cleanupFunctions.push(unsubscribeSOS);
    }

    return cleanupFunctions;
  };

  const handleRideUpdate = (update) => {
    console.log('🔔 Ride update received:', update);
    
    setStatus(update.type || update.status);
    
    if (update.type === 'matched' || update.type === 'accepted' || update.status === 'accepted') {
      const driverData = update.driver || update.driverInfo;
      setDriver(driverData);
      setShowDriverInfo(true);
      
      // Animate driver card
      animateDriverCard();
      
      // Update estimated arrival
      if (update.estimatedArrival) {
        setEstimatedArrival(update.estimatedArrival);
      }
    }
    
    if (update.type === 'enroute' || update.status === 'enroute') {
      // Show driver on map and start tracking
      if (update.driverLocation) {
        setDriverLocation(update.driverLocation);
        updateMapToShowDriver(update.driverLocation);
      }
    }
    
    if (update.type === 'arrived' || update.status === 'arrived') {
      // Navigate to active ride screen
      setTimeout(() => {
        navigation.navigate('ActiveRide', {
          rideId: rideId,
          driver: driver || update.driver,
          pickup: pickup,
          destination: destination,
          pickupCoords: pickupCoords,
          destinationCoords: destinationCoords,
          paymentMethod: paymentMethod,
          rideData: rideData,
          riderInfo: riderInfo,
          isMock: isMock,
        });
      }, 2000);
    }
    
    if (update.type === 'cancelled' || update.status === 'cancelled') {
      handleRideCancelled(update.reason || 'Ride was cancelled');
    }
    
    if (update.type === 'no_drivers' || update.status === 'no_drivers') {
      handleNoDriversAvailable();
    }
  };

  const animateDriverCard = () => {
    Animated.sequence([
      Animated.spring(driverScale, {
        toValue: 1.05,
        useNativeDriver: true,
        tension: 150,
        friction: 3,
      }),
      Animated.spring(driverScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 150,
        friction: 3,
      }),
    ]).start();
  };

  const updateMapToShowDriver = (driverLocation) => {
    if (mapRef.current && driverLocation) {
      const coordinates = [
        pickupCoords || mapRegion,
        driverLocation,
        destinationCoords || { latitude: -13.9897, longitude: 33.7777 }
      ];
      
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 100, right: 100, bottom: 300, left: 100 },
        animated: true,
      });
    }
  };

  const handleRideCancelled = (reason) => {
    Alert.alert(
      'Ride Cancelled',
      reason || 'The driver cancelled the ride.',
      [
        { 
          text: 'OK', 
          onPress: () => {
            // Go back to ride selection
            navigation.navigate('RideSelection', {
              destination: destination,
              destinationAddress: destination,
              destinationCoordinates: destinationCoords,
              pickupLocation: pickup,
              pickupCoordinates: pickupCoords
            });
          }
        }
      ]
    );
  };

  const handleNoDriversAvailable = () => {
    Alert.alert(
      'No Drivers Available',
      'There are no drivers available in your area at the moment. Please try again later or select a different ride type.',
      [
        { 
          text: 'Try Again', 
          onPress: () => {
            // Go back to ride selection
            navigation.navigate('RideSelection', {
              destination: destination,
              destinationAddress: destination,
              destinationCoordinates: destinationCoords,
              pickupLocation: pickup,
              pickupCoordinates: pickupCoords
            });
          }
        },
        { 
          text: 'Cancel', 
          style: 'cancel',
          onPress: () => navigation.goBack()
        }
      ]
    );
  };

  const handleSOSResponse = (response) => {
    Alert.alert('🆕 Help is on the way!', response.message || 'Emergency services have been alerted and are on their way.', [
      { 
        text: 'OK', 
        onPress: () => {
          // You could add additional actions here
        }
      }
    ]);
  };

  const handleCancelRide = () => {
    if (!cancelReason.trim()) {
      Alert.alert('Reason Required', 'Please provide a reason for cancellation');
      return;
    }
    
    // Button animation
    Animated.sequence([
      Animated.spring(buttonScale, {
        toValue: 0.95,
        useNativeDriver: true,
        tension: 150,
        friction: 3,
      }),
      Animated.spring(buttonScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 150,
        friction: 3,
      }),
    ]).start();
    
    if (!isMock) {
      realTimeService.cancelRideRequest(rideId || socketRequestId, cancelReason);
    }
    
    animateModalOut('cancel');
    
    setTimeout(() => {
      navigation.goBack();
    }, 300);
  };

  const handleSOS = () => {
    animateModalOut('sos');
    
    // Simulate SOS response
    setTimeout(() => {
      Alert.alert(
        '🚨 Emergency SOS',
        'This will alert nearby drivers, emergency contacts, and local authorities. Only use in real emergencies.',
        [
          { 
            text: 'Cancel', 
            style: 'cancel' 
          },
          { 
            text: 'SEND EMERGENCY ALERT', 
            style: 'destructive',
            onPress: () => {
              const location = driverLocation || pickupCoords || { latitude: -13.9626, longitude: 33.7741 };
              
              if (!isMock) {
                realTimeService.sendSOSAlert(
                  rideId || socketRequestId,
                  location,
                  'Emergency assistance requested by rider',
                  'emergency'
                );
              }
              
              Alert.alert(
                'SOS Alert Sent',
                'Help is on the way. Stay on the line if possible.',
                [{ text: 'OK' }]
              );
            }
          }
        ]
      );
    }, 300);
  };

  const handleChatWithDriver = () => {
    if (driver) {
      navigation.navigate('RideChat', {
        rideId: rideId || socketRequestId,
        driverId: driver.id,
        driverName: driver.name,
        riderId: riderInfo?.userId,
        riderName: riderInfo?.userName,
        isMock: isMock,
      });
    }
  };

  const handleCallDriver = () => {
    if (driver?.phone) {
      Alert.alert(
        'Call Driver',
        `Call ${driver.name} at ${driver.phone}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Call', 
            onPress: () => {
              // Phone call functionality would go here
              Alert.alert('Call Function', 'Phone call would be initiated here');
            }
          }
        ]
      );
    } else {
      Alert.alert('No Phone Number', 'Driver phone number is not available.');
    }
  };

  const handleShareStatus = () => {
    const shareMessage = `🚗 My Kabaza Ride Status:
📍 From: ${pickup}
🏁 To: ${destination}
👤 Driver: ${driver?.name || 'Searching...'}
⏰ Status: ${status.toUpperCase()}
🕒 ETA: ${driverETA || estimatedArrival}

Track my ride in real-time!`;
    
    // In a real app, you would use Share API
    Alert.alert(
      'Share Ride Status',
      shareMessage,
      [
        { text: 'Copy', onPress: () => {
          // Copy to clipboard
          Alert.alert('Copied!', 'Ride status copied to clipboard');
        }},
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderSearchAnimation = () => (
    <AnimatedView 
      style={[
        styles.searchAnimation,
        {
          transform: [{ scale: searchPulseAnim }],
          opacity: searchPulseAnim.interpolate({
            inputRange: [1, 1.5],
            outputRange: [0.3, 0.7],
          }),
        },
      ]}
    >
      <View style={styles.searchRing}>
        <MaterialIcon name="search" size={30} color={STATUS_COLORS.searching} />
      </View>
    </AnimatedView>
  );

  const renderCancelModal = () => (
    <Modal
      visible={showCancelModal}
      transparent
      animationType="none"
      onRequestClose={() => animateModalOut('cancel')}
    >
      <AnimatedView style={[styles.modalOverlay, { opacity: modalOpacity }]}>
        <AnimatedView style={[styles.modalContent, { transform: [{ scale: modalScale }] }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Cancel Ride</Text>
            <TouchableOpacity onPress={() => animateModalOut('cancel')}>
              <MaterialIcon name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalBody}>
            <Text style={styles.modalText}>
              Are you sure you want to cancel this ride request?
              {status !== 'searching' && ' A cancellation fee may apply.'}
            </Text>
            
            <TextInput
              style={styles.reasonInput}
              placeholder="Reason for cancellation (optional)"
              value={cancelReason}
              onChangeText={setCancelReason}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalButtonSecondary}
                onPress={() => animateModalOut('cancel')}
              >
                <Text style={styles.modalButtonTextSecondary}>Don't Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalButtonPrimary}
                onPress={handleCancelRide}
              >
                <Text style={styles.modalButtonTextPrimary}>Cancel Ride</Text>
              </TouchableOpacity>
            </View>
          </View>
        </AnimatedView>
      </AnimatedView>
    </Modal>
  );

  const renderSOSModal = () => (
    <Modal
      visible={showSOSModal}
      transparent
      animationType="none"
      onRequestClose={() => animateModalOut('sos')}
    >
      <AnimatedView style={[styles.modalOverlay, { opacity: modalOpacity }]}>
        <AnimatedView style={[styles.modalContent, { transform: [{ scale: modalScale }] }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>🚨 Emergency SOS</Text>
            <TouchableOpacity onPress={() => animateModalOut('sos')}>
              <MaterialIcon name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalBody}>
            <View style={styles.sosWarning}>
              <MaterialIcon name="warning" size={40} color="#EA4335" />
              <Text style={styles.sosWarningText}>
                This will immediately alert:
              </Text>
              <View style={styles.sosList}>
                <View style={styles.sosItem}>
                  <MaterialIcon name="directions-car" size={16} color="#666" />
                  <Text style={styles.sosItemText}>Nearby drivers</Text>
                </View>
                <View style={styles.sosItem}>
                  <MaterialIcon name="contact-emergency" size={16} color="#666" />
                  <Text style={styles.sosItemText}>Emergency contacts</Text>
                </View>
                <View style={styles.sosItem}>
                  <MaterialIcon name="local-police" size={16} color="#666" />
                  <Text style={styles.sosItemText}>Local authorities</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalButtonSecondary}
                onPress={() => animateModalOut('sos')}
              >
                <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.sosButton}
                onPress={handleSOS}
              >
                <MaterialIcon name="emergency" size={20} color="#FFF" />
                <Text style={styles.sosButtonText}>SEND SOS</Text>
              </TouchableOpacity>
            </View>
          </View>
        </AnimatedView>
      </AnimatedView>
    </Modal>
  );

  const renderBottomSheetContent = () => (
    <BottomSheetScrollView 
      contentContainerStyle={styles.bottomSheetContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Status Header */}
      <View style={styles.statusHeader}>
        <View style={styles.statusIconContainer}>
          {status === 'searching' ? (
            <ActivityIndicator size="large" color={STATUS_COLORS[status]} />
          ) : (
            <MaterialIcon 
              name={STATUS_ICONS[status]} 
              size={28} 
              color={STATUS_COLORS[status]} 
            />
          )}
        </View>
        
        <View style={styles.statusTextContainer}>
          <Text style={styles.statusTitle}>{STATUS_MESSAGES[status]}</Text>
          <Text style={styles.statusDescription}>
            {STATUS_DESCRIPTIONS[status]}
          </Text>
        </View>
      </View>

      {/* Driver Card - Only show when driver is assigned */}
      {driver && showDriverInfo && (
        <TouchableOpacity 
          style={styles.driverCard}
          onPress={() => setShowDriverDetails(!showDriverDetails)}
          activeOpacity={0.8}
        >
          <View style={styles.driverHeader}>
            <View style={[styles.driverAvatar, { backgroundColor: driver.color || '#06C167' }]}>
              <Text style={styles.driverInitial}>
                {driver.name?.charAt(0)?.toUpperCase() || 'D'}
              </Text>
            </View>
            
            <View style={styles.driverInfo}>
              <Text style={styles.driverName}>{driver.name}</Text>
              <View style={styles.driverMeta}>
                <View style={styles.ratingContainer}>
                  <MaterialIcon name="star" size={14} color="#F59E0B" />
                  <Text style={styles.rating}>{driver.rating || '4.8'}</Text>
                </View>
                <Text style={styles.ridesCount}>• {driver.totalRides || '245'} rides</Text>
                <Text style={styles.vehicleType}>• {driver.vehicleType || 'Car'}</Text>
              </View>
            </View>
            
            <MaterialIcon 
              name={showDriverDetails ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
              size={24} 
              color="#666" 
            />
          </View>

          {showDriverDetails && (
            <View style={styles.driverDetails}>
              <View style={styles.driverDetailRow}>
                <MaterialCommunityIcon 
                  name={driver.vehicleType?.includes('bike') ? 'motorcycle' : 'car'} 
                  size={16} 
                  color="#666" 
                />
                <Text style={styles.driverDetailText}>{driver.vehicleModel || 'Toyota Corolla'}</Text>
                <Text style={styles.driverDetailPlate}>{driver.vehiclePlate || 'LL 1234 A'}</Text>
              </View>
              
              <View style={styles.driverActions}>
                <TouchableOpacity style={styles.driverActionButton} onPress={handleCallDriver}>
                  <MaterialIcon name="phone" size={18} color="#4285F4" />
                  <Text style={styles.driverActionText}>Call</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.driverActionButton} onPress={handleChatWithDriver}>
                  <MaterialIcon name="chat" size={18} color="#34A853" />
                  <Text style={styles.driverActionText}>Message</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.driverActionButton} onPress={handleShareStatus}>
                  <MaterialIcon name="share" size={18} color="#8B5CF6" />
                  <Text style={styles.driverActionText}>Share</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* Ride Details */}
      <View style={styles.rideDetails}>
        <View style={styles.rideDetailRow}>
          <View style={styles.rideDetailIcon}>
            <MaterialIcon name="my-location" size={18} color="#4285F4" />
          </View>
          <View style={styles.rideDetailText}>
            <Text style={styles.rideDetailLabel}>PICKUP</Text>
            <Text style={styles.rideDetailValue} numberOfLines={1}>
              {pickup || 'Your Location'}
            </Text>
          </View>
        </View>
        
        <View style={styles.routeLine} />
        
        <View style={styles.rideDetailRow}>
          <View style={styles.rideDetailIcon}>
            <MaterialIcon name="place" size={18} color="#EA4335" />
          </View>
          <View style={styles.rideDetailText}>
            <Text style={styles.rideDetailLabel}>DESTINATION</Text>
            <Text style={styles.rideDetailValue} numberOfLines={1}>
              {destination || 'Destination'}
            </Text>
          </View>
        </View>
      </View>

      {/* Ride Info Cards */}
      <View style={styles.rideInfoContainer}>
        <View style={styles.rideInfoCard}>
          <MaterialIcon name="access-time" size={20} color="#06C167" />
          <Text style={styles.rideInfoLabel}>Est. arrival</Text>
          <Text style={styles.rideInfoValue}>{driverETA || estimatedArrival}</Text>
        </View>
        
        <View style={styles.rideInfoCard}>
          <MaterialIcon name="attach-money" size={20} color="#06C167" />
          <Text style={styles.rideInfoLabel}>Fare</Text>
          <Text style={styles.rideInfoValue}>
            {rideData?.formattedPrice || 'MK 15,000'}
          </Text>
        </View>
        
        <View style={styles.rideInfoCard}>
          <MaterialIcon 
            name={paymentMethod === 'cash' ? 'attach-money' : paymentMethod === 'card' ? 'credit-card' : 'smartphone'} 
            size={20} 
            color="#06C167" 
          />
          <Text style={styles.rideInfoLabel}>Payment</Text>
          <Text style={styles.rideInfoValue}>
            {paymentMethod === 'cash' ? 'Cash' : 
             paymentMethod === 'card' ? 'Card' : 'Mobile'}
          </Text>
        </View>
      </View>

      {/* Cancel Button */}
      <TouchableOpacity 
        style={styles.cancelButton}
        onPress={() => animateModalIn('cancel')}
      >
        <Text style={styles.cancelButtonText}>
          {status === 'searching' ? 'Cancel Search' : 'Cancel Ride'}
        </Text>
      </TouchableOpacity>
    </BottomSheetScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* HEADER */}
      <AnimatedView style={[styles.header, { opacity: headerOpacity }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => {
            if (status === 'searching') {
              animateModalIn('cancel');
            } else {
              navigation.goBack();
            }
          }}
        >
          <MaterialIcon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Ride Requested</Text>
          <View style={styles.timerContainer}>
            <MaterialIcon name="access-time" size={14} color="#666" />
            <Text style={styles.timerText}>{formatTime(timer)}</Text>
          </View>
        </View>
        
        <View style={styles.connectionStatus}>
          <View style={[
            styles.connectionDot, 
            { backgroundColor: connectionStatus === 'connected' ? '#10B981' : '#EF4444' }
          ]} />
          <Text style={styles.connectionText}>
            {connectionStatus === 'connected' ? 'Live' : 'Offline'}
          </Text>
        </View>
      </AnimatedView>

      {/* MAP SECTION */}
      <AnimatedView 
        style={[
          styles.mapContainer,
          {
            opacity: mapOpacity,
            transform: [{ scale: mapScale }],
          },
        ]}
      >
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={{
            latitude: pickupCoords?.latitude || -13.9626,
            longitude: pickupCoords?.longitude || 33.7741,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          }}
          showsUserLocation={true}
          showsMyLocationButton={false}
          zoomEnabled={true}
          scrollEnabled={true}
          rotateEnabled={false}
        >
          {/* Pickup Marker */}
          {pickupCoords && (
            <Marker coordinate={pickupCoords} title="Pickup">
              <AnimatedView 
                style={[
                  styles.pickupMarker,
                  {
                    transform: [{ scale: pulseAnim }],
                  },
                ]}
              >
                <LinearGradient
                  colors={['#4285F4', '#3B82F6']}
                  style={styles.markerGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <MaterialIcon name="my-location" size={16} color="#FFF" />
                </LinearGradient>
              </AnimatedView>
            </Marker>
          )}
          
          {/* Destination Marker */}
          {destinationCoords && (
            <Marker coordinate={destinationCoords} title="Destination">
              <AnimatedView style={styles.destinationMarker}>
                <LinearGradient
                  colors={['#EA4335', '#DC2626']}
                  style={styles.markerGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <MaterialIcon name="place" size={16} color="#FFF" />
                </LinearGradient>
              </AnimatedView>
            </Marker>
          )}
          
          {/* Driver Marker */}
          {driverLocation && (
            <Marker 
              coordinate={driverLocation}
              title={driver?.name || 'Driver'}
              description={`ETA: ${driverETA || estimatedArrival}`}
              anchor={{ x: 0.5, y: 0.5 }}
              rotation={driverBearing}
            >
              <AnimatedView 
                style={[
                  styles.driverMarker,
                  {
                    opacity: driverMarkerOpacity,
                    transform: [{ scale: driverMarkerScale }],
                  },
                ]}
              >
                <LinearGradient
                  colors={['#06C167', '#10B981']}
                  style={styles.driverMarkerGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <MaterialIcon 
                    name={driver?.vehicleType?.includes('bike') ? 'motorcycle' : 'car'} 
                    size={18} 
                    color="#FFF" 
                  />
                </LinearGradient>
              </AnimatedView>
            </Marker>
          )}
          
          {/* Driver Path */}
          {driverPath.length > 1 && status === 'enroute' && (
            <Polyline
              coordinates={driverPath}
              strokeColor="#06C167"
              strokeWidth={2}
              lineDashPattern={[0]}
            />
          )}
          
          {/* Route Line */}
          {driverLocation && pickupCoords && status === 'enroute' && (
            <Polyline
              coordinates={[driverLocation, pickupCoords]}
              strokeColor="#06C167"
              strokeWidth={3}
              lineDashPattern={[5, 5]}
            />
          )}
          
          {/* Search Radius (when searching) */}
          {status === 'searching' && pickupCoords && (
            <Circle
              center={pickupCoords}
              radius={searchRadius}
              strokeColor={STATUS_COLORS.searching + '40'}
              fillColor={STATUS_COLORS.searching + '20'}
              strokeWidth={1}
            />
          )}
          
          {/* Route from pickup to destination */}
          {pickupCoords && destinationCoords && (
            <Polyline
              coordinates={[pickupCoords, destinationCoords]}
              strokeColor="#4285F4"
              strokeWidth={2}
              lineDashPattern={[5, 5]}
            />
          )}
        </MapView>

        {/* Status Badge */}
        <AnimatedView 
          style={[
            styles.statusBadge,
            {
              backgroundColor: STATUS_COLORS[status] + '20',
              borderColor: STATUS_COLORS[status],
            },
          ]}
        >
          <MaterialIcon 
            name={STATUS_ICONS[status]} 
            size={16} 
            color={STATUS_COLORS[status]} 
          />
          <Text style={[
            styles.statusBadgeText,
            { color: STATUS_COLORS[status] }
          ]}>
            {status === 'searching' ? 'SEARCHING' : 
             status === 'enroute' ? 'ENROUTE' : 
             status === 'arrived' ? 'ARRIVED' : 
             status.toUpperCase()}
          </Text>
        </AnimatedView>

        {/* Search Animation Overlay */}
        {status === 'searching' && showSearchAnimation && renderSearchAnimation()}
      </AnimatedView>

      {/* Bottom Sheet */}
      <BottomSheet
        ref={bottomSheetRef}
        index={sheetIndex}
        snapPoints={snapPoints}
        onChange={handleSheetChanges}
        enablePanDownToClose={false}
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.bottomSheetIndicator}
        handleStyle={styles.bottomSheetHandle}
        animateOnMount={true}
      >
        {renderBottomSheetContent()}
      </BottomSheet>

      {/* MODALS */}
      {renderCancelModal()}
      {renderSOSModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F9FAFB' 
  },
  
  // HEADER
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    zIndex: 100,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
    fontWeight: '500',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  connectionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  
  // MAP CONTAINER
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  statusBadge: {
    position: 'absolute',
    top: 16,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
  
  // SEARCH ANIMATION
  searchAnimation: {
    position: 'absolute',
    top: '30%',
    alignSelf: 'center',
  },
  searchRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  
  // MARKERS
  pickupMarker: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  destinationMarker: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  driverMarker: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  markerGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverMarkerGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // STATUS HEADER (for bottom sheet)
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  statusDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  
  // DRIVER CARD
  driverCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: '#F8F9FA',
    padding: 16,
  },
  driverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  driverInitial: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 6,
  },
  driverMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  rating: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginLeft: 2,
  },
  ridesCount: {
    fontSize: 12,
    color: '#666',
    marginRight: 8,
  },
  vehicleType: {
    fontSize: 12,
    color: '#666',
  },
  driverDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  driverDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  driverDetailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    marginRight: 12,
    flex: 1,
  },
  driverDetailPlate: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  driverActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  driverActionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    marginHorizontal: 4,
  },
  driverActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginTop: 4,
  },
  
  // RIDE DETAILS
  rideDetails: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  rideDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  rideDetailIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  rideDetailText: {
    flex: 1,
  },
  rideDetailLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  rideDetailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    lineHeight: 20,
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: '#D1D5DB',
    marginLeft: 11,
    marginVertical: 8,
  },
  
  // MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: width - 40,
    maxHeight: height * 0.7,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  modalBody: {
    padding: 24,
  },
  modalText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 20,
  },
  reasonInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#000',
    marginBottom: 20,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButtonSecondary: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  modalButtonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  modalButtonPrimary: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#EF4444',
    borderRadius: 12,
  },
  modalButtonTextPrimary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sosWarning: {
    alignItems: 'center',
    marginBottom: 24,
  },
  sosWarningText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
    marginBottom: 20,
  },
  sosList: {
    width: '100%',
  },
  sosItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sosItemText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
    flex: 1,
  },
  sosButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 16,
    borderRadius: 12,
  },
  sosButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  
  // BOTTOM SHEET STYLES
  bottomSheetBackground: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 20,
  },
  bottomSheetIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
  },
  bottomSheetHandle: {
    paddingTop: 12,
    paddingBottom: 8,
  },
  bottomSheetContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  rideInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 20,
  },
  rideInfoCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 4,
  },
  rideInfoLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    marginBottom: 4,
  },
  rideInfoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
  cancelButton: {
    backgroundColor: '#FEF2F2',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
});