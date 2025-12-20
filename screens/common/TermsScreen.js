// screens/common/TermsScreen.js
import React, { useState } from 'react';
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

const { width, height } = Dimensions.get('window');

const TERMS_SECTIONS = [
  {
    id: 'acceptance',
    title: 'Acceptance of Terms',
    content: `By accessing or using Kabaza services, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the service.`,
  },
  {
    id: 'services',
    title: 'Services Provided',
    content: `Kabaza provides a platform connecting riders with drivers for transportation services. We are not a transportation provider and do not employ drivers.`,
  },
  {
    id: 'user-accounts',
    title: 'User Accounts',
    content: `You must create an account to use our services. You are responsible for maintaining the confidentiality of your account and password. You must be at least 18 years old to create an account.`,
  },
  {
    id: 'payments',
    title: 'Payments & Fees',
    content: `• All fares are calculated based on distance, time, and ride type
• Payment must be completed at the end of each ride
• We accept cash, mobile money, and credit/debit cards
• Cancellation fees may apply in certain circumstances
• All transactions are final and non-refundable`,
  },
  {
    id: 'conduct',
    title: 'User Conduct',
    content: `You agree to:
• Treat all users with respect
• Not damage vehicles
• Not carry prohibited items
• Follow safety instructions
• Pay for all services received
• Report any issues immediately`,
  },
  {
    id: 'driver-terms',
    title: 'Driver Terms',
    content: `Additional terms for drivers:
• Maintain valid documentation
• Provide safe and reliable service
• Accept rides promptly
• Maintain vehicle in good condition
• Comply with all traffic laws
• Provide accurate trip data`,
  },
  {
    id: 'liability',
    title: 'Liability',
    content: `Kabaza is not liable for:
• Accidents or injuries during rides
• Lost or damaged property
• Driver conduct or vehicle conditions
• Delays or service interruptions
• Third-party actions

Your use of the service is at your own risk.`,
  },
  {
    id: 'termination',
    title: 'Termination',
    content: `We may terminate or suspend your account immediately, without prior notice or liability, for any reason, including breach of these Terms.`,
  },
  {
    id: 'changes',
    title: 'Changes to Terms',
    content: `We reserve the right to modify these terms at any time. We will notify users of significant changes. Continued use after changes constitutes acceptance.`,
  },
  {
    id: 'contact',
    title: 'Contact Information',
    content: `For questions about these Terms:
Email: legal@kabaza.mw
Phone: +265 123 456 789
Address: Kabaza HQ, Area 3, Lilongwe, Malawi`,
  },
];

