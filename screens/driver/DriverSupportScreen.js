// screens/driver/DriverSupportScreen.js
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
  Alert,
  Linking,
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

const SUPPORT_CATEGORIES = [
  {
    id: 'rides',
    title: 'Ride Issues',
    description: 'Problems with rides or passengers',
    icon: 'car',
    color: '#3B82F6',
    items: [
      { id: 'cancel', label: 'Ride Cancellations' },
      { id: 'payment', label: 'Payment Issues' },
      { id: 'rating', label: 'Ratings & Reviews' },
      { id: 'safety', label: 'Safety Concerns' },
    ],
  },
  {
    id: 'earnings',
    title: 'Earnings & Payments',
    description: 'Questions about your earnings',
    icon: 'attach-money',
    color: '#22C55E',
    items: [
      { id: 'withdrawal', label: 'Withdrawal Issues' },
      { id: 'missing', label: 'Missing Earnings' },
      { id: 'bonus', label: 'Bonuses & Incentives' },
      { id: 'tax', label: 'Tax Documents' },
    ],
  },
  {
    id: 'account',
    title: 'Account & Profile',
    description: 'Update your account information',
    icon: 'person',
    color: '#8B5CF6',
    items: [
      { id: 'verification', label: 'Document Verification' },
      { id: 'update', label: 'Update Profile' },
      { id: 'deactivate', label: 'Deactivate Account' },
      { id: 'privacy', label: 'Privacy Settings' },
    ],
  },
  {
    id: 'technical',
    title: 'Technical Support',
    description: 'App issues and bugs',
    icon: 'build',
    color: '#F59E0B',
    items: [
      { id: 'app', label: 'App Not Working' },
      { id: 'gps', label: 'GPS Issues' },
      { id: 'notifications', label: 'Notification Problems' },
      { id: 'update', label: 'App Updates' },
    ],
  },
];

const FAQ_ITEMS = [
  {
    question: 'How do I withdraw my earnings?',
    answer: 'You can withdraw earnings from the Earnings screen. Minimum withdrawal is MK 5,000 and processing takes 24-48 hours.',
  },
  {
    question: 'What happens if a passenger cancels?',
    answer: 'If a passenger cancels after 2 minutes, you may receive a cancellation fee. The amount depends on the ride type and distance.',
  },
  {
    question: 'How are ratings calculated?',
    answer: 'Ratings are based on passenger feedback. Your overall rating is an average of your last 500 rides.',
  },
  {
    question: 'Can I change my working hours?',
    answer: 'Yes, you can update your schedule anytime in the Schedule section. Changes take effect immediately.',
  },
  {
    question: 'What documents do I need?',
    answer: 'Required documents: Valid driver\'s license, vehicle registration, insurance, profile photo, and vehicle photo.',
  },
];

const CONTACT_METHODS = [
  {
    id: 'phone',
    title: 'Call Support',
    description: 'Speak with a support agent',
    icon: 'phone',
    color: '#22C55E',
    action: () => Linking.openURL('tel:+265123456789'),
  },
  {
    id: 'email',
    title: 'Email Support',
    description: 'Send us an email',
    icon: 'email',
    color: '#3B82F6',
    action: () => Linking.openURL('mailto:support@kabaza.mw'),
  },
  {
    id: 'chat',
    title: 'Live Chat',
    description: 'Chat with support',
    icon: 'chat',
    color: '#F59E0B',
    action: () => Alert.alert('Live Chat', 'Live chat support hours: 8 AM - 8 PM'),
  },
  {
    id: 'office',
    title: 'Visit Office',
    description: 'Visit our office',
    icon: 'business',
    color: '#8B5CF6',
    action: () => {
      const address = 'Kabaza HQ, Area 3, Lilongwe, Malawi';
      Alert.alert(
        'Our Office',
        address,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Get Directions', onPress: () => {
            const url = `https://maps.google.com/?q=${encodeURIComponent(address)}`;
            Linking.openURL(url);
          }},
        ]
      );
    },
  },
];

