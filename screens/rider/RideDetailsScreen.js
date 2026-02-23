import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  Image,
  Alert,
  Share,
  Linking,
  Modal,
  Animated,
  SafeAreaView,
  Easing,
  Platform,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { MaterialIconFallback as MaterialIcon } from '@src/utils/iconUtils';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useRoute, useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

// Mock ride details data (keep your existing data)
const RIDE_DETAILS = {
  '1': {
    id: '1',
    date: 'Today, 10:45 AM',
    pickup: {
      name: 'Area 3 Shopping Complex',
      address: 'Area 3, Lilongwe, Malawi',
      coordinates: { latitude: -13.9583, longitude: 33.7689 },
    },
    destination: {
      name: 'Lilongwe City Mall',
      address: 'M1 Road, Lilongwe, Malawi',
      coordinates: { latitude: -13.9772, longitude: 33.7720 },
    },
    driver: {
      name: 'John Banda',
      phone: '+265 88 123 4567',
      vehicle: 'Toyota Corolla',
      plate: 'LL 2345 A',
      rating: 4.8,
      trips: 1247,
      photo: null,
    },
    fare: {
      base: 500,
      distance: 250,
      time: 100,
      total: 850,
      currency: 'MWK',
    },
    distance: '2.5 km',
    duration: '8 min',
    status: 'completed',
    paymentMethod: 'cash',
    receiptId: 'RCPT-2024-001',
    routeCoordinates: [
      { latitude: -13.9583, longitude: 33.7689 },
      { latitude: -13.9620, longitude: 33.7700 },
      { latitude: -13.9650, longitude: 33.7710 },
      { latitude: -13.9700, longitude: 33.7720 },
      { latitude: -13.9772, longitude: 33.7720 },
    ],
    timeline: [
      { time: '10:45 AM', status: 'Ride requested', icon: 'schedule' },
      { time: '10:46 AM', status: 'Driver John Banda accepted', icon: 'check-circle' },
      { time: '10:48 AM', status: 'Driver arriving', icon: 'directions-car' },
      { time: '10:50 AM', status: 'Ride started', icon: 'play-circle' },
      { time: '10:58 AM', status: 'Ride completed', icon: 'check-circle' },
      { time: '10:59 AM', status: 'Payment received', icon: 'payment' },
    ],
    rating: {
      driver: 5,
      rider: 5,
      driverComment: 'Great passenger, on time',
      riderComment: 'Safe driver, good service',
    },
  },
  // ... keep your other mock data
};

