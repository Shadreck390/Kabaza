// screens/rider/RideConfirmationScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
  Platform
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';

// Import real-time service
import realTimeService from '@services/socket/realtimeUpdates';
import { getUserData } from '@utils/userStorage';

// Helper function to format Malawi Kwacha
const formatMK = (amount) => {
  const rounded = Math.round(amount);
  return `MK${rounded.toLocaleString()}`;
};

export default function RideConfirmationScreen({ route, navigation }) {
  const { 
    ride, 
    destination, 
    destinationAddress, 
    pickupLocation, 
    riderInfo, 
    pickupCoords, 
    destinationCoords,
    socketRequestId // This should come from RideSelectionScreen
  } = route.params || {};
  
  const { paymentMethod, usePromo, userId, userName } = riderInfo || {};
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [estimatedArrival, setEstimatedArrival] = useState(ride?.estimatedTime || '5-10 min');

  // Calculate prices
  const basePrice = ride?.basePrice * ride?.multiplier;
  const surgeMultiplier = ride?.surgeMultiplier || 1.0;
  const surgePrice = basePrice * surgeMultiplier;
  const discountedPrice = usePromo ? Math.round(surgePrice * 0.8) : Math.round(surgePrice);
  const finalPrice = discountedPrice;

  useEffect(() => {
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
      // Cleanup connection listener
      realTimeService.removeConnectionListener();
    };
  }, []);

  const handleConfirmRide = async () => {
    // Check connection first
    if (connectionStatus !== 'connected') {
      Alert.alert(
        'Connection Required',
        'Real-time connection is required to request a ride. Please check your internet connection.',
        [
          { 
            text: 'Try Again', 
            onPress: () => {
              realTimeService.connectSocket();
              setTimeout(() => {
                const status = realTimeService.getConnectionStatus();
                setConnectionStatus(status.isConnected ? 'connected' : 'disconnected');
                if (status.isConnected) {
                  handleConfirmRide();
                }
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
        
        // Navigate to waiting screen with subscription
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
          destinationCoords: destinationCoords,
          pickupCoords: pickupCoords,
          paymentMethod: paymentMethod,
          riderInfo: {
            userId: userId || user.id,
            userName: userName || user.name,
            userPhone: user.phone
          }
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
    if (loading) {
      Alert.alert(
        'Cancel Request?',
        'You have a ride request in progress. Are you sure you want to go back?',
        [
          { text: 'No', style: 'cancel' },
          { 
            text: 'Yes', 
            onPress: () => {
              // Cancel any pending request if possible
              if (socketRequestId) {
                realTimeService.cancelRideRequest(socketRequestId, 'User cancelled');
              }
              navigation.goBack();
            }
          }
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Live';
      case 'disconnected': return 'Offline';
      case 'checking': return 'Checking...';
      default: return 'Unknown';
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return '#06C167';
      case 'disconnected': return '#EA4335';
      case 'checking': return '#FBBC05';
      default: return '#666';
    }
  };

  // Don't render if ride data is missing
  if (!ride) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcon name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Error</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <MaterialIcon name="error-outline" size={64} color="#EA4335" />
          <Text style={styles.errorText}>Ride information missing</Text>
          <Text style={styles.errorSubtext}>Please go back and select a ride again</Text>
          <TouchableOpacity 
            style={styles.errorButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} disabled={loading}>
          <MaterialIcon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Confirm Your Ride</Text>
          <View style={styles.connectionStatusContainer}>
            <View style={[
              styles.connectionStatusDot, 
              { backgroundColor: getConnectionStatusColor() }
            ]} />
            <Text style={styles.connectionStatusText}>
              {getConnectionStatusText()}
            </Text>
          </View>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Ride Details Card */}
      <View style={styles.rideDetails}>
        {/* Ride Type Header */}
        <View style={styles.rideHeader}>
          <View style={[styles.rideIconContainer, { backgroundColor: `${ride.color}20` }]}>
            <FontAwesome5 name={ride.icon} size={28} color={ride.color} />
          </View>
          <View style={styles.rideHeaderInfo}>
            <Text style={styles.rideName}>{ride.name}</Text>
            <Text style={styles.rideDescription}>{ride.description || 'Standard ride service'}</Text>
          </View>
          {ride.isSurge && (
            <View style={styles.surgeBadge}>
              <MaterialIcon name="flash-on" size={14} color="#FFF" />
              <Text style={styles.surgeBadgeText}>{surgeMultiplier.toFixed(1)}x</Text>
            </View>
          )}
        </View>

        {/* Pickup Location */}
        <View style={styles.locationSection}>
          <View style={styles.locationHeader}>
            <MaterialIcon name="my-location" size={18} color="#4285F4" />
            <Text style={styles.locationTitle}>PICKUP</Text>
          </View>
          <Text style={styles.locationText} numberOfLines={2}>
            {pickupLocation || 'Your current location'}
          </Text>
          {pickupCoords && (
            <Text style={styles.coordinatesText}>
              {pickupCoords.latitude?.toFixed(4)}, {pickupCoords.longitude?.toFixed(4)}
            </Text>
          )}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Destination Location */}
        <View style={styles.locationSection}>
          <View style={styles.locationHeader}>
            <MaterialIcon name="place" size={18} color="#EA4335" />
            <Text style={styles.locationTitle}>DESTINATION</Text>
          </View>
          <Text style={styles.locationText} numberOfLines={2}>
            {destinationAddress || destination || 'Selected destination'}
          </Text>
          {destinationCoords && (
            <Text style={styles.coordinatesText}>
              {destinationCoords.latitude?.toFixed(4)}, {destinationCoords.longitude?.toFixed(4)}
            </Text>
          )}
        </View>

        {/* Trip Information */}
        <View style={styles.tripInfo}>
          <View style={styles.tripInfoItem}>
            <MaterialIcon name="directions" size={16} color="#666" />
            <Text style={styles.tripInfoLabel}>Distance:</Text>
            <Text style={styles.tripInfoValue}>{ride.distance || '0'} km</Text>
          </View>
          <View style={styles.tripInfoItem}>
            <MaterialIcon name="access-time" size={16} color="#666" />
            <Text style={styles.tripInfoLabel}>Est. time:</Text>
            <Text style={styles.tripInfoValue}>{estimatedArrival}</Text>
          </View>
          <View style={styles.tripInfoItem}>
            <MaterialIcon name="local-taxi" size={16} color="#666" />
            <Text style={styles.tripInfoLabel}>Vehicle:</Text>
            <Text style={styles.tripInfoValue}>{ride.vehicleType || 'Standard'}</Text>
          </View>
        </View>

        {/* Price Breakdown */}
        <View style={styles.priceBreakdown}>
          <Text style={styles.priceSectionTitle}>Price Breakdown</Text>
          
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Base fare</Text>
            <Text style={styles.priceValue}>{formatMK(basePrice)}</Text>
          </View>
          
          {surgeMultiplier > 1.0 && (
            <View style={styles.priceRow}>
              <View style={styles.surgeRow}>
                <Text style={styles.priceLabel}>Surge pricing</Text>
                <View style={styles.surgeMultiplier}>
                  <Text style={styles.surgeMultiplierText}>{surgeMultiplier.toFixed(1)}x</Text>
                </View>
              </View>
              <Text style={[styles.priceValue, styles.surgePriceValue]}>
                {formatMK(basePrice * (surgeMultiplier - 1))}
              </Text>
            </View>
          )}
          
          {ride.distance > 0 && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Distance ({ride.distance} km)</Text>
              <Text style={styles.priceValue}>{formatMK(Math.round(ride.distance * 100))}</Text>
            </View>
          )}
          
          {usePromo && (
            <View style={styles.priceRow}>
              <View style={styles.promoRow}>
                <Text style={styles.priceLabel}>Promo (20% off)</Text>
                <Text style={styles.promoCode}>PROMO20</Text>
              </View>
              <Text style={[styles.priceValue, styles.promoPriceValue]}>
                -{formatMK(Math.round(surgePrice * 0.2))}
              </Text>
            </View>
          )}
          
          <View style={styles.totalPriceRow}>
            <Text style={styles.totalPriceLabel}>Total</Text>
            <Text style={styles.totalPriceValue}>{formatMK(finalPrice)}</Text>
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.paymentSection}>
          <Text style={styles.paymentTitle}>Payment Method</Text>
          <View style={styles.paymentMethodContainer}>
            <MaterialIcon 
              name={
                paymentMethod === 'cash' ? 'attach-money' : 
                paymentMethod === 'card' ? 'credit-card' : 
                paymentMethod === 'mobile' ? 'smartphone' : 'payment'
              } 
              size={24} 
              color="#06C167" 
            />
            <Text style={styles.paymentMethodText}>
              {paymentMethod === 'cash' ? 'Cash' : 
               paymentMethod === 'card' ? 'Credit/Debit Card' : 
               paymentMethod === 'mobile' ? 'Mobile Money' : 
               paymentMethod || 'Cash'}
            </Text>
          </View>
        </View>

        {/* Real-time Note */}
        {connectionStatus === 'connected' && (
          <View style={styles.realTimeNote}>
            <MaterialIcon name="bolt" size={16} color="#06C167" />
            <Text style={styles.realTimeNoteText}>
              Real-time driver matching enabled
            </Text>
          </View>
        )}
      </View>

      {/* Confirm Button */}
      <View style={styles.confirmContainer}>
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
            <>
              <Text style={styles.confirmButtonText}>
                {connectionStatus === 'connected' ? 'Confirm Ride' : 'Connecting...'}
              </Text>
              <Text style={styles.confirmButtonSubtext}>
                {formatMK(finalPrice)} • Real-time matching
              </Text>
            </>
          )}
        </TouchableOpacity>
        
        {connectionStatus !== 'connected' && (
          <Text style={styles.connectionWarning}>
            Please check your internet connection to request a ride
          </Text>
        )}
        
        <Text style={styles.note}>
          By confirming, you agree to our Terms of Service
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F7F6F3' 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingTop: Platform.OS === 'ios' ? 60 : 40, 
    paddingBottom: 16, 
    backgroundColor: '#FFFFFF', 
    borderBottomWidth: 1, 
    borderBottomColor: '#F0F0F0' 
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: '#000',
    marginBottom: 4,
  },
  connectionStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  connectionStatusText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  rideDetails: { 
    margin: 16, 
    backgroundColor: '#FFFFFF', 
    borderRadius: 16, 
    padding: 20, 
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  rideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  rideIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  rideHeaderInfo: {
    flex: 1,
  },
  rideName: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#000',
    marginBottom: 4,
  },
  rideDescription: {
    fontSize: 14,
    color: '#666',
  },
  surgeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FBBC05',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  surgeBadgeText: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  locationSection: {
    marginBottom: 16,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationTitle: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginLeft: 8,
  },
  locationText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
    lineHeight: 22,
  },
  coordinatesText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 20,
  },
  tripInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  tripInfoItem: {
    alignItems: 'center',
  },
  tripInfoLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  tripInfoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginTop: 2,
  },
  priceBreakdown: {
    marginBottom: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  priceSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  surgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  surgeMultiplier: {
    backgroundColor: '#FFF5E6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  surgeMultiplierText: {
    fontSize: 10,
    color: '#FBBC05',
    fontWeight: 'bold',
  },
  surgePriceValue: {
    color: '#FBBC05',
    fontWeight: 'bold',
  },
  promoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  promoCode: {
    fontSize: 10,
    color: '#06C167',
    backgroundColor: '#F0F9F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
    fontStyle: 'italic',
  },
  promoPriceValue: {
    color: '#06C167',
    fontWeight: 'bold',
  },
  totalPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  totalPriceLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  totalPriceValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#EA4335',
  },
  paymentSection: {
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  paymentMethodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
  },
  paymentMethodText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginLeft: 12,
  },
  realTimeNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    padding: 12,
    backgroundColor: '#F0F9F0',
    borderRadius: 10,
  },
  realTimeNoteText: {
    fontSize: 14,
    color: '#06C167',
    fontWeight: '500',
    marginLeft: 8,
  },
  confirmContainer: {
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
    shadowRadius: 12,
  },
  confirmButton: { 
    backgroundColor: '#06C167', 
    paddingVertical: 18, 
    borderRadius: 14, 
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#06C167',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  confirmButtonDisabled: { 
    backgroundColor: '#CCC',
    shadowColor: '#CCC',
  },
  confirmButtonText: { 
    fontSize: 20, 
    color: '#FFF', 
    fontWeight: 'bold',
    marginBottom: 4,
  },
  confirmButtonSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  connectionWarning: {
    fontSize: 12,
    color: '#EA4335',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
  },
  note: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
    marginTop: 12,
  },
  // Error state styles
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: '#06C167',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 10,
  },
  errorButtonText: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '600',
  },
});