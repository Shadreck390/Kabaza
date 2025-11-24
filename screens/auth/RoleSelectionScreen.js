import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';

export default function RoleSelectionScreen({ navigation, route }) {
  // Get all user data
  const { phone, authMethod, socialUserInfo, userProfile } = route.params || {};
  const [selectedRole, setSelectedRole] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleRole = async (role) => {
    setLoading(true);
    setSelectedRole(role);
    
    // Simulate API call or processing
    setTimeout(() => {
      const routeName = role === 'rider' ? 'RiderStack' : 'DriverStack';
      
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ 
            name: routeName,
            params: {
              phone,
              authMethod,
              socialUserInfo,
              userProfile
            }
          }],
        })
      );
      setLoading(false);
    }, 500);
  };

  // Update welcome message to use profile name if available
  const getWelcomeMessage = () => {
    if (userProfile?.fullName) {
      return `Welcome, ${userProfile.fullName}!`;
    }
    if (socialUserInfo?.name) {
      return `Welcome, ${socialUserInfo.name}!`;
    }
    if (phone) {
      return `Welcome! (${phone})`;
    }
    return "Welcome!";
  };

  return (
    <View style={styles.container}>
      {/* Kabaza Logo */}
      <Text style={styles.logo}>Kabaza</Text>
      
      {/* Welcome Text */}
      <Text style={styles.title}>Choose Your Role</Text>

      {/* Registration Context */}
      <View style={styles.contextContainer}>
        {authMethod === 'phone' && phone && (
          <View style={styles.contextItem}>
            <View style={styles.checkbox}>
              <Icon name="check" size={12} color="#fff" />
            </View>
            <Text style={styles.contextText}>Registered with phone: {phone}</Text>
          </View>
        )}
        
        {authMethod === 'google' && (
          <View style={styles.contextItem}>
            <View style={[styles.checkbox, styles.checked]}>
              <Icon name="check" size={12} color="#fff" />
            </View>
            <Text style={styles.contextText}>
              Signed in with Google {socialUserInfo?.name && `as ${socialUserInfo.name}`}
            </Text>
          </View>
        )}
        
        {authMethod === 'facebook' && (
          <View style={styles.contextItem}>
            <View style={[styles.checkbox, styles.checked]}>
              <Icon name="check" size={12} color="#fff" />
            </View>
            <Text style={styles.contextText}>
              Signed in with Facebook {socialUserInfo?.name && `as ${socialUserInfo.name}`}
            </Text>
          </View>
        )}
        
        {userProfile?.fullName && (
          <View style={styles.contextItem}>
            <View style={[styles.checkbox, styles.checked]}>
              <Icon name="check" size={12} color="#fff" />
            </View>
            <Text style={styles.contextText}>Profile: {userProfile.fullName}</Text>
          </View>
        )}
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Role Selection Buttons */}
      <View style={styles.buttonsContainer}>
        <TouchableOpacity 
          style={[
            styles.roleButton, 
            selectedRole === 'rider' && styles.roleButtonSelected,
            loading && styles.roleButtonDisabled
          ]} 
          onPress={() => handleRole('rider')}
          activeOpacity={0.8}
          disabled={loading}
        >
          {loading && selectedRole === 'rider' ? (
            <ActivityIndicator size="small" color="#4CAF50" />
          ) : (
            <>
              <View style={styles.roleIconContainer}>
                <Icon name="user" size={24} color="#4CAF50" />
              </View>
              <Text style={styles.roleButtonText}>Continue as Passenger</Text>
              <Text style={styles.roleDescription}>Book rides and get around town</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.roleButton, 
            selectedRole === 'driver' && styles.roleButtonSelected,
            loading && styles.roleButtonDisabled
          ]} 
          onPress={() => handleRole('driver')}
          activeOpacity={0.8}
          disabled={loading}
        >
          {loading && selectedRole === 'driver' ? (
            <ActivityIndicator size="small" color="#4CAF50" />
          ) : (
            <>
              <View style={styles.roleIconContainer}>
                <Icon name="car" size={24} color="#4CAF50" />
              </View>
              <Text style={styles.roleButtonText}>Continue as Driver</Text>
              <Text style={styles.roleDescription}>Earn money by giving rides</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Loading Message */}
      {loading && (
        <Text style={styles.loadingText}>
          Setting up your {selectedRole === 'rider' ? 'passenger' : 'driver'} account...
        </Text>
      )}

      {/* Footer Text */}
      <Text style={styles.footerText}>
        You can always switch roles later in settings
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 25,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  logo: {
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  title: {
    fontSize: 20,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
  },
  contextContainer: {
    marginBottom: 30,
  },
  contextItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checked: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  contextText: {
    fontSize: 14,
    color: '#666',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 20,
  },
  buttonsContainer: {
    marginBottom: 30,
  },
  roleButton: {
    width: '100%',
    paddingVertical: 20,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  roleButtonSelected: {
    borderColor: '#4CAF50',
    backgroundColor: 'rgba(76, 175, 80, 0.05)',
  },
  roleButtonDisabled: {
    opacity: 0.6,
  },
  roleIconContainer: {
    marginBottom: 8,
  },
  roleButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#4CAF50',
    marginBottom: 15,
    fontStyle: 'italic',
  },
  footerText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#888',
  },
});