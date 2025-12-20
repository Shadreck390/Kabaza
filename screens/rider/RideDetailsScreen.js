// screens/rider/RideDetailsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  Image,
  Alert,
  Share,
  Linking,
  Modal,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useRoute, useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

// Mock ride details data
const RIDE_DETAILS = {
  '1': {
    id: '1',
    date: 'Today, 10:45 AM',
    pickup: {
      name: 'Area 3 Shopping Complex',
      address: 'Area 3, Lilongwe, Malawi',
      coordinates: { latitude: -13.9583, longitude: 33.7689 },
    },
    destination: {
      name: 'Lilongwe City Mall',
      address: 'M1 Road, Lilongwe, Malawi',
      coordinates: { latitude: -13.9772, longitude: 33.7720 },
    },
    driver: {
      name: 'John Banda',
      phone: '+265 88 123 4567',
      vehicle: 'Toyota Corolla',
      plate: 'LL 2345 A',
      rating: 4.8,
      trips: 1247,
      photo: null,
    },
    fare: {
      base: 500,
      distance: 250,
      time: 100,
      total: 850,
      currency: 'MWK',
    },
    distance: '2.5 km',
    duration: '8 min',
    status: 'completed',
    paymentMethod: 'cash',
    receiptId: 'RCPT-2024-001',
    routeCoordinates: [
      { latitude: -13.9583, longitude: 33.7689 },
      { latitude: -13.9620, longitude: 33.7700 },
      { latitude: -13.9650, longitude: 33.7710 },
      { latitude: -13.9700, longitude: 33.7720 },
      { latitude: -13.9772, longitude: 33.7720 },
    ],
    timeline: [
      { time: '10:45 AM', status: 'Ride requested', icon: 'schedule' },
      { time: '10:46 AM', status: 'Driver John Banda accepted', icon: 'check-circle' },
      { time: '10:48 AM', status: 'Driver arriving', icon: 'directions-car' },
      { time: '10:50 AM', status: 'Ride started', icon: 'play-circle' },
      { time: '10:58 AM', status: 'Ride completed', icon: 'check-circle' },
      { time: '10:59 AM', status: 'Payment received', icon: 'payment' },
    ],
    rating: {
      driver: 5,
      rider: 5,
      driverComment: 'Great passenger, on time',
      riderComment: 'Safe driver, good service',
    },
  },
  '2': {
    id: '2',
    date: 'Yesterday, 3:30 PM',
    pickup: {
      name: 'Current Location',
      address: 'Lilongwe, Malawi',
      coordinates: { latitude: -13.9626, longitude: 33.7741 },
    },
    destination: {
      name: 'Kamuzu Central Hospital',
      address: 'Mzimba Street, Lilongwe, Malawi',
      coordinates: { latitude: -13.9711, longitude: 33.7836 },
    },
    driver: {
      name: 'Sarah Mwale',
      phone: '+265 88 234 5678',
      vehicle: 'Honda Fit',
      plate: 'LL 5678 B',
      rating: 4.5,
      trips: 892,
      photo: null,
    },
    fare: {
      base: 500,
      distance: 300,
      time: 150,
      total: 950,
      currency: 'MWK',
    },
    distance: '3.2 km',
    duration: '12 min',
    status: 'completed',
    paymentMethod: 'mobile_money',
    receiptId: 'RCPT-2024-002',
    routeCoordinates: [
      { latitude: -13.9626, longitude: 33.7741 },
      { latitude: -13.9650, longitude: 33.7760 },
      { latitude: -13.9670, longitude: 33.7780 },
      { latitude: -13.9690, longitude: 33.7800 },
      { latitude: -13.9711, longitude: 33.7836 },
    ],
    timeline: [
      { time: '3:30 PM', status: 'Ride requested', icon: 'schedule' },
      { time: '3:31 PM', status: 'Driver Sarah Mwale accepted', icon: 'check-circle' },
      { time: '3:35 PM', status: 'Driver arriving', icon: 'directions-car' },
      { time: '3:37 PM', status: 'Ride started', icon: 'play-circle' },
      { time: '3:49 PM', status: 'Ride completed', icon: 'check-circle' },
      { time: '3:50 PM', status: 'Payment received', icon: 'payment' },
    ],
    rating: {
      driver: 4,
      rider: 5,
      driverComment: 'Good passenger',
      riderComment: 'Safe ride, thank you',
    },
  },
};

