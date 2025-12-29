// screens/common/HelpSupportScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  TextInput,
  Linking,
  Alert,
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

const HELP_CATEGORIES = [
  {
    id: 'account',
    title: 'Account & Profile',
    icon: 'person',
    color: '#3B82F6',
    topics: [
      'How to update profile',
      'Forgot password',
      'Account security',
      'Delete account',
    ],
  },
  {
    id: 'rides',
    title: 'Rides & Booking',
    icon: 'directions-car',
    color: '#22C55E',
    topics: [
      'How to book a ride',
      'Cancel a ride',
      'Ride pricing',
      'Ride safety',
    ],
  },
  {
    id: 'payments',
    title: 'Payments & Wallet',
    icon: 'wallet',
    color: '#F59E0B',
    topics: [
      'Payment methods',
      'Wallet top-up',
      'Refund policy',
      'Transaction issues',
    ],
  },
  {
    id: 'driver',
    title: 'Driver Partner',
    icon: 'steering',
    color: '#8B5CF6',
    topics: [
      'Become a driver',
      'Earnings',
      'Documents',
      'Driver support',
    ],
  },
];

const FAQ_ITEMS = [
  {
    question: 'How do I book a ride?',
    answer: 'Open the app, enter your destination, select your ride type, and confirm. A nearby driver will accept your request.',
  },
  {
    question: 'What payment methods are accepted?',
    answer: 'We accept cash, mobile money (Airtel Money, TNM Mpamba), and credit/debit cards.',
  },
  {
    question: 'How are fares calculated?',
    answer: 'Fares are based on distance, time, and ride type. You\'ll see the estimated fare before confirming your ride.',
  },
  {
    question: 'What if I need to cancel my ride?',
    answer: 'You can cancel for free within 2 minutes of booking. After that, a cancellation fee may apply.',
  },
  {
    question: 'How do I become a driver?',
    answer: 'Download the Kabaza Driver app, complete registration, upload required documents, and pass verification.',
  },
  {
    question: 'Is my payment information secure?',
    answer: 'Yes, we use bank-level encryption and never store your full payment details on our servers.',
  },
];

const CONTACT_OPTIONS = [
  {
    id: 'chat',
    title: 'Live Chat',
    description: 'Chat with our support team',
    icon: 'chat',
    color: '#22C55E',
    action: () => Alert.alert('Live Chat', 'Available 24/7 for urgent issues'),
  },
  {
    id: 'email',
    title: 'Email Support',
    description: 'support@kabaza.mw',
    icon: 'email',
    color: '#3B82F6',
    action: () => Linking.openURL('mailto:support@kabaza.mw'),
  },
  {
    id: 'phone',
    title: 'Call Support',
    description: '+265 123 456 789',
    icon: 'phone',
    color: '#F59E0B',
    action: () => Linking.openURL('tel:+265123456789'),
  },
  {
    id: 'whatsapp',
    title: 'WhatsApp',
    description: 'Message us on WhatsApp',
    icon: 'whatsapp',
    color: '#25D366',
    action: () => Linking.openURL('https://wa.me/265123456789'),
  },
];

