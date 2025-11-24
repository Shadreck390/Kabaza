// components/MapComponent.js
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity,
  Text,
  Alert,
  Platform,
  ActivityIndicator // ✅ ADDED
} from 'react-native';
import MapView, { 
  Marker, 
  Polyline, 
  Circle,
  PROVIDER_GOOGLE,
  Callout 
} from 'react-native-maps';
import Icon from 'react-native-vector-icons/FontAwesome';
import Geolocation from 'react-native-geolocation-service';

const MapComponent = ({ 
  region, 
  setRegion, 
  rides = [], 
  selectedRideId, 
  onSelectRide,
  onRideBook,
  userLocationColor = "#4CAF50",
  showUserLocation = true,
  showControls = true,
  showRideDetails = true,
  currentBooking = null,
  driverLocation = null,
  routeCoordinates = [],
  onRegionChangeComplete,
  style,
  testID,
  ...props 
}) => {
  const mapRef = useRef(null);
  const [userLocation, setUserLocation] = useState(null);
  const [isFollowingUser, setIsFollowingUser] = useState(true);
  const [mapReady, setMapReady] = useState(false);

  // Animate to region when it changes
  useEffect(() => {
    if (region && mapRef.current && mapReady) {
      mapRef.current.animateToRegion(region, 1000);
    }
  }, [region, mapReady]);

  // Get current user location
  const getCurrentLocation = useCallback(() => {
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newLocation = { latitude, longitude };
        setUserLocation(newLocation);
        
        if (isFollowingUser) {
          const newRegion = {
            ...newLocation,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          };
          setRegion(newRegion);
          mapRef.current?.animateToRegion(newRegion, 1000);
        }
      },
      (error) => {
        console.log('Error getting current location:', error);
        Alert.alert('Location Error', 'Unable to get your current location');
      },
      { 
        enableHighAccuracy: true, 
        timeout: 15000, 
        maximumAge: 10000 
      }
    );
  }, [isFollowingUser, setRegion]);

  // Center map on user location
  const centerOnUserLocation = () => {
    if (userLocation) {
      const newRegion = {
        ...userLocation,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 1000);
      setIsFollowingUser(true);
    } else {
      getCurrentLocation();
    }
  };

  // Handle map ready
  const handleMapReady = () => {
    setMapReady(true);
    getCurrentLocation();
  };

  // Handle marker press
  const handleMarkerPress = (ride) => {
    if (onSelectRide) {
      onSelectRide(ride);
    }
    
    // Center map on selected ride
    if (ride.pickupLocation) {
      const newRegion = {
        ...ride.pickupLocation,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      mapRef.current?.animateToRegion(newRegion, 1000);
      setIsFollowingUser(false);
    }
  };

  // Handle region change
  const handleRegionChangeComplete = (newRegion) => {
    if (onRegionChangeComplete) {
      onRegionChangeComplete(newRegion);
    }
    // Stop following user if they manually move the map
    if (isFollowingUser) {
      setIsFollowingUser(false);
    }
  };

  // Render user location marker
  const renderUserLocation = () => {
    if (!userLocation || !showUserLocation) return null;

    return (
      <View>
        {/* Accuracy circle */}
        <Circle
          center={userLocation}
          radius={100} // 100 meters
          fillColor="rgba(76, 175, 80, 0.1)"
          strokeColor="rgba(76, 175, 80, 0.3)"
          strokeWidth={1}
        />
        {/* User location marker */}
        <Marker
          coordinate={userLocation}
          title="Your Location"
          description="You are here"
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <View style={styles.userLocationMarker}>
            <View style={[styles.userLocationPulse, { backgroundColor: userLocationColor }]} />
            <View style={[styles.userLocationInner, { backgroundColor: userLocationColor }]} />
          </View>
        </Marker>
      </View>
    );
  };

  // Render ride markers
  const renderRideMarkers = () => {
    return rides.map((ride) => {
      if (!ride.pickupLocation) return null;

      const isSelected = ride.id === selectedRideId;
      
      return (
        <Marker
          key={ride.id}
          coordinate={ride.pickupLocation}
          title={ride.pickupName || 'Pickup Location'}
          description={`${ride.driverName} - MWK ${ride.amount}`}
          onPress={() => handleMarkerPress(ride)}
          anchor={{ x: 0.5, y: 1 }}
        >
          <View style={[
            styles.rideMarker,
            isSelected && styles.selectedRideMarker
          ]}>
            <View style={[
              styles.rideMarkerPin,
              isSelected && styles.selectedRideMarkerPin
            ]}>
              <Text style={styles.rideMarkerText}>
                MWK {ride.amount}
              </Text>
            </View>
            <View style={[
              styles.rideMarkerPoint,
              isSelected && styles.selectedRideMarkerPoint
            ]} />
          </View>
          
          {showRideDetails && (
            <Callout tooltip={true}>
              <View style={styles.calloutContainer}>
                <Text style={styles.calloutTitle}>{ride.pickupName}</Text>
                <Text style={styles.calloutDriver}>Driver: {ride.driverName}</Text>
                <Text style={styles.calloutAmount}>MWK {ride.amount}</Text>
                {ride.estimatedTime && (
                  <Text style={styles.calloutTime}>ETA: {ride.estimatedTime}</Text>
                )}
                {onRideBook && (
                  <TouchableOpacity 
                    style={styles.bookButton}
                    onPress={() => onRideBook(ride)}
                  >
                    <Text style={styles.bookButtonText}>Book Ride</Text>
                  </TouchableOpacity>
                )}
              </View>
            </Callout>
          )}
        </Marker>
      );
    });
  };

  // Render driver location for active booking
  const renderDriverLocation = () => {
    if (!driverLocation || !currentBooking) return null;

    return (
      <Marker
        coordinate={driverLocation}
        title="Your Driver"
        description={`${currentBooking.driverName} is on the way`}
        anchor={{ x: 0.5, y: 0.5 }}
      >
        <View style={styles.driverMarker}>
          <Icon name="motorcycle" size={24} color="#1E40AF" />
          <View style={styles.driverPulse} />
        </View>
      </Marker>
    );
  };

  // Render route polyline
  const renderRoute = () => {
    if (routeCoordinates.length < 2) return null;

    return (
      <Polyline
        coordinates={routeCoordinates}
        strokeColor="#6c3"
        strokeWidth={4}
        lineCap="round"
        lineJoin="round"
      />
    );
  };

  // Render map controls
  const renderControls = () => {
    if (!showControls) return null;

    return (
      <View style={styles.controlsContainer}>
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={centerOnUserLocation}
        >
          <Icon 
            name="crosshairs" 
            size={20} 
            color={isFollowingUser ? "#6c3" : "#666"} 
          />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={getCurrentLocation}
        >
          <Icon name="refresh" size={18} color="#666" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, style]} testID={testID}>
      {/* ✅ ADDED: Conditional rendering for map loading */}
      {region ? (
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          region={region}
          showsUserLocation={false} // We're using custom user location marker
          showsMyLocationButton={false}
          showsCompass={true}
          showsScale={true}
          showsTraffic={false}
          showsBuildings={true}
          onMapReady={handleMapReady}
          onRegionChangeComplete={handleRegionChangeComplete}
          mapType="standard"
          customMapStyle={mapStyle}
          {...props}
        >
          {renderUserLocation()}
          {renderRideMarkers()}
          {renderDriverLocation()}
          {renderRoute()}
        </MapView>
      ) : (
        <View style={styles.mapLoading}>
          <Text>Loading map...</Text>
          <ActivityIndicator size="large" color="#6c3" />
        </View>
      )}
      
      {renderControls()}
      
      {/* Current booking info */}
      {currentBooking && (
        <View style={styles.bookingInfo}>
          <Text style={styles.bookingTitle}>Active Ride</Text>
          <Text style={styles.bookingDriver}>Driver: {currentBooking.driverName}</Text>
          <Text style={styles.bookingVehicle}>
            {currentBooking.vehicleColor} {currentBooking.vehicleType} • {currentBooking.vehiclePlate}
          </Text>
          {driverLocation && (
            <Text style={styles.bookingStatus}>Driver is on the way</Text>
          )}
        </View>
      )}
    </View>
  );
};

