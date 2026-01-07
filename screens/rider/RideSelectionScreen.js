// screens/rider/RideSelectionScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
  StatusBar,
  ActivityIndicator,
  Alert
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import Geolocation from 'react-native-geolocation-service';
import apiClient from '@services/api/client';

// ✅ FIXED IMPORTS:
  // Changed from '@src/services/api/apiService'
// OR use your existing API file:
// import API from '@services/api/index';
// OR use ride-specific API:
// import { rideAPI } from '@services/api/rideAPI';

import realTimeService from '@services/socket/realtimeUpdates';
import { getUserData } from '@utils/userStorage';  // Changed from '@src/utils/userStorage'

// Rest of your component code...

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Helper function to format Malawi Kwacha
const formatMK = (amount) => {
  const rounded = Math.round(amount);
  return `MK${rounded.toLocaleString()}`;
};

// Calculate distance between coordinates
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export default function RideSelectionScreen({ route, navigation }) {
  const { destination, destinationAddress, destinationCoordinates, pickupLocation, pickupCoordinates, scheduleLater } = route.params || {};
  
  const [selectedRide, setSelectedRide] = useState(null);
  const [usePromo, setUsePromo] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [loading, setLoading] = useState(false);
  const [nearbyDrivers, setNearbyDrivers] = useState([]);
  const [distance, setDistance] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState('5 min');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [ridePrices, setRidePrices] = useState({});
  const [user, setUser] = useState(null); // ADD USER STATE
  
  const mapRef = useRef(null);
  const promoCode = 'PROMO20';

  // Enhanced ride options with real-time data
  const rideOptions = [
    { 
      id: 'economy_bike', 
      type: 'Bike', 
      name: 'Economy (Bike)', 
      icon: 'motorcycle', 
      description: 'Affordable bike rides', 
      time: '5 min', 
      seats: '1', 
      basePrice: 250, 
      multiplier: 1.0, 
      color: '#4285F4',
      vehicleType: 'bike'
    },
    { 
      id: 'economy_car', 
      type: 'Car', 
      name: 'Economy (Car)', 
      icon: 'car', 
      description: 'Affordable car rides', 
      time: '5 min', 
      seats: '4', 
      basePrice: 360, 
      multiplier: 1.0, 
      color: '#34A853',
      vehicleType: 'car'
    },
    { 
      id: 'bolt_bike', 
      type: 'Bike', 
      name: 'Kabaza Bike', 
      icon: 'motorcycle', 
      description: 'Quick bike service', 
      time: '3 min', 
      seats: '1', 
      basePrice: 300, 
      multiplier: 1.1, 
      color: '#FBBC05',
      vehicleType: 'bike_premium'
    },
    { 
      id: 'bolt_car', 
      type: 'Car', 
      name: 'Kabaza Car', 
      icon: 'car', 
      description: 'Quick car service', 
      time: '3 min', 
      seats: '4', 
      basePrice: 400, 
      multiplier: 1.1, 
      color: '#EA4335',
      vehicleType: 'car_premium'
    },
    { 
      id: 'wait_save_bike', 
      type: 'Bike', 
      name: 'Wait & Save (Bike)', 
      icon: 'motorcycle', 
      description: 'Wait longer, save more', 
      time: '10-15 min', 
      seats: '1', 
      basePrice: 200, 
      multiplier: 0.8, 
      color: '#9C27B0',
      vehicleType: 'bike_economy'
    },
    { 
      id: 'wait_save_car', 
      type: 'Car', 
      name: 'Wait & Save (Car)', 
      icon: 'car', 
      description: 'Wait longer, save more', 
      time: '10-15 min', 
      seats: '4', 
      basePrice: 320, 
      multiplier: 0.8, 
      color: '#FF9800',
      vehicleType: 'car_economy'
    },
  ];

  useEffect(() => {
    // Load user data first
    const loadUserData = async () => {
      try {
        const userData = await getUserData();
        setUser(userData);
        
        // Initialize socket with user data
        if (userData) {
          realTimeService.initializeSocket({
            id: userData.id,
            name: userData.name || 'Rider',
            role: 'rider',
          });
          
          // Listen for connection status
          realTimeService.addConnectionListener((connected) => {
            console.log('Socket connection status:', connected);
          });
        }
      } catch (error) {
        console.error('Failed to load user data:', error);
      }
    };
    
    loadUserData();
    
    fetchCurrentLocation();
    calculateRouteDistance();
    
    // Fetch nearby drivers and pricing
    fetchNearbyDrivers();
    
    // Setup socket listeners for real-time updates
    setupSocketListeners();
    
    return () => {
      cleanupSocketListeners();
      // Remove connection listener on unmount
      realTimeService.removeConnectionListener();
    };
  }, []);

  // ADD THIS EFFECT FOR NEARBY DRIVERS SUBSCRIPTION
  useEffect(() => {
    if (currentLocation && user) {
      // Subscribe to nearby drivers when location is available
      const unsubscribe = realTimeService.subscribeToNearbyDrivers(
        currentLocation,
        5, // 5km radius
        ['bike', 'car'], // Vehicle types
        (drivers) => {
          console.log('Real-time nearby drivers update:', drivers);
          setNearbyDrivers(drivers);
          updateRideAvailability(drivers);
        }
      );
      
      return unsubscribe; // Cleanup on unmount or location change
    }
  }, [currentLocation, user]);

  const fetchCurrentLocation = () => {
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ latitude, longitude });
        
        // Update map view
        if (mapRef.current && pickupCoordinates && destinationCoordinates) {
          const coords = [
            { latitude: pickupCoordinates.latitude, longitude: pickupCoordinates.longitude },
            { latitude: destinationCoordinates.latitude, longitude: destinationCoordinates.longitude }
          ];
          
          setTimeout(() => {
            mapRef.current.fitToCoordinates(coords, {
              edgePadding: { top: 100, right: 100, bottom: 300, left: 100 },
              animated: true,
            });
          }, 500);
        }
      },
      (error) => {
        console.log('Location error:', error);
        // Use default location if GPS fails
        setCurrentLocation({ latitude: -13.9626, longitude: 33.7741 });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  const calculateRouteDistance = () => {
    if (pickupCoordinates && destinationCoordinates) {
      const dist = calculateDistance(
        pickupCoordinates.latitude,
        pickupCoordinates.longitude,
        destinationCoordinates.latitude,
        destinationCoordinates.longitude
      );
      
      const roundedDistance = Math.max(0.5, Math.round(dist * 10) / 10); // Minimum 0.5km
      setDistance(roundedDistance);
      
      // Calculate estimated time (assuming 30km/h average speed)
      const timeMinutes = Math.round((roundedDistance / 30) * 60);
      const minTime = Math.max(3, timeMinutes - 2);
      const maxTime = Math.max(5, timeMinutes + 2);
      setEstimatedTime(`${minTime}-${maxTime} min`);
    }
  };

  const fetchNearbyDrivers = async () => {
    try {
      setLoading(true);
      const location = pickupCoordinates || currentLocation || { latitude: -13.9626, longitude: 33.7741 };
      
      // Mock API call - replace with your actual API
      const response = await api.get('/drivers/nearby', {
        params: {
          latitude: location.latitude,
          longitude: location.longitude,
          radius: 5,
        }
      });
      
      if (response.data?.drivers) {
        setNearbyDrivers(response.data.drivers);
        updateRideAvailability(response.data.drivers);
      }
      
      // Fetch dynamic pricing
      fetchDynamicPricing();
      
    } catch (error) {
      console.error('Error fetching drivers:', error);
      // Mock data for development
      setNearbyDrivers([
        { id: '1', vehicleType: 'bike', location: { latitude: -13.9650, longitude: 33.7750 } },
        { id: '2', vehicleType: 'car', location: { latitude: -13.9600, longitude: 33.7700 } },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDynamicPricing = async () => {
    try {
      const response = await apiClient.get('/pricing/current', {
        params: {
          distance: distance,
          timeOfDay: new Date().getHours()
        }
      });
      
      if (response.data?.prices) {
        setRidePrices(response.data.prices);
      }
    } catch (error) {
      console.error('Error fetching pricing:', error);
    }
  };

  const setupSocketListeners = () => {
    // Socket is now handled by realTimeService, but you can add additional listeners here
    
    // Listen for surge pricing updates via socket
    const surgeUnsubscribe = realTimeService.subscribeToSurgePricing(
      'lilongwe', // Area ID - you might want to determine this based on location
      (surgeData) => {
        console.log('Real-time surge pricing update:', surgeData);
        updateSurgePricing(surgeData);
      }
    );
    
    return surgeUnsubscribe; // Return cleanup function
  };

  const cleanupSocketListeners = () => {
    // Cleanup will be handled by the unsubscribe functions returned from setupSocketListeners
  };

  const updateRideAvailability = (drivers) => {
    // Count available drivers per vehicle type
    const driverCounts = {
      bike: drivers.filter(d => d.vehicleType?.includes('bike')).length,
      car: drivers.filter(d => d.vehicleType?.includes('car')).length,
    };
    
    // Update ride options based on availability
    rideOptions.forEach(ride => {
      const isBike = ride.vehicleType.includes('bike');
      ride.availableDrivers = isBike ? driverCounts.bike : driverCounts.car;
      ride.isAvailable = ride.availableDrivers > 0;
    });
  };

  const updateSurgePricing = (surgeData) => {
    const updatedPrices = { ...ridePrices };
    rideOptions.forEach(ride => {
      if (surgeData[ride.vehicleType]) {
        updatedPrices[ride.id] = surgeData[ride.vehicleType];
      }
    });
    setRidePrices(updatedPrices);
  };

  const calculatePrice = (ride) => {
    const base = ride.basePrice;
    const multiplier = ride.multiplier;
    const surgeMultiplier = ridePrices[ride.id] || 1.0;
    const distanceMultiplier = Math.max(1, distance * 0.3); // MK 0.3 per km
    
    const price = base * multiplier * surgeMultiplier * distanceMultiplier;
    return usePromo ? Math.round(price * 0.8) : Math.round(price);
  };

  const handleSelectRide = (ride) => {
    if (!ride.isAvailable && ride.availableDrivers === 0) {
      Alert.alert(
        'No Drivers Available',
        `There are no ${ride.type.toLowerCase()} drivers available in your area. Please select another option.`
      );
      return;
    }
    
    setSelectedRide(ride.id);
    
    // Emit socket event for driver availability check
    // This is now handled by the realTimeService
    // You could add additional logic here if needed
  };

  // UPDATED handleConfirmRide FUNCTION FOR REAL-TIME RIDE REQUEST
  const handleConfirmRide = async () => {
    if (!selectedRide) {
      alert('Please select a ride option');
      return;
    }
    
    const rideData = rideOptions.find(r => r.id === selectedRide);
    
    // Check if drivers are still available
    if (rideData.availableDrivers === 0) {
      Alert.alert(
        'No Drivers Available',
        'The selected ride type is no longer available. Please select another option.'
      );
      return;
    }
    
    // Check if user data is loaded
    if (!user) {
      Alert.alert('Error', 'User data not loaded. Please try again.');
      return;
    }
    
    // Check if socket is connected
    const connectionStatus = realTimeService.getConnectionStatus();
    if (!connectionStatus.isConnected) {
      Alert.alert(
        'Connection Issue',
        'Real-time connection not established. Trying to reconnect...',
        [
          { 
            text: 'Try Again', 
            onPress: () => {
              realTimeService.connectSocket();
              // Retry after a delay
              setTimeout(handleConfirmRide, 2000);
            }
          },
          { 
            text: 'Continue Anyway', 
            onPress: () => proceedWithRideRequest(rideData) 
          }
        ]
      );
      return;
    }
    
    proceedWithRideRequest(rideData);
  };

  // NEW FUNCTION: Process ride request with real-time service
  const proceedWithRideRequest = (rideData) => {
    setLoading(true);
    
    try {
      // Prepare ride request data
      const rideRequest = {
        riderId: user.id,
        riderName: user.name || 'Rider',
        riderPhone: user.phone,
        pickup: {
          address: pickupLocation || 'Your Location',
          coordinates: pickupCoordinates || currentLocation,
        },
        destination: {
          address: destination || destinationAddress,
          coordinates: destinationCoordinates,
        },
        vehicleType: rideData.vehicleType,
        estimatedFare: calculatePrice(rideData),
        paymentMethod: paymentMethod,
        promoCode: usePromo ? 'PROMO20' : null,
        distance: distance,
        estimatedTime: estimatedTime,
      };
      
      // Send real-time ride request via socket
      const requestId = realTimeService.requestRide(rideRequest);
      
      if (requestId) {
        console.log('Ride requested successfully with ID:', requestId);
        
        // Navigate to confirmation screen with ride ID
        navigation.navigate('RideConfirmation', {
          ride: {
            ...rideData,
            price: calculatePrice(rideData),
            formattedPrice: formatMK(calculatePrice(rideData)),
            estimatedTime: estimatedTime,
            distance: distance,
            availableDrivers: rideData.availableDrivers,
            surgeMultiplier: ridePrices[rideData.id] || 1.0,
            requestId: requestId, // Add request ID for tracking
          },
          destination: destination || 'Selected Destination',
          destinationAddress: destinationAddress || 'Malawi Location',
          destinationCoords: destinationCoordinates,
          pickupLocation: pickupLocation || 'Your Current Location',
          pickupCoords: pickupCoordinates || currentLocation,
          riderInfo: { 
            paymentMethod, 
            usePromo,
            promoCode: usePromo ? promoCode : null,
            userId: user.id,
            userName: user.name || 'Rider',
          },
          socketRequestId: requestId, // Pass socket request ID
        });
      } else {
        Alert.alert('Request Failed', 'Failed to send ride request. Please try again.');
      }
    } catch (error) {
      console.error('Error requesting ride:', error);
      Alert.alert('Error', 'Failed to request ride. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getDriverCount = (vehicleType) => {
    return nearbyDrivers.filter(driver => 
      driver.vehicleType?.includes(vehicleType)
    ).length;
  };

  const renderDriverMarkers = () => {
    return nearbyDrivers.map((driver, index) => (
      <Marker
        key={`driver-${index}`}
        coordinate={{
          latitude: driver.location?.latitude || -13.9650,
          longitude: driver.location?.longitude || 33.7750
        }}
        title={`${driver.vehicleType?.includes('bike') ? 'Bike' : 'Car'} Driver`}
        description={`${driver.name || 'Driver'} - ${driver.rating || '5.0'} ★`}
      >
        <View style={[
          styles.driverMarker,
          { backgroundColor: driver.vehicleType?.includes('bike') ? '#FBBC05' : '#34A853' }
        ]}>
          <FontAwesome5 
            name={driver.vehicleType?.includes('bike') ? 'motorcycle' : 'car'} 
            size={12} 
            color="#FFF" 
          />
        </View>
      </Marker>
    ));
  };

  const pickupCoords = pickupCoordinates || currentLocation || 
    { latitude: -13.9626, longitude: 33.7741 };

  const destCoords = destinationCoordinates || 
    (destinationAddress?.includes('Hospital') ?
      { latitude: -13.9731, longitude: 33.7871 } :
      { latitude: -13.9897, longitude: 33.7777 });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialIcon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {destination || 'Select Destination'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Map */}
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            initialRegion={{ 
              latitude: -13.9762, 
              longitude: 33.7741, 
              latitudeDelta: 0.05, 
              longitudeDelta: 0.05 
            }}
            scrollEnabled={false} 
            zoomEnabled={false} 
            rotateEnabled={false}
          >
            <Marker coordinate={pickupCoords} title="Pickup" pinColor="#4285F4">
              <View style={[styles.marker, styles.pickupMarker]}>
                <MaterialIcon name="my-location" size={16} color="#FFF" />
              </View>
            </Marker>
            
            <Marker coordinate={destCoords} title="Destination" pinColor="#EA4335">
              <View style={[styles.marker, styles.destinationMarker]}>
                <MaterialIcon name="place" size={16} color="#FFF" />
              </View>
            </Marker>
            
            {/* Render nearby drivers */}
            {renderDriverMarkers()}
            
            <Polyline 
              coordinates={[pickupCoords, destCoords]} 
              strokeColor="#4285F4" 
              strokeWidth={3} 
              lineDashPattern={[5,5]} 
            />
          </MapView>

          <View style={styles.routeInfo}>
            <View style={styles.routePoint}>
              <View style={styles.routeDot} />
              <Text style={styles.routeText}>Your Location</Text>
              {distance > 0 && (
                <Text style={styles.distanceText}>{distance} km</Text>
              )}
            </View>
            <View style={styles.routeLine} />
            <View style={styles.routePoint}>
              <MaterialIcon name="place" size={16} color="#EA4335" />
              <Text style={styles.routeText}>{destination || 'Destination'}</Text>
              {estimatedTime && (
                <Text style={styles.timeText}>{estimatedTime}</Text>
              )}
            </View>
          </View>
          
          {/* Real-time driver count */}
          <View style={styles.driverInfo}>
            <View style={styles.driverCount}>
              <FontAwesome5 name="motorcycle" size={14} color="#FBBC05" />
              <Text style={styles.driverCountText}>
                {getDriverCount('bike')} bike {getDriverCount('bike') === 1 ? 'driver' : 'drivers'}
              </Text>
            </View>
            <View style={styles.driverCount}>
              <FontAwesome5 name="car" size={14} color="#34A853" />
              <Text style={styles.driverCountText}>
                {getDriverCount('car')} car {getDriverCount('car') === 1 ? 'driver' : 'drivers'}
              </Text>
            </View>
            
            {/* Socket connection status indicator */}
            <View style={styles.connectionStatus}>
              <View style={[
                styles.connectionDot, 
                { backgroundColor: realTimeService.getConnectionStatus().isConnected ? '#06C167' : '#EA4335' }
              ]} />
              <Text style={styles.connectionText}>
                {realTimeService.getConnectionStatus().isConnected ? 'Live' : 'Offline'}
              </Text>
            </View>
          </View>
        </View>

        {/* Promo */}
        <View style={styles.promoSection}>
          <TouchableOpacity style={styles.promoButton} onPress={() => setUsePromo(!usePromo)}>
            <MaterialIcon 
              name={usePromo ? "check-circle" : "radio-button-unchecked"} 
              size={20} 
              color={usePromo ? "#06C167" : "#999"} 
            />
            <Text style={styles.promoText}>
              {usePromo ? '20% promo applied' : 'Apply 20% promo'}
            </Text>
            {usePromo && (
              <Text style={styles.promoCodeText}> ({promoCode})</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Ride Options */}
        <View style={styles.rideOptionsSection}>
          <Text style={styles.sectionTitle}>Choose your ride</Text>
          {loading ? (
            <ActivityIndicator size="large" color="#06C167" style={styles.loader} />
          ) : (
            rideOptions.map((ride) => {
              const price = calculatePrice(ride);
              const isSelected = selectedRide === ride.id;
              const driverCount = ride.availableDrivers || 0;
              const isAvailable = ride.isAvailable !== false;
              const surgeMultiplier = ridePrices[ride.id];
              const hasSurge = surgeMultiplier && surgeMultiplier > 1.1;
              
              return (
                <TouchableOpacity 
                  key={ride.id} 
                  style={[
                    styles.rideOption, 
                    isSelected && styles.rideOptionSelected,
                    !isAvailable && styles.rideOptionUnavailable
                  ]} 
                  onPress={() => isAvailable && handleSelectRide(ride)}
                  disabled={!isAvailable}
                >
                  <View style={styles.rideIconContainer}>
                    <FontAwesome5 
                      name={ride.icon} 
                      size={22} 
                      color={isSelected ? '#FFF' : ride.color} 
                    />
                  </View>
                  <View style={styles.rideInfo}>
                    <View style={styles.rideHeader}>
                      <Text style={[styles.rideName, isSelected && styles.rideNameSelected]}>
                        {ride.name}
                      </Text>
                      <View style={styles.rideMeta}>
                        <MaterialIcon name="access-time" size={14} color="#666" />
                        <Text style={styles.rideMetaText}>{ride.time}</Text>
                        <MaterialIcon name="people" size={14} color="#666" style={styles.metaIcon} />
                        <Text style={styles.rideMetaText}>{ride.seats}</Text>
                      </View>
                    </View>
                    <Text style={[styles.rideDescription, isSelected && styles.rideDescriptionSelected]}>
                      {ride.description}
                    </Text>
                    
                    {/* Driver availability indicator */}
                    <View style={styles.availabilityInfo}>
                      {driverCount > 0 ? (
                        <View style={styles.availabilityItem}>
                          <MaterialIcon name="check-circle" size={14} color="#34A853" />
                          <Text style={styles.availabilityText}>
                            {driverCount} {driverCount === 1 ? 'driver' : 'drivers'} nearby
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.availabilityItem}>
                          <MaterialIcon name="error-outline" size={14} color="#EA4335" />
                          <Text style={styles.unavailableText}>No drivers available</Text>
                        </View>
                      )}
                      
                      {hasSurge && (
                        <View style={styles.surgeIndicator}>
                          <MaterialIcon name="flash-on" size={12} color="#FFF" />
                          <Text style={styles.surgeText}>{surgeMultiplier.toFixed(1)}x</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={styles.priceContainer}>
                    <Text style={[styles.price, isSelected && styles.priceSelected]}>
                      {formatMK(price)}
                    </Text>
                    {usePromo && (
                      <Text style={styles.originalPrice}>
                        {formatMK(Math.round(ride.basePrice * ride.multiplier * (surgeMultiplier || 1)))}
                      </Text>
                    )}
                    {hasSurge && (
                      <Text style={styles.surgeNote}>Surge pricing</Text>
                    )}
                  </View>
                  {isSelected && (
                    <View style={styles.selectedIndicator}>
                      <MaterialIcon name="check" size={20} color="#FFF" />
                    </View>
                  )}
                  {!isAvailable && (
                    <View style={styles.unavailableOverlay} />
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Payment */}
        <View style={styles.paymentSection}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <TouchableOpacity style={styles.paymentOption} onPress={() => setPaymentMethod('cash')}>
            <MaterialIcon 
              name={paymentMethod === 'cash' ? "radio-button-checked" : "radio-button-unchecked"} 
              size={20} 
              color={paymentMethod === 'cash' ? "#06C167" : "#999"} 
            />
            <Text style={styles.paymentText}>Cash</Text>
          </TouchableOpacity>
          
          {/* Additional payment options can be added here */}
          <TouchableOpacity style={styles.paymentOption} onPress={() => setPaymentMethod('card')}>
            <MaterialIcon 
              name={paymentMethod === 'card' ? "radio-button-checked" : "radio-button-unchecked"} 
              size={20} 
              color={paymentMethod === 'card' ? "#06C167" : "#999"} 
            />
            <MaterialIcon name="credit-card" size={18} color="#666" style={styles.paymentIcon} />
            <Text style={styles.paymentText}>Card</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.paymentOption} onPress={() => setPaymentMethod('mobile')}>
            <MaterialIcon 
              name={paymentMethod === 'mobile' ? "radio-button-checked" : "radio-button-unchecked"} 
              size={20} 
              color={paymentMethod === 'mobile' ? "#06C167" : "#999"} 
            />
            <MaterialIcon name="smartphone" size={18} color="#666" style={styles.paymentIcon} />
            <Text style={styles.paymentText}>Mobile Money</Text>
          </TouchableOpacity>
        </View>

        {/* Schedule */}
        {scheduleLater && (
          <View style={styles.scheduleSection}>
            <TouchableOpacity style={styles.scheduleButton}>
              <MaterialIcon name="schedule" size={20} color="#000" />
              <Text style={styles.scheduleText}>Schedule a ride</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>

      {/* Confirm Button */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[
            styles.confirmButton, 
            (!selectedRide || loading) && styles.confirmButtonDisabled
          ]} 
          onPress={handleConfirmRide} 
          disabled={!selectedRide || loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={styles.confirmButtonText}>
              {selectedRide 
                ? `Select ${rideOptions.find(r => r.id === selectedRide)?.name} - ${formatMK(calculatePrice(rideOptions.find(r => r.id === selectedRide)))}`
                : 'Select a ride'}
            </Text>
          )}
        </TouchableOpacity>
        
        {selectedRide && nearbyDrivers.length > 0 && (
          <Text style={styles.driverNote}>
            {rideOptions.find(r => r.id === selectedRide)?.availableDrivers || 0} drivers available in your area
          </Text>
        )}
        
        {/* Socket status indicator */}
        <View style={styles.socketStatus}>
          <Text style={styles.socketStatusText}>
            Status: {realTimeService.getConnectionStatus().isConnected ? 'Connected ✓' : 'Connecting...'}
          </Text>
        </View>
      </View>
    </View>
  );
}

// Updated styles with real-time features - ADD NEW STYLES
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F6F3' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingTop: Platform.OS === 'ios' ? 60 : 40, 
    paddingBottom: 16, 
    backgroundColor: '#FFFFFF', 
    borderBottomWidth: 1, 
    borderBottomColor: '#F0F0F0' 
  },
  backButton: { padding: 8, marginRight: 8 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '600', color: '#000' },
  headerSpacer: { width: 40 },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 120 },
  mapContainer: { 
    height: 240, 
    backgroundColor: '#FFFFFF', 
    position: 'relative' 
  },
  map: { width: '100%', height: '100%' },
  marker: { 
    width: 32, 
    height: 32, 
    borderRadius: 16, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 2, 
    borderColor: '#FFF',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  pickupMarker: { backgroundColor: '#4285F4' },
  destinationMarker: { backgroundColor: '#EA4335' },
  driverMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
    elevation: 3,
  },
  routeInfo: { 
    position: 'absolute', 
    top: 16, 
    left: 16, 
    right: 16, 
    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
    borderRadius: 12, 
    padding: 16, 
    elevation: 4 
  },
  routePoint: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginVertical: 4,
    justifyContent: 'space-between',
  },
  routeDot: { 
    width: 12, 
    height: 12, 
    borderRadius: 6, 
    backgroundColor: '#4285F4', 
    marginRight: 12 
  },
  routeLine: { 
    width: 2, 
    height: 20, 
    backgroundColor: '#4285F4', 
    marginLeft: 5, 
    marginVertical: 4 
  },
  routeText: { 
    fontSize: 14, 
    color: '#333', 
    flex: 1,
    fontWeight: '500',
  },
  distanceText: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  timeText: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  driverInfo: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 12,
    elevation: 3,
  },
  driverCount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverCountText: {
    fontSize: 12,
    color: '#333',
    marginLeft: 6,
    fontWeight: '500',
  },
  // NEW STYLES FOR CONNECTION STATUS
  connectionStatus: {
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
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  promoSection: { 
    backgroundColor: '#FFFFFF', 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    marginTop: 8 
  },
  promoButton: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  promoText: { 
    fontSize: 16, 
    color: '#06C167', 
    fontWeight: '500', 
    marginLeft: 12 
  },
  promoCodeText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  rideOptionsSection: { 
    backgroundColor: '#FFFFFF', 
    marginTop: 8, 
    paddingHorizontal: 16, 
    paddingTop: 20 
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: '#000', 
    marginBottom: 16 
  },
  loader: {
    paddingVertical: 40,
  },
  rideOption: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F8F9FA', 
    borderRadius: 12, 
    padding: 16, 
    marginBottom: 12, 
    borderWidth: 2, 
    borderColor: 'transparent',
    position: 'relative',
  },
  rideOptionSelected: { 
    backgroundColor: '#4285F4', 
    borderColor: '#4285F4' 
  },
  rideOptionUnavailable: {
    opacity: 0.6,
  },
  rideIconContainer: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    backgroundColor: '#FFF', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 16, 
    borderWidth: 1, 
    borderColor: '#E0E0E0' 
  },
  rideInfo: { 
    flex: 1 
  },
  rideHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 4 
  },
  rideName: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#000' 
  },
  rideNameSelected: { 
    color: '#FFF' 
  },
  rideMeta: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  rideMetaText: { 
    fontSize: 12, 
    color: '#666', 
    marginLeft: 4 
  },
  metaIcon: { 
    marginLeft: 12 
  },
  rideDescription: { 
    fontSize: 14, 
    color: '#666',
    marginBottom: 8,
  },
  rideDescriptionSelected: { 
    color: 'rgba(255, 255, 255, 0.9)' 
  },
  availabilityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  availabilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  availabilityText: {
    fontSize: 12,
    color: '#34A853',
    marginLeft: 4,
    fontWeight: '500',
  },
  unavailableText: {
    fontSize: 12,
    color: '#EA4335',
    marginLeft: 4,
    fontWeight: '500',
  },
  surgeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FBBC05',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  surgeText: {
    fontSize: 10,
    color: '#FFF',
    fontWeight: 'bold',
    marginLeft: 2,
  },
  priceContainer: { 
    alignItems: 'flex-end', 
    marginLeft: 12 
  },
  price: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#000' 
  },
  priceSelected: { 
    color: '#FFF' 
  },
  originalPrice: { 
    fontSize: 14, 
    color: '#999', 
    textDecorationLine: 'line-through', 
    marginTop: 2 
  },
  surgeNote: {
    fontSize: 10,
    color: '#FBBC05',
    fontWeight: 'bold',
    marginTop: 2,
  },
  selectedIndicator: { 
    position: 'absolute', 
    top: -8, 
    right: -8, 
    width: 24, 
    height: 24, 
    borderRadius: 12, 
    backgroundColor: '#06C167', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  unavailableOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 12,
  },
  paymentSection: { 
    backgroundColor: '#FFFFFF', 
    marginTop: 8, 
    paddingHorizontal: 16, 
    paddingVertical: 20 
  },
  paymentOption: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 8,
    paddingVertical: 8,
  },
  paymentText: { 
    fontSize: 16, 
    color: '#000', 
    marginLeft: 12 
  },
  paymentIcon: {
    marginLeft: 8,
    marginRight: 8,
  },
  scheduleSection: { 
    backgroundColor: '#FFFFFF', 
    marginTop: 8, 
    paddingHorizontal: 16, 
    paddingVertical: 20 
  },
  scheduleButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 16, 
    borderWidth: 1, 
    borderColor: '#E0E0E0', 
    borderRadius: 12 
  },
  scheduleText: { 
    fontSize: 16, 
    color: '#000', 
    fontWeight: '500', 
    marginLeft: 12 
  },
  footer: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    backgroundColor: '#FFFFFF', 
    paddingHorizontal: 16, 
    paddingVertical: 16, 
    borderTopWidth: 1, 
    borderTopColor: '#E0E0E0' 
  },
  confirmButton: { 
    backgroundColor: '#06C167', 
    borderRadius: 12, 
    paddingVertical: 16, 
    alignItems: 'center' 
  },
  confirmButtonDisabled: { 
    backgroundColor: '#E0E0E0' 
  },
  confirmButtonText: { 
    fontSize: 18, 
    color: '#FFF', 
    fontWeight: 'bold' 
  },
  driverNote: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  // NEW STYLES FOR SOCKET STATUS
  socketStatus: {
    alignItems: 'center',
    marginTop: 8,
  },
  socketStatusText: {
    fontSize: 10,
    color: '#666',
    fontStyle: 'italic',
  },
});