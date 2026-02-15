// screens/MapScreen/MapScreen.js - FIXED VERSION
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
  StatusBar,
  ScrollView
} from 'react-native';
import MapView, { Marker, Polyline, Circle, PROVIDER_GOOGLE } from 'react-native-maps'; // ✅ ADDED PROVIDER_GOOGLE
import Geolocation from 'react-native-geolocation-service';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useDispatch, useSelector } from 'react-redux';
import { updateDriverLocation, updateDriverStatus, addRide, updateRide } from '@store/slices/driverSlice';
import RealTimeService from '@services/realtime/RealTimeService';
import LocationService from '@services/location/LocationService';
import socketService from '@services/socket/socketService';

// Placeholder components (you'll need to create these or adjust imports)
const Header = ({ title, subtitle, showBack, rightComponent }) => (
  <View style={styles.header}>
    {showBack && (
      <TouchableOpacity style={styles.backButton}>
        <Icon name="arrow-left" size={20} color="#fff" />
      </TouchableOpacity>
    )}
    <View style={styles.headerCenter}>
      <Text style={styles.headerTitle}>{title}</Text>
      {subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
    </View>
    {rightComponent && <View style={styles.headerRight}>{rightComponent}</View>}
  </View>
);

const Loading = ({ message }) => (
  <View style={styles.loadingContainer}>
    <View style={styles.loadingSpinner}>
      <Icon name="spinner" size={40} color="#00B894" />
    </View>
    <Text style={styles.loadingText}>{message}</Text>
  </View>
);

const Button = ({ title, onPress, style, textStyle, disabled, icon, iconPosition }) => (
  <TouchableOpacity
    style={[styles.buttonBase, style, disabled && styles.buttonDisabled]}
    onPress={onPress}
    disabled={disabled}
  >
    {icon && iconPosition === 'left' && <Icon name={icon} size={16} color="#fff" style={styles.buttonIconLeft} />}
    <Text style={[styles.buttonTextBase, textStyle]}>{title}</Text>
    {icon && iconPosition === 'right' && <Icon name={icon} size={16} color="#fff" style={styles.buttonIconRight} />}
  </TouchableOpacity>
);

const RideRequestCard = ({ ride, onAccept, onReject, onView }) => (
  <View style={styles.rideRequestCard}>
    <View style={styles.rideRequestHeader}>
      <View style={styles.passengerInfo}>
        <Icon name="user" size={20} color="#00B894" />
        <Text style={styles.passengerName}>{ride.passengerName}</Text>
      </View>
      <Text style={styles.rideDistance}>{ride.distance} km</Text>
    </View>
    <View style={styles.rideRequestDetails}>
      <Icon name="map-marker" size={14} color="#666" />
      <Text style={styles.locationText}>{ride.pickupLocation.address}</Text>
    </View>
    <View style={styles.rideRequestFooter}>
      <Text style={styles.rideFare}>MWK {ride.fare}</Text>
      <View style={styles.rideActions}>
        <TouchableOpacity style={styles.rejectButton} onPress={onReject}>
          <Icon name="times" size={16} color="#FF6B6B" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.acceptButton} onPress={onAccept}>
          <Icon name="check" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  </View>
);

const NotificationBadge = ({ count }) => (
  count > 0 ? (
    <View style={styles.notificationBadge}>
      <Text style={styles.notificationCount}>{count}</Text>
    </View>
  ) : null
);

const EarningsWidget = ({ earnings, onClose, onViewDetails }) => (
  <View style={styles.earningsWidget}>
    <View style={styles.earningsHeader}>
      <Text style={styles.earningsTitle}>Today's Earnings</Text>
      <TouchableOpacity onPress={onClose}>
        <Icon name="times" size={20} color="#666" />
      </TouchableOpacity>
    </View>
    <View style={styles.earningsBody}>
      <Text style={styles.earningsAmount}>MWK {earnings?.today || '0'}</Text>
      <Text style={styles.earningsSubtitle}>Total earnings today</Text>
      <View style={styles.earningsBreakdown}>
        <View style={styles.earningsItem}>
          <Text style={styles.earningsItemLabel}>Completed Rides</Text>
          <Text style={styles.earningsItemValue}>{earnings?.completedRides || 0}</Text>
        </View>
        <View style={styles.earningsItem}>
          <Text style={styles.earningsItemLabel}>Tips</Text>
          <Text style={styles.earningsItemValue}>MWK {earnings?.tips || 0}</Text>
        </View>
        <View style={styles.earningsItem}>
          <Text style={styles.earningsItemLabel}>Online Time</Text>
          <Text style={styles.earningsItemValue}>{earnings?.onlineTime || '0h 0m'}</Text>
        </View>
      </View>
      <Button
        title="View Full Details"
        onPress={onViewDetails}
        style={styles.viewDetailsButton}
      />
    </View>
  </View>
);

