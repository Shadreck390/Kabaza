// screens/driver/DriverSupportScreen.js
import React, { useState, useEffect, useRef } from 'react';
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
  ActivityIndicator,
  Modal,
  Share,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from '@react-native-community/blur';
import * as ImagePicker from 'react-native-image-picker';

const { width, height } = Dimensions.get('window');

const SUPPORT_CATEGORIES = [
  {
    id: 'rides',
    title: 'Ride Issues',
    description: 'Problems with rides or passengers',
    icon: 'car',
    color: '#3B82F6',
    urgency: 'high',
    items: [
      { 
        id: 'cancel', 
        label: 'Ride Cancellations',
        description: 'Passenger cancellations, cancellation fees'
      },
      { 
        id: 'payment', 
        label: 'Payment Issues',
        description: 'Failed payments, incorrect fares'
      },
      { 
        id: 'rating', 
        label: 'Ratings & Reviews',
        description: 'Unfair ratings, review disputes'
      },
      { 
        id: 'safety', 
        label: 'Safety Concerns',
        description: 'Unsafe passengers, incidents'
      },
      { 
        id: 'lost_item', 
        label: 'Lost & Found',
        description: 'Items left in vehicle'
      },
    ],
  },
  {
    id: 'earnings',
    title: 'Earnings & Payments',
    description: 'Questions about your earnings',
    icon: 'attach-money',
    color: '#22C55E',
    urgency: 'high',
    items: [
      { 
        id: 'withdrawal', 
        label: 'Withdrawal Issues',
        description: 'Failed withdrawals, delays'
      },
      { 
        id: 'missing', 
        label: 'Missing Earnings',
        description: 'Earnings not showing up'
      },
      { 
        id: 'bonus', 
        label: 'Bonuses & Incentives',
        description: 'Bonus calculations, eligibility'
      },
      { 
        id: 'tax', 
        label: 'Tax Documents',
        description: 'Earnings statements, tax forms'
      },
      { 
        id: 'fare_dispute', 
        label: 'Fare Disputes',
        description: 'Dispute passenger fare adjustments'
      },
    ],
  },
  {
    id: 'account',
    title: 'Account & Profile',
    description: 'Update your account information',
    icon: 'person',
    color: '#8B5CF6',
    urgency: 'medium',
    items: [
      { 
        id: 'verification', 
        label: 'Document Verification',
        description: 'Document uploads, verification status'
      },
      { 
        id: 'update', 
        label: 'Update Profile',
        description: 'Change personal information'
      },
      { 
        id: 'deactivate', 
        label: 'Deactivate Account',
        description: 'Temporarily or permanently deactivate'
      },
      { 
        id: 'privacy', 
        label: 'Privacy Settings',
        description: 'Data privacy concerns'
      },
      { 
        id: 'suspension', 
        label: 'Account Suspension',
        description: 'Appeal suspension or restrictions'
      },
    ],
  },
  {
    id: 'technical',
    title: 'Technical Support',
    description: 'App issues and bugs',
    icon: 'build',
    color: '#F59E0B',
    urgency: 'medium',
    items: [
      { 
        id: 'app', 
        label: 'App Not Working',
        description: 'Crashes, freezes, login issues'
      },
      { 
        id: 'gps', 
        label: 'GPS Issues',
        description: 'Location inaccuracies, navigation problems'
      },
      { 
        id: 'notifications', 
        label: 'Notification Problems',
        description: 'Not receiving notifications'
      },
      { 
        id: 'update', 
        label: 'App Updates',
        description: 'Update problems, compatibility'
      },
      { 
        id: 'battery', 
        label: 'Battery Drain',
        description: 'Excessive battery usage'
      },
    ],
  },
  {
    id: 'vehicle',
    title: 'Vehicle & Equipment',
    description: 'Vehicle requirements and issues',
    icon: 'directions-car',
    color: '#EC4899',
    urgency: 'low',
    items: [
      { 
        id: 'requirements', 
        label: 'Vehicle Requirements',
        description: 'Vehicle standards and eligibility'
      },
      { 
        id: 'insurance', 
        label: 'Insurance',
        description: 'Insurance coverage questions'
      },
      { 
        id: 'maintenance', 
        label: 'Maintenance Support',
        description: 'Vehicle maintenance discounts'
      },
      { 
        id: 'inspection', 
        label: 'Vehicle Inspection',
        description: 'Inspection scheduling and results'
      },
    ],
  },
];

