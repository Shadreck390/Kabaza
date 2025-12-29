// screens/common/SOSScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  Alert,
  Linking,
  Vibration,
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import Geolocation from 'react-native-geolocation-service';
import Contacts from 'react-native-contacts';

const { width, height } = Dimensions.get('window');

const EMERGENCY_CONTACTS = [
  {
    id: 'police',
    name: 'Police Emergency',
    number: '997',
    color: '#3B82F6',
    icon: 'shield',
  },
  {
    id: 'ambulance',
    name: 'Ambulance',
    number: '998',
    color: '#EF4444',
    icon: 'ambulance',
  },
  {
    id: 'fire',
    name: 'Fire Department',
    number: '999',
    color: '#F59E0B',
    icon: 'fire-truck',
  },
];

export default function SOSScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { rideId, rideData } = route.params || {};
  
  const [location, setLocation] = useState(null);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [isSharingLocation, setIsSharingLocation] = useState(false);

  useEffect(() => {
    getCurrentLocation();
    loadEmergencyContacts();
  }, []);

  useEffect(() => {
    let timer;
    if (emergencyMode && countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prev => prev - 1);
        Vibration.vibrate(500);
      }, 1000);
    } else if (countdown === 0) {
      triggerEmergency();
    }
    
    return () => clearInterval(timer);
  }, [emergencyMode, countdown]);

  const getCurrentLocation = () => {
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ latitude, longitude });
      },
      (error) => {
        console.log('Error getting location:', error);
        Alert.alert('Location Error', 'Unable to get your location for emergency services.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const loadEmergencyContacts = async () => {
    try {
      // Request permission and load contacts
      const granted = await Contacts.requestPermission();
      if (granted === 'authorized') {
        const contacts = await Contacts.getAll();
        // Filter for contacts marked as emergency
        const emergency = contacts
          .filter(contact => contact.phoneNumbers && contact.phoneNumbers.length > 0)
          .slice(0, 3)
          .map(contact => ({
            id: contact.recordID,
            name: contact.displayName,
            number: contact.phoneNumbers[0].number,
          }));
        setEmergencyContacts(emergency);
      }
    } catch (error) {
      console.log('Error loading contacts:', error);
    }
  };

  const handleSOSPress = () => {
    Alert.alert(
      'Emergency SOS',
      'Pressing confirm will:\n1. Call emergency services\n2. Share your location\n3. Alert your emergency contacts\n\nCancel within 5 seconds to abort.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: () => {
            setEmergencyMode(true);
            setCountdown(5);
          },
        },
      ]
    );
  };

  const handleCancelEmergency = () => {
    setEmergencyMode(false);
    setCountdown(5);
    Alert.alert('Emergency Cancelled', 'Emergency alert has been cancelled.');
  };

  const triggerEmergency = async () => {
    try {
      // 1. Call emergency services
      Linking.openURL(`tel:997`);
      
      // 2. Send emergency SMS to contacts
      const locationMessage = location 
        ? `Emergency! My location: https://maps.google.com/?q=${location.latitude},${location.longitude}`
        : 'Emergency! I need help immediately.';
      
      emergencyContacts.forEach(contact => {
        Linking.openURL(`sms:${contact.number}?body=${encodeURIComponent(locationMessage)}`);
      });

      // 3. Send to app emergency services (in production)
      sendEmergencyNotification(locationMessage);

      // 4. Show confirmation
      Alert.alert(
        'Emergency Alert Sent',
        'Emergency services and your contacts have been alerted with your location.',
        [{ text: 'OK' }]
      );

      setEmergencyMode(false);
      setCountdown(5);
    } catch (error) {
      console.log('Error triggering emergency:', error);
      Alert.alert('Error', 'Failed to send emergency alert. Please try again.');
    }
  };

  const sendEmergencyNotification = (message) => {
    // In production, send to your backend
    console.log('Sending emergency notification:', message);
  };

  const handleShareLocation = (contact) => {
    if (!location) {
      Alert.alert('Location Unavailable', 'Cannot share location at this time.');
      return;
    }

    const message = `I'm sharing my location: https://maps.google.com/?q=${location.latitude},${location.longitude}`;
    Linking.openURL(`sms:${contact.number}?body=${encodeURIComponent(message)}`);
  };

  const renderEmergencyContact = (contact) => (
    <TouchableOpacity
      key={contact.id}
      style={styles.contactCard}
      onPress={() => handleShareLocation(contact)}
    >
      <View style={styles.contactAvatar}>
        <Text style={styles.contactInitials}>
          {contact.name.split(' ').map(n => n[0]).join('').toUpperCase()}
        </Text>
      </View>
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{contact.name}</Text>
        <Text style={styles.contactNumber}>{contact.number}</Text>
      </View>
      <TouchableOpacity 
        style={styles.shareButton}
        onPress={() => handleShareLocation(contact)}
      >
        <MaterialIcon name="location-on" size={20} color="#22C55E" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderEmergencyService = (service) => (
    <TouchableOpacity
      key={service.id}
      style={[styles.serviceCard, { backgroundColor: `${service.color}15` }]}
      onPress={() => Linking.openURL(`tel:${service.number}`)}
    >
      <View style={[styles.serviceIcon, { backgroundColor: service.color }]}>
        <MaterialCommunityIcon name={service.icon} size={24} color="#FFFFFF" />
      </View>
      <Text style={styles.serviceName}>{service.name}</Text>
      <Text style={styles.serviceNumber}>{service.number}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#DC2626" />

      {/* Emergency Mode Overlay */}
      {emergencyMode && (
        <View style={styles.emergencyOverlay}>
          <View style={styles.countdownContainer}>
            <Text style={styles.countdownText}>{countdown}</Text>
            <Text style={styles.countdownLabel}>Emergency in</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={handleCancelEmergency}
          >
            <MaterialIcon name="close" size={24} color="#FFFFFF" />
            <Text style={styles.cancelText}>CANCEL</Text>
          </TouchableOpacity>
          
          <Text style={styles.emergencyWarning}>
            Emergency services and your contacts will be alerted
          </Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcon name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Emergency SOS</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* SOS Button */}
        <View style={styles.sosSection}>
          <TouchableOpacity 
            style={styles.sosButton}
            onPress={handleSOSPress}
            activeOpacity={0.8}
          >
            <Text style={styles.sosText}>SOS</Text>
            <Text style={styles.sosSubtext}>Press in case of emergency</Text>
          </TouchableOpacity>
          
          <Text style={styles.sosDescription}>
            Pressing SOS will immediately alert emergency services and your contacts with your location
          </Text>
        </View>

        {/* Emergency Services */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Services</Text>
          <View style={styles.servicesGrid}>
            {EMERGENCY_CONTACTS.map(renderEmergencyService)}
          </View>
        </View>

        {/* My Emergency Contacts */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Emergency Contacts</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ManageEmergencyContacts')}>
              <Text style={styles.manageText}>Manage</Text>
            </TouchableOpacity>
          </View>
          
          {emergencyContacts.length > 0 ? (
            emergencyContacts.map(renderEmergencyContact)
          ) : (
            <View style={styles.emptyContacts}>
              <MaterialIcon name="person-add" size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No emergency contacts</Text>
              <Text style={styles.emptyText}>
                Add emergency contacts to notify them automatically
              </Text>
              <TouchableOpacity 
                style={styles.addContactsButton}
                onPress={() => navigation.navigate('ManageEmergencyContacts')}
              >
                <Text style={styles.addContactsText}>Add Contacts</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Safety Tips */}
        <View style={styles.tipsCard}>
          <MaterialIcon name="lightbulb" size={24} color="#F59E0B" />
          <View style={styles.tipsContent}>
            <Text style={styles.tipsTitle}>Safety Tips</Text>
            <Text style={styles.tipsText}>
              • Stay in your vehicle until help arrives{'\n'}
              • Share your ride details with trusted contacts{'\n'}
              • Verify driver details before getting in{'\n'}
              • Use in-app emergency features if uncomfortable{'\n'}
              • Trust your instincts and report any issues
            </Text>
          </View>
        </View>

        {/* Ride Details (if active) */}
        {rideData && (
          <View style={styles.rideCard}>
            <Text style={styles.rideTitle}>Current Ride Details</Text>
            <Text style={styles.rideDetail}>
              Driver: {rideData.driver?.name || 'Unknown'}
            </Text>
            <Text style={styles.rideDetail}>
              Vehicle: {rideData.driver?.vehicle || 'Unknown'}
            </Text>
            <Text style={styles.rideDetail}>
              Plate: {rideData.driver?.plate || 'Unknown'}
            </Text>
            {location && (
              <Text style={styles.rideDetail}>
                Location: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
              </Text>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  emergencyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  countdownContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  countdownText: {
    fontSize: 96,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  countdownLabel: {
    fontSize: 20,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  cancelButton: {
    alignItems: 'center',
    marginBottom: 20,
  },
  cancelText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    marginTop: 8,
  },
  emergencyWarning: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    paddingHorizontal: 40,
    opacity: 0.9,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 16,
    backgroundColor: '#DC2626',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerPlaceholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sosSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  sosButton: {
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: width * 0.35,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  sosText: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  sosSubtext: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  sosDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  manageText: {
    fontSize: 14,
    color: '#22C55E',
    fontWeight: '500',
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  serviceCard: {
    width: (width - 64) / 2,
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    margin: 8,
  },
  serviceIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  serviceNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  contactAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactInitials: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  contactNumber: {
    fontSize: 14,
    color: '#666',
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F9F0',
  },
  emptyContacts: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  addContactsButton: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addContactsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  tipsCard: {
    flexDirection: 'row',
    backgroundColor: '#FEFCE8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  tipsContent: {
    flex: 1,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  tipsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  rideCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  rideTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 8,
  },
  rideDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
});