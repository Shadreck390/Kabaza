import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { saveUserData, saveUserRole } from '../../src/utils/userStorage';
import { useDispatch } from 'react-redux'; // ✅ ADD THIS
import { loginSuccess } from '../../src/store/slices/authSlice'; // ✅ ADD THIS

export default function RoleSelectionScreen({ navigation, route }) {
  // Get all user data
  const { phone, authMethod, socialUserInfo, userProfile } = route.params || {};
  const [selectedRole, setSelectedRole] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const dispatch = useDispatch(); // ✅ ADD THIS

  const handleRoleSelection = async (role) => {
    setLoading(true);
    setSelectedRole(role);
    setError(null);

    try {
      // Validation checks
      if (!phone && !socialUserInfo) {
        throw new Error('User information missing. Please restart registration.');
      }
      
      if (!userProfile?.firstName || !userProfile?.surname) {
        throw new Error('Profile information incomplete.');
      }

      // Save user data to AsyncStorage
      const userData = {
        phone,
        authMethod,
        socialUserInfo,
        userProfile,
        userRole: role,
        isLoggedIn: true,
        registrationComplete: true
      };

      // Save to persistent storage
      await saveUserData(userData);
      await saveUserRole(role);

      console.log('✅ User data and role saved successfully');
      
      // ✅ UPDATE REDUX STORE - This will trigger AppNavigator to re-render
      dispatch(loginSuccess({
        user: userData,
        token: null, // Add token if you have one
        role: role
      }));

      // AppNavigator will automatically navigate to the correct stack

    } catch (err) {
      console.error('❌ Role selection error:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  // ... rest of your component stays the same

  const handleRetry = () => {
    setError(null);
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
        
        {userProfile?.fullName && (
          <View style={styles.contextItem}>
            <View style={[styles.checkbox, styles.checked]}>
              <Icon name="check" size={12} color="#fff" />
            </View>
            <Text style={styles.contextText}>Profile: {userProfile.fullName}</Text>
          </View>
        )}
      </View>

      {/* Error Message Display */}
      {error && (
        <View style={styles.errorContainer}>
          <Icon name="exclamation-triangle" size={16} color="#fff" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={handleRetry}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Divider */}
      <View style={styles.divider} />

      {/* Role Selection Buttons */}
      <View style={styles.buttonsContainer}>
        <TouchableOpacity 
          style={[
            styles.roleButton, 
            selectedRole === 'rider' && styles.roleButtonSelected,
            (loading || error) && styles.roleButtonDisabled
          ]} 
          onPress={() => handleRoleSelection('rider')}
          activeOpacity={0.8}
          disabled={loading || error}
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
            (loading || error) && styles.roleButtonDisabled
          ]} 
          onPress={() => handleRoleSelection('driver')}
          activeOpacity={0.8}
          disabled={loading || error}
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
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff6b6b',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  errorText: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    marginLeft: 8,
    marginRight: 12,
  },
  retryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
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