// Custom map styling for better UX
const mapStyle = [
  {
    "elementType": "geometry",
    "stylers": [{ "color": "#f5f5f5" }]
  },
  {
    "elementType": "labels.icon",
    "stylers": [{ "visibility": "off" }]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#616161" }]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [{ "color": "#f5f5f5" }]
  },
  {
    "featureType": "administrative.land_parcel",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#bdbdbd" }]
  },
  {
    "featureType": "poi",
    "elementType": "geometry",
    "stylers": [{ "color": "#eeeeee" }]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#757575" }]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [{ "color": "#ffffff" }]
  },
  {
    "featureType": "road.arterial",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#757575" }]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [{ "color": "#dadada" }]
  },
  {
    "featureType": "road.highway",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#616161" }]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [{ "color": "#c9c9c9" }]
  }
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  // ✅ ADDED: Map loading style
  mapLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  // User Location Marker
  userLocationMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  userLocationPulse: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    opacity: 0.4,
  },
  userLocationInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#fff',
  },
  // Ride Markers
  rideMarker: {
    alignItems: 'center',
  },
  selectedRideMarker: {
    zIndex: 1000,
  },
  rideMarkerPin: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  selectedRideMarkerPin: {
    backgroundColor: '#F59E0B',
    transform: [{ scale: 1.1 }],
  },
  rideMarkerText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  rideMarkerPoint: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#EF4444',
    marginTop: -1,
  },
  selectedRideMarkerPoint: {
    borderBottomColor: '#F59E0B',
  },
  // Callout Styles
  calloutContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    width: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  calloutDriver: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  calloutAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 4,
  },
  calloutTime: {
    fontSize: 11,
    color: '#666',
    marginBottom: 8,
  },
  bookButton: {
    backgroundColor: '#6c3',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Driver Marker
  driverMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverPulse: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(30, 64, 175, 0.2)',
    zIndex: -1,
  },
  // Controls
  controlsContainer: {
    position: 'absolute',
    top: 20,
    right: 16,
    gap: 12,
  },
  controlButton: {
    backgroundColor: '#fff',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  // Booking Info
  bookingInfo: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  bookingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  bookingDriver: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  bookingVehicle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  bookingStatus: {
    fontSize: 12,
    color: '#6c3',
    fontWeight: '500',
  },
});

export default MapComponent;