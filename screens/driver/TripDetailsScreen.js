// screens/driver/TripDetailsScreen.js
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import MapView, { Marker, Polyline } from 'react-native-maps';

export default function TripDetailsScreen({ navigation, route }) {
  const { trip } = route.params || {
    trip: {
      id: '1',
      date: 'Today, 14:30',
      passengerName: 'John M.',
      passengerPhone: '+265 999 888 777',
      passengerRating: 5,
      pickup: 'Shoprite, Lilongwe',
      destination: 'Kameza Roundabout',
      distance: '3.2 km',
      duration: '12 min',
      fare: 'MWK 1,200',
      paymentMethod: 'Cash',
      status: 'completed',
      pickupCoords: { latitude: -13.9626, longitude: 33.7741 },
      destinationCoords: { latitude: -13.9632, longitude: 33.7750 }
    }
  };

  const routeCoordinates = [
    trip.pickupCoords,
    { latitude: -13.9628, longitude: 33.7743 },
    { latitude: -13.9630, longitude: 33.7745 },
    trip.destinationCoords
  ];

  const handleCallPassenger = () => {
    const phoneNumber = trip.passengerPhone.replace(/\D/g, '');
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleShareTrip = () => {
    // In a real app, this would share trip details
    alert('Trip details copied to clipboard!');
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={20} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trip Details</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Map Preview */}
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: trip.pickupCoords.latitude,
            longitude: trip.pickupCoords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          scrollEnabled={false}
          zoomEnabled={false}
        >
          <Marker coordinate={trip.pickupCoords} title="Pickup" pinColor="#00B894" />
          <Marker coordinate={trip.destinationCoords} title="Destination" pinColor="#FF6B6B" />
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#00B894"
            strokeWidth={3}
          />
        </MapView>
      </View>

      {/* Trip Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.fareContainer}>
          <Text style={styles.fareLabel}>Total Fare</Text>
          <Text style={styles.fareAmount}>{trip.fare}</Text>
        </View>
        
        <View style={styles.tripMeta}>
          <View style={styles.metaItem}>
            <Icon name="road" size={16} color="#666" />
            <Text style={styles.metaText}>{trip.distance}</Text>
          </View>
          <View style={styles.metaItem}>
            <Icon name="clock-o" size={16} color="#666" />
            <Text style={styles.metaText}>{trip.duration}</Text>
          </View>
          <View style={styles.metaItem}>
            <Icon name="money" size={16} color="#666" />
            <Text style={styles.metaText}>{trip.paymentMethod}</Text>
          </View>
        </View>
      </View>

      {/* Passenger Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Passenger</Text>
        <View style={styles.passengerCard}>
          <View style={styles.passengerInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{trip.passengerName.charAt(0)}</Text>
            </View>
            <View style={styles.passengerDetails}>
              <Text style={styles.passengerName}>{trip.passengerName}</Text>
              <View style={styles.ratingContainer}>
                {[...Array(5)].map((_, i) => (
                  <Icon 
                    key={i} 
                    name="star" 
                    size={14} 
                    color={i < trip.passengerRating ? "#FFD700" : "#ddd"} 
                  />
                ))}
                <Text style={styles.ratingText}>({trip.passengerRating}.0)</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity style={styles.callButton} onPress={handleCallPassenger}>
            <Icon name="phone" size={18} color="#00B894" />
            <Text style={styles.callText}>Call</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Trip Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trip Details</Text>
        <View style={styles.detailsCard}>
          {/* Pickup */}
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Icon name="map-marker" size={18} color="#00B894" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Pickup Location</Text>
              <Text style={styles.detailValue}>{trip.pickup}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Destination */}
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Icon name="flag" size={18} color="#FF6B6B" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Destination</Text>
              <Text style={styles.detailValue}>{trip.destination}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Date & Time */}
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Icon name="calendar" size={18} color="#666" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Date & Time</Text>
              <Text style={styles.detailValue}>{trip.date}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Trip ID */}
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Icon name="hashtag" size={18} color="#666" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Trip ID</Text>
              <Text style={styles.detailValue}>{trip.id}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.secondaryButton} onPress={handleShareTrip}>
          <Icon name="share-alt" size={18} color="#666" />
          <Text style={styles.secondaryButtonText}>Share Trip</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('TripHistory')}>
          <Icon name="arrow-left" size={18} color="#fff" />
          <Text style={styles.primaryButtonText}>Back to History</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
  },
  backButton: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  headerRight: { width: 30 },
  mapContainer: { height: 200 },
  map: { flex: 1 },
  summaryCard: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  fareContainer: { alignItems: 'center', marginBottom: 15 },
  fareLabel: { fontSize: 14, color: '#666', marginBottom: 5 },
  fareAmount: { fontSize: 36, fontWeight: 'bold', color: '#00B894' },
  tripMeta: { 
    flexDirection: 'row', 
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 15,
  },
  metaItem: { alignItems: 'center' },
  metaText: { fontSize: 12, color: '#666', marginTop: 5 },
  section: { marginHorizontal: 15, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 10 },
  passengerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  passengerInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#00B894',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  passengerDetails: { flex: 1 },
  passengerName: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 5 },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ratingText: { fontSize: 12, color: '#666', marginLeft: 5 },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00B894',
    gap: 5,
  },
  callText: { fontSize: 14, color: '#00B894', fontWeight: '500' },
  detailsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 10 },
  detailIcon: { width: 30, alignItems: 'center' },
  detailContent: { flex: 1 },
  detailLabel: { fontSize: 12, color: '#999', marginBottom: 2 },
  detailValue: { fontSize: 14, color: '#333' },
  divider: { height: 1, backgroundColor: '#eee', marginLeft: 30, marginVertical: 5 },
  actionsContainer: { 
    flexDirection: 'row', 
    gap: 10, 
    marginHorizontal: 15, 
    marginBottom: 30,
  },
  primaryButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00B894',
    padding: 16,
    borderRadius: 12,
    gap: 10,
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    gap: 10,
  },
  secondaryButtonText: { color: '#666', fontSize: 16, fontWeight: '600' },
});