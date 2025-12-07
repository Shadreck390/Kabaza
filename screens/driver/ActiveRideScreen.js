// screens/driver/ActiveRideScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import MapView, { Marker, Polyline } from 'react-native-maps';

export default function ActiveRideScreen({ navigation, route }) {
  const { request } = route.params || {};
  const [rideStatus, setRideStatus] = useState('picking_up'); // 'picking_up', 'on_trip', 'completed'
  const [timer, setTimer] = useState(0);
  
  // Mock route coordinates
  const routeCoordinates = [
    { latitude: -13.9626, longitude: 33.7741 }, // Pickup
    { latitude: -13.9628, longitude: 33.7743 },
    { latitude: -13.9630, longitude: 33.7745 },
    { latitude: -13.9632, longitude: 33.7750 }, // Destination
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleStatusChange = (newStatus) => {
    setRideStatus(newStatus);
    
    if (newStatus === 'completed') {
      Alert.alert(
        'Ride Completed',
        `You've earned ${request.fare}!`,
        [
          { 
            text: 'Return to Dashboard', 
            onPress: () => navigation.navigate('DriverHome') 
          }
        ]
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* Map View */}
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: routeCoordinates[0].latitude,
          longitude: routeCoordinates[0].longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        <Marker coordinate={routeCoordinates[0]} title="Pickup" pinColor="#00B894" />
        <Marker coordinate={routeCoordinates[routeCoordinates.length - 1]} title="Destination" pinColor="#FF6B6B" />
        <Polyline
          coordinates={routeCoordinates}
          strokeColor="#00B894"
          strokeWidth={3}
        />
      </MapView>

      {/* Ride Info Panel */}
      <View style={styles.infoPanel}>
        {/* Passenger Info */}
        <View style={styles.passengerSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{request?.passengerName?.charAt(0) || 'P'}</Text>
          </View>
          <View style={styles.passengerDetails}>
            <Text style={styles.passengerName}>{request?.passengerName || 'Passenger'}</Text>
            <View style={styles.ratingContainer}>
              <Icon name="star" size={14} color="#FFD700" />
              <Text style={styles.rating}>{request?.passengerRating || '4.8'}</Text>
            </View>
          </View>
          <Text style={styles.timer}>{formatTime(timer)}</Text>
        </View>

        {/* Status Indicator */}
        <View style={styles.statusContainer}>
          <View style={styles.statusIndicator}>
            <View style={[styles.statusDot, rideStatus === 'picking_up' && styles.activeDot]} />
            <Text style={[styles.statusText, rideStatus === 'picking_up' && styles.activeText]}>
              Pickup
            </Text>
          </View>
          <View style={styles.statusLine} />
          <View style={styles.statusIndicator}>
            <View style={[styles.statusDot, rideStatus === 'on_trip' && styles.activeDot]} />
            <Text style={[styles.statusText, rideStatus === 'on_trip' && styles.activeText]}>
              On Trip
            </Text>
          </View>
          <View style={styles.statusLine} />
          <View style={styles.statusIndicator}>
            <View style={[styles.statusDot, rideStatus === 'completed' && styles.activeDot]} />
            <Text style={[styles.statusText, rideStatus === 'completed' && styles.activeText]}>
              Complete
            </Text>
          </View>
        </View>

        {/* Route Details */}
        <View style={styles.routeSection}>
          <View style={styles.routeItem}>
            <Icon name="map-marker" size={18} color="#00B894" />
            <View style={styles.routeTextContainer}>
              <Text style={styles.routeLabel}>Pickup</Text>
              <Text style={styles.routeAddress}>{request?.pickup || 'Pickup location'}</Text>
            </View>
          </View>
          <View style={styles.routeDivider} />
          <View style={styles.routeItem}>
            <Icon name="flag" size={18} color="#FF6B6B" />
            <View style={styles.routeTextContainer}>
              <Text style={styles.routeLabel}>Destination</Text>
              <Text style={styles.routeAddress}>{request?.destination || 'Destination'}</Text>
            </View>
          </View>
        </View>

        {/* Fare Info */}
        <View style={styles.fareSection}>
          <View>
            <Text style={styles.distanceLabel}>Distance</Text>
            <Text style={styles.distance}>{request?.distance || '3.2 km'}</Text>
          </View>
          <View style={styles.fareContainer}>
            <Text style={styles.fareLabel}>Fare</Text>
            <Text style={styles.fare}>{request?.fare || 'MWK 1,200'}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          {rideStatus === 'picking_up' && (
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={() => handleStatusChange('on_trip')}
            >
              <Icon name="user-check" size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>Passenger Picked Up</Text>
            </TouchableOpacity>
          )}
          
          {rideStatus === 'on_trip' && (
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={() => handleStatusChange('completed')}
            >
              <Icon name="flag-checkered" size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>Complete Ride</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('DriverHome')}
          >
            <Icon name="times" size={20} color="#666" />
            <Text style={styles.secondaryButtonText}>Cancel Ride</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const { width, height } = Dimensions.get('window');
const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  infoPanel: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    backgroundColor: '#fff', 
    borderTopLeftRadius: 20, 
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: height * 0.6,
  },
  passengerSection: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 20,
  },
  avatar: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    backgroundColor: '#00B894', 
    justifyContent: 'center', 
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  passengerDetails: { flex: 1 },
  passengerName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  rating: { fontSize: 14, color: '#666', marginLeft: 5 },
  timer: { fontSize: 18, fontWeight: '600', color: '#00B894' },
  statusContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statusIndicator: { alignItems: 'center' },
  statusDot: { 
    width: 12, 
    height: 12, 
    borderRadius: 6, 
    backgroundColor: '#ccc',
    marginBottom: 5,
  },
  activeDot: { backgroundColor: '#00B894' },
  statusText: { fontSize: 12, color: '#999' },
  activeText: { color: '#00B894', fontWeight: '600' },
  statusLine: { flex: 1, height: 2, backgroundColor: '#eee', marginHorizontal: 10 },
  routeSection: { marginBottom: 20 },
  routeItem: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 10 },
  routeTextContainer: { marginLeft: 15, flex: 1 },
  routeLabel: { fontSize: 12, color: '#999', marginBottom: 2 },
  routeAddress: { fontSize: 14, color: '#333' },
  routeDivider: { height: 1, backgroundColor: '#eee', marginLeft: 25, marginVertical: 5 },
  fareSection: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
  },
  distanceLabel: { fontSize: 12, color: '#999', marginBottom: 2 },
  distance: { fontSize: 16, fontWeight: '600', color: '#333' },
  fareContainer: { alignItems: 'flex-end' },
  fareLabel: { fontSize: 12, color: '#999', marginBottom: 2 },
  fare: { fontSize: 24, fontWeight: 'bold', color: '#00B894' },
  actions: { gap: 10 },
  primaryButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: '#00B894', 
    padding: 18, 
    borderRadius: 12,
    gap: 10,
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  secondaryButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: '#f8f9fa', 
    padding: 18, 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    gap: 10,
  },
  secondaryButtonText: { color: '#666', fontSize: 16, fontWeight: '600' },
});