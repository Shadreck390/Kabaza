// screens/rider/RideActiveScreen.js
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
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  SafeAreaView,
  Easing,
  PanResponder,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { MaterialIconFallback as MaterialIcon } from '@src/utils/iconUtils';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { getUserData } from '@utils/userStorage';
import { useRoute, useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

const AnimatedMapView = Animated.createAnimatedComponent(MapView);
const AnimatedPolyline = Animated.createAnimatedComponent(Polyline);

export default function RideActiveScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { rideData } = route.params || {};
  
  const [rideStatus, setRideStatus] = useState('arriving');
  const [currentLocation, setCurrentLocation] = useState({
    latitude: -13.9626,
    longitude: 33.7741,
  });
  const [driverLocation, setDriverLocation] = useState({
    latitude: -13.9681,
    longitude: 33.7702,
  });
  const [pickupLocation, setPickupLocation] = useState({
    latitude: -13.9626,
    longitude: 33.7741,
    name: 'Current Location',
    address: 'Your current location',
  });
  const [destination, setDestination] = useState({
    latitude: -13.9583,
    longitude: 33.7689,
    name: 'Area 3 Shopping Complex',
    address: 'Lilongwe, Malawi',
  });
  const [eta, setEta] = useState(8);
  const [distance, setDistance] = useState(2.5);
  const [fare, setFare] = useState(850);
  const [showChat, setShowChat] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { id: 1, sender: 'driver', message: 'I\'m arriving in 2 minutes', time: '10:45 AM' },
    { id: 2, sender: 'you', message: 'Okay, I\'m waiting at the gate', time: '10:46 AM' },
  ]);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [userData, setUserData] = useState(null);
  
  // Driver mock data
  const [driver, setDriver] = useState({
    name: 'John Banda',
    phone: '+265 88 123 4567',
    vehicle: 'Toyota Corolla',
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
  const routeOpacity = useRef(new Animated.Value(0)).current;
  const sosPulse = useRef(new Animated.Value(1)).current;
  
  // Map region
  const [region, setRegion] = useState({
    latitude: -13.9650,
    longitude: 33.7720,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  });
  
  // Route coordinates (mock polyline)
  const routeCoordinates = [
    { latitude: -13.9681, longitude: 33.7702 },
    { latitude: -13.9660, longitude: 33.7710 },
    { latitude: -13.9640, longitude: 33.7720 },
    { latitude: -13.9626, longitude: 33.7741 },
    { latitude: -13.9610, longitude: 33.7725 },
    { latitude: -13.9595, longitude: 33.7700 },
    { latitude: -13.9583, longitude: 33.7689 },
  ];

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
      Animated.timing(routeOpacity, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
        delay: 400,
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

    // SOS button pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(sosPulse, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(sosPulse, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();

    const loadUserData = async () => {
      const data = await getUserData();
      setUserData(data);
    };
    loadUserData();
    
    // Simulate ride progression
    const timer = setInterval(() => {
      if (rideStatus === 'arriving' && eta > 0) {
        setEta(prev => Math.max(0, prev - 1));
        
        // Move driver closer with animation
        if (driverLocation.latitude < pickupLocation.latitude) {
          Animated.timing(driverMarkerScale, {
            toValue: 1.1,
            duration: 500,
            useNativeDriver: true,
          }).start(() => {
            setDriverLocation(prev => ({
              latitude: prev.latitude + 0.0005,
              longitude: prev.longitude + 0.0005,
            }));
            Animated.timing(driverMarkerScale, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
            }).start();
          });
        }
        
        // ETA update animation
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
        
        // Auto-transition to ongoing when arrived
        if (eta <= 1) {
          setTimeout(() => {
            setRideStatus('ongoing');
            setEta(15);
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
        
        // Move driver toward destination
        if (driverLocation.latitude > destination.latitude) {
          Animated.sequence([
            Animated.timing(driverMarkerScale, {
              toValue: 1.1,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(driverMarkerScale, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
          ]).start(() => {
            setDriverLocation(prev => ({
              latitude: prev.latitude - 0.0003,
              longitude: prev.longitude - 0.0003,
            }));
          });
        }
        
        // Update distance
        setDistance(prev => Math.max(0, prev - 0.1));
        
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
  }, [rideStatus, eta]);

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
    // Button press animation
    const buttonScale = new Animated.Value(1);
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

    setTimeout(() => {
      Alert.alert(
        'Call Driver',
        `Call ${driver.name} at ${driver.phone}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Call', onPress: () => console.log('Calling driver...') },
        ]
      );
    }, 150);
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
    
    // Fade out animation before navigation
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
        [
          { 
            text: 'OK', 
            onPress: () => navigation.goBack() 
          },
        ]
      );
    });
  };

  const handleSOS = () => {
    setShowSOSModal(true);
    Animated.timing(modalSlide, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start();
  };

  const closeSOSModal = () => {
    Animated.timing(modalSlide, {
      toValue: height,
      duration: 300,
      useNativeDriver: true,
      easing: Easing.in(Easing.cubic),
    }).start(() => {
      setShowSOSModal(false);
    });
  };

  const sendSOSAlert = () => {
    // Pulse animation before sending
    Animated.sequence([
      Animated.timing(sosPulse, {
        toValue: 1.5,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(sosPulse, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      closeSOSModal();
      Alert.alert(
        'SOS Alert Sent',
        'Emergency services and your emergency contacts have been notified.',
        [{ text: 'OK' }]
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
      
      // Simulate driver response after 2 seconds with animation
      setTimeout(() => {
        const driverResponse = {
          id: chatMessages.length + 2,
          sender: 'driver',
          message: 'Got it, thank you!',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setChatMessages(prev => {
          const updated = [...prev, driverResponse];
          // Scroll to bottom animation
          if (this.chatScrollView) {
            setTimeout(() => {
              this.chatScrollView.scrollToEnd({ animated: true });
            }, 100);
          }
          return updated;
        });
      }, 2000);
    }
  };

  const handleRatingSubmit = () => {
    // Button press animation
    const buttonScale = new Animated.Value(1);
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

    setTimeout(() => {
      closeRatingModal();
      Alert.alert(
        'Thank You!',
        `You rated ${driver.name} ${rating} stars.`,
        [
          { 
            text: 'OK', 
            onPress: () => navigation.navigate('RideHistory') 
          },
        ]
      );
    }, 150);
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
    const buttonScale = useRef(new Animated.Value(1)).current;
    
    switch (rideStatus) {
      case 'arriving':
        return (
          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => {
                Animated.sequence([
                  Animated.spring(buttonScale, {
                    toValue: 0.95,
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
                ]).start(() => {
                  setRideStatus('ongoing');
                  Animated.timing(mapZoom, {
                    toValue: 0.04,
                    duration: 1000,
                    useNativeDriver: false,
                  }).start();
                });
              }}
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
          </Animated.View>
        );
      case 'ongoing':
        return (
          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => {
                Animated.sequence([
                  Animated.spring(buttonScale, {
                    toValue: 0.95,
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
                ]).start(() => {
                  setRideStatus('completed');
                  setTimeout(() => openRatingModal(), 1000);
                });
              }}
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
          </Animated.View>
        );
      default:
        return null;
    }
  };

  const renderChatMessage = ({ item, index }) => {
    const translateX = item.sender === 'you' ? 20 : -20;
    return (
      <Animated.View
        style={[
          styles.chatMessage, 
          item.sender === 'you' ? styles.chatMessageSent : styles.chatMessageReceived,
          {
            opacity: fadeAnim,
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        <LinearGradient
          colors={item.sender === 'you' ? ['#22C55E', '#16A34A'] : ['#F3F4F6', '#E5E7EB']}
          style={styles.chatMessageBubble}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={[
            styles.chatMessageText,
            item.sender === 'you' ? styles.chatMessageTextSent : styles.chatMessageTextReceived
          ]}>
            {item.message}
          </Text>
          <Text style={styles.chatMessageTime}>{item.time}</Text>
        </LinearGradient>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ANIMATED MAP */}
      <Animated.View style={[styles.mapContainer, { opacity: fadeAnim }]}>
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          region={{
            ...region,
            latitudeDelta: mapZoom,
            longitudeDelta: mapZoom,
          }}
          showsUserLocation={true}
        >
          {/* Pickup Marker */}
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

          {/* Destination Marker */}
          <Marker coordinate={destination} title="Destination">
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

          {/* Driver Marker with Animation */}
          <Marker coordinate={driverLocation} title={driver.name} description={driver.vehicle}>
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

          {/* Animated Route Polyline */}
          <AnimatedPolyline
            coordinates={routeCoordinates}
            strokeColor="#22C55E"
            strokeWidth={4}
            lineDashPattern={[10, 10]}
            opacity={routeOpacity}
          />
        </MapView>
      </Animated.View>

      {/* TOP BAR WITH ANIMATION */}
      <Animated.View 
        style={[
          styles.topBar,
          {
            opacity: fadeAnim,
            transform: [{ translateY: cardSlide }],
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
        
        <Animated.View 
          style={[
            styles.statusBadge,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
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
        
        <Animated.View style={{ transform: [{ scale: sosPulse }] }}>
          <TouchableOpacity 
            style={styles.sosButton}
            onPress={handleSOS}
            activeOpacity={0.6}
          >
            <LinearGradient
              colors={['#EF4444', '#DC2626']}
              style={styles.sosButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialIcon name="emergency" size={18} color="#FFFFFF" />
              <Text style={styles.sosText}>SOS</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>

      {/* DRIVER INFO CARD WITH ANIMATION */}
      <Animated.View 
        style={[
          styles.driverCard,
          {
            opacity: fadeAnim,
            transform: [{ translateY: cardSlide }],
          },
        ]}
      >
        <LinearGradient
          colors={['#FFFFFF', '#F8FAFC']}
          style={styles.driverCardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.driverInfo}>
            <LinearGradient
              colors={['#22C55E', '#16A34A']}
              style={styles.driverAvatar}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.driverInitials}>
                {driver.name.split(' ').map(n => n[0]).join('')}
              </Text>
            </LinearGradient>
            <View style={styles.driverDetails}>
              <Text style={styles.driverName}>{driver.name}</Text>
              <View style={styles.driverMeta}>
                <MaterialIcon name="star" size={14} color="#F59E0B" />
                <Text style={styles.driverRating}>{driver.rating}</Text>
                <Text style={styles.driverDivider}>•</Text>
                <Text style={styles.driverTrips}>{driver.trips.toLocaleString()} trips</Text>
              </View>
              <Text style={styles.driverVehicle}>
                {driver.vehicle} • {driver.plate}
              </Text>
            </View>
          </View>
          
          <View style={styles.driverActions}>
            <TouchableOpacity 
              style={styles.driverActionButton}
              onPress={handleCallDriver}
              activeOpacity={0.6}
            >
              <LinearGradient
                colors={['#22C55E', '#16A34A']}
                style={styles.driverActionIcon}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialIcon name="phone" size={18} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.driverActionButton}
              onPress={openChat}
              activeOpacity={0.6}
            >
              <LinearGradient
                colors={['#22C55E', '#16A34A']}
                style={styles.driverActionIcon}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialIcon name="chat" size={18} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* RIDE INFO CARD WITH ANIMATION */}
      <Animated.View 
        style={[
          styles.rideInfoCard,
          {
            opacity: fadeAnim,
            transform: [{ translateY: cardSlide }],
          },
        ]}
      >
        <LinearGradient
          colors={['#FFFFFF', '#F8FAFC']}
          style={styles.rideInfoGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.rideInfoRow}>
            <View style={styles.rideInfoItem}>
              <MaterialIcon name="access-time" size={24} color="#666" />
              <Animated.Text style={[
                styles.rideInfoValue,
                { transform: [{ scale: etaScale }] }
              ]}>
                {eta} min
              </Animated.Text>
              <Text style={styles.rideInfoLabel}>ETA</Text>
            </View>
            
            <View style={styles.rideInfoDivider} />
            
            <View style={styles.rideInfoItem}>
              <MaterialIcon name="map" size={24} color="#666" />
              <Text style={styles.rideInfoValue}>{distance.toFixed(1)} km</Text>
              <Text style={styles.rideInfoLabel}>Distance</Text>
            </View>
            
            <View style={styles.rideInfoDivider} />
            
            <View style={styles.rideInfoItem}>
              <MaterialIcon name="attach-money" size={24} color="#666" />
              <Text style={styles.rideInfoValue}>MK {fare}</Text>
              <Text style={styles.rideInfoLabel}>Fare</Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* LOCATION INFO WITH ANIMATION */}
      <Animated.View 
        style={[
          styles.locationCard,
          {
            opacity: fadeAnim,
            transform: [{ translateY: cardSlide }],
          },
        ]}
      >
        <LinearGradient
          colors={['#FFFFFF', '#F8FAFC']}
          style={styles.locationCardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.locationRow}>
            <LinearGradient
              colors={['#3B82F6', '#2563EB']}
              style={styles.locationDot}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <View style={styles.locationInfo}>
              <Text style={styles.locationLabel}>Pickup</Text>
              <Text style={styles.locationText}>{pickupLocation.address}</Text>
            </View>
          </View>
          
          <View style={styles.routeLine} />
          
          <View style={styles.locationRow}>
            <LinearGradient
              colors={['#EF4444', '#DC2626']}
              style={styles.locationDot}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <View style={styles.locationInfo}>
              <Text style={styles.locationLabel}>Destination</Text>
              <Text style={styles.locationText}>{destination.address}</Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* ACTION BUTTONS WITH ANIMATION */}
      <Animated.View 
        style={[
          styles.actionContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
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
              styles.chatModal,
              {
                transform: [{ translateY: modalSlide }],
              },
            ]}
          >
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
                <TouchableOpacity 
                  onPress={closeChat}
                  activeOpacity={0.6}
                  style={styles.closeChatButton}
                >
                  <MaterialIcon name="close" size={24} color="#000" />
                </TouchableOpacity>
              </View>
              
              <ScrollView 
                style={styles.chatMessages}
                ref={ref => this.chatScrollView = ref}
                onContentSizeChange={() => this.chatScrollView?.scrollToEnd({ animated: true })}
              >
                {chatMessages.map((msg, index) => (
                  <View key={msg.id}>
                    {renderChatMessage({ item: msg, index })}
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
              styles.modalContent,
              {
                transform: [{ translateY: modalSlide }],
              },
            ]}
          >
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
              
              {['Driver taking too long', 'Change of plans', 'Found another ride', 'Emergency'].map((reason, index) => (
                <Animated.View
                  key={reason}
                  style={{
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                  }}
                >
                  <TouchableOpacity 
                    style={styles.cancelReason}
                    onPress={() => confirmCancelRide(reason)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelReasonText}>{reason}</Text>
                  </TouchableOpacity>
                </Animated.View>
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

      {/* SOS MODAL */}
      <Modal
        visible={showSOSModal}
        animationType="none"
        transparent={true}
        onRequestClose={closeSOSModal}
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
              styles.modalContent,
              {
                transform: [{ translateY: modalSlide }],
              },
            ]}
          >
            <LinearGradient
              colors={['#FEF2F2', '#FEE2E2']}
              style={styles.modalGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Animated.View 
                style={[
                  styles.sosIcon,
                  {
                    transform: [{ scale: sosPulse }],
                  },
                ]}
              >
                <LinearGradient
                  colors={['#EF4444', '#DC2626']}
                  style={styles.sosIconGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <MaterialIcon name="emergency" size={36} color="#FFFFFF" />
                </LinearGradient>
              </Animated.View>
              
              <Text style={[styles.modalTitle, { color: '#DC2626' }]}>Emergency SOS</Text>
              <Text style={styles.modalSubtitle}>
                This will notify emergency services and your emergency contacts.
                Only use in case of a real emergency.
              </Text>
              
              <TouchableOpacity 
                style={styles.sosConfirmButton}
                onPress={sendSOSAlert}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#EF4444', '#DC2626']}
                  style={styles.sosConfirmGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.sosConfirmText}>SEND SOS ALERT</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={closeSOSModal}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
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
              styles.modalContent,
              {
                transform: [{ translateY: modalSlide }],
              },
            ]}
          >
            <LinearGradient
              colors={['#FFFFFF', '#F8FAFC']}
              style={styles.modalGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Animated.View 
                style={{
                  transform: [{ scale: ratingScale }],
                }}
              >
                <Text style={styles.modalTitle}>Rate Your Driver</Text>
                <Text style={styles.modalSubtitle}>
                  How was your ride with {driver.name}?
                </Text>
                
                <View style={styles.ratingStars}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity 
                      key={star}
                      onPress={() => setRating(star)}
                      activeOpacity={0.7}
                    >
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
    backgroundColor: '#fff',
  },
  mapContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  
  // TOP BAR
  topBar: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 10,
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
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
  sosButton: {
    width: 44,
    height: 44,
  },
  sosButtonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  sosText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  
  // DRIVER CARD
  driverCard: {
    position: 'absolute',
    top: 120,
    left: 24,
    right: 24,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  driverCardGradient: {
    borderRadius: 24,
    padding: 20,
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
    color: '#000',
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
  driverActions: {
    flexDirection: 'row',
  },
  driverActionButton: {
    marginLeft: 12,
  },
  driverActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  
  // RIDE INFO CARD
  rideInfoCard: {
    position: 'absolute',
    top: 210,
    left: 24,
    right: 24,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  rideInfoGradient: {
    borderRadius: 24,
    padding: 24,
  },
  rideInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rideInfoItem: {
    alignItems: 'center',
    flex: 1,
  },
  rideInfoValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#000',
    marginTop: 8,
    marginBottom: 4,
  },
  rideInfoLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rideInfoDivider: {
    width: 1,
    height: 50,
    backgroundColor: '#E5E7EB',
  },
  
  // LOCATION CARD
  locationCard: {
    position: 'absolute',
    bottom: 160,
    left: 24,
    right: 24,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  locationCardGradient: {
    borderRadius: 24,
    padding: 24,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  locationDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 16,
    marginTop: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  locationText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    lineHeight: 20,
  },
  routeLine: {
    width: 2,
    height: 24,
    backgroundColor: '#D1D5DB',
    marginLeft: 11,
    marginVertical: 8,
  },
  
  // ACTION CONTAINER
  actionContainer: {
    position: 'absolute',
    bottom: 60,
    left: 24,
    right: 24,
    alignItems: 'center',
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
    marginBottom: 16,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    borderRadius: 20,
  },
  actionButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  cancelButton: {
    paddingVertical: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
    textDecorationLine: 'underline',
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
  
  // CHAT MODAL
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
  
  // MODALS
  modalContent: {
    borderRadius: 32,
    overflow: 'hidden',
    width: width * 0.85,
    maxWidth: 400,
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
  sosIcon: {
    alignItems: 'center',
    marginBottom: 24,
  },
  sosIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  sosConfirmButton: {
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 24,
  },
  sosConfirmGradient: {
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
  },
  sosConfirmText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
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
  },
});