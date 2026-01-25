import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert,
  ActivityIndicator,
  Platform
} from 'react-native';
import MapView, {
  Marker,
  Polyline,
  Circle,
  PROVIDER_GOOGLE,
  Callout
} from 'react-native-maps';
import Icon from 'react-native-vector-icons/FontAwesome';

// ✅ Safe imports with fallbacks
let config = {};
try {
  const configModule = require('@config');
  config = configModule.default || configModule || {};
  console.log('✅ Config loaded:', Object.keys(config));
} catch (error) {
  console.warn('⚠️ Config not found at @config, using defaults');
  config = {};
}

let constants = {};
try {
  const constantsModule = require('@src/store/constants');
  constants = constantsModule.default || constantsModule || {};
} catch (error) {
  console.warn('⚠️ Store constants not found, using defaults');
  constants = {};
}

// ✅ Safe constants with fallbacks
const GOOGLE_MAPS_API_KEY = config.MAPS?.API_KEY || '';
const ANIMATION_DURATION = config.UI_CONSTANTS?.ANIMATION?.DURATION?.NORMAL || 500;

// ✅ Hardcoded UI constants as fallback
const UI_CONSTANTS = {
  SPACING: {
    XS: 4,
    SM: 8,
    MD: 16,
    LG: 24,
    XL: 32,
  },
  BORDER_RADIUS: {
    SM: 4,
    MD: 8,
    LG: 12,
    XL: 16,
  },
  SHADOW: {
    SM: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.18,
      shadowRadius: 1.0,
      elevation: 1,
    },
    MD: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    LG: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.30,
      shadowRadius: 4.65,
      elevation: 8,
    },
  },
};

// Use config UI constants if available, otherwise use fallback
const ui = config.UI_CONSTANTS || UI_CONSTANTS;

const DEFAULT_DELTA = {
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

const GEOLOCATION_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 10000,
  distanceFilter: 50,
};

