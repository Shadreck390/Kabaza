// components/DriverCard.js
import React, { useMemo } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Image,
  Platform 
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

// Constants
const STATUS_CONFIG = {
  available: { 
    color: '#10B981', 
    bgColor: '#D1FAE5', 
    icon: 'check-circle', 
    text: 'Available' 
  },
  booked: { 
    color: '#F59E0B', 
    bgColor: '#FEF3C7', 
    icon: 'clock-o', 
    text: 'Booked' 
  },
  completed: { 
    color: '#6B7280', 
    bgColor: '#F3F4F6', 
    icon: 'check', 
    text: 'Completed' 
  },
  cancelled: { 
    color: '#EF4444', 
    bgColor: '#FEE2E2', 
    icon: 'times', 
    text: 'Cancelled' 
  },
  ongoing: { 
    color: '#3B82F6', 
    bgColor: '#DBEAFE', 
    icon: 'car', 
    text: 'On Trip' 
  },
  pending: { 
    color: '#F59E0B', 
    bgColor: '#FEF3C7', 
    icon: 'hourglass-half', 
    text: 'Pending' 
  },
};

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
  style,
  testID 
}) {
  // Format date for display
  const formattedDate = useMemo(() => {
    if (!ride?.date) return '';
    try {
      const date = new Date(ride.date);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return '';
    }
  }, [ride?.date]);

  // Get status info
  const statusInfo = useMemo(() => {
    return STATUS_CONFIG[ride?.status] || STATUS_CONFIG.available;
  }, [ride?.status]);

  // Memoize card styles
  const cardStyles = useMemo(() => [
    styles.card,
    compact && styles.compactCard,
    selected && styles.selectedCard,
    style
  ], [compact, selected, style]);

  // Render avatar
  const renderAvatar = (size = 'normal') => {
    const isCompact = size === 'compact';
    const avatarSize = isCompact ? 32 : 44;
    const iconSize = isCompact ? 16 : 20;

    if (ride?.driverAvatar) {
      return (
        <Image 
          source={{ uri: ride.driverAvatar }} 
          style={[
            styles.avatarImage,
            { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }
          ]} 
        />
      );
    }

    return (
      <View style={[
        isCompact ? styles.driverAvatar : styles.avatarPlaceholder,
        { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }
      ]}>
        <Icon name="user" size={iconSize} color="#4CAF50" />
      </View>
    );
  };

  // Render star rating
  const renderRating = (rating) => {
    if (!rating) return null;
    
    return (
      <View style={styles.ratingContainer}>
        <Icon name="star" size={12} color="#FFD700" />
        <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
      </View>
    );
  };

  // Render status badge
  const renderStatusBadge = () => {
    if (!showStatus || !ride?.status) return null;

    return (
      <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
        <Icon name={statusInfo.icon} size={compact ? 8 : 10} color={statusInfo.color} />
        <Text style={[styles.statusText, { color: statusInfo.color }]}>
          {statusInfo.text}
        </Text>
      </View>
    );
  };

  // Render action buttons
  const renderActionButtons = () => {
    if (ride?.status !== 'available' || (!onCallPress && !onMessagePress)) {
      return null;
    }

    return (
      <View style={styles.actionButtons}>
        {onCallPress && ride?.driverPhone && (
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => onCallPress(ride.driverPhone)}
            activeOpacity={0.7}
            accessibilityLabel="Call driver"
            accessibilityRole="button"
          >
            <Icon name="phone" size={14} color="#fff" />
            <Text style={styles.actionButtonText}>Call</Text>
          </TouchableOpacity>
        )}
        {onMessagePress && ride?.driverId && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.messageButton]}
            onPress={() => onMessagePress(ride.driverId)}
            activeOpacity={0.7}
            accessibilityLabel="Message driver"
            accessibilityRole="button"
          >
            <Icon name="comment" size={14} color="#4CAF50" />
            <Text style={[styles.actionButtonText, styles.messageButtonText]}>Message</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Compact version
  if (compact) {
    return (
      <TouchableOpacity
        style={cardStyles}
        onPress={onPress}
        activeOpacity={0.7}
        testID={testID}
        accessibilityRole="button"
        disabled={!onPress}
      >
        <View style={styles.compactContent}>
          <View style={styles.compactLeft}>
            {renderAvatar('compact')}
            <View style={styles.compactInfo}>
              <Text style={styles.compactName} numberOfLines={1}>
                {ride?.driverName || 'Unknown Driver'}
              </Text>
              <Text style={styles.compactDestination} numberOfLines={1}>
                {ride?.destination || 'No destination'}
              </Text>
            </View>
          </View>
          <View style={styles.compactRight}>
            <Text style={styles.compactAmount}>
              MWK {ride?.amount?.toLocaleString() || '0'}
            </Text>
            {renderStatusBadge()}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // Full version
  return (
    <TouchableOpacity
      style={cardStyles}
      onPress={onPress}
      activeOpacity={0.7}
      testID={testID}
      accessibilityRole="button"
      disabled={!onPress}
    >
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.driverInfo}>
          <View style={styles.avatarContainer}>
            {renderAvatar('normal')}
          </View>
          <View style={styles.driverDetails}>
            <Text style={styles.driverName} numberOfLines={1}>
              {ride?.driverName || 'Unknown Driver'}
            </Text>
            {showRating && ride?.driverRating && renderRating(ride.driverRating)}
            {showVehicleInfo && ride?.vehicleType && (
              <Text style={styles.vehicleInfo} numberOfLines={1}>
                {ride.vehicleColor} {ride.vehicleType} • {ride.vehiclePlate}
              </Text>
            )}
          </View>
        </View>
        <Text style={styles.amount}>
          MWK {ride?.amount?.toLocaleString() || '0'}
        </Text>
      </View>

      {/* Route Information */}
      {(ride?.pickupName || ride?.destination) && (
        <View style={styles.routeSection}>
          <View style={styles.routeLine}>
            <View style={styles.dotStart} />
            <View style={styles.routeDots} />
            <View style={styles.dotEnd} />
          </View>
          <View style={styles.routeText}>
            {ride?.pickupName && (
              <View style={styles.location}>
                <Text style={styles.locationLabel}>From:</Text>
                <Text style={styles.locationText} numberOfLines={2}>
                  {ride.pickupName}
                </Text>
              </View>
            )}
            {ride?.destination && (
              <View style={styles.location}>
                <Text style={styles.locationLabel}>To:</Text>
                <Text style={styles.locationText} numberOfLines={2}>
                  {ride.destination}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Additional Info */}
      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          {ride?.estimatedTime && (
            <View style={styles.infoItem}>
              <Icon name="clock-o" size={12} color="#666" />
              <Text style={styles.infoText}>{ride.estimatedTime}</Text>
            </View>
          )}
          {ride?.distance && (
            <View style={styles.infoItem}>
              <Icon name="map-marker" size={12} color="#666" />
              <Text style={styles.infoText}>{ride.distance}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.footerRight}>
          {renderStatusBadge()}
          {formattedDate && (
            <Text style={styles.date}>{formattedDate}</Text>
          )}
        </View>
      </View>

      {/* Action Buttons */}
      {renderActionButtons()}
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
    borderWidth: 1,
    borderColor: '#f0f0f0',
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
  },
  compactCard: {
    padding: 12,
    marginVertical: 4,
  },
  selectedCard: {
    backgroundColor: '#f0fdf4',
    borderColor: '#4CAF50',
    borderWidth: 2,
    ...Platform.select({
      ios: {
        shadowOpacity: 0.15,
      },
      android: {
        elevation: 5,
      },
    }),
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
    marginRight: 8,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatarImage: {
    backgroundColor: '#f5f5f5',
  },
  avatarPlaceholder: {
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
    fontWeight: '600',
  },
  vehicleInfo: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  amount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4CAF50',
  },
  
  // Route Styles
  routeSection: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingVertical: 4,
  },
  routeLine: {
    width: 24,
    alignItems: 'center',
    marginRight: 12,
  },
  dotStart: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4CAF50',
  },
  routeDots: {
    flex: 1,
    width: 2,
    backgroundColor: '#e5e7eb',
    marginVertical: 4,
    minHeight: 20,
  },
  dotEnd: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F59E0B',
  },
  routeText: {
    flex: 1,
  },
  location: {
    marginBottom: 8,
  },
  locationLabel: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '600',
    marginBottom: 2,
  },
  locationText: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
  },
  
  // Footer Styles
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  infoText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
    fontWeight: '500',
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
    fontWeight: '700',
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  date: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '500',
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
    marginRight: 8,
  },
  driverAvatar: {
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  compactInfo: {
    flex: 1,
  },
  compactName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 2,
  },
  compactDestination: {
    fontSize: 12,
    color: '#6b7280',
  },
  compactRight: {
    alignItems: 'flex-end',
  },
  compactAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4CAF50',
    marginBottom: 4,
  },
  
  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 8,
    flex: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#4CAF50',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  messageButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#4CAF50',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  messageButtonText: {
    color: '#4CAF50',
  },
});
