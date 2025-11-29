// screens/driver/DriverHomeScreen.js
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
import { getUserData } from '../../src/utils/userStorage'; // ✅ ADDED: Import storage utility

export default function DriverHomeScreen({ route, navigation }) {
  const [region, setRegion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nearbyRides, setNearbyRides] = useState([]);
  const [isOnline, setIsOnline] = useState(false);
  const [selectedRideId, setSelectedRideId] = useState(null);
  const [locationPermission, setLocationPermission] = useState(false);
  const [userData, setUserData] = useState(null); // ✅ ADDED: State for user data
  const mapRef = useRef(null);

  // ✅ FIXED: Get user data from AsyncStorage instead of route params
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const data = await getUserData();
        setUserData(data);
        console.log('Driver data loaded from storage:', data?.userProfile?.fullName);
      } catch (error) {
        console.error('Error loading user data:', error);
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
          message: 'Kabaza needs your location to show nearby rides.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      const allowed = granted === PermissionsAndroid.RESULTS.GRANTED;
      setLocationPermission(allowed);
      if (!allowed) {
        Alert.alert('Permission Denied', 'Location access is required to find nearby rides.');
      }
      return allowed;
    } catch (err) {
      console.warn(err);
      return false;
    }
  };

  const getCurrentLocation = () => {
    setLoading(true);
    Geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const newRegion = { 
          latitude, 
          longitude, 
          latitudeDelta: 0.01, 
          longitudeDelta: 0.01 
        };
        setRegion(newRegion);
        setLoading(false);
      },
      (err) => {
        console.log('Location error:', err);
        Alert.alert('Location Error', 'Unable to fetch your current location. Using default location.');
        setRegion(defaultRegion);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  const goOnline = async () => {
    if (!locationPermission) {
      Alert.alert('Location Required', 'Please enable location services to go online.');
      return;
    }

    setIsOnline(true);
    setLoading(true);
    
    try {
      const rides = await fetchNearbyRides(region);
      setNearbyRides(rides);

      // Subscribe to real-time ride updates
      subscribeToNearbyRides(region, (ride) => {
        setNearbyRides((prev) => {
          const exists = prev.find((r) => r.id === ride.id);
          if (exists) return prev.map((r) => (r.id === ride.id ? ride : r));
          return [ride, ...prev];
        });
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch nearby rides. Please try again.');
      console.error('Error fetching rides:', error);
    } finally {
      setLoading(false);
    }
  };

  const goOffline = () => {
    setIsOnline(false);
    setNearbyRides([]);
    setSelectedRideId(null);
    unsubscribeFromNearbyRides();
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
      `Accept ride from ${ride.pickupName || 'customer'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Accept', 
          onPress: () => {
            // Navigate to ride details or start navigation
            Alert.alert('Ride Accepted', 'Navigate to pickup location.');
            setSelectedRideId(ride.id);
          }
        }
      ]
    );
  };

  useEffect(() => {
    requestLocationPermission().then((granted) => {
      if (granted) {
        getCurrentLocation();
      } else {
        setRegion(defaultRegion);
        setLoading(false);
      }
    });

    return () => {
      // Cleanup on unmount
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
