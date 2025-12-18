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

// ✅ CORRECTED IMPORT PATHS - Using aliases:
import AppConfig from '@config'; // Using alias
import Constants from '@constants/app';  // ✅ CORRECT

// Get Google Maps API Key from config
const GOOGLE_MAPS_API_KEY = AppConfig.MAPS.API_KEY;

// Constants (now referencing our constants file)
const DEFAULT_DELTA = {
  latitudeDelta: Constants.MAP_CONSTANTS.DEFAULT_LOCATION.latitudeDelta,
  longitudeDelta: Constants.MAP_CONSTANTS.DEFAULT_LOCATION.longitudeDelta,
};

const GEOLOCATION_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 10000,
  distanceFilter: 50,
};

const ANIMATION_DURATION = Constants.UI_CONSTANTS.ANIMATION.DURATION.NORMAL;

// Show warning if API key is missing or placeholder
if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY.includes('Placeholder')) {
  console.warn('⚠️ Google Maps API Key is missing or using placeholder!');
  console.log('👉 Add your real API key to: C:\\Front_End\\Kabaza\\.env.local');
  console.log('👉 Get key from: https://console.cloud.google.com/');
  
  // Only show alert in development
  if (AppConfig.ENV.DEBUG && Platform.OS !== 'web') {
    Alert.alert(
      'Configuration Required',
      'Google Maps API key is missing. Please add it to .env.local file.',
      [{ text: 'OK' }]
    );
  }
}

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

  // ✅ Check if API key is available and valid
  const hasGoogleMapsKey = React.useMemo(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      console.error('❌ Google Maps API Key is undefined');
      return false;
    }
    if (GOOGLE_MAPS_API_KEY.includes('Placeholder')) {
      console.warn('⚠️ Using placeholder API key - maps may not work');
      return true; // Still return true to show map with warning
    }
    if (GOOGLE_MAPS_API_KEY.startsWith('AIza')) {
      return true;
    }
    console.error('❌ Invalid Google Maps API Key format');
    return false;
  }, []);

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
        setRegion(newRegion);
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
          setRegion(newRegion);
          
          // Log location in development
          if (AppConfig.ENV.DEBUG) {
            console.log('📍 User location acquired:', newLocation);
          }
        },
        (error) => {
          console.warn('Geolocation error:', error);
          
          // Use default location from config
          const defaultLocation = Constants.MAP_CONSTANTS.DEFAULT_LOCATION;
          setRegion({
            latitude: defaultLocation.latitude,
            longitude: defaultLocation.longitude,
            ...DEFAULT_DELTA,
          });
          
          // Show error in development
          if (AppConfig.ENV.DEBUG) {
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
      const defaultLocation = Constants.MAP_CONSTANTS.DEFAULT_LOCATION;
      setRegion({
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
    if (AppConfig.ENV.DEBUG) {
      console.log('🗺️ MapComponent mounted with config:', {
        hasApiKey: hasGoogleMapsKey,
        apiKeyLength: GOOGLE_MAPS_API_KEY?.length || 0,
        environment: AppConfig.ENV.NAME,
        debugMode: AppConfig.ENV.DEBUG,
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

  // ✅ Render map or fallback
  const renderMap = () => {
    if (!hasGoogleMapsKey) {
      return (
        <View style={styles.apiKeyWarning}>
          <Icon name="exclamation-triangle" size={40} color="#F59E0B" />
          <Text style={styles.warningTitle}>Google Maps API Key Required</Text>
          <Text style={styles.warningText}>
            Please add your Google Maps API key to .env.local file
          </Text>
          <Text style={styles.warningSubtext}>
            Get key from: https://console.cloud.google.com/
          </Text>
          <TouchableOpacity 
            style={styles.helpButton}
            onPress={() => {
              Alert.alert(
                'Setup Instructions',
                '1. Go to Google Cloud Console\n2. Create API Key\n3. Enable Maps SDK\n4. Add key to .env.local\n5. Restart app',
                [{ text: 'OK' }]
              );
            }}
          >
            <Text style={styles.helpButtonText}>Show Setup Instructions</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!region) {
      return (
        <View style={styles.mapLoading}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading map...</Text>
          {GOOGLE_MAPS_API_KEY.includes('Placeholder') && (
            <Text style={styles.placeholderWarning}>
              Using placeholder API key - get real key for production
            </Text>
          )}
        </View>
      );
    }

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
  apiKeyWarning: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    padding: Constants.UI_CONSTANTS.SPACING.LG,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#856404',
    marginTop: Constants.UI_CONSTANTS.SPACING.MD,
    marginBottom: Constants.UI_CONSTANTS.SPACING.SM,
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Constants.UI_CONSTANTS.SPACING.XS,
  },
  warningSubtext: {
    fontSize: 12,
    color: '#856404',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: Constants.UI_CONSTANTS.SPACING.MD,
  },
  helpButton: {
    backgroundColor: '#F59E0B',
    paddingVertical: Constants.UI_CONSTANTS.SPACING.SM,
    paddingHorizontal: Constants.UI_CONSTANTS.SPACING.MD,
    borderRadius: Constants.UI_CONSTANTS.BORDER_RADIUS.MD,
    marginTop: Constants.UI_CONSTANTS.SPACING.SM,
  },
  helpButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  mapLoading: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#f8f9fa' 
  },
  loadingText: {
    marginTop: Constants.UI_CONSTANTS.SPACING.MD,
    fontSize: 14,
    color: '#666',
  },
  placeholderWarning: {
    marginTop: Constants.UI_CONSTANTS.SPACING.SM,
    fontSize: 11,
    color: '#F59E0B',
    fontStyle: 'italic',
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
    paddingHorizontal: Constants.UI_CONSTANTS.SPACING.SM, 
    paddingVertical: Constants.UI_CONSTANTS.SPACING.XS, 
    borderRadius: Constants.UI_CONSTANTS.BORDER_RADIUS.MD, 
    borderWidth: 2, 
    borderColor: '#fff', 
    ...Constants.UI_CONSTANTS.SHADOW.SM
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
    borderRadius: Constants.UI_CONSTANTS.BORDER_RADIUS.MD, 
    padding: Constants.UI_CONSTANTS.SPACING.MD, 
    width: 180, 
    ...Constants.UI_CONSTANTS.SHADOW.SM
  },
  calloutTitle: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#333', 
    marginBottom: Constants.UI_CONSTANTS.SPACING.XS 
  },
  calloutSubtitle: { 
    fontSize: 12, 
    color: '#666', 
    marginBottom: Constants.UI_CONSTANTS.SPACING.XS 
  },
  calloutAmount: { 
    fontSize: 14, 
    fontWeight: 'bold', 
    color: '#4CAF50', 
    marginBottom: Constants.UI_CONSTANTS.SPACING.XS 
  },
  calloutTime: { 
    fontSize: 11, 
    color: '#666', 
    marginBottom: Constants.UI_CONSTANTS.SPACING.SM 
  },
  bookButton: { 
    backgroundColor: '#4CAF50', 
    paddingVertical: Constants.UI_CONSTANTS.SPACING.XS, 
    paddingHorizontal: Constants.UI_CONSTANTS.SPACING.MD, 
    borderRadius: Constants.UI_CONSTANTS.BORDER_RADIUS.SM, 
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
    ...Constants.UI_CONSTANTS.SHADOW.SM
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
    borderRadius: Constants.UI_CONSTANTS.BORDER_RADIUS.LG, 
    padding: Constants.UI_CONSTANTS.SPACING.MD, 
    ...Constants.UI_CONSTANTS.SHADOW.MD
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Constants.UI_CONSTANTS.SPACING.SM,
  },
  bookingTitle: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#333' 
  },
  bookingDriver: { 
    fontSize: 14, 
    color: '#666', 
    marginBottom: Constants.UI_CONSTANTS.SPACING.XS 
  },
  bookingVehicle: { 
    fontSize: 12, 
    color: '#666', 
    marginBottom: Constants.UI_CONSTANTS.SPACING.XS 
  },
  bookingStatus: { 
    fontSize: 12, 
    color: '#4CAF50', 
    fontWeight: '500' 
  },
});

export default MapComponent;