export default function TermsScreen() {
  const navigation = useNavigation();
  const [expandedSection, setExpandedSection] = useState(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const handleSectionPress = (sectionId) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  const handleAcceptTerms = () => {
    setAcceptedTerms(!acceptedTerms);
  };

  const handleEmailPress = () => {
    Linking.openURL('mailto:legal@kabaza.mw');
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
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Introduction */}
        <View style={styles.introSection}>
          <View style={styles.termsIcon}>
            <MaterialIcon name="gavel" size={48} color="#22C55E" />
          </View>
          <Text style={styles.introTitle}>Terms of Service</Text>
          <Text style={styles.introDate}>Effective: January 15, 2024</Text>
          <Text style={styles.introText}>
            Please read these Terms of Service carefully before using Kabaza 
            services. These terms govern your access to and use of our platform.
          </Text>
        </View>

        {/* Important Notice */}
        <View style={styles.noticeSection}>
          <MaterialIcon name="warning" size={24} color="#F59E0B" />
          <View style={styles.noticeContent}>
            <Text style={styles.noticeTitle}>Important Notice</Text>
            <Text style={styles.noticeText}>
              These are legally binding terms. By using Kabaza, you agree to 
              these terms. If you do not agree, please do not use our services.
            </Text>
          </View>
        </View>

        {/* Terms Sections */}
        <View style={styles.sectionsContainer}>
          {TERMS_SECTIONS.map((section) => (
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
                <View style={styles.sectionNumber}>
                  <Text style={styles.sectionNumberText}>
                    {TERMS_SECTIONS.findIndex(s => s.id === section.id) + 1}
                  </Text>
                </View>
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

        {/* Quick Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>Quick Summary</Text>
          <View style={styles.summaryPoints}>
            <View style={styles.summaryPoint}>
              <MaterialIcon name="check-circle" size={20} color="#22C55E" />
              <Text style={styles.summaryPointText}>
                You must be 18+ to use Kabaza
              </Text>
            </View>
            <View style={styles.summaryPoint}>
              <MaterialIcon name="check-circle" size={20} color="#22C55E" />
              <Text style={styles.summaryPointText}>
                Payment is required for all rides
              </Text>
            </View>
            <View style={styles.summaryPoint}>
              <MaterialIcon name="check-circle" size={20} color="#22C55E" />
              <Text style={styles.summaryPointText}>
                Treat everyone with respect
              </Text>
            </View>
            <View style={styles.summaryPoint}>
              <MaterialIcon name="check-circle" size={20} color="#22C55E" />
              <Text style={styles.summaryPointText}>
                Report issues immediately
              </Text>
            </View>
          </View>
        </View>

        {/* Acceptance Checkbox */}
        <View style={styles.acceptanceSection}>
          <TouchableOpacity 
            style={styles.checkboxContainer}
            onPress={handleAcceptTerms}
          >
            <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
              {acceptedTerms && (
                <MaterialIcon name="check" size={16} color="#FFFFFF" />
              )}
            </View>
            <Text style={styles.checkboxText}>
              I have read and agree to the Terms of Service
            </Text>
          </TouchableOpacity>
          
          {acceptedTerms && (
            <View style={styles.acceptedBadge}>
              <MaterialIcon name="verified" size={20} color="#22C55E" />
              <Text style={styles.acceptedText}>Terms Accepted</Text>
            </View>
          )}
        </View>

        {/* Legal Contact */}
        <View style={styles.legalContactSection}>
          <MaterialIcon name="balance" size={32} color="#3B82F6" />
          <Text style={styles.legalContactTitle}>Legal Questions?</Text>
          <Text style={styles.legalContactText}>
            Contact our legal team for questions about these terms.
          </Text>
          <TouchableOpacity 
            style={styles.legalContactButton}
            onPress={handleEmailPress}
          >
            <MaterialIcon name="email" size={20} color="#FFFFFF" />
            <Text style={styles.legalContactButtonText}>Contact Legal Team</Text>
          </TouchableOpacity>
        </View>

        {/* Related Documents */}
        <View style={styles.relatedSection}>
          <Text style={styles.relatedTitle}>Related Documents</Text>
          <TouchableOpacity 
            style={styles.relatedLink}
            onPress={() => navigation.navigate('PrivacyScreen')}
          >
            <MaterialIcon name="privacy-tip" size={20} color="#3B82F6" />
            <Text style={styles.relatedLinkText}>Privacy Policy</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.relatedLink}
            onPress={() => navigation.navigate('HelpSupport')}
          >
            <MaterialIcon name="help" size={20} color="#3B82F6" />
            <Text style={styles.relatedLinkText}>Help & Support</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © 2024 Kabaza Malawi. All rights reserved.
          </Text>
          <Text style={styles.footerNote}>
            These Terms of Service are governed by the laws of Malawi.
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
  termsIcon: {
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
  },
  introDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  introText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  noticeSection: {
    flexDirection: 'row',
    backgroundColor: '#FEFCE8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  noticeContent: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  noticeText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
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
    alignItems: 'center',
    gap: 12,
  },
  sectionNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F9F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionNumberText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22C55E',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
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
  summarySection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },
  summaryPoints: {
    gap: 12,
  },
  summaryPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  summaryPointText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    lineHeight: 20,
  },
  acceptanceSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },
  checkboxText: {
    fontSize: 16,
    color: '#000000',
    flex: 1,
  },
  acceptedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9F0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  acceptedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22C55E',
  },
  legalContactSection: {
    alignItems: 'center',
    backgroundColor: '#F0F9F0',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  legalContactTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
  },
  legalContactText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  legalContactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  legalContactButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  relatedSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  relatedTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },
  relatedLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  relatedLinkText: {
    fontSize: 16,
    color: '#000000',
    flex: 1,
  },
  footer: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  footerNote: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});