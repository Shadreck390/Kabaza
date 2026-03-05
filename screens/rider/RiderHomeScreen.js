// screens/rider/RiderHomeScreen.js - FIXED VERSION WITH DRAWER MENU
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  PermissionsAndroid,
  StatusBar,
  Dimensions,
  ScrollView,
  Animated,
  PanResponder,
  TextInput,
  FlatList,
  ActivityIndicator,
  Easing,
  SafeAreaView,
  Modal,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import Geolocation from 'react-native-geolocation-service';
import { MaterialIconFallback as MaterialIcon } from '@src/utils/iconUtils';
import LinearGradient from 'react-native-linear-gradient';
import { getUserData } from '@src/utils/userStorage';
import { useNavigation } from '@react-navigation/native'; // ADD THIS IMPORT

const { width, height } = Dimensions.get('window');

const SHEET_MAX_HEIGHT = height * 0.72;
const SHEET_MIN_HEIGHT = 160;

// ========== MALAWI REAL LOCATIONS DATABASE ==========
const MALAWI_LOCATIONS = [
  { 
    id: '1', 
    name: 'Area 3 Shopping Complex', 
    address: 'Lilongwe, Malawi', 
    type: 'shopping', 
    city: 'Lilongwe',
    coordinates: { latitude: -13.9583, longitude: 33.7689 }
  },
  { 
    id: '2', 
    name: 'Bingu National Stadium', 
    address: 'Lilongwe, Malawi', 
    type: 'stadium', 
    city: 'Lilongwe',
    coordinates: { latitude: -13.9917, longitude: 33.7753 }
  },
  { 
    id: '3', 
    name: 'Crossroads Hotel', 
    address: 'Lilongwe, Malawi', 
    type: 'hotel', 
    city: 'Lilongwe',
    coordinates: { latitude: -13.9750, longitude: 33.7867 }
  },
  { 
    id: '4', 
    name: 'Lilongwe City Mall', 
    address: 'M1 Road, Lilongwe, Malawi', 
    type: 'mall', 
    city: 'Lilongwe',
    coordinates: { latitude: -13.9772, longitude: 33.7720 }
  },
  { 
    id: '5', 
    name: 'Game Stores Lilongwe', 
    address: 'City Center, Lilongwe', 
    type: 'shopping', 
    city: 'Lilongwe',
    coordinates: { latitude: -13.9758, longitude: 33.7881 }
  },
  { 
    id: '6', 
    name: 'Kamuzu Central Hospital (KCH)', 
    address: 'Mzimba Street, Lilongwe, Malawi', 
    type: 'hospital', 
    city: 'Lilongwe',
    coordinates: { latitude: -13.9711, longitude: 33.7836 }
  },
];

