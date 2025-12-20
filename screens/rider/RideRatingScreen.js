// screens/rider/RideRatingScreen.js
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
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const RATING_TAGS = [
  { id: 'safe_driver', label: 'Safe Driver', icon: 'shield-check' },
  { id: 'good_conversation', label: 'Good Conversation', icon: 'chat' },
  { id: 'clean_vehicle', label: 'Clean Vehicle', icon: 'car-wash' },
  { id: 'fast_arrival', label: 'Fast Arrival', icon: 'timer' },
  { id: 'helpful', label: 'Helpful', icon: 'handshake' },
  { id: 'good_navigation', label: 'Good Navigation', icon: 'map-marker-path' },
];

export default function RideRatingScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { rideId, driver } = route.params || {};
  
  const [rating, setRating] = useState(5);
  const [selectedTags, setSelectedTags] = useState([]);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTagToggle = (tagId) => {
    if (selectedTags.includes(tagId)) {
      setSelectedTags(selectedTags.filter(id => id !== tagId));
    } else {
      setSelectedTags([...selectedTags, tagId]);
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a star rating');
      return;
    }

    setIsSubmitting(true);

    try {
      // In production, this would be an API call
      const ratingData = {
        rideId: rideId || `ride-${Date.now()}`,
        driverId: driver?.id || 'driver-001',
        rating,
        tags: selectedTags,
        comment: comment.trim(),
        timestamp: new Date().toISOString(),
      };

      // Save locally
      const existingRatings = await AsyncStorage.getItem('user_ratings');
      const ratings = existingRatings ? JSON.parse(existingRatings) : [];
      ratings.push(ratingData);
      await AsyncStorage.setItem('user_ratings', JSON.stringify(ratings));

      // Update driver stats (simulated)
      const driverStats = await AsyncStorage.getItem(`driver_stats_${driver?.id}`);
      const stats = driverStats ? JSON.parse(driverStats) : { totalRatings: 0, sumRatings: 0, tags: {} };
      
      stats.totalRatings += 1;
      stats.sumRatings += rating;
      selectedTags.forEach(tag => {
        stats.tags[tag] = (stats.tags[tag] || 0) + 1;
      });
      
      await AsyncStorage.setItem(`driver_stats_${driver?.id}`, JSON.stringify(stats));

      // Show success
      Alert.alert(
        'Rating Submitted',
        'Thank you for your feedback!',
        [
          {
            text: 'Done',
            onPress: () => navigation.navigate('RideHistory'),
          },
        ]
      );

    } catch (error) {
      console.error('Error submitting rating:', error);
      Alert.alert('Error', 'Failed to submit rating. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          style={styles.starButton}
          onPress={() => setRating(i)}
          activeOpacity={0.7}
        >
          <MaterialIcon
            name={i <= rating ? "star" : "star-border"}
            size={48}
            color="#F59E0B"
          />
        </TouchableOpacity>
      );
    }
    return stars;
  };

  const renderRatingTag = (tag) => {
    const isSelected = selectedTags.includes(tag.id);
    
    return (
      <TouchableOpacity
        key={tag.id}
        style={[
          styles.tagButton,
          isSelected && styles.tagButtonSelected,
        ]}
        onPress={() => handleTagToggle(tag.id)}
      >
        <MaterialCommunityIcon
          name={tag.icon}
          size={16}
          color={isSelected ? '#FFFFFF' : '#666'}
        />
        <Text style={[
          styles.tagText,
          isSelected && styles.tagTextSelected,
        ]}>
          {tag.label}
        </Text>
      </TouchableOpacity>
    );
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
        <Text style={styles.headerTitle}>Rate Your Ride</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Driver Info */}
        <View style={styles.driverCard}>
          <View style={styles.driverAvatar}>
            <Text style={styles.driverInitials}>
              {driver?.name?.split(' ').map(n => n[0]).join('') || 'JB'}
            </Text>
          </View>
          <View style={styles.driverInfo}>
            <Text style={styles.driverName}>{driver?.name || 'John Banda'}</Text>
            <Text style={styles.driverVehicle}>
              {driver?.vehicle || 'Toyota Corolla'} • {driver?.plate || 'LL 2345 A'}
            </Text>
          </View>
        </View>

        {/* Rating Question */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How was your ride?</Text>
          <Text style={styles.sectionSubtitle}>
            Your feedback helps drivers improve
          </Text>
        </View>

        {/* Star Rating */}
        <View style={styles.starsContainer}>
          <View style={styles.starsRow}>{renderStars()}</View>
          <Text style={styles.ratingText}>
            {rating === 5 ? 'Excellent' : 
             rating === 4 ? 'Good' : 
             rating === 3 ? 'Average' : 
             rating === 2 ? 'Poor' : 'Very Poor'}
          </Text>
        </View>

        {/* Rating Tags */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What was great?</Text>
          <Text style={styles.sectionSubtitle}>
            Select all that apply (optional)
          </Text>
          <View style={styles.tagsContainer}>
            {RATING_TAGS.map(renderRatingTag)}
          </View>
        </View>

        {/* Additional Comments */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional feedback</Text>
          <Text style={styles.sectionSubtitle}>
            Share more details about your experience
          </Text>
          <TextInput
            style={styles.commentInput}
            placeholder="Tell us about your ride..."
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={500}
          />
          <Text style={styles.charCount}>
            {comment.length}/500 characters
          </Text>
        </View>

        {/* Privacy Note */}
        <View style={styles.privacyNote}>
          <MaterialIcon name="privacy-tip" size={16} color="#666" />
          <Text style={styles.privacyText}>
            Your rating is anonymous. Drivers can see feedback but not who left it.
          </Text>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[
            styles.submitButton,
            isSubmitting && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Text style={styles.submitButtonText}>Submitting...</Text>
          ) : (
            <>
              <MaterialIcon name="send" size={20} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>Submit Rating</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
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
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 100,
  },
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  driverAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  driverInitials: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  driverVehicle: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  starsContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  starButton: {
    padding: 8,
  },
  ratingText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#F59E0B',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginTop: 8,
  },
  tagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    margin: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  tagButtonSelected: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },
  tagText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  tagTextSelected: {
    color: '#FFFFFF',
  },
  commentInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#000000',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 8,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEFCE8',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    gap: 12,
  },
  privacyText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
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
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});