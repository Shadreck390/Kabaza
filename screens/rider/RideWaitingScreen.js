// screens/rider/RideWaitingScreen.js
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
  Easing
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import realTimeService from '@services/socket/realtimeUpdates';

const windowDimensions = Dimensions.get('window') || { width: 375, height: 667 };
const { width, height } = windowDimensions;;

export default function RideWaitingScreen({ route, navigation }) {
  const { 
    rideId, 
    rideData, 
    pickup, 
    destination, 
    paymentMethod,
    pickupCoords,
    destinationCoords,
    riderInfo 
  } = route.params || {};
  
  const [status, setStatus] = useState('searching'); // searching, matched, accepted, enroute, arrived
  const [driver, setDriver] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [estimatedArrival, setEstimatedArrival] = useState(rideData?.estimatedTime || '5-10 min');
  const [timer, setTimer] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [driverPath, setDriverPath] = useState([]);
  const [showDriverInfo, setShowDriverInfo] = useState(false);
  const [searchingAnimation] = useState(new Animated.Value(0));
  const [mapRegion, setMapRegion] = useState({
    latitude: -13.9626,
    longitude: 33.7741,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  const mapRef = useRef(null);

  // Animation for searching state
  useEffect(() => {
    if (status === 'searching') {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(searchingAnimation, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(searchingAnimation, {
            toValue: 0,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();
      return () => pulseAnimation.stop();
    }
  }, [status, searchingAnimation]);

  useEffect(() => {
    // Check initial connection status
    const status = realTimeService.getConnectionStatus();
    setConnectionStatus(status.isConnected ? 'connected' : 'disconnected');
    
    // Listen for connection changes
    realTimeService.addConnectionListener((connected) => {
      setConnectionStatus(connected ? 'connected' : 'disconnected');
      
      if (connected && status === 'disconnected') {
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

    // Update map region based on pickup coordinates
    if (pickupCoords) {
      setMapRegion({
        ...pickupCoords,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    }

    return () => {
      // Cleanup all subscriptions
      cleanupFunctions.forEach(cleanup => cleanup && cleanup());
      clearInterval(timerInterval);
      realTimeService.removeConnectionListener();
    };
  }, []);

  const setupSubscriptions = () => {
    const cleanupFunctions = [];

    // 1. Subscribe to ride updates
    const unsubscribeRide = realTimeService.subscribeToRideUpdates(
      rideId,
      handleRideUpdate
    );
    cleanupFunctions.push(unsubscribeRide);

    // 2. Subscribe to SOS responses
    const unsubscribeSOS = realTimeService.subscribeToSOSResponse(
      rideId,
      handleSOSResponse
    );
    cleanupFunctions.push(unsubscribeSOS);

    // 3. Subscribe to driver location updates (if we already have driver info)
    if (driver?.id) {
      const unsubscribeDriverLocation = realTimeService.subscribeToDriverLocation(
        driver.id,
        rideId,
        handleDriverLocationUpdate
      );
      cleanupFunctions.push(unsubscribeDriverLocation);
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
      
      // Update estimated arrival
      if (update.estimatedArrival) {
        setEstimatedArrival(update.estimatedArrival);
      }
      
      // Subscribe to driver location updates
      if (driverData?.id) {
        const unsubscribe = realTimeService.subscribeToDriverLocation(
          driverData.id,
          rideId,
          handleDriverLocationUpdate
        );
        
        // Request initial driver location
        realTimeService.updateLocation(driverData.id, pickupCoords || mapRegion, true, rideId);
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
          rideId,
          driver: driver || update.driver,
          pickup,
          destination,
          pickupCoords,
          destinationCoords,
          paymentMethod,
          rideData,
          riderInfo
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

  const handleDriverLocationUpdate = (location) => {
    console.log('📍 Driver location update:', location);
    
    setDriverLocation({
      latitude: location.latitude,
      longitude: location.longitude,
      bearing: location.bearing || 0
    });
    
    // Update driver path for trail
    setDriverPath(prev => {
      const newPath = [...prev, { latitude: location.latitude, longitude: location.longitude }];
      // Keep only last 10 locations for performance
      return newPath.slice(-10);
    });
    
    // Update map to follow driver if they're enroute
    if (status === 'enroute' && mapRef.current) {
      mapRef.current.animateToCoordinate({
        latitude: location.latitude,
        longitude: location.longitude,
      }, 500);
    }
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

  const handleCancelRide = () => {
    Alert.alert(
      'Cancel Ride Request',
      'Are you sure you want to cancel this ride request?',
      [
        { 
          text: 'No, Keep Searching', 
          style: 'cancel' 
        },
        { 
          text: 'Yes, Cancel', 
          style: 'destructive',
          onPress: () => {
            realTimeService.cancelRideRequest(rideId, 'Cancelled by rider');
            navigation.goBack();
          }
        }
      ]
    );
  };

  const handleSOS = () => {
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
            realTimeService.sendSOSAlert(
              rideId,
              driverLocation || pickupCoords || mapRegion,
              'Emergency assistance requested by rider',
              'emergency'
            );
            
            Alert.alert(
              'SOS Alert Sent',
              'Help is on the way. Stay on the line if possible.',
              [{ text: 'OK' }]
            );
          }
        }
      ]
    );
  };

  const handleChatWithDriver = () => {
    if (driver) {
      navigation.navigate('RideChat', {
        rideId,
        driverId: driver.id,
        driverName: driver.name,
        riderId: riderInfo?.userId,
        riderName: riderInfo?.userName
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
              // Implement phone call functionality
              // Linking.openURL(`tel:${driver.phone}`);
              Alert.alert('Call Function', 'Phone call would be initiated here');
            }
          }
        ]
      );
    } else {
      Alert.alert('No Phone Number', 'Driver phone number is not available.');
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'searching':
        return 'Finding nearby drivers...';
      case 'matched':
        return `Driver ${driver?.name} has been assigned`;
      case 'accepted':
        return `Driver ${driver?.name} accepted your ride`;
      case 'enroute':
        return `${driver?.name} is on the way to you`;
      case 'arrived':
        return `${driver?.name} has arrived!`;
      case 'cancelled':
        return 'Ride was cancelled';
      case 'no_drivers':
        return 'No drivers available';
      default:
        return 'Waiting for driver...';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'searching':
        return 'search';
      case 'matched':
        return 'person-search';
      case 'accepted':
        return 'check-circle';
      case 'enroute':
        return 'directions-car';
      case 'arrived':
        return 'location-on';
      default:
        return 'schedule';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'searching':
        return '#FBBC05';
      case 'matched':
        return '#4285F4';
      case 'accepted':
        return '#34A853';
      case 'enroute':
        return '#06C167';
      case 'arrived':
        return '#EA4335';
      case 'cancelled':
        return '#EA4335';
      default:
        return '#666';
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const searchingScale = searchingAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.2]
  });

  const searchingOpacity = searchingAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.7, 1]
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => {
            if (status === 'searching') {
              handleCancelRide();
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
            { backgroundColor: connectionStatus === 'connected' ? '#06C167' : '#EA4335' }
          ]} />
          <Text style={styles.connectionText}>
            {connectionStatus === 'connected' ? 'Live' : 'Offline'}
          </Text>
        </View>
      </View>

      {/* Map Section */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          region={mapRegion}
          showsUserLocation={true}
          showsMyLocationButton={false}
          zoomEnabled={true}
          scrollEnabled={true}
        >
          {/* Pickup Marker */}
          {pickupCoords && (
            <Marker coordinate={pickupCoords} title="Pickup">
              <View style={styles.pickupMarker}>
                <MaterialIcon name="my-location" size={16} color="#FFF" />
              </View>
            </Marker>
          )}
          
          {/* Destination Marker */}
          {destinationCoords && (
            <Marker coordinate={destinationCoords} title="Destination">
              <View style={styles.destinationMarker}>
                <MaterialIcon name="place" size={16} color="#FFF" />
              </View>
            </Marker>
          )}
          
          {/* Driver Marker */}
          {driverLocation && (
            <Marker 
              coordinate={driverLocation}
              title={driver?.name || 'Driver'}
              description={`ETA: ${estimatedArrival}`}
              anchor={{ x: 0.5, y: 0.5 }}
              rotation={driverLocation.bearing || 0}
            >
              <Animated.View style={[
                styles.driverMarker,
                { transform: [{ scale: status === 'enroute' ? 1 : searchingScale }] }
              ]}>
                <FontAwesome5 
                  name={driver?.vehicleType?.includes('bike') ? 'motorcycle' : 'car'} 
                  size={16} 
                  color="#FFF" 
                />
              </Animated.View>
            </Marker>
          )}
          
          {/* Driver Path (trail) */}
          {driverPath.length > 1 && status === 'enroute' && (
            <Polyline
              coordinates={driverPath}
              strokeColor="#06C167"
              strokeWidth={3}
              lineDashPattern={[0]}
            />
          )}
          
          {/* Route Line from pickup to destination */}
          {pickupCoords && destinationCoords && (
            <Polyline
              coordinates={[pickupCoords, destinationCoords]}
              strokeColor="#4285F4"
              strokeWidth={2}
              lineDashPattern={[5, 5]}
            />
          )}
        </MapView>

        {/* Map Overlay - Status */}
        <View style={styles.mapOverlay}>
          <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]}>
            <MaterialIcon name={getStatusIcon()} size={20} color="#FFF" />
            <Text style={styles.statusIndicatorText}>
              {status.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      {/* Status Card */}
      <Animated.View 
        style={[
          styles.statusCard,
          { opacity: searchingOpacity }
        ]}
      >
        {/* Status Message */}
        <View style={styles.statusMessageContainer}>
          <ActivityIndicator 
            size="large" 
            color={getStatusColor()} 
            animating={status === 'searching'}
          />
          <Text style={styles.statusMessage}>{getStatusMessage()}</Text>
        </View>

        {/* Driver Info (when available) */}
        {showDriverInfo && driver && (
          <View style={styles.driverCard}>
            <View style={styles.driverHeader}>
              <View style={styles.driverAvatar}>
                <Text style={styles.driverInitial}>
                  {driver.name?.charAt(0)?.toUpperCase() || 'D'}
                </Text>
              </View>
              <View style={styles.driverInfo}>
                <Text style={styles.driverName}>{driver.name}</Text>
                <View style={styles.driverMeta}>
                  <View style={styles.ratingContainer}>
                    <MaterialIcon name="star" size={14} color="#FFD700" />
                    <Text style={styles.rating}>{driver.rating || '4.5'}</Text>
                  </View>
                  <Text style={styles.ridesCount}>{driver.totalRides || '100+'} rides</Text>
                </View>
              </View>
              <View style={styles.vehicleInfo}>
                <FontAwesome5 
                  name={driver.vehicleType?.includes('bike') ? 'motorcycle' : 'car'} 
                  size={16} 
                  color="#666" 
                />
                <Text style={styles.vehicleText}>{driver.vehicleModel || 'Vehicle'}</Text>
                <Text style={styles.plateText}>{driver.vehiclePlate || 'BL XXX'}</Text>
              </View>
            </View>
            
            {/* Driver Actions */}
            <View style={styles.driverActions}>
              <TouchableOpacity 
                style={styles.driverActionButton}
                onPress={handleCallDriver}
              >
                <MaterialIcon name="phone" size={20} color="#4285F4" />
                <Text style={styles.driverActionText}>Call</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.driverActionButton}
                onPress={handleChatWithDriver}
              >
                <MaterialIcon name="chat" size={20} color="#34A853" />
                <Text style={styles.driverActionText}>Message</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Ride Details */}
        <View style={styles.rideDetails}>
          <View style={styles.rideDetailRow}>
            <MaterialIcon name="place" size={18} color="#EA4335" />
            <View style={styles.rideDetailText}>
              <Text style={styles.rideDetailLabel}>PICKUP</Text>
              <Text style={styles.rideDetailValue} numberOfLines={2}>{pickup}</Text>
            </View>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.rideDetailRow}>
            <MaterialIcon name="flag" size={18} color="#34A853" />
            <View style={styles.rideDetailText}>
              <Text style={styles.rideDetailLabel}>DESTINATION</Text>
              <Text style={styles.rideDetailValue} numberOfLines={2}>{destination}</Text>
            </View>
          </View>
        </View>

        {/* Estimated Arrival & Fare */}
        <View style={styles.arrivalInfo}>
          <View style={styles.arrivalItem}>
            <MaterialIcon name="access-time" size={18} color="#666" />
            <Text style={styles.arrivalLabel}>Est. arrival</Text>
            <Text style={styles.arrivalValue}>{estimatedArrival}</Text>
          </View>
          
          <View style={styles.arrivalItem}>
            <MaterialIcon name="attach-money" size={18} color="#666" />
            <Text style={styles.arrivalLabel}>Fare</Text>
            <Text style={styles.arrivalValue}>
              {rideData?.formattedPrice || 'Calculating...'}
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[
            styles.cancelButton,
            status !== 'searching' && { backgroundColor: '#FFF' }
          ]} 
          onPress={handleCancelRide}
        >
          <MaterialIcon 
            name="close" 
            size={20} 
            color={status === 'searching' ? '#666' : '#EA4335'} 
          />
          <Text style={[
            styles.cancelButtonText,
            status !== 'searching' && { color: '#EA4335' }
          ]}>
            {status === 'searching' ? 'Cancel Search' : 'Cancel Ride'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.sosButton} 
          onPress={handleSOS}
        >
          <MaterialIcon name="emergency" size={24} color="#FFF" />
          <Text style={styles.sosButtonText}>SOS</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F7F6F3' 
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
  backButton: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
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
  },
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
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  statusIndicatorText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 8,
  },
  pickupMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4285F4',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
    elevation: 4,
  },
  destinationMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EA4335',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
    elevation: 4,
  },
  driverMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#06C167',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  statusCard: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    marginTop: -20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  statusMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusMessage: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginLeft: 12,
    flex: 1,
  },
  driverCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  driverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  driverAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#06C167',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  driverInitial: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  driverMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  rating: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  ridesCount: {
    fontSize: 12,
    color: '#999',
  },
  vehicleInfo: {
    alignItems: 'flex-end',
  },
  vehicleText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  plateText: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  driverActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 12,
  },
  driverActionButton: {
    alignItems: 'center',
    padding: 8,
    flex: 1,
  },
  driverActionText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  rideDetails: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  rideDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  rideDetailText: {
    flex: 1,
    marginLeft: 12,
  },
  rideDetailLabel: {
    fontSize: 10,
    color: '#666',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  rideDetailValue: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 12,
    marginLeft: 30,
  },
  arrivalInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  arrivalItem: {
    alignItems: 'center',
    flex: 1,
  },
  arrivalLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  arrivalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    backgroundColor: '#FFF',
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginLeft: 8,
  },
  sosButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: '#EA4335',
    borderRadius: 12,
    marginLeft: 8,
    elevation: 3,
    shadowColor: '#EA4335',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  sosButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginLeft: 8,
  },
});