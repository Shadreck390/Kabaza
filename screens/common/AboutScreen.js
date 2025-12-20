// screens/common/AboutScreen.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  Linking,
  Image,
  Platform,
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const TEAM_MEMBERS = [
  { id: '1', name: 'John Banda', role: 'CEO & Founder', image: null },
  { id: '2', name: 'Sarah Mwale', role: 'CTO', image: null },
  { id: '3', name: 'David Phiri', role: 'Head of Operations', image: null },
  { id: '4', name: 'Mary Chisale', role: 'Customer Support Lead', image: null },
];

const APP_FEATURES = [
  { icon: 'speed', title: 'Fast Booking', description: 'Book a ride in under 30 seconds' },
  { icon: 'security', title: 'Safe Rides', description: 'Verified drivers and safety features' },
  { icon: 'payments', title: 'Flexible Payments', description: 'Cash, mobile money, and cards' },
  { icon: 'support-agent', title: '24/7 Support', description: 'Round-the-clock customer service' },
  { icon: 'eco', title: 'Eco-Friendly', description: 'Promoting sustainable transportation' },
  { icon: 'groups', title: 'Community Focus', description: 'Supporting local drivers' },
];

export default function AboutScreen() {
  const navigation = useNavigation();

  const openWebsite = () => {
    Linking.openURL('https://kabaza.mw');
  };

  const openFacebook = () => {
    Linking.openURL('https://facebook.com/kabaza');
  };

  const openTwitter = () => {
    Linking.openURL('https://twitter.com/kabaza');
  };

  const openInstagram = () => {
    Linking.openURL('https://instagram.com/kabaza');
  };

  const openLinkedIn = () => {
    Linking.openURL('https://linkedin.com/company/kabaza');
  };

  const openPlayStore = () => {
    Linking.openURL('https://play.google.com/store/apps/details?id=com.kabaza');
  };

  const openAppStore = () => {
    Linking.openURL('https://apps.apple.com/app/kabaza/id123456789');
  };

  const renderTeamMember = (member) => (
    <View key={member.id} style={styles.teamMember}>
      <View style={styles.memberAvatar}>
        <Text style={styles.memberInitials}>
          {member.name.split(' ').map(n => n[0]).join('')}
        </Text>
      </View>
      <Text style={styles.memberName}>{member.name}</Text>
      <Text style={styles.memberRole}>{member.role}</Text>
    </View>
  );

  const renderFeature = (feature, index) => (
    <View key={index} style={styles.featureItem}>
      <View style={styles.featureIcon}>
        <MaterialIcon name={feature.icon} size={28} color="#22C55E" />
      </View>
      <Text style={styles.featureTitle}>{feature.title}</Text>
      <Text style={styles.featureDescription}>{feature.description}</Text>
    </View>
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
        <Text style={styles.headerTitle}>About Kabaza</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.appLogo}>
            <MaterialCommunityIcon name="motorbike" size={64} color="#22C55E" />
          </View>
          <Text style={styles.appName}>Kabaza</Text>
          <Text style={styles.appTagline}>Ride. Earn. Connect.</Text>
          <Text style={styles.appVersion}>Version 2.0.1</Text>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Story</Text>
          <Text style={styles.description}>
            Kabaza is Malawi's leading ride-hailing platform, connecting passengers 
            with trusted drivers across the country. Founded in 2020, we're on a 
            mission to revolutionize transportation in Malawi by providing safe, 
            affordable, and reliable rides while creating economic opportunities 
            for drivers.
          </Text>
          <Text style={styles.description}>
            With over 10,000 registered drivers and 100,000 happy passengers, 
            we're proud to be a part of Malawi's growing digital economy.
          </Text>
        </View>

        {/* Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Why Choose Kabaza?</Text>
          <View style={styles.featuresGrid}>
            {APP_FEATURES.map(renderFeature)}
          </View>
        </View>

        {/* Team */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Team</Text>
          <View style={styles.teamGrid}>
            {TEAM_MEMBERS.map(renderTeamMember)}
          </View>
        </View>

        {/* App Downloads */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Download Our App</Text>
          <View style={styles.downloadButtons}>
            <TouchableOpacity 
              style={styles.downloadButton}
              onPress={openPlayStore}
            >
              <MaterialIcon name="android" size={24} color="#FFFFFF" />
              <View style={styles.downloadInfo}>
                <Text style={styles.downloadText}>GET IT ON</Text>
                <Text style={styles.downloadStore}>Google Play</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.downloadButton, styles.iosButton]}
              onPress={openAppStore}
            >
              <MaterialIcon name="apple" size={24} color="#FFFFFF" />
              <View style={styles.downloadInfo}>
                <Text style={styles.downloadText}>Download on the</Text>
                <Text style={styles.downloadStore}>App Store</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Contact Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          <View style={styles.contactInfo}>
            <TouchableOpacity style={styles.contactItem} onPress={openWebsite}>
              <MaterialIcon name="public" size={20} color="#3B82F6" />
              <Text style={styles.contactText}>www.kabaza.mw</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.contactItem}
              onPress={() => Linking.openURL('mailto:info@kabaza.mw')}
            >
              <MaterialIcon name="email" size={20} color="#3B82F6" />
              <Text style={styles.contactText}>info@kabaza.mw</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.contactItem}
              onPress={() => Linking.openURL('tel:+265123456789')}
            >
              <MaterialIcon name="phone" size={20} color="#3B82F6" />
              <Text style={styles.contactText}>+265 123 456 789</Text>
            </TouchableOpacity>
            
            <View style={styles.contactItem}>
              <MaterialIcon name="location-on" size={20} color="#3B82F6" />
              <Text style={styles.contactText}>
                Kabaza HQ, Area 3{'\n'}Lilongwe, Malawi
              </Text>
            </View>
          </View>
        </View>

        {/* Social Media */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Follow Us</Text>
          <View style={styles.socialLinks}>
            <TouchableOpacity 
              style={styles.socialButton}
              onPress={openFacebook}
            >
              <MaterialCommunityIcon name="facebook" size={24} color="#1877F2" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.socialButton}
              onPress={openTwitter}
            >
              <MaterialCommunityIcon name="twitter" size={24} color="#1DA1F2" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.socialButton}
              onPress={openInstagram}
            >
              <MaterialCommunityIcon name="instagram" size={24} color="#E4405F" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.socialButton}
              onPress={openLinkedIn}
            >
              <MaterialCommunityIcon name="linkedin" size={24} color="#0A66C2" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Legal Links */}
        <View style={styles.legalSection}>
          <TouchableOpacity 
            style={styles.legalLink}
            onPress={() => navigation.navigate('TermsScreen')}
          >
            <Text style={styles.legalLinkText}>Terms of Service</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.legalLink}
            onPress={() => navigation.navigate('PrivacyScreen')}
          >
            <Text style={styles.legalLinkText}>Privacy Policy</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.legalLink}
            onPress={() => navigation.navigate('HelpSupport')}
          >
            <Text style={styles.legalLinkText}>Help & Support</Text>
          </TouchableOpacity>
        </View>

        {/* Copyright */}
        <View style={styles.footer}>
          <Text style={styles.copyright}>© 2024 Kabaza Malawi. All rights reserved.</Text>
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
  headerPlaceholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  appLogo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F0F9F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#22C55E',
    marginBottom: 4,
  },
  appTagline: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  appVersion: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 12,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  featureItem: {
    width: (width - 96) / 2,
    alignItems: 'center',
    padding: 12,
    margin: 8,
  },
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F0F9F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
  },
  teamGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  teamMember: {
    width: (width - 96) / 2,
    alignItems: 'center',
    padding: 16,
    margin: 8,
  },
  memberAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  memberInitials: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
    textAlign: 'center',
  },
  memberRole: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  downloadButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  downloadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  iosButton: {
    backgroundColor: '#000000',
  },
  downloadInfo: {
    flex: 1,
  },
  downloadText: {
    fontSize: 10,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  downloadStore: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  contactInfo: {
    gap: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  contactText: {
    fontSize: 16,
    color: '#000000',
    flex: 1,
    lineHeight: 24,
  },
  socialLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  socialButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  legalSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    paddingVertical: 24,
    gap: 24,
  },
  legalLink: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  legalLinkText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginTop: 16,
  },
  copyright: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});