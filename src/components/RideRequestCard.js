// src/components/RideRequestCard.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

const RideRequestCard = ({ 
  request,
  onAccept,
  onDecline,
  onViewDetails
}) => {
  const { rider, pickup, destination, fare, distance, eta, timestamp } = request;

  return (
    <View style={styles.card}>
      {/* Rider Info */}
      <View style={styles.riderInfo}>
        <View style={styles.avatarContainer}>
          {rider.avatar ? (
            <Image source={{ uri: rider.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <MaterialIcon name="person" size={24} color="#6B7280" />
            </View>
          )}
        </View>
        <View style={styles.riderDetails}>
          <Text style={styles.riderName}>{rider.name}</Text>
          <View style={styles.ratingContainer}>
            <MaterialIcon name="star" size={14} color="#FBBF24" />
            <Text style={styles.rating}>{rider.rating}</Text>
            <Text style={styles.ridesCount}>({rider.totalRides} rides)</Text>
          </View>
        </View>
        <Text style={styles.timeAgo}>{timestamp}</Text>
      </View>

      {/* Route */}
      <View style={styles.route}>
        <View style={styles.location}>
          <MaterialIcon name="circle" size={12} color="#10B981" />
          <Text style={styles.locationText} numberOfLines={1}>{pickup}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.location}>
          <MaterialIcon name="location-pin" size={14} color="#EF4444" />
          <Text style={styles.locationText} numberOfLines={1}>{destination}</Text>
        </View>
      </View>

      {/* Fare & Info */}
      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <MaterialIcon name="attach-money" size={16} color="#10B981" />
          <Text style={styles.infoText}>MK {fare}</Text>
        </View>
        <View style={styles.infoItem}>
          <MaterialIcon name="directions-car" size={16} color="#3B82F6" />
          <Text style={styles.infoText}>{distance}</Text>
        </View>
        <View style={styles.infoItem}>
          <MaterialIcon name="access-time" size={16} color="#F59E0B" />
          <Text style={styles.infoText}>{eta}</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity 
          style={[styles.button, styles.declineButton]}
          onPress={() => onDecline(request.id)}
        >
          <MaterialIcon name="close" size={18} color="#EF4444" />
          <Text style={styles.declineText}>Decline</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.acceptButton]}
          onPress={() => onAccept(request.id)}
        >
          <MaterialIcon name="check" size={18} color="#FFFFFF" />
          <Text style={styles.acceptText}>Accept</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.detailsButton}
          onPress={() => onViewDetails(request.id)}
        >
          <MaterialIcon name="more-horiz" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  riderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  riderDetails: {
    flex: 1,
  },
  riderName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
    marginRight: 8,
  },
  ridesCount: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  timeAgo: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  route: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  locationText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
    marginLeft: 6,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 6,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  declineButton: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  declineText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  acceptButton: {
    backgroundColor: '#10B981',
  },
  acceptText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  detailsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default RideRequestCard;