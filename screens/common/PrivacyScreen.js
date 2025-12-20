// screens/common/PrivacyScreen.js
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
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const PRIVACY_SECTIONS = [
  {
    id: 'data-collection',
    title: 'Data Collection',
    content: `We collect information necessary to provide our services, including:
    • Personal information (name, email, phone number)
    • Location data (for ride matching and safety)
    • Payment information (processed securely)
    • Device information (for app optimization)
    • Usage data (to improve our services)`,
  },
  {
    id: 'data-usage',
    title: 'How We Use Your Data',
    content: `Your data helps us:
    • Connect you with drivers/riders
    • Process payments securely
    • Ensure ride safety
    • Improve our services
    • Send important updates
    • Provide customer support
    • Comply with legal obligations`,
  },
  {
    id: 'data-sharing',
    title: 'Data Sharing',
    content: `We may share your data with:
    • Drivers/Riders (for ride coordination)
    • Payment processors (for transactions)
    • Service providers (for app functionality)
    • Legal authorities (when required by law)
    • Emergency services (in case of emergencies)
    
    We never sell your personal data to third parties.`,
  },
  {
    id: 'data-security',
    title: 'Data Security',
    content: `We implement industry-standard security measures:
    • Encryption of sensitive data
    • Secure payment processing
    • Regular security audits
    • Access controls
    • Employee training
    • Incident response procedures`,
  },
  {
    id: 'your-rights',
    title: 'Your Rights',
    content: `You have the right to:
    • Access your personal data
    • Correct inaccurate data
    • Request data deletion
    • Object to data processing
    • Data portability
    • Withdraw consent
    
    Contact our Data Protection Officer for requests.`,
  },
  {
    id: 'contact',
    title: 'Contact Us',
    content: `For privacy concerns:
    Email: privacy@kabaza.mw
    Phone: +265 123 456 789
    Address: Kabaza HQ, Area 3, Lilongwe
    
    Data Protection Officer: dpo@kabaza.mw`,
  },
];

export default function PrivacyScreen() {
  const navigation = useNavigation();
  const [expandedSection, setExpandedSection] = React.useState(null);

  const handleSectionPress = (sectionId) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  const handleEmailPress = () => {
    Linking.openURL('mailto:privacy@kabaza.mw');
  };

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
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Introduction */}
        <View style={styles.introSection}>
          <View style={styles.privacyIcon}>
            <MaterialIcon name="privacy-tip" size={48} color="#3B82F6" />
          </View>
          <Text style={styles.introTitle}>Your Privacy Matters</Text>
          <Text style={styles.introText}>
            Last updated: January 15, 2024{'\n'}
            Effective date: January 15, 2024
          </Text>
          <Text style={styles.introDescription}>
            This Privacy Policy explains how Kabaza collects, uses, discloses, 
            and safeguards your information when you use our mobile application 
            and services.
          </Text>
        </View>

        {/* Privacy Sections */}
        <View style={styles.sectionsContainer}>
          {PRIVACY_SECTIONS.map((section) => (
            <TouchableOpacity
              key={section.id}
              style={[
                styles.sectionCard,
                expandedSection === section.id && styles.sectionCardExpanded,
              ]}
              onPress={() => handleSectionPress(section.id)}
              activeOpacity={0.8}
            >
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <MaterialIcon 
                  name={expandedSection === section.id ? 'expand-less' : 'expand-more'} 
                  size={24} 
                  color="#666" 
                />
              </View>
              
              {expandedSection === section.id && (
                <Text style={styles.sectionContent}>{section.content}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Key Points */}
        <View style={styles.keyPointsSection}>
          <Text style={styles.keyPointsTitle}>Key Points</Text>
          <View style={styles.keyPointsList}>
            <View style={styles.keyPoint}>
              <MaterialIcon name="check-circle" size={20} color="#22C55E" />
              <Text style={styles.keyPointText}>
                We only collect necessary data
              </Text>
            </View>
            <View style={styles.keyPoint}>
              <MaterialIcon name="check-circle" size={20} color="#22C55E" />
              <Text style={styles.keyPointText}>
                Your location is only used during rides
              </Text>
            </View>
            <View style={styles.keyPoint}>
              <MaterialIcon name="check-circle" size={20} color="#22C55E" />
              <Text style={styles.keyPointText}>
                We never sell your personal data
              </Text>
            </View>
            <View style={styles.keyPoint}>
              <MaterialIcon name="check-circle" size={20} color="#22C55E" />
              <Text style={styles.keyPointText}>
                You control your data preferences
              </Text>
            </View>
          </View>
        </View>

        {/* Contact Section */}
        <View style={styles.contactSection}>
          <MaterialIcon name="contact-support" size={32} color="#3B82F6" />
          <Text style={styles.contactTitle}>Questions or Concerns?</Text>
          <Text style={styles.contactText}>
            Contact our Privacy Team for any questions about this policy or 
            your personal data.
          </Text>
          <TouchableOpacity 
            style={styles.contactButton}
            onPress={handleEmailPress}
          >
            <MaterialIcon name="email" size={20} color="#FFFFFF" />
            <Text style={styles.contactButtonText}>Contact Privacy Team</Text>
          </TouchableOpacity>
        </View>

        {/* Updates */}
        <View style={styles.updatesSection}>
          <MaterialIcon name="update" size={24} color="#F59E0B" />
          <View style={styles.updatesContent}>
            <Text style={styles.updatesTitle}>Policy Updates</Text>
            <Text style={styles.updatesText}>
              We may update this policy periodically. We'll notify you of 
              significant changes through the app or email.
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By using Kabaza, you agree to this Privacy Policy and our 
            Terms of Service.
          </Text>
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
  introSection: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  privacyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F9F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  introTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
    textAlign: 'center',
  },
  introText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  introDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  sectionsContainer: {
    marginBottom: 24,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionCardExpanded: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
    marginRight: 12,
  },
  sectionContent: {
    fontSize: 14,
    color: '#666',
    marginTop: 16,
    lineHeight: 22,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  keyPointsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  keyPointsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },
  keyPointsList: {
    gap: 12,
  },
  keyPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  keyPointText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    lineHeight: 20,
  },
  contactSection: {
    alignItems: 'center',
    backgroundColor: '#F0F9F0',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  contactTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
  },
  contactText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  contactButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  updatesSection: {
    flexDirection: 'row',
    backgroundColor: '#FEFCE8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  updatesContent: {
    flex: 1,
  },
  updatesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  updatesText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  footer: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 24,
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});