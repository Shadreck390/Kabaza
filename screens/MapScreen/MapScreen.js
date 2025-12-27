// screens/driver/MapScreen/MapScreen.js
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  PermissionsAndroid,
  Modal,
  Animated,
  PanResponder,
  Dimensions,
  StatusBar
} from 'react-native';
import MapView, { Marker, Polyline, Circle } from 'react-native-maps';
import Geolocation from 'react-native-geolocation-service';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useDispatch, useSelector } from 'react-redux';

// COMPONENT IMPORTS (check if these files exist):
import Header from '@components/Header';
import Loading from '@components/Loading';
import Button from '@components/Button';
import RideRequestCard from '@components/RideRequestCard'; // ✓ Exists

// Check if these exist in your components folder:
// import ActiveRideCard from '@components/ActiveRideCard'; // ❓ NOT in your listed structure
// import EarningsWidget from '@components/EarningsWidget'; // ❓ NOT in your listed structure
// import NotificationBadge from '@components/NotificationBadge'; // ❓ NOT in your listed structure

// FIXED SERVICE IMPORTS:
import { updateDriverLocation, updateDriverStatus, addRide, updateRide } from '@store/slices/driverSlice';
import RealTimeService from '@services/realtime/RealTimeService';
import LocationService from '@services/location/LocationService';
import socketService from '@services/socket/socketService';

const windowDimensions = Dimensions.get('window') || { width: 375, height: 667 };
const { width, height } = windowDimensions;;