// ========== ANIMATED COMPONENTS ==========
const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export default function RiderHomeScreen({ route, navigation }) {
  // ✅ Add route parameter to get userData
  const userDataFromParams = route.params?.userData || {};
  const drawerNavigation = useNavigation(); // ADD THIS for drawer navigation
  
  // States
  const [region, setRegion] = useState({
    latitude: -13.9626,
    longitude: 33.7741,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const [currentLocation, setCurrentLocation] = useState(null);
  const [userData, setUserData] = useState(userDataFromParams);
  const [searchQuery, setSearchQuery] = useState('');
  const [showRideOptions, setShowRideOptions] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dynamicRideOptions, setDynamicRideOptions] = useState([]);
  const [menuVisible, setMenuVisible] = useState(false); // ADD THIS for menu modal
  
  // Animation values
  const sheetHeight = useRef(new Animated.Value(SHEET_MIN_HEIGHT)).current;
  const mapOpacity = useRef(new Animated.Value(1)).current;

  // Quick Actions - MATCHING SCREENSHOT
  const quickActions = [
    {
      id: 'rides',
      title: 'Rides',
      subtitle: "Let's get moving",
      icon: 'directions-car',
      color: '#00a82d',
      gradient: ['#00a82d', '#00c853'],
    },
    {
      id: 'schedule',
      title: 'Schedule',
      subtitle: 'Book ahead',
      icon: 'schedule',
      color: '#2196f3',
      gradient: ['#2196f3', '#21cbf3'],
    },
    {
      id: 'send',
      title: 'Kabaza Send',
      subtitle: 'Package delivery',
      icon: 'local-shipping',
      color: '#ff9800',
      gradient: ['#ff9800', '#ffb74d'],
    },
  ];

  // Suggested Destinations - MATCHING SCREENSHOT FORMAT
  const suggestedDestinations = [
    {
      id: '1',
      name: 'cross roads shopping mall',
      address: 'Cross Roads, Lilongwe',
      distance: '3 km',
      coordinates: { latitude: -13.9583, longitude: 33.7689 }
    },
    {
      id: '2',
      name: 'Bingu National Stadium',
      address: 'Bingu National Stadium, Lilongwe',
      distance: '1 km',
      coordinates: { latitude: -13.9917, longitude: 33.7753 }
    },
    {
      id: '3',
      name: 'Lilongwe Police Station',
      address: 'Area 3 police , Lilongwe',
      distance: '1 km',
      coordinates: { latitude: -13.9750, longitude: 33.7867 }
    },
  ];

  const rideOptions = [
    { 
      id: 'kabaza', 
      name: 'Kabaza', 
      price: 'MK 5500 - MK 7500', 
      icon: 'directions-car', 
      color: '#00a82d',
      gradient: ['#00a82d', '#00c853'],
      time: '2 min',
    },
    { 
      id: 'comfort', 
      name: 'Comfort', 
      price: 'MK 8500 - MK 10000', 
      icon: 'directions-car', 
      color: '#2196f3',
      gradient: ['#2196f3', '#21cbf3'],
      time: '3 min',
    },
    { 
      id: 'green', 
      name: 'Green', 
      price: 'MK 9500 - MK 11500', 
      icon: 'eco', 
      color: '#4caf50',
      gradient: ['#4caf50', '#66bb6a'],
      time: '4 min',
    },
  ];

  // Pan responder for draggable sheet - SIMPLIFIED
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        const newHeight = SHEET_MIN_HEIGHT - gestureState.dy;
        if (newHeight >= SHEET_MIN_HEIGHT && newHeight <= SHEET_MAX_HEIGHT) {
          sheetHeight.setValue(newHeight);
          Animated.spring(mapOpacity, {
            toValue: Math.max(0.7, 1 - (gestureState.dy / height) * 0.5),
            useNativeDriver: true,
          }).start();
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const currentHeight = SHEET_MIN_HEIGHT - gestureState.dy;
        const snapThreshold = (SHEET_MAX_HEIGHT + SHEET_MIN_HEIGHT) / 2;
        
        if (currentHeight < snapThreshold) {
          Animated.parallel([
            Animated.spring(sheetHeight, {
              toValue: SHEET_MIN_HEIGHT,
              useNativeDriver: false,
              tension: 60,
              friction: 10,
            }),
            Animated.spring(mapOpacity, {
              toValue: 1,
              useNativeDriver: true,
            }),
          ]).start();
        } else {
          Animated.parallel([
            Animated.spring(sheetHeight, {
              toValue: SHEET_MAX_HEIGHT,
              useNativeDriver: false,
              tension: 60,
              friction: 10,
            }),
            Animated.spring(mapOpacity, {
              toValue: 0.7,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    })
  ).current;

  // Initialize
  useEffect(() => {
    setDynamicRideOptions(rideOptions);
    
    const initializeScreen = async () => {
      try {
        if (!userData.phone) {
          const storedData = await getUserData();
          if (storedData) {
            setUserData(storedData);
          }
        }
        
        const hasPermission = await requestLocationPermission();
        if (hasPermission) {
          await getCurrentLocation();
        }
      } catch (error) {
        console.error('Initialization error:', error);
      }
    };
    
    initializeScreen();
  }, []);

  const requestLocationPermission = async () => {
    try {
      if (Platform.OS === 'ios') {
        return true;
      } else {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Access Required',
            message: 'Kabaza needs access to your location to find rides',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
    } catch (err) {
      console.error('📍 Permission error:', err);
      return false;
    }
  };

  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.warn('⚠️ Location timeout - using default');
        const defaultLocation = {
          latitude: -13.9626,
          longitude: 33.7741,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        };
        setRegion(defaultLocation);
        setCurrentLocation(defaultLocation);
        resolve(defaultLocation);
      }, 10000); // 10 second timeout
      
      Geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timeout);
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          };
          setCurrentLocation(location);
          setRegion(location);
          resolve(location);
        },
        (error) => {
          clearTimeout(timeout);
          console.warn('⚠️ Location error - using default:', error);
          const defaultLocation = {
            latitude: -13.9626,
            longitude: 33.7741,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          };
          setRegion(defaultLocation);
          setCurrentLocation(defaultLocation);
          resolve(defaultLocation);
        },
        { 
          enableHighAccuracy: true, 
          timeout: 10000, // Reduced timeout
          maximumAge: 10000 
        }
      );
    });
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance.toFixed(1);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    
    if (query.trim() === '') {
      setSearchResults([]);
      setShowSearchResults(false);
      setShowRideOptions(false);
      return;
    }
    
    const filtered = MALAWI_LOCATIONS.filter(location => {
      const searchLower = query.toLowerCase();
      return (
        location.name.toLowerCase().includes(searchLower) ||
        location.address.toLowerCase().includes(searchLower) ||
        location.city.toLowerCase().includes(searchLower) ||
        location.type.toLowerCase().includes(searchLower)
      );
    });
    
    setSearchResults(filtered);
    setShowSearchResults(true);
    setShowRideOptions(false);
  };

  const handleDestinationSelect = (destination) => {
    setSelectedDestination(destination);
    setSearchQuery(destination.name);
    setShowRideOptions(true);
    setShowSearchResults(false);
    
    // Navigate to RideSelectionScreen with destination data
    navigation.navigate('RideSelection', {
      destination: destination.name,
      destinationAddress: destination.address || 'Malawi Location',
      destinationCoordinates: destination.coordinates || {
        latitude: -13.9626,
        longitude: 33.7741
      },
      pickupLocation: 'Your Location',
      pickupCoordinates: currentLocation || region,
      rideType: 'lifo',
      preselectedRide: 'lifo',
    });
    
    if (destination.coordinates) {
      setRegion({
        ...region,
        latitude: destination.coordinates.latitude,
        longitude: destination.coordinates.longitude,
      });
    }
    
    if (currentLocation && destination.coordinates) {
      const distance = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        destination.coordinates.latitude,
        destination.coordinates.longitude
      );
      
      const updatedRides = rideOptions.map(ride => ({
        ...ride,
        price: calculateRidePrice(parseFloat(distance), ride.id),
        time: calculateEstimatedTime(parseFloat(distance))
      }));
      
      setDynamicRideOptions(updatedRides);
    }
  };

  const handleRideSelect = (rideType) => {
    if (!selectedDestination) return;
    
    navigation.navigate('RideSelection', {
      destination: selectedDestination.name,
      destinationAddress: selectedDestination.address || 'Malawi Location',
      destinationCoordinates: selectedDestination.coordinates || {
        latitude: -13.9626,
        longitude: 33.7741
      },
      pickupLocation: 'Your Location',
      pickupCoordinates: currentLocation || region,
      rideType: rideType,
      preselectedRide: rideType,
    });
  };

  const calculateRidePrice = (distanceKm, rideType) => {
    const basePrices = {
      kabaza: { base: 500, perKm: 200 },
      comfort: { base: 700, perKm: 250 },
      green: { base: 600, perKm: 220 },
      xl: { base: 900, perKm: 300 },
    };
    
    const price = basePrices[rideType];
    if (!price) return 'MK 850 - MK 1050';
    
    const minPrice = price.base + (distanceKm * price.perKm * 0.8);
    const maxPrice = price.base + (distanceKm * price.perKm * 1.2);
    
    return `MK ${Math.round(minPrice)} - MK ${Math.round(maxPrice)}`;
  };

  const calculateEstimatedTime = (distanceKm) => {
    const avgSpeed = 30;
    const timeHours = distanceKm / avgSpeed;
    const timeMinutes = Math.round(timeHours * 60);
    return `${Math.max(2, timeMinutes)} min`;
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
    setShowRideOptions(false);
  };

  // ADD THIS: Menu Modal Render Function
  const renderMenuModal = () => (
    <Modal
      visible={menuVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setMenuVisible(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setMenuVisible(false)}
      >
        <View style={styles.menuModal}>
          <View style={styles.menuHeader}>
            <View style={styles.menuHeaderLeft}>
              <View style={styles.menuUserAvatar}>
                <Text style={styles.menuUserInitial}>
                  {userData?.name?.charAt(0)?.toUpperCase() || 'R'}
                </Text>
              </View>
              <View>
                <Text style={styles.menuUserName}>{userData?.name || 'Rider'}</Text>
                <Text style={styles.menuUserPhone}>{userData?.phone || '+265 *** ***'}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setMenuVisible(false)}>
              <MaterialIcon name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.menuList}>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                navigation.navigate('Profile');
              }}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: '#00a82d20' }]}>
                <MaterialIcon name="account-circle" size={22} color="#00a82d" />
              </View>
              <Text style={styles.menuItemText}>Profile</Text>
              <MaterialIcon name="chevron-right" size={20} color="#999" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                navigation.navigate('RidesHistory');
              }}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: '#3B82F620' }]}>
                <MaterialIcon name="history" size={22} color="#3B82F6" />
              </View>
              <Text style={styles.menuItemText}>My Rides</Text>
              <MaterialIcon name="chevron-right" size={20} color="#999" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                navigation.navigate('Notifications');
              }}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: '#F59E0B20' }]}>
                <MaterialIcon name="notifications" size={22} color="#F59E0B" />
              </View>
              <Text style={styles.menuItemText}>Notifications</Text>
              <MaterialIcon name="chevron-right" size={20} color="#999" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                navigation.navigate('PaymentMethods');
              }}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: '#8B5CF620' }]}>
                <MaterialIcon name="payment" size={22} color="#8B5CF6" />
              </View>
              <Text style={styles.menuItemText}>Payment Methods</Text>
              <MaterialIcon name="chevron-right" size={20} color="#999" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                navigation.navigate('Settings');
              }}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: '#EC489920' }]}>
                <MaterialIcon name="settings" size={22} color="#EC4899" />
              </View>
              <Text style={styles.menuItemText}>Settings</Text>
              <MaterialIcon name="chevron-right" size={20} color="#999" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                navigation.navigate('HelpSupport');
              }}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: '#10B98120' }]}>
                <MaterialIcon name="help" size={22} color="#10B981" />
              </View>
              <Text style={styles.menuItemText}>Help & Support</Text>
              <MaterialIcon name="chevron-right" size={20} color="#999" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                navigation.navigate('Privacy');
              }}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: '#6B728020' }]}>
                <MaterialIcon name="privacy-tip" size={22} color="#6B7280" />
              </View>
              <Text style={styles.menuItemText}>Privacy Policy</Text>
              <MaterialIcon name="chevron-right" size={20} color="#999" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                navigation.navigate('About');
              }}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: '#3B82F620' }]}>
                <MaterialIcon name="info" size={22} color="#3B82F6" />
              </View>
              <Text style={styles.menuItemText}>About</Text>
              <MaterialIcon name="chevron-right" size={20} color="#999" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.menuItem, styles.sosMenuItem]}
              onPress={() => {
                setMenuVisible(false);
                navigation.navigate('SOS');
              }}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: '#EF444420' }]}>
                <MaterialIcon name="emergency" size={22} color="#EF4444" />
              </View>
              <Text style={[styles.menuItemText, styles.sosText]}>SOS Emergency</Text>
              <MaterialIcon name="chevron-right" size={20} color="#EF4444" />
            </TouchableOpacity>
          </ScrollView>
          
          <View style={styles.menuFooter}>
            <Text style={styles.versionText}>Kabaza v1.0.0</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // RENDER FUNCTIONS
  // UPDATED: Top header with hamburger menu
  const renderTopHeader = () => (
    <View style={styles.headerContainer}>
      <TouchableOpacity 
        style={styles.menuButton}
        onPress={() => setMenuVisible(true)}
      >
        <MaterialIcon name="menu" size={24} color="#000" />
      </TouchableOpacity>
      
      <View style={styles.timeContainer}>
        <Text style={styles.timeText}>15:20</Text>
      </View>
      
      <View style={styles.placeholder} />
    </View>
  );

  const renderQuickAction = (action, index) => {
    return (
      <TouchableOpacity
        key={action.id}
        style={styles.quickActionCard}
        onPress={() => {
          if (action.id === 'schedule') {
            navigation.navigate('Schedule');
          } else if (action.id === 'send') {
            navigation.navigate('PackageDelivery');
          } else {
            setShowRideOptions(true);
          }
        }}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={action.gradient}
          style={styles.quickActionIcon}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <MaterialIcon name={action.icon} size={24} color="#fff" />
        </LinearGradient>
        <Text style={styles.quickActionTitle}>{action.title}</Text>
        <Text style={styles.quickActionSubtitle}>{action.subtitle}</Text>
      </TouchableOpacity>
    );
  };

  const renderSuggestedDestination = (item) => {
    return (
      <TouchableOpacity
        key={item.id}
        style={styles.locationItem}
        onPress={() => {
          navigation.navigate('RideSelection', {
            destination: item.name,
            destinationAddress: item.address,
            destinationCoordinates: item.coordinates,
            pickupLocation: 'Your Location',
            pickupCoordinates: currentLocation || region,
            rideType: 'lifo',
            preselectedRide: 'lifo',
          });
        }}
        activeOpacity={0.7}
      >
        <View style={styles.locationIcon}>
          <MaterialIcon name="location-on" size={20} color="#00a82d" />
        </View>
        <View style={styles.locationInfo}>
          <Text style={styles.locationName}>{item.name}</Text>
          <Text style={styles.locationAddress}>{item.address}</Text>
        </View>
        <MaterialIcon name="chevron-right" size={20} color="#666" />
      </TouchableOpacity>
    );
  };

  const renderRideOption = ({ item, index }) => {
    return (
      <TouchableOpacity
        style={styles.rideOptionCard}
        onPress={() => handleRideSelect(item.id)}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={item.gradient}
          style={styles.rideOptionIcon}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <MaterialIcon name={item.icon} size={24} color="#fff" />
        </LinearGradient>
        <View style={styles.rideOptionInfo}>
          <Text style={styles.rideOptionName}>{item.name}</Text>
          <Text style={styles.rideOptionPrice}>{item.price}</Text>
          <View style={styles.rideOptionMeta}>
            <View style={styles.metaItem}>
              <MaterialIcon name="access-time" size={12} color="#666" />
              <Text style={styles.metaText}>{item.time}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* TOP HEADER WITH HAMBURGER MENU */}
      {renderTopHeader()}

      {/* MAP VIEW */}
      <Animated.View style={[styles.mapContainer, { opacity: mapOpacity }]}>
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          region={region}
          showsUserLocation={true}
          showsMyLocationButton={false}
        >
          {currentLocation && (
            <Marker
              coordinate={currentLocation}
              title="Your Location"
              pinColor="#00a82d"
            />
          )}
          {selectedDestination && selectedDestination.coordinates && (
            <Marker
              coordinate={selectedDestination.coordinates}
              title={selectedDestination.name}
              pinColor="#ff6b6b"
            />
          )}
        </MapView>
      </Animated.View>

      {/* DRAGGABLE SHEET */}
      <Animated.View style={[styles.sheet, { height: sheetHeight }]}>
        <View style={styles.handleContainer} {...panResponder.panHandlers}>
          <View style={styles.handle} />
        </View>

        <ScrollView 
          style={styles.sheetContent}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.sheetContentContainer}
        >
          {/* SHEET HEADER */}
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Choose your adventure.</Text>
          </View>

          {/* QUICK ACTIONS */}
          <View style={styles.quickActionsContainer}>
            {quickActions.map((action, index) => renderQuickAction(action, index))}
          </View>

          {/* SEARCH BAR */}
          <View style={styles.searchContainer}>
            <View style={styles.searchBox}>
              <TouchableOpacity 
                style={styles.searchLeftPart}
                onPress={() => navigation.navigate('SearchLocation', {
                  initialType: 'destination',
                  onLocationSelect: (selectedLocation) => {
                    navigation.navigate('RideSelection', {
                      destination: selectedLocation.name,
                      destinationAddress: selectedLocation.address || 'Malawi Location',
                      destinationCoordinates: selectedLocation.coordinates,
                      pickupLocation: 'Your Location',
                      pickupCoordinates: currentLocation || region,
                      rideType: 'lifo',
                      preselectedRide: 'lifo',
                    });
                  }
                })}
                activeOpacity={0.8}
              >
                <MaterialIcon name="search" size={20} color="#666" />
                <Text style={styles.searchPlaceholder}>
                  Where to?
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.laterContainer}
                onPress={() => navigation.navigate('Schedule')}
                activeOpacity={0.8}
              >
                <MaterialIcon name="schedule" size={20} color="#666" style={styles.laterIcon} />
                <Text style={styles.laterText}>Later</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* SEARCH RESULTS */}
          {showSearchResults && !loading && searchResults.length > 0 && (
            <View style={styles.searchResultsContainer}>
              <FlatList
                data={searchResults}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.locationItem}
                    onPress={() => handleDestinationSelect(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.locationIcon}>
                      <MaterialIcon name="location-on" size={20} color="#00a82d" />
                    </View>
                    <View style={styles.locationInfo}>
                      <Text style={styles.locationName}>{item.name}</Text>
                      <Text style={styles.locationAddress}>{item.address}</Text>
                    </View>
                  </TouchableOpacity>
                )}
                keyExtractor={(item) => item.id}
                style={styles.searchResultsList}
                scrollEnabled={false}
              />
            </View>
          )}

          {/* RIDE OPTIONS */}
          {showRideOptions && (
            <View style={styles.rideOptionsContainer}>
              <FlatList
                data={dynamicRideOptions}
                renderItem={renderRideOption}
                keyExtractor={(item) => item.id}
                numColumns={3}
                scrollEnabled={false}
                columnWrapperStyle={styles.rideOptionsRow}
              />
            </View>
          )}

          {/* SUGGESTED DESTINATIONS */}
          {!showSearchResults && !showRideOptions && (
            <View style={styles.suggestedContainer}>
              {suggestedDestinations.map(item => renderSuggestedDestination(item))}
            </View>
          )}
          
          {/* ADD EXTRA SPACE AT BOTTOM FOR BETTER SCROLLING */}
          <View style={styles.bottomSpacing} />
        </ScrollView>
      </Animated.View>

      {/* MENU MODAL */}
      {renderMenuModal()}
    </SafeAreaView>
  );
}