export default function RideDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { rideId, rideData } = route.params || {};
  
  const [ride, setRide] = useState(rideData || RIDE_DETAILS[rideId] || RIDE_DETAILS['1']);
  const [mapRegion, setMapRegion] = useState({
    latitude: -13.9650,
    longitude: 33.7750,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const [activeTab, setActiveTab] = useState('details');
  const [showFullMap, setShowFullMap] = useState(false);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const tabSlide = useRef(new Animated.Value(20)).current;
  const mapAnim = useRef(new Animated.Value(0)).current;
  const receiptAnim = useRef(new Animated.Value(0)).current;
  const detailsAnim = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const modalSlide = useRef(new Animated.Value(height)).current;
  const timelineAnim = useRef([]).current;
  const mapMarkersScale = useRef({
    pickup: new Animated.Value(1),
    destination: new Animated.Value(1),
  }).current;
  const mapRouteAnim = useRef(new Animated.Value(0)).current;

  // Initialize timeline animations
  if (timelineAnim.length !== ride.timeline.length) {
    ride.timeline.forEach((_, index) => {
      timelineAnim[index] = {
        opacity: new Animated.Value(0),
        translateX: new Animated.Value(-20),
      };
    });
  }

  useEffect(() => {
    // Initial animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
      Animated.timing(tabSlide, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
        delay: 200,
      }),
    ]).start();

    // Map animations
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(mapAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(mapRouteAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]).start();
    }, 300);

    // Animate map markers
    Animated.loop(
      Animated.sequence([
        Animated.timing(mapMarkersScale.pickup, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(mapMarkersScale.pickup, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.delay(500),
        Animated.timing(mapMarkersScale.destination, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(mapMarkersScale.destination, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Animate timeline items
    ride.timeline.forEach((_, index) => {
      Animated.sequence([
        Animated.delay(index * 200),
        Animated.parallel([
          Animated.timing(timelineAnim[index].opacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(timelineAnim[index].translateX, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    });

    // Center map on route
    if (ride) {
      const midLat = (ride.pickup.coordinates.latitude + ride.destination.coordinates.latitude) / 2;
      const midLng = (ride.pickup.coordinates.longitude + ride.destination.coordinates.longitude) / 2;
      setMapRegion({
        latitude: midLat,
        longitude: midLng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    }

    return () => {
      // Cleanup animations
      mapMarkersScale.pickup.stopAnimation();
      mapMarkersScale.destination.stopAnimation();
    };
  }, [ride]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // Animate tab content
    if (tab === 'details') {
      Animated.timing(detailsAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else if (tab === 'receipt') {
      Animated.timing(receiptAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleShareReceipt = async () => {
    // Button press animation
    Animated.sequence([
      Animated.spring(buttonScale, {
        toValue: 0.9,
        useNativeDriver: true,
        tension: 150,
        friction: 3,
      }),
      Animated.spring(buttonScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 150,
        friction: 3,
      }),
    ]).start();

    setTimeout(async () => {
      try {
        const message = `Kabaza Ride Receipt\n\n` +
          `Receipt ID: ${ride.receiptId}\n` +
          `Date: ${ride.date}\n` +
          `From: ${ride.pickup.name}\n` +
          `To: ${ride.destination.name}\n` +
          `Driver: ${ride.driver.name}\n` +
          `Vehicle: ${ride.driver.vehicle} (${ride.driver.plate})\n` +
          `Distance: ${ride.distance}\n` +
          `Duration: ${ride.duration}\n` +
          `Total Fare: MK ${ride.fare.total}\n` +
          `Payment Method: ${ride.paymentMethod}\n` +
          `Status: ${ride.status}`;
        
        await Share.share({
          message,
          title: `Kabaza Receipt - ${ride.receiptId}`,
        });
      } catch (error) {
        Alert.alert('Error', 'Could not share receipt');
      }
    }, 150);
  };

  const handleContactDriver = () => {
    // Button press animation
    const contactScale = new Animated.Value(1);
    Animated.sequence([
      Animated.spring(contactScale, {
        toValue: 0.9,
        useNativeDriver: true,
        tension: 150,
        friction: 3,
      }),
      Animated.spring(contactScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 150,
        friction: 3,
      }),
    ]).start();

    setTimeout(() => {
      Alert.alert(
        'Contact Driver',
        `Call ${ride.driver.name} at ${ride.driver.phone}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Call', 
            onPress: () => Linking.openURL(`tel:${ride.driver.phone.replace(/\s/g, '')}`)
          },
          { 
            text: 'Message', 
            onPress: () => Linking.openURL(`sms:${ride.driver.phone.replace(/\s/g, '')}`)
          },
        ]
      );
    }, 150);
  };

  const handleReportIssue = () => {
    navigation.navigate('HelpSupport', { 
      rideId: ride.id,
      rideData: ride,
    });
  };

  const handleRepeatRide = () => {
    navigation.navigate('RideSelection', {
      destination: ride.destination.name,
      pickupLocation: { name: ride.pickup.name },
      rideType: 'kabaza',
    });
  };

  const handleViewFullMap = () => {
    setShowFullMap(true);
    Animated.timing(modalSlide, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start();
  };

  const closeFullMap = () => {
    Animated.timing(modalSlide, {
      toValue: height,
      duration: 300,
      useNativeDriver: true,
      easing: Easing.in(Easing.cubic),
    }).start(() => {
      setShowFullMap(false);
    });
  };

  const renderDetailsTab = () => (
    <Animated.ScrollView 
      style={[styles.tabContent, { opacity: fadeAnim }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Driver Info */}
      <Animated.View 
        style={[
          styles.section,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Text style={styles.sectionTitle}>Driver & Vehicle</Text>
        <View style={styles.driverCard}>
          <View style={styles.driverInfo}>
            <LinearGradient
              colors={['#22C55E', '#16A34A']}
              style={styles.driverAvatar}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.driverInitials}>
                {ride.driver.name.split(' ').map(n => n[0]).join('')}
              </Text>
            </LinearGradient>
            <View style={styles.driverDetails}>
              <Text style={styles.driverName}>{ride.driver.name}</Text>
              <View style={styles.driverMeta}>
                <MaterialIcon name="star" size={14} color="#F59E0B" />
                <Text style={styles.driverRating}>{ride.driver.rating}</Text>
                <Text style={styles.driverDivider}>•</Text>
                <Text style={styles.driverTrips}>{ride.driver.trips.toLocaleString()} trips</Text>
              </View>
              <Text style={styles.driverVehicle}>
                {ride.driver.vehicle} • {ride.driver.plate}
              </Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.contactButton}
            onPress={handleContactDriver}
            activeOpacity={0.6}
          >
            <LinearGradient
              colors={['#22C55E', '#16A34A']}
              style={styles.contactButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialIcon name="phone" size={18} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Ride Summary */}
      <Animated.View 
        style={[
          styles.section,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Text style={styles.sectionTitle}>Ride Summary</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <LinearGradient
              colors={['#F3F4F6', '#E5E7EB']}
              style={styles.summaryIcon}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialIcon name="access-time" size={20} color="#666" />
            </LinearGradient>
            <Text style={styles.summaryValue}>{ride.duration}</Text>
            <Text style={styles.summaryLabel}>Duration</Text>
          </View>
          
          <View style={styles.summaryItem}>
            <LinearGradient
              colors={['#F3F4F6', '#E5E7EB']}
              style={styles.summaryIcon}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialIcon name="map" size={20} color="#666" />
            </LinearGradient>
            <Text style={styles.summaryValue}>{ride.distance}</Text>
            <Text style={styles.summaryLabel}>Distance</Text>
          </View>
          
          <View style={styles.summaryItem}>
            <LinearGradient
              colors={['#F3F4F6', '#E5E7EB']}
              style={styles.summaryIcon}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialIcon name="attach-money" size={20} color="#666" />
            </LinearGradient>
            <Text style={styles.summaryValue}>MK {ride.fare.total}</Text>
            <Text style={styles.summaryLabel}>Fare</Text>
          </View>
          
          <View style={styles.summaryItem}>
            <LinearGradient
              colors={['#F3F4F6', '#E5E7EB']}
              style={styles.summaryIcon}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialIcon name="payment" size={20} color="#666" />
            </LinearGradient>
            <Text style={styles.summaryValue}>
              {ride.paymentMethod === 'cash' ? 'Cash' : 
               ride.paymentMethod === 'mobile_money' ? 'Mobile Money' : 
               ride.paymentMethod === 'card' ? 'Card' : 'Wallet'}
            </Text>
            <Text style={styles.summaryLabel}>Payment</Text>
          </View>
        </View>
      </Animated.View>

      {/* Fare Breakdown */}
      <Animated.View 
        style={[
          styles.section,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Text style={styles.sectionTitle}>Fare Breakdown</Text>
        <LinearGradient
          colors={['#F9FAFB', '#F3F4F6']}
          style={styles.fareBreakdown}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Base Fare</Text>
            <Text style={styles.fareValue}>MK {ride.fare.base}</Text>
          </View>
          
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Distance ({ride.distance})</Text>
            <Text style={styles.fareValue}>MK {ride.fare.distance}</Text>
          </View>
          
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Time ({ride.duration})</Text>
            <Text style={styles.fareValue}>MK {ride.fare.time}</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={[styles.fareRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total Fare</Text>
            <Text style={styles.totalValue}>MK {ride.fare.total}</Text>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Timeline */}
      <Animated.View 
        style={[
          styles.section,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Text style={styles.sectionTitle}>Ride Timeline</Text>
        <View style={styles.timeline}>
          {ride.timeline.map((item, index) => {
            const anim = timelineAnim[index] || { opacity: new Animated.Value(1), translateX: new Animated.Value(0) };
            return (
              <Animated.View 
                key={index} 
                style={[
                  styles.timelineItem,
                  {
                    opacity: anim.opacity,
                    transform: [{ translateX: anim.translateX }],
                  },
                ]}
              >
                <LinearGradient
                  colors={['#22C55E', '#16A34A']}
                  style={styles.timelineIcon}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <MaterialIcon name={item.icon} size={14} color="#FFFFFF" />
                </LinearGradient>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTime}>{item.time}</Text>
                  <Text style={styles.timelineStatus}>{item.status}</Text>
                </View>
                {index < ride.timeline.length - 1 && (
                  <View style={styles.timelineLine} />
                )}
              </Animated.View>
            );
          })}
        </View>
      </Animated.View>

      {/* Ratings */}
      {ride.rating && (
        <Animated.View 
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.sectionTitle}>Ratings</Text>
          <LinearGradient
            colors={['#F9FAFB', '#F3F4F6']}
            style={styles.ratingsContainer}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.ratingItem}>
              <Text style={styles.ratingLabel}>You rated driver</Text>
              <View style={styles.ratingStars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <LinearGradient
                    key={star}
                    colors={star <= ride.rating.driver ? ['#F59E0B', '#D97706'] : ['#F3F4F6', '#E5E7EB']}
                    style={styles.starContainer}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <MaterialIcon 
                      name="star" 
                      size={16} 
                      color={star <= ride.rating.driver ? "#FFFFFF" : "#9CA3AF"} 
                    />
                  </LinearGradient>
                ))}
              </View>
              {ride.rating.riderComment && (
                <Text style={styles.ratingComment}>"{ride.rating.riderComment}"</Text>
              )}
            </View>
            
            {ride.rating.driverComment && (
              <View style={styles.ratingItem}>
                <Text style={styles.ratingLabel}>Driver's feedback</Text>
                <Text style={styles.ratingComment}>"{ride.rating.driverComment}"</Text>
              </View>
            )}
          </LinearGradient>
        </Animated.View>
      )}
    </Animated.ScrollView>
  );

  const renderReceiptTab = () => (
    <Animated.ScrollView 
      style={[styles.tabContent, { opacity: receiptAnim }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Receipt Header */}
      <LinearGradient
        colors={['#22C55E', '#16A34A']}
        style={styles.receiptHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          <MaterialIcon name="receipt" size={48} color="#FFFFFF" />
          <Text style={styles.receiptTitle}>Ride Receipt</Text>
          <Text style={styles.receiptId}>{ride.receiptId}</Text>
          <Text style={styles.receiptDate}>{ride.date}</Text>
        </Animated.View>
      </LinearGradient>

      {/* Receipt Details */}
      <Animated.View 
        style={[
          styles.receiptDetails,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <LinearGradient
          colors={['#FFFFFF', '#F8FAFC']}
          style={styles.receiptDetailsGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.receiptSection}>
            <Text style={styles.receiptSectionTitle}>Trip Details</Text>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>From</Text>
              <Text style={styles.receiptValue}>{ride.pickup.name}</Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>To</Text>
              <Text style={styles.receiptValue}>{ride.destination.name}</Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Distance</Text>
              <Text style={styles.receiptValue}>{ride.distance}</Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Duration</Text>
              <Text style={styles.receiptValue}>{ride.duration}</Text>
            </View>
          </View>

          <View style={styles.receiptSection}>
            <Text style={styles.receiptSectionTitle}>Driver Details</Text>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Name</Text>
              <Text style={styles.receiptValue}>{ride.driver.name}</Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Vehicle</Text>
              <Text style={styles.receiptValue}>{ride.driver.vehicle}</Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Plate Number</Text>
              <Text style={styles.receiptValue}>{ride.driver.plate}</Text>
            </View>
          </View>

          <View style={styles.receiptSection}>
            <Text style={styles.receiptSectionTitle}>Payment Details</Text>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Base Fare</Text>
              <Text style={styles.receiptValue}>MK {ride.fare.base}</Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Distance Fare</Text>
              <Text style={styles.receiptValue}>MK {ride.fare.distance}</Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Time Fare</Text>
              <Text style={styles.receiptValue}>MK {ride.fare.time}</Text>
            </View>
            <View style={styles.receiptDivider} />
            <View style={[styles.receiptRow, styles.receiptTotalRow]}>
              <Text style={styles.receiptTotalLabel}>Total Amount</Text>
              <Text style={styles.receiptTotalValue}>MK {ride.fare.total}</Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Payment Method</Text>
              <Text style={styles.receiptValue}>
                {ride.paymentMethod === 'cash' ? 'Cash' : 
                 ride.paymentMethod === 'mobile_money' ? 'Mobile Money' : 
                 ride.paymentMethod === 'card' ? 'Card' : 'Wallet'}
              </Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Status</Text>
              <LinearGradient
                colors={ride.status === 'completed' ? ['#DCFCE7', '#BBF7D0'] : ['#FEF2F2', '#FECACA']}
                style={styles.statusBadge}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={[
                  styles.statusText,
                  { color: ride.status === 'completed' ? '#16A34A' : '#DC2626' }
                ]}>
                  {ride.status.charAt(0).toUpperCase() + ride.status.slice(1)}
                </Text>
              </LinearGradient>
            </View>
          </View>

          <View style={styles.receiptFooter}>
            <Text style={styles.receiptFooterText}>
              Thank you for choosing Kabaza!
            </Text>
            <Text style={styles.receiptFooterNote}>
              This is an electronic receipt. No signature required.
            </Text>
          </View>
        </LinearGradient>
      </Animated.View>
    </Animated.ScrollView>
  );

  const renderMapTab = () => (
    <View style={styles.mapTab}>
      <Animated.View 
        style={[
          styles.mapContainer,
          {
            opacity: mapAnim,
          },
        ]}
      >
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          region={mapRegion}
          showsUserLocation={false}
        >
          {/* Pickup Marker with Animation */}
          <Marker
            coordinate={ride.pickup.coordinates}
            title="Pickup"
            description={ride.pickup.address}
          >
            <Animated.View style={[
              styles.mapMarker,
              { transform: [{ scale: mapMarkersScale.pickup }] }
            ]}>
              <LinearGradient
                colors={['#3B82F6', '#2563EB']}
                style={styles.mapMarkerInner}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialIcon name="location-pin" size={24} color="#FFFFFF" />
              </LinearGradient>
            </Animated.View>
          </Marker>

          {/* Destination Marker with Animation */}
          <Marker
            coordinate={ride.destination.coordinates}
            title="Destination"
            description={ride.destination.address}
          >
            <Animated.View style={[
              styles.mapMarker,
              { transform: [{ scale: mapMarkersScale.destination }] }
            ]}>
              <LinearGradient
                colors={['#EF4444', '#DC2626']}
                style={styles.mapMarkerInner}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialIcon name="place" size={24} color="#FFFFFF" />
              </LinearGradient>
            </Animated.View>
          </Marker>

          {/* Animated Route Polyline */}
          {ride.routeCoordinates && (
            <AnimatedPolyline
              coordinates={ride.routeCoordinates}
              strokeColor="#22C55E"
              strokeWidth={4}
              opacity={mapRouteAnim}
            />
          )}
        </MapView>
      </Animated.View>

      <Animated.View 
        style={[
          styles.mapOverlay,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <LinearGradient
          colors={['#FFFFFF', '#F8FAFC']}
          style={styles.mapOverlayGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.mapTitle}>Ride Route</Text>
          <Text style={styles.mapSubtitle}>
            {ride.pickup.name} → {ride.destination.name}
          </Text>
          
          <View style={styles.mapStats}>
            <View style={styles.mapStat}>
              <LinearGradient
                colors={['#F3F4F6', '#E5E7EB']}
                style={styles.mapStatIcon}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialIcon name="map" size={14} color="#666" />
              </LinearGradient>
              <Text style={styles.mapStatText}>{ride.distance}</Text>
            </View>
            <View style={styles.mapStat}>
              <LinearGradient
                colors={['#F3F4F6', '#E5E7EB']}
                style={styles.mapStatIcon}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialIcon name="access-time" size={14} color="#666" />
              </LinearGradient>
              <Text style={styles.mapStatText}>{ride.duration}</Text>
            </View>
            <View style={styles.mapStat}>
              <LinearGradient
                colors={['#F3F4F6', '#E5E7EB']}
                style={styles.mapStatIcon}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialIcon name="directions-car" size={14} color="#666" />
              </LinearGradient>
              <Text style={styles.mapStatText}>{ride.driver.vehicle}</Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    </View>
  );

  const renderFullMap = () => (
    <Modal
      visible={showFullMap}
      animationType="none"
      transparent={true}
      onRequestClose={closeFullMap}
    >
      <Animated.View 
        style={[
          styles.modalOverlay,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <Animated.View 
          style={[
            styles.fullMapContainer,
            {
              transform: [{ translateY: modalSlide }],
            },
          ]}
        >
          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.fullMap}
            region={mapRegion}
          >
            <Marker coordinate={ride.pickup.coordinates}>
              <View style={styles.fullMapMarker}>
                <LinearGradient
                  colors={['#3B82F6', '#2563EB']}
                  style={styles.fullMapMarkerInner}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <MaterialIcon name="location-pin" size={30} color="#FFFFFF" />
                </LinearGradient>
              </View>
            </Marker>
            
            <Marker coordinate={ride.destination.coordinates}>
              <View style={styles.fullMapMarker}>
                <LinearGradient
                  colors={['#EF4444', '#DC2626']}
                  style={styles.fullMapMarkerInner}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <MaterialIcon name="place" size={30} color="#FFFFFF" />
                </LinearGradient>
              </View>
            </Marker>
            
            {ride.routeCoordinates && (
              <Polyline
                coordinates={ride.routeCoordinates}
                strokeColor="#22C55E"
                strokeWidth={6}
              />
            )}
          </MapView>
          
          <TouchableOpacity 
            style={styles.closeMapButton}
            onPress={closeFullMap}
            activeOpacity={0.6}
          >
            <LinearGradient
              colors={['#FFFFFF', '#F3F4F6']}
              style={styles.closeMapButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialIcon name="close" size={20} color="#000" />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Animated HEADER */}
      <Animated.View 
        style={[
          styles.header,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.6}
        >
          <LinearGradient
            colors={['#F1F5F9', '#E2E8F0']}
            style={styles.backButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <MaterialIcon name="arrow-back" size={20} color="#000000" />
          </LinearGradient>
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Ride Details</Text>
        
        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <TouchableOpacity 
            style={styles.shareButton}
            onPress={handleShareReceipt}
            activeOpacity={0.6}
          >
            <LinearGradient
              colors={['#22C55E', '#16A34A']}
              style={styles.shareButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialIcon name="share" size={18} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>

      {/* Animated TABS */}
      <Animated.View 
        style={[
          styles.tabs,
          {
            opacity: fadeAnim,
            transform: [{ translateY: tabSlide }],
          },
        ]}
      >
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'details' && styles.activeTab]}
          onPress={() => handleTabChange('details')}
          activeOpacity={0.7}
        >
          {activeTab === 'details' ? (
            <LinearGradient
              colors={['#22C55E', '#16A34A']}
              style={styles.tabIndicator}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
          ) : null}
          <MaterialIcon name="list-alt" size={20} color={activeTab === 'details' ? '#22C55E' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'details' && styles.activeTabText]}>
            Details
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'receipt' && styles.activeTab]}
          onPress={() => handleTabChange('receipt')}
          activeOpacity={0.7}
        >
          {activeTab === 'receipt' ? (
            <LinearGradient
              colors={['#22C55E', '#16A34A']}
              style={styles.tabIndicator}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
          ) : null}
          <MaterialIcon name="receipt" size={20} color={activeTab === 'receipt' ? '#22C55E' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'receipt' && styles.activeTabText]}>
            Receipt
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'map' && styles.activeTab]}
          onPress={() => handleTabChange('map')}
          activeOpacity={0.7}
        >
          {activeTab === 'map' ? (
            <LinearGradient
              colors={['#22C55E', '#16A34A']}
              style={styles.tabIndicator}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
          ) : null}
          <MaterialIcon name="map" size={20} color={activeTab === 'map' ? '#22C55E' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'map' && styles.activeTabText]}>
            Map
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* CONTENT */}
      {activeTab === 'details' && renderDetailsTab()}
      {activeTab === 'receipt' && renderReceiptTab()}
      {activeTab === 'map' && renderMapTab()}

      {/* Animated ACTION BUTTONS */}
      <Animated.View 
        style={[
          styles.actions,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={handleRepeatRide}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={['#22C55E', '#16A34A']}
            style={styles.actionButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <MaterialIcon name="repeat" size={18} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Repeat Ride</Text>
          </LinearGradient>
        </TouchableOpacity>
        
        {activeTab === 'map' && (
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleViewFullMap}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['#3B82F6', '#2563EB']}
              style={styles.actionButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialIcon name="fullscreen" size={18} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Full Screen Map</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={handleReportIssue}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={['#6B7280', '#4B5563']}
            style={styles.actionButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <MaterialIcon name="help" size={18} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Report Issue</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* FULL SCREEN MAP MODAL */}
      {renderFullMap()}
    </SafeAreaView>
  );
}

// Create Animated Polyline component
const AnimatedPolyline = Animated.createAnimatedComponent(Polyline);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  
  // HEADER
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 20 : 40,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  backButton: {
    width: 44,
    height: 44,
  },
  backButtonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.3,
  },
  shareButton: {
    width: 44,
    height: 44,
  },
  shareButtonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  
  // TABS
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 18,
    alignItems: 'center',
    position: 'relative',
  },
  activeTab: {
    position: 'relative',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '25%',
    right: '25%',
    height: 3,
    borderRadius: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginTop: 6,
  },
  activeTabText: {
    color: '#22C55E',
    fontWeight: '700',
  },
  
  // TAB CONTENT
  tabContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 100,
  },
  
  // SECTIONS
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  
  // DRIVER CARD
  driverCard: {
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
    width: 56,
    height: 56,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  driverInitials: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  driverMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  driverRating: {
    fontSize: 14,
    fontWeight: '600',
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
  contactButton: {
    width: 44,
    height: 44,
  },
  contactButtonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  
  // SUMMARY GRID
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  summaryItem: {
    width: (width - 96) / 2,
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    margin: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  summaryIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  // FARE BREAKDOWN
  fareBreakdown: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  fareLabel: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  fareValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  totalRow: {
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#22C55E',
    letterSpacing: -0.5,
  },
  
  // TIMELINE
  timeline: {
    paddingLeft: 32,
  },
  timelineItem: {
    position: 'relative',
    paddingBottom: 20,
  },
  timelineIcon: {
    position: 'absolute',
    left: -32,
    top: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  timelineContent: {
    paddingLeft: 16,
  },
  timelineTime: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
    fontWeight: '600',
  },
  timelineStatus: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    lineHeight: 20,
  },
  timelineLine: {
    position: 'absolute',
    left: -14,
    top: 36,
    bottom: 0,
    width: 2,
    backgroundColor: '#E5E7EB',
    zIndex: 1,
  },
  
  // RATINGS
  ratingsContainer: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  ratingItem: {
    marginBottom: 20,
  },
  ratingLabel: {
    fontSize: 15,
    color: '#666',
    marginBottom: 12,
    fontWeight: '600',
  },
  ratingStars: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  starContainer: {
    width: 28,
    height: 28,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  ratingComment: {
    fontSize: 15,
    color: '#000000',
    fontStyle: 'italic',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    lineHeight: 20,
  },
  
  // RECEIPT TAB
  receiptHeader: {
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  receiptTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  receiptId: {
    fontSize: 15,
    color: '#FFFFFF',
    marginBottom: 4,
    opacity: 0.9,
    fontWeight: '600',
  },
  receiptDate: {
    fontSize: 15,
    color: '#FFFFFF',
    opacity: 0.9,
    fontWeight: '600',
  },
  receiptDetails: {
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
    overflow: 'hidden',
  },
  receiptDetailsGradient: {
    padding: 28,
  },
  receiptSection: {
    marginBottom: 28,
  },
  receiptSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#E5E7EB',
    letterSpacing: -0.3,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  receiptLabel: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
    flex: 1,
  },
  receiptValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
    textAlign: 'right',
  },
  receiptDivider: {
    height: 2,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  receiptTotalRow: {
    marginTop: 8,
  },
  receiptTotalLabel: {
    fontSize: 20,
    fontWeight: '800',
    color: '#000000',
  },
  receiptTotalValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#22C55E',
    letterSpacing: -0.5,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
  },
  receiptFooter: {
    alignItems: 'center',
    marginTop: 32,
    paddingTop: 28,
    borderTopWidth: 2,
    borderTopColor: '#E5E7EB',
  },
  receiptFooterText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#22C55E',
    marginBottom: 12,
  },
  receiptFooterNote: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  
  // MAP TAB
  mapTab: {
    flex: 1,
    position: 'relative',
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapMarkerInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  mapOverlay: {
    position: 'absolute',
    top: 20,
    left: 24,
    right: 24,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  mapOverlayGradient: {
    borderRadius: 24,
    padding: 24,
  },
  mapTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  mapSubtitle: {
    fontSize: 15,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  mapStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  mapStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mapStatIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  mapStatText: {
    fontSize: 15,
    color: '#000000',
    fontWeight: '600',
  },
  
  // MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  fullMapContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
    height: height * 0.9,
  },
  fullMap: {
    width: '100%',
    height: '100%',
  },
  fullMapMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullMapMarkerInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  closeMapButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 44,
    height: 44,
  },
  closeMapButtonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  
  // ACTIONS
  actions: {
    flexDirection: 'row',
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
  },
  actionButton: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});