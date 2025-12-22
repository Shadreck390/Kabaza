// screens/driver/DriverMapScreen.js
import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import Geolocation from 'react-native-geolocation-service';
import io from 'socket.io-client';

const { width, height } = Dimensions.get('window');

// Mock ride requests (in production, these would come from WebSocket)
const MOCK_RIDE_REQUESTS = [
  {
    id: 'ride-001',
    passenger: {
      id: 'passenger-001',
      name: 'Alice M.',
      rating: 4.8,
    },
    pickup: {
      name: 'Area 3 Shopping Complex',
      address: 'Area 3, Lilongwe',
      coordinates: { latitude: -13.9583, longitude: 33.7689 },
    },
    destination: {
      name: 'Lilongwe City Mall',
      address: 'M1 Road, Lilongwe',
    },
    fare: 850,
    distance: '2.5 km',
    duration: '8 min',
    rideType: 'kabaza',
    timestamp: new Date().toISOString(),
    expiresIn: 30, // seconds
  },
  {
    id: 'ride-002',
    passenger: {
      id: 'passenger-002',
      name: 'Bob K.',
      rating: 4.5,
    },
    pickup: {
      name: 'Crossroads Hotel',
      address: 'Mchinji Road',
      coordinates: { latitude: -13.9620, longitude: 33.7741 },
    },
    destination: {
      name: 'Kamuzu Central Hospital',
      address: 'Mzimba Street',
    },
    fare: 1200,
    distance: '3.8 km',
    duration: '12 min',
    rideType: 'taxi',
    timestamp: new Date().toISOString(),
    expiresIn: 25,
  },
  {
    id: 'ride-003',
    passenger: {
      id: 'passenger-003',
      name: 'Charlie L.',
      rating: 4.9,
    },
    pickup: {
      name: 'Game Stores',
      address: 'Shoprite Complex',
      coordinates: { latitude: -13.9765, longitude: 33.7748 },
    },
    destination: {
      name: 'Bingu Conference Centre',
      address: 'Presidential Way',
    },
    fare: 650,
    distance: '1.8 km',
    duration: '6 min',
    rideType: 'kabaza',
    timestamp: new Date().toISOString(),
    expiresIn: 20,
  },
];

