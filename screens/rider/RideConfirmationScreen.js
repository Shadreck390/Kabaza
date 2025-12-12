// screens/rider/RideConfirmationScreen.js
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  StatusBar, 
  Alert,
  ActivityIndicator 
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import { useDispatch, useSelector } from 'react-redux'; // or your state management
import { requestRide } from '../../store/slices/rideSlice'; // adjust path
import socket from '../../services/socket'; // adjust path

// Helper function to format Malawi Kwacha
const formatMK = (amount) => {
  const rounded = Math.round(amount);
  return `MK${rounded.toLocaleString()}`;
};

export default function RideConfirmationScreen({ route, navigation }) {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth); // adjust based on your state
  
  const { ride, destination, destinationAddress, pickupLocation, riderInfo, pickupCoords, destinationCoords } = route.params || {};
  const { paymentMethod, usePromo } = riderInfo || {};
  
  const [loading, setLoading] = useState(false);

  const price = ride?.basePrice * ride?.multiplier;
  const discountedPrice = usePromo ? Math.round(price * 0.8) : Math.round(price);

  const handleConfirmRide = async () => {
    try {
      setLoading(true);
      
      // Prepare ride data for backend
      const rideData = {
        userId: user.id,
        rideType: ride.name,
        vehicleType: ride.vehicleType,
        pickupLocation: {
          address: pickupLocation,
          coordinates: pickupCoords // should be { latitude, longitude }
        },
        destination: {
          address: destinationAddress || destination,
          coordinates: destinationCoords // should be { latitude, longitude }
        },
        paymentMethod: paymentMethod || 'cash',
        estimatedPrice: discountedPrice,
        actualPrice: discountedPrice,
        promoCode: usePromo ? 'PROMO20' : null,
        status: 'pending', // pending, accepted, in_progress, completed, cancelled
        createdAt: new Date().toISOString()
      };

      // Option 1: Using Redux/State Management
      const result = await dispatch(requestRide(rideData)).unwrap();
      
      // Option 2: Direct API call (if not using Redux)
      // const response = await api.post('/rides/request', rideData);
      
      if (result.success) {
        // Emit socket event for real-time driver matching
        socket.emit('ride-request', {
          rideId: result.ride.id,
          ...rideData,
          riderLocation: pickupCoords,
          riderName: user.name,
          riderRating: user.rating || 4.5
        });

        // Navigate to waiting screen
        navigation.navigate('RideWaiting', {
          rideId: result.ride.id,
          estimatedTime: ride.estimatedTime || '5-10',
          driverSearch: true
        });
      } else {
        Alert.alert('Error', result.message || 'Failed to request ride');
      }
    } catch (error) {
      console.error('Ride request error:', error);
      Alert.alert('Error', 'Failed to request ride. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} disabled={loading}>
          <MaterialIcon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Confirm Your Ride</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.rideDetails}>
        <View style={styles.rideRow}>
          <FontAwesome5 name={ride.icon} size={28} color={ride.color} />
          <Text style={styles.rideName}>{ride.name}</Text>
          {ride.estimatedTime && (
            <Text style={styles.etaText}>• ETA: {ride.estimatedTime} min</Text>
          )}
        </View>

        <View style={styles.locationRow}>
          <View style={styles.locationDot} />
          <Text style={styles.rideLocation} numberOfLines={2}>
            {pickupLocation}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.locationRow}>
          <View style={[styles.locationDot, { backgroundColor: '#34A853' }]} />
          <Text style={styles.rideLocation} numberOfLines={2}>
            {destinationAddress || destination}
          </Text>
        </View>

        <View style={styles.priceSection}>
          {usePromo && (
            <View style={styles.promoBadge}>
              <Text style={styles.promoText}>20% OFF</Text>
            </View>
          )}
          <View>
            {usePromo && (
              <Text style={styles.originalPrice}>{formatMK(price)}</Text>
            )}
            <Text style={styles.finalPrice}>{formatMK(discountedPrice)}</Text>
          </View>
        </View>

        <View style={styles.paymentSection}>
          <Text style={styles.paymentLabel}>Payment Method:</Text>
          <View style={styles.paymentMethod}>
            <MaterialIcon 
              name={paymentMethod === 'cash' ? 'attach-money' : 'credit-card'} 
              size={20} 
              color="#06C167" 
            />
            <Text style={styles.paymentValue}>
              {paymentMethod === 'cash' ? 'Cash' : paymentMethod}
            </Text>
          </View>
        </View>

        <View style={styles.distanceSection}>
          <Text style={styles.distanceLabel}>Estimated distance:</Text>
          <Text style={styles.distanceValue}>
            {ride.distance ? `${ride.distance} km` : 'Calculating...'}
          </Text>
        </View>
      </View>

      <TouchableOpacity 
        style={[styles.confirmButton, loading && styles.confirmButtonDisabled]} 
        onPress={handleConfirmRide}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.confirmButtonText}>
            Confirm Ride • {formatMK(discountedPrice)}
          </Text>
        )}
      </TouchableOpacity>
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
  headerTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: '#000' 
  },
  rideDetails: { 
    margin: 16, 
    backgroundColor: '#FFFFFF', 
    borderRadius: 12, 
    padding: 16, 
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  rideRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 16 
  },
  rideName: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: '#000', 
    marginLeft: 12,
    flex: 1 
  },
  etaText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 8
  },
  locationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EA4335',
    marginTop: 6,
    marginRight: 12
  },
  rideLocation: { 
    fontSize: 16, 
    color: '#333', 
    flex: 1 
  },
  divider: {
    height: 20,
    width: 2,
    backgroundColor: '#DDD',
    marginLeft: 5,
    marginVertical: 4
  },
  priceSection: { 
    marginTop: 20, 
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0'
  },
  promoBadge: {
    backgroundColor: '#FFE5E5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20
  },
  promoText: {
    color: '#EA4335',
    fontWeight: '600',
    fontSize: 14
  },
  originalPrice: { 
    fontSize: 16, 
    color: '#999', 
    textDecorationLine: 'line-through',
    textAlign: 'right'
  },
  finalPrice: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: '#EA4335',
    marginTop: 2
  },
  paymentSection: { 
    marginTop: 20, 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    alignItems: 'center' 
  },
  paymentLabel: { 
    fontSize: 16, 
    color: '#666' 
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  paymentValue: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#000',
    marginLeft: 8
  },
  distanceSection: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0'
  },
  distanceLabel: {
    fontSize: 16,
    color: '#666'
  },
  distanceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000'
  },
  confirmButton: { 
    backgroundColor: '#06C167', 
    margin: 16, 
    paddingVertical: 16, 
    borderRadius: 12, 
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#06C167',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  confirmButtonDisabled: {
    backgroundColor: '#CCC'
  },
  confirmButtonText: { 
    fontSize: 18, 
    color: '#FFF', 
    fontWeight: 'bold' 
  },
});