// screens/driver/VerificationPendingScreen.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { getUserData, saveUserData } from '../../src/utils/userStorage';

export default function VerificationPendingScreen({ navigation, route }) {
  const [loading, setLoading] = useState(false);

  const handleCheckStatus = async () => {
    setLoading(true);
    
    // Simulate checking verification status
    setTimeout(async () => {
      try {
        // For testing, mark as verified
        const userData = await getUserData();
        const updatedData = {
          ...userData,
          driverProfile: {
            ...userData.driverProfile,
            isVerified: true,
            verificationStatus: 'approved',
            verifiedAt: new Date().toISOString()
          }
        };
        
        await saveUserData(updatedData);
        
        // Navigate to driver dashboard
        navigation.reset({
          index: 0,
          routes: [{ name: 'DriverStack' }]
        });
      } catch (error) {
        console.error('Error updating verification:', error);
      } finally {
        setLoading(false);
      }
    }, 2000);
  };

  return (
    <View style={styles.container}>
      <Icon name="clock-o" size={80} color="#FFA500" />
      <Text style={styles.title}>Verification Pending</Text>
      <Text style={styles.message}>
        Your driver verification is under review. This usually takes 24-48 hours.
        You'll receive a notification once approved.
      </Text>
      
      {loading ? (
        <ActivityIndicator size="large" color="#00B894" style={styles.spinner} />
      ) : (
        <>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={handleCheckStatus}
          >
            <Text style={styles.primaryButtonText}>Check Status (Testing)</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('DriverVerification')}
          >
            <Text style={styles.secondaryButtonText}>Edit Verification Details</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
    color: '#333',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 30,
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  spinner: {
    marginTop: 20,
  },
  primaryButton: {
    backgroundColor: '#00B894',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    marginBottom: 15,
    width: '100%',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    padding: 15,
    marginBottom: 15,
    width: '100%',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#00B894',
    fontSize: 14,
    fontWeight: '500',
  },
  backButton: {
    padding: 10,
  },
  backButtonText: {
    color: '#666',
    fontSize: 14,
  },
});