const FAQ_ITEMS = [
  {
    id: 'withdrawal',
    question: 'How do I withdraw my earnings?',
    answer: 'You can withdraw earnings from the Earnings screen. Minimum withdrawal is MK 5,000 and processing takes 24-48 hours. Standard withdrawal fee is 2%. For instant withdrawals (within 2 hours), a 5% fee applies.',
    category: 'earnings',
  },
  {
    id: 'cancellation',
    question: 'What happens if a passenger cancels?',
    answer: 'If a passenger cancels after 2 minutes of driver acceptance, you receive a cancellation fee. The amount depends on ride type and distance: Kabaza - MK 500, Taxi - MK 1,000. Cancellation fees are automatically added to your earnings.',
    category: 'rides',
  },
  {
    id: 'ratings',
    question: 'How are ratings calculated?',
    answer: 'Ratings are based on passenger feedback. Your overall rating is an average of your last 500 rides. Ratings below 4.0 may affect ride requests. You can see detailed breakdown in your profile.',
    category: 'account',
  },
  {
    id: 'schedule',
    question: 'Can I change my working hours?',
    answer: 'Yes, you can update your schedule anytime in the Schedule section. Changes take effect immediately. We recommend updating at least 2 hours in advance for optimal ride matching.',
    category: 'account',
  },
  {
    id: 'documents',
    question: 'What documents do I need?',
    answer: 'Required documents: Valid driver\'s license, vehicle registration, insurance certificate, profile photo, vehicle photos (front, back, side). All documents must be current and clear.',
    category: 'account',
  },
  {
    id: 'bonus',
    question: 'How do bonuses work?',
    answer: 'Bonuses are based on weekly performance metrics: ride completion rate (>95%), acceptance rate (>85%), and passenger rating (>4.7). Weekly bonus amounts range from MK 5,000 to MK 25,000.',
    category: 'earnings',
  },
  {
    id: 'safety',
    question: 'What safety features are available?',
    answer: 'Emergency SOS button, trip sharing with contacts, 24/7 safety line, in-app emergency assistance, and incident reporting. All rides are GPS-tracked and recorded.',
    category: 'rides',
  },
  {
    id: 'offline',
    question: 'Why am I not getting rides?',
    answer: 'Common reasons: App is offline, poor network connection, low battery mode enabled, background app restrictions, or low rating. Check your network and app settings.',
    category: 'technical',
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
    hours: '24/7 Emergency',
    responseTime: 'Immediate',
    availability: 'high',
  },
  {
    id: 'email',
    title: 'Email Support',
    description: 'Send us an email',
    icon: 'email',
    color: '#3B82F6',
    action: () => Linking.openURL('mailto:support@kabaza.mw?subject=Driver%20Support'),
    hours: 'Mon-Fri 8AM-8PM',
    responseTime: '24 hours',
    availability: 'high',
  },
  {
    id: 'chat',
    title: 'Live Chat',
    description: 'Chat with support',
    icon: 'chat',
    color: '#F59E0B',
    action: (navigation) => navigation.navigate('LiveChat'),
    hours: 'Mon-Sun 8AM-10PM',
    responseTime: '5 minutes',
    availability: 'medium',
  },
  {
    id: 'whatsapp',
    title: 'WhatsApp',
    description: 'Message us on WhatsApp',
    icon: 'whatsapp',
    color: '#25D366',
    action: () => Linking.openURL('https://wa.me/265123456789'),
    hours: '24/7',
    responseTime: '15 minutes',
    availability: 'high',
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
          { text: 'Call Office', onPress: () => Linking.openURL('tel:+265123456789') },
        ]
      );
    },
    hours: 'Mon-Fri 9AM-5PM',
    responseTime: 'Immediate',
    availability: 'low',
  },
  {
    id: 'community',
    title: 'Driver Community',
    description: 'Connect with other drivers',
    icon: 'groups',
    color: '#EC4899',
    action: (navigation) => navigation.navigate('CommunityForum'),
    hours: '24/7',
    responseTime: 'Varies',
    availability: 'high',
  },
];