const ActiveRideCard = ({ ride, onComplete, onNavigate, style }) => (
  <View style={[styles.activeRideCard, style]}>
    <View style={styles.activeRideHeader}>
      <Icon name="car" size={20} color="#FFA726" />
      <Text style={styles.activeRideTitle}>Active Ride</Text>
      <TouchableOpacity onPress={onComplete} style={styles.completeButtonSmall}>
        <Icon name="flag-checkered" size={16} color="#fff" />
      </TouchableOpacity>
    </View>
    <View style={styles.activeRideBody}>
      <View style={styles.ridePassenger}>
        <Icon name="user" size={16} color="#666" />
        <Text style={styles.ridePassengerName}>{ride.passengerName}</Text>
      </View>
      <View style={styles.rideRoute}>
        <View style={styles.routePoint}>
          <Icon name="circle" size={8} color="#4CAF50" />
          <Text style={styles.routeText}>{ride.pickupLocation.address}</Text>
        </View>
        <View style={styles.routeDivider}>
          <Icon name="ellipsis-v" size={12} color="#ccc" />
        </View>
        <View style={styles.routePoint}>
          <Icon name="circle" size={8} color="#F44336" />
          <Text style={styles.routeText}>{ride.dropoffLocation.address}</Text>
        </View>
      </View>
      <View style={styles.rideStats}>
        <View style={styles.statItem}>
          <Icon name="money" size={14} color="#666" />
          <Text style={styles.statText}>MWK {ride.fare}</Text>
        </View>
        <View style={styles.statItem}>
          <Icon name="road" size={14} color="#666" />
          <Text style={styles.statText}>{ride.distance} km</Text>
        </View>
        <TouchableOpacity style={styles.navigateButton} onPress={onNavigate}>
          <Icon name="location-arrow" size={14} color="#fff" />
          <Text style={styles.navigateText}>Navigate</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
);

