import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, PermissionsAndroid, Alert } from 'react-native';
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
  const [currentLocation, setCurrentLocation] = useState(null); // ✅ ADDED: Track current location
  const mapRef = useRef(null);
  const locationWatchId = useRef(null); // ✅ ADDED: For tracking location updates

  // ✅ IMPROVED: Get user data from AsyncStorage
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const data = await getUserData();
        setUserData(data);
        console.log('Driver data loaded from storage:', data?.userProfile?.fullName);
        
        // ✅ Use location from storage if available
        if (data?.userLocation) {
          setCurrentLocation(data.userLocation);
          const newRegion = {
            latitude: data.userLocation.latitude,
            longitude: data.userLocation.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          };
          setRegion(newRegion);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        setRegion(defaultRegion);
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

  const driverName = userData?.userProfile?.fullName || userData?.socialUserInfo?.name || 'Driver';

  const defaultRegion = {
    latitude: -15.3875, // Malawi coordinates
    longitude: 28.3228,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  // ✅ IMPROVED: Location permission request
  const requestLocationPermission = async () => {
    if (Platform.OS === 'ios') {
      try {
        const status = await Geolocation.requestAuthorization('whenInUse');
        const allowed = status === 'granted';
        setLocationPermission(allowed);
        return allowed;
      } catch (error) {
        console.warn('iOS location permission error:', error);
        return false;
      }
    } else {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Kabaza Location Permission',
            message: 'Kabaza needs your location to show nearby rides and help passengers find you.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        const allowed = granted === PermissionsAndroid.RESULTS.GRANTED;
        setLocationPermission(allowed);
        if (!allowed) {
          Alert.alert(
            'Location Permission Required',
            'Location access is required to find nearby rides. You can enable it in Settings.',
            [
              { text: 'OK' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() }
            ]
          );
        }
        return allowed;
      } catch (err) {
        console.warn('Android location permission error:', err);
        return false;
      }
    }
  };

  // ✅ IMPROVED: Get current location with better error handling
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
          setLoading(false);
          resolve(position.coords);
        },
        (error) => {
          console.log('Location error:', error);
          setLoading(false);
          reject(error);
        },
        { 
          enableHighAccuracy: true, 
          timeout: 20000, // Increased timeout
          maximumAge: 30000 
        }
      );
    });
  };

  // ✅ ADDED: Start watching location when online
  const startLocationTracking = () => {
    if (locationWatchId.current) {
      Geolocation.clearWatch(locationWatchId.current);
    }

    locationWatchId.current = Geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation(position.coords);
        // Update map region smoothly
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
        console.log('Location tracking error:', error);
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 10, // Update every 10 meters
        interval: 5000,
        fastestInterval: 2000
      }
    );
  };

  // ✅ IMPROVED: Go online with better location handling
  const goOnline = async () => {
    if (!locationPermission) {
      const granted = await requestLocationPermission();
      if (!granted) return;
    }

    setLoading(true);
    
    try {
      // Ensure we have current location
      if (!currentLocation) {
        await getCurrentLocation();
      }

      setIsOnline(true);
      
      // Start location tracking
      startLocationTracking();

      // Fetch nearby rides
      const rides = await fetchNearbyRides(currentLocation || region);
      setNearbyRides(rides);

      // Subscribe to real-time ride updates
      subscribeToNearbyRides(currentLocation || region, (ride) => {
        setNearbyRides((prev) => {
          const exists = prev.find((r) => r.id === ride.id);
          if (exists) return prev.map((r) => (r.id === ride.id ? ride : r));
          return [ride, ...prev];
        });
      });

      Alert.alert('You\'re Online!', 'You are now visible to passengers and can receive ride requests.');

    } catch (error) {
      console.error('Error going online:', error);
      Alert.alert(
        'Connection Error', 
        'Failed to connect to ride services. Please check your internet connection and try again.'
      );
      setIsOnline(false);
    } finally {
      setLoading(false);
    }
  };

  // ✅ IMPROVED: Go offline with cleanup
  const goOffline = () => {
    setIsOnline(false);
    setNearbyRides([]);
    setSelectedRideId(null);
    
    // Stop location tracking
    if (locationWatchId.current) {
      Geolocation.clearWatch(locationWatchId.current);
      locationWatchId.current = null;
    }
    
    unsubscribeFromNearbyRides();
    
    Alert.alert('You\'re Offline', 'You are no longer visible to passengers.');
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
      `Accept ride from ${ride.pickupName || 'customer'} for ${ride.fare || 'unknown fare'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Accept', 
          onPress: () => {
            // Navigate to ride details or start navigation
            Alert.alert('Ride Accepted!', 'Please proceed to the pickup location.');
            setSelectedRideId(ride.id);
            // Here you would typically navigate to ride details screen
            // navigation.navigate('RideDetails', { ride });
          }
        }
      ]
    );
  };

  // ✅ IMPROVED: Initialize location
  useEffect(() => {
    const initializeLocation = async () => {
      try {
        // If we don't have location from storage, request permission and get location
        if (!currentLocation && !region) {
          const granted = await requestLocationPermission();
          
          if (granted) {
            await getCurrentLocation();
          } else {
            setRegion(defaultRegion);
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('Error initializing location:', error);
        setRegion(defaultRegion);
        setLoading(false);
      }
    };

    initializeLocation();

    // Cleanup function
    return () => {
      if (locationWatchId.current) {
        Geolocation.clearWatch(locationWatchId.current);
      }
      unsubscribeFromNearbyRides();
    };
  }, []);

  if (loading && !region) {
    return <Loading message="Getting your location ready..." />;
  }

  return (
    <View style={styles.container}>
      <Header 
        title={`Welcome, ${driverName}`} 
        subtitle={isOnline ? 'Online - Accepting rides' : 'Offline'}
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
          region={region}
          setRegion={setRegion}
          rides={nearbyRides}
          selectedRideId={selectedRideId}
          onSelectRide={handleSelectRide}
          userLocation={currentLocation} // ✅ PASS CURRENT LOCATION
          userLocationColor="#4CAF50"
          showUserLocation={true}
        />
      </View>

      <View style={styles.bottomPanel}>
        <View style={styles.onlineStatusContainer}>
          <View style={[styles.statusIndicator, isOnline ? styles.online : styles.offline]} />
          <Text style={styles.statusText}>
            {isOnline ? 'ONLINE - Accepting rides' : 'OFFLINE - Not accepting rides'}
          </Text>
        </View>

        <Button
          title={isOnline ? "Go Offline" : "Go Online"}
          onPress={isOnline ? goOffline : goOnline}
          style={[styles.onlineButton, isOnline ? styles.offlineButton : styles.onlineButtonStyle]}
          textStyle={styles.onlineButtonText}
          loading={loading}
        />

        {nearbyRides.length > 0 ? (
          <View style={styles.ridesListContainer}>
            <Text style={styles.sectionTitle}>
              Nearby Ride Requests ({nearbyRides.length})
            </Text>
            <ScrollView 
              style={styles.ridesList}
              showsVerticalScrollIndicator={false}
            >
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
            <Text style={styles.noRidesText}>No ride requests in your area</Text>
            <Text style={styles.noRidesSubtext}>Rides will appear here when available</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
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
  onlineButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
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
    marginBottom: 4,
  },
  noRidesSubtext: {
    fontSize: 14,
    color: '#999',
  },
});
