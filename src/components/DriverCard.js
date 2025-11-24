// components/DriverCard.js
import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Image 
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

export default function DriverCard({ 
  ride, 
  onPress, 
  selected = false,
  showStatus = true,
  showRating = true,
  showVehicleInfo = true,
  compact = false,
  onCallPress,
  onMessagePress,
  style 
}) {
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status color and icon
  const getStatusInfo = (status) => {
    const statusMap = {
      available: { color: '#10B981', bgColor: '#D1FAE5', icon: 'check-circle', text: 'Available' },
      booked: { color: '#F59E0B', bgColor: '#FEF3C7', icon: 'clock-o', text: 'Booked' },
      completed: { color: '#6B7280', bgColor: '#F3F4F6', icon: 'check', text: 'Completed' },
      cancelled: { color: '#EF4444', bgColor: '#FEE2E2', icon: 'times', text: 'Cancelled' },
      ongoing: { color: '#3B82F6', bgColor: '#DBEAFE', icon: 'car', text: 'On Trip' },
      pending: { color: '#F59E0B', bgColor: '#FEF3C7', icon: 'hourglass-half', text: 'Pending' },
    };
    return statusMap[status] || statusMap.available;
  };

  // Render star rating
  const renderRating = (rating) => {
    return (
      <View style={styles.ratingContainer}>
        <Icon name="star" size={12} color="#FFD700" />
        <Text style={styles.ratingText}>{rating}</Text>
      </View>
    );
  };

  const statusInfo = getStatusInfo(ride.status);

  if (compact) {
    return (
      <TouchableOpacity
        style={[
          styles.card,
          styles.compactCard,
          selected && styles.selectedCard,
          style
        ]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.compactContent}>
          <View style={styles.compactLeft}>
            <View style={styles.driverAvatar}>
              {ride.driverAvatar ? (
                <Image source={{ uri: ride.driverAvatar }} style={styles.avatarImage} />
              ) : (
                <Icon name="user" size={16} color="#6c3" />
              )}
            </View>
            <View style={styles.compactInfo}>
              <Text style={styles.compactName} numberOfLines={1}>
                {ride.driverName}
              </Text>
              <Text style={styles.compactDestination} numberOfLines={1}>
                {ride.destination}
              </Text>
            </View>
          </View>
          <View style={styles.compactRight}>
            <Text style={styles.compactAmount}>MWK {ride.amount}</Text>
            {showStatus && (
              <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
                <Icon name={statusInfo.icon} size={8} color={statusInfo.color} />
                <Text style={[styles.statusText, { color: statusInfo.color }]}>
                  {statusInfo.text}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.card,
        selected && styles.selectedCard,
        style
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.driverInfo}>
          <View style={styles.avatarContainer}>
            {ride.driverAvatar ? (
              <Image source={{ uri: ride.driverAvatar }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Icon name="user" size={20} color="#6c3" />
              </View>
            )}
          </View>
          <View style={styles.driverDetails}>
            <Text style={styles.driverName}>{ride.driverName}</Text>
            {showRating && ride.driverRating && renderRating(ride.driverRating)}
            {showVehicleInfo && ride.vehicleType && (
              <Text style={styles.vehicleInfo}>
                {ride.vehicleColor} {ride.vehicleType} • {ride.vehiclePlate}
              </Text>
            )}
          </View>
        </View>
        <Text style={styles.amount}>MWK {ride.amount}</Text>
      </View>

      {/* Route Information */}
      <View style={styles.routeSection}>
        <View style={styles.routeLine}>
          <View style={styles.dotStart} />
          <View style={styles.routeDots} />
          <View style={styles.dotEnd} />
        </View>
        <View style={styles.routeText}>
          <View style={styles.location}>
            <Text style={styles.locationLabel}>From:</Text>
            <Text style={styles.locationText} numberOfLines={2}>
              {ride.pickupName}
            </Text>
          </View>
          <View style={styles.location}>
            <Text style={styles.locationLabel}>To:</Text>
            <Text style={styles.locationText} numberOfLines={2}>
              {ride.destination}
            </Text>
          </View>
        </View>
      </View>

      {/* Additional Info */}
      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          {ride.estimatedTime && (
            <View style={styles.infoItem}>
              <Icon name="clock-o" size={12} color="#666" />
              <Text style={styles.infoText}>{ride.estimatedTime}</Text>
            </View>
          )}
          {ride.distance && (
            <View style={styles.infoItem}>
              <Icon name="map-marker" size={12} color="#666" />
              <Text style={styles.infoText}>{ride.distance}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.footerRight}>
          {showStatus && ride.status && (
            <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
              <Icon name={statusInfo.icon} size={10} color={statusInfo.color} />
              <Text style={[styles.statusText, { color: statusInfo.color }]}>
                {statusInfo.text}
              </Text>
            </View>
          )}
          {ride.date && (
            <Text style={styles.date}>{formatDate(ride.date)}</Text>
          )}
        </View>
      </View>

      {/* Action Buttons (for available rides) */}
      {ride.status === 'available' && (onCallPress || onMessagePress) && (
        <View style={styles.actionButtons}>
          {onCallPress && (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => onCallPress(ride.driverPhone)}
            >
              <Icon name="phone" size={14} color="#fff" />
              <Text style={styles.actionButtonText}>Call</Text>
            </TouchableOpacity>
          )}
          {onMessagePress && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.messageButton]}
              onPress={() => onMessagePress(ride.driverId)}
            >
              <Icon name="comment" size={14} color="#6c3" />
              <Text style={[styles.actionButtonText, styles.messageButtonText]}>Message</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginVertical: 6,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  compactCard: {
    padding: 12,
    marginVertical: 4,
    marginHorizontal: 16,
  },
  selectedCard: {
    backgroundColor: '#f0f7f0',
    borderColor: '#6c3',
    borderWidth: 2,
  },
  // Header Styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  driverInfo: {
    flexDirection: 'row',
    flex: 1,
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
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    fontWeight: '600',
  },
  vehicleInfo: {
    fontSize: 12,
    color: '#666',
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  // Route Styles
  routeSection: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  routeLine: {
    width: 24,
    alignItems: 'center',
    marginRight: 12,
  },
  dotStart: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
  },
  routeDots: {
    flex: 1,
    width: 2,
    backgroundColor: '#e0e0e0',
    marginVertical: 4,
  },
  dotEnd: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B00',
  },
  routeText: {
    flex: 1,
  },
  location: {
    marginBottom: 8,
  },
  locationLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    marginBottom: 2,
  },
  locationText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  // Footer Styles
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  footerRight: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  date: {
    fontSize: 11,
    color: '#999',
  },
  // Compact Styles
  compactContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  driverAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f7f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
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
  compactDestination: {
    fontSize: 12,
    color: '#666',
  },
  compactRight: {
    alignItems: 'flex-end',
  },
  compactAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 4,
  },
  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6c3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  messageButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#6c3',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  messageButtonText: {
    color: '#6c3',
  },
});