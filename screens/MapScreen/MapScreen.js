// screens/driver/MapScreen/MapScreen.js
import React, { useEffect, useState, useRef } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Alert, Platform, PermissionsAndroid 
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import Geolocation from 'react-native-geolocation-service';
import Icon from 'react-native-vector-icons/FontAwesome';
import Header from '../../../components/Header';
import Loading from '../../../components/Loading';
import Button from '../../../components/Button';

export default function MapScreen({ route, navigation }) {
  const [region, setRegion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [locationPermission, setLocationPermission] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const mapRef = useRef(null);

  // Get data from navigation params
  const { 
    phone,
    authMethod,
    socialUserInfo,
    userProfile 
  } = route.params || {};

  // Get driver name
  const getDriverName = () => {
    return userProfile?.fullName || socialUserInfo?.name || 'Driver';
  };

  // Request location permission
  const requestLocationPermission = async () => {
    if (Platform.OS === 'ios') {
      setLocationPermission(true);
      return true;
    }
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Kabaza Location Permission',
          message: 'Kabaza needs your location to show your position on the map.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      const allowed = granted === PermissionsAndroid.RESULTS.GRANTED;
      setLocationPermission(allowed);
      return allowed;
    } catch (err) {
      console.warn('Location permission error:', err);
      return false;
    }
  };

  // Get current location
  const getCurrentLocation = () => {
    setLoading(true);
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newRegion = {
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        setRegion(newRegion);
        setCurrentLocation({ latitude, longitude });
        setLoading(false);
        
        // Center map on user location
        if (mapRef.current) {
          mapRef.current.animateToRegion(newRegion, 1000);
        }
      },
      (error) => {
        console.log('Location error:', error);
        Alert.alert(
          'Location Error', 
          'Unable to get your current location. Using default location.',
          [{ text: 'OK' }]
        );
        // Fallback to default Malawi coordinates
        const defaultRegion = {
          latitude: -13.9626,
          longitude: 33.7741,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        };
        setRegion(defaultRegion);
        setLoading(false);
      },
      { 
        enableHighAccuracy: true, 
        timeout: 15000, 
        maximumAge: 10000 
      }
    );
  };

  // Center map on current location
  const centerOnLocation = () => {
    if (currentLocation && mapRef.current) {
      const newRegion = {
        ...currentLocation,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      mapRef.current.animateToRegion(newRegion, 1000);
    }
  };

  // Handle going online/offline
  const toggleOnlineStatus = () => {
    if (!isOnline && !locationPermission) {
      Alert.alert(
        'Location Required',
        'Location permission is required to go online and accept rides.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Enable Location', 
            onPress: () => requestLocationPermission().then(granted => {
              if (granted) {
                getCurrentLocation();
                setIsOnline(true);
              }
            })
          }
        ]
      );
      return;
    }

    const newStatus = !isOnline;
    setIsOnline(newStatus);
    
    if (newStatus) {
      Alert.alert(
        'You\'re Online!',
        'You are now visible to riders and can accept ride requests.',
        [{ text: 'Got it' }]
      );
    } else {
      Alert.alert(
        'You\'re Offline',
        'You are no longer visible to riders.',
        [{ text: 'OK' }]
      );
    }
  };

  // Watch position when online
  useEffect(() => {
    let watchId;

    if (isOnline && locationPermission) {
      watchId = Geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation({ latitude, longitude });
        },
        (error) => {
          console.log('Watch position error:', error);
        },
        { 
          enableHighAccuracy: true, 
          distanceFilter: 10, 
          interval: 5000 
        }
      );
    }

    return () => {
      if (watchId) {
        Geolocation.clearWatch(watchId);
      }
    };
  }, [isOnline, locationPermission]);

  // Initialize location on component mount
  useEffect(() => {
    const initializeLocation = async () => {
      const granted = await requestLocationPermission();
      if (granted) {
        getCurrentLocation();
      } else {
        // Use default location if permission denied
        const defaultRegion = {
          latitude: -13.9626,
          longitude: 33.7741,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        };
        setRegion(defaultRegion);
        setLoading(false);
      }
    };

    initializeLocation();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <Header 
          title={`Welcome, ${getDriverName()}`} 
          subtitle="Driver Mode"
          showBack={false}
        />
        <Loading message="Getting your location ready..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header 
        title={`Welcome, ${getDriverName()}`} 
        subtitle={isOnline ? 'Online - Accepting rides' : 'Offline'}
        showBack={false}
        rightComponent={
          <TouchableOpacity 
            style={styles.earningsButton}
            onPress={() => navigation.navigate('Earnings', route.params)}
          >
            <Icon name="money" size={20} color="#fff" />
          </TouchableOpacity>
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
            pitchEnabled={false}
          >
            {/* User Location Marker */}
            {currentLocation && (
              <Marker
                coordinate={currentLocation}
                title="Your Location"
                description="You are here"
                pinColor={isOnline ? "#4CAF50" : "#FF6B6B"}
              >
                <View style={[
                  styles.locationMarker,
                  isOnline ? styles.onlineMarker : styles.offlineMarker
                ]}>
                  <Icon 
                    name="car" 
                    size={16} 
                    color="#fff" 
                  />
                </View>
              </Marker>
            )}
          </MapView>
        ) : (
          <View style={styles.errorContainer}>
            <Icon name="exclamation-triangle" size={50} color="#FF6B6B" />
            <Text style={styles.errorText}>Unable to load map</Text>
            <Button 
              title="Retry" 
              onPress={getCurrentLocation}
              style={styles.retryButton}
            />
          </View>
        )}

        {/* Location Center Button */}
        <TouchableOpacity 
          style={styles.centerButton}
          onPress={centerOnLocation}
          disabled={!currentLocation}
        >
          <Icon name="crosshairs" size={20} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Bottom Control Panel */}
      <View style={styles.bottomPanel}>
        {/* Online Status Indicator */}
        <View style={styles.statusContainer}>
          <View style={[
            styles.statusIndicator,
            isOnline ? styles.statusOnline : styles.statusOffline
          ]} />
          <Text style={styles.statusText}>
            {isOnline ? 'ONLINE - Accepting rides' : 'OFFLINE - Not accepting rides'}
          </Text>
        </View>

        {/* Online/Offline Toggle Button */}
        <Button
          title={isOnline ? "Go Offline" : "Go Online"}
          onPress={toggleOnlineStatus}
          style={[
            styles.toggleButton,
            isOnline ? styles.offlineButton : styles.onlineButton
          ]}
          textStyle={styles.toggleButtonText}
        />

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Earnings', route.params)}
          >
            <Icon name="money" size={20} color="#6c3" />
            <Text style={styles.actionText}>Earnings</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={centerOnLocation}
            disabled={!currentLocation}
          >
            <Icon name="location-arrow" size={20} color="#6c3" />
            <Text style={styles.actionText}>My Location</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => Alert.alert('Help', 'Driver support information')}
          >
            <Icon name="question-circle" size={20} color="#6c3" />
            <Text style={styles.actionText}>Help</Text>
          </TouchableOpacity>
        </View>
      </View>
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
  earningsButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 8,
    borderRadius: 20,
    marginLeft: 10,
  },
  locationMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  onlineMarker: {
    backgroundColor: '#4CAF50',
  },
  offlineMarker: {
    backgroundColor: '#FF6B6B',
  },
  centerButton: {
    position: 'absolute',
    top: 20,
    right: 20,
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
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusOnline: {
    backgroundColor: '#4CAF50',
  },
  statusOffline: {
    backgroundColor: '#FF6B6B',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  toggleButton: {
    marginBottom: 15,
    borderRadius: 12,
    paddingVertical: 14,
  },
  onlineButton: {
    backgroundColor: '#4CAF50',
  },
  offlineButton: {
    backgroundColor: '#FF6B6B',
  },
  toggleButtonText: {
    fontSize: 16,
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
  },
  actionText: {
    fontSize: 12,
    color: '#6c3',
    marginTop: 5,
    fontWeight: '500',
  },
});