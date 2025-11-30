// screens/rider/RiderHomeScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, Alert, Platform, PermissionsAndroid, TouchableOpacity 
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
// ✅ Use aliases (if configured properly)
import Header from '../../src/components/Header';
import Button from '../../src/components/Button';
import Loading from '../../src/components/Loading';
import RideCard from '../../src/components/RideCard';
import MapComponent from '../../src/components/MapComponent';
import Geolocation from 'react-native-geolocation-service';
import { getUserData } from '../../src/utils/userStorage'; // ✅ ADDED: Import storage utility

export default function RiderHomeScreen({ route, navigation }) {
  const [region, setRegion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [availableRides, setAvailableRides] = useState([]);
  const [selectedRideId, setSelectedRideId] = useState(null);
  const [locationPermission, setLocationPermission] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState(null); // ✅ ADDED: State for user data
  const mapRef = useRef(null);

  // ✅ FIXED: Get user data from AsyncStorage instead of route params
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const data = await getUserData();
        setUserData(data);
        console.log('Rider data loaded from storage:', data?.userProfile?.fullName);
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    loadUserData();
  }, []);

  const riderName = userData?.userProfile?.fullName || userData?.socialUserInfo?.name || 'Rider';
  const riderPhone = userData?.phone;

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
          message: 'Kabaza needs your location to find rides near you.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      const allowed = granted === PermissionsAndroid.RESULTS.GRANTED;
      setLocationPermission(allowed);
      if (!allowed) {
        Alert.alert('Location Required', 'Location access is needed to find nearby rides.');
      }
      return allowed;
    } catch (err) {
      console.warn('Location permission error:', err);
      return false;
    }
  };

  const getCurrentLocation = () => {
    setLoading(true);
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newRegion = { 
          latitude, 
          longitude, 
          latitudeDelta: 0.01, 
          longitudeDelta: 0.01 
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
      // Simulate API call to find rides
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
          vehicleColor: 'Red',
          vehiclePlate: 'BL 1234'
        },
        { 
          id: 2, 
          pickupLocation: { 
            latitude: currentLocation ? currentLocation.latitude - 0.003 : -15.3925, 
            longitude: currentLocation ? currentLocation.longitude - 0.001 : 28.3128 
          }, 
          pickupName: 'Game Complex', 
          destination: 'Airport Road', 
          amount: '800', 
          driverName: 'Mike Phiri',
          driverRating: 4.9,
          estimatedTime: '5 min',
          vehicleType: 'Motorcycle',
          vehicleColor: 'Blue',
          vehiclePlate: 'BL 5678'
        },
        { 
          id: 3, 
          pickupLocation: { 
            latitude: currentLocation ? currentLocation.latitude + 0.001 : -15.3855, 
            longitude: currentLocation ? currentLocation.longitude - 0.002 : 28.3188 
          }, 
          pickupName: 'Area 3', 
          destination: 'KCH', 
          amount: '600', 
          driverName: 'Sarah Juma',
          driverRating: 4.7,
          estimatedTime: '2 min',
          vehicleType: 'Motorcycle',
          vehicleColor: 'Green',
          vehiclePlate: 'BL 9012'
        },
      ];
      
      setAvailableRides(sampleRides);
      Alert.alert('Rides Found', `Found ${sampleRides.length} available rides near you!`);
    } catch (error) {
      Alert.alert('Error', 'Failed to find rides. Please try again.');
      console.error('Error finding rides:', error);
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
      `Book ride with ${ride.driverName} to ${ride.destination} for MK${ride.amount}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Book Now', 
          onPress: () => {
            // Navigate to booking confirmation or payment
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

  useEffect(() => {
    const initializeLocation = async () => {
      try {
        const granted = await requestLocationPermission();
        
        if (granted) {
          // Add delay to ensure Google Play Services are ready
          setTimeout(() => {
            getCurrentLocation();
          }, 1000);
        } else {
          setRegion(defaultRegion);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing location:', error);
        setRegion(defaultRegion);
        setLoading(false);
      }
    };

    initializeLocation();

    // Watch position for real-time updates
    let watchId;
    if (locationPermission) {
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
  }, [locationPermission]);

  if (loading && !region) {
    return (
      <View style={styles.container}>
        <Header title={`Welcome, ${riderName}`} showBack={false} />
        <Loading message="Getting your location ready..." />
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
            onPress={() => navigation.navigate('Profile')} // ✅ REMOVED: route.params
          >
            <Icon name="user" size={20} color="#fff" />
          </TouchableOpacity>
        }
      />

      {/* Map View */}
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
        {/* Quick Actions */}
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
            onPress={() => navigation.navigate('RideHistory')} // ✅ REMOVED: route.params
          >
            <Icon name="history" size={20} color="#6c3" />
            <Text style={styles.actionText}>History</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => Alert.alert('Help', 'Rider support information')}
          >
            <Icon name="question-circle" size={20} color="#6c3" />
            <Text style={styles.actionText}>Help</Text>
          </TouchableOpacity>
        </View>

        {/* Available Rides Section */}
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
            
            <ScrollView 
              style={styles.ridesList}
              showsVerticalScrollIndicator={false}
            >
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
            <Text style={styles.noRidesText}>No rides found yet</Text>
            <Text style={styles.noRidesSubtext}>
              Tap "Find Rides" to search for available drivers
            </Text>
            <Button
              title={refreshing ? "Searching..." : "Find Available Rides"}
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