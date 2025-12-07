// screens/driver/DriverProfileScreen.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, Switch } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { launchImageLibrary } from 'react-native-image-picker';
import { useDispatch } from 'react-redux';
import { logout } from '../../src/store/slices/authSlice';

export default function DriverProfileScreen({ navigation }) {
  const [profileData, setProfileData] = useState({
    name: 'John Driver',
    phone: '+265 888 123 456',
    email: 'john.driver@email.com',
    driverId: 'DRV-2023-00123',
    rating: 4.8,
    totalTrips: 127,
    totalEarnings: 'MWK 245,300',
    vehicle: {
      make: 'TVS',
      model: 'Apache RTR 160',
      year: '2022',
      plate: 'LL 1234',
      color: 'Red'
    },
    online: true,
    notifications: true,
    locationSharing: true
  });

  const [profileImage, setProfileImage] = useState(null);
  const dispatch = useDispatch();

  const handleSelectImage = () => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 500,
      maxHeight: 500,
      includeBase64: false,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.error) {
        Alert.alert('Error', 'Failed to select image');
      } else if (response.assets && response.assets[0]) {
        setProfileImage(response.assets[0]);
      }
    });
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: () => {
            dispatch(logout());
            navigation.replace('PhoneOrGoogle');
          }
        }
      ]
    );
  };

  const menuItems = [
    {
      title: 'Vehicle Information',
      icon: 'car',
      onPress: () => navigation.navigate('VehicleInfo', { vehicle: profileData.vehicle }),
      showArrow: true
    },
    {
      title: 'Documents',
      icon: 'file-text',
      onPress: () => navigation.navigate('Documents'),
      showArrow: true
    },
    {
      title: 'Bank Details',
      icon: 'bank',
      onPress: () => navigation.navigate('BankDetails'),
      showArrow: true
    },
    {
      title: 'Help & Support',
      icon: 'question-circle',
      onPress: () => navigation.navigate('HelpSupport'),
      showArrow: true
    },
    {
      title: 'About Kabaza',
      icon: 'info-circle',
      onPress: () => navigation.navigate('About'),
      showArrow: true
    },
    {
      title: 'Privacy Policy',
      icon: 'shield',
      onPress: () => navigation.navigate('PrivacyPolicy'),
      showArrow: true
    },
    {
      title: 'Logout',
      icon: 'sign-out',
      onPress: handleLogout,
      showArrow: false,
      color: '#FF6B6B'
    },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <TouchableOpacity 
          style={styles.profileImageContainer}
          onPress={handleSelectImage}
        >
          {profileImage ? (
            <Image 
              source={{ uri: profileImage.uri }} 
              style={styles.profileImage}
            />
          ) : (
            <View style={styles.profileImagePlaceholder}>
              <Icon name="user" size={40} color="#fff" />
            </View>
          )}
          <View style={styles.cameraIcon}>
            <Icon name="camera" size={14} color="#fff" />
          </View>
        </TouchableOpacity>
        
        <Text style={styles.profileName}>{profileData.name}</Text>
        <Text style={styles.profilePhone}>{profileData.phone}</Text>
        
        <View style={styles.ratingContainer}>
          <Icon name="star" size={16} color="#FFD700" />
          <Text style={styles.ratingText}>{profileData.rating}</Text>
          <Text style={styles.driverId}> • {profileData.driverId}</Text>
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{profileData.totalTrips}</Text>
          <Text style={styles.statLabel}>Total Trips</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{profileData.totalEarnings}</Text>
          <Text style={styles.statLabel}>Earnings</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>94%</Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
      </View>

      {/* Online Status */}
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <Icon name="power-off" size={20} color={profileData.online ? "#00B894" : "#666"} />
          <Text style={styles.statusTitle}>Go Online</Text>
          <Switch
            value={profileData.online}
            onValueChange={(value) => setProfileData({...profileData, online: value})}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={profileData.online ? '#00B894' : '#f4f3f4'}
          />
        </View>
        <Text style={styles.statusText}>
          {profileData.online 
            ? 'You are currently online and receiving ride requests' 
            : 'You are offline and will not receive ride requests'}
        </Text>
      </View>

      {/* Settings */}
      <View style={styles.settingsCard}>
        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Icon name="bell" size={20} color="#666" style={styles.settingIcon} />
            <Text style={styles.settingText}>Notifications</Text>
          </View>
          <Switch
            value={profileData.notifications}
            onValueChange={(value) => setProfileData({...profileData, notifications: value})}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={profileData.notifications ? '#00B894' : '#f4f3f4'}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Icon name="map-marker" size={20} color="#666" style={styles.settingIcon} />
            <Text style={styles.settingText}>Location Sharing</Text>
          </View>
          <Switch
            value={profileData.locationSharing}
            onValueChange={(value) => setProfileData({...profileData, locationSharing: value})}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={profileData.locationSharing ? '#00B894' : '#f4f3f4'}
          />
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={item.onPress}
          >
            <View style={styles.menuLeft}>
              <Icon 
                name={item.icon} 
                size={20} 
                color={item.color || '#666'} 
                style={styles.menuIcon} 
              />
              <Text style={[styles.menuText, item.color && { color: item.color }]}>
                {item.title}
              </Text>
            </View>
            {item.showArrow && <Icon name="chevron-right" size={16} color="#ccc" />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Version Info */}
      <Text style={styles.versionText}>Kabaza Driver v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  profileHeader: { 
    alignItems: 'center', 
    paddingVertical: 30, 
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  profileImageContainer: { position: 'relative', marginBottom: 15 },
  profileImage: { width: 100, height: 100, borderRadius: 50 },
  profileImagePlaceholder: { 
    width: 100, 
    height: 100, 
    borderRadius: 50, 
    backgroundColor: '#00B894',
    justifyContent: 'center', 
    alignItems: 'center',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#00B894',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  profileName: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  profilePhone: { fontSize: 16, color: '#666', marginBottom: 10 },
  ratingContainer: { flexDirection: 'row', alignItems: 'center' },
  ratingText: { fontSize: 16, fontWeight: '600', color: '#333', marginLeft: 5 },
  driverId: { fontSize: 14, color: '#999' },
  statsContainer: { 
    flexDirection: 'row', 
    paddingHorizontal: 15, 
    paddingVertical: 20,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  statCard: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 20, fontWeight: 'bold', color: '#00B894', marginBottom: 5 },
  statLabel: { fontSize: 12, color: '#666' },
  statusCard: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 10,
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statusHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statusTitle: { fontSize: 16, fontWeight: '600', color: '#333', flex: 1, marginLeft: 10 },
  statusText: { fontSize: 13, color: '#666', lineHeight: 18 },
  settingsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  settingItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  settingLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  settingIcon: { marginRight: 15 },
  settingText: { fontSize: 16, color: '#333' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 5 },
  menuContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  menuItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  menuIcon: { marginRight: 15, width: 24 },
  menuText: { fontSize: 16, color: '#333' },
  versionText: { 
    textAlign: 'center', 
    fontSize: 12, 
    color: '#999', 
    marginBottom: 30,
    marginTop: 10,
  },
});