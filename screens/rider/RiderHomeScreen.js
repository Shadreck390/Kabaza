// screens/rider/RiderHomeScreen.js
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
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import Geolocation from 'react-native-geolocation-service';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { getUserData } from '@src/utils/userStorage';

const windowDimensions = Dimensions.get('window') || { width: 375, height: 667 };
const { width, height } = windowDimensions;;
const SHEET_MAX_HEIGHT = height * 0.72;
const SHEET_MIN_HEIGHT = 160;

// ========== MALAWI REAL LOCATIONS DATABASE ==========
const MALAWI_LOCATIONS = [
  // Lilongwe Hospitals
  { 
    id: '1', 
    name: 'Likuni Hospital', 
    address: 'Likuni Road, Lilongwe, Malawi', 
    type: 'hospital', 
    city: 'Lilongwe',
    coordinates: { latitude: -13.9786, longitude: 33.7431 }
  },
  { 
    id: '2', 
    name: 'Kamuzu Central Hospital (KCH)', 
    address: 'Mzimba Street, Lilongwe, Malawi', 
    type: 'hospital', 
    city: 'Lilongwe',
    coordinates: { latitude: -13.9711, longitude: 33.7836 }
  },
  { 
    id: '3', 
    name: 'Bwaila Hospital', 
    address: 'Lilongwe, Malawi', 
    type: 'hospital', 
    city: 'Lilongwe',
    coordinates: { latitude: -13.9667, longitude: 33.7833 }
  },
  { 
    id: '4', 
    name: 'St. John\'s Hospital', 
    address: 'Mzimba Street, Lilongwe', 
    type: 'hospital', 
    city: 'Lilongwe',
    coordinates: { latitude: -13.9700, longitude: 33.7800 }
  },
  { 
    id: '5', 
    name: 'Mchinji District Hospital', 
    address: 'Mchinji, Malawi', 
    type: 'hospital', 
    city: 'Mchinji',
    coordinates: { latitude: -13.8000, longitude: 32.9000 }
  },
  
  // Blantyre Hospitals
  { 
    id: '6', 
    name: 'Queen Elizabeth Central Hospital (QECH)', 
    address: 'Blantyre, Malawi', 
    type: 'hospital', 
    city: 'Blantyre',
    coordinates: { latitude: -15.7833, longitude: 35.0167 }
  },
  { 
    id: '7', 
    name: 'Mwaiwathu Private Hospital', 
    address: 'Blantyre, Malawi', 
    type: 'hospital', 
    city: 'Blantyre',
    coordinates: { latitude: -15.7833, longitude: 35.0083 }
  },
  { 
    id: '8', 
    name: 'Blantyre Adventist Hospital', 
    address: 'Blantyre, Malawi', 
    type: 'hospital', 
    city: 'Blantyre',
    coordinates: { latitude: -15.7900, longitude: 35.0100 }
  },
  
  // Mzuzu Hospitals
  { 
    id: '9', 
    name: 'Mzuzu Central Hospital', 
    address: 'Mzuzu, Malawi', 
    type: 'hospital', 
    city: 'Mzuzu',
    coordinates: { latitude: -11.4500, longitude: 34.0200 }
  },
  
  // Universities
  { 
    id: '10', 
    name: 'University of Malawi - College of Medicine', 
    address: 'Blantyre, Malawi', 
    type: 'university', 
    city: 'Blantyre',
    coordinates: { latitude: -15.7860, longitude: 35.0200 }
  },
  { 
    id: '11', 
    name: 'Mzuzu University', 
    address: 'Mzuzu, Malawi', 
    type: 'university', 
    city: 'Mzuzu',
    coordinates: { latitude: -11.4528, longitude: 34.0162 }
  },
  { 
    id: '12', 
    name: 'University of Malawi - Chancellor College', 
    address: 'Zomba, Malawi', 
    type: 'university', 
    city: 'Zomba',
    coordinates: { latitude: -15.3861, longitude: 35.3189 }
  },
  
  // Shopping Malls
  { 
    id: '13', 
    name: 'Lilongwe City Mall', 
    address: 'M1 Road, Lilongwe, Malawi', 
    type: 'mall', 
    city: 'Lilongwe',
    coordinates: { latitude: -13.9772, longitude: 33.7720 }
  },
  { 
    id: '14', 
    name: 'Game Stores Lilongwe', 
    address: 'City Center, Lilongwe', 
    type: 'shopping', 
    city: 'Lilongwe',
    coordinates: { latitude: -13.9758, longitude: 33.7881 }
  },
  { 
    id: '15', 
    name: 'Area 3 Shopping Complex', 
    address: 'Area 3, Lilongwe', 
    type: 'shopping', 
    city: 'Lilongwe',
    coordinates: { latitude: -13.9583, longitude: 33.7689 }
  },
  { 
    id: '16', 
    name: 'Shoprite Blantyre', 
    address: 'Victoria Avenue, Blantyre', 
    type: 'shopping', 
    city: 'Blantyre',
    coordinates: { latitude: -15.7867, longitude: 35.0067 }
  },
  { 
    id: '17', 
    name: 'Chichiri Shopping Centre', 
    address: 'Blantyre, Malawi', 
    type: 'mall', 
    city: 'Blantyre',
    coordinates: { latitude: -15.7889, longitude: 35.0128 }
  },
  
  // Hotels
  { 
    id: '18', 
    name: 'Crossroads Hotel', 
    address: 'Lilongwe, Malawi', 
    type: 'hotel', 
    city: 'Lilongwe',
    coordinates: { latitude: -13.9750, longitude: 33.7867 }
  },
  { 
    id: '19', 
    name: 'Sunbird Capital Hotel', 
    address: 'Lilongwe, Malawi', 
    type: 'hotel', 
    city: 'Lilongwe',
    coordinates: { latitude: -13.9739, longitude: 33.7881 }
  },
  { 
    id: '20', 
    name: 'Mount Soche Hotel', 
    address: 'Victoria Avenue, Blantyre', 
    type: 'hotel', 
    city: 'Blantyre',
    coordinates: { latitude: -15.7850, longitude: 35.0083 }
  },
  
  // Airports
  { 
    id: '21', 
    name: 'Kamuzu International Airport (LLW)', 
    address: 'Lilongwe, Malawi', 
    type: 'airport', 
    city: 'Lilongwe',
    coordinates: { latitude: -13.7894, longitude: 33.7811 }
  },
  { 
    id: '22', 
    name: 'Chileka International Airport (BLZ)', 
    address: 'Blantyre, Malawi', 
    type: 'airport', 
    city: 'Blantyre',
    coordinates: { latitude: -15.6794, longitude: 34.9744 }
  },
  
  // Taxi Ranks & Transport
  { 
    id: '23', 
    name: 'Lilongwe Bus Station', 
    address: 'Lilongwe, Malawi', 
    type: 'transport', 
    city: 'Lilongwe',
    coordinates: { latitude: -13.9731, longitude: 33.7878 }
  },
  { 
    id: '24', 
    name: 'Bunda Taxi Rank', 
    address: 'Bunda Road, Lilongwe', 
    type: 'transport', 
    city: 'Lilongwe',
    coordinates: { latitude: -13.9667, longitude: 33.7833 }
  },
  { 
    id: '25', 
    name: 'MTN Butchery Taxi Rank', 
    address: 'Lilongwe, Malawi', 
    type: 'transport', 
    city: 'Lilongwe',
    coordinates: { latitude: -13.9744, longitude: 33.7867 }
  },
  { 
    id: '26', 
    name: 'Bree Street Taxi Rank', 
    address: 'Blantyre, Malawi', 
    type: 'transport', 
    city: 'Blantyre',
    coordinates: { latitude: -15.7850, longitude: 35.0078 }
  },
  
  // Popular addresses (like your screenshot)
  { 
    id: '27', 
    name: '30 Wolmarans Street', 
    address: 'Lilongwe, Malawi', 
    type: 'address', 
    city: 'Lilongwe',
    coordinates: { latitude: -13.9650, longitude: 33.7750 }
  },
  { 
    id: '28', 
    name: '6th Avenue', 
    address: 'Lilongwe, Malawi', 
    type: 'address', 
    city: 'Lilongwe',
    coordinates: { latitude: -13.9626, longitude: 33.7741 }
  },
  { 
    id: '29', 
    name: 'Propoff Location', 
    address: 'Kamuzu Procession Road, Lilongwe', 
    type: 'landmark', 
    city: 'Lilongwe',
    coordinates: { latitude: -13.9600, longitude: 33.7800 }
  },
  { 
    id: '30', 
    name: 'Main Entrance Maponya Mall', 
    address: 'Lilongwe, Malawi', 
    type: 'mall', 
    city: 'Lilongwe',
    coordinates: { latitude: -13.9811, longitude: 33.7717 }
  },
  { 
    id: '31', 
    name: 'Bingu National Stadium', 
    address: 'Lilongwe, Malawi', 
    type: 'stadium', 
    city: 'Lilongwe',
    coordinates: { latitude: -13.9917, longitude: 33.7753 }
  },
  
  // Additional real locations
  { 
    id: '32', 
    name: 'Kameza Roundabout', 
    address: 'Blantyre, Malawi', 
    type: 'landmark', 
    city: 'Blantyre',
    coordinates: { latitude: -15.7300, longitude: 34.9700 }
  },
  { 
    id: '33', 
    name: 'Mulanje Mountain', 
    address: 'Mulanje, Malawi', 
    type: 'landmark', 
    city: 'Mulanje',
    coordinates: { latitude: -15.9333, longitude: 35.6000 }
  },
  { 
    id: '34', 
    name: 'Zomba Plateau', 
    address: 'Zomba, Malawi', 
    type: 'landmark', 
    city: 'Zomba',
    coordinates: { latitude: -15.3333, longitude: 35.3333 }
  },
];