// ✅ Always allow map to render (API key is in native files)
const hasGoogleMapsKey = true;

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
  onRegionChangeComplete,
  style,
  testID,
  ...props 
}) => {
  const mapRef = useRef(null);
  const [userLocation, setUserLocation] = useState(null);
  const [isFollowingUser, setIsFollowingUser] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [eta, setEta] = useState(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  // ✅ Debounce function for performance
  const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  // ✅ Center map on user location with debouncing
  const centerOnUserLocation = useCallback(
    debounce(() => {
      if (userLocation && mapRef.current && mapReady) {
        const newRegion = {
          ...userLocation,
          ...DEFAULT_DELTA,
        };
        setRegion?.(newRegion);
        mapRef.current.animateToRegion(newRegion, ANIMATION_DURATION);
        setIsFollowingUser(true);
      }
    }, 300),
    [userLocation, mapReady, setRegion]
  );

  // ✅ Handle map ready
  const handleMapReady = useCallback(() => {
    setMapReady(true);
    
    // ✅ Request location after map is ready
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const newLocation = { latitude, longitude };
          setUserLocation(newLocation);
          
          const newRegion = {
            ...newLocation,
            ...DEFAULT_DELTA,
          };
          setRegion?.(newRegion);
          
          // Log location in development
          if (config.ENV?.DEBUG) {
            console.log('📍 User location acquired:', newLocation);
          }
        },
        (error) => {
          console.warn('Geolocation error:', error);
          
          // Use default location from config or fallback
          const defaultLocation = {
            latitude: constants.MAP_CONSTANTS?.DEFAULT_LATITUDE || -1.939,
            longitude: constants.MAP_CONSTANTS?.DEFAULT_LONGITUDE || 30.044,
          };
          
          setRegion?.({
            latitude: defaultLocation.latitude,
            longitude: defaultLocation.longitude,
            ...DEFAULT_DELTA,
          });
          
          // Show error in development
          if (config.ENV?.DEBUG) {
            Alert.alert(
              'Location Error',
              'Unable to get your location. Using default location.',
              [{ text: 'OK' }]
            );
          }
        },
        GEOLOCATION_OPTIONS
      );
    } else {
      console.warn('Geolocation not supported');
      // Use default location
      const defaultLocation = {
        latitude: -1.939,
        longitude: 30.044,
      };
      
      setRegion?.({
        latitude: defaultLocation.latitude,
        longitude: defaultLocation.longitude,
        ...DEFAULT_DELTA,
      });
    }
  }, [setRegion]);

  // ✅ Handle marker press
  const handleMarkerPress = useCallback((ride) => {
    if (onSelectRide) {
      onSelectRide(ride);
    }
    
    // Center map on selected ride
    if (ride.pickupLocation && mapRef.current) {
      const newRegion = {
        ...ride.pickupLocation,
        ...DEFAULT_DELTA,
      };
      mapRef.current.animateToRegion(newRegion, ANIMATION_DURATION);
      setIsFollowingUser(false);
    }
  }, [onSelectRide]);

  // ✅ Handle region change with debouncing
  const handleRegionChangeComplete = useCallback(
    debounce((newRegion) => {
      if (onRegionChangeComplete) {
        onRegionChangeComplete(newRegion);
      }
      if (isFollowingUser) {
        setIsFollowingUser(false);
      }
    }, 300),
    [onRegionChangeComplete, isFollowingUser]
  );

  // ✅ Simplified route fetching without external API (for now)
  const calculateRoute = useCallback((origin, destination) => {
    if (!origin || !destination) return;
    
    setIsLoadingRoute(true);
    
    // Simple straight line for demo (replace with actual API later)
    const points = [
      { latitude: origin.latitude, longitude: origin.longitude },
      { latitude: destination.latitude, longitude: destination.longitude }
    ];
    
    setRouteCoordinates(points);
    
    // Calculate approximate ETA (1 min per km)
    const distance = calculateDistance(origin, destination);
    const minutes = Math.ceil(distance / 1000); // 1 min per km
    setEta(`${minutes} min`);
    
    setIsLoadingRoute(false);
  }, []);

  // ✅ Helper: Calculate distance between two coordinates
  const calculateDistance = (coord1, coord2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = coord1.latitude * Math.PI/180;
    const φ2 = coord2.latitude * Math.PI/180;
    const Δφ = (coord2.latitude - coord1.latitude) * Math.PI/180;
    const Δλ = (coord2.longitude - coord1.longitude) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  };

  // ✅ Update route when driver or user moves
  useEffect(() => {
    if (userLocation && driverLocation && currentBooking) {
      calculateRoute(driverLocation, userLocation);
    } else {
      setRouteCoordinates([]);
      setEta(null);
    }
  }, [userLocation, driverLocation, currentBooking, calculateRoute]);

  // ✅ Log config status on mount
  useEffect(() => {
    if (config.ENV?.DEBUG) {
      console.log('🗺️ MapComponent mounted with config:', {
        hasApiKey: hasGoogleMapsKey,
        apiKeyLength: GOOGLE_MAPS_API_KEY?.length || 0,
        environment: config.ENV?.NAME || 'development',
        debugMode: config.ENV?.DEBUG || false,
        uiConstantsAvailable: !!config.UI_CONSTANTS,
      });
    }
  }, []);

  // ✅ User location marker component
  const UserLocationMarker = useMemo(() => {
    if (!userLocation || !showUserLocation) return null;
    
    return (
      <React.Fragment key="user-location">
        <Circle
          center={userLocation}
          radius={100}
          fillColor="rgba(76, 175, 80, 0.1)"
          strokeColor="rgba(76, 175, 80, 0.3)"
          strokeWidth={1}
        />
        <Marker 
          coordinate={userLocation} 
          title="Your Location" 
          description="You are here" 
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={false}
        >
          <View style={styles.userLocationMarker}>
            <View style={[styles.userLocationInner, { backgroundColor: userLocationColor }]} />
            <View style={styles.userLocationCenter} />
          </View>
        </Marker>
      </React.Fragment>
    );
  }, [userLocation, showUserLocation, userLocationColor]);

  // ✅ Ride markers component (optimized)
  const RideMarkers = useMemo(() => {
    return rides
      .filter(ride => ride.pickupLocation)
      .map((ride) => {
        const isSelected = ride.id === selectedRideId;
        
        return (
          <Marker
            key={`ride-${ride.id}`}
            coordinate={ride.pickupLocation}
            title={ride.pickupName || 'Pickup Location'}
            description={`${ride.driverName || 'Driver'} - MWK ${ride.amount || '0'}`}
            onPress={() => handleMarkerPress(ride)}
            anchor={{ x: 0.5, y: 1 }}
            tracksViewChanges={false}
          >
            <View style={[styles.rideMarkerContainer, isSelected && styles.selectedRide]}>
              <View style={styles.rideMarker}>
                <Text style={styles.rideMarkerText}>
                  {ride.amount ? `MWK ${ride.amount}` : 'Ride'}
                </Text>
              </View>
              <View style={styles.rideMarkerPointer} />
            </View>
            
            {showRideDetails && (
              <Callout tooltip={true}>
                <View style={styles.calloutContainer}>
                  <Text style={styles.calloutTitle}>
                    {ride.pickupName || 'Pickup Location'}
                  </Text>
                  {ride.driverName && (
                    <Text style={styles.calloutSubtitle}>
                      Driver: {ride.driverName}
                    </Text>
                  )}
                  {ride.amount && (
                    <Text style={styles.calloutAmount}>
                      MWK {ride.amount}
                    </Text>
                  )}
                  {ride.estimatedTime && (
                    <Text style={styles.calloutTime}>
                      ETA: {ride.estimatedTime}
                    </Text>
                  )}
                  {onRideBook && (
                    <TouchableOpacity 
                      style={styles.bookButton} 
                      onPress={() => onRideBook(ride)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.bookButtonText}>
                        Book Ride
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </Callout>
            )}
          </Marker>
        );
      });
  }, [rides, selectedRideId, showRideDetails, handleMarkerPress, onRideBook]);

  // ✅ Driver marker component
  const DriverMarker = useMemo(() => {
    if (!driverLocation || !currentBooking) return null;
    
    return (
      <Marker 
        key="driver-location"
        coordinate={driverLocation} 
        title="Your Driver" 
        description={`${currentBooking.driverName || 'Driver'} is on the way`} 
        anchor={{ x: 0.5, y: 0.5 }}
        tracksViewChanges={false}
      >
        <View style={styles.driverMarker}>
          <Icon name="motorcycle" size={24} color="#1E40AF" />
          <View style={styles.driverPulse} />
        </View>
      </Marker>
    );
  }, [driverLocation, currentBooking]);

  // ✅ Route polyline component
  const RoutePolyline = useMemo(() => {
    if (routeCoordinates.length < 2) return null;
    
    return (
      <Polyline 
        coordinates={routeCoordinates} 
        strokeColor="#4CAF50" 
        strokeWidth={3} 
        lineCap="round" 
        lineJoin="round"
      />
    );
  }, [routeCoordinates]);

  // ✅ Render map
  const renderMap = () => {
    // Check if region exists (for loading state)
    if (!region) {
      return (
        <View style={styles.mapLoading}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      );
    }

    // Return the actual MapView
    return (
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={region}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={true}
        showsScale={true}
        onMapReady={handleMapReady}
        onRegionChangeComplete={handleRegionChangeComplete}
        mapType="standard"
        customMapStyle={mapStyle}
        moveOnMarkerPress={false}
        {...props}
      >
        {UserLocationMarker}
        {RideMarkers}
        {DriverMarker}
        {RoutePolyline}
      </MapView>
    );
  };

  return (
    <View style={[styles.container, style]} testID={testID}>
      {renderMap()}

      {/* Map Controls */}
      {showControls && (
        <View style={styles.controlsContainer}>
          <TouchableOpacity 
            style={[styles.controlButton, isFollowingUser && styles.activeControlButton]} 
            onPress={centerOnUserLocation}
            activeOpacity={0.7}
          >
            <Icon 
              name="crosshairs" 
              size={20} 
              color={isFollowingUser ? "#4CAF50" : "#666"} 
            />
          </TouchableOpacity>
        </View>
      )}

      {/* Current Booking Info */}
      {currentBooking && (
        <View style={styles.bookingInfo}>
          <View style={styles.bookingHeader}>
            <Text style={styles.bookingTitle}>Active Ride</Text>
            {isLoadingRoute && (
              <ActivityIndicator size="small" color="#4CAF50" />
            )}
          </View>
          <Text style={styles.bookingDriver}>
            Driver: {currentBooking.driverName || 'Driver'}
          </Text>
          {currentBooking.vehicleType && (
            <Text style={styles.bookingVehicle}>
              {currentBooking.vehicleColor} {currentBooking.vehicleType}
            </Text>
          )}
          {eta && (
            <Text style={styles.bookingStatus}>
              Driver is on the way • ETA: {eta}
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

// Custom map styling
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
    "featureType": "poi",
    "elementType": "geometry",
    "stylers": [{ "color": "#eeeeee" }]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [{ "color": "#ffffff" }]
  }
];

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    position: 'relative' 
  },
  map: { 
    flex: 1 
  },
  mapLoading: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#f8f9fa' 
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#666',
  },
  userLocationMarker: { 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  userLocationInner: { 
    width: 20, 
    height: 20, 
    borderRadius: 10, 
    borderWidth: 3, 
    borderColor: '#fff' 
  },
  userLocationCenter: { 
    width: 6, 
    height: 6, 
    borderRadius: 3, 
    backgroundColor: '#fff', 
    position: 'absolute' 
  },
  rideMarkerContainer: { 
    alignItems: 'center' 
  },
  selectedRide: { 
    transform: [{ scale: 1.1 }] 
  },
  rideMarker: { 
    backgroundColor: '#EF4444', 
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 2, 
    borderColor: '#fff', 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1,
  },
  rideMarkerText: { 
    color: '#fff', 
    fontSize: 10, 
    fontWeight: 'bold' 
  },
  rideMarkerPointer: { 
    width: 0, 
    height: 0, 
    borderStyle: 'solid', 
    borderLeftWidth: 5, 
    borderRightWidth: 5, 
    borderBottomWidth: 5, 
    borderLeftColor: 'transparent', 
    borderRightColor: 'transparent', 
    borderBottomColor: '#EF4444', 
    marginTop: -1 
  },
  calloutContainer: { 
    backgroundColor: '#fff', 
    borderRadius: 8,
    padding: 16,
    width: 180, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1,
  },
  calloutTitle: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#333', 
    marginBottom: 4
  },
  calloutSubtitle: { 
    fontSize: 12, 
    color: '#666', 
    marginBottom: 4
  },
  calloutAmount: { 
    fontSize: 14, 
    fontWeight: 'bold', 
    color: '#4CAF50', 
    marginBottom: 4
  },
  calloutTime: { 
    fontSize: 11, 
    color: '#666', 
    marginBottom: 8
  },
  bookButton: { 
    backgroundColor: '#4CAF50', 
    paddingVertical: 4,
    paddingHorizontal: 16,
    borderRadius: 4,
    alignItems: 'center' 
  },
  bookButtonText: { 
    color: '#fff', 
    fontSize: 12, 
    fontWeight: '600' 
  },
  driverMarker: { 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  driverPulse: { 
    position: 'absolute', 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: 'rgba(30, 64, 175, 0.1)', 
    zIndex: -1 
  },
  controlsContainer: { 
    position: 'absolute', 
    top: 20, 
    right: 16, 
    gap: 12 
  },
  controlButton: { 
    backgroundColor: '#fff', 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    alignItems: 'center', 
    justifyContent: 'center', 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1,
  },
  activeControlButton: {
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  bookingInfo: { 
    position: 'absolute', 
    bottom: 20, 
    left: 16, 
    right: 16, 
    backgroundColor: '#fff', 
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bookingTitle: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#333' 
  },
  bookingDriver: { 
    fontSize: 14, 
    color: '#666', 
    marginBottom: 4
  },
  bookingVehicle: { 
    fontSize: 12, 
    color: '#666', 
    marginBottom: 4
  },
  bookingStatus: { 
    fontSize: 12, 
    color: '#4CAF50', 
    fontWeight: '500' 
  },
});

export default MapComponent;