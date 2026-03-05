// screens/rider/RideActiveScreen.js - UPDATED VERSION
// SOS removed, full map view, minimal overlays

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
  Dimensions,
  ScrollView,
  Animated,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  SafeAreaView,
  Easing,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import { MaterialIconFallback as MaterialIcon } from '@src/utils/iconUtils';
import LinearGradient from 'react-native-linear-gradient';
import { getUserData } from '@utils/userStorage';
import { useRoute, useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');
const GOOGLE_MAPS_APIKEY = 'AIzaSyAft39RTF1LB_GTSYqy-I2tswzakC4fT3Q'; // Replace with your actual API key

export default function RideActiveScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { 
    rideId,
    driver: driverData,
    pickup,
    destination,
    pickupCoords,
    destinationCoords,
    paymentMethod,
    rideData,
    riderInfo,
    isMock 
  } = route.params || {};
  
  const [rideStatus, setRideStatus] = useState('arriving'); // arriving, ongoing, completed
  const [currentLocation, setCurrentLocation] = useState(pickupCoords || {
    latitude: -13.9626,
    longitude: 33.7741,
  });
  const [driverLocation, setDriverLocation] = useState(null);
  const [pickupLocation] = useState(pickupCoords || {
    latitude: -13.9626,
    longitude: 33.7741,
    address: pickup || 'Your current location',
  });
  const [destinationLocation] = useState(destinationCoords || {
    latitude: -13.9583,
    longitude: 33.7689,
    address: destination || 'Destination',
  });
  const [eta, setEta] = useState(rideData?.estimatedTime ? parseInt(rideData.estimatedTime) : 8);
  const [distance, setDistance] = useState(rideData?.distance || 2.5);
  const [fare] = useState(rideData?.price || 850);
  const [showChat, setShowChat] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [directionsReady, setDirectionsReady] = useState(false);
  const [routeDistance, setRouteDistance] = useState('');
  const [routeDuration, setRouteDuration] = useState('');
  const [userData, setUserData] = useState(null);
  const [mapExpanded, setMapExpanded] = useState(false);
  
  // Driver data
  const [driver, setDriver] = useState(driverData || {
    name: 'John Banda',
    phone: '+265 88 123 4567',
    vehicle: rideData?.vehicleType === 'bike' ? 'Honda CG 125' : 'Toyota Corolla',
    plate: 'LL 2345 A',
    rating: 4.8,
    trips: 1247,
    photo: null,
  });
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const driverMarkerScale = useRef(new Animated.Value(1)).current;
  const etaScale = useRef(new Animated.Value(1)).current;
  const cardSlide = useRef(new Animated.Value(20)).current;
  const modalSlide = useRef(new Animated.Value(height)).current;
  const ratingScale = useRef(new Animated.Value(0)).current;
  const mapZoom = useRef(new Animated.Value(0.02)).current;
  const infoCardOpacity = useRef(new Animated.Value(1)).current;
  
  // Map reference
  const mapRef = useRef(null);
  
  // Map region
  const [region, setRegion] = useState({
    latitude: pickupCoords?.latitude || -13.9650,
    longitude: pickupCoords?.longitude || 33.7720,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  });

  useEffect(() => {
    // Initial animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
      Animated.timing(cardSlide, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
        delay: 200,
      }),
    ]).start();

    // Driver marker pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(driverMarkerScale, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(driverMarkerScale, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.in(Easing.cubic),
        }),
      ])
    ).start();

    const loadUserData = async () => {
      const data = await getUserData();
      setUserData(data);
    };
    loadUserData();
    
    // Initialize driver location based on status
    if (rideStatus === 'arriving') {
      // Driver is coming from nearby
      setDriverLocation({
        latitude: (pickupLocation.latitude || -13.9626) + 0.005,
        longitude: (pickupLocation.longitude || 33.7741) + 0.005,
      });
    } else if (rideStatus === 'ongoing') {
      // Driver is at pickup going to destination
      setDriverLocation(pickupLocation);
    }
    
    // Simulate ride progression for mock mode
    if (isMock) {
      const timer = setInterval(() => {
        if (rideStatus === 'arriving' && eta > 0) {
          setEta(prev => Math.max(0, prev - 1));
          
          // Move driver closer
          if (driverLocation && driverLocation.latitude < pickupLocation.latitude) {
            setDriverLocation(prev => ({
              latitude: (prev?.latitude || 0) + 0.0005,
              longitude: (prev?.longitude || 0) + 0.0005,
            }));
          }
          
          // Auto-transition to ongoing when arrived
          if (eta <= 1) {
            setTimeout(() => {
              setRideStatus('ongoing');
              setDriverLocation(pickupLocation);
              setEta(parseInt(rideData?.estimatedTime) || 15);
              // Zoom out map for trip view
              Animated.timing(mapZoom, {
                toValue: 0.04,
                duration: 1000,
                useNativeDriver: false,
              }).start();
            }, 2000);
          }
        } else if (rideStatus === 'ongoing' && eta > 0) {
          setEta(prev => Math.max(0, prev - 1));
          setDistance(prev => Math.max(0, prev - 0.1));
          
          // Move driver toward destination
          if (driverLocation && driverLocation.latitude > destinationLocation.latitude) {
            setDriverLocation(prev => ({
              latitude: (prev?.latitude || 0) - 0.0003,
              longitude: (prev?.longitude || 0) - 0.0003,
            }));
          }
          
          // Auto-complete ride
          if (eta <= 1) {
            setTimeout(() => {
              setRideStatus('completed');
              setTimeout(() => {
                openRatingModal();
              }, 1000);
            }, 2000);
          }
        }
      }, 60000); // Update every minute (simulated)
      
      return () => clearInterval(timer);
    }
  }, []);

  useEffect(() => {
    // Update ETA animation when eta changes
    Animated.sequence([
      Animated.timing(etaScale, {
        toValue: 1.2,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(etaScale, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [eta]);

  const openRatingModal = () => {
    setShowRatingModal(true);
    Animated.parallel([
      Animated.timing(modalSlide, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.spring(ratingScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 60,
        friction: 7,
      }),
    ]).start();
  };

  const closeRatingModal = () => {
    Animated.timing(modalSlide, {
      toValue: height,
      duration: 300,
      useNativeDriver: true,
      easing: Easing.in(Easing.cubic),
    }).start(() => {
      setShowRatingModal(false);
    });
  };

  const openChat = () => {
    setShowChat(true);
    Animated.timing(modalSlide, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start();
  };

  const closeChat = () => {
    Animated.timing(modalSlide, {
      toValue: height,
      duration: 300,
      useNativeDriver: true,
      easing: Easing.in(Easing.cubic),
    }).start(() => {
      setShowChat(false);
    });
  };

  const handleCallDriver = () => {
    Alert.alert(
      'Call Driver',
      `Call ${driver.name} at ${driver.phone}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call', onPress: () => console.log('Calling driver...') },
      ]
    );
  };

  const handleCancelRide = () => {
    setShowCancelModal(true);
    Animated.timing(modalSlide, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start();
  };

  const closeCancelModal = () => {
    Animated.timing(modalSlide, {
      toValue: height,
      duration: 300,
      useNativeDriver: true,
      easing: Easing.in(Easing.cubic),
    }).start(() => {
      setShowCancelModal(false);
    });
  };

  const confirmCancelRide = (reason) => {
    closeCancelModal();
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 50,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      Alert.alert(
        'Ride Cancelled',
        `Your ride has been cancelled${reason ? `: ${reason}` : ''}.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    });
  };

  const handleChatSend = () => {
    if (chatMessage.trim()) {
      const newMessage = {
        id: chatMessages.length + 1,
        sender: 'you',
        message: chatMessage,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages([...chatMessages, newMessage]);
      setChatMessage('');
    }
  };

  const handleRatingSubmit = () => {
    closeRatingModal();
    Alert.alert(
      'Thank You!',
      `You rated ${driver.name} ${rating} stars.`,
      [{ text: 'OK', onPress: () => navigation.navigate('RideHistory') }]
    );
  };

  const handleStartTrip = () => {
    setRideStatus('ongoing');
    setDriverLocation(pickupLocation);
    setEta(parseInt(rideData?.estimatedTime) || 15);
    Animated.timing(mapZoom, {
      toValue: 0.04,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  };

  const handleCompleteRide = () => {
    setRideStatus('completed');
    setTimeout(() => openRatingModal(), 1000);
  };

  const toggleMapExpanded = () => {
    setMapExpanded(!mapExpanded);
    Animated.timing(infoCardOpacity, {
      toValue: mapExpanded ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const getStatusText = () => {
    switch (rideStatus) {
      case 'arriving': return 'Driver arriving';
      case 'ongoing': return 'On the way';
      case 'completed': return 'Trip completed';
      default: return 'Ride in progress';
    }
  };

  const getStatusColor = () => {
    switch (rideStatus) {
      case 'arriving': return '#FF9500';
      case 'ongoing': return '#22C55E';
      case 'completed': return '#6B7280';
      default: return '#22C55E';
    }
  };

  const getStatusGradient = () => {
    switch (rideStatus) {
      case 'arriving': return ['#FF9500', '#FFB74D'];
      case 'ongoing': return ['#22C55E', '#16A34A'];
      case 'completed': return ['#6B7280', '#4B5563'];
      default: return ['#22C55E', '#16A34A'];
    }
  };

  const getActionButton = () => {
    switch (rideStatus) {
      case 'arriving':
        return (
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleStartTrip}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['#22C55E', '#16A34A']}
              style={styles.actionButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialIcon name="check" size={24} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>I'm in the vehicle</Text>
            </LinearGradient>
          </TouchableOpacity>
        );
      case 'ongoing':
        return (
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleCompleteRide}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['#22C55E', '#16A34A']}
              style={styles.actionButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialIcon name="check-circle" size={24} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Complete Ride</Text>
            </LinearGradient>
          </TouchableOpacity>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* FULL MAP - takes all available space */}
      <View style={StyleSheet.absoluteFillObject}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          region={{
            latitude: pickupLocation.latitude,
            longitude: pickupLocation.longitude,
            latitudeDelta: mapZoom._value,
            longitudeDelta: mapZoom._value,
          }}
          showsUserLocation={true}
          showsMyLocationButton={false}
          showsCompass={true}
          zoomEnabled={true}
          scrollEnabled={true}
          onPress={toggleMapExpanded}
        >
          {/* Pickup Marker */}
          {pickupLocation && (
            <Marker coordinate={pickupLocation} title="Pickup">
              <Animated.View style={styles.pickupMarker}>
                <LinearGradient
                  colors={['#3B82F6', '#2563EB']}
                  style={styles.pickupMarkerInner}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <MaterialIcon name="location-pin" size={24} color="#FFFFFF" />
                </LinearGradient>
              </Animated.View>
            </Marker>
          )}

          {/* Destination Marker */}
          {destinationLocation && (
            <Marker coordinate={destinationLocation} title="Destination">
              <Animated.View style={styles.destinationMarker}>
                <LinearGradient
                  colors={['#EF4444', '#DC2626']}
                  style={styles.destinationMarkerInner}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <MaterialIcon name="place" size={24} color="#FFFFFF" />
                </LinearGradient>
              </Animated.View>
            </Marker>
          )}

          {/* Driver Marker */}
          {driverLocation && (
            <Marker 
              coordinate={driverLocation} 
              title={driver.name} 
              description={driver.vehicle}
            >
              <Animated.View style={[styles.driverMarker, { transform: [{ scale: driverMarkerScale }] }]}>
                <LinearGradient
                  colors={['#22C55E', '#16A34A']}
                  style={styles.driverMarkerInner}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <MaterialIcon name="directions-car" size={20} color="#FFFFFF" />
                </LinearGradient>
              </Animated.View>
            </Marker>
          )}

          {/* ACTUAL ROAD ROUTE using Directions API */}
          {driverLocation && (
            <MapViewDirections
              origin={driverLocation}
              destination={rideStatus === 'arriving' ? pickupLocation : destinationLocation}
              apikey={GOOGLE_MAPS_APIKEY}
              strokeWidth={4}
              strokeColor="#22C55E"
              mode="DRIVING"
              optimizeWaypoints={true}
              onReady={(result) => {
                console.log('Directions ready:', result);
                setDirectionsReady(true);
                setRouteDistance(result.distance);
                setRouteDuration(result.duration);
                
                // Update ETA with actual route duration
                if (rideStatus === 'arriving') {
                  setEta(Math.ceil(result.duration));
                } else {
                  setEta(Math.ceil(result.duration));
                  setDistance(parseFloat(result.distance));
                }
                
                // Fit map to show entire route
                if (mapRef.current) {
                  mapRef.current.fitToCoordinates(result.coordinates, {
                    edgePadding: {
                      top: 100,
                      right: 50,
                      bottom: 200,
                      left: 50,
                    },
                    animated: true,
                  });
                }
              }}
              onError={(errorMessage) => {
                console.log('Directions error:', errorMessage);
              }}
              resetOnChange={false}
              timePrecision="now"
            />
          )}
        </MapView>
      </View>

      {/* MINIMAL TOP BAR - only back button and status (SOS removed) */}
      <Animated.View 
        style={[
          styles.topBar,
          { opacity: fadeAnim, transform: [{ translateY: cardSlide }] }
        ]}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.6}
        >
          <LinearGradient
            colors={['#FFFFFF', '#F8FAFC']}
            style={styles.backButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <MaterialIcon name="arrow-back" size={20} color="#000000" />
          </LinearGradient>
        </TouchableOpacity>
        
        <Animated.View style={[styles.statusBadge, { transform: [{ scale: scaleAnim }] }]}>
          <LinearGradient
            colors={getStatusGradient()}
            style={styles.statusBadgeGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.statusBadgeContent}>
              <View style={[styles.statusDot, { backgroundColor: '#FFFFFF' }]} />
              <Text style={styles.statusText}>{getStatusText()}</Text>
            </View>
          </LinearGradient>
        </Animated.View>
        
        {/* Empty view for balance - SOS removed */}
        <View style={{ width: 44 }} />
      </Animated.View>

      {/* FLOATING INFO CARD - compact, doesn't block map */}
      <Animated.View 
        style={[
          styles.floatingInfoCard,
          { opacity: fadeAnim, transform: [{ translateY: cardSlide }] }
        ]}
      >
        <LinearGradient
          colors={['#FFFFFF', '#F8FAFC']}
          style={styles.floatingCardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Driver quick info */}
          <View style={styles.floatingDriverRow}>
            <LinearGradient
              colors={['#22C55E', '#16A34A']}
              style={styles.floatingDriverAvatar}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.floatingDriverInitials}>
                {driver.name.split(' ').map(n => n[0]).join('')}
              </Text>
            </LinearGradient>
            
            <View style={styles.floatingDriverInfo}>
              <Text style={styles.floatingDriverName}>{driver.name}</Text>
              <View style={styles.floatingDriverRating}>
                <MaterialIcon name="star" size={12} color="#F59E0B" />
                <Text style={styles.floatingRatingText}>{driver.rating}</Text>
                <Text style={styles.floatingVehicleText}> • {driver.vehicle}</Text>
              </View>
            </View>
            
            <View style={styles.floatingActions}>
              <TouchableOpacity 
                style={styles.floatingActionButton}
                onPress={handleCallDriver}
                activeOpacity={0.6}
              >
                <LinearGradient
                  colors={['#22C55E', '#16A34A']}
                  style={styles.floatingActionIcon}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <MaterialIcon name="phone" size={16} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.floatingActionButton}
                onPress={openChat}
                activeOpacity={0.6}
              >
                <LinearGradient
                  colors={['#22C55E', '#16A34A']}
                  style={styles.floatingActionIcon}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <MaterialIcon name="chat" size={16} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
          
          {/* ETA and Fare row */}
          <View style={styles.floatingStatsRow}>
            <View style={styles.floatingStat}>
              <Text style={styles.floatingStatLabel}>ETA</Text>
              <Animated.Text style={[styles.floatingStatValue, { transform: [{ scale: etaScale }] }]}>
                {eta} min
              </Animated.Text>
            </View>
            
            <View style={styles.floatingStatDivider} />
            
            <View style={styles.floatingStat}>
              <Text style={styles.floatingStatLabel}>Distance</Text>
              <Text style={styles.floatingStatValue}>{distance.toFixed(1)} km</Text>
            </View>
            
            <View style={styles.floatingStatDivider} />
            
            <View style={styles.floatingStat}>
              <Text style={styles.floatingStatLabel}>Fare</Text>
              <Text style={styles.floatingStatValue}>MK {fare}</Text>
            </View>
          </View>
          
          {/* Location summary */}
          <View style={styles.floatingLocationRow}>
            <View style={styles.floatingLocationItem}>
              <LinearGradient
                colors={['#3B82F6', '#2563EB']}
                style={styles.floatingLocationDot}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <Text style={styles.floatingLocationText} numberOfLines={1}>
                {pickup || 'Your location'}
              </Text>
            </View>
            
            <View style={styles.floatingLocationArrow}>
              <MaterialIcon name="arrow-forward" size={16} color="#9CA3AF" />
            </View>
            
            <View style={styles.floatingLocationItem}>
              <LinearGradient
                colors={['#EF4444', '#DC2626']}
                style={styles.floatingLocationDot}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <Text style={styles.floatingLocationText} numberOfLines={1}>
                {destination || 'Destination'}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* ACTION BUTTONS - minimal at bottom */}
      <Animated.View 
        style={[
          styles.actionContainer,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
        ]}
      >
        {getActionButton()}
        
        {rideStatus !== 'completed' && (
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={handleCancelRide}
            activeOpacity={0.6}
          >
            <Text style={styles.cancelButtonText}>Cancel Ride</Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* CHAT MODAL */}
      <Modal
        visible={showChat}
        animationType="none"
        transparent={true}
        onRequestClose={closeChat}
      >
        <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
          <Animated.View style={[styles.chatModal, { transform: [{ translateY: modalSlide }] }]}>
            <LinearGradient
              colors={['#FFFFFF', '#F8FAFC']}
              style={styles.chatModalGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.modalHandleContainer}>
                <View style={styles.modalHandle} />
              </View>
              
              <View style={styles.chatHeader}>
                <Text style={styles.chatTitle}>Chat with {driver.name}</Text>
                <TouchableOpacity onPress={closeChat} style={styles.closeChatButton}>
                  <MaterialIcon name="close" size={24} color="#000" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.chatMessages}>
                {chatMessages.map((msg) => (
                  <View key={msg.id} style={[
                    styles.chatMessage,
                    msg.sender === 'you' ? styles.chatMessageSent : styles.chatMessageReceived
                  ]}>
                    <LinearGradient
                      colors={msg.sender === 'you' ? ['#22C55E', '#16A34A'] : ['#F3F4F6', '#E5E7EB']}
                      style={styles.chatMessageBubble}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Text style={[
                        styles.chatMessageText,
                        msg.sender === 'you' ? styles.chatMessageTextSent : styles.chatMessageTextReceived
                      ]}>
                        {msg.message}
                      </Text>
                      <Text style={styles.chatMessageTime}>{msg.time}</Text>
                    </LinearGradient>
                  </View>
                ))}
              </ScrollView>
              
              <View style={styles.chatInputContainer}>
                <TextInput
                  style={styles.chatInput}
                  placeholder="Type a message..."
                  placeholderTextColor="#999"
                  value={chatMessage}
                  onChangeText={setChatMessage}
                  onSubmitEditing={handleChatSend}
                />
                <TouchableOpacity 
                  style={styles.chatSendButton}
                  onPress={handleChatSend}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={['#22C55E', '#16A34A']}
                    style={styles.chatSendGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <MaterialIcon name="send" size={18} color="#FFFFFF" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* CANCEL MODAL */}
      <Modal
        visible={showCancelModal}
        animationType="none"
        transparent={true}
        onRequestClose={closeCancelModal}
      >
        <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
          <Animated.View style={[styles.modalContent, { transform: [{ translateY: modalSlide }] }]}>
            <LinearGradient
              colors={['#FFFFFF', '#F8FAFC']}
              style={styles.modalGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.modalTitle}>Cancel Ride?</Text>
              <Text style={styles.modalSubtitle}>
                You may be charged a cancellation fee if you cancel now.
              </Text>
              
              {['Driver taking too long', 'Change of plans', 'Found another ride', 'Emergency'].map((reason) => (
                <TouchableOpacity 
                  key={reason}
                  style={styles.cancelReason}
                  onPress={() => confirmCancelRide(reason)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelReasonText}>{reason}</Text>
                </TouchableOpacity>
              ))}
              
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={closeCancelModal}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelButtonText}>Continue Ride</Text>
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* RATING MODAL */}
      <Modal
        visible={showRatingModal}
        animationType="none"
        transparent={true}
        onRequestClose={closeRatingModal}
      >
        <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
          <Animated.View style={[styles.modalContent, { transform: [{ translateY: modalSlide }] }]}>
            <LinearGradient
              colors={['#FFFFFF', '#F8FAFC']}
              style={styles.modalGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Animated.View style={{ transform: [{ scale: ratingScale }] }}>
                <Text style={styles.modalTitle}>Rate Your Driver</Text>
                <Text style={styles.modalSubtitle}>
                  How was your ride with {driver.name}?
                </Text>
                
                <View style={styles.ratingStars}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => setRating(star)}>
                      <LinearGradient
                        colors={star <= rating ? ['#F59E0B', '#D97706'] : ['#F3F4F6', '#E5E7EB']}
                        style={styles.starContainer}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <MaterialIcon 
                          name="star" 
                          size={32} 
                          color={star <= rating ? "#FFFFFF" : "#9CA3AF"} 
                        />
                      </LinearGradient>
                    </TouchableOpacity>
                  ))}
                </View>
                
                <TextInput
                  style={styles.ratingComment}
                  placeholder="Add a comment (optional)"
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={3}
                />
                
                <TouchableOpacity 
                  style={styles.modalButton}
                  onPress={handleRatingSubmit}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={['#22C55E', '#16A34A']}
                    style={styles.modalButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.modalButtonText}>Submit Rating</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            </LinearGradient>
          </Animated.View>
        </Animated.View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  
  // TOP BAR - SOS removed
  topBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  backButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statusBadgeGradient: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  statusBadgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  
  // FLOATING INFO CARD - compact design
  floatingInfoCard: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 120 : 100,
    left: 16,
    right: 16,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 5,
  },
  floatingCardGradient: {
    borderRadius: 24,
    padding: 16,
  },
  floatingDriverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  floatingDriverAvatar: {
    width: 44,
    height: 44,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  floatingDriverInitials: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  floatingDriverInfo: {
    flex: 1,
  },
  floatingDriverName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 2,
  },
  floatingDriverRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  floatingRatingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginLeft: 4,
  },
  floatingVehicleText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 2,
  },
  floatingActions: {
    flexDirection: 'row',
  },
  floatingActionButton: {
    marginLeft: 8,
  },
  floatingActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  floatingStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 12,
  },
  floatingStat: {
    flex: 1,
    alignItems: 'center',
  },
  floatingStatLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  floatingStatValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000',
  },
  floatingStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E5E7EB',
  },
  floatingLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  floatingLocationItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  floatingLocationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  floatingLocationText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  floatingLocationArrow: {
    marginHorizontal: 8,
  },
  
  // MAP MARKERS
  pickupMarker: {
    alignItems: 'center',
  },
  pickupMarkerInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  destinationMarker: {
    alignItems: 'center',
  },
  destinationMarkerInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  driverMarker: {
    alignItems: 'center',
  },
  driverMarkerInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  
  // ACTION CONTAINER
  actionContainer: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 5,
  },
  actionButton: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 12,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 20,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  cancelButton: {
    paddingVertical: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  
  // MODALS (unchanged)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  chatModal: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
    height: height * 0.75,
  },
  chatModalGradient: {
    flex: 1,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  modalHandleContainer: {
    paddingTop: 16,
    paddingBottom: 12,
    alignItems: 'center',
  },
  modalHandle: {
    width: 48,
    height: 5,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeChatButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  chatMessages: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  chatMessage: {
    marginBottom: 16,
  },
  chatMessageBubble: {
    padding: 16,
    borderRadius: 20,
    maxWidth: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  chatMessageSent: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  chatMessageReceived: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  chatMessageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  chatMessageTextSent: {
    color: '#FFFFFF',
  },
  chatMessageTextReceived: {
    color: '#000',
  },
  chatMessageTime: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: '500',
  },
  chatSendButton: {
    marginLeft: 12,
  },
  chatSendGradient: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  modalContent: {
    borderRadius: 32,
    overflow: 'hidden',
    width: width * 0.85,
    maxWidth: 400,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  modalGradient: {
    padding: 32,
    borderRadius: 32,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#000',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
  },
  cancelReason: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  cancelReasonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },
  modalCancelButton: {
    paddingVertical: 16,
    marginTop: 20,
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  modalButton: {
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 20,
  },
  modalButtonGradient: {
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  ratingStars: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 24,
    gap: 12,
  },
  starContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  ratingComment: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    fontWeight: '500',
    textAlignVertical: 'top',
    marginBottom: 20,
    minHeight: 100,
    color: '#000',
  },
});