// UPDATED STYLES with menu modal styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  // NEW: Header with hamburger menu
  headerContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 1000,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  timeContainer: {
    flex: 1,
    alignItems: 'center',
  },
  timeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  placeholder: {
    width: 40,
  },
  mapContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
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
  sheetContent: {
    flex: 1,
  },
  sheetContentContainer: {
    paddingBottom: 30,
  },
  sheetHeader: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sheetTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  quickActionCard: {
    width: (width - 60) / 3,
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
    textAlign: 'center',
  },
  quickActionSubtitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchLeftPart: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 16,
    color: '#666',
    marginLeft: 12,
  },
  laterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
    paddingVertical: 8,
  },
  laterIcon: {
    marginLeft: 8,
  },
  laterText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  suggestedContainer: {
    paddingHorizontal: 20,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  locationIcon: {
    marginRight: 12,
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 2,
  },
  locationAddress: {
    fontSize: 14,
    color: '#666',
  },
  searchResultsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchResultsList: {
    maxHeight: 300,
  },
  rideOptionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  rideOptionsRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  rideOptionCard: {
    width: (width - 60) / 3,
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  rideOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  rideOptionInfo: {
    alignItems: 'center',
  },
  rideOptionName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  rideOptionPrice: {
    fontSize: 12,
    color: '#00a82d',
    fontWeight: '600',
    marginBottom: 4,
  },
  rideOptionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 11,
    color: '#666',
    marginLeft: 2,
  },
  bottomSpacing: {
    height: 40,
  },
  
  // NEW: Menu Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
  },
  menuModal: {
    width: '80%',
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuUserAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#00a82d',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuUserInitial: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  menuUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  menuUserPhone: {
    fontSize: 12,
    color: '#666',
  },
  menuList: {
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  menuItemText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  sosMenuItem: {
    marginTop: 10,
    borderBottomWidth: 0,
  },
  sosText: {
    color: '#EF4444',
    fontWeight: '700',
  },
  menuFooter: {
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    alignItems: 'center',
  },
  versionText: {
    fontSize: 12,
    color: '#999',
  },
});