// screens/rider/RideRatingScreen.js
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
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { MaterialIconFallback as MaterialIcon } from '@src/utils/iconUtils';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import ConfettiCannon from 'react-native-confetti-cannon';

const { width, height } = Dimensions.get('window');

// Enhanced rating tags with colors and icons
const RATING_TAGS = [
  { 
    id: 'safe_driver', 
    label: 'Safe Driver', 
    icon: 'shield-check',
    color: '#22C55E',
    gradient: ['#22C55E', '#10B981']
  },
  { 
    id: 'good_conversation', 
    label: 'Good Conversation', 
    icon: 'chat',
    color: '#3B82F6',
    gradient: ['#3B82F6', '#2563EB']
  },
  { 
    id: 'clean_vehicle', 
    label: 'Clean Vehicle', 
    icon: 'car-wash',
    color: '#8B5CF6',
    gradient: ['#8B5CF6', '#7C3AED']
  },
  { 
    id: 'fast_arrival', 
    label: 'Fast Arrival', 
    icon: 'timer',
    color: '#F59E0B',
    gradient: ['#F59E0B', '#D97706']
  },
  { 
    id: 'helpful', 
    label: 'Helpful', 
    icon: 'handshake',
    color: '#EC4899',
    gradient: ['#EC4899', '#DB2777']
  },
  { 
    id: 'good_navigation', 
    label: 'Good Navigation', 
    icon: 'map-marker-path',
    color: '#06B6D4',
    gradient: ['#06B6D4', '#0891B2']
  },
];

// Negative tags for lower ratings
const NEGATIVE_TAGS = [
  { 
    id: 'unsafe_driving', 
    label: 'Unsafe Driving', 
    icon: 'car-cog',
    color: '#EF4444',
    gradient: ['#EF4444', '#DC2626']
  },
  { 
    id: 'late_arrival', 
    label: 'Late Arrival', 
    icon: 'timer-off',
    color: '#F59E0B',
    gradient: ['#F59E0B', '#D97706']
  },
  { 
    id: 'dirty_vehicle', 
    label: 'Dirty Vehicle', 
    icon: 'delete',
    color: '#6B7280',
    gradient: ['#6B7280', '#4B5563']
  },
  { 
    id: 'rude_driver', 
    label: 'Rude Driver', 
    icon: 'account-off',
    color: '#DC2626',
    gradient: ['#DC2626', '#B91C1C']
  },
  { 
    id: 'poor_navigation', 
    label: 'Poor Navigation', 
    icon: 'map-marker-off',
    color: '#7C3AED',
    gradient: ['#7C3AED', '#6D28D9']
  },
  { 
    id: 'overcharged', 
    label: 'Overcharged', 
    icon: 'cash-remove',
    color: '#F59E0B',
    gradient: ['#F59E0B', '#D97706']
  },
];