export default function DriverSupportScreen() {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState(null);
  const [supportMessage, setSupportMessage] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [recentTickets, setRecentTickets] = useState([]);
  const [typing, setTyping] = useState(false);
  const [urgent, setUrgent] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    loadRecentTickets();
    animateEntrance();
  }, []);

  const animateEntrance = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const loadRecentTickets = async () => {
    try {
      const tickets = await AsyncStorage.getItem('support_tickets');
      if (tickets) {
        setRecentTickets(JSON.parse(tickets).slice(0, 3));
      }
    } catch (error) {
      console.error('Error loading tickets:', error);
    }
  };

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

  const handleAddAttachment = () => {
    Alert.alert(
      'Add Attachment',
      'Choose attachment type',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose Photo', onPress: choosePhoto },
        { text: 'Upload Document', onPress: uploadDocument },
      ]
    );
  };

  const takePhoto = () => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
    };
    
    ImagePicker.launchCamera(options, (response) => {
      if (response.didCancel) return;
      if (response.error) {
        Alert.alert('Error', 'Failed to take photo');
        return;
      }
      
      const newAttachment = {
        id: Date.now(),
        uri: response.assets[0].uri,
        type: 'photo',
        name: `photo_${Date.now()}.jpg`,
      };
      
      setAttachments([...attachments, newAttachment]);
    });
  };

  const choosePhoto = () => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      selectionLimit: 3,
    };
    
    ImagePicker.launchImageLibrary(options, (response) => {
      if (response.didCancel) return;
      if (response.error) {
        Alert.alert('Error', 'Failed to choose photo');
        return;
      }
      
      const newAttachments = response.assets.map(asset => ({
        id: Date.now() + Math.random(),
        uri: asset.uri,
        type: 'photo',
        name: asset.fileName || `photo_${Date.now()}.jpg`,
      }));
      
      setAttachments([...attachments, ...newAttachments]);
    });
  };

  const uploadDocument = () => {
    // For now, simulate document upload
    Alert.alert('Info', 'Document upload feature coming soon');
  };

  const removeAttachment = (id) => {
    setAttachments(attachments.filter(att => att.id !== id));
  };

  const handleSubmitSupportRequest = async () => {
    if (!supportMessage.trim()) {
      Alert.alert('Error', 'Please describe your issue');
      return;
    }

    setIsLoading(true);

    // Simulate API call
    setTimeout(async () => {
      const newTicket = {
        id: `TKT${Date.now()}`,
        message: supportMessage,
        category: selectedCategory || 'general',
        attachments: attachments.length,
        urgent,
        status: 'open',
        date: new Date().toISOString(),
        estimatedResponse: urgent ? '2-4 hours' : '24-48 hours',
      };

      try {
        // Save to local storage
        const existingTickets = await AsyncStorage.getItem('support_tickets');
        const tickets = existingTickets ? JSON.parse(existingTickets) : [];
        tickets.unshift(newTicket);
        await AsyncStorage.setItem('support_tickets', JSON.stringify(tickets));
        
        setRecentTickets([newTicket, ...tickets.slice(0, 2)]);
      } catch (error) {
        console.error('Error saving ticket:', error);
      }

      setIsLoading(false);
      
      Alert.alert(
        'Support Request Sent! ✅',
        `Ticket ID: ${newTicket.id}\nEstimated response: ${newTicket.estimatedResponse}\n\nWe've sent a confirmation to your email.`,
        [
          { 
            text: 'View Ticket', 
            onPress: () => navigation.navigate('TicketDetail', { ticketId: newTicket.id })
          },
          { 
            text: 'OK', 
            onPress: () => {
              setSupportMessage('');
              setAttachments([]);
              setUrgent(false);
            }
          },
        ]
      );
    }, 1500);
  };

  const handleShareFAQ = (faq) => {
    Share.share({
      title: 'Kabaza Support FAQ',
      message: `${faq.question}\n\n${faq.answer}\n\n#KabazaSupport`,
    });
  };

  const handleRateSupport = () => {
    setShowFeedbackModal(true);
  };

  const submitFeedback = () => {
    if (!feedback.trim()) {
      Alert.alert('Error', 'Please enter your feedback');
      return;
    }

    // Save feedback
    Alert.alert('Thank You!', 'Your feedback helps us improve our support.');
    setFeedback('');
    setShowFeedbackModal(false);
  };

  const filteredFAQs = FAQ_ITEMS.filter(faq => 
    searchQuery.length === 0 || 
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCategories = SUPPORT_CATEGORIES.filter(category =>
    searchQuery.length === 0 ||
    category.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.items.some(item => 
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const renderSupportCategory = (category) => (
    <Animated.View 
      key={category.id} 
      style={[
        styles.categoryCard,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }
      ]}
    >
      <TouchableOpacity
        style={styles.categoryHeader}
        onPress={() => handleCategoryPress(category)}
        activeOpacity={0.7}
      >
        <View style={[styles.categoryIcon, { backgroundColor: `${category.color}15` }]}>
          <MaterialIcon name={category.icon} size={24} color={category.color} />
          {category.urgency === 'high' && (
            <View style={styles.urgencyBadge}>
              <MaterialIcon name="priority-high" size={10} color="#fff" />
            </View>
          )}
        </View>
        
        <View style={styles.categoryInfo}>
          <View style={styles.categoryTitleRow}>
            <Text style={styles.categoryTitle}>{category.title}</Text>
            <Text style={styles.categoryCount}>{category.items.length} issues</Text>
          </View>
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
              onPress={() => navigation.navigate('SupportDetail', { 
                category: category.id, 
                issue: item.id,
                title: item.label 
              })}
              activeOpacity={0.7}
            >
              <View style={styles.categoryItemLeft}>
                <View style={[styles.categoryItemDot, { backgroundColor: category.color }]} />
                <View style={styles.categoryItemInfo}>
                  <Text style={styles.categoryItemText}>{item.label}</Text>
                  <Text style={styles.categoryItemDescription}>{item.description}</Text>
                </View>
              </View>
              <MaterialIcon name="chevron-right" size={20} color="#D1D5DB" />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </Animated.View>
  );

  const renderFAQItem = (item, index) => (
    <TouchableOpacity
      key={item.id}
      style={styles.faqItem}
      onPress={() => handleFAQPress(index)}
      activeOpacity={0.7}
    >
      <View style={styles.faqHeader}>
        <View style={styles.faqLeft}>
          <View style={[styles.faqCategoryBadge, { backgroundColor: SUPPORT_CATEGORIES.find(c => c.id === item.category)?.color + '20' }]}>
            <Text style={[styles.faqCategoryText, { color: SUPPORT_CATEGORIES.find(c => c.id === item.category)?.color }]}>
              {item.category.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.faqQuestion}>{item.question}</Text>
        </View>
        <View style={styles.faqActions}>
          <TouchableOpacity 
            style={styles.faqShareButton}
            onPress={() => handleShareFAQ(item)}
          >
            <MaterialIcon name="share" size={16} color="#666" />
          </TouchableOpacity>
          <MaterialIcon 
            name={expandedFAQ === index ? 'expand-less' : 'expand-more'} 
            size={20} 
            color="#666" 
          />
        </View>
      </View>
      
      {expandedFAQ === index && (
        <View style={styles.faqAnswerContainer}>
          <Text style={styles.faqAnswer}>{item.answer}</Text>
          <Text style={styles.faqHelpful}>
            Was this helpful?{' '}
            <TouchableOpacity onPress={() => Alert.alert('Thanks!', 'Your feedback helps improve our FAQ.')}>
              <Text style={styles.faqHelpfulLink}>Yes</Text>
            </TouchableOpacity>
            {' • '}
            <TouchableOpacity onPress={handleRateSupport}>
              <Text style={styles.faqHelpfulLink}>No</Text>
            </TouchableOpacity>
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderContactMethod = (method) => (
    <TouchableOpacity
      key={method.id}
      style={styles.contactCard}
      onPress={() => {
        if (typeof method.action === 'function') {
          if (method.id === 'chat' || method.id === 'community') {
            method.action(navigation);
          } else {
            method.action();
          }
        }
      }}
      activeOpacity={0.7}
    >
      <View style={styles.contactHeader}>
        <View style={[styles.contactIcon, { backgroundColor: `${method.color}15` }]}>
          <MaterialIcon name={method.icon} size={24} color={method.color} />
        </View>
        <View style={styles.contactAvailability}>
          <View style={[styles.availabilityDot, { 
            backgroundColor: method.availability === 'high' ? '#22C55E' : 
                           method.availability === 'medium' ? '#F59E0B' : '#EF4444' 
          }]} />
          <Text style={styles.availabilityText}>
            {method.availability === 'high' ? 'Online' : 
             method.availability === 'medium' ? 'Limited' : 'Offline'}
          </Text>
        </View>
      </View>
      
      <View style={styles.contactInfo}>
        <Text style={styles.contactTitle}>{method.title}</Text>
        <Text style={styles.contactDescription}>{method.description}</Text>
      </View>
      
      <View style={styles.contactFooter}>
        <View style={styles.contactMeta}>
          <MaterialIcon name="schedule" size={12} color="#666" />
          <Text style={styles.contactMetaText}>{method.hours}</Text>
        </View>
        <View style={styles.contactMeta}>
          <MaterialIcon name="timer" size={12} color="#666" />
          <Text style={styles.contactMetaText}>{method.responseTime}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderRecentTicket = (ticket) => (
    <TouchableOpacity
      key={ticket.id}
      style={styles.ticketCard}
      onPress={() => navigation.navigate('TicketDetail', { ticketId: ticket.id })}
    >
      <View style={styles.ticketHeader}>
        <View style={styles.ticketId}>
          <Text style={styles.ticketIdText}>{ticket.id}</Text>
          {ticket.urgent && (
            <View style={styles.urgentBadge}>
              <Text style={styles.urgentText}>URGENT</Text>
            </View>
          )}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: ticket.status === 'open' ? '#FEF3C7' : '#D1FAE5' }]}>
          <Text style={[styles.statusText, { color: ticket.status === 'open' ? '#92400E' : '#065F46' }]}>
            {ticket.status.toUpperCase()}
          </Text>
        </View>
      </View>
      
      <Text style={styles.ticketMessage} numberOfLines={2}>
        {ticket.message}
      </Text>
      
      <View style={styles.ticketFooter}>
        <View style={styles.ticketMeta}>
          <MaterialIcon name="category" size={14} color="#666" />
          <Text style={styles.ticketMetaText}>{ticket.category}</Text>
        </View>
        <View style={styles.ticketMeta}>
          <MaterialIcon name="attachment" size={14} color="#666" />
          <Text style={styles.ticketMetaText}>{ticket.attachments} files</Text>
        </View>
        <View style={styles.ticketMeta}>
          <MaterialIcon name="schedule" size={14} color="#666" />
          <Text style={styles.ticketMetaText}>{ticket.estimatedResponse}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderContactModal = () => (
    <Modal
      visible={showContactModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowContactModal(false)}
    >
      <View style={styles.modalOverlay}>
        <BlurView
          style={styles.blurView}
          blurType="light"
          blurAmount={10}
          reducedTransparencyFallbackColor="white"
        />
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Contact Support</Text>
            <TouchableOpacity onPress={() => setShowContactModal(false)}>
              <MaterialIcon name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <Text style={styles.modalSubtitle}>
              Choose the best way to contact us based on your issue:
            </Text>

            {CONTACT_METHODS.map(method => (
              <TouchableOpacity
                key={method.id}
                style={styles.modalContactOption}
                onPress={() => {
                  setShowContactModal(false);
                  if (typeof method.action === 'function') {
                    if (method.id === 'chat' || method.id === 'community') {
                      method.action(navigation);
                    } else {
                      method.action();
                    }
                  }
                }}
              >
                <View style={styles.modalContactLeft}>
                  <View style={[styles.modalContactIcon, { backgroundColor: `${method.color}15` }]}>
                    <MaterialIcon name={method.icon} size={20} color={method.color} />
                  </View>
                  <View>
                    <Text style={styles.modalContactTitle}>{method.title}</Text>
                    <Text style={styles.modalContactDescription}>{method.description}</Text>
                  </View>
                </View>
                <MaterialIcon name="chevron-right" size={20} color="#ccc" />
              </TouchableOpacity>
            ))}

            <View style={styles.contactTips}>
              <MaterialIcon name="lightbulb" size={20} color="#F59E0B" />
              <Text style={styles.contactTipsText}>
                <Text style={{ fontWeight: '600' }}>Tip:</Text> For urgent safety issues, use the Emergency SOS button in the app.
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
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
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => navigation.navigate('TicketHistory')}
          >
            <MaterialIcon name="history" size={22} color="#666" />
            {recentTickets.length > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationText}>{recentTickets.length}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.emergencyButton, urgent && styles.emergencyButtonActive]}
            onPress={() => navigation.navigate('SOS')}
          >
            <MaterialIcon name="emergency" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Emergency Banner */}
        <TouchableOpacity 
          style={styles.emergencyBanner}
          onPress={() => navigation.navigate('SOS')}
        >
          <MaterialIcon name="warning" size={24} color="#EF4444" />
          <View style={styles.emergencyContent}>
            <Text style={styles.emergencyTitle}>Emergency Support</Text>
            <Text style={styles.emergencyText}>24/7 Safety Line • Tap for help</Text>
          </View>
          <MaterialIcon name="chevron-right" size={24} color="#EF4444" />
        </TouchableOpacity>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <MaterialIcon name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search help articles, issues..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcon name="close" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        {/* Recent Tickets */}
        {recentTickets.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Tickets</Text>
              <TouchableOpacity onPress={() => navigation.navigate('TicketHistory')}>
                <Text style={styles.seeAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            {recentTickets.map(renderRecentTicket)}
          </View>
        )}

        {/* Quick Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Contact</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.contactScroll}
          >
            {CONTACT_METHODS.map(renderContactMethod)}
          </ScrollView>
          <TouchableOpacity 
            style={styles.contactMoreButton}
            onPress={() => setShowContactModal(true)}
          >
            <Text style={styles.contactMoreText}>More contact options</Text>
            <MaterialIcon name="chevron-right" size={16} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Support Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Browse by Category</Text>
          {filteredCategories.map(renderSupportCategory)}
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
            <TouchableOpacity onPress={() => navigation.navigate('FAQ')}>
              <Text style={styles.seeAllText}>All FAQs</Text>
            </TouchableOpacity>
          </View>
          
          {filteredFAQs.slice(0, 4).map(renderFAQItem)}
          
          {filteredFAQs.length > 4 && (
            <TouchableOpacity 
              style={styles.seeMoreButton}
              onPress={() => navigation.navigate('FAQ')}
            >
              <Text style={styles.seeMoreText}>See {filteredFAQs.length - 4} more questions</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Send Message */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Send us a Message</Text>
          
          <View style={styles.messageHeader}>
            <Text style={styles.messageLabel}>Describe your issue</Text>
            <TouchableOpacity 
              style={[styles.urgentToggle, urgent && styles.urgentToggleActive]}
              onPress={() => setUrgent(!urgent)}
            >
              <MaterialIcon 
                name={urgent ? "flag" : "outlined-flag"} 
                size={16} 
                color={urgent ? "#EF4444" : "#666"} 
              />
              <Text style={[styles.urgentText, urgent && styles.urgentTextActive]}>
                Urgent
              </Text>
            </TouchableOpacity>
          </View>
          
          <TextInput
            style={styles.messageInput}
            placeholder="Provide details about your issue..."
            value={supportMessage}
            onChangeText={(text) => {
              setSupportMessage(text);
              setTyping(text.length > 0);
            }}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          
          {/* Attachments */}
          {attachments.length > 0 && (
            <View style={styles.attachmentsContainer}>
              <Text style={styles.attachmentsTitle}>
                Attachments ({attachments.length})
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {attachments.map(attachment => (
                  <View key={attachment.id} style={styles.attachmentItem}>
                    <MaterialIcon name="attach-file" size={20} color="#666" />
                    <Text style={styles.attachmentName} numberOfLines={1}>
                      {attachment.name}
                    </Text>
                    <TouchableOpacity 
                      style={styles.removeAttachment}
                      onPress={() => removeAttachment(attachment.id)}
                    >
                      <MaterialIcon name="close" size={16} color="#666" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
          
          <View style={styles.messageActions}>
            <TouchableOpacity 
              style={styles.attachButton}
              onPress={handleAddAttachment}
            >
              <MaterialIcon name="attach-file" size={20} color="#666" />
              <Text style={styles.attachText}>Attach File</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.submitButton, (!supportMessage.trim() || isLoading) && styles.submitButtonDisabled]}
              onPress={handleSubmitSupportRequest}
              disabled={!supportMessage.trim() || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <MaterialIcon name="send" size={20} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>
                    {urgent ? 'Send Urgent Request' : 'Send Message'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
          
          {typing && (
            <Text style={styles.typingIndicator}>
              💡 Tip: Be specific about your issue and include relevant details
            </Text>
          )}
        </View>

        {/* Support Hours & Info */}
        <View style={styles.infoGrid}>
          <View style={[styles.infoCard, styles.hoursCard]}>
            <MaterialIcon name="schedule" size={24} color="#3B82F6" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Support Hours</Text>
              <Text style={styles.infoText}>
                • Mon-Fri: 8:00 AM - 8:00 PM{'\n'}
                • Sat-Sun: 9:00 AM - 6:00 PM{'\n'}
                • Emergency: 24/7
              </Text>
            </View>
          </View>
          
          <View style={[styles.infoCard, styles.responseCard]}>
            <MaterialIcon name="timer" size={24} color="#22C55E" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Response Times</Text>
              <Text style={styles.infoText}>
                • Emergency: Immediate{'\n'}
                • Urgent: 2-4 hours{'\n'}
                • Standard: 24-48 hours
              </Text>
            </View>
          </View>
        </View>

        {/* Rate Support Button */}
        <TouchableOpacity 
          style={styles.rateButton}
          onPress={handleRateSupport}
        >
          <MaterialIcon name="star" size={20} color="#F59E0B" />
          <Text style={styles.rateText}>Rate Our Support</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Contact Modal */}
      {renderContactModal()}

      {/* Feedback Modal */}
      <Modal
        visible={showFeedbackModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFeedbackModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.feedbackModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Rate Support</Text>
              <TouchableOpacity onPress={() => setShowFeedbackModal(false)}>
                <MaterialIcon name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <View style={styles.feedbackBody}>
              <Text style={styles.feedbackTitle}>
                How can we improve our support?
              </Text>
              <TextInput
                style={styles.feedbackInput}
                placeholder="Share your suggestions..."
                value={feedback}
                onChangeText={setFeedback}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <TouchableOpacity 
                style={[styles.submitButton, !feedback.trim() && styles.submitButtonDisabled]}
                onPress={submitFeedback}
                disabled={!feedback.trim()}
              >
                <Text style={styles.submitButtonText}>Submit Feedback</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
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
    zIndex: 1000,
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  emergencyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  emergencyButtonActive: {
    borderColor: '#EF4444',
    backgroundColor: '#FEE2E2',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  notificationText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emergencyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  emergencyContent: {
    flex: 1,
    marginLeft: 12,
  },
  emergencyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
    marginBottom: 4,
  },
  emergencyText: {
    fontSize: 14,
    color: '#DC2626',
    opacity: 0.9,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginBottom: 24,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
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
    position: 'relative',
  },
  urgencyBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
  },
  categoryCount: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  categoryDescription: {
    fontSize: 14,
    color: '#666',
  },
  categoryItems: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingVertical: 8,
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
  categoryItemLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  categoryItemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    marginRight: 12,
  },
  categoryItemInfo: {
    flex: 1,
  },
  categoryItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 2,
  },
  categoryItemDescription: {
    fontSize: 12,
    color: '#666',
  },
  contactScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  contactCard: {
    width: 160,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  contactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactAvailability: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  availabilityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  availabilityText: {
    fontSize: 10,
    color: '#666',
  },
  contactInfo: {
    marginBottom: 12,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  contactDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  contactFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  contactMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  contactMetaText: {
    fontSize: 10,
    color: '#666',
  },
  contactMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 12,
    gap: 4,
  },
  contactMoreText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  ticketCard: {
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
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ticketId: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ticketIdText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  urgentBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  urgentText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#DC2626',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  ticketMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ticketMetaText: {
    fontSize: 12,
    color: '#666',
  },
  faqItem: {
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
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  faqLeft: {
    flex: 1,
  },
  faqCategoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 8,
  },
  faqCategoryText: {
    fontSize: 10,
    fontWeight: '600',
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
    lineHeight: 20,
  },
  faqActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 12,
  },
  faqShareButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  faqAnswerContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  faqAnswer: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  faqHelpful: {
    fontSize: 12,
    color: '#666',
  },
  faqHelpfulLink: {
    color: '#3B82F6',
    fontWeight: '500',
  },
  seeMoreButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  seeMoreText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  messageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  urgentToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  urgentToggleActive: {
    backgroundColor: '#FEE2E2',
  },
  urgentText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  urgentTextActive: {
    color: '#DC2626',
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
  attachmentsContainer: {
    marginBottom: 16,
  },
  attachmentsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    minWidth: 120,
  },
  attachmentName: {
    fontSize: 12,
    color: '#666',
    flex: 1,
    marginHorizontal: 8,
  },
  removeAttachment: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
  },
  messageActions: {
    flexDirection: 'row',
    gap: 12,
  },
  attachButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  attachText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  submitButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22C55E',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  typingIndicator: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  infoCard: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  hoursCard: {
    backgroundColor: '#EFF6FF',
  },
  responseCard: {
    backgroundColor: '#F0F9F0',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  rateText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  blurView: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: height * 0.8,
  },
  feedbackModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  modalBody: {
    padding: 20,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  modalContactOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalContactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalContactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  modalContactDescription: {
    fontSize: 12,
    color: '#666',
  },
  contactTips: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEFCE8',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 20,
  },
  contactTipsText: {
    fontSize: 12,
    color: '#666',
    flex: 1,
    lineHeight: 16,
  },
  feedbackBody: {
    padding: 20,
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
    textAlign: 'center',
  },
  feedbackInput: {
    backgroundColor: '#F9FAFB',
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
});