export default function RiderHomeScreen({ navigation }) {
  const [region, setRegion] = useState({
    latitude: -13.9626,
    longitude: 33.7741,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const [currentLocation, setCurrentLocation] = useState(null);
  const [userData, setUserData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showRideOptions, setShowRideOptions] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [activeService, setActiveService] = useState('Rides');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Animation
  const sheetHeight = useRef(new Animated.Value(SHEET_MAX_HEIGHT)).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        const newHeight = SHEET_MAX_HEIGHT - gestureState.dy;
        if (newHeight >= SHEET_MIN_HEIGHT && newHeight <= SHEET_MAX_HEIGHT) {
          sheetHeight.setValue(newHeight);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const currentHeight = SHEET_MAX_HEIGHT - gestureState.dy;
        const snapThreshold = (SHEET_MAX_HEIGHT + SHEET_MIN_HEIGHT) / 2;
        
        if (currentHeight < snapThreshold) {
          Animated.spring(sheetHeight, {
            toValue: SHEET_MIN_HEIGHT,
            useNativeDriver: false,
            tension: 50,
            friction: 8,
          }).start();
        } else {
          Animated.spring(sheetHeight, {
            toValue: SHEET_MAX_HEIGHT,
            useNativeDriver: false,
            tension: 50,
            friction: 8,
          }).start();
        }
      },
    })
  ).current;

  // Quick actions
  const quickActions = [
    {
      id: 'rides',
      title: 'Rides',
      subtitle: "Let's get moving",
      icon: 'directions-car',
      color: '#00a82d',
    },
    {
      id: 'schedule',
      title: 'Schedule',
      subtitle: 'Book ahead',
      icon: 'calendar-today',
      color: '#2196f3',
    },
    {
      id: 'send',
      title: 'Kabaza Send',
      subtitle: 'Package delivery',
      icon: 'local-shipping',
      color: '#ff9800',
    },
  ];

  // Recent destinations
  const recentDestinations = [
    {
      id: '1',
      name: 'Area 3 Shopping Complex',
      address: 'Lilongwe, Malawi',
      icon: 'shopping-cart',
      coordinates: { latitude: -13.9583, longitude: 33.7689 }
    },
    {
      id: '2',
      name: 'Bingu National Stadium',
      address: 'Lilongwe, Malawi',
      icon: 'stadium',
      coordinates: { latitude: -13.9917, longitude: 33.7753 }
    },
    {
      id: '3',
      name: 'Crossroads Hotel',
      address: 'Lilongwe, Malawi',
      icon: 'hotel',
      coordinates: { latitude: -13.9750, longitude: 33.7867 }
    },
  ];

  // Ride options
  const rideOptions = [
    { id: 'kabaza', name: 'Kabaza', price: 'MK 850 - MK 1050', icon: 'directions-car', color: '#00a82d' },
    { id: 'comfort', name: 'Comfort', price: 'MK 1100 - MK 1300', icon: 'directions-car', color: '#2196f3' },
    { id: 'green', name: 'Green', price: 'MK 950 - MK 1150', icon: 'eco', color: '#4caf50' },
    { id: 'xl', name: 'Kabaza XL', price: 'MK 1500 - MK 1800', icon: 'airport-shuttle', color: '#ff9800' },
  ];

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const data = await getUserData();
        setUserData(data);
      } catch (error) {
        console.warn('Failed to load user data:', error);
      }
    };
    loadUserData();
    requestLocationPermission();
  }, []);

  // REAL-TIME SEARCH EFFECT
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    
    setLoading(true);
    
    // Simulate API delay
    const timeout = setTimeout(() => {
      const results = MALAWI_LOCATIONS.filter(location => 
        location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        location.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        location.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        location.type.toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      setSearchResults(results);
      setShowSearchResults(true);
      setLoading(false);
    }, 300);
    
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          getCurrentLocation();
        }
      } catch (err) {
        console.warn(err);
      }
    } else {
      getCurrentLocation();
    }
  };

  const getCurrentLocation = () => {
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setRegion({
          latitude,
          longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
        setCurrentLocation({ latitude, longitude });
      },
      (error) => console.log(error),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
    );
  };

  const handleDestinationSelect = (destination) => {
    setSelectedDestination(destination);
    setSearchQuery(destination.name);
    setShowRideOptions(true);
    setShowSearchResults(false);
    
    // Center map on destination
    if (destination.coordinates) {
      setRegion({
        ...region,
        latitude: destination.coordinates.latitude,
        longitude: destination.coordinates.longitude,
      });
    }
  };

  const handleRideSelect = (rideType) => {
    navigation.navigate('RideSelection', {
      destination: selectedDestination.name,
      destinationAddress: selectedDestination.address,
      destinationCoordinates: selectedDestination.coordinates,
      pickupLocation: currentLocation || region,
      rideType: rideType,
    });
  };

  const handleSearchFocus = () => {
    Animated.spring(sheetHeight, {
      toValue: SHEET_MAX_HEIGHT * 0.6,
      useNativeDriver: false,
      tension: 50,
      friction: 8,
    }).start();
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
    setShowRideOptions(false);
  };

  const getLocationIcon = (type) => {
    switch (type) {
      case 'hospital': return 'local-hospital';
      case 'mall': return 'shopping-mall';
      case 'shopping': return 'shopping-cart';
      case 'hotel': return 'hotel';
      case 'airport': return 'airport';
      case 'transport': return 'directions-bus';
      case 'university': return 'school';
      case 'stadium': return 'stadium';
      case 'landmark': return 'place';
      default: return 'location-pin';
    }
  };

  const renderSearchResult = ({ item }) => (
    <TouchableOpacity
      style={styles.searchResultItem}
      onPress={() => handleDestinationSelect(item)}
    >
      <MaterialIcon name={getLocationIcon(item.type)} size={20} color="#666" />
      <View style={styles.searchResultInfo}>
        <Text style={styles.searchResultName}>{item.name}</Text>
        <Text style={styles.searchResultAddress}>{item.address}</Text>
      </View>
      <View style={styles.distanceContainer}>
        <Text style={styles.distanceText}>
          {item.coordinates ? `${Math.floor(Math.random() * 20) + 1} km` : 'Distance'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderDestinationItem = ({ item, index }) => (
    <TouchableOpacity
      style={styles.destinationItem}
      onPress={() => handleDestinationSelect(item)}
    >
      <View style={styles.destinationNumber}>
        <Text style={styles.numberText}>{index + 1}</Text>
      </View>
      <View style={styles.destinationInfo}>
        <Text style={styles.destinationName}>{item.name}</Text>
        <Text style={styles.destinationAddress}>{item.address}</Text>
      </View>
      <MaterialIcon name="chevron-right" size={20} color="#666" />
    </TouchableOpacity>
  );

  const renderRecentDestination = ({ item }) => (
    <TouchableOpacity
      style={styles.recentDestination}
      onPress={() => handleDestinationSelect(item)}
    >
      <MaterialIcon name={item.icon} size={20} color="#666" style={styles.destinationIcon} />
      <View style={styles.destinationInfo}>
        <Text style={styles.destinationName}>{item.name}</Text>
        <Text style={styles.destinationAddress}>{item.address}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderRideOption = ({ item }) => (
    <TouchableOpacity
      style={styles.rideOption}
      onPress={() => handleRideSelect(item.id)}
    >
      <View style={[styles.rideIcon, { backgroundColor: `${item.color}20` }]}>
        <MaterialIcon name={item.icon} size={24} color={item.color} />
      </View>
      <Text style={styles.rideName}>{item.name}</Text>
      <Text style={styles.ridePrice}>{item.price}</Text>
    </TouchableOpacity>
  );

  // Check current sheet height
  const currentSheetHeight = sheetHeight.__getValue();
  const isSheetUp = currentSheetHeight > SHEET_MAX_HEIGHT * 0.6;
  const isSheetDown = currentSheetHeight < SHEET_MAX_HEIGHT * 0.4;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* MAP */}
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

      {/* DRAGGABLE SHEET */}
      <Animated.View style={[styles.sheet, { height: sheetHeight }]}>
        {/* Drag Handle */}
        <View style={styles.handleContainer} {...panResponder.panHandlers}>
          <View style={styles.handle} />
        </View>

        {/* When sheet is up - show full content */}
        {isSheetUp && (
          <ScrollView 
            style={styles.sheetContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Smooth sailing ahead.</Text>
            </View>

            {/* Quick Actions */}
            <View style={styles.actionsContainer}>
              {quickActions.map((action) => (
                <TouchableOpacity
                  key={action.id}
                  style={styles.actionCard}
                  onPress={() => {
                    if (action.id === 'schedule') {
                      navigation.navigate('RideSelection', { scheduleLater: true });
                    } else if (action.id === 'send') {
                      navigation.navigate('PackageDelivery');
                    }
                  }}
                >
                  <View style={[styles.actionIcon, { backgroundColor: `${action.color}20` }]}>
                    <MaterialIcon name={action.icon} size={28} color={action.color} />
                  </View>
                  <Text style={styles.actionTitle}>{action.title}</Text>
                  <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.divider} />
          </ScrollView>
        )}

        {/* SEARCH SECTION - Always visible */}
        <View style={styles.searchSection}>
          <Text style={styles.searchTitle}>Where to?</Text>
          <View style={styles.searchButton}>
            <View style={styles.searchButtonContent}>
              <MaterialIcon name="search" size={20} color="#666" />
              <TextInput
                style={styles.searchInput}
                placeholder="Where to?"
                placeholderTextColor="#666"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onFocus={handleSearchFocus}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={clearSearch}>
                  <MaterialIcon name="close" size={20} color="#666" />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity 
              style={styles.laterButton}
              onPress={() => navigation.navigate('RideSelection', { scheduleLater: true })}
            >
              <MaterialIcon name="access-time" size={16} color="#000" />
              <Text style={styles.laterText}>Later</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* SEARCH RESULTS */}
        {showSearchResults && (
          <View style={styles.searchResultsContainer}>
            {loading ? (
              <ActivityIndicator size="large" color="#00a82d" />
            ) : searchResults.length > 0 ? (
              <FlatList
                data={searchResults}
                renderItem={renderSearchResult}
                keyExtractor={(item) => item.id}
                style={styles.searchResultsList}
                keyboardShouldPersistTaps="handled"
              />
            ) : (
              <View style={styles.noResults}>
                <MaterialIcon name="search-off" size={48} color="#ccc" />
                <Text style={styles.noResultsText}>No locations found</Text>
                <Text style={styles.noResultsSubtext}>Try searching for hospitals, malls, or addresses</Text>
              </View>
            )}
          </View>
        )}

        {/* DESTINATIONS (when no search) */}
        {!showSearchResults && !showRideOptions && isSheetUp && (
          <View style={styles.destinationsSection}>
            <Text style={styles.suggestionsTitle}>Suggested destinations</Text>
            <FlatList
              data={MALAWI_LOCATIONS.slice(0, 5)}
              renderItem={renderDestinationItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
            
            <Text style={[styles.suggestionsTitle, { marginTop: 20 }]}>Recent destinations</Text>
            <FlatList
              data={recentDestinations}
              renderItem={renderRecentDestination}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* RIDE OPTIONS */}
        {showRideOptions && (
          <View style={styles.rideOptionsSection}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>Choose your ride</Text>
              <TouchableOpacity onPress={() => setShowRideOptions(false)}>
                <MaterialIcon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rideOptionsList}>
              {rideOptions.map((ride) => (
                <TouchableOpacity
                  key={ride.id}
                  style={styles.rideOption}
                  onPress={() => handleRideSelect(ride.id)}
                >
                  <View style={[styles.rideIcon, { backgroundColor: `${ride.color}20` }]}>
                    <MaterialIcon name={ride.icon} size={24} color={ride.color} />
                  </View>
                  <Text style={styles.rideName}>{ride.name}</Text>
                  <Text style={styles.ridePrice}>{ride.price}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Schedule Ride Option */}
            <TouchableOpacity 
              style={styles.scheduleButton}
              onPress={() => navigation.navigate('RideSelection', { 
                destination: selectedDestination.name,
                scheduleLater: true 
              })}
            >
              <View style={styles.scheduleContent}>
                <View>
                  <Text style={styles.scheduleTitle}>Schedule a ride</Text>
                  <Text style={styles.scheduleSubtitle}>Book ahead for your trip</Text>
                </View>
                <MaterialIcon name="calendar-today" size={24} color="#00a82d" />
              </View>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>

      {/* BOTTOM NAVIGATION - Using React Navigation tabs instead */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  
  // DRAGGABLE SHEET
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
    elevation: 10,
    overflow: 'hidden',
  },
  handleContainer: {
    paddingTop: 12,
    paddingBottom: 8,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
  },
  
  // SHEET CONTENT
  sheetContent: {
    paddingHorizontal: 20,
  },
  header: {
    paddingTop: 8,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
    lineHeight: 38,
  },
  
  // QUICK ACTIONS
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  actionCard: {
    width: (width - 60) / 3,
    alignItems: 'center',
    padding: 8,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
    textAlign: 'center',
  },
  actionSubtitle: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  
  // DIVIDER
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginBottom: 20,
  },
  
  // SEARCH SECTION
  searchSection: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  searchButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    marginLeft: 12,
    padding: 0,
  },
  laterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  laterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    marginLeft: 4,
  },
  
  // SEARCH RESULTS
  searchResultsContainer: {
    maxHeight: height * 0.5,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  searchResultsList: {
    flex: 1,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchResultInfo: {
    flex: 1,
    marginLeft: 12,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  searchResultAddress: {
    fontSize: 14,
    color: '#666',
  },
  distanceContainer: {
    marginLeft: 12,
  },
  distanceText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  
  // NO RESULTS
  noResults: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  
  // DESTINATIONS
  destinationsSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  suggestionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  destinationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  destinationNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  numberText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  destinationInfo: {
    flex: 1,
  },
  destinationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  destinationAddress: {
    fontSize: 14,
    color: '#666',
  },
  destinationIcon: {
    marginRight: 16,
  },
  recentDestination: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  
  // RIDE OPTIONS
  rideOptionsSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  panelTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
  },
  rideOptionsList: {
    marginBottom: 20,
  },
  rideOption: {
    width: 130,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    alignItems: 'center',
    marginRight: 12,
  },
  rideIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  rideName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  ridePrice: {
    fontSize: 14,
    color: '#666',
  },
  scheduleButton: {
    backgroundColor: '#f0f9f0',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
  },
  scheduleContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scheduleTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  scheduleSubtitle: {
    fontSize: 14,
    color: '#666',
  },
});