export default function RideDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { rideId, rideData } = route.params || {};
  
  const [ride, setRide] = useState(rideData || RIDE_DETAILS[rideId] || RIDE_DETAILS['1']);
  const [mapRegion, setMapRegion] = useState({
    latitude: -13.9650,
    longitude: 33.7750,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const [activeTab, setActiveTab] = useState('details'); // details, receipt, map
  const [showFullMap, setShowFullMap] = useState(false);

  useEffect(() => {
    if (ride) {
      // Center map on route
      const midLat = (ride.pickup.coordinates.latitude + ride.destination.coordinates.latitude) / 2;
      const midLng = (ride.pickup.coordinates.longitude + ride.destination.coordinates.longitude) / 2;
      setMapRegion({
        latitude: midLat,
        longitude: midLng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    }
  }, [ride]);

  const handleShareReceipt = async () => {
    try {
      const message = `Kabaza Ride Receipt\n\n` +
        `Receipt ID: ${ride.receiptId}\n` +
        `Date: ${ride.date}\n` +
        `From: ${ride.pickup.name}\n` +
        `To: ${ride.destination.name}\n` +
        `Driver: ${ride.driver.name}\n` +
        `Vehicle: ${ride.driver.vehicle} (${ride.driver.plate})\n` +
        `Distance: ${ride.distance}\n` +
        `Duration: ${ride.duration}\n` +
        `Total Fare: MK ${ride.fare.total}\n` +
        `Payment Method: ${ride.paymentMethod}\n` +
        `Status: ${ride.status}`;
      
      await Share.share({
        message,
        title: `Kabaza Receipt - ${ride.receiptId}`,
      });
    } catch (error) {
      Alert.alert('Error', 'Could not share receipt');
    }
  };

  const handleContactDriver = () => {
    Alert.alert(
      'Contact Driver',
      `Call ${ride.driver.name} at ${ride.driver.phone}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Call', 
          onPress: () => Linking.openURL(`tel:${ride.driver.phone.replace(/\s/g, '')}`)
        },
        { 
          text: 'Message', 
          onPress: () => Linking.openURL(`sms:${ride.driver.phone.replace(/\s/g, '')}`)
        },
      ]
    );
  };

  const handleReportIssue = () => {
    navigation.navigate('HelpSupport', { 
      rideId: ride.id,
      rideData: ride,
    });
  };

  const handleRepeatRide = () => {
    navigation.navigate('RideSelection', {
      destination: ride.destination.name,
      pickupLocation: { name: ride.pickup.name },
      rideType: 'kabaza',
    });
  };

  const handleViewFullMap = () => {
    setShowFullMap(true);
  };

  const renderDetailsTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Driver Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Driver & Vehicle</Text>
        <View style={styles.driverCard}>
          <View style={styles.driverInfo}>
            <View style={styles.driverAvatar}>
              <Text style={styles.driverInitials}>
                {ride.driver.name.split(' ').map(n => n[0]).join('')}
              </Text>
            </View>
            <View style={styles.driverDetails}>
              <Text style={styles.driverName}>{ride.driver.name}</Text>
              <View style={styles.driverMeta}>
                <MaterialIcon name="star" size={14} color="#F59E0B" />
                <Text style={styles.driverRating}>{ride.driver.rating}</Text>
                <Text style={styles.driverDivider}>•</Text>
                <Text style={styles.driverTrips}>{ride.driver.trips} trips</Text>
              </View>
              <Text style={styles.driverVehicle}>
                {ride.driver.vehicle} • {ride.driver.plate}
              </Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.contactButton}
            onPress={handleContactDriver}
          >
            <MaterialIcon name="phone" size={20} color="#22C55E" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Ride Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ride Summary</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <MaterialIcon name="access-time" size={20} color="#666" />
            <Text style={styles.summaryValue}>{ride.duration}</Text>
            <Text style={styles.summaryLabel}>Duration</Text>
          </View>
          
          <View style={styles.summaryItem}>
            <MaterialIcon name="map" size={20} color="#666" />
            <Text style={styles.summaryValue}>{ride.distance}</Text>
            <Text style={styles.summaryLabel}>Distance</Text>
          </View>
          
          <View style={styles.summaryItem}>
            <MaterialIcon name="attach-money" size={20} color="#666" />
            <Text style={styles.summaryValue}>MK {ride.fare.total}</Text>
            <Text style={styles.summaryLabel}>Fare</Text>
          </View>
          
          <View style={styles.summaryItem}>
            <MaterialIcon name="payment" size={20} color="#666" />
            <Text style={styles.summaryValue}>
              {ride.paymentMethod === 'cash' ? 'Cash' : 
               ride.paymentMethod === 'mobile_money' ? 'Mobile Money' : 
               ride.paymentMethod === 'card' ? 'Card' : 'Wallet'}
            </Text>
            <Text style={styles.summaryLabel}>Payment</Text>
          </View>
        </View>
      </View>

      {/* Fare Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Fare Breakdown</Text>
        <View style={styles.fareBreakdown}>
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Base Fare</Text>
            <Text style={styles.fareValue}>MK {ride.fare.base}</Text>
          </View>
          
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Distance ({ride.distance})</Text>
            <Text style={styles.fareValue}>MK {ride.fare.distance}</Text>
          </View>
          
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Time ({ride.duration})</Text>
            <Text style={styles.fareValue}>MK {ride.fare.time}</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={[styles.fareRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total Fare</Text>
            <Text style={styles.totalValue}>MK {ride.fare.total}</Text>
          </View>
        </View>
      </View>

      {/* Timeline */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ride Timeline</Text>
        <View style={styles.timeline}>
          {ride.timeline.map((item, index) => (
            <View key={index} style={styles.timelineItem}>
              <View style={styles.timelineIcon}>
                <MaterialIcon name={item.icon} size={16} color="#22C55E" />
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTime}>{item.time}</Text>
                <Text style={styles.timelineStatus}>{item.status}</Text>
              </View>
              {index < ride.timeline.length - 1 && (
                <View style={styles.timelineLine} />
              )}
            </View>
          ))}
        </View>
      </View>

      {/* Ratings */}
      {ride.rating && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ratings</Text>
          <View style={styles.ratingsContainer}>
            <View style={styles.ratingItem}>
              <Text style={styles.ratingLabel}>You rated driver</Text>
              <View style={styles.ratingStars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <MaterialIcon 
                    key={star}
                    name={star <= ride.rating.driver ? "star" : "star-border"} 
                    size={20} 
                    color="#F59E0B" 
                  />
                ))}
              </View>
              {ride.rating.riderComment && (
                <Text style={styles.ratingComment}>"{ride.rating.riderComment}"</Text>
              )}
            </View>
            
            {ride.rating.driverComment && (
              <View style={styles.ratingItem}>
                <Text style={styles.ratingLabel}>Driver's feedback</Text>
                <Text style={styles.ratingComment}>"{ride.rating.driverComment}"</Text>
              </View>
            )}
          </View>
        </View>
      )}
    </ScrollView>
  );

  const renderReceiptTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Receipt Header */}
      <View style={styles.receiptHeader}>
        <MaterialIcon name="receipt" size={48} color="#22C55E" />
        <Text style={styles.receiptTitle}>Ride Receipt</Text>
        <Text style={styles.receiptId}>{ride.receiptId}</Text>
        <Text style={styles.receiptDate}>{ride.date}</Text>
      </View>

      {/* Receipt Details */}
      <View style={styles.receiptDetails}>
        <View style={styles.receiptSection}>
          <Text style={styles.receiptSectionTitle}>Trip Details</Text>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>From</Text>
            <Text style={styles.receiptValue}>{ride.pickup.name}</Text>
          </View>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>To</Text>
            <Text style={styles.receiptValue}>{ride.destination.name}</Text>
          </View>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Distance</Text>
            <Text style={styles.receiptValue}>{ride.distance}</Text>
          </View>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Duration</Text>
            <Text style={styles.receiptValue}>{ride.duration}</Text>
          </View>
        </View>

        <View style={styles.receiptSection}>
          <Text style={styles.receiptSectionTitle}>Driver Details</Text>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Name</Text>
            <Text style={styles.receiptValue}>{ride.driver.name}</Text>
          </View>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Vehicle</Text>
            <Text style={styles.receiptValue}>{ride.driver.vehicle}</Text>
          </View>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Plate Number</Text>
            <Text style={styles.receiptValue}>{ride.driver.plate}</Text>
          </View>
        </View>

        <View style={styles.receiptSection}>
          <Text style={styles.receiptSectionTitle}>Payment Details</Text>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Base Fare</Text>
            <Text style={styles.receiptValue}>MK {ride.fare.base}</Text>
          </View>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Distance Fare</Text>
            <Text style={styles.receiptValue}>MK {ride.fare.distance}</Text>
          </View>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Time Fare</Text>
            <Text style={styles.receiptValue}>MK {ride.fare.time}</Text>
          </View>
          <View style={styles.receiptDivider} />
          <View style={[styles.receiptRow, styles.receiptTotalRow]}>
            <Text style={styles.receiptTotalLabel}>Total Amount</Text>
            <Text style={styles.receiptTotalValue}>MK {ride.fare.total}</Text>
          </View>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Payment Method</Text>
            <Text style={styles.receiptValue}>
              {ride.paymentMethod === 'cash' ? 'Cash' : 
               ride.paymentMethod === 'mobile_money' ? 'Mobile Money' : 
               ride.paymentMethod === 'card' ? 'Card' : 'Wallet'}
            </Text>
          </View>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Status</Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: ride.status === 'completed' ? '#DCFCE7' : '#FEF2F2' }
            ]}>
              <Text style={[
                styles.statusText,
                { color: ride.status === 'completed' ? '#16A34A' : '#DC2626' }
              ]}>
                {ride.status.charAt(0).toUpperCase() + ride.status.slice(1)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.receiptFooter}>
          <Text style={styles.receiptFooterText}>
            Thank you for choosing Kabaza!
          </Text>
          <Text style={styles.receiptFooterNote}>
            This is an electronic receipt. No signature required.
          </Text>
        </View>
      </View>
    </ScrollView>
  );

  const renderMapTab = () => (
    <View style={styles.mapTab}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={mapRegion}
        showsUserLocation={false}
      >
        {/* Pickup Marker */}
        <Marker
          coordinate={ride.pickup.coordinates}
          title="Pickup"
          description={ride.pickup.address}
        >
          <View style={styles.mapMarker}>
            <MaterialIcon name="location-pin" size={30} color="#3B82F6" />
          </View>
        </Marker>

        {/* Destination Marker */}
        <Marker
          coordinate={ride.destination.coordinates}
          title="Destination"
          description={ride.destination.address}
        >
          <View style={styles.mapMarker}>
            <MaterialIcon name="place" size={30} color="#EF4444" />
          </View>
        </Marker>

        {/* Route Polyline */}
        {ride.routeCoordinates && (
          <Polyline
            coordinates={ride.routeCoordinates}
            strokeColor="#22C55E"
            strokeWidth={4}
          />
        )}
      </MapView>

      <View style={styles.mapOverlay}>
        <Text style={styles.mapTitle}>Ride Route</Text>
        <Text style={styles.mapSubtitle}>
          {ride.pickup.name} → {ride.destination.name}
        </Text>
        
        <View style={styles.mapStats}>
          <View style={styles.mapStat}>
            <MaterialIcon name="map" size={16} color="#666" />
            <Text style={styles.mapStatText}>{ride.distance}</Text>
          </View>
          <View style={styles.mapStat}>
            <MaterialIcon name="access-time" size={16} color="#666" />
            <Text style={styles.mapStatText}>{ride.duration}</Text>
          </View>
          <View style={styles.mapStat}>
            <MaterialIcon name="directions-car" size={16} color="#666" />
            <Text style={styles.mapStatText}>{ride.driver.vehicle}</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderFullMap = () => (
    <Modal
      visible={showFullMap}
      animationType="slide"
      onRequestClose={() => setShowFullMap(false)}
    >
      <View style={styles.fullMapContainer}>
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.fullMap}
          region={mapRegion}
        >
          <Marker coordinate={ride.pickup.coordinates}>
            <View style={styles.fullMapMarker}>
              <MaterialIcon name="location-pin" size={40} color="#3B82F6" />
            </View>
          </Marker>
          
          <Marker coordinate={ride.destination.coordinates}>
            <View style={styles.fullMapMarker}>
              <MaterialIcon name="place" size={40} color="#EF4444" />
            </View>
          </Marker>
          
          {ride.routeCoordinates && (
            <Polyline
              coordinates={ride.routeCoordinates}
              strokeColor="#22C55E"
              strokeWidth={6}
            />
          )}
        </MapView>
        
        <TouchableOpacity 
          style={styles.closeMapButton}
          onPress={() => setShowFullMap(false)}
        >
          <MaterialIcon name="close" size={24} color="#000" />
        </TouchableOpacity>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcon name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Ride Details</Text>
        
        <TouchableOpacity 
          style={styles.shareButton}
          onPress={handleShareReceipt}
        >
          <MaterialIcon name="share" size={24} color="#000000" />
        </TouchableOpacity>
      </View>

      {/* TABS */}
      <View style={styles.tabs}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'details' && styles.activeTab]}
          onPress={() => setActiveTab('details')}
        >
          <Text style={[styles.tabText, activeTab === 'details' && styles.activeTabText]}>
            Details
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'receipt' && styles.activeTab]}
          onPress={() => setActiveTab('receipt')}
        >
          <Text style={[styles.tabText, activeTab === 'receipt' && styles.activeTabText]}>
            Receipt
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'map' && styles.activeTab]}
          onPress={() => setActiveTab('map')}
        >
          <Text style={[styles.tabText, activeTab === 'map' && styles.activeTabText]}>
            Map
          </Text>
        </TouchableOpacity>
      </View>

      {/* CONTENT */}
      {activeTab === 'details' && renderDetailsTab()}
      {activeTab === 'receipt' && renderReceiptTab()}
      {activeTab === 'map' && renderMapTab()}

      {/* ACTION BUTTONS */}
      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={handleRepeatRide}
        >
          <MaterialIcon name="repeat" size={20} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>Repeat Ride</Text>
        </TouchableOpacity>
        
        {activeTab === 'map' && (
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#3B82F6' }]}
            onPress={handleViewFullMap}
          >
            <MaterialIcon name="fullscreen" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Full Screen Map</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: '#6B7280' }]}
          onPress={handleReportIssue}
        >
          <MaterialIcon name="help" size={20} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>Report Issue</Text>
        </TouchableOpacity>
      </View>

      {/* FULL SCREEN MAP MODAL */}
      {renderFullMap()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  
  // HEADER
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // TABS
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#22C55E',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#22C55E',
    fontWeight: '600',
  },
  
  // TAB CONTENT
  tabContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  
  // SECTIONS
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  
  // DRIVER CARD
  driverCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  driverAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  driverInitials: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  driverMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  driverRating: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginLeft: 4,
  },
  driverDivider: {
    fontSize: 14,
    color: '#D1D5DB',
    marginHorizontal: 6,
  },
  driverTrips: {
    fontSize: 14,
    color: '#666',
  },
  driverVehicle: {
    fontSize: 14,
    color: '#666',
  },
  contactButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // SUMMARY GRID
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  summaryItem: {
    width: (width - 64) / 2,
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    margin: 8,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginTop: 4,
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
  },
  
  // FARE BREAKDOWN
  fareBreakdown: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  fareLabel: {
    fontSize: 14,
    color: '#666',
  },
  fareValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  totalRow: {
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#22C55E',
  },
  
  // TIMELINE
  timeline: {
    paddingLeft: 20,
  },
  timelineItem: {
    position: 'relative',
    paddingBottom: 16,
  },
  timelineIcon: {
    position: 'absolute',
    left: -24,
    top: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F9F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineContent: {
    paddingLeft: 12,
  },
  timelineTime: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  timelineStatus: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
  },
  timelineLine: {
    position: 'absolute',
    left: -8,
    top: 32,
    bottom: 0,
    width: 2,
    backgroundColor: '#E5E7EB',
  },
  
  // RATINGS
  ratingsContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
  },
  ratingItem: {
    marginBottom: 12,
  },
  ratingLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  ratingStars: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  ratingComment: {
    fontSize: 14,
    color: '#000000',
    fontStyle: 'italic',
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  
  // RECEIPT TAB
  receiptHeader: {
    backgroundColor: '#22C55E',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  receiptTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 12,
  },
  receiptId: {
    fontSize: 14,
    color: '#FFFFFF',
    marginTop: 4,
    opacity: 0.9,
  },
  receiptDate: {
    fontSize: 14,
    color: '#FFFFFF',
    marginTop: 4,
    opacity: 0.9,
  },
  receiptDetails: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  receiptSection: {
    marginBottom: 20,
  },
  receiptSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 8,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  receiptLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  receiptValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    flex: 1,
    textAlign: 'right',
  },
  receiptDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  receiptTotalRow: {
    marginTop: 4,
  },
  receiptTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  receiptTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#22C55E',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  receiptFooter: {
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  receiptFooterText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#22C55E',
    marginBottom: 8,
  },
  receiptFooterNote: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  
  // MAP TAB
  mapTab: {
    flex: 1,
    position: 'relative',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  mapSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  mapStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  mapStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mapStatText: {
    fontSize: 14,
    color: '#000000',
    marginLeft: 6,
  },
  
  // FULL MAP MODAL
  fullMapContainer: {
    flex: 1,
    position: 'relative',
  },
  fullMap: {
    width: '100%',
    height: '100%',
  },
  fullMapMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeMapButton: {
    position: 'absolute',
    top: 40,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  
  // ACTIONS
  actions: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#22C55E',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});