import React, { useState, useEffect, useRef } from 'react';
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
  ActivityIndicator
} from 'react-native';

// FIXED COMPONENT IMPORTS:
import Header from '@components/Header';
import Button from '@components/Button';
import Loading from '@components/Loading';
import DriverCard from '@components/DriverCard';
import MapComponent from '@components/MapComponent';

// FIXED SERVICE IMPORTS:
import { fetchNearbyRides } from '@services/api/rideAPI';
import Geolocation from 'react-native-geolocation-service';
import { getUserData } from '@utils/userStorage';
import Icon from 'react-native-vector-icons/FontAwesome';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

// FIX THESE TWO IMPORTS:
import socketService from '@services/socket/socketService'; // or realtimeUpdates
import LocationService from '@services/location/LocationService';

export default function DriverHomeScreen({ route, navigation }) {
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
  const [driverStatus, setDriverStatus] = useState('offline'); // offline, available, busy, on_trip

  const mapRef = useRef(null);
  const locationWatchId = useRef(null);
  const socketSubscriptions = useRef([]);

  const driverName = userData?.userProfile?.fullName || userData?.socialUserInfo?.name || 'Driver';
  const driverId = userData?.id;

  // ✅ ADDED: Default region for Malawi
  const defaultRegion = {
    latitude: -13.9626, // Lilongwe center
    longitude: 33.7741,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  // ✅ ADDED: Navigation functions
  const handleViewRideRequests = () => {
    navigation.navigate('RideRequests');
  };

  const handleViewTripHistory = () => {
    navigation.navigate('TripHistory');
  };

  const handleViewProfile = () => {
    navigation.navigate('DriverProfile');
  };

  const handleViewEarnings = () => {
    navigation.navigate('Earnings');
  };

  // ✅ UPDATED: Initialize app with real-time setup
  useEffect(() => {
    const initializeApp = async () => {
      try {
        setLoading(true);
        
        // 1. Load user data
        const data = await getUserData();
        setUserData(data);
        
        // 2. Initialize location service with user data
        LocationService.initialize(data);
        
        // 3. Request location permission
        const granted = await requestLocationPermission();
        setLocationPermission(granted);
        
        if (granted) {
          // 4. Get current location
          const location = await getCurrentLocation();
          setCurrentLocation(location);
          
          // Set map region
          setRegion({
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });
        } else {
          // Use default region if permission denied
          setRegion(defaultRegion);
        }
        
        // 5. Initialize socket with user data
        realTimeService.initializeSocket({
          id: data?.id,
          name: driverName,
          role: 'driver',
          vehicleType: data?.vehicleType || 'bike',
        });
        
        // 6. Setup socket connection listeners
        setupSocketListeners();
        
        // 7. Check if driver has active ride
        checkActiveRide();
        
      } catch (error) {
        console.error('Initialization error:', error);
        setRegion(defaultRegion);
      } finally {
        setLoading(false);
      }
    };

    initializeApp();

    // Cleanup on unmount
    return () => {
      cleanup();
    };
  }, []);

  // ✅ ADDED: Setup socket listeners
  const setupSocketListeners = () => {
    // Listen for connection status
    realTimeService.addConnectionListener((connected) => {
      setConnectionStatus(connected ? 'connected' : 'disconnected');
      console.log('Socket connection:', connected ? 'connected' : 'disconnected');
    });

    // Listen for ride requests
    const rideRequestUnsubscribe = realTimeService.subscribeToNearbyDrivers(
      currentLocation || defaultRegion,
      5, // 5km radius
      [], // All vehicle types
      (rides) => {
        console.log('Real-time ride requests:', rides);
        setNearbyRides(rides.map(ride => ({
          ...ride,
          type: 'ride_request',
          timestamp: Date.now(),
        })));
      }
    );
    socketSubscriptions.current.push(rideRequestUnsubscribe);

    // Listen for ride updates
    const rideUpdateUnsubscribe = realTimeService.subscribeToRideUpdates(
      'driver_' + driverId,
      (update) => {
        handleRideUpdate(update);
      }
    );
    socketSubscriptions.current.push(rideUpdateUnsubscribe);
  };

  // ✅ ADDED: Handle ride updates
  const handleRideUpdate = (update) => {
    console.log('Driver ride update:', update);
    
    switch (update.type || update.status) {
      case 'ride_assigned':
      case 'matched':
        setActiveRide(update.ride);
        setDriverStatus('busy');
        Alert.alert(
          'New Ride Assigned!',
          `You have a new ride request from ${update.riderName}`,
          [
            {
              text: 'View Details',
              onPress: () => {
                navigation.navigate('RideRequest', { rideId: update.rideId });
              }
            }
          ]
        );
        break;
        
      case 'ride_started':
        setDriverStatus('on_trip');
        // Start tracking location for this ride
        if (update.rideId) {
          LocationService.watchPositionForRide(
            update.rideId,
            (location) => {
              // Location updates automatically sent via socket
              console.log('Ride location update:', location);
            },
            (error) => {
              console.error('Ride tracking error:', error);
            }
          );
        }
        break;
        
      case 'ride_completed':
        setActiveRide(null);
        setDriverStatus('available');
        setRidesCompleted(prev => prev + 1);
        if (update.fare) {
          setEarningsToday(prev => prev + update.fare);
        }
        Alert.alert('Ride Completed!', `You earned MK${update.fare || 0}`);
        break;
        
      case 'ride_cancelled':
        setActiveRide(null);
        setDriverStatus('available');
        Alert.alert('Ride Cancelled', update.reason || 'Ride was cancelled');
        break;
    }
  };

  // ✅ ADDED: Check for active ride
  const checkActiveRide = async () => {
    try {
      // TODO: Call your API to check if driver has active ride
      // const response = await api.get(`/drivers/${driverId}/active-ride`);
      // if (response.data.activeRide) {
      //   setActiveRide(response.data.activeRide);
      //   setDriverStatus('on_trip');
      // }
    } catch (error) {
      console.error('Error checking active ride:', error);
    }
  };

  // ✅ UPDATED: Request location permission
  const requestLocationPermission = async () => {
    try {
      return await LocationService.requestLocationPermission();
    } catch (error) {
      console.warn('Location permission error:', error);
      return false;
    }
  };

  // ✅ UPDATED: Get current location
  const getCurrentLocation = async () => {
    try {
      const result = await LocationService.getCurrentPosition();
      return {
        latitude: result.coords.latitude,
        longitude: result.coords.longitude,
        accuracy: result.coords.accuracy,
      };
    } catch (error) {
      console.error('Error getting location:', error);
      return null;
    }
  };

  // ✅ UPDATED: Go online with real-time features
  const goOnline = async () => {
    if (activeRide) {
      Alert.alert(
        'Active Ride',
        'You have an active ride. Please complete it before going offline.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!locationPermission) {
      const granted = await requestLocationPermission();
      if (!granted) {
        Alert.alert(
          'Location Required',
          'Location permission is required to go online.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Enable Location', 
              onPress: () => Linking.openSettings() 
            }
          ]
        );
        return;
      }
    }

    setLoading(true);
    
    try {
      // 1. Get fresh location
      const location = await getCurrentLocation();
      if (!location) {
        throw new Error('Could not get location');
      }
      
      setCurrentLocation(location);
      
      // 2. Update driver status via socket
      realTimeService.updateDriverAvailability(
        driverId,
        true, // isAvailable
        location,
        'available'
      );
      
      // 3. Start location tracking
      startLocationTracking();
      
      // 4. Update local state
      setIsOnline(true);
      setDriverStatus('available');
      
      // 5. Fetch nearby rides
      fetchNearbyRides(location);
      
      // 6. Show success message
      Alert.alert(
        'You are now online!',
        'You will receive ride requests in your area.',
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('Error going online:', error);
      Alert.alert(
        'Failed to go online',
        error.message || 'Please check your location and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  // ✅ UPDATED: Go offline with proper cleanup
  const goOffline = () => {
    Alert.alert(
      'Go Offline?',
      'You will stop receiving ride requests.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Go Offline', 
          onPress: () => {
            // 1. Update driver status via socket
            realTimeService.updateDriverAvailability(
              driverId,
              false, // isAvailable
              currentLocation,
              'offline'
            );
            
            // 2. Stop location tracking
            stopLocationTracking();
            
            // 3. Update local state
            setIsOnline(false);
            setDriverStatus('offline');
            setNearbyRides([]);
            
            // 4. Clear all socket subscriptions
            cleanupSocketSubscriptions();
            
            Alert.alert('You are now offline');
          }
        }
      ]
    );
  };

  // ✅ ADDED: Start location tracking with socket updates
  const startLocationTracking = () => {
    if (locationWatchId.current) {
      Geolocation.clearWatch(locationWatchId.current);
    }

    locationWatchId.current = Geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy, heading, speed } = position.coords;
        const location = { latitude, longitude, accuracy, heading, speed };
        
        setCurrentLocation(location);
        
        // Update map smoothly
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude,
            longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }, 1000);
        }
        
        // Send location update via socket
        if (driverId && isOnline) {
          realTimeService.updateLocation(
            driverId,
            location,
            true, // isDriver
            activeRide?.id
          );
        }
      },
      (error) => {
        console.log('Location tracking error:', error);
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 10, // Update every 10 meters
        interval: 5000, // Update every 5 seconds
        fastestInterval: 2000,
      }
    );
  };

  // ✅ ADDED: Stop location tracking
  const stopLocationTracking = () => {
    if (locationWatchId.current) {
      Geolocation.clearWatch(locationWatchId.current);
      locationWatchId.current = null;
    }
  };

  // ✅ ADDED: Cleanup socket subscriptions
  const cleanupSocketSubscriptions = () => {
    socketSubscriptions.current.forEach(unsubscribe => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
    socketSubscriptions.current = [];
  };

  // ✅ ADDED: Complete cleanup
  const cleanup = () => {
    stopLocationTracking();
    cleanupSocketSubscriptions();
    LocationService.cleanup();
    realTimeService.removeConnectionListener();
  };

  // ✅ UPDATED: Handle ride selection
  const handleSelectRide = (ride) => {
    setSelectedRideId(ride.id);
    
    if (ride?.pickupLocation) {
      const newRegion = {
        latitude: ride.pickupLocation.latitude,
        longitude: ride.pickupLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setRegion(newRegion);
      
      if (mapRef.current) {
        mapRef.current.animateToRegion(newRegion, 1000);
      }
    }
  };

  // ✅ UPDATED: Handle ride acceptance with real-time
  const handleAcceptRide = (ride) => {
    Alert.alert(
      'Accept Ride Request',
      `Accept ride from ${ride.riderName || 'customer'} for MK${ride.estimatedFare || ride.fare || '0'}?`,
      [
        { 
          text: 'Reject', 
          style: 'destructive',
          onPress: () => {
            // Emit ride rejection via socket
            realTimeService.cancelRideRequest(ride.id, 'Driver rejected');
            setNearbyRides(prev => prev.filter(r => r.id !== ride.id));
          }
        },
        { 
          text: 'Accept Ride', 
          onPress: () => {
            // Emit ride acceptance via socket
            realTimeService.acceptRide(
              ride.id,
              driverId,
              '5 min' // Estimated arrival
            );
            
            // Update local state
            setActiveRide(ride);
            setDriverStatus('busy');
            setNearbyRides(prev => prev.filter(r => r.id !== ride.id));
            
            // Navigate to ride request screen
            navigation.navigate('RideRequest', { 
              rideId: ride.id,
              rideData: ride 
            });
          }
        }
      ]
    );
  };

  // ✅ ADDED: Render connection status
  const renderConnectionStatus = () => {
    let statusColor = '#FF6B6B'; // red
    let statusText = 'Offline';
    
    if (isOnline && connectionStatus === 'connected') {
      statusColor = '#06C167'; // green
      statusText = 'Online • Live';
    } else if (isOnline && connectionStatus === 'disconnected') {
      statusColor = '#FBBC05'; // yellow
      statusText = 'Online • Connecting...';
    }
    
    return (
      <View style={styles.connectionStatusContainer}>
        <View style={[styles.connectionDot, { backgroundColor: statusColor }]} />
        <Text style={styles.connectionText}>{statusText}</Text>
      </View>
    );
  };

  // ✅ ADDED: Render stats overview
  const renderStatsOverview = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>MK{earningsToday.toLocaleString()}</Text>
        <Text style={styles.statLabel}>Today</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{ridesCompleted}</Text>
        <Text style={styles.statLabel}>Rides</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={styles.statValue}>
          {activeRide ? 'On Trip' : 'Available'}
        </Text>
        <Text style={styles.statLabel}>Status</Text>
      </View>
    </View>
  );

  if (loading && !region) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <ActivityIndicator size="large" color="#06C167" />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Welcome, {driverName}</Text>
          {renderConnectionStatus()}
        </View>
        <TouchableOpacity onPress={handleViewEarnings}>
          <MaterialIcon name="account-balance-wallet" size={24} color="#06C167" />
        </TouchableOpacity>
      </View>

      {/* Stats Overview */}
      {isOnline && renderStatsOverview()}

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapComponent
          ref={mapRef}
          region={region || defaultRegion}
          setRegion={setRegion}
          rides={nearbyRides}
          selectedRideId={selectedRideId}
          onSelectRide={handleSelectRide}
          userLocation={currentLocation}
          showUserLocation={true}
          isDriver={true}
          driverStatus={driverStatus}
        />
      </View>

      {/* Bottom Panel */}
      <View style={styles.bottomPanel}>
        {/* Online/Offline Button */}
        <TouchableOpacity
          style={[
            styles.onlineButton,
            isOnline ? styles.offlineButtonStyle : styles.onlineButtonStyle
          ]}
          onPress={isOnline ? goOffline : goOnline}
          disabled={loading}
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

        {/* Nearby Rides */}
        {nearbyRides.length > 0 && (
          <View style={styles.ridesSection}>
            <Text style={styles.sectionTitle}>
              Nearby Ride Requests ({nearbyRides.length})
            </Text>
            <ScrollView 
              style={styles.ridesList}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              {nearbyRides.map((ride) => (
                <TouchableOpacity
                  key={ride.id}
                  style={[
                    styles.rideCard,
                    selectedRideId === ride.id && styles.rideCardSelected
                  ]}
                  onPress={() => handleSelectRide(ride)}
                >
                  <View style={styles.rideCardHeader}>
                    <MaterialIcon name="person" size={20} color="#4285F4" />
                    <Text style={styles.riderName}>
                      {ride.riderName || 'Customer'}
                    </Text>
                    <Text style={styles.rideDistance}>
                      {ride.distance ? `${ride.distance} km` : 'Nearby'}
                    </Text>
                  </View>
                  <View style={styles.rideCardBody}>
                    <Text style={styles.rideFare}>
                      MK{ride.estimatedFare || ride.fare || '0'}
                    </Text>
                    <Text style={styles.rideTime}>
                      {ride.estimatedTime || '5 min'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => handleAcceptRide(ride)}
                  >
                    <Text style={styles.acceptButtonText}>Accept</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Quick Access Menu */}
        <View style={styles.menuSection}>
          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={handleViewRideRequests}
          >
            <MaterialIcon name="notifications" size={24} color="#06C167" />
            <Text style={styles.menuText}>Ride Requests</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={handleViewTripHistory}
          >
            <MaterialIcon name="history" size={24} color="#06C167" />
            <Text style={styles.menuText}>Trip History</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={handleViewProfile}
          >
            <MaterialIcon name="person" size={24} color="#06C167" />
            <Text style={styles.menuText}>Profile</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Active Ride Banner */}
      {activeRide && (
        <TouchableOpacity
          style={styles.activeRideBanner}
          onPress={() => navigation.navigate('ActiveRide', { rideId: activeRide.id })}
        >
          <View style={styles.activeRideContent}>
            <MaterialIcon name="directions-car" size={24} color="#FFF" />
            <View style={styles.activeRideInfo}>
              <Text style={styles.activeRideText}>Active Ride in Progress</Text>
              <Text style={styles.activeRideSubtext}>Tap to view details</Text>
            </View>
            <MaterialIcon name="chevron-right" size={24} color="#FFF" />
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: '#F7F6F3'
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  connectionStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  connectionText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  statDivider: {
    width: 1,
    height: '80%',
    backgroundColor: '#F0F0F0',
    marginHorizontal: 8,
  },
  mapContainer: { 
    flex: 1 
  },
  bottomPanel: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  onlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#06C167',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  onlineButtonStyle: {
    backgroundColor: '#06C167',
  },
  offlineButtonStyle: {
    backgroundColor: '#EA4335',
    shadowColor: '#EA4335',
  },
  onlineButtonText: {
    fontSize: 18,
    color: '#FFF',
    fontWeight: 'bold',
    marginLeft: 10,
  },
  ridesSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  ridesList: {
    flexGrow: 0,
  },
  rideCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    width: 200,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  rideCardSelected: {
    borderColor: '#06C167',
    backgroundColor: '#F0F9F0',
  },
  rideCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  riderName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginLeft: 8,
    flex: 1,
  },
  rideDistance: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  rideCardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rideFare: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#EA4335',
  },
  rideTime: {
    fontSize: 14,
    color: '#666',
  },
  acceptButton: {
    backgroundColor: '#06C167',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  menuSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 16,
  },
  menuItem: {
    alignItems: 'center',
  },
  menuText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  activeRideBanner: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    backgroundColor: '#06C167',
    borderRadius: 12,
    padding: 16,
    elevation: 5,
    shadowColor: '#06C167',
    shadowOffset: { width: 0, height: 4 },
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
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
  },
});