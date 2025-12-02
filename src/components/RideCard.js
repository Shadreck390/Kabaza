// components/RideCard.js
import React, { useMemo, useCallback } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Image,
  Alert,
  Platform 
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

const RideCard = ({ 
  ride, 
  onPress, 
  onBook,
  onCancel,
  onCall,
  onMessage,
  type = 'available',
  selected = false,
  showActions = false,
  compact = false,
  showRating = true,
  showVehicleInfo = true,
  style,
  testID,
}) => {
  // Memoized date formatting
  const formattedDate = useMemo(() => {
    if (!ride.date) return '';
    try {
      const date = new Date(ride.date);
      const now = new Date();
      const diffTime = Math.abs(now - date);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
      
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (error) {
      console.warn('Date formatting error:', error);
      return ride.date;
    }
  }, [ride.date]);

  const formattedTime = useMemo(() => {
    if (!ride.date) return '';
    try {
      const date = new Date(ride.date);
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.warn('Time formatting error:', error);
      return '';
    }
  }, [ride.date]);

  // Memoized status configuration
  const statusConfig = useMemo(() => {
    const statusMap = {
      available: { 
        color: '#10B981', 
        bgColor: '#D1FAE5', 
        icon: 'check-circle', 
        text: 'Available',
        showBook: true 
      },
      booked: { 
        color: '#F59E0B', 
        bgColor: '#FEF3C7', 
        icon: 'clock-o', 
        text: 'Booked',
        showCancel: true 
      },
      completed: { 
        color: '#6B7280', 
        bgColor: '#F3F4F6', 
        icon: 'check', 
        text: 'Completed',
        showRating: true 
      },
      cancelled: { 
        color: '#EF4444', 
        bgColor: '#FEE2E2', 
        icon: 'times', 
        text: 'Cancelled' 
      },
      in_progress: { 
        color: '#3B82F6', 
        bgColor: '#DBEAFE', 
        icon: 'car', 
        text: 'In Progress',
        showCancel: true 
      },
      pending: { 
        color: '#F59E0B', 
        bgColor: '#FEF3C7', 
        icon: 'hourglass-half', 
        text: 'Pending',
        showCancel: true 
      },
      driver_accepted: { 
        color: '#10B981', 
        bgColor: '#D1FAE5', 
        icon: 'user-plus', 
        text: 'Accepted' 
      },
    };

    return statusMap[ride.status] || statusMap.available;
  }, [ride.status]);

  // Memoized user info
  const userInfo = useMemo(() => ({
    name: type === 'driver_request' ? ride.riderName : ride.driverName,
    avatar: ride.driverAvatar || ride.riderAvatar,
    rating: ride.driverRating,
    totalRides: ride.totalRides,
    phone: ride.driverPhone || ride.riderPhone,
    id: ride.driverId || ride.riderId,
  }), [type, ride]);

  // Event handlers with useCallback
  const handleBook = useCallback(() => {
    if (!onBook) return;
    
    Alert.alert(
      'Confirm Ride',
      `Book ride with ${userInfo.name} for MK${ride.amount}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Book Now', 
          onPress: () => onBook(ride)
        }
      ]
    );
  }, [onBook, userInfo.name, ride]);

  const handleCancel = useCallback(() => {
    if (!onCancel) return;
    
    Alert.alert(
      'Cancel Ride',
      'Are you sure you want to cancel this ride?',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes, Cancel', 
          style: 'destructive',
          onPress: () => onCancel(ride.id)
        }
      ]
    );
  }, [onCancel, ride.id]);

  const handleCall = useCallback(() => {
    if (onCall && userInfo.phone) {
      onCall(userInfo.phone);
    }
  }, [onCall, userInfo.phone]);

  const handleMessage = useCallback(() => {
    if (onMessage && userInfo.id) {
      onMessage(userInfo.id);
    }
  }, [onMessage, userInfo.id]);

  const handlePress = useCallback(() => {
    if (onPress) {
      onPress(ride);
    }
  }, [onPress, ride]);

  // Render avatar component
  const renderAvatar = useCallback((size = 'normal') => {
    const isCompact = size === 'compact';
    const avatarStyle = isCompact ? styles.avatarCompact : styles.avatarPlaceholder;
    const imageStyle = isCompact ? styles.avatarImageCompact : styles.avatarImage;
    const iconSize = isCompact ? 16 : 20;

    if (userInfo.avatar) {
      return (
        <Image 
          source={{ uri: userInfo.avatar }} 
          style={imageStyle}
          accessibilityLabel={`${userInfo.name}'s profile picture`}
        />
      );
    }

    return (
      <View style={avatarStyle}>
        <Icon 
          name="user" 
          size={iconSize} 
          color="#66cc33" 
        />
      </View>
    );
  }, [userInfo.avatar, userInfo.name]);

  // Compact view
  if (compact) {
    return (
      <TouchableOpacity
        style={[
          styles.card,
          styles.compactCard,
          selected && styles.selectedCard,
          style
        ]}
        onPress={handlePress}
        activeOpacity={0.7}
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={`Ride from ${ride.pickup} to ${ride.destination}`}
        accessibilityHint="Double tap to view ride details"
      >
        <View style={styles.compactContent}>
          <View style={styles.compactLeft}>
            {renderAvatar('compact')}
            <View style={styles.compactInfo}>
              <Text style={styles.compactName} numberOfLines={1}>
                {userInfo.name}
              </Text>
              <Text style={styles.compactRoute} numberOfLines={1}>
                {ride.pickup} → {ride.destination}
              </Text>
            </View>
          </View>
          <View style={styles.compactRight}>
            <Text style={styles.compactAmount}>MK {ride.amount}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
              <Icon name={statusConfig.icon} size={8} color={statusConfig.color} />
              <Text style={[styles.statusText, { color: statusConfig.color }]}>
                {statusConfig.text}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // Full view
  return (
    <TouchableOpacity
      style={[
        styles.card,
        selected && styles.selectedCard,
        style
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`Ride from ${ride.pickup} to ${ride.destination}, ${statusConfig.text}`}
      accessibilityHint="Double tap to view ride details"
    >
      {/* Header with date and status */}
      <View style={styles.header}>
        <View style={styles.dateTime}>
          <Text style={styles.date}>{formattedDate}</Text>
          {formattedTime && (
            <Text style={styles.time}>{formattedTime}</Text>
          )}
        </View>
        <View 
          style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}
          accessibilityLabel={`Status: ${statusConfig.text}`}
        >
          <Icon name={statusConfig.icon} size={12} color={statusConfig.color} />
          <Text style={[styles.statusText, { color: statusConfig.color }]}>
            {statusConfig.text}
          </Text>
        </View>
      </View>

      {/* Driver/Rider Info */}
      <View style={styles.userInfo}>
        <View style={styles.avatarContainer}>
          {renderAvatar('normal')}
        </View>
        <View style={styles.userDetails}>
          <Text style={styles.userName}>
            {userInfo.name}
          </Text>
          {showRating && userInfo.rating && (
            <View style={styles.ratingContainer}>
              <Icon name="star" size={12} color="#FFD700" />
              <Text style={styles.ratingText}>{userInfo.rating}</Text>
              {userInfo.totalRides && (
                <Text style={styles.ridesCount}>({userInfo.totalRides} rides)</Text>
              )}
            </View>
          )}
          {showVehicleInfo && ride.vehicleType && (
            <Text style={styles.vehicleInfo}>
              {ride.vehicleColor} {ride.vehicleType} • {ride.vehiclePlate}
            </Text>
          )}
        </View>
        <Text style={styles.amount}>MK {ride.amount}</Text>
      </View>

      {/* Route Information */}
      <View style={styles.route}>
        <View style={styles.location}>
          <View style={styles.locationIcon}>
            <Icon name="circle" size={10} color="#10B981" />
          </View>
          <Text style={styles.locationText} numberOfLines={2}>
            {ride.pickup}
          </Text>
        </View>
        <View style={styles.routeLine} />
        <View style={styles.location}>
          <View style={styles.locationIcon}>
            <Icon name="map-marker" size={12} color="#EF4444" />
          </View>
          <Text style={styles.locationText} numberOfLines={2}>
            {ride.destination}
          </Text>
        </View>
      </View>

      {/* Additional Info */}
      {(ride.distance || ride.estimatedTime || ride.duration) && (
        <View style={styles.additionalInfo}>
          {ride.distance && (
            <View style={styles.infoItem}>
              <Icon name="road" size={12} color="#666" />
              <Text style={styles.infoText}>{ride.distance}</Text>
            </View>
          )}
          {ride.estimatedTime && (
            <View style={styles.infoItem}>
              <Icon name="clock-o" size={12} color="#666" />
              <Text style={styles.infoText}>{ride.estimatedTime}</Text>
            </View>
          )}
          {ride.duration && (
            <View style={styles.infoItem}>
              <Icon name="hourglass" size={12} color="#666" />
              <Text style={styles.infoText}>{ride.duration}</Text>
            </View>
          )}
        </View>
      )}

      {/* Action Buttons */}
      {showActions && (
        <View style={styles.actions}>
          {statusConfig.showBook && onBook && (
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={handleBook}
              accessibilityRole="button"
              accessibilityLabel="Book this ride"
            >
              <Icon name="check" size={14} color="#fff" />
              <Text style={styles.primaryButtonText}>Book Ride</Text>
            </TouchableOpacity>
          )}
          
          {statusConfig.showCancel && onCancel && (
            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={handleCancel}
              accessibilityRole="button"
              accessibilityLabel="Cancel this ride"
            >
              <Icon name="times" size={14} color="#EF4444" />
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}

          {statusConfig.showRating && (
            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={handlePress}
              accessibilityRole="button"
              accessibilityLabel="Rate this ride"
            >
              <Icon name="star" size={14} color="#F59E0B" />
              <Text style={styles.secondaryButtonText}>Rate</Text>
            </TouchableOpacity>
          )}

          {(onCall || onMessage) && (
            <View style={styles.communicationActions}>
              {onCall && userInfo.phone && (
                <TouchableOpacity 
                  style={styles.iconButton}
                  onPress={handleCall}
                  accessibilityRole="button"
                  accessibilityLabel="Call driver"
                >
                  <Icon name="phone" size={16} color="#3B82F6" />
                </TouchableOpacity>
              )}
              {onMessage && userInfo.id && (
                <TouchableOpacity 
                  style={styles.iconButton}
                  onPress={handleMessage}
                  accessibilityRole="button"
                  accessibilityLabel="Message driver"
                >
                  <Icon name="comment" size={16} color="#66cc33" />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginVertical: 6,
    marginHorizontal: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  compactCard: {
    padding: 12,
    marginVertical: 4,
  },
  selectedCard: {
    backgroundColor: '#f0f7f0',
    borderColor: '#66cc33',
    borderWidth: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  dateTime: {
    flex: 1,
  },
  date: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  time: {
    fontSize: 12,
    color: '#666',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0f7f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  ratingText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    marginRight: 8,
    fontWeight: '600',
  },
  ridesCount: {
    fontSize: 11,
    color: '#999',
  },
  vehicleInfo: {
    fontSize: 12,
    color: '#666',
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#66cc33',
  },
  route: {
    marginBottom: 12,
  },
  location: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 2,
  },
  locationIcon: {
    width: 20,
    alignItems: 'center',
    marginTop: 2,
  },
  locationText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    lineHeight: 18,
  },
  routeLine: {
    width: 2,
    height: 12,
    backgroundColor: '#e0e0e0',
    marginLeft: 9,
    marginVertical: 2,
  },
  additionalInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#66cc33',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    flex: 1,
    justifyContent: 'center',
    minHeight: 40,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 6,
    minHeight: 40,
  },
  secondaryButtonText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '600',
  },
  communicationActions: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 'auto',
  },
  iconButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  avatarCompact: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f7f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarImageCompact: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  compactInfo: {
    flex: 1,
  },
  compactName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  compactRoute: {
    fontSize: 12,
    color: '#666',
  },
  compactRight: {
    alignItems: 'flex-end',
  },
  compactAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#66cc33',
    marginBottom: 4,
  },
});

export default React.memo(RideCard);