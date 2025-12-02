import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, Alert, Platform, PermissionsAndroid, 
  TouchableOpacity, Linking // ✅ ADDED Linking
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import Header from '../../src/components/Header';
import Button from '../../src/components/Button';
import Loading from '../../src/components/Loading';
import RideCard from '../../src/components/RideCard';
import MapComponent from '../../src/components/MapComponent';
// ✅ IMPORTANT: Consider using React Native's built-in Geolocation
// instead of react-native-geolocation-service if having issues
import Geolocation from 'react-native-geolocation-service';
import { getUserData } from '../../src/utils/userStorage';

export default function RiderHomeScreen({ route, navigation }) {
  const [region, setRegion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [availableRides, setAvailableRides] = useState([]);
  const [selectedRideId, setSelectedRideId] = useState(null);
  const [locationPermission, setLocationPermission] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState(null);
  const mapRef = useRef(null);
  const locationWatchId = useRef(null); // ✅ ADDED: For cleanup

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const data = await getUserData();
        setUserData(data);
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    loadUserData();
  }, []);

  const riderName = userData?.userProfile?.fullName || userData?.socialUserInfo?.name || 'Rider';
  const riderPhone = userData?.phone;

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
        // For iOS, use react-native-geolocation-service
        const status = await Geolocation.requestAuthorization('whenInUse');
        const allowed = status === 'granted' || status === 'authorizedAlways';
        setLocationPermission(allowed);
        return allowed;
      } else {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'Kabaza needs your location to find rides.',
            buttonPositive: 'OK',
            buttonNegative: 'Cancel',
          }
        );
        const allowed = granted === PermissionsAndroid.RESULTS.GRANTED;
        setLocationPermission(allowed);
        return allowed;
      }
    } catch (err) {
      console.warn('Permission error:', err);
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
          setCurrentLocation({ latitude, longitude });
          setRegion(newRegion);
          resolve({ latitude, longitude });
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

  const findAvailableRides = async () => {
    setRefreshing(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const sampleRides = [
        { 
          id: 1, 
          pickupLocation: { 
            latitude: currentLocation ? currentLocation.latitude + 0.002 : -15.3875, 
            longitude: currentLocation ? currentLocation.longitude + 0.002 : 28.3228 
          }, 
          pickupName: 'Shoprite Complex', 
          destination: 'City Center', 
          amount: '500', 
          driverName: 'John Banda',
          driverRating: 4.8,
          estimatedTime: '3 min',
          vehicleType: 'Motorcycle',
        },
        // ... other rides
      ];
      
      setAvailableRides(sampleRides);
    } catch (error) {
      Alert.alert('Error', 'Failed to find rides. Please try again.');
    } finally {
      setRefreshing(false);
    }
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

  const handleBookRide = (ride) => {
    Alert.alert(
      'Confirm Ride',
      `Book ride to ${ride.destination} for MK${ride.amount}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Book Now', 
          onPress: () => {
            navigation.navigate('RideBooking', {
              ride,
              riderInfo: {
                name: riderName,
                phone: riderPhone,
                currentLocation: currentLocation
              }
            });
          }
        }
      ]
    );
  };

  const clearRides = () => {
    setAvailableRides([]);
    setSelectedRideId(null);
  };

  // ✅ IMPROVED: Initialize location
  useEffect(() => {
    const initializeLocation = async () => {
      try {
        const granted = await requestLocationPermission();
        
        if (granted) {
          await getCurrentLocation();
        } else {
          // If permission denied, use default location
          setRegion(defaultRegion);
        }
      } catch (error) {
        console.error('Location init error:', error);
        setRegion(defaultRegion);
      } finally {
        setLoading(false);
      }
    };

    initializeLocation();

    // Cleanup function
    return () => {
      if (locationWatchId.current) {
        Geolocation.clearWatch(locationWatchId.current);
      }
    };
  }, []);

  // ✅ ADDED: Watch location only when permission is granted
  useEffect(() => {
    if (locationPermission && !locationWatchId.current) {
      locationWatchId.current = Geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation({ latitude, longitude });
        },
        (error) => {
          console.log('Location watch error:', error.code, error.message);
        },
        { 
          enableHighAccuracy: true, 
          distanceFilter: 50, // Less frequent updates
          interval: 10000,
          fastestInterval: 5000
        }
      );
    }

    return () => {
      if (locationWatchId.current) {
        Geolocation.clearWatch(locationWatchId.current);
        locationWatchId.current = null;
      }
    };
  }, [locationPermission]);

  if (loading && !region) {
    return (
      <View style={styles.container}>
        <Header title={`Welcome, ${riderName}`} showBack={false} />
        <Loading message="Getting your location..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header 
        title={`Welcome, ${riderName}`} 
        subtitle="Find rides near you"
        showBack={false}
        rightComponent={
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <Icon name="user" size={20} color="#fff" />
          </TouchableOpacity>
        }
      />

      <View style={styles.mapContainer}>
        {region ? (
          <MapComponent
            ref={mapRef}
            region={region}
            setRegion={setRegion}
            rides={availableRides}
            selectedRideId={selectedRideId}
            onSelectRide={handleSelectRide}
            userLocationColor="#2196f3"
            showUserLocation={true}
          />
        ) : (
          <View style={styles.errorContainer}>
            <Icon name="exclamation-triangle" size={50} color="#FF6B6B" />
            <Text style={styles.errorText}>Map not available</Text>
            <Button 
              title="Retry" 
              onPress={getCurrentLocation}
              style={styles.retryButton}
            />
          </View>
        )}

        <TouchableOpacity 
          style={styles.centerButton}
          onPress={centerOnLocation}
          disabled={!currentLocation}
        >
          <Icon name="crosshairs" size={20} color="#333" />
        </TouchableOpacity>
      </View>

      <View style={styles.bottomPanel}>
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={findAvailableRides}
            disabled={refreshing}
          >
            <Icon name="search" size={20} color="#6c3" />
            <Text style={styles.actionText}>Find Rides</Text>
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
            onPress={() => navigation.navigate('RideHistory')}
          >
            <Icon name="history" size={20} color="#6c3" />
            <Text style={styles.actionText}>History</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => Alert.alert('Help', 'Contact support')}
          >
            <Icon name="question-circle" size={20} color="#6c3" />
            <Text style={styles.actionText}>Help</Text>
          </TouchableOpacity>
        </View>

        {availableRides.length > 0 ? (
          <View style={styles.ridesSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Available Rides ({availableRides.length})
              </Text>
              <TouchableOpacity onPress={clearRides}>
                <Text style={styles.clearText}>Clear</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.ridesList}>
              {availableRides.map((ride) => (
                <RideCard 
                  key={ride.id} 
                  ride={ride} 
                  onPress={() => handleSelectRide(ride)}
                  onBook={() => handleBookRide(ride)}
                  isSelected={ride.id === selectedRideId}
                />
              ))}
            </ScrollView>
          </View>
        ) : (
          <View style={styles.noRidesContainer}>
            <Icon name="car" size={40} color="#ccc" />
            <Text style={styles.noRidesText}>No rides found</Text>
            <Text style={styles.noRidesSubtext}>
              Tap "Find Rides" to search
            </Text>
            <Button
              title={refreshing ? "Searching..." : "Find Rides"}
              onPress={findAvailableRides}
              disabled={refreshing}
              style={styles.findRidesButton}
            />
          </View>
        )}
      </View>
    </View>
  );
}

// Styles remain the same...
const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  profileButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 8,
    borderRadius: 20,
    marginLeft: 10,
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
    maxHeight: '60%',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionButton: {
    alignItems: 'center',
    padding: 10,
    minWidth: 70,
  },
  actionText: {
    fontSize: 12,
    color: '#6c3',
    marginTop: 5,
    fontWeight: '500',
    textAlign: 'center',
  },
  ridesSection: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  clearText: {
    fontSize: 14,
    color: '#ff6b6b',
    fontWeight: '500',
  },
  ridesList: {
    flexGrow: 0,
  },
  noRidesContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  noRidesText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
    marginBottom: 5,
  },
  noRidesSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
  },
  findRidesButton: {
    paddingHorizontal: 30,
  },
});
// Styles remain the same...