export default function HelpSupportScreen() {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState(null);
  const [contactMessage, setContactMessage] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      // Navigate to search results
      navigation.navigate('HelpSearch', { query: searchQuery });
    }
  };

  const handleFAQPress = (index) => {
    setExpandedFAQ(expandedFAQ === index ? null : index);
  };

  const handleCategoryPress = (category) => {
    navigation.navigate('HelpCategory', { categoryId: category.id });
  };

  const handleSubmitContact = () => {
    if (!contactMessage.trim()) {
      Alert.alert('Error', 'Please enter your message');
      return;
    }

    Alert.alert(
      'Message Sent',
      'We\'ll get back to you within 24 hours. Thank you for contacting us!',
      [{ text: 'OK', onPress: () => setContactMessage('') }]
    );
  };

  const renderHelpCategory = (category) => (
    <TouchableOpacity
      key={category.id}
      style={styles.categoryCard}
      onPress={() => handleCategoryPress(category)}
    >
      <View style={[styles.categoryIcon, { backgroundColor: `${category.color}15` }]}>
        <MaterialIcon name={category.icon} size={28} color={category.color} />
      </View>
      <Text style={styles.categoryTitle}>{category.title}</Text>
      <Text style={styles.categoryTopics}>
        {category.topics.slice(0, 2).join(', ')}...
      </Text>
      <TouchableOpacity style={styles.categoryButton}>
        <Text style={styles.categoryButtonText}>View Help</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderFAQItem = (item, index) => (
    <TouchableOpacity
      key={index}
      style={styles.faqItem}
      onPress={() => handleFAQPress(index)}
    >
      <View style={styles.faqHeader}>
        <Text style={styles.faqQuestion}>{item.question}</Text>
        <MaterialIcon 
          name={expandedFAQ === index ? 'expand-less' : 'expand-more'} 
          size={24} 
          color="#666" 
        />
      </View>
      {expandedFAQ === index && (
        <Text style={styles.faqAnswer}>{item.answer}</Text>
      )}
    </TouchableOpacity>
  );

  const renderContactOption = (option) => (
    <TouchableOpacity
      key={option.id}
      style={styles.contactCard}
      onPress={option.action}
    >
      <View style={[styles.contactIcon, { backgroundColor: `${option.color}15` }]}>
        <MaterialIcon name={option.icon} size={24} color={option.color} />
      </View>
      <View style={styles.contactInfo}>
        <Text style={styles.contactTitle}>{option.title}</Text>
        <Text style={styles.contactDescription}>{option.description}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcon name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <TouchableOpacity 
          style={styles.sosButton}
          onPress={() => navigation.navigate('SOS')}
        >
          <MaterialIcon name="emergency" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <MaterialIcon name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for help..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcon name="close" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Contact</Text>
          <View style={styles.contactGrid}>
            {CONTACT_OPTIONS.map(renderContactOption)}
          </View>
        </View>

        {/* Help Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Browse Help Topics</Text>
          <View style={styles.categoriesGrid}>
            {HELP_CATEGORIES.map(renderHelpCategory)}
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
            <TouchableOpacity onPress={() => navigation.navigate('FAQ')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          {FAQ_ITEMS.slice(0, 3).map(renderFAQItem)}
        </View>

        {/* Contact Form */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Send us a Message</Text>
          <TextInput
            style={styles.messageInput}
            placeholder="Describe your issue or question..."
            value={contactMessage}
            onChangeText={setContactMessage}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={1000}
          />
          <TouchableOpacity 
            style={styles.submitButton}
            onPress={handleSubmitContact}
          >
            <MaterialIcon name="send" size={20} color="#FFFFFF" />
            <Text style={styles.submitButtonText}>Send Message</Text>
          </TouchableOpacity>
        </View>

        {/* Support Info */}
        <View style={styles.infoCard}>
          <MaterialIcon name="schedule" size={24} color="#3B82F6" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Support Hours</Text>
            <Text style={styles.infoText}>
              Monday - Friday: 8:00 AM - 8:00 PM{'\n'}
              Saturday: 9:00 AM - 6:00 PM{'\n'}
              Sunday: 10:00 AM - 4:00 PM{'\n'}
              Emergency Support: 24/7
            </Text>
          </View>
        </View>

        {/* Emergency Info */}
        <View style={styles.emergencyCard}>
          <MaterialIcon name="warning" size={24} color="#EF4444" />
          <View style={styles.emergencyContent}>
            <Text style={styles.emergencyTitle}>Emergency Assistance</Text>
            <Text style={styles.emergencyText}>
              For immediate assistance during a ride, use the SOS button or call emergency services directly.
            </Text>
            <TouchableOpacity 
              style={styles.emergencyButton}
              onPress={() => navigation.navigate('SOS')}
            >
              <Text style={styles.emergencyButtonText}>Emergency SOS</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
    color: '#000000',
  },
  sosButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginBottom: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
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
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    color: '#22C55E',
    fontWeight: '500',
  },
  contactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  contactCard: {
    width: (width - 64) / 2,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    margin: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactInfo: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  contactDescription: {
    fontSize: 12,
    color: '#666',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  categoryCard: {
    width: (width - 64) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    margin: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
    textAlign: 'center',
  },
  categoryTopics: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 16,
  },
  categoryButton: {
    backgroundColor: '#F0F9F0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22C55E',
  },
  faqItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
    marginRight: 12,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    lineHeight: 20,
  },
  messageInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#000000',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22C55E',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#F0F9F0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  emergencyCard: {
    flexDirection: 'row',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  emergencyContent: {
    flex: 1,
  },
  emergencyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  emergencyText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  emergencyButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#EF4444',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  emergencyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});