export default function DriverMapScreen() {
  const navigation = useNavigation();
  const mapRef = useRef(null);
  
  // State
  const [driverStatus, setDriverStatus] = useState('online'); // online, offline, on-trip
  const [currentLocation, setCurrentLocation] = useState({
    latitude: -13.9626,
    longitude: 33.7741,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const [rideRequests, setRideRequests] = useState([]);
  const [activeRide, setActiveRide] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [socket, setSocket] = useState(null);
  const [rideTimer, setRideTimer] = useState(0);
  const [earningsToday, setEarningsToday] = useState(12500);
  const [rideCountToday, setRideCountToday] = useState(8);
  const [isNavigating, setIsNavigating] = useState(false);
  
  // Animations
  const slideAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Initialize WebSocket connection (mock for now)
    initSocketConnection();
    
    // Get current location
    getCurrentLocation();
    
    // Load mock ride requests
    setRideRequests(MOCK_RIDE_REQUESTS);
    
    // Start ride request timer
    const timer = setInterval(() => {
      setRideRequests(prev => 
        prev.map(req => ({
          ...req,
          expiresIn: Math.max(0, req.expiresIn - 1)
        })).filter(req => req.expiresIn > 0)
      );
    }, 1000);
    
    return () => {
      clearInterval(timer);
      if (socket) socket.disconnect();
    };
  }, []);

  useEffect(() => {
    // Pulse animation for active ride requests
    if (rideRequests.length > 0 && driverStatus === 'online') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [rideRequests.length, driverStatus]);

  const initSocketConnection = () => {
    // In production, connect to your WebSocket server
    // const newSocket = io('YOUR_WEBSOCKET_URL');
    // setSocket(newSocket);
    
    // Mock socket events
    console.log('WebSocket connection initialized');
  };

  const getCurrentLocation = () => {
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation(prev => ({
          ...prev,
          latitude,
          longitude,
        }));
        
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude,
            longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }, 1000);
        }
      },
      (error) => {
        console.log('Error getting location:', error);
        Alert.alert('Location Error', 'Unable to get your location. Please check GPS settings.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );

    // Watch position updates
    const watchId = Geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation(prev => ({
          ...prev,
          latitude,
          longitude,
        }));
      },
      (error) => console.log('Watch position error:', error),
      { enableHighAccuracy: true, distanceFilter: 10 }
    );

    return () => Geolocation.clearWatch(watchId);
  };

  const handleToggleStatus = () => {
    const newStatus = driverStatus === 'online' ? 'offline' : 'online';
    setDriverStatus(newStatus);
    
    if (newStatus === 'offline') {
      setRideRequests([]);
      Alert.alert('You\'re Offline', 'You will not receive ride requests.');
    } else {
      Alert.alert('You\'re Online', 'You will now receive ride requests.');
    }
  };

  const handleRideRequestPress = (request) => {
    setSelectedRequest(request);
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    
    // Center map on pickup location
    if (mapRef.current && request.pickup.coordinates) {
      mapRef.current.animateToRegion({
        latitude: request.pickup.coordinates.latitude,
        longitude: request.pickup.coordinates.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  };

  const handleAcceptRide = (request) => {
    Alert.alert(
      'Accept Ride Request',
      `Accept ride from ${request.passenger.name} for MK ${request.fare}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Accept', 
          style: 'default',
          onPress: () => {
            setActiveRide(request);
            setDriverStatus('on-trip');
            setRideRequests([]);
            setSelectedRequest(null);
            slideAnim.setValue(0);
            
            // Start navigation to pickup
            setIsNavigating(true);
            startNavigationToPickup(request.pickup.coordinates);
            
            // In production, notify server
            console.log('Ride accepted:', request.id);
          }
        },
      ]
    );
  };

  const handleRejectRide = (requestId) => {
    setRideRequests(prev => prev.filter(req => req.id !== requestId));
    setSelectedRequest(null);
    slideAnim.setValue(0);
    
    // In production, notify server
    console.log('Ride rejected:', requestId);
  };

  const startNavigationToPickup = (pickupCoordinates) => {
    // In production, integrate with navigation API (Google Maps, Apple Maps)
    console.log('Navigating to pickup:', pickupCoordinates);
    
    // Simulate navigation
    setTimeout(() => {
      Alert.alert(
        'Arrived at Pickup',
        'You have arrived at the pickup location.',
        [
          {
            text: 'Start Ride',
            onPress: () => {
              setIsNavigating(false);
              navigation.navigate('RideActive', { 
                rideId: activeRide.id,
                rideData: activeRide,
                isDriver: true 
              });
            }
          },
        ]
      );
    }, 5000);
  };

  const handleEndRide = () => {
    Alert.alert(
      'End Current Ride',
      'Are you sure you want to end the current ride?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Ride',
          style: 'destructive',
          onPress: () => {
            setActiveRide(null);
            setDriverStatus('online');
            setIsNavigating(false);
          }
        },
      ]
    );
  };

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

  const renderStatusIndicator = () => {
    const statusConfig = {
      online: { color: '#22C55E', text: 'Online', icon: 'check-circle' },
      offline: { color: '#6B7280', text: 'Offline', icon: 'cancel' },
      'on-trip': { color: '#3B82F6', text: 'On Trip', icon: 'directions-car' },
    };
    
    const config = statusConfig[driverStatus];
    
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

  const renderRideRequestCard = (request) => {
    const isSelected = selectedRequest?.id === request.id;
    
    return (
      <TouchableOpacity
        key={request.id}
        style={[
          styles.rideRequestCard,
          isSelected && styles.rideRequestCardSelected,
        ]}
        onPress={() => handleRideRequestPress(request)}
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
              </View>
            </View>
          </View>
          
          <View style={styles.fareContainer}>
            <Text style={styles.fareAmount}>MK {request.fare}</Text>
            <Text style={styles.rideType}>{request.rideType}</Text>
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
          
          <View style={styles.timerContainer}>
            <MaterialIcon name="timer" size={14} color="#EF4444" />
            <Text style={styles.timerText}>{request.expiresIn}s</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSelectedRequestDetail = () => {
    if (!selectedRequest) return null;
    
    const translateY = slideAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [400, 0],
    });
    
    return (
      <Animated.View 
        style={[
          styles.requestDetailContainer,
          { transform: [{ translateY }] }
        ]}
      >
        <View style={styles.detailHeader}>
          <Text style={styles.detailTitle}>Ride Request</Text>
          <TouchableOpacity onPress={() => {
            setSelectedRequest(null);
            slideAnim.setValue(0);
          }}>
            <MaterialIcon name="close" size={24} color="#000" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.detailContent}>
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
              </View>
            </View>
          </View>
          
          <View style={styles.routeDetail}>
            <View style={styles.routeStop}>
              <View style={[styles.stopIcon, { backgroundColor: '#3B82F6' }]} />
              <View style={styles.stopInfo}>
                <Text style={styles.stopLabel}>Pickup</Text>
                <Text style={styles.stopAddress}>{selectedRequest.pickup.address}</Text>
              </View>
            </View>
            
            <View style={styles.routeLine} />
            
            <View style={styles.routeStop}>
              <View style={[styles.stopIcon, { backgroundColor: '#EF4444' }]} />
              <View style={styles.stopInfo}>
                <Text style={styles.stopLabel}>Destination</Text>
                <Text style={styles.stopAddress}>{selectedRequest.destination.address}</Text>
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
          </View>
        </View>
        
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

  const renderActiveRideInfo = () => {
    if (!activeRide || !isNavigating) return null;
    
    return (
      <View style={styles.activeRideContainer}>
        <View style={styles.activeRideHeader}>
          <Text style={styles.activeRideTitle}>Navigating to Pickup</Text>
          <TouchableOpacity onPress={handleEndRide}>
            <Text style={styles.endRideText}>End Ride</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.activeRideContent}>
          <Text style={styles.activeRidePassenger}>
            Passenger: {activeRide.passenger.name}
          </Text>
          <Text style={styles.activeRideFare}>
            Fare: MK {activeRide.fare}
          </Text>
          <Text style={styles.activeRideDistance}>
            Distance to pickup: 1.2 km • 4 min
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Map */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={currentLocation}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={true}
        showsScale={true}
      >
        {/* Driver Location */}
        {currentLocation && (
          <Marker
            coordinate={currentLocation}
            title="Your Location"
            flat={true}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <Animated.View style={[
              styles.driverMarker,
              { transform: [{ scale: pulseAnim }] }
            ]}>
              <MaterialCommunityIcon name="steering" size={24} color="#FFFFFF" />
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
            </Animated.View>
          </Marker>
        ))}
      </MapView>

      {/* Top Controls */}
      <View style={styles.topControls}>
        {/* Status Indicator */}
        {renderStatusIndicator()}
        
        {/* Earnings Today */}
        <View style={styles.earningsCard}>
          <MaterialIcon name="attach-money" size={16} color="#22C55E" />
          <Text style={styles.earningsText}>MK {earningsToday.toLocaleString()}</Text>
          <Text style={styles.ridesText}>• {rideCountToday} rides</Text>
        </View>
      </View>

      {/* Ride Requests List */}
      {driverStatus === 'online' && rideRequests.length > 0 && (
        <View style={styles.requestsContainer}>
          <View style={styles.requestsHeader}>
            <Text style={styles.requestsTitle}>
              Ride Requests ({rideRequests.length})
            </Text>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <MaterialIcon name="notifications-active" size={20} color="#EF4444" />
            </Animated.View>
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
          
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={() => navigation.navigate('DriverEarnings')}
          >
            <MaterialIcon name="bar-chart" size={24} color="#000000" />
          </TouchableOpacity>
          
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
      </View>

      {/* Selected Ride Request Detail */}
      {renderSelectedRequestDetail()}

      {/* Active Ride Info */}
      {renderActiveRideInfo()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  topControls: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
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
  earningsCard: {
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
  earningsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  ridesText: {
    fontSize: 12,
    color: '#666',
  },
  driverMarker: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
  requestsContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 90,
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
  requestsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  requestsList: {
    flexDirection: 'row',
  },
  rideRequestCard: {
    width: width * 0.75,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  rideRequestCardSelected: {
    borderWidth: 2,
    borderColor: '#22C55E',
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
  rideType: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
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
    gap: 4,
  },
  timerText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
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
  requestDetailContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  detailContent: {
    padding: 20,
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
  },
  ratingTextLarge: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
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
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: '#E5E7EB',
    marginLeft: 11,
    marginVertical: 4,
  },
  fareDetail: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
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
  detailActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
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
    top: Platform.OS === 'ios' ? 100 : 90,
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
  endRideText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '500',
  },
  activeRideContent: {
    gap: 4,
  },
  activeRidePassenger: {
    fontSize: 14,
    color: '#000000',
  },
  activeRideFare: {
    fontSize: 14,
    color: '#22C55E',
    fontWeight: '600',
  },
  activeRideDistance: {
    fontSize: 14,
    color: '#666',
  },
});