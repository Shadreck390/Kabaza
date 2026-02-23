import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
  Platform,
  Animated,
  ScrollView,
  SafeAreaView,
  Easing,
  Dimensions,
  Image,
} from 'react-native';

import { MaterialIconFallback as MaterialIcon } from '@src/utils/iconUtils';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import LinearGradient from 'react-native-linear-gradient';

import realTimeService from '@services/socket/realtimeUpdates';
import { getUserData } from '@src/utils/userStorage';
import { useNavigation, useRoute } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

// Helper function to format Malawi Kwacha
const formatMK = (amount) => {
  const rounded = Math.round(amount);
  return `MK ${rounded.toLocaleString()}`;
};

const AnimatedView = Animated.createAnimatedComponent(View);

export default function RideConfirmationScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  
  const { 
    ride, 
    destination, 
    destinationAddress, 
    pickupLocation, 
    riderInfo, 
    pickupCoords, 
    destinationCoords,
    socketRequestId
  } = route.params || {};
  
  const { paymentMethod, usePromo, userId, userName } = riderInfo || {};
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [estimatedArrival, setEstimatedArrival] = useState(ride?.estimatedTime || '5-10 min');

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const confirmButtonScale = useRef(new Animated.Value(1)).current;
  const connectionPulse = useRef(new Animated.Value(1)).current;

  // Calculate prices
  const basePrice = ride?.basePrice || 0;
  const surgeMultiplier = ride?.surgeMultiplier || 1.0;
  const surgePrice = basePrice * surgeMultiplier;
  const discountedPrice = usePromo ? Math.round(surgePrice * 0.8) : Math.round(surgePrice);
  const finalPrice = discountedPrice;

  useEffect(() => {
    // Initial animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Connection pulse animation
    if (connectionStatus === 'connected') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(connectionPulse, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(connectionPulse, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }

    // Load user data
    const loadUser = async () => {
      try {
        const userData = await getUserData();
        setUser(userData);
        
        // Check socket connection status
        const status = realTimeService.getConnectionStatus();
        setConnectionStatus(status.isConnected ? 'connected' : 'disconnected');
        
        // Listen for connection changes
        realTimeService.addConnectionListener((connected) => {
          setConnectionStatus(connected ? 'connected' : 'disconnected');
        });
      } catch (error) {
        console.error('Failed to load user data:', error);
      }
    };
    
    loadUser();
    
    return () => {
      realTimeService.removeConnectionListener();
      connectionPulse.stopAnimation();
    };
  }, [connectionStatus]);

  const handleConfirmRide = async () => {
    // Button press animation
    Animated.sequence([
      Animated.spring(confirmButtonScale, {
        toValue: 0.95,
        useNativeDriver: true,
        tension: 150,
        friction: 3,
      }),
      Animated.spring(confirmButtonScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 150,
        friction: 3,
      }),
    ]).start();

    // Check connection first
    if (connectionStatus !== 'connected') {
      Alert.alert(
        'Connection Required',
        'Please check your internet connection to request a ride.',
        [
          { 
            text: 'Try Again', 
            onPress: () => {
              realTimeService.connectSocket();
              setTimeout(() => {
                const status = realTimeService.getConnectionStatus();
                setConnectionStatus(status.isConnected ? 'connected' : 'disconnected');
              }, 2000);
            }
          },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
      return;
    }

    if (!user) {
      Alert.alert('Error', 'User information not loaded. Please try again.');
      return;
    }

    try {
      setLoading(true);

      // Prepare ride data
      const rideData = {
        requestId: socketRequestId || `ride_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        riderId: userId || user.id,
        riderName: userName || user.name || 'Rider',
        riderPhone: user.phone,
        rideType: ride.name,
        vehicleType: ride.vehicleType,
        pickupLocation: {
          address: pickupLocation || 'Your Location',
          coordinates: pickupCoords || { latitude: -13.9626, longitude: 33.7741 }
        },
        destination: {
          address: destinationAddress || destination,
          coordinates: destinationCoords || { latitude: -13.9897, longitude: 33.7777 }
        },
        paymentMethod: paymentMethod || 'cash',
        estimatedPrice: finalPrice,
        actualPrice: finalPrice,
        distance: ride.distance || 0,
        estimatedTime: estimatedArrival,
        surgeMultiplier: surgeMultiplier,
        promoCode: usePromo ? 'PROMO20' : null,
        status: 'pending',
        createdAt: new Date().toISOString(),
        riderRating: user.rating || 4.5
      };

      console.log('Sending ride request:', rideData);

      // Send real-time ride request
      const requestSent = realTimeService.requestRide(rideData);
      
      if (requestSent) {
        console.log('Ride request sent successfully:', rideData.requestId);
        
        // Navigate to waiting screen
        navigation.navigate('RideWaiting', {
          rideId: rideData.requestId,
          rideData: {
            ...ride,
            price: finalPrice,
            formattedPrice: formatMK(finalPrice),
            estimatedTime: estimatedArrival,
            distance: ride.distance,
            surgeMultiplier: surgeMultiplier,
            isSurge: surgeMultiplier > 1.0
          },
          pickup: pickupLocation,
          destination: destination || destinationAddress,
          paymentMethod: paymentMethod,
        });
      } else {
        Alert.alert('Request Failed', 'Failed to send ride request. Please try again.');
      }
    } catch (error) {
      console.error('Ride request error:', error);
      Alert.alert('Error', 'Failed to request ride. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return '#06C167';
      case 'disconnected': return '#EA4335';
      case 'checking': return '#FBBC05';
      default: return '#666';
    }
  };

  const getPaymentIcon = () => {
    switch (paymentMethod) {
      case 'cash': return 'money';
      case 'card': return 'credit-card';
      case 'mobile': return 'mobile';
      default: return 'money';
    }
  };

  const getPaymentText = () => {
    switch (paymentMethod) {
      case 'cash': return 'Cash';
      case 'card': return 'Card';
      case 'mobile': return 'Mobile Money';
      default: return 'Cash';
    }
  };

  // Don't render if ride data is missing
  if (!ride) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcon name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Error</Text>
          <View style={{ width: 44 }} />
        </View>
        
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Ride information missing</Text>
          <Text style={styles.errorSubtext}>Please go back and select a ride again</Text>
          <TouchableOpacity 
            style={styles.errorButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <Animated.View 
        style={[
          styles.header,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <MaterialIcon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Confirm Your Ride</Text>
          <View style={[styles.connectionStatus, { backgroundColor: getConnectionStatusColor() }]}>
            <Text style={styles.connectionStatusText}>
              {connectionStatus === 'connected' ? 'ONLINE' : 'OFFLINE'}
            </Text>
          </View>
        </View>
        
        <View style={{ width: 44 }} />
      </Animated.View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Ride Type Badge */}
        <Animated.View 
          style={[
            styles.rideTypeContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.rideTypeBadge}>
            <Text style={styles.rideTypeName}>{ride.name}</Text>
            {surgeMultiplier > 1.0 && (
              <View style={styles.surgeBadge}>
                <MaterialIcon name="flash-on" size={12} color="#FFF" />
                <Text style={styles.surgeBadgeText}>{surgeMultiplier.toFixed(1)}x</Text>
              </View>
            )}
          </View>
          <Text style={styles.rideDescription}>{ride.vehicleType || 'Standard vehicle'}</Text>
        </Animated.View>

        {/* Pickup and Destination */}
        <Animated.View 
          style={[
            styles.locationsContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Pickup */}
          <View style={styles.locationCard}>
            <View style={styles.locationHeader}>
              <View style={styles.locationIconContainer}>
                <MaterialIcon name="my-location" size={16} color="#06C167" />
              </View>
              <Text style={styles.locationLabel}>PICKUP</Text>
            </View>
            <Text style={styles.locationText} numberOfLines={2}>
              {pickupLocation || 'Your Location'}
            </Text>
            {pickupCoords && (
              <Text style={styles.coordinates}>
                {pickupCoords.latitude?.toFixed(4)}, {pickupCoords.longitude?.toFixed(4)}
              </Text>
            )}
          </View>

          {/* Destination */}
          <View style={styles.locationCard}>
            <View style={styles.locationHeader}>
              <View style={[styles.locationIconContainer, { backgroundColor: '#FFE5E5' }]}>
                <MaterialIcon name="place" size={16} color="#EA4335" />
              </View>
              <Text style={styles.locationLabel}>DESTINATION</Text>
            </View>
            <Text style={styles.locationText} numberOfLines={2}>
              {destinationAddress || destination || 'Lilongwe Police Station'}
            </Text>
            {destinationCoords && (
              <Text style={styles.coordinates}>
                {destinationCoords.latitude?.toFixed(4)}, {destinationCoords.longitude?.toFixed(4)}
              </Text>
            )}
          </View>
        </Animated.View>

        {/* Trip Info */}
        <Animated.View 
          style={[
            styles.tripInfoContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.tripInfoItem}>
            <MaterialIcon name="directions" size={20} color="#666" />
            <Text style={styles.tripInfoLabel}>Distance</Text>
            <Text style={styles.tripInfoValue}>{ride.distance || '0'} km</Text>
          </View>
          <View style={styles.tripInfoDivider} />
          <View style={styles.tripInfoItem}>
            <MaterialIcon name="access-time" size={20} color="#666" />
            <Text style={styles.tripInfoLabel}>Est. Time</Text>
            <Text style={styles.tripInfoValue}>{estimatedArrival}</Text>
          </View>
          <View style={styles.tripInfoDivider} />
          <View style={styles.tripInfoItem}>
            <MaterialIcon name="local-taxi" size={20} color="#666" />
            <Text style={styles.tripInfoLabel}>Vehicle</Text>
            <Text style={styles.tripInfoValue}>{ride.vehicleType || 'Car'}</Text>
          </View>
        </Animated.View>

        {/* Price Breakdown - Simplified */}
        <Animated.View 
          style={[
            styles.priceContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.priceSectionTitle}>Price Breakdown</Text>
          
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Base fare</Text>
            <Text style={styles.priceValue}>{formatMK(basePrice)}</Text>
          </View>
          
          {surgeMultiplier > 1.0 && (
            <View style={styles.priceRow}>
              <View style={styles.priceLabelContainer}>
                <Text style={styles.priceLabel}>Surge pricing</Text>
                <View style={styles.surgeMultiplierBadge}>
                  <Text style={styles.surgeMultiplierText}>{surgeMultiplier.toFixed(1)}x</Text>
                </View>
              </View>
              <Text style={[styles.priceValue, styles.surgePrice]}>
                +{formatMK(basePrice * (surgeMultiplier - 1))}
              </Text>
            </View>
          )}
          
          {usePromo && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Promo discount (20%)</Text>
              <Text style={[styles.priceValue, styles.promoPrice]}>
                -{formatMK(Math.round(surgePrice * 0.2))}
              </Text>
            </View>
          )}
          
          <View style={styles.totalPriceRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalPrice}>{formatMK(finalPrice)}</Text>
          </View>
        </Animated.View>

        {/* Payment Method */}
        <Animated.View 
          style={[
            styles.paymentContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.paymentTitle}>Payment Method</Text>
          <View style={styles.paymentMethodCard}>
            <View style={styles.paymentIconContainer}>
              <MaterialIcon name={getPaymentIcon()} size={24} color="#06C167" />
            </View>
            <View style={styles.paymentDetails}>
              <Text style={styles.paymentMethodName}>{getPaymentText()}</Text>
              <Text style={styles.paymentStatus}>Selected for this ride</Text>
            </View>
          </View>
        </Animated.View>

        {/* Connection Status */}
        {connectionStatus !== 'connected' && (
          <Animated.View 
            style={[
              styles.connectionWarning,
              {
                opacity: fadeAnim,
                transform: [{ scale: connectionPulse }],
              },
            ]}
          >
            <MaterialIcon name="wifi-off" size={16} color="#EA4335" />
            <Text style={styles.connectionWarningText}>
              Please check your internet connection to request a ride
            </Text>
          </Animated.View>
        )}
      </ScrollView>

      {/* Confirm Button */}
      <Animated.View 
        style={[
          styles.footer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Animated.View style={{ transform: [{ scale: confirmButtonScale }] }}>
          <TouchableOpacity 
            style={[
              styles.confirmButton, 
              (loading || connectionStatus !== 'connected') && styles.confirmButtonDisabled
            ]} 
            onPress={handleConfirmRide}
            disabled={loading || connectionStatus !== 'connected'}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <View style={styles.confirmButtonContent}>
                <Text style={styles.confirmButtonText}>
                  {connectionStatus === 'connected' ? 'Confirm Ride' : 'Connect to Request'}
                </Text>
                <View style={styles.confirmButtonDetails}>
                  <Text style={styles.confirmButtonPrice}>{formatMK(finalPrice)}</Text>
                  <Text style={styles.confirmButtonNote}>• Real-time matching</Text>
                </View>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
        
        <Text style={styles.termsText}>
          By confirming, you agree to our Terms of Service
        </Text>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F7F6F3' 
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 140,
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingTop: Platform.OS === 'ios' ? 20 : 40, 
    paddingBottom: 16, 
    backgroundColor: '#FFFFFF', 
    borderBottomWidth: 1, 
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#000',
    marginBottom: 4,
  },
  connectionStatus: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  connectionStatusText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  rideTypeContainer: {
    marginBottom: 16,
  },
  rideTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#06C167',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  rideTypeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginRight: 8,
  },
  surgeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  surgeBadgeText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
    marginLeft: 4,
  },
  rideDescription: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  locationsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  locationCard: {
    marginBottom: 16,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#E8F7F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  locationLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  locationText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 22,
  },
  coordinates: {
    fontSize: 12,
    color: '#999',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  tripInfoContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tripInfoItem: {
    flex: 1,
    alignItems: 'center',
  },
  tripInfoDivider: {
    width: 1,
    height: '100%',
    backgroundColor: '#E5E7EB',
  },
  tripInfoLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    fontWeight: '600',
  },
  tripInfoValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginTop: 4,
  },
  priceContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  priceSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 20,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  priceLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  priceValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  surgeMultiplierBadge: {
    backgroundColor: '#FBBC05',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  surgeMultiplierText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  surgePrice: {
    color: '#FBBC05',
    fontWeight: '700',
  },
  promoPrice: {
    color: '#06C167',
    fontWeight: '700',
  },
  totalPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#F0F0F0',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000',
  },
  totalPrice: {
    fontSize: 24,
    fontWeight: '800',
    color: '#EA4335',
  },
  paymentContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  paymentTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
  },
  paymentIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#E8F7F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  paymentDetails: {
    flex: 1,
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  paymentStatus: {
    fontSize: 14,
    color: '#666',
  },
  connectionWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE5E5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  connectionWarningText: {
    fontSize: 14,
    color: '#EA4335',
    fontWeight: '500',
    marginLeft: 12,
    flex: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  confirmButton: {
    backgroundColor: '#06C167',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  confirmButtonContent: {
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: 4,
  },
  confirmButtonDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confirmButtonPrice: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  confirmButtonNote: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    marginLeft: 4,
  },
  termsText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 12,
  },
  // Error state styles
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  errorButton: {
    backgroundColor: '#06C167',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 12,
  },
  errorButtonText: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '700',
  },
});