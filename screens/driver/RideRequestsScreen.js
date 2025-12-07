// screens/driver/RideRequestsScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import MapView, { Marker } from 'react-native-maps';

export default function RideRequestsScreen({ navigation }) {
  const [requests, setRequests] = useState([
    {
      id: '1',
      passengerName: 'John M.',
      passengerRating: 4.8,
      pickup: 'Shoprite, Lilongwe',
      destination: 'Kameza Roundabout',
      distance: '3.2 km',
      fare: 'MWK 1,200',
      pickupCoords: { latitude: -13.9626, longitude: 33.7741 },
      destinationCoords: { latitude: -13.9632, longitude: 33.7750 },
      timeAgo: '2 min ago'
    },
    {
      id: '2',
      passengerName: 'Sarah K.',
      passengerRating: 4.9,
      pickup: 'Crossroads Complex',
      destination: 'Mchesi',
      distance: '5.1 km',
      fare: 'MWK 1,800',
      pickupCoords: { latitude: -13.9630, longitude: 33.7745 },
      destinationCoords: { latitude: -13.9640, longitude: 33.7760 },
      timeAgo: '5 min ago'
    }
  ]);

  const handleAcceptRide = (requestId) => {
    Alert.alert(
      'Accept Ride?',
      'You will be navigated to pickup location',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Accept', 
          onPress: () => {
            // Navigate to ActiveRideScreen
            const request = requests.find(r => r.id === requestId);
            navigation.navigate('ActiveRide', { request });
          }
        }
      ]
    );
  };

  const handleRejectRide = (requestId) => {
    setRequests(prev => prev.filter(r => r.id !== requestId));
    Alert.alert('Ride Rejected', 'Ride request removed');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Ride Requests</Text>
        <Text style={styles.subtitle}>New requests from passengers</Text>
      </View>

      {requests.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="bell-slash" size={60} color="#ccc" />
          <Text style={styles.emptyText}>No ride requests at the moment</Text>
          <Text style={styles.emptySubtext}>You'll be notified when new rides come in</Text>
        </View>
      ) : (
        requests.map((request) => (
          <View key={request.id} style={styles.requestCard}>
            <View style={styles.requestHeader}>
              <View style={styles.passengerInfo}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {request.passengerName.charAt(0)}
                  </Text>
                </View>
                <View>
                  <Text style={styles.passengerName}>{request.passengerName}</Text>
                  <View style={styles.ratingContainer}>
                    <Icon name="star" size={12} color="#FFD700" />
                    <Text style={styles.rating}>{request.passengerRating}</Text>
                  </View>
                </View>
              </View>
              <Text style={styles.timeAgo}>{request.timeAgo}</Text>
            </View>

            <View style={styles.mapContainer}>
              <MapView
                style={styles.map}
                initialRegion={{
                  latitude: request.pickupCoords.latitude,
                  longitude: request.pickupCoords.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
              >
                <Marker coordinate={request.pickupCoords} title="Pickup" pinColor="#00B894" />
                <Marker coordinate={request.destinationCoords} title="Destination" pinColor="#FF6B6B" />
              </MapView>
            </View>

            <View style={styles.routeInfo}>
              <View style={styles.routeItem}>
                <Icon name="map-marker" size={16} color="#00B894" />
                <Text style={styles.routeText} numberOfLines={1}>{request.pickup}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.routeItem}>
                <Icon name="flag" size={16} color="#FF6B6B" />
                <Text style={styles.routeText} numberOfLines={1}>{request.destination}</Text>
              </View>
            </View>

            <View style={styles.footer}>
              <View style={styles.fareInfo}>
                <Text style={styles.distance}>{request.distance}</Text>
                <Text style={styles.fare}>{request.fare}</Text>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity 
                  style={styles.rejectButton}
                  onPress={() => handleRejectRide(request.id)}
                >
                  <Icon name="times" size={18} color="#FF6B6B" />
                  <Text style={styles.rejectText}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.acceptButton}
                  onPress={() => handleAcceptRide(request.id)}
                >
                  <Icon name="check" size={18} color="#fff" />
                  <Text style={styles.acceptText}>Accept</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { padding: 20, backgroundColor: '#fff', marginBottom: 10 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 5 },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 50 },
  emptyText: { fontSize: 18, color: '#666', marginTop: 20, fontWeight: '600' },
  emptySubtext: { fontSize: 14, color: '#999', marginTop: 10, textAlign: 'center' },
  requestCard: { 
    backgroundColor: '#fff', 
    marginHorizontal: 15, 
    marginBottom: 15, 
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  requestHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 15,
  },
  passengerInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: '#00B894', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 10 
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  passengerName: { fontSize: 16, fontWeight: '600', color: '#333' },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  rating: { fontSize: 12, color: '#666', marginLeft: 4 },
  timeAgo: { fontSize: 12, color: '#999' },
  mapContainer: { height: 150, borderRadius: 10, overflow: 'hidden', marginBottom: 15 },
  map: { flex: 1 },
  routeInfo: { marginBottom: 15 },
  routeItem: { flexDirection: 'row', alignItems: 'center', marginVertical: 5 },
  routeText: { fontSize: 14, color: '#333', marginLeft: 10, flex: 1 },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 5, marginLeft: 26 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fareInfo: { flex: 1 },
  distance: { fontSize: 14, color: '#666', marginBottom: 5 },
  fare: { fontSize: 18, fontWeight: 'bold', color: '#00B894' },
  actions: { flexDirection: 'row', gap: 10 },
  rejectButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 15, 
    paddingVertical: 8, 
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  rejectText: { color: '#FF6B6B', marginLeft: 5, fontWeight: '600' },
  acceptButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 8, 
    borderRadius: 8,
    backgroundColor: '#00B894',
  },
  acceptText: { color: '#fff', marginLeft: 5, fontWeight: '600' },
});