// screens/rider/PackageTrackingScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  ScrollView,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

const { width, height } = Dimensions.get('window');

export default function PackageTrackingScreen({ navigation, route }) {
  const { packageId, packageData } = route.params || {};
  
  const [trackingInfo, setTrackingInfo] = useState({
    status: 'in_transit',
    currentLocation: {
      latitude: -13.9626,
      longitude: 33.7741,
    },
    driver: {
      name: 'James Banda',
      phone: '+265 888 123 456',
      rating: 4.8,
      vehicle: 'Box Motorcycle',
      plate: 'KBZ 1234',
    },
    pickup: {
      address: 'Area 3, Lilongwe',
      coordinates: { latitude: -13.9583, longitude: 33.7689 },
      completed: true,
      time: '14:30',
    },
    dropoff: {
      address: 'Area 18, Lilongwe',
      coordinates: { latitude: -13.9917, longitude: 33.7753 },
      completed: false,
      estimatedTime: '15:15',
    },
    timeline: [
      { id: 1, status: 'Package picked up', time: '14:30', completed: true },
      { id: 2, status: 'In transit', time: '14:45', completed: true },
      { id: 3, status: 'Arriving at destination', time: '15:10', completed: false },
      { id: 4, status: 'Delivered', time: '15:15', completed: false },
    ],
    estimatedArrival: '15:15',
    distanceRemaining: '3.2 km',
  });

  const [region, setRegion] = useState({
    latitude: -13.9750,
    longitude: 33.7721,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  const getStatusColor = (status) => {
    switch(status) {
      case 'pending': return '#ff9800';
      case 'picked_up': return '#2196f3';
      case 'in_transit': return '#00a82d';
      case 'out_for_delivery': return '#00a82d';
      case 'delivered': return '#4caf50';
      default: return '#666';
    }
  };

  const handleContactDriver = () => {
    // Implement call or chat functionality
  };

  const handleShareLocation = () => {
    // Implement share location
  };

  const handleGetHelp = () => {
    navigation.navigate('HelpSupport', { context: 'package_tracking', packageId });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Track Package</Text>
        <TouchableOpacity onPress={handleShareLocation}>
          <MaterialIcon name="share" size={24} color="#00a82d" />
        </TouchableOpacity>
      </View>

      {/* Map View */}
      <View style={styles.mapContainer}>
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          region={region}
          showsUserLocation={true}
          showsMyLocationButton={false}
        >
          {/* Pickup Marker */}
          <Marker
            coordinate={trackingInfo.pickup.coordinates}
            title="Pickup Location"
            description={trackingInfo.pickup.address}
          >
            <View style={[styles.marker, { backgroundColor: '#00a82d' }]}>
              <MaterialIcon name="check" size={16} color="#fff" />
            </View>
          </Marker>

          {/* Dropoff Marker */}
          <Marker
            coordinate={trackingInfo.dropoff.coordinates}
            title="Delivery Location"
            description={trackingInfo.dropoff.address}
          >
            <View style={[styles.marker, { backgroundColor: '#ff4444' }]}>
              <MaterialIcon name="location-on" size={16} color="#fff" />
            </View>
          </Marker>

          {/* Driver Location Marker */}
          <Marker
            coordinate={trackingInfo.currentLocation}
            title="Driver Location"
            description={trackingInfo.driver.name}
          >
            <View style={styles.driverMarker}>
              <MaterialIcon name="motorcycle" size={24} color="#fff" />
            </View>
          </Marker>

          {/* Route Polyline */}
          <Polyline
            coordinates={[
              trackingInfo.pickup.coordinates,
              trackingInfo.currentLocation,
              trackingInfo.dropoff.coordinates,
            ]}
            strokeColor="#00a82d"
            strokeWidth={4}
            lineDashPattern={[0]}
          />
        </MapView>

        {/* Driver Info Card - Overlay */}
        <View style={styles.driverCard}>
          <View style={styles.driverInfo}>
            <View style={styles.driverAvatar}>
              <Text style={styles.driverAvatarText}>
                {trackingInfo.driver.name.charAt(0)}
              </Text>
            </View>
            <View style={styles.driverDetails}>
              <Text style={styles.driverName}>{trackingInfo.driver.name}</Text>
              <View style={styles.driverMeta}>
                <View style={styles.ratingContainer}>
                  <MaterialIcon name="star" size={14} color="#FFD700" />
                  <Text style={styles.ratingText}>{trackingInfo.driver.rating}</Text>
                </View>
                <Text style={styles.driverVehicle}>{trackingInfo.driver.vehicle}</Text>
                <Text style={styles.driverPlate}>{trackingInfo.driver.plate}</Text>
              </View>
            </View>
          </View>
          <View style={styles.driverActions}>
            <TouchableOpacity style={styles.driverAction} onPress={handleContactDriver}>
              <MaterialIcon name="phone" size={20} color="#00a82d" />
              <Text style={styles.driverActionText}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.driverAction}>
              <MaterialIcon name="chat" size={20} color="#00a82d" />
              <Text style={styles.driverActionText}>Chat</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ETA Card - Overlay */}
        <View style={styles.etaCard}>
          <View style={styles.etaLeft}>
            <MaterialIcon name="access-time" size={20} color="#00a82d" />
            <View style={styles.etaInfo}>
              <Text style={styles.etaLabel}>Estimated arrival</Text>
              <Text style={styles.etaValue}>{trackingInfo.estimatedArrival}</Text>
            </View>
          </View>
          <View style={styles.etaRight}>
            <Text style={styles.distanceRemaining}>{trackingInfo.distanceRemaining}</Text>
            <Text style={styles.distanceLabel}>remaining</Text>
          </View>
        </View>
      </View>

      {/* Bottom Sheet with Timeline */}
      <View style={styles.bottomSheet}>
        <View style={styles.handleContainer}>
          <View style={styles.handle} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Package ID */}
          <View style={styles.packageIdContainer}>
            <Text style={styles.packageIdLabel}>Package ID</Text>
            <Text style={styles.packageIdValue}>{packageId || 'KBZ-2026-0215-001'}</Text>
            <TouchableOpacity>
              <MaterialIcon name="content-copy" size={16} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Timeline */}
          <View style={styles.timelineContainer}>
            <Text style={styles.timelineTitle}>Delivery Progress</Text>
            
            {trackingInfo.timeline.map((item, index) => (
              <View key={item.id} style={styles.timelineItem}>
                <View style={styles.timelineLeft}>
                  <View style={[
                    styles.timelineDot,
                    item.completed && styles.timelineDotCompleted
                  ]}>
                    {item.completed && <MaterialIcon name="check" size={10} color="#fff" />}
                  </View>
                  {index < trackingInfo.timeline.length - 1 && (
                    <View style={[
                      styles.timelineLine,
                      item.completed && styles.timelineLineCompleted
                    ]} />
                  )}
                </View>
                
                <View style={styles.timelineContent}>
                  <Text style={[
                    styles.timelineStatus,
                    item.completed && styles.timelineStatusCompleted
                  ]}>
                    {item.status}
                  </Text>
                  <Text style={styles.timelineTime}>{item.time}</Text>
                </View>

                {item.completed && (
                  <MaterialIcon name="check-circle" size={16} color="#00a82d" />
                )}
              </View>
            ))}
          </View>

          {/* Location Details */}
          <View style={styles.locationsContainer}>
            <View style={styles.locationItem}>
              <View style={[styles.locationDot, { backgroundColor: '#00a82d' }]} />
              <View style={styles.locationInfo}>
                <Text style={styles.locationLabel}>PICKUP</Text>
                <Text style={styles.locationAddress}>{trackingInfo.pickup.address}</Text>
                <Text style={styles.locationTime}>Picked up at {trackingInfo.pickup.time}</Text>
              </View>
            </View>

            <View style={styles.locationLine} />

            <View style={styles.locationItem}>
              <View style={[styles.locationDot, { backgroundColor: '#ff4444' }]} />
              <View style={styles.locationInfo}>
                <Text style={styles.locationLabel}>DELIVERY</Text>
                <Text style={styles.locationAddress}>{trackingInfo.dropoff.address}</Text>
                <Text style={styles.locationTime}>Estimated {trackingInfo.dropoff.estimatedTime}</Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.supportButton} onPress={handleGetHelp}>
              <MaterialIcon name="support-agent" size={20} color="#666" />
              <Text style={styles.supportButtonText}>Get Support</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.detailsButton}
              onPress={() => navigation.navigate('PackageDetails', { packageId })}
            >
              <MaterialIcon name="info" size={20} color="#666" />
              <Text style={styles.detailsButtonText}>Package Details</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  mapContainer: {
    height: height * 0.4,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  marker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  driverMarker: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#00a82d',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  driverCard: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  driverInfo: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#00a82d',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  driverAvatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  driverMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  ratingText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 2,
  },
  driverVehicle: {
    fontSize: 12,
    color: '#666',
    marginRight: 8,
  },
  driverPlate: {
    fontSize: 12,
    color: '#00a82d',
    fontWeight: '600',
  },
  driverActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  driverAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverActionText: {
    fontSize: 14,
    color: '#00a82d',
    marginLeft: 8,
  },
  etaCard: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  etaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  etaInfo: {
    marginLeft: 8,
  },
  etaLabel: {
    fontSize: 10,
    color: '#999',
  },
  etaValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  etaRight: {
    alignItems: 'flex-end',
  },
  distanceRemaining: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00a82d',
  },
  distanceLabel: {
    fontSize: 10,
    color: '#999',
  },
  bottomSheet: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
    paddingHorizontal: 20,
  },
  handleContainer: {
    paddingTop: 12,
    paddingBottom: 8,
    alignItems: 'center',
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
  },
  packageIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  packageIdLabel: {
    fontSize: 12,
    color: '#666',
    marginRight: 8,
  },
  packageIdValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  timelineContainer: {
    marginBottom: 20,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  timelineLeft: {
    width: 24,
    alignItems: 'center',
    marginRight: 12,
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineDotCompleted: {
    backgroundColor: '#00a82d',
    borderColor: '#00a82d',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 2,
  },
  timelineLineCompleted: {
    backgroundColor: '#00a82d',
  },
  timelineContent: {
    flex: 1,
  },
  timelineStatus: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  timelineStatusCompleted: {
    color: '#000',
    fontWeight: '600',
  },
  timelineTime: {
    fontSize: 12,
    color: '#999',
  },
  locationsContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  locationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
    marginRight: 12,
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 10,
    color: '#999',
    marginBottom: 2,
  },
  locationAddress: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  locationTime: {
    fontSize: 12,
    color: '#666',
  },
  locationLine: {
    width: 2,
    height: 20,
    backgroundColor: '#e0e0e0',
    marginLeft: 5,
    marginVertical: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  supportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginRight: 8,
  },
  supportButtonText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  detailsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginLeft: 8,
  },
  detailsButtonText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
});