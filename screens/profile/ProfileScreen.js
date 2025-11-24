// screens/profile/ProfileScreen.js
import React, { useState, useEffect } from 'react';
import { 
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch, Alert, Image 
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { CommonActions } from '@react-navigation/native';

export default function ProfileScreen({ navigation, route }) {
  // Get user data from auth flow
  const { phone, authMethod, socialUserInfo, userProfile } = route.params || {};
  
  const [userRole, setUserRole] = useState(route.params?.userRole || 'rider');
  const [notifications, setNotifications] = useState(true);
  const [locationTracking, setLocationTracking] = useState(true);
  
  // Update role when route params change
  useEffect(() => {
    if (route.params?.userRole) {
      setUserRole(route.params.userRole);
    }
  }, [route.params?.userRole]);

  // Get user data from auth flow
  const getUserData = () => {
    return {
      name: userProfile?.fullName || socialUserInfo?.name || 'User',
      phone: phone || 'Not provided',
      email: socialUserInfo?.email || 'Not provided',
      profilePicture: userProfile?.profilePicture || socialUserInfo?.picture,
      joinedDate: 'January 2024', // You can calculate this from registration date
      totalRides: userRole === 'rider' ? 47 : 125,
      totalEarnings: userRole === 'driver' ? 12500 : 0,
      rating: userRole === 'rider' ? 4.8 : 4.9,
      role: userRole,
      authMethod: authMethod || 'phone'
    };
  };

  const userData = getUserData();

  const handleRoleSwitch = () => {
    const newRole = userRole === 'rider' ? 'driver' : 'rider';
    Alert.alert(
      'Switch Role',
      `Are you sure you want to switch to ${newRole} mode?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Switch', 
          onPress: () => {
            setUserRole(newRole);
            
            // Navigate to the appropriate home screen based on new role
            const routeName = newRole === 'rider' ? 'RiderStack' : 'DriverStack';
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ 
                  name: routeName,
                  params: {
                    phone,
                    authMethod,
                    socialUserInfo,
                    userProfile,
                    userRole: newRole
                  }
                }],
              })
            );
          }
        }
      ]
    );
  };

  const handleEditProfile = () => {
    navigation.navigate('EditProfile', { 
      userRole,
      phone,
      authMethod,
      socialUserInfo,
      userProfile
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
            // Handle logout logic here
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: 'PhoneOrGoogle' }],
              })
            );
          }
        }
      ]
    );
  };

  // Role-specific menu items
  const renderRoleSpecificItems = () => {
    if (userRole === 'driver') {
      return (
        <>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('Earnings', route.params)}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#e8f5e8' }]}>
                <Icon name="money" size={18} color="#4CAF50" />
              </View>
              <Text style={styles.menuText}>Earnings & Analytics</Text>
            </View>
            <Icon name="chevron-right" size={16} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#e8f5e8' }]}>
                <Icon name="car" size={18} color="#4CAF50" />
              </View>
              <Text style={styles.menuText}>Vehicle Information</Text>
            </View>
            <Icon name="chevron-right" size={16} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#e8f5e8' }]}>
                <Icon name="clock-o" size={18} color="#4CAF50" />
              </View>
              <Text style={styles.menuText}>Driving Schedule</Text>
            </View>
            <Icon name="chevron-right" size={16} color="#999" />
          </TouchableOpacity>
        </>
      );
    } else {
      return (
        <>
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#e8f5e8' }]}>
                <Icon name="heart" size={18} color="#4CAF50" />
              </View>
              <Text style={styles.menuText}>Favorite Drivers</Text>
            </View>
            <Icon name="chevron-right" size={16} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#e8f5e8' }]}>
                <Icon name="map-marker" size={18} color="#4CAF50" />
              </View>
              <Text style={styles.menuText}>Saved Locations</Text>
            </View>
            <Icon name="chevron-right" size={16} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#e8f5e8' }]}>
                <Icon name="credit-card" size={18} color="#4CAF50" />
              </View>
              <Text style={styles.menuText}>Payment Methods</Text>
            </View>
            <Icon name="chevron-right" size={16} color="#999" />
          </TouchableOpacity>
        </>
      );
    }
  };

  const getAuthMethodIcon = () => {
    switch (userData.authMethod) {
      case 'google':
        return { icon: 'google', color: '#DB4437', name: 'Google' };
      case 'facebook':
        return { icon: 'facebook', color: '#4267B2', name: 'Facebook' };
      default:
        return { icon: 'phone', color: '#4CAF50', name: 'Phone' };
    }
  };

  const authMethodInfo = getAuthMethodIcon();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>
            {userRole === 'rider' ? 'Rider' : 'Driver'}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarSection}>
            {userData.profilePicture ? (
              <Image 
                source={{ uri: userData.profilePicture.uri || userData.profilePicture }} 
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Icon name="user" size={30} color="#6c3" />
              </View>
            )}
            <TouchableOpacity style={styles.editAvatarButton} onPress={handleEditProfile}>
              <Icon name="camera" size={12} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{userData.name}</Text>
            <View style={styles.authMethodBadge}>
              <Icon name={authMethodInfo.icon} size={12} color={authMethodInfo.color} />
              <Text style={styles.authMethodText}>Signed in with {authMethodInfo.name}</Text>
            </View>
            <View style={styles.contactInfo}>
              <Icon name="phone" size={12} color="#666" />
              <Text style={styles.contactText}>{userData.phone}</Text>
            </View>
            {userData.email !== 'Not provided' && (
              <View style={styles.contactInfo}>
                <Icon name="envelope" size={12} color="#666" />
                <Text style={styles.contactText}>{userData.email}</Text>
              </View>
            )}
            <Text style={styles.joinDate}>Member since {userData.joinedDate}</Text>
          </View>
          
          <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
            <Icon name="edit" size={14} color="#6c3" />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Card - Dynamic based on role */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{userData.totalRides}</Text>
            <Text style={styles.statLabel}>
              {userRole === 'rider' ? 'Total Rides' : 'Completed Rides'}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={styles.ratingContainer}>
              <Icon name="star" size={14} color="#FFD700" />
              <Text style={styles.statNumber}>{userData.rating}</Text>
            </View>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {userRole === 'driver' ? `MWK ${userData.totalEarnings.toLocaleString()}` : userRole === 'rider' ? 'Rider' : 'Driver'}
            </Text>
            <Text style={styles.statLabel}>
              {userRole === 'driver' ? 'Total Earnings' : 'Current Role'}
            </Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <TouchableOpacity style={styles.menuItem} onPress={handleRoleSwitch}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#fff0e8' }]}>
                <Icon name="exchange" size={18} color="#FF6B00" />
              </View>
              <View>
                <Text style={styles.menuText}>
                  Switch to {userRole === 'rider' ? 'Driver' : 'Rider'}
                </Text>
                <Text style={styles.menuSubtext}>
                  {userRole === 'rider' ? 'Start earning as a driver' : 'Book rides as a passenger'}
                </Text>
              </View>
            </View>
            <Icon name="chevron-right" size={16} color="#999" />
          </TouchableOpacity>

          {/* Role-specific menu items */}
          {renderRoleSpecificItems()}

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#e8f5e8' }]}>
                <Icon name="shield" size={18} color="#4CAF50" />
              </View>
              <Text style={styles.menuText}>Safety Center</Text>
            </View>
            <Icon name="chevron-right" size={16} color="#999" />
          </TouchableOpacity>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          
          <View style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#e8f5e8' }]}>
                <Icon name="bell" size={18} color="#4CAF50" />
              </View>
              <Text style={styles.menuText}>Notifications</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: '#f0f0f0', true: '#c8e6c9' }}
              thumbColor={notifications ? '#6c3' : '#f5f5f5'}
              ios_backgroundColor="#f0f0f0"
            />
          </View>

          <View style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#e8f5e8' }]}>
                <Icon name="map-marker" size={18} color="#4CAF50" />
              </View>
              <Text style={styles.menuText}>Location Tracking</Text>
            </View>
            <Switch
              value={locationTracking}
              onValueChange={setLocationTracking}
              trackColor={{ false: '#f0f0f0', true: '#c8e6c9' }}
              thumbColor={locationTracking ? '#6c3' : '#f5f5f5'}
              ios_backgroundColor="#f0f0f0"
            />
          </View>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#e8f5e8' }]}>
                <Icon name="language" size={18} color="#4CAF50" />
              </View>
              <Text style={styles.menuText}>Language</Text>
            </View>
            <View style={styles.valueContainer}>
              <Text style={styles.valueText}>English</Text>
              <Icon name="chevron-right" size={16} color="#999" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#e8f5e8' }]}>
                <Icon name="money" size={18} color="#4CAF50" />
              </View>
              <Text style={styles.menuText}>Currency</Text>
            </View>
            <View style={styles.valueContainer}>
              <Text style={styles.valueText}>MWK - Malawian Kwacha</Text>
              <Icon name="chevron-right" size={16} color="#999" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Support & Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support & Information</Text>
          
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#e8f5e8' }]}>
                <Icon name="question-circle" size={18} color="#4CAF50" />
              </View>
              <Text style={styles.menuText}>Help & Support</Text>
            </View>
            <Icon name="chevron-right" size={16} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#e8f5e8' }]}>
                <Icon name="file-text" size={18} color="#4CAF50" />
              </View>
              <Text style={styles.menuText}>Terms of Service</Text>
            </View>
            <Icon name="chevron-right" size={16} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#e8f5e8' }]}>
                <Icon name="lock" size={18} color="#4CAF50" />
              </View>
              <Text style={styles.menuText}>Privacy Policy</Text>
            </View>
            <Icon name="chevron-right" size={16} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#e8f5e8' }]}>
                <Icon name="info-circle" size={18} color="#4CAF50" />
              </View>
              <Text style={styles.menuText}>About Kabaza</Text>
            </View>
            <Icon name="chevron-right" size={16} color="#999" />
          </TouchableOpacity>
        </View>

        {/* Account Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#fff0f0' }]}>
                <Icon name="trash" size={18} color="#ff6b6b" />
              </View>
              <Text style={[styles.menuText, { color: '#666' }]}>Delete Account</Text>
            </View>
            <Icon name="chevron-right" size={16} color="#999" />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Icon name="sign-out" size={18} color="#ff6b6b" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={styles.footerSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#6c3',
    padding: 20,
    paddingTop: 60,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  roleBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  profileCard: {
    backgroundColor: '#fff',
    padding: 20,
    margin: 20,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarSection: {
    position: 'relative',
    marginRight: 15,
  },
  avatarImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  avatarPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#f0f7f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#6c3',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  userInfo: {
    flex: 1,
    marginRight: 10,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  authMethodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  authMethodText: {
    fontSize: 10,
    color: '#666',
    fontWeight: '500',
    marginLeft: 4,
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  contactText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
  },
  joinDate: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#6c3',
    borderRadius: 8,
    backgroundColor: '#f9fff9',
  },
  editButtonText: {
    fontSize: 12,
    color: '#6c3',
    fontWeight: '600',
    marginLeft: 4,
  },
  statsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    flexDirection: 'row',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6c3',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#f0f0f0',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  menuSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  valueText: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#ff6b6b',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ff6b6b',
    marginLeft: 8,
  },
  footerSpacer: {
    height: 20,
  },
});