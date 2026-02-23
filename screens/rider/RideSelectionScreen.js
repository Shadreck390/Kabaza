// screens/rider/RideSelectionScreen.js - PROPERLY FIXED VERSION
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
  StatusBar,
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  TextInput,
  Modal,
  SafeAreaView,
  FlatList,
} from 'react-native';
import { MaterialIconFallback as MaterialIcon } from '@src/utils/iconUtils';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import Geolocation from 'react-native-geolocation-service';
import { useFocusEffect } from '@react-navigation/native';

import apiClient from '@src/services/api/client';
import realTimeService from '@src/services/socket/realtimeUpdates';
import { getUserData } from '@src/utils/userStorage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Helper function to format Malawi Kwacha
const formatMK = (amount) => {
  return `MK${Math.round(amount).toLocaleString()}`;
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const MOCK_DRIVERS = [
  { 
    id: '1', 
    vehicleType: 'car', 
    location: { latitude: -13.9650, longitude: 33.7750 },
    name: 'John M.',
    rating: 4.8,
    distance: 0.5,
    eta: '2 min',
  },
];

const SURGE_COLORS = {
  low: '#10B981',
  medium: '#F59E0B',
  high: '#EF4444',
  very_high: '#DC2626'
};

export default function RideSelectionScreen({ route, navigation }) {
  const { 
    destination, 
    destinationAddress, 
    destinationCoordinates, 
    pickupLocation, 
    pickupCoordinates 
  } = route.params || {};
  
  const [selectedRide, setSelectedRide] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [loading, setLoading] = useState(false);
  const [distance, setDistance] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState('5 min');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [user, setUser] = useState(null);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoError, setPromoError] = useState('');
  const [usePromo, setUsePromo] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState(0);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const bottomSheetAnim = useRef(new Animated.Value(SCREEN_HEIGHT * 0.4)).current;
  
  // Refs
  const mapRef = useRef(null);
  const scrollViewRef = useRef(null);
  
  // Ride options with correct pricing from your images
  const rideOptions = [
    { 
      id: 'recommended', 
      name: 'Recommended', 
      icon: 'car', 
      description: 'Affordable rides', 
      time: '5 min', 
      basePrice: 24055, 
      color: '#06C167',
      vehicleType: 'car',
    },
    { 
      id: 'faster', 
      name: 'Faster', 
      icon: 'car', 
      description: 'Mid-size cars', 
      time: '3 min', 
      basePrice: 32880, 
      color: '#3B82F6',
      vehicleType: 'car',
    },
    { 
      id: 'cheaper', 
      name: 'Cheaper', 
      icon: 'car', 
      description: 'Wait and Save', 
      time: '10–20 min', 
      basePrice: 24055, 
      color: '#F59E0B',
      vehicleType: 'car_economy',
    },
    { 
      id: 'comfort', 
      name: 'Comfort', 
      icon: 'car', 
      description: 'Full-size cars', 
      time: '3 min', 
      basePrice: 32880, 
      color: '#8B5CF6',
      vehicleType: 'car_comfort',
    },
    { 
      id: 'premium', 
      name: 'Premium', 
      icon: 'car', 
      description: 'Mid-size premium cars', 
      time: '11 min', 
      basePrice: 171395, 
      color: '#EC4899',
      vehicleType: 'car_premium',
    },
    { 
      id: 'xl', 
      name: 'XL', 
      icon: 'car', 
      description: 'Seating for 6', 
      time: '3 min', 
      basePrice: 50035, 
      color: '#F97316',
      vehicleType: 'car_xl',
    },
  ];

  const paymentMethods = [
    { id: 'cash', name: 'Cash', icon: 'attach-money', color: '#10B981' },
    { id: 'card', name: 'Card', icon: 'credit-card', color: '#3B82F6' },
    { id: 'mobile', name: 'Mobile Money', icon: 'smartphone', color: '#8B5CF6' },
  ];

  useFocusEffect(
    React.useCallback(() => {
      animateIn();
      return () => {};
    }, [])
  );

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userData = await getUserData();
        setUser(userData);
      } catch (error) {
        console.error('Failed to load user data:', error);
      }
    };
    
    loadUserData();
    fetchCurrentLocation();
    calculateRouteDistance();
    
    return () => {};
  }, []);

  const animateIn = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(slideUpAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const fetchCurrentLocation = () => {
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ latitude, longitude });
      },
      (error) => {
        console.log('Location error:', error);
        setCurrentLocation({ latitude: -13.9626, longitude: 33.7741 });
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const calculateRouteDistance = () => {
    if (pickupCoordinates && destinationCoordinates) {
      const dist = calculateDistance(
        pickupCoordinates.latitude,
        pickupCoordinates.longitude,
        destinationCoordinates.latitude,
        destinationCoordinates.longitude
      );
      
      const roundedDistance = Math.max(0.5, Math.round(dist * 10) / 10);
      setDistance(roundedDistance);
      
      const timeMinutes = Math.round((roundedDistance / 30) * 60);
      const minTime = Math.max(3, timeMinutes - 2);
      const maxTime = Math.max(5, timeMinutes + 2);
      setEstimatedTime(`${minTime}-${maxTime} min`);
    }
  };

  // 🛑 FIXED: This function ONLY selects the ride, does NOT confirm
  const handleSelectRide = (ride) => {
    console.log('Selected ride:', ride.name);
    setSelectedRide(ride.id);
    
    // No setTimeout, no navigation - just selection
  };

  // 🛑 FIXED: This function handles the confirmation separately
  const handleConfirmRide = async () => {
    if (!selectedRide) {
      Alert.alert('Select a Ride', 'Please select a ride option before confirming.');
      return;
    }

    const rideData = rideOptions.find(r => r.id === selectedRide);
    if (!rideData) {
      Alert.alert('Invalid Ride', 'Please select a valid ride option.');
      return;
    }

    setLoading(true);
    
    try {
      // Generate a mock request ID
      const requestId = `ride_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Navigate to confirmation screen
      navigation.navigate('RideConfirmation', {
        ride: {
          ...rideData,
          price: rideData.basePrice,
          formattedPrice: formatMK(rideData.basePrice),
          estimatedTime: estimatedTime,
          distance: distance,
          surgeMultiplier: 1.0,
          surgeLevel: 'low',
        },
        destination: destination || 'Selected Destination',
        destinationAddress: destinationAddress || '',
        destinationCoords: destinationCoordinates,
        pickupLocation: pickupLocation || 'Your Location',
        pickupCoords: pickupCoordinates || currentLocation,
        riderInfo: { 
          paymentMethod, 
          usePromo,
          promoDiscount: promoDiscount,
          userId: user?.id || 'user_123',
          userName: user?.name || 'Rider',
        },
        socketRequestId: requestId,
      });
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Failed to request ride. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePromoApply = () => {
    setPromoError('');
    
    if (!promoCode.trim()) {
      setPromoError('Please enter a promo code');
      return;
    }
    
    const validPromos = ['WELCOME20', 'RIDE10', 'SAVE15', 'KABAZA25'];
    
    if (validPromos.includes(promoCode.toUpperCase())) {
      const discount = parseInt(promoCode.toUpperCase().replace(/\D/g, '')) || 10;
      setPromoDiscount(discount);
      setUsePromo(true);
      setShowPromoModal(false);
      setPromoCode('');
    } else {
      setPromoError('Invalid promo code');
    }
  };

  const renderRideOption = (ride) => {
    const isSelected = selectedRide === ride.id;
    
    return (
      <TouchableOpacity 
        key={ride.id} 
        style={[
          styles.rideOption, 
          isSelected && styles.rideOptionSelected,
        ]} 
        onPress={() => handleSelectRide(ride)} // 🛑 Just selects, doesn't confirm
        activeOpacity={0.7}
      >
        <View style={styles.rideIconContainer}>
          <View style={[styles.rideIcon, { backgroundColor: ride.color + '20' }]}>
            <FontAwesome5 name={ride.icon} size={20} color={ride.color} />
          </View>
        </View>
        
        <View style={styles.rideInfo}>
          <View style={styles.rideHeader}>
            <Text style={[styles.rideName, isSelected && styles.rideNameSelected]}>
              {ride.name}
            </Text>
            <View style={styles.rideMeta}>
              <MaterialIcon name="local-offer" size={20} color={usePromo ? "#06C167" : "#666"} />
              <Text style={[styles.rideMetaText, isSelected && styles.rideMetaTextSelected]}>
                {ride.time}
              </Text>
            </View>
          </View>
          
          <Text style={[styles.rideDescription, isSelected && styles.rideDescriptionSelected]}>
            {ride.description}
          </Text>
        </View>
        
        <View style={styles.priceContainer}>
          <Text style={[styles.price, isSelected && styles.priceSelected]}>
            {formatMK(ride.basePrice)}
          </Text>
        </View>
        
        {isSelected && (
          <View style={styles.selectedIndicator}>
            <MaterialIcon name="check" size={16} color="#FFF" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderPromoModal = () => (
    <Modal
      visible={showPromoModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowPromoModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Apply Promo Code</Text>
            <TouchableOpacity onPress={() => setShowPromoModal(false)}>
              <MaterialIcon name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalBody}>
            <TextInput
              style={styles.promoInput}
              placeholder="Enter promo code"
              value={promoCode}
              onChangeText={setPromoCode}
              autoCapitalize="characters"
              maxLength={20}
            />
            
            {promoError ? (
              <Text style={styles.promoError}>{promoError}</Text>
            ) : (
              <Text style={styles.promoHint}>
                Try: WELCOME20, RIDE10, SAVE15
              </Text>
            )}
            
            <TouchableOpacity 
              style={styles.applyButton}
              onPress={handlePromoApply}
            >
              <Text style={styles.applyButtonText}>Apply Promo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const pickupCoords = pickupCoordinates || currentLocation || 
    { latitude: -13.9626, longitude: 33.7741 };

  const destCoords = destinationCoordinates || 
    { latitude: -13.9897, longitude: 33.7777 };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* HEADER */}
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {destination || 'Select Destination'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {distance > 0 ? `${distance} km • ${estimatedTime}` : 'Calculating...'}
          </Text>
        </View>
      </Animated.View>

      {/* MAP */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={{ 
            latitude: -13.9762, 
            longitude: 33.7741, 
            latitudeDelta: 0.05, 
            longitudeDelta: 0.05 
          }}
          scrollEnabled={true}
          zoomEnabled={true}
          showsUserLocation={true}
        >
          <Marker coordinate={pickupCoords}>
            <View style={[styles.marker, styles.pickupMarker]}>
              <MaterialIcon name="my-location" size={16} color="#FFF" />
            </View>
          </Marker>
          
          <Marker coordinate={destCoords}>
            <View style={[styles.marker, styles.destinationMarker]}>
              <MaterialIcon name="place" size={16} color="#FFF" />
            </View>
          </Marker>
          
          <Polyline 
            coordinates={[pickupCoords, destCoords]} 
            strokeColor="#06C167" 
            strokeWidth={3}
          />
        </MapView>
      </View>

      {/* 🛑 FIXED: BOTTOM SHEET WITHOUT PANRESPONDER FOR NORMAL SCROLLING */}
      <Animated.View 
        style={[
          styles.bottomSheet,
          { 
            height: bottomSheetAnim,
            transform: [{ translateY: slideUpAnim }],
          }
        ]}
      >
        <View style={styles.dragHandleContainer}>
          <View style={styles.dragHandle} />
        </View>

        {/* 🛑 FIXED: Simple ScrollView without gesture conflicts */}
        <ScrollView 
          ref={scrollViewRef}
          style={styles.scrollView}
          showsVerticalScrollIndicator={true}
          scrollEnabled={true}
          bounces={true}
        >
          {/* Payment Method */}
          <View style={styles.paymentSection}>
            <Text style={styles.sectionTitle}>Pay with</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.paymentOptions}
            >
              {paymentMethods.map((method) => (
                <TouchableOpacity
                  key={method.id}
                  style={[
                    styles.paymentOption,
                    paymentMethod === method.id && styles.paymentOptionSelected,
                  ]}
                  onPress={() => setPaymentMethod(method.id)}
                >
                  <View style={[
                    styles.paymentIconContainer,
                    { backgroundColor: paymentMethod === method.id ? method.color : '#F3F4F6' }
                  ]}>
                    <MaterialIcon 
                      name={method.icon} 
                      size={20} 
                      color={paymentMethod === method.id ? "#FFF" : method.color} 
                    />
                  </View>
                  <Text style={[
                    styles.paymentText,
                    paymentMethod === method.id && styles.paymentTextSelected,
                  ]}>
                    {method.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Ride Options */}
          <View style={styles.rideOptionsSection}>
            <Text style={styles.sectionTitle}>Select Economy</Text>
            <Text style={styles.sectionSubtitle}>Choose a ride option</Text>
            
            {rideOptions.map(renderRideOption)}
          </View>

          {/* Promo Section */}
          <View style={styles.promoSection}>
            <TouchableOpacity 
              style={styles.promoButton}
              onPress={() => setShowPromoModal(true)}
            >
              <MaterialIcon 
                name={usePromo ? "local-offer" : "confirmation-number"} 
                size={20} 
                color={usePromo ? "#06C167" : "#666"} 
              />
              <Text style={[styles.promoText, usePromo && styles.promoTextActive]}>
                {usePromo 
                  ? `${promoDiscount}% OFF Applied` 
                  : 'Have a promo code?'}
              </Text>
              {!usePromo && (
                <MaterialIcon name="chevron-right" size={20} color="#666" />
              )}
            </TouchableOpacity>
          </View>

          {/* Safety Info */}
          <View style={styles.safetySection}>
            <View style={styles.safetyItem}>
              <MaterialIcon name="verified-user" size={14} color="#10B981" />
              <Text style={styles.safetyText}>Verified Drivers</Text>
            </View>
            <View style={styles.safetyItem}>
              <MaterialIcon name="location-on" size={14} color="#3B82F6" />
              <Text style={styles.safetyText}>Live Tracking</Text>
            </View>
            <View style={styles.safetyItem}>
              <MaterialIcon name="support-agent" size={14} color="#F59E0B" />
              <Text style={styles.safetyText}>24/7 Support</Text>
            </View>
          </View>

          {/* Extra padding for confirm button */}
          <View style={{ height: 100 }} />
        </ScrollView>
      </Animated.View>

      {/* 🛑 FIXED: Confirm Button SEPARATE from ScrollView */}
      <View style={styles.confirmContainer}>
        <TouchableOpacity 
          style={[
            styles.confirmButton,
            (!selectedRide || loading) && styles.confirmButtonDisabled,
          ]} 
          onPress={handleConfirmRide} // 🛑 Only confirms when button is pressed
          disabled={!selectedRide || loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <>
              <Text style={styles.confirmButtonText}>
                {selectedRide 
                  ? `Book ${rideOptions.find(r => r.id === selectedRide)?.name} Ride`
                  : 'Select a ride'}
              </Text>
              {selectedRide && (
                <Text style={styles.confirmButtonPrice}>
                  {formatMK(rideOptions.find(r => r.id === selectedRide)?.basePrice || 0)}
                </Text>
              )}
            </>
          )}
        </TouchableOpacity>
      </View>

      {renderPromoModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FFFFFF' 
  },
  
  // HEADER
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingTop: Platform.OS === 'ios' ? 12 : 40,
    paddingBottom: 12, 
    backgroundColor: '#FFFFFF', 
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    elevation: 4,
  },
  backButton: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#F3F4F6',
    marginRight: 12,
  },
  headerCenter: { 
    flex: 1, 
  },
  headerTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#000', 
    marginBottom: 2,
  },
  headerSubtitle: { 
    fontSize: 12, 
    color: '#666', 
  },
  
  // MAP
  mapContainer: { 
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  map: { 
    width: '100%', 
    height: '100%' 
  },
  marker: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 3, 
    borderColor: '#FFF',
    elevation: 6,
  },
  pickupMarker: { 
    backgroundColor: '#06C167' 
  },
  destinationMarker: { 
    backgroundColor: '#EA4335' 
  },
  
  // 🛑 FIXED: BOTTOM SHEET
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    overflow: 'hidden',
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 8,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
  },
  scrollView: {
    flex: 1,
  },
  
  // PAYMENT
  paymentSection: { 
    paddingHorizontal: 20, 
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sectionTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#000', 
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  paymentOptions: {
    flexDirection: 'row',
  },
  paymentOption: {
    alignItems: 'center',
    marginRight: 16,
  },
  paymentOptionSelected: {},
  paymentIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  paymentText: { 
    fontSize: 12, 
    color: '#666', 
    fontWeight: '500',
  },
  paymentTextSelected: { 
    color: '#000',
    fontWeight: '600',
  },
  
  // RIDE OPTIONS
  rideOptionsSection: { 
    paddingHorizontal: 20, 
    paddingTop: 16,
    paddingBottom: 8,
  },
  rideOption: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F8F9FA', 
    borderRadius: 12, 
    padding: 12, 
    marginBottom: 8, 
    borderWidth: 2, 
    borderColor: 'transparent',
    position: 'relative',
  },
  rideOptionSelected: { 
    backgroundColor: '#06C167',
    borderColor: '#06C167',
  },
  rideIconContainer: { 
    marginRight: 12,
  },
  rideIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rideInfo: { 
    flex: 1,
  },
  rideHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 2,
  },
  rideName: { 
    fontSize: 15, 
    fontWeight: '600', 
    color: '#000',
  },
  rideNameSelected: { 
    color: '#FFF',
  },
  rideMeta: { 
    flexDirection: 'row', 
    alignItems: 'center',
  },
  rideMetaText: { 
    fontSize: 12, 
    color: '#666', 
    marginLeft: 4,
  },
  rideMetaTextSelected: { 
    color: '#FFF',
  },
  rideDescription: { 
    fontSize: 12, 
    color: '#666',
  },
  rideDescriptionSelected: { 
    color: '#FFF',
  },
  priceContainer: { 
    alignItems: 'flex-end', 
    marginLeft: 12,
  },
  price: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#000',
  },
  priceSelected: { 
    color: '#FFF',
  },
  selectedIndicator: { 
    position: 'absolute', 
    top: -4, 
    right: -4, 
    width: 20, 
    height: 20, 
    borderRadius: 10, 
    backgroundColor: '#FFFFFF', 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#06C167',
  },
  
  // PROMO
  promoSection: { 
    paddingHorizontal: 20, 
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  promoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  promoText: { 
    fontSize: 14, 
    color: '#666', 
    fontWeight: '500',
    flex: 1,
    marginLeft: 12,
  },
  promoTextActive: { 
    color: '#06C167',
  },
  
  // SAFETY
  safetySection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  safetyItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  safetyText: {
    fontSize: 11,
    color: '#666',
    marginLeft: 6,
    fontWeight: '500',
  },
  
  // 🛑 FIXED: CONFIRM BUTTON SEPARATE
  confirmContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    zIndex: 1000,
  },
  confirmButton: {
    backgroundColor: '#06C167',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmButtonDisabled: { 
    backgroundColor: '#E5E7EB',
  },
  confirmButtonText: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#FFF',
  },
  confirmButtonPrice: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
    fontWeight: '500',
  },
  
  // MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: SCREEN_WIDTH - 40,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  modalBody: {},
  promoInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  promoHint: {
    fontSize: 12,
    color: '#666',
    marginBottom: 16,
  },
  promoError: {
    fontSize: 12,
    color: '#EF4444',
    marginBottom: 16,
  },
  applyButton: {
    backgroundColor: '#06C167',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});