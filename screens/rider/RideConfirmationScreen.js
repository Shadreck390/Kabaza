// screens/rider/RideConfirmationScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';

export default function RideConfirmationScreen({ route, navigation }) {
  const { ride, destination, pickupLocation, riderInfo } = route.params || {};
  
  const [searchingDriver, setSearchingDriver] = useState(true);
  const [driverFound, setDriverFound] = useState(false);
  const [driverInfo, setDriverInfo] = useState(null);
  const [countdown, setCountdown] = useState(30);

  // Simulate driver search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchingDriver(false);
      setDriverFound(true);
      
      // Sample driver info
      setDriverInfo({
        name: 'John Banda',
        rating: 4.8,
        vehicle: 'Bajaj Boxer',
        plate: 'BL 1234',
        eta: '3 min',
        phone: '+265 991 234 567'
      });
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  // Countdown timer
  useEffect(() => {
    if (searchingDriver) {
      const interval = setInterval(() => {
        setCountdown(prev => prev > 0 ? prev - 1 : 0);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [searchingDriver]);

  const cancelRide = () => {
    Alert.alert(
      'Cancel Ride',
      'Are you sure you want to cancel this ride?',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes', 
          onPress: () => navigation.navigate('RiderHome')
        }
      ]
    );
  };

  const contactDriver = () => {
    Alert.alert(
      'Contact Driver',
      `Call ${driverInfo.name} at ${driverInfo.phone}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Call', 
          onPress: () => {
            // Here you would implement actual calling functionality
            Alert.alert('Calling...', `Would call ${driverInfo.phone}`);
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Map View */}
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={{
            latitude: -15.3875,
            longitude: 28.3228,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          showsUserLocation={true}
        />
      </View>

      {/* Bottom Panel */}
      <View style={styles.bottomPanel}>
        {searchingDriver ? (
          // Searching for Driver State
          <View style={styles.searchingContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.searchingTitle}>Finding you a driver</Text>
            <Text style={styles.searchingSubtitle}>
              Searching for available {ride?.name} drivers near you...
            </Text>
            <Text style={styles.countdown}>Estimated time: {countdown}s</Text>
            
            <View style={styles.rideSummary}>
              <Text style={styles.rideType}>{ride?.name}</Text>
              <Text style={styles.ridePrice}>MK{ride?.price}</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={cancelRide}
            >
              <Text style={styles.cancelButtonText}>Cancel Ride</Text>
            </TouchableOpacity>
          </View>
        ) : driverFound ? (
          // Driver Found State
          <View style={styles.driverFoundContainer}>
            <View style={styles.driverHeader}>
              <Icon name="check-circle" size={30} color="#4CAF50" />
              <Text style={styles.driverFoundTitle}>Driver Found!</Text>
            </View>
            
            <View style={styles.driverInfo}>
              <View style={styles.driverAvatar}>
                <Icon name="user" size={24} color="#666" />
              </View>
              <View style={styles.driverDetails}>
                <Text style={styles.driverName}>{driverInfo.name}</Text>
                <View style={styles.ratingContainer}>
                  <Icon name="star" size={16} color="#FFD700" />
                  <Text style={styles.driverRating}>{driverInfo.rating}</Text>
                </View>
                <Text style={styles.vehicleInfo}>
                  {driverInfo.vehicle} • {driverInfo.plate}
                </Text>
              </View>
              <Text style={styles.eta}>{driverInfo.eta}</Text>
            </View>
            
            <View style={styles.rideDetails}>
              <View style={styles.routePoint}>
                <View style={styles.dot} />
                <Text style={styles.routeText}>{pickupLocation}</Text>
              </View>
              <View style={styles.routePoint}>
                <Icon name="map-marker" size={16} color="#4CAF50" />
                <Text style={styles.routeText}>{destination}</Text>
              </View>
            </View>
            
            <View style={styles.rideActions}>
              <TouchableOpacity 
                style={styles.secondaryButton}
                onPress={contactDriver}
              >
                <Text style={styles.secondaryButtonText}>Contact Driver</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={cancelRide}
              >
                <Text style={styles.cancelButtonText}>Cancel Ride</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  bottomPanel: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    maxHeight: '50%',
  },
  searchingContainer: {
    alignItems: 'center',
    padding: 10,
  },
  searchingTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
    marginBottom: 5,
  },
  searchingSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  countdown: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
    marginBottom: 20,
  },
  rideSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 20,
  },
  rideType: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  ridePrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  cancelButton: {
    backgroundColor: '#FF6B6B',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  driverFoundContainer: {
    padding: 10,
  },
  driverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  driverFoundTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  driverAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  driverRating: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  vehicleInfo: {
    fontSize: 14,
    color: '#666',
  },
  eta: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  rideDetails: {
    marginBottom: 20,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 12,
  },
  routeText: {
    fontSize: 14,
    color: '#333',
  },
  rideActions: {
    gap: 10,
  },
  secondaryButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});