const { width, height } = Dimensions.get('window');

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

  const { 
    phone,
    authMethod,
    socialUserInfo,
    userProfile 
  } = route.params || {};

  const getDriverName = () => {
    return driver?.name || userProfile?.fullName || socialUserInfo?.name || 'Driver';
  };

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

  const initializeRealTimeServices = useCallback(async () => {
    try {
      await socketService.connect();
      setSocketConnected(true);
      
      await RealTimeService.initialize(driver?.id || 'driver_temp');
      
      const locationStarted = await LocationService.startTracking();
      if (locationStarted) {
        LocationService.onLocationUpdate(handleLocationUpdate);
      }
      
      loadHeatmapData();
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

  const handleLocationUpdate = useCallback(async (location) => {
    const { latitude, longitude, accuracy } = location;
    
    setCurrentLocation({ latitude, longitude });
    setLocationAccuracy(accuracy);
    
    dispatch(updateDriverLocation({ latitude, longitude }));
    
    if (mapRef.current && !rideInProgress) {
      mapRef.current.animateToRegion({
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 500);
    }
    
    if (socketConnected && isOnline) {
      try {
        await RealTimeService.updateDriverLocation({
          latitude,
          longitude,
          accuracy,
          timestamp: new Date().toISOString(),
        });
        
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

  const setupSocketListeners = useCallback(() => {
    socketService.on('ride:request:new', (rideRequest) => {
      console.log('New ride request received:', rideRequest);
      
      dispatch(addRide(rideRequest));
      
      setNewRideRequest(rideRequest);
      setRideRequestCount(prev => prev + 1);
      
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
                rideRequestTimeout.current = setTimeout(() => {
                  rejectRideRequest(rideRequest.id);
                }, 30000);
              }
            }
          ]
        );
      }
    });

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

    socketService.on('drivers:nearby:update', (drivers) => {
      setNearbyDrivers(drivers);
    });

    socketService.on('heatmap:update', (data) => {
      setHeatmapData(data);
    });

    socketService.on('earnings:update', (earningsData) => {
      // Update earnings in Redux store
    });

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

    socketService.on('admin:message', (message) => {
      Alert.alert('Admin Message', message.content);
    });

    socketService.on('surge:pricing:update', (surgeData) => {
      Alert.alert(
        'Surge Pricing Active',
        `High demand in ${surgeData.area}! Fares increased by ${surgeData.multiplier}x`,
        [{ text: 'OK' }]
      );
    });
  }, [isOnline, driver?.id, dispatch]);

  const setupNearbyDriversListener = useCallback(() => {
    if (socketConnected) {
      socketService.emit('driver:nearby:subscribe', {
        latitude: currentLocation?.latitude,
        longitude: currentLocation?.longitude,
        radius: 5,
      });
    }
  }, [socketConnected, currentLocation]);

  const loadHeatmapData = async () => {
    try {
      const data = await RealTimeService.getHeatmapData();
      setHeatmapData(data);
    } catch (error) {
      console.error('Heatmap data error:', error);
    }
  };

  const centerOnLocation = useCallback(() => {
    if (currentLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        ...currentLocation,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  }, [currentLocation]);

  const showRideRequestsPanel = () => {
    setShowRideRequests(true);
    Animated.spring(rideRequestPanelHeight, {
      toValue: height * 0.6,
      useNativeDriver: false,
      tension: 50,
      friction: 7,
    }).start();
  };

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

  const acceptRideRequest = async (rideId) => {
    try {
      const result = await RealTimeService.acceptRide(rideId);
      
      if (result.success) {
        setRideInProgress(true);
        setShowRideRequests(false);
        
        dispatch(updateDriverStatus('busy'));
        setIsOnline(false);
        
        Alert.alert(
          'Ride Accepted!',
          'Navigate to pickup location. Please arrive on time.',
          [{ text: 'Got it' }]
        );
        
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

  const rejectRideRequest = async (rideId) => {
    try {
      await RealTimeService.rejectRide(rideId);
      setRideRequestCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Reject ride error:', error);
    }
  };

  const startRideNavigation = (ride) => {
    setNavigationRoute({
      pickup: ride.pickupLocation,
      dropoff: ride.dropoffLocation,
      rideId: ride.id,
    });
    
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        ...ride.pickupLocation,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  };

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

  const handleGoOnline = async () => {
    if (!locationPermission) {
      const granted = await requestLocationPermission();
      if (!granted) {
        Alert.alert('Location Required', 'Location permission is required to go online.');
        return;
      }
    }

    try {
      await RealTimeService.updateDriverStatus('available');
      
      setIsOnline(true);
      dispatch(updateDriverStatus('available'));
      
      await LocationService.startTracking();
      
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

  const handleGoOffline = async () => {
    try {
      await RealTimeService.updateDriverStatus('offline');
      
      setIsOnline(false);
      dispatch(updateDriverStatus('offline'));
      
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
              await RealTimeService.completeRide(activeRide.id);
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

  useEffect(() => {
    const initialize = async () => {
      const granted = await requestLocationPermission();
      
      if (granted) {
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

  useEffect(() => {
    if (socketConnected) {
      setupSocketListeners();
    }
  }, [socketConnected, setupSocketListeners]);

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

      <View style={styles.mapContainer}>
        {region ? (
          <MapView
            ref={mapRef}
            style={styles.map}
            region={region}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined} // ✅ ADDED THIS LINE
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

            {showHeatmap && heatmapData.map((point, index) => (
              <Circle
                key={index}
                center={point.location}
                radius={point.intensity * 100}
                strokeWidth={0}
                fillColor={`rgba(255, ${255 - point.intensity * 100}, 0, 0.3)`}
              />
            ))}

            {navigationRoute && (
              <Polyline
                coordinates={[navigationRoute.pickup, navigationRoute.dropoff]}
                strokeWidth={4}
                strokeColor="#00B894"
              />
            )}

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

      <View style={styles.bottomPanel}>
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
  // Header styles
  header: {
    backgroundColor: '#00B894',
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    paddingRight: 15,
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
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
  // Loading styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingSpinner: {
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  // Button styles
  buttonBase: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonTextBase: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonIconLeft: {
    marginRight: 8,
  },
  buttonIconRight: {
    marginLeft: 8,
  },
  // RideRequestCard styles
  rideRequestCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  rideRequestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  passengerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  passengerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  rideDistance: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rideRequestDetails: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 15,
  },
  locationText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  rideRequestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rideFare: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00B894',
  },
  rideActions: {
    flexDirection: 'row',
    gap: 10,
  },
  rejectButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#00B894',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // NotificationBadge styles
  notificationBadge: {
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: -5,
    right: -5,
    zIndex: 1,
  },
  notificationCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 5,
  },
  // EarningsWidget styles
  earningsWidget: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: width * 0.9,
    maxWidth: 400,
    overflow: 'hidden',
  },
  earningsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  earningsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  earningsBody: {
    padding: 20,
  },
  earningsAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#00B894',
    textAlign: 'center',
    marginBottom: 5,
  },
  earningsSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  earningsBreakdown: {
    gap: 15,
    marginBottom: 20,
  },
  earningsItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  earningsItemLabel: {
    fontSize: 14,
    color: '#666',
  },
  earningsItemValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  viewDetailsButton: {
    backgroundColor: '#00B894',
  },
  // ActiveRideCard styles
  activeRideCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    margin: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  activeRideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 15,
  },
  activeRideTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  completeButtonSmall: {
    backgroundColor: '#00B894',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeRideBody: {
    gap: 10,
  },
  ridePassenger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ridePassengerName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  rideRoute: {
    marginLeft: 4,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  routeText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  routeDivider: {
    alignItems: 'center',
    height: 20,
    marginLeft: 3,
  },
  rideStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    marginTop: 5,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statText: {
    fontSize: 14,
    color: '#666',
  },
  navigateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#00B894',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  navigateText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  // Map styles
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
    backgroundColor: '#00B894',
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
});