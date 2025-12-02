import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Platform, 
  PermissionsAndroid, 
  Alert,
  Linking // ✅ ADDED MISSING IMPORT
} from 'react-native';
import Header from 'components/Header';
import Button from 'components/Button';
import Loading from 'components/Loading';
import DriverCard from 'components/DriverCard';
import MapComponent from 'components/MapComponent';
import { fetchNearbyRides } from 'services/api/rideAPI';
import { subscribeToNearbyRides, unsubscribeFromNearbyRides } from 'services/socket/realtimeUpdates';
import Geolocation from 'react-native-geolocation-service';
import { getUserData } from '../../src/utils/userStorage';

export default function DriverHomeScreen({ route, navigation }) {
  const [region, setRegion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nearbyRides, setNearbyRides] = useState([]);
  const [isOnline, setIsOnline] = useState(false);
  const [selectedRideId, setSelectedRideId] = useState(null);
  const [locationPermission, setLocationPermission] = useState(false);
  const [userData, setUserData] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const mapRef = useRef(null);
  const locationWatchId = useRef(null);

  const driverName = userData?.userProfile?.fullName || userData?.socialUserInfo?.name || 'Driver';

  const defaultRegion = {
    latitude: -15.3875,
    longitude: 28.3228,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  // ✅ SIMPLIFIED: Location permission request
  const requestLocationPermission = async () => {
    try {
      if (Platform.OS === 'ios') {
        const status = await Geolocation.requestAuthorization('whenInUse');
        const allowed = status === 'granted' || status === 'authorizedAlways';
        setLocationPermission(allowed);
        return allowed;
      } else {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Kabaza Location Permission',
            message: 'Kabaza needs your location to show nearby rides',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        const allowed = granted === PermissionsAndroid.RESULTS.GRANTED;
        setLocationPermission(allowed);
        return allowed;
      }
    } catch (error) {
      console.warn('Location permission error:', error);
      return false;
    }
  };

  // ✅ SIMPLIFIED: Get current location
  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const newRegion = { 
            latitude, 
            longitude, 
            latitudeDelta: 0.01, 
            longitudeDelta: 0.01 
          };
          setCurrentLocation(position.coords);
          setRegion(newRegion);
          resolve(position.coords);
        },
        (error) => {
          console.log('Location error:', error.code, error.message);
          reject(error);
        },
        { 
          enableHighAccuracy: true, 
          timeout: 15000,
          maximumAge: 10000 
        }
      );
    });
  };

  // ✅ SIMPLIFIED: Initialize app
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // 1. Load user data
        const data = await getUserData();
        setUserData(data);
        
        // 2. Try to get location permission
        const granted = await requestLocationPermission();
        
        if (granted) {
          // 3. Get current location
          await getCurrentLocation();
        } else {
          // Use default region if permission denied
          setRegion(defaultRegion);
        }
      } catch (error) {
        console.error('Initialization error:', error);
        setRegion(defaultRegion);
      } finally {
        setLoading(false);
      }
    };

    initializeApp();

    // Cleanup
    return () => {
      if (locationWatchId.current) {
        Geolocation.clearWatch(locationWatchId.current);
      }
      unsubscribeFromNearbyRides();
    };
  }, []);

  // ✅ SIMPLIFIED: Go online
  const goOnline = async () => {
    if (!locationPermission) {
      const granted = await requestLocationPermission();
      if (!granted) {
        Alert.alert(
          'Permission Required',
          'Location permission is required to go online.',
          [
            { text: 'OK' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
        return;
      }
    }

    setLoading(true);
    
    try {
      // Get fresh location
      const location = await getCurrentLocation();
      
      // Start location tracking
      startLocationTracking();
      
      setIsOnline(true);
      
      // Fetch rides
      const rides = await fetchNearbyRides(location || region);
      setNearbyRides(rides);
      
      // Subscribe to updates
      subscribeToNearbyRides(location || region, (ride) => {
        setNearbyRides(prev => {
          const exists = prev.find(r => r.id === ride.id);
          if (exists) return prev.map(r => r.id === ride.id ? ride : r);
          return [ride, ...prev];
        });
      });
      
    } catch (error) {
      console.error('Error going online:', error);
      Alert.alert('Error', 'Failed to go online. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ SIMPLIFIED: Go offline
  const goOffline = () => {
    setIsOnline(false);
    setNearbyRides([]);
    
    if (locationWatchId.current) {
      Geolocation.clearWatch(locationWatchId.current);
      locationWatchId.current = null;
    }
    
    unsubscribeFromNearbyRides();
  };

  // ✅ SIMPLIFIED: Start location tracking
  const startLocationTracking = () => {
    if (locationWatchId.current) {
      Geolocation.clearWatch(locationWatchId.current);
    }

    locationWatchId.current = Geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation(position.coords);
        
        // Smooth map update
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude,
            longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }, 1000);
        }
      },
      (error) => {
        console.log('Tracking error:', error.code, error.message);
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 50, // Update every 50 meters (less battery)
        interval: 10000,
        fastestInterval: 5000
      }
    );
  };

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
      mapRef.current?.animateToRegion(newRegion, 1000);
    }
  };

  const handleAcceptRide = (ride) => {
    Alert.alert(
      'Accept Ride',
      `Accept ride for ${ride.fare || 'unknown fare'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Accept', 
          onPress: () => {
            Alert.alert('Ride Accepted!', 'Please proceed to pickup.');
            setSelectedRideId(ride.id);
          }
        }
      ]
    );
  };

  if (loading && !region) {
    return <Loading message="Getting your location..." />;
  }

  return (
    <View style={styles.container}>
      <Header 
        title={`Welcome, ${driverName}`} 
        subtitle={isOnline ? 'Online' : 'Offline'}
        showBack={false}
        rightComponent={
          <Button 
            title="Earnings" 
            onPress={() => navigation.navigate('Earnings')}
            style={styles.earningsButton}
            textStyle={styles.earningsButtonText}
          />
        }
      />

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
        />
      </View>

      <View style={styles.bottomPanel}>
        <View style={styles.onlineStatusContainer}>
          <View style={[styles.statusIndicator, isOnline ? styles.online : styles.offline]} />
          <Text style={styles.statusText}>
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </Text>
        </View>

        <Button
          title={isOnline ? "Go Offline" : "Go Online"}
          onPress={isOnline ? goOffline : goOnline}
          style={[styles.onlineButton, isOnline ? styles.offlineButton : styles.onlineButtonStyle]}
          loading={loading}
        />

        {nearbyRides.length > 0 ? (
          <View style={styles.ridesListContainer}>
            <Text style={styles.sectionTitle}>
              Nearby Rides ({nearbyRides.length})
            </Text>
            <ScrollView style={styles.ridesList}>
              {nearbyRides.map((ride) => (
                <DriverCard 
                  key={ride.id} 
                  ride={ride} 
                  onPress={() => handleSelectRide(ride)}
                  onAccept={() => handleAcceptRide(ride)}
                  isSelected={ride.id === selectedRideId}
                />
              ))}
            </ScrollView>
          </View>
        ) : isOnline ? (
          <View style={styles.noRidesContainer}>
            <Text style={styles.noRidesText}>No rides nearby</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

// Styles remain the same
const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
  mapContainer: { 
    flex: 1 
  },
  earningsButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#6c3'
  },
  earningsButtonText: {
    color: '#6c3',
    fontSize: 14,
    fontWeight: '600'
  },
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    maxHeight: '50%',
  },
  onlineStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    justifyContent: 'center'
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  online: {
    backgroundColor: '#4CAF50',
  },
  offline: {
    backgroundColor: '#ff6b6b',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  onlineButton: {
    marginBottom: 15,
    borderRadius: 12,
    paddingVertical: 14,
  },
  onlineButtonStyle: {
    backgroundColor: '#4CAF50',
  },
  offlineButton: {
    backgroundColor: '#ff6b6b',
  },
  ridesListContainer: { 
    maxHeight: 300,
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    marginBottom: 12,
    color: '#333',
    textAlign: 'center'
  },
  ridesList: {
    flexGrow: 0,
  },
  noRidesContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noRidesText: {
    fontSize: 16,
    color: '#666',
  },
});