export default function MapScreen({ route, navigation }) {
  const dispatch = useDispatch();
  const driver = useSelector(state => state.driver.currentDriver);
  const activeRide = useSelector(state => state.driver.activeRide);
  const rideRequests = useSelector(state => state.driver.rideRequests);
  const earnings = useSelector(state => state.driver.earnings);
  
  const [region, setRegion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(driver?.status === 'available');
  const [locationPermission, setLocationPermission] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [showRideRequests, setShowRideRequests] = useState(false);
  const [showEarnings, setShowEarnings] = useState(false);
  const [rideRequestPanelHeight] = useState(new Animated.Value(0));
  const [newRideRequest, setNewRideRequest] = useState(null);
  const [rideRequestCount, setRideRequestCount] = useState(0);
  const [locationAccuracy, setLocationAccuracy] = useState(null);
  const [nearbyDrivers, setNearbyDrivers] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [mapType, setMapType] = useState('standard');
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [rideInProgress, setRideInProgress] = useState(false);
  const [navigationRoute, setNavigationRoute] = useState(null);
  const [lastRideUpdate, setLastRideUpdate] = useState(null);
  
  const mapRef = useRef(null);
  const locationWatchId = useRef(null);
  const socketReconnectTimeout = useRef(null);
  const rideRequestTimeout = useRef(null);

  // Pan responder for ride request panel
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          rideRequestPanelHeight.setValue(Math.max(0, gestureState.dy));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100) {
          hideRideRequests();
        } else {
          showRideRequestsPanel();
        }
      },
    })
  ).current;

  // Get data from navigation params
  const { 
    phone,
    authMethod,
    socialUserInfo,
    userProfile 
  } = route.params || {};

  // Get driver name
  const getDriverName = () => {
    return driver?.name || userProfile?.fullName || socialUserInfo?.name || 'Driver';
  };

  // Request location permission
  const requestLocationPermission = async () => {
    if (Platform.OS === 'ios') {
      const status = await LocationService.requestPermission();
      setLocationPermission(status === 'granted');
      return status === 'granted';
    }
    
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Kabaza Location Permission',
          message: 'Kabaza needs your location to show your position and find rides.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      const allowed = granted === PermissionsAndroid.RESULTS.GRANTED;
      setLocationPermission(allowed);
      
      if (allowed) {
        // Request background location permission for Android
        if (Platform.OS === 'android' && Platform.Version >= 29) {
          const bgGranted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
            {
              title: 'Background Location',
              message: 'Kabaza needs background location to track rides when app is in background.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'Allow',
            }
          );
          console.log('Background location permission:', bgGranted);
        }
      }
      
      return allowed;
    } catch (err) {
      console.warn('Location permission error:', err);
      return false;
    }
  };

  // Initialize real-time services
  const initializeRealTimeServices = useCallback(async () => {
    try {
      // Connect to socket server
      await socketService.connect();
      setSocketConnected(true);
      
      // Initialize real-time service
      await realTimeService.initialize(driver?.id || 'driver_temp');
      
      // Start location service
      const locationStarted = await LocationService.startTracking();
      if (locationStarted) {
        LocationService.onLocationUpdate(handleLocationUpdate);
      }
      
      // Load heatmap data
      loadHeatmapData();
      
      // Listen for nearby drivers
      setupNearbyDriversListener();
      
    } catch (error) {
      console.error('Real-time service initialization error:', error);
      Alert.alert(
        'Connection Error',
        'Unable to connect to real-time services. Some features may be limited.',
        [{ text: 'OK' }]
      );
    }
  }, [driver?.id]);

  // Handle location updates
  const handleLocationUpdate = useCallback(async (location) => {
    const { latitude, longitude, accuracy } = location;
    
    // Update local state
    setCurrentLocation({ latitude, longitude });
    setLocationAccuracy(accuracy);
    
    // Update Redux store
    dispatch(updateDriverLocation({ latitude, longitude }));
    
    // Update map region smoothly
    if (mapRef.current && !rideInProgress) {
      mapRef.current.animateToRegion({
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 500);
    }
    
    // Send location update to server via socket
    if (socketConnected && isOnline) {
      try {
        await realTimeService.updateDriverLocation({
          latitude,
          longitude,
          accuracy,
          timestamp: new Date().toISOString(),
        });
        
        // Update nearby drivers if online
        if (isOnline) {
          socketService.emit('driver:location:updated', {
            driverId: driver?.id,
            location: { latitude, longitude },
            accuracy,
            timestamp: Date.now(),
          });
        }
      } catch (error) {
        console.error('Location update error:', error);
      }
    }
  }, [socketConnected, isOnline, driver?.id, rideInProgress, dispatch]);

  // Setup socket listeners
  const setupSocketListeners = useCallback(() => {
    // Listen for new ride requests
    socketService.on('ride:request:new', (rideRequest) => {
      console.log('New ride request received:', rideRequest);
      
      // Add to Redux store
      dispatch(addRide(rideRequest));
      
      // Show notification
      setNewRideRequest(rideRequest);
      setRideRequestCount(prev => prev + 1);
      
      // Show alert with sound/vibration
      if (isOnline) {
        Alert.alert(
          'New Ride Request!',
          `${rideRequest.passengerName} • ${rideRequest.distance} km away • MWK ${rideRequest.fare}`,
          [
            { 
              text: 'View', 
              onPress: () => {
                setNewRideRequest(null);
                showRideRequestsPanel();
              }
            },
            { 
              text: 'Ignore', 
              style: 'cancel',
              onPress: () => {
                setNewRideRequest(null);
                // Auto-reject after 30 seconds
                rideRequestTimeout.current = setTimeout(() => {
                  rejectRideRequest(rideRequest.id);
                }, 30000);
              }
            }
          ]
        );
      }
    });

    // Listen for ride status updates
    socketService.on('ride:status:updated', (rideData) => {
      dispatch(updateRide(rideData));
      
      if (rideData.status === 'accepted' && rideData.driverId === driver?.id) {
        setRideInProgress(true);
        startRideNavigation(rideData);
      }
      
      if (rideData.status === 'completed') {
        setRideInProgress(false);
        setNavigationRoute(null);
        showRideCompletedSummary(rideData);
      }
    });

    // Listen for nearby drivers
    socketService.on('drivers:nearby:update', (drivers) => {
      setNearbyDrivers(drivers);
    });

    // Listen for heatmap updates
    socketService.on('heatmap:update', (data) => {
      setHeatmapData(data);
    });

    // Listen for earnings updates
    socketService.on('earnings:update', (earningsData) => {
      // Update earnings in Redux store
      // This would be handled by your earnings slice
    });

    // Listen for connection status
    socketService.onConnectionChange((connected) => {
      setSocketConnected(connected);
      if (!connected && isOnline) {
        Alert.alert(
          'Connection Lost',
          'You have been taken offline due to connection issues.',
          [{ text: 'OK' }]
        );
        handleGoOffline();
      }
    });

    // Listen for admin messages
    socketService.on('admin:message', (message) => {
      Alert.alert('Admin Message', message.content);
    });

    // Listen for surge pricing updates
    socketService.on('surge:pricing:update', (surgeData) => {
      Alert.alert(
        'Surge Pricing Active',
        `High demand in ${surgeData.area}! Fares increased by ${surgeData.multiplier}x`,
        [{ text: 'OK' }]
      );
    });
  }, [isOnline, driver?.id, dispatch]);

  // Setup nearby drivers listener
  const setupNearbyDriversListener = useCallback(() => {
    if (socketConnected) {
      socketService.emit('driver:nearby:subscribe', {
        latitude: currentLocation?.latitude,
        longitude: currentLocation?.longitude,
        radius: 5, // km
      });
    }
  }, [socketConnected, currentLocation]);

  // Load heatmap data
  const loadHeatmapData = async () => {
    try {
      const data = await realTimeService.getHeatmapData();
      setHeatmapData(data);
    } catch (error) {
      console.error('Heatmap data error:', error);
    }
  };

  // Center map on current location
  const centerOnLocation = useCallback(() => {
    if (currentLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        ...currentLocation,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  }, [currentLocation]);

  // Show ride requests panel
  const showRideRequestsPanel = () => {
    setShowRideRequests(true);
    Animated.spring(rideRequestPanelHeight, {
      toValue: height * 0.6,
      useNativeDriver: false,
      tension: 50,
      friction: 7,
    }).start();
  };

  // Hide ride requests
  const hideRideRequests = () => {
    Animated.spring(rideRequestPanelHeight, {
      toValue: 0,
      useNativeDriver: false,
      tension: 50,
      friction: 7,
    }).start(() => {
      setShowRideRequests(false);
      setNewRideRequest(null);
    });
  };

  // Handle accept ride
  const acceptRideRequest = async (rideId) => {
    try {
      const result = await realTimeService.acceptRide(rideId);
      
      if (result.success) {
        setRideInProgress(true);
        setShowRideRequests(false);
        
        // Update Redux store
        dispatch(updateDriverStatus('busy'));
        setIsOnline(false);
        
        Alert.alert(
          'Ride Accepted!',
          'Navigate to pickup location. Please arrive on time.',
          [{ text: 'Got it' }]
        );
        
        // Start navigation to pickup
        const ride = rideRequests.find(r => r.id === rideId);
        if (ride) {
          startRideNavigation(ride);
        }
      }
    } catch (error) {
      console.error('Accept ride error:', error);
      Alert.alert('Error', 'Failed to accept ride. Please try again.');
    }
  };

  // Reject ride request
  const rejectRideRequest = async (rideId) => {
    try {
      await realTimeService.rejectRide(rideId);
      setRideRequestCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Reject ride error:', error);
    }
  };

  // Start ride navigation
  const startRideNavigation = (ride) => {
    setNavigationRoute({
      pickup: ride.pickupLocation,
      dropoff: ride.dropoffLocation,
      rideId: ride.id,
    });
    
    // Center map on pickup location
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        ...ride.pickupLocation,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  };

  // Show ride completed summary
  const showRideCompletedSummary = (rideData) => {
    Alert.alert(
      'Ride Completed!',
      `Earned: MWK ${rideData.fare}\nRating: ${rideData.rating || 'Not rated yet'}\nThank you for the ride!`,
      [
        { 
          text: 'View Details', 
          onPress: () => navigation.navigate('RideDetails', { rideId: rideData.id })
        },
        { text: 'Continue', onPress: () => handleGoOnline() }
      ]
    );
  };

  // Handle going online
  const handleGoOnline = async () => {
    if (!locationPermission) {
      const granted = await requestLocationPermission();
      if (!granted) {
        Alert.alert('Location Required', 'Location permission is required to go online.');
        return;
      }
    }

    try {
      // Update status via socket
      await realTimeService.updateDriverStatus('available');
      
      // Update local state
      setIsOnline(true);
      dispatch(updateDriverStatus('available'));
      
      // Start location tracking
      await LocationService.startTracking();
      
      // Broadcast availability
      socketService.emit('driver:available', {
        driverId: driver?.id,
        location: currentLocation,
        timestamp: Date.now(),
      });
      
      Alert.alert(
        'You\'re Online!',
        'You are now visible to riders and receiving ride requests.',
        [{ text: 'Got it' }]
      );
      
    } catch (error) {
      console.error('Go online error:', error);
      Alert.alert('Error', 'Failed to go online. Please try again.');
    }
  };

  // Handle going offline
  const handleGoOffline = async () => {
    try {
      // Update status via socket
      await realTimeService.updateDriverStatus('offline');
      
      // Update local state
      setIsOnline(false);
      dispatch(updateDriverStatus('offline'));
      
      // Stop location tracking
      await LocationService.stopTracking();
      
      Alert.alert(
        'You\'re Offline',
        'You are no longer visible to riders.',
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('Go offline error:', error);
    }
  };

  // Toggle online status
  const toggleOnlineStatus = () => {
    if (rideInProgress) {
      Alert.alert(
        'Cannot Go Offline',
        'You have an active ride. Complete the ride first.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (isOnline) {
      Alert.alert(
        'Go Offline?',
        'You will stop receiving ride requests.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Go Offline', onPress: handleGoOffline }
        ]
      );
    } else {
      handleGoOnline();
    }
  };

  // Complete current ride
  const completeCurrentRide = async () => {
    if (!activeRide) return;
    
    Alert.alert(
      'Complete Ride?',
      'Mark this ride as completed.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Complete', 
          onPress: async () => {
            try {
              await realTimeService.completeRide(activeRide.id);
              setRideInProgress(false);
              setNavigationRoute(null);
              
              Alert.alert(
                'Ride Completed',
                'Thank you for completing the ride!',
                [{ text: 'OK' }]
              );
            } catch (error) {
              console.error('Complete ride error:', error);
              Alert.alert('Error', 'Failed to complete ride.');
            }
          }
        }
      ]
    );
  };

  // Initialize on component mount
  useEffect(() => {
    const initialize = async () => {
      // Request location permission
      const granted = await requestLocationPermission();
      
      if (granted) {
        // Get initial location
        LocationService.getCurrentPosition()
          .then(position => {
            const { latitude, longitude, accuracy } = position;
            setCurrentLocation({ latitude, longitude });
            setLocationAccuracy(accuracy);
            setRegion({
              latitude,
              longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            });
            setLoading(false);
            
            // Initialize real-time services
            initializeRealTimeServices();
          })
          .catch(error => {
            console.error('Initial location error:', error);
            setRegion({
              latitude: -13.9626,
              longitude: 33.7741,
              latitudeDelta: 0.1,
              longitudeDelta: 0.1,
            });
            setLoading(false);
          });
      } else {
        setRegion({
          latitude: -13.9626,
          longitude: 33.7741,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        });
        setLoading(false);
      }
    };

    initialize();

    return () => {
      // Cleanup
      if (locationWatchId.current) {
        Geolocation.clearWatch(locationWatchId.current);
      }
      if (socketReconnectTimeout.current) {
        clearTimeout(socketReconnectTimeout.current);
      }
      if (rideRequestTimeout.current) {
        clearTimeout(rideRequestTimeout.current);
      }
      
      socketService.disconnect();
      LocationService.stopTracking();
    };
  }, []);

  // Setup socket listeners when connected
  useEffect(() => {
    if (socketConnected) {
      setupSocketListeners();
    }
  }, [socketConnected, setupSocketListeners]);

  // Watch for active ride changes
  useEffect(() => {
    if (activeRide) {
      setRideInProgress(true);
      startRideNavigation(activeRide);
    } else {
      setRideInProgress(false);
      setNavigationRoute(null);
    }
  }, [activeRide]);

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor="#00B894" barStyle="light-content" />
        <Header 
          title={`Welcome, ${getDriverName()}`} 
          subtitle="Initializing Real-Time Services"
          showBack={false}
        />
        <Loading message="Setting up your driver dashboard..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar 
        backgroundColor={isOnline ? "#00B894" : "#666"} 
        barStyle="light-content" 
      />
      
      {/* Header */}
      <Header 
        title={`Welcome, ${getDriverName()}`} 
        subtitle={
          socketConnected 
            ? (isOnline ? '🟢 Online • Receiving rides' : '⚪ Offline') 
            : '🔴 Disconnected • Offline mode'
        }
        showBack={false}
        rightComponent={
          <View style={styles.headerRight}>
            <NotificationBadge count={rideRequestCount} />
            <TouchableOpacity 
              style={styles.earningsButton}
              onPress={() => setShowEarnings(true)}
            >
              <Icon name="money" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        }
      />

      {/* Map View */}
      <View style={styles.mapContainer}>
        {region ? (
          <MapView
            ref={mapRef}
            style={styles.map}
            region={region}
            showsUserLocation={true}
            showsMyLocationButton={false}
            showsCompass={true}
            zoomEnabled={true}
            scrollEnabled={true}
            rotateEnabled={true}
            pitchEnabled={true}
            mapType={mapType}
            onRegionChangeComplete={setRegion}
          >
            {/* User Location Marker */}
            {currentLocation && (
              <Marker
                coordinate={currentLocation}
                title="Your Location"
                description={locationAccuracy ? `Accuracy: ${locationAccuracy}m` : 'You are here'}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View style={[
                  styles.locationMarker,
                  isOnline ? styles.onlineMarker : styles.offlineMarker,
                  rideInProgress && styles.rideInProgressMarker
                ]}>
                  <Icon 
                    name={rideInProgress ? "user" : "car"} 
                    size={16} 
                    color="#fff" 
                  />
                </View>
                {/* Accuracy circle */}
                {locationAccuracy && (
                  <Circle
                    center={currentLocation}
                    radius={locationAccuracy}
                    strokeWidth={1}
                    strokeColor="rgba(0, 184, 148, 0.3)"
                    fillColor="rgba(0, 184, 148, 0.1)"
                  />
                )}
              </Marker>
            )}

            {/* Nearby Drivers */}
            {isOnline && nearbyDrivers.map((driver, index) => (
              <Marker
                key={index}
                coordinate={driver.location}
                title={`Driver ${driver.name}`}
                description={`${driver.distance} km away • ${driver.status}`}
              >
                <View style={styles.nearbyDriverMarker}>
                  <Icon name="car" size={12} color="#666" />
                </View>
              </Marker>
            ))}

            {/* Heatmap Overlay */}
            {showHeatmap && heatmapData.map((point, index) => (
              <Circle
                key={index}
                center={point.location}
                radius={point.intensity * 100}
                strokeWidth={0}
                fillColor={`rgba(255, ${255 - point.intensity * 100}, 0, 0.3)`}
              />
            ))}

            {/* Navigation Route */}
            {navigationRoute && (
              <Polyline
                coordinates={[navigationRoute.pickup, navigationRoute.dropoff]}
                strokeWidth={4}
                strokeColor="#00B894"
              />
            )}

            {/* Ride Pickup/Dropoff Markers */}
            {navigationRoute && (
              <>
                <Marker
                  coordinate={navigationRoute.pickup}
                  title="Pickup Location"
                  pinColor="#4CAF50"
                />
                <Marker
                  coordinate={navigationRoute.dropoff}
                  title="Dropoff Location"
                  pinColor="#F44336"
                />
              </>
            )}
          </MapView>
        ) : (
          <View style={styles.errorContainer}>
            <Icon name="exclamation-triangle" size={50} color="#FF6B6B" />
            <Text style={styles.errorText}>Unable to load map</Text>
            <Button 
              title="Retry" 
              onPress={centerOnLocation}
              style={styles.retryButton}
            />
          </View>
        )}

        {/* Map Controls */}
        <View style={styles.mapControls}>
          <TouchableOpacity 
            style={styles.mapControlButton}
            onPress={centerOnLocation}
            disabled={!currentLocation}
          >
            <Icon name="crosshairs" size={20} color="#333" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.mapControlButton}
            onPress={() => setMapType(mapType === 'standard' ? 'satellite' : 'standard')}
          >
            <Icon name="map" size={20} color="#333" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.mapControlButton}
            onPress={() => setShowHeatmap(!showHeatmap)}
          >
            <Icon name="fire" size={20} color={showHeatmap ? "#FF6B6B" : "#333"} />
          </TouchableOpacity>
          
          {rideInProgress && (
            <TouchableOpacity 
              style={[styles.mapControlButton, styles.completeRideButton]}
              onPress={completeCurrentRide}
            >
              <Icon name="flag-checkered" size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        {/* Connection Status */}
        <View style={[
          styles.connectionStatus,
          { backgroundColor: socketConnected ? '#00B894' : '#FF6B6B' }
        ]}>
          <Icon 
            name={socketConnected ? 'wifi' : 'wifi-slash'} 
            size={12} 
            color="#fff" 
          />
          <Text style={styles.connectionStatusText}>
            {socketConnected ? 'Real-Time Connected' : 'Offline Mode'}
          </Text>
        </View>
      </View>

      {/* Earnings Widget Modal */}
      <Modal
        visible={showEarnings}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEarnings(false)}
      >
        <View style={styles.modalOverlay}>
          <EarningsWidget 
            earnings={earnings}
            onClose={() => setShowEarnings(false)}
            onViewDetails={() => {
              setShowEarnings(false);
              navigation.navigate('EarningsDetails');
            }}
          />
        </View>
      </Modal>

      {/* Ride Request Panel */}
      {showRideRequests && (
        <Animated.View 
          style={[
            styles.rideRequestPanel,
            { height: rideRequestPanelHeight }
          ]}
          {...panResponder.panHandlers}
        >
          <View style={styles.panelHandle}>
            <View style={styles.panelHandleBar} />
          </View>
          
          <View style={styles.panelContent}>
            <Text style={styles.panelTitle}>
              {rideRequestCount > 0 
                ? `${rideRequestCount} New Ride${rideRequestCount > 1 ? 's' : ''}`
                : 'No Ride Requests'
              }
            </Text>
            
            <ScrollView style={styles.rideList}>
              {rideRequests.map((ride) => (
                <RideRequestCard
                  key={ride.id}
                  ride={ride}
                  onAccept={() => acceptRideRequest(ride.id)}
                  onReject={() => rejectRideRequest(ride.id)}
                  onView={() => navigation.navigate('RideDetails', { rideId: ride.id })}
                />
              ))}
            </ScrollView>
          </View>
        </Animated.View>
      )}

      {/* New Ride Request Notification */}
      {newRideRequest && !showRideRequests && (
        <TouchableOpacity 
          style={styles.newRideNotification}
          onPress={() => {
            setNewRideRequest(null);
            showRideRequestsPanel();
          }}
        >
          <View style={styles.notificationContent}>
            <Icon name="bell" size={20} color="#fff" />
            <Text style={styles.notificationText}>
              New ride request from {newRideRequest.passengerName}
            </Text>
            <Icon name="chevron-up" size={16} color="#fff" />
          </View>
        </TouchableOpacity>
      )}

      {/* Bottom Control Panel */}
      <View style={styles.bottomPanel}>
        {/* Online Status & Earnings */}
        <View style={styles.topRow}>
          <TouchableOpacity 
            style={styles.statusContainer}
            onPress={toggleOnlineStatus}
          >
            <View style={[
              styles.statusIndicator,
              isOnline ? styles.statusOnline : styles.statusOffline,
              rideInProgress && styles.statusBusy
            ]} />
            <Text style={styles.statusText}>
              {rideInProgress ? 'ON TRIP' : (isOnline ? 'ONLINE' : 'OFFLINE')}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.earningsContainer}
            onPress={() => setShowEarnings(true)}
          >
            <Icon name="money" size={16} color="#6c3" />
            <Text style={styles.earningsText}>
              MWK {earnings?.today || '0'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Main Action Buttons */}
        <View style={styles.mainActions}>
          <Button
            title={isOnline ? "Go Offline" : "Go Online"}
            onPress={toggleOnlineStatus}
            style={[
              styles.toggleButton,
              isOnline ? styles.offlineButton : styles.onlineButton,
              rideInProgress && styles.disabledButton
            ]}
            textStyle={styles.toggleButtonText}
            disabled={rideInProgress}
            icon={isOnline ? 'power-off' : 'power-off'}
            iconPosition="left"
          />
          
          {rideRequestCount > 0 && (
            <TouchableOpacity 
              style={styles.rideRequestsButton}
              onPress={showRideRequestsPanel}
            >
              <Icon name="car" size={20} color="#fff" />
              <Text style={styles.rideRequestsText}>
                {rideRequestCount} Ride{rideRequestCount > 1 ? 's' : ''}
              </Text>
              <Icon name="chevron-up" size={16} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('DriverProfile')}
          >
            <Icon name="user" size={20} color="#00B894" />
            <Text style={styles.actionText}>Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Vehicle')}
          >
            <Icon name="car" size={20} color="#00B894" />
            <Text style={styles.actionText}>Vehicle</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={centerOnLocation}
          >
            <Icon name="location-arrow" size={20} color="#00B894" />
            <Text style={styles.actionText}>Location</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Support')}
          >
            <Icon name="headphones" size={20} color="#00B894" />
            <Text style={styles.actionText}>Support</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Active Ride Banner */}
      {rideInProgress && activeRide && (
        <ActiveRideCard 
          ride={activeRide}
          onComplete={completeCurrentRide}
          onNavigate={() => startRideNavigation(activeRide)}
          style={styles.activeRideCard}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  earningsButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 8,
    borderRadius: 20,
  },
  locationMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  onlineMarker: {
    backgroundColor: '#00B894',
  },
  offlineMarker: {
    backgroundColor: '#666',
  },
  rideInProgressMarker: {
    backgroundColor: '#FFA726',
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  nearbyDriverMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#00B894',
    elevation: 3,
  },
  mapControls: {
    position: 'absolute',
    top: 20,
    right: 20,
    gap: 10,
  },
  mapControlButton: {
    backgroundColor: '#fff',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  completeRideButton: {
    backgroundColor: '#00B894',
  },
  connectionStatus: {
    position: 'absolute',
    top: 20,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  connectionStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  rideRequestPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    overflow: 'hidden',
  },
  panelHandle: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  panelHandleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
  },
  panelContent: {
    flex: 1,
    padding: 20,
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  rideList: {
    flex: 1,
  },
  newRideNotification: {
    position: 'absolute',
    top: 80,
    left: 20,
    right: 20,
    backgroundColor: '#00B894',
    borderRadius: 12,
    padding: 15,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notificationText: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginVertical: 10,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 10,
    paddingHorizontal: 20,
  },
  bottomPanel: {
    backgroundColor: '#fff',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusOnline: {
    backgroundColor: '#00B894',
  },
  statusOffline: {
    backgroundColor: '#FF6B6B',
  },
  statusBusy: {
    backgroundColor: '#FFA726',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  earningsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  earningsText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginLeft: 6,
  },
  mainActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  toggleButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
  },
  onlineButton: {
    backgroundColor: '#00B894',
  },
  offlineButton: {
    backgroundColor: '#FF6B6B',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  toggleButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  rideRequestsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFA726',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  rideRequestsText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  actionButton: {
    alignItems: 'center',
    padding: 10,
    minWidth: 60,
  },
  actionText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    fontWeight: '500',
  },
  activeRideCard: {
    position: 'absolute',
    top: 80,
    left: 20,
    right: 20,
    zIndex: 1000,
  },
});