export default function DriverSupportScreen() {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState(null);
  const [supportMessage, setSupportMessage] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);

  const handleCategoryPress = (category) => {
    if (selectedCategory === category.id) {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(category.id);
    }
  };

  const handleFAQPress = (index) => {
    if (expandedFAQ === index) {
      setExpandedFAQ(null);
    } else {
      setExpandedFAQ(index);
    }
  };

  const handleSubmitSupportRequest = () => {
    if (!supportMessage.trim()) {
      Alert.alert('Error', 'Please enter your message');
      return;
    }

    Alert.alert(
      'Support Request Sent',
      'We\'ll get back to you within 24 hours. A confirmation has been sent to your email.',
      [{ text: 'OK', onPress: () => setSupportMessage('') }]
    );
  };

  const renderSupportCategory = (category) => (
    <View key={category.id} style={styles.categoryCard}>
      <TouchableOpacity
        style={styles.categoryHeader}
        onPress={() => handleCategoryPress(category)}
      >
        <View style={[styles.categoryIcon, { backgroundColor: `${category.color}15` }]}>
          <MaterialIcon name={category.icon} size={24} color={category.color} />
        </View>
        
        <View style={styles.categoryInfo}>
          <Text style={styles.categoryTitle}>{category.title}</Text>
          <Text style={styles.categoryDescription}>{category.description}</Text>
        </View>
        
        <MaterialIcon 
          name={selectedCategory === category.id ? 'expand-less' : 'expand-more'} 
          size={24} 
          color="#666" 
        />
      </TouchableOpacity>
      
      {selectedCategory === category.id && (
        <View style={styles.categoryItems}>
          {category.items.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.categoryItem}
              onPress={() => navigation.navigate('SupportDetail', { category: category.id, issue: item.id })}
            >
              <Text style={styles.categoryItemText}>{item.label}</Text>
              <MaterialIcon name="chevron-right" size={20} color="#D1D5DB" />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
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
          name={expandedFAQ === index ? 'remove' : 'add'} 
          size={20} 
          color="#666" 
        />
      </View>
      
      {expandedFAQ === index && (
        <Text style={styles.faqAnswer}>{item.answer}</Text>
      )}
    </TouchableOpacity>
  );

  const renderContactMethod = (method) => (
    <TouchableOpacity
      key={method.id}
      style={styles.contactCard}
      onPress={method.action}
    >
      <View style={[styles.contactIcon, { backgroundColor: `${method.color}15` }]}>
        <MaterialIcon name={method.icon} size={24} color={method.color} />
      </View>
      <View style={styles.contactInfo}>
        <Text style={styles.contactTitle}>{method.title}</Text>
        <Text style={styles.contactDescription}>{method.description}</Text>
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
          style={styles.emergencyButton}
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
            {CONTACT_METHODS.map(renderContactMethod)}
          </View>
        </View>

        {/* Support Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Common Issues</Text>
          {SUPPORT_CATEGORIES.map(renderSupportCategory)}
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

        {/* Send Message */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Send us a Message</Text>
          <TextInput
            style={styles.messageInput}
            placeholder="Describe your issue..."
            value={supportMessage}
            onChangeText={setSupportMessage}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          
          <TouchableOpacity 
            style={styles.submitButton}
            onPress={handleSubmitSupportRequest}
          >
            <MaterialIcon name="send" size={20} color="#FFFFFF" />
            <Text style={styles.submitButtonText}>Send Message</Text>
          </TouchableOpacity>
        </View>

        {/* Support Hours */}
        <View style={styles.infoCard}>
          <MaterialIcon name="schedule" size={24} color="#3B82F6" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Support Hours</Text>
            <Text style={styles.infoText}>
              Monday - Friday: 8:00 AM - 8:00 PM{'\n'}
              Saturday - Sunday: 9:00 AM - 6:00 PM{'\n'}
              Emergency Support: 24/7
            </Text>
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
  emergencyButton: {
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
  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 14,
    color: '#666',
  },
  categoryItems: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  categoryItemText: {
    fontSize: 14,
    color: '#000000',
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
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
    marginRight: 12,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
    lineHeight: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
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
});