// Animated components
const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);
const AnimatedText = Animated.createAnimatedComponent(Text);
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export default function RideRatingScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { rideId, driver, rideData } = route.params || {};
  
  // States
  const [rating, setRating] = useState(5);
  const [selectedTags, setSelectedTags] = useState([]);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [selectedEmotion, setSelectedEmotion] = useState(null);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const starScale = useRef(new Animated.Value(0)).current;
  const starRotation = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.95)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const headerOpacity = useRef(new Animated.Value(1)).current;
  const tagScale = useRef(new Animated.Value(0.9)).current;
  const tagOpacity = useRef(new Animated.Value(0)).current;
  const commentScale = useRef(new Animated.Value(0.95)).current;
  const submitButtonScale = useRef(new Animated.Value(1)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;

  // Emotions for rating
  const emotions = [
    { id: 1, emoji: '😡', label: 'Terrible', min: 1, max: 1 },
    { id: 2, emoji: '😟', label: 'Poor', min: 2, max: 2 },
    { id: 3, emoji: '😐', label: 'Average', min: 3, max: 3 },
    { id: 4, emoji: '🙂', label: 'Good', min: 4, max: 4 },
    { id: 5, emoji: '😄', label: 'Excellent', min: 5, max: 5 },
  ];

  // Animation on mount
  useEffect(() => {
    animateIn();
  }, []);

  const animateIn = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(slideUpAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.sequence([
        Animated.delay(200),
        Animated.spring(starScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 60,
          friction: 7,
        }),
        Animated.spring(starRotation, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 5,
        }),
      ]),
      Animated.spring(cardScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
        delay: 100,
      }),
      Animated.spring(tagScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
        delay: 300,
      }),
      Animated.timing(tagOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
        delay: 300,
      }),
      Animated.spring(commentScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
        delay: 400,
      }),
    ]).start();
  };

  const handleRatingSelect = (newRating) => {
    // Star animation
    Animated.sequence([
      Animated.spring(starScale, {
        toValue: 1.2,
        useNativeDriver: true,
        tension: 150,
        friction: 3,
      }),
      Animated.spring(starScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 150,
        friction: 3,
      }),
    ]).start();

    setRating(newRating);
    
    // Update emotion based on rating
    const emotion = emotions.find(e => newRating >= e.min && newRating <= e.max);
    setSelectedEmotion(emotion?.id || null);
    
    // Clear tags if rating changes dramatically
    if (Math.abs(newRating - rating) >= 2) {
      setSelectedTags([]);
    }
  };

  const handleTagToggle = (tagId) => {
    Animated.sequence([
      Animated.spring(tagScale, {
        toValue: 0.95,
        useNativeDriver: true,
        tension: 150,
        friction: 3,
      }),
      Animated.spring(tagScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 150,
        friction: 3,
      }),
    ]).start();

    if (selectedTags.includes(tagId)) {
      setSelectedTags(selectedTags.filter(id => id !== tagId));
    } else {
      setSelectedTags([...selectedTags, tagId]);
    }
  };

  const handleEmotionSelect = (emotionId) => {
    const emotion = emotions.find(e => e.id === emotionId);
    if (emotion) {
      handleRatingSelect(emotion.min);
    }
  };

  const showSuccessAnimation = () => {
    setShowConfetti(true);
    
    Animated.parallel([
      Animated.spring(successScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
      Animated.timing(successOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Hide confetti after 3 seconds
    setTimeout(() => setShowConfetti(false), 3000);
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a star rating');
      return;
    }

    setIsSubmitting(true);

    // Button press animation
    Animated.sequence([
      Animated.spring(submitButtonScale, {
        toValue: 0.95,
        useNativeDriver: true,
        tension: 150,
        friction: 3,
      }),
      Animated.spring(submitButtonScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 150,
        friction: 3,
      }),
    ]).start();

    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Save rating data
      const ratingData = {
        rideId: rideId || `ride-${Date.now()}`,
        driverId: driver?.id || 'driver-001',
        driverName: driver?.name || 'John Banda',
        rating,
        tags: selectedTags,
        comment: comment.trim(),
        emotion: selectedEmotion,
        timestamp: new Date().toISOString(),
      };

      // Save locally
      const existingRatings = await AsyncStorage.getItem('user_ratings');
      const ratings = existingRatings ? JSON.parse(existingRatings) : [];
      ratings.push(ratingData);
      await AsyncStorage.setItem('user_ratings', JSON.stringify(ratings));

      // Show success animation
      showSuccessAnimation();

      // Success message with delay
      setTimeout(() => {
        Alert.alert(
          '🎉 Thank You!',
          'Your feedback helps drivers improve and keeps our community safe.',
          [
            {
              text: 'View Ride History',
              onPress: () => navigation.navigate('RideHistory'),
              style: 'default',
            },
            {
              text: 'Book Another Ride',
              onPress: () => navigation.navigate('RiderHome'),
              style: 'cancel',
            },
          ]
        );
      }, 800);

    } catch (error) {
      console.error('Error submitting rating:', error);
      Alert.alert('Error', 'Failed to submit rating. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = () => {
    const stars = [];
    const starRotationInterpolate = starRotation.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });

    for (let i = 1; i <= 5; i++) {
      stars.push(
        <AnimatedTouchable
          key={i}
          style={[
            styles.starButton,
            {
              transform: [
                { scale: starScale },
                { rotate: i === 5 ? starRotationInterpolate : '0deg' },
              ],
            },
          ]}
          onPress={() => handleRatingSelect(i)}
          activeOpacity={0.7}
        >
          <MaterialIcon
            name={i <= rating ? "star" : "star-border"}
            size={56}
            color="#F59E0B"
          />
        </AnimatedTouchable>
      );
    }
    return stars;
  };

  const renderRatingTag = (tag) => {
    const isSelected = selectedTags.includes(tag.id);
    
    return (
      <AnimatedView
        key={tag.id}
        style={[
          styles.tagContainer,
          {
            opacity: tagOpacity,
            transform: [{ scale: tagScale }],
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.tagButton,
            isSelected && styles.tagButtonSelected,
          ]}
          onPress={() => handleTagToggle(tag.id)}
          activeOpacity={0.7}
        >
          {isSelected ? (
            <LinearGradient
              colors={tag.gradient}
              style={styles.tagGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialCommunityIcon
                name={tag.icon}
                size={18}
                color="#FFFFFF"
              />
            </LinearGradient>
          ) : (
            <MaterialCommunityIcon
              name={tag.icon}
              size={18}
              color={tag.color}
            />
          )}
          <Text style={[
            styles.tagText,
            isSelected && styles.tagTextSelected,
          ]}>
            {tag.label}
          </Text>
        </TouchableOpacity>
      </AnimatedView>
    );
  };

  const renderEmotion = (emotion) => {
    const isActive = selectedEmotion === emotion.id;
    
    return (
      <TouchableOpacity
        key={emotion.id}
        style={[
          styles.emotionButton,
          isActive && styles.emotionButtonActive,
        ]}
        onPress={() => handleEmotionSelect(emotion.id)}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.emotionEmoji,
          isActive && styles.emotionEmojiActive,
        ]}>
          {emotion.emoji}
        </Text>
        <Text style={[
          styles.emotionLabel,
          isActive && styles.emotionLabelActive,
        ]}>
          {emotion.label}
        </Text>
      </TouchableOpacity>
    );
  };

  const getRatingText = () => {
    switch(rating) {
      case 5: return 'Excellent!';
      case 4: return 'Good';
      case 3: return 'Average';
      case 2: return 'Poor';
      case 1: return 'Terrible';
      default: return 'Select Rating';
    }
  };

  const getRatingDescription = () => {
    switch(rating) {
      case 5: return 'Everything was perfect!';
      case 4: return 'Good overall experience';
      case 3: return 'It was okay';
      case 2: return 'Needs improvement';
      case 1: return 'Very disappointing';
      default: return 'How was your ride?';
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Confetti Cannon */}
      {showConfetti && (
        <ConfettiCannon
          count={200}
          origin={{ x: width / 2, y: -10 }}
          autoStart={true}
          fadeOut={true}
        />
      )}

      {/* HEADER */}
      <AnimatedView style={[styles.header, { opacity: headerOpacity }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcon name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Rate Your Ride</Text>
          <Text style={styles.headerSubtitle}>Help us improve</Text>
        </View>
        
        <View style={styles.headerPlaceholder} />
      </AnimatedView>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* DRIVER INFO CARD */}
        <AnimatedView 
          style={[
            styles.driverCard,
            {
              opacity: fadeAnim,
              transform: [
                { scale: cardScale },
                { translateY: slideUpAnim },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={['#22C55E', '#10B981']}
            style={styles.driverCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.driverCardContent}>
              <View style={styles.driverAvatar}>
                <MaterialIcon name="person" size={28} color="#FFFFFF" />
              </View>
              
              <View style={styles.driverInfo}>
                <Text style={styles.driverName}>
                  {driver?.name || 'John Banda'}
                </Text>
                <Text style={styles.driverVehicle}>
                  {rideData?.vehicle || 'Toyota Corolla'} • {rideData?.plate || 'LL 2345 A'}
                </Text>
                
                <View style={styles.rideInfo}>
                  <View style={styles.infoBadge}>
                    <MaterialIcon name="location-pin" size={12} color="#FFFFFF" />
                    <Text style={styles.infoText}>
                      {rideData?.distance || '2.5 km'}
                    </Text>
                  </View>
                  
                  <View style={styles.infoBadge}>
                    <MaterialIcon name="timer" size={12} color="#FFFFFF" />
                    <Text style={styles.infoText}>
                      {rideData?.duration || '8 min'}
                    </Text>
                  </View>
                  
                  <View style={styles.infoBadge}>
                    <MaterialIcon name="attach-money" size={12} color="#FFFFFF" />
                    <Text style={styles.infoText}>
                      {rideData?.fare ? `MK ${rideData.fare}` : 'MK 850'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </LinearGradient>
        </AnimatedView>

        {/* RATING QUESTION */}
        <AnimatedView 
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideUpAnim }],
            },
          ]}
        >
          <Text style={styles.sectionTitle}>How was your ride?</Text>
          <Text style={styles.sectionSubtitle}>
            Your honest feedback helps drivers improve their service
          </Text>
        </AnimatedView>

        {/* EMOTION SELECTOR */}
        <AnimatedView 
          style={[
            styles.emotionsContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideUpAnim }],
            },
          ]}
        >
          {emotions.map(renderEmotion)}
        </AnimatedView>

        {/* STAR RATING */}
        <AnimatedView 
          style={[
            styles.starsContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideUpAnim }],
            },
          ]}
        >
          <View style={styles.starsRow}>{renderStars()}</View>
          
          <AnimatedView style={styles.ratingTextContainer}>
            <Text style={styles.ratingText}>{getRatingText()}</Text>
            <Text style={styles.ratingDescription}>{getRatingDescription()}</Text>
          </AnimatedView>
        </AnimatedView>

        {/* RATING TAGS */}
        <AnimatedView 
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideUpAnim }],
            },
          ]}
        >
          <Text style={styles.sectionTitle}>
            {rating >= 3 ? 'What was great?' : 'What went wrong?'}
          </Text>
          <Text style={styles.sectionSubtitle}>
            Select all that apply (optional)
          </Text>
          
          <View style={styles.tagsContainer}>
            {(rating >= 3 ? RATING_TAGS : NEGATIVE_TAGS).map(renderRatingTag)}
          </View>
        </AnimatedView>

        {/* ADDITIONAL COMMENTS */}
        <AnimatedView 
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [
                { scale: commentScale },
                { translateY: slideUpAnim },
              ],
            },
          ]}
        >
          <Text style={styles.sectionTitle}>Additional feedback</Text>
          <Text style={styles.sectionSubtitle}>
            Share more details about your experience
          </Text>
          
          <View style={styles.commentContainer}>
            <TextInput
              style={styles.commentInput}
              placeholder="Tell us more about your ride experience..."
              placeholderTextColor="#999"
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
            />
            
            <View style={styles.commentFooter}>
              <View style={styles.commentInfo}>
                <MaterialIcon name="info" size={14} color="#666" />
                <Text style={styles.commentInfoText}>
                  Your comments help improve service quality
                </Text>
              </View>
              
              <Text style={styles.charCount}>
                {comment.length}/500
              </Text>
            </View>
          </View>
        </AnimatedView>

        {/* PRIVACY NOTE */}
        <AnimatedView 
          style={[
            styles.privacyNote,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideUpAnim }],
            },
          ]}
        >
          <View style={styles.privacyIcon}>
            <MaterialIcon name="privacy-tip" size={20} color="#22C55E" />
          </View>
          <View style={styles.privacyContent}>
            <Text style={styles.privacyTitle}>Your privacy is protected</Text>
            <Text style={styles.privacyText}>
              Your rating is anonymous. Drivers can see feedback but not who left it.
              We never share your personal information.
            </Text>
          </View>
        </AnimatedView>
      </ScrollView>

      {/* SUBMIT BUTTON */}
      <AnimatedView 
        style={[
          styles.footer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideUpAnim }],
          },
        ]}
      >
        <AnimatedTouchable 
          style={[
            styles.submitButton,
            {
              transform: [{ scale: submitButtonScale }],
            },
            isSubmitting && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#22C55E', '#10B981']}
            style={styles.submitButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <MaterialIcon name="stars" size={20} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>Submit Rating</Text>
              </>
            )}
          </LinearGradient>
        </AnimatedTouchable>
        
        <TouchableOpacity 
          style={styles.skipButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.skipText}>Skip Rating</Text>
        </TouchableOpacity>
      </AnimatedView>

      {/* SUCCESS OVERLAY */}
      <AnimatedView 
        style={[
          styles.successOverlay,
          {
            opacity: successOpacity,
            transform: [{ scale: successScale }],
            display: successOpacity.__getValue() > 0 ? 'flex' : 'none',
          },
        ]}
        pointerEvents="none"
      >
        <View style={styles.successContent}>
          <MaterialIcon name="check-circle" size={80} color="#22C55E" />
          <Text style={styles.successTitle}>Rating Submitted!</Text>
          <Text style={styles.successSubtitle}>Thank you for your feedback</Text>
        </View>
      </AnimatedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  
  // HEADER
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    zIndex: 100,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  headerPlaceholder: {
    width: 40,
  },
  
  // CONTENT
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 140,
  },
  
  // DRIVER CARD
  driverCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  driverCardGradient: {
    padding: 20,
  },
  driverCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  driverVehicle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 12,
  },
  rideInfo: {
    flexDirection: 'row',
    gap: 12,
  },
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  infoText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  
  // SECTIONS
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  
  // EMOTIONS
  emotionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  emotionButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 20,
    width: (width - 60) / 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  emotionButtonActive: {
    backgroundColor: '#22C55E',
    transform: [{ scale: 1.05 }],
  },
  emotionEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  emotionEmojiActive: {
    color: '#FFFFFF',
  },
  emotionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  emotionLabelActive: {
    color: '#FFFFFF',
  },
  
  // STARS
  starsContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  starButton: {
    padding: 8,
  },
  ratingTextContainer: {
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F59E0B',
    marginBottom: 4,
  },
  ratingDescription: {
    fontSize: 16,
    color: '#666',
  },
  
  // TAGS
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  tagContainer: {
    width: '50%',
    padding: 4,
  },
  tagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  tagButtonSelected: {
    borderWidth: 0,
  },
  tagGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
  },
  tagTextSelected: {
    color: '#FFFFFF',
  },
  
  // COMMENTS
  commentContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  commentInput: {
    padding: 20,
    fontSize: 16,
    color: '#000000',
    minHeight: 140,
    textAlignVertical: 'top',
  },
  commentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  commentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  commentInfoText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
    flex: 1,
  },
  charCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  
  // PRIVACY NOTE
  privacyNote: {
    flexDirection: 'row',
    backgroundColor: '#F0F9FF',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
  },
  privacyIcon: {
    marginRight: 12,
  },
  privacyContent: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  privacyText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  
  // FOOTER
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  submitButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipText: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  
  // SUCCESS OVERLAY
  successOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  successContent: {
    alignItems: 'center',
    padding: 40,
  },
  successTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#000000',
    marginTop: 24,
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
});