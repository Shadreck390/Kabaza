import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, Platform, PermissionsAndroid, 
  TouchableOpacity, StatusBar, Dimensions
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import Loading from '../../src/components/Loading';
import Geolocation from 'react-native-geolocation-service';
import { getUserData } from '../../src/utils/userStorage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function RiderHomeScreen({ route, navigation }) {
  const [region, setRegion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locationPermission, setLocationPermission] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [userData, setUserData] = useState(null);
  const locationWatchId = useRef(null);

  // Quick action buttons - Bolt-like
  const quickActions = [
    { id: 1, title: 'Rides', subtitle: "Let's get moving", icon: 'car', screen: 'RideConfirmation' },
    { id: 2, title: 'Schedule', subtitle: 'Book ahead', icon: 'calendar-alt', screen: 'RideHistory' },
    { id: 3, title: 'Bolt Send', subtitle: 'Package delivery', icon: 'box', screen: 'Profile' },
  ];

  // Saved places changed to Lilongwe (Malawi) examples
  const savedPlaces = [
    {
      id: 1,
      name: 'City Centre',
      address: 'Kamuzu 1 Ave, Lilongwe, Malawi',
      icon: 'access-time',
    },
    {
      id: 2,
      name: 'Kamuzu Central Hospital',
      address: 'Area 33, Lilongwe, Malawi',
      icon: 'access-time',
    },
    {
      id: 3,
      name: 'Lilongwe Golf Club',
      address: 'Old Town, Lilongwe, Malawi',
      icon: 'access-time',
    },
  ];

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const data = await getUserData();
        setUserData(data);
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    loadUserData();
  }, []);

  const riderName = userData?.userProfile?.fullName || userData?.socialUserInfo?.name || 'Rider';

  // Default region set to Lilongwe, Malawi 
  const defaultRegion = {
    latitude: -13.9626,
    longitude: 33.7741,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  const requestLocationPermission = async () => {
    try {
      if (Platform.OS === 'ios') {
        const status = await Geolocation.requestAuthorization('whenInUse');
        const allowed = status === 'granted' || status === 'authorizedAlways';
        setLocationPermission(allowed);
        return allowed;
      } else {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'Kabaza needs your location to find rides.',
            buttonPositive: 'OK',
            buttonNegative: 'Cancel',
          }
        );
        const allowed = granted === PermissionsAndroid.RESULTS.GRANTED;
        setLocationPermission(allowed);
        return allowed;
      }
    } catch (err) {
      console.warn('Permission error:', err);
      return false;
    }
  };

  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const newRegion = { 
            latitude, 
            longitude, 
            latitudeDelta: 0.01, 
            longitudeDelta: 0.01 
          };
          setCurrentLocation({ latitude, longitude });
          setRegion(newRegion);
          resolve({ latitude, longitude });
        },
        (error) => {
          console.log('Location error:', error.code, error.message);
          setRegion(defaultRegion);
          reject(error);
        },
        { 
          enableHighAccuracy: true, 
          timeout: 15000,
          maximumAge: 10000 
        }
      );
    });
  };

  useEffect(() => {
    const initializeLocation = async () => {
      try {
        const granted = await requestLocationPermission();
        if (granted) {
          await getCurrentLocation();
        } else {
          setRegion(defaultRegion);
        }
      } catch (error) {
        console.error('Location init error:', error);
        setRegion(defaultRegion);
      } finally {
        setLoading(false);
      }
    };

    initializeLocation();

    return () => {
      if (locationWatchId.current) {
        Geolocation.clearWatch(locationWatchId.current);
      }
    };
  }, []);

  if (loading && !region) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <Loading message="Getting your location..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Heading */}
        <View style={styles.headingContainer}>
          <Text style={styles.mainHeading}>Smooth sailing ahead.</Text>
        </View>

        {/* Quick Action Cards */}
        <View style={styles.actionsContainer}>
          <ScrollView 
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.actionsScrollContent}
          >
            {quickActions.map((action) => (
              <TouchableOpacity 
                key={action.id}
                style={styles.actionCard}
                onPress={() => navigation.navigate(action.screen)}
              >
                <View style={styles.actionCardHeader}>
                  <View style={styles.checkmarkBadge}>
                    <MaterialIcon name="check" size={14} color="#FFFFFF" />
                  </View>
                </View>
                <View style={styles.actionImagePlaceholder}>
                  <FontAwesome5 
                    name={action.icon} 
                    size={32} 
                    color={'#000'} 
                  />
                </View>
                <View style={styles.actionTextContainer}>
                  <Text style={styles.actionCardTitle}>{action.title}</Text>
                  <Text style={styles.actionCardSubtitle}>{action.subtitle}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Main Search Bar */}
        <View style={styles.mainSearchContainer}>
          <TouchableOpacity 
            style={styles.mainSearchBox}
            onPress={() => navigation.navigate('SearchScreen')}
          >
            <MaterialIcon name="search" size={24} color="#000" style={styles.searchIcon} />
            <Text style={styles.searchPlaceholder}>Where to?</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.laterButton}>
            <MaterialIcon name="schedule" size={20} color="#000" />
            <Text style={styles.laterButtonText}>Later</Text>
          </TouchableOpacity>
        </View>

        {/* Saved Places Section */}
        <View style={styles.savedPlacesSection}>
          {savedPlaces.map((place, index) => (
            <TouchableOpacity 
              key={place.id}
              style={[
                styles.placeItem,
                index === savedPlaces.length - 1 && styles.placeItemLast
              ]}
              onPress={() => navigation.navigate('RideConfirmation', { destination: place.name })}
            >
              <View style={styles.placeIconContainer}>
                <MaterialIcon name="access-time" size={20} color="#666" />
              </View>
              <View style={styles.placeInfo}>
                <Text style={styles.placeName}>{place.name}</Text>
                <Text style={styles.placeAddress} numberOfLines={1}>
                  {place.address}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Bottom Tab Bar */}
      <View style={styles.bottomTabBar}>
        <TouchableOpacity 
          style={styles.tabItem}
          onPress={() => navigation.navigate('Home')}
        >
          <MaterialIcon name="home" size={28} color="#000" />
          <Text style={styles.tabTextActive}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.tabItem}
          onPress={() => navigation.navigate('RideHistory')}
        >
          <MaterialIcon name="event-note" size={28} color="#9E9E9E" />
          <Text style={styles.tabText}>Rides</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.tabItem}
          onPress={() => navigation.navigate('Profile')}
        >
          <MaterialIcon name="account-circle" size={28} color="#9E9E9E" />
          <Text style={styles.tabText}>Account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F6F3', // soft off-white like Bolt
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  headingContainer: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  mainHeading: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.5,
  },
  actionsContainer: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 20,
  },
  actionsScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  actionCard: {
    width: SCREEN_WIDTH * 0.45,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    marginRight: 12,
    overflow: 'hidden',
  },
  actionCardHeader: {
    padding: 8,
    alignItems: 'flex-end',
  },
  checkmarkBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#06C167', // green accent
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionImagePlaceholder: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    margin: 8,
  },
  actionTextContainer: {
    padding: 12,
    paddingTop: 8,
  },
  actionCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  actionCardSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  mainSearchContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 20,
    marginTop: 8,
  },
  mainSearchBox: {
    backgroundColor: '#F5F5F5',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 18,
    color: '#000',
    fontWeight: '500',
  },
  laterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  laterButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginLeft: 8,
  },
  savedPlacesSection: {
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    paddingHorizontal: 16,
  },
  placeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  placeItemLast: {
    borderBottomWidth: 0,
  },
  placeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  placeInfo: {
    flex: 1,
  },
  placeName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 4,
  },
  placeAddress: {
    fontSize: 14,
    color: '#666',
  },
  bottomTabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  tabTextActive: {
    fontSize: 12,
    color: '#000000',
    fontWeight: '500',
    marginTop: 4,
  },
  tabText: {
    fontSize: 12,
    color: '#9E9E9E',
    marginTop: 4,
  },
});
