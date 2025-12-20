// screens/rider/RideActiveScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
  Dimensions,
  ScrollView,
  Animated,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { getUserData } from '@utils/userStorage';
import { useRoute, useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

export default function RideActiveScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { rideData } = route.params || {};
  
  const [rideStatus, setRideStatus] = useState('arriving'); // arriving, ongoing, completed
  const [currentLocation, setCurrentLocation] = useState({
    latitude: -13.9626,
    longitude: 33.7741,
  });
  const [driverLocation, setDriverLocation] = useState({
    latitude: -13.9681,
    longitude: 33.7702,
  });
  const [pickupLocation, setPickupLocation] = useState({
    latitude: -13.9626,
    longitude: 33.7741,
    name: 'Current Location',
    address: 'Your current location',
  });
  const [destination, setDestination] = useState({
    latitude: -13.9583,
    longitude: 33.7689,
    name: 'Area 3 Shopping Complex',
    address: 'Lilongwe, Malawi',
  });
  const [eta, setEta] = useState(8); // minutes
  const [distance, setDistance] = useState(2.5); // km
  const [fare, setFare] = useState(850);
  const [showChat, setShowChat] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { id: 1, sender: 'driver', message: 'I\'m arriving in 2 minutes', time: '10:45 AM' },
    { id: 2, sender: 'you', message: 'Okay, I\'m waiting at the gate', time: '10:46 AM' },
  ]);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [userData, setUserData] = useState(null);
  
  // Driver mock data
  const [driver, setDriver] = useState({
    name: 'John Banda',
    phone: '+265 88 123 4567',
    vehicle: 'Toyota Corolla',
    plate: 'LL 2345 A',
    rating: 4.8,
    trips: 1247,
    photo: null,
  });
  
  // Animation for ETA updates
  const fadeAnim = useRef(new Animated.Value(1)).current;
  
  // Map region
  const [region, setRegion] = useState({
    latitude: -13.9650,
    longitude: 33.7720,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  });
  
  // Route coordinates (mock polyline)
  const routeCoordinates = [
    { latitude: -13.9681, longitude: 33.7702 }, // Driver start
    { latitude: -13.9660, longitude: 33.7710 },
    { latitude: -13.9640, longitude: 33.7720 },
    { latitude: -13.9626, longitude: 33.7741 }, // Pickup
    { latitude: -13.9610, longitude: 33.7725 },
    { latitude: -13.9595, longitude: 33.7700 },
    { latitude: -13.9583, longitude: 33.7689 }, // Destination
  ];

  useEffect(() => {
    const loadUserData = async () => {
      const data = await getUserData();
      setUserData(data);
    };
    loadUserData();
    
    // Simulate ride progression
    const timer = setInterval(() => {
      if (rideStatus === 'arriving' && eta > 0) {
        setEta(prev => Math.max(0, prev - 1));
        
        // Move driver closer
        if (driverLocation.latitude < pickupLocation.latitude) {
          setDriverLocation(prev => ({
            latitude: prev.latitude + 0.0005,
            longitude: prev.longitude + 0.0005,
          }));
        }
        
        // Update ETA animation
        Animated.sequence([
          Animated.timing(fadeAnim, {
            toValue: 0.5,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]).start();
        
        // Auto-transition to ongoing when arrived
        if (eta <= 1) {
          setTimeout(() => {
            setRideStatus('ongoing');
            setEta(15); // Reset ETA for trip
          }, 2000);
        }
      } else if (rideStatus === 'ongoing' && eta > 0) {
        setEta(prev => Math.max(0, prev - 1));
        
        // Move driver toward destination
        if (driverLocation.latitude > destination.latitude) {
          setDriverLocation(prev => ({
            latitude: prev.latitude - 0.0003,
            longitude: prev.longitude - 0.0003,
          }));
        }
        
        // Update distance
        setDistance(prev => Math.max(0, prev - 0.1));
        
        // Auto-complete ride
        if (eta <= 1) {
          setTimeout(() => {
            setRideStatus('completed');
            setTimeout(() => {
              setShowRatingModal(true);
            }, 1000);
          }, 2000);
        }
      }
    }, 60000); // Update every minute (simulated)
    
    return () => clearInterval(timer);
  }, [rideStatus, eta]);

  const handleCallDriver = () => {
    Alert.alert(
      'Call Driver',
      `Call ${driver.name} at ${driver.phone}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call', onPress: () => console.log('Calling driver...') },
      ]
    );
  };

  const handleCancelRide = () => {
    setShowCancelModal(true);
  };

  const confirmCancelRide = (reason) => {
    setShowCancelModal(false);
    Alert.alert(
      'Ride Cancelled',
      `Your ride has been cancelled${reason ? `: ${reason}` : ''}.`,
      [
        { 
          text: 'OK', 
          onPress: () => navigation.goBack() 
        },
      ]
    );
  };

  const handleSOS = () => {
    setShowSOSModal(true);
  };

  const sendSOSAlert = () => {
    setShowSOSModal(false);
    Alert.alert(
      'SOS Alert Sent',
      'Emergency services and your emergency contacts have been notified.',
      [{ text: 'OK' }]
    );
  };

  const handleChatSend = () => {
    if (chatMessage.trim()) {
      const newMessage = {
        id: chatMessages.length + 1,
        sender: 'you',
        message: chatMessage,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages([...chatMessages, newMessage]);
      setChatMessage('');
      
      // Simulate driver response after 2 seconds
      setTimeout(() => {
        const driverResponse = {
          id: chatMessages.length + 2,
          sender: 'driver',
          message: 'Got it, thank you!',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setChatMessages(prev => [...prev, driverResponse]);
      }, 2000);
    }
  };

  const handleRatingSubmit = () => {
    setShowRatingModal(false);
    Alert.alert(
      'Thank You!',
      `You rated ${driver.name} ${rating} stars.`,
      [
        { 
          text: 'OK', 
          onPress: () => navigation.navigate('RideHistory') 
        },
      ]
    );
  };

  const getStatusText = () => {
    switch (rideStatus) {
      case 'arriving': return 'Driver arriving';
      case 'ongoing': return 'On the way';
      case 'completed': return 'Trip completed';
      default: return 'Ride in progress';
    }
  };

  const getStatusColor = () => {
    switch (rideStatus) {
      case 'arriving': return '#FF9500';
      case 'ongoing': return '#22C55E';
      case 'completed': return '#6B7280';
      default: return '#22C55E';
    }
  };

  const getActionButton = () => {
    switch (rideStatus) {
      case 'arriving':
        return (
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#22C55E' }]}
            onPress={() => setRideStatus('ongoing')}
          >
            <MaterialIcon name="check" size={24} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>I'm in the vehicle</Text>
          </TouchableOpacity>
        );
      case 'ongoing':
        return (
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#22C55E' }]}
            onPress={() => {
              setRideStatus('completed');
              setTimeout(() => setShowRatingModal(true), 1000);
            }}
          >
            <MaterialIcon name="check-circle" size={24} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Complete Ride</Text>
          </TouchableOpacity>
        );
      default:
        return null;
    }
  };

  const renderChatMessage = ({ item }) => (
    <View style={[
      styles.chatMessage, 
      item.sender === 'you' ? styles.chatMessageSent : styles.chatMessageReceived
    ]}>
      <Text style={[
        styles.chatMessageText,
        item.sender === 'you' ? styles.chatMessageTextSent : styles.chatMessageTextReceived
      ]}>
        {item.message}
      </Text>
      <Text style={styles.chatMessageTime}>{item.time}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* MAP */}
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={region}
        showsUserLocation={true}
      >
        {/* Pickup Marker */}
        <Marker
          coordinate={pickupLocation}
          title="Pickup"
          pinColor="#3B82F6"
        >
          <View style={styles.pickupMarker}>
            <MaterialIcon name="location-pin" size={30} color="#3B82F6" />
          </View>
        </Marker>

        {/* Destination Marker */}
        <Marker
          coordinate={destination}
          title="Destination"
          pinColor="#EF4444"
        >
          <View style={styles.destinationMarker}>
            <MaterialIcon name="place" size={30} color="#EF4444" />
          </View>
        </Marker>

        {/* Driver Marker */}
        <Marker
          coordinate={driverLocation}
          title={driver.name}
          description={driver.vehicle}
        >
          <View style={styles.driverMarker}>
            <View style={styles.driverMarkerInner}>
              <MaterialIcon name="directions-car" size={20} color="#FFFFFF" />
            </View>
          </View>
        </Marker>

        {/* Route Polyline */}
        <Polyline
          coordinates={routeCoordinates}
          strokeColor="#22C55E"
          strokeWidth={4}
          lineDashPattern={[10, 10]}
        />
      </MapView>

      {/* TOP BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcon name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        
        <View style={styles.statusBadge}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
          <Text style={styles.statusText}>{getStatusText()}</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.sosButton}
          onPress={handleSOS}
        >
          <MaterialIcon name="emergency" size={20} color="#FFFFFF" />
          <Text style={styles.sosText}>SOS</Text>
        </TouchableOpacity>
      </View>

      {/* DRIVER INFO CARD */}
      <View style={styles.driverCard}>
        <View style={styles.driverInfo}>
          <View style={styles.driverAvatar}>
            <Text style={styles.driverInitials}>
              {driver.name.split(' ').map(n => n[0]).join('')}
            </Text>
          </View>
          <View style={styles.driverDetails}>
            <Text style={styles.driverName}>{driver.name}</Text>
            <View style={styles.driverMeta}>
              <MaterialIcon name="star" size={14} color="#F59E0B" />
              <Text style={styles.driverRating}>{driver.rating}</Text>
              <Text style={styles.driverDivider}>•</Text>
              <Text style={styles.driverTrips}>{driver.trips} trips</Text>
            </View>
            <Text style={styles.driverVehicle}>
              {driver.vehicle} • {driver.plate}
            </Text>
          </View>
        </View>
        
        <View style={styles.driverActions}>
          <TouchableOpacity 
            style={styles.driverActionButton}
            onPress={handleCallDriver}
          >
            <MaterialIcon name="phone" size={20} color="#22C55E" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.driverActionButton}
            onPress={() => setShowChat(true)}
          >
            <MaterialIcon name="chat" size={20} color="#22C55E" />
          </TouchableOpacity>
        </View>
      </View>

      {/* RIDE INFO CARD */}
      <View style={styles.rideInfoCard}>
        <View style={styles.rideInfoRow}>
          <View style={styles.rideInfoItem}>
            <MaterialIcon name="access-time" size={20} color="#666" />
            <Animated.Text style={[styles.rideInfoValue, { opacity: fadeAnim }]}>
              {eta} min
            </Animated.Text>
            <Text style={styles.rideInfoLabel}>ETA</Text>
          </View>
          
          <View style={styles.rideInfoDivider} />
          
          <View style={styles.rideInfoItem}>
            <MaterialIcon name="map" size={20} color="#666" />
            <Text style={styles.rideInfoValue}>{distance.toFixed(1)} km</Text>
            <Text style={styles.rideInfoLabel}>Distance</Text>
          </View>
          
          <View style={styles.rideInfoDivider} />
          
          <View style={styles.rideInfoItem}>
            <MaterialIcon name="attach-money" size={20} color="#666" />
            <Text style={styles.rideInfoValue}>MK {fare}</Text>
            <Text style={styles.rideInfoLabel}>Fare</Text>
          </View>
        </View>
      </View>

      {/* LOCATION INFO */}
      <View style={styles.locationCard}>
        <View style={styles.locationRow}>
          <View style={styles.locationDot}>
            <MaterialIcon name="circle" size={12} color="#3B82F6" />
          </View>
          <View style={styles.locationInfo}>
            <Text style={styles.locationLabel}>Pickup</Text>
            <Text style={styles.locationText}>{pickupLocation.address}</Text>
          </View>
        </View>
        
        <View style={styles.routeLine} />
        
        <View style={styles.locationRow}>
          <View style={styles.locationDot}>
            <MaterialIcon name="place" size={12} color="#EF4444" />
          </View>
          <View style={styles.locationInfo}>
            <Text style={styles.locationLabel}>Destination</Text>
            <Text style={styles.locationText}>{destination.address}</Text>
          </View>
        </View>
      </View>

      {/* ACTION BUTTON */}
      <View style={styles.actionContainer}>
        {getActionButton()}
        
        {rideStatus !== 'completed' && (
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={handleCancelRide}
          >
            <Text style={styles.cancelButtonText}>Cancel Ride</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* CHAT MODAL */}
      <Modal
        visible={showChat}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.chatModal}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatTitle}>Chat with {driver.name}</Text>
            <TouchableOpacity onPress={() => setShowChat(false)}>
              <MaterialIcon name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.chatMessages}>
            {chatMessages.map((msg) => (
              <View key={msg.id} style={[
                styles.chatMessage, 
                msg.sender === 'you' ? styles.chatMessageSent : styles.chatMessageReceived
              ]}>
                <Text style={[
                  styles.chatMessageText,
                  msg.sender === 'you' ? styles.chatMessageTextSent : styles.chatMessageTextReceived
                ]}>
                  {msg.message}
                </Text>
                <Text style={styles.chatMessageTime}>{msg.time}</Text>
              </View>
            ))}
          </ScrollView>
          
          <View style={styles.chatInputContainer}>
            <TextInput
              style={styles.chatInput}
              placeholder="Type a message..."
              value={chatMessage}
              onChangeText={setChatMessage}
              onSubmitEditing={handleChatSend}
            />
            <TouchableOpacity 
              style={styles.chatSendButton}
              onPress={handleChatSend}
            >
              <MaterialIcon name="send" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* CANCEL MODAL */}
      <Modal
        visible={showCancelModal}
        animationType="fade"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cancel Ride?</Text>
            <Text style={styles.modalSubtitle}>
              You may be charged a cancellation fee if you cancel now.
            </Text>
            
            {['Driver taking too long', 'Change of plans', 'Found another ride', 'Emergency'].map((reason) => (
              <TouchableOpacity 
                key={reason}
                style={styles.cancelReason}
                onPress={() => confirmCancelRide(reason)}
              >
                <Text style={styles.cancelReasonText}>{reason}</Text>
              </TouchableOpacity>
            ))}
            
            <TouchableOpacity 
              style={styles.modalCancelButton}
              onPress={() => setShowCancelModal(false)}
            >
              <Text style={styles.modalCancelButtonText}>Continue Ride</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* SOS MODAL */}
      <Modal
        visible={showSOSModal}
        animationType="fade"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: '#FEF2F2' }]}>
            <View style={styles.sosIcon}>
              <MaterialIcon name="emergency" size={48} color="#EF4444" />
            </View>
            <Text style={[styles.modalTitle, { color: '#DC2626' }]}>Emergency SOS</Text>
            <Text style={styles.modalSubtitle}>
              This will notify emergency services and your emergency contacts.
              Only use in case of a real emergency.
            </Text>
            
            <TouchableOpacity 
              style={[styles.sosConfirmButton, { backgroundColor: '#EF4444' }]}
              onPress={sendSOSAlert}
            >
              <Text style={styles.sosConfirmText}>SEND SOS ALERT</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.modalCancelButton}
              onPress={() => setShowSOSModal(false)}
            >
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* RATING MODAL */}
      <Modal
        visible={showRatingModal}
        animationType="fade"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rate Your Driver</Text>
            <Text style={styles.modalSubtitle}>
              How was your ride with {driver.name}?
            </Text>
            
            <View style={styles.ratingStars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity 
                  key={star}
                  onPress={() => setRating(star)}
                >
                  <MaterialIcon 
                    name={star <= rating ? "star" : "star-border"} 
                    size={40} 
                    color="#F59E0B" 
                  />
                </TouchableOpacity>
              ))}
            </View>
            
            <TextInput
              style={styles.ratingComment}
              placeholder="Add a comment (optional)"
              multiline
              numberOfLines={3}
            />
            
            <TouchableOpacity 
              style={[styles.modalButton, { backgroundColor: '#22C55E' }]}
              onPress={handleRatingSubmit}
            >
              <Text style={styles.modalButtonText}>Submit Rating</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  
  // TOP BAR
  topBar: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  sosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  sosText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  
  // DRIVER CARD
  driverCard: {
    position: 'absolute',
    top: 100,
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
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
    color: '#000',
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
  driverActions: {
    flexDirection: 'row',
  },
  driverActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  
  // RIDE INFO CARD
  rideInfoCard: {
    position: 'absolute',
    top: 190,
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  rideInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rideInfoItem: {
    alignItems: 'center',
    flex: 1,
  },
  rideInfoValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 4,
  },
  rideInfoLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  rideInfoDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
  },
  
  // LOCATION CARD
  locationCard: {
    position: 'absolute',
    bottom: 140,
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  locationDot: {
    marginRight: 12,
    marginTop: 2,
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  locationText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: '#D1D5DB',
    marginLeft: 5,
    marginVertical: 4,
  },
  
  // ACTION CONTAINER
  actionContainer: {
    position: 'absolute',
    bottom: 40,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22C55E',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  cancelButton: {
    paddingVertical: 12,
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#666',
    textDecorationLine: 'underline',
  },
  
  // MAP MARKERS
  pickupMarker: {
    alignItems: 'center',
  },
  destinationMarker: {
    alignItems: 'center',
  },
  driverMarker: {
    alignItems: 'center',
  },
  driverMarkerInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  
  // CHAT MODAL
  chatModal: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: height * 0.7,
    paddingTop: 20,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  chatMessages: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  chatMessage: {
    maxWidth: '80%',
    marginBottom: 16,
    padding: 12,
    borderRadius: 16,
  },
  chatMessageSent: {
    alignSelf: 'flex-end',
    backgroundColor: '#22C55E',
    borderBottomRightRadius: 4,
  },
  chatMessageReceived: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: 4,
  },
  chatMessageText: {
    fontSize: 14,
  },
  chatMessageTextSent: {
    color: '#FFFFFF',
  },
  chatMessageTextReceived: {
    color: '#000',
  },
  chatMessageTime: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
  },
  chatSendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  
  // MODALS
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: width * 0.85,
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  cancelReason: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  cancelReasonText: {
    fontSize: 16,
    color: '#000',
    textAlign: 'center',
  },
  modalCancelButton: {
    paddingVertical: 16,
    marginTop: 8,
  },
  modalCancelButtonText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  sosIcon: {
    alignItems: 'center',
    marginBottom: 16,
  },
  sosConfirmButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  sosConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalButton: {
    backgroundColor: '#22C55E',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  ratingStars: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 24,
  },
  ratingComment: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
});