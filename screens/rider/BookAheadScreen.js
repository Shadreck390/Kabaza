// screens/rider/BookAheadScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
  FlatList,
  Alert,
  Animated,
} from 'react-native';
import { MaterialIconFallback as MaterialIcon } from '@src/utils/iconUtils';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function BookAheadScreen({ navigation }) {
  const [step, setStep] = useState(1);
  const [bookingDetails, setBookingDetails] = useState({
    pickupLocation: '',
    dropoffLocation: '',
    date: new Date(),
    time: new Date(),
    returnTrip: false,
    returnDate: new Date(),
    returnTime: new Date(),
    rideType: 'kabaza',
    passengers: 1,
    luggage: 0,
    specialRequests: '',
    estimatedPrice: 'MK 4,500 - MK 6,500',
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showReturnDatePicker, setShowReturnDatePicker] = useState(false);
  const [showReturnTimePicker, setShowReturnTimePicker] = useState(false);

  const rideTypes = [
    { id: 'kabaza', name: 'Kabaza', icon: 'motorcycle', capacity: 1, basePrice: 4500, time: 'Fast' },
    { id: 'comfort', name: 'Comfort', icon: 'directions-car', capacity: 4, basePrice: 6500, time: 'Standard' },
    { id: 'green', name: 'Green', icon: 'eco', capacity: 3, basePrice: 5500, time: 'Eco-friendly' },
    { id: 'xl', name: 'XL', icon: 'car-rental', capacity: 6, basePrice: 8500, time: 'Spacious' },
  ];

  const popularDestinations = [
    { id: '1', name: 'Kamuzu International Airport', address: 'Lilongwe', icon: 'flight' },
    { id: '2', name: 'Lilongwe City Mall', address: 'City Center', icon: 'shopping-mall' },
    { id: '3', name: 'Bingu National Stadium', address: 'Area 18', icon: 'stadium' },
    { id: '4', name: 'Crossroads Hotel', address: 'Area 3', icon: 'hotel' },
  ];

  const formatDate = (date) => {
    return date.toLocaleDateString('en-MW', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (time) => {
    return time.toLocaleTimeString('en-MW', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setBookingDetails({ ...bookingDetails, date: selectedDate });
    }
  };

  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      setBookingDetails({ ...bookingDetails, time: selectedTime });
    }
  };

  const handleReturnDateChange = (event, selectedDate) => {
    setShowReturnDatePicker(false);
    if (selectedDate) {
      setBookingDetails({ ...bookingDetails, returnDate: selectedDate });
    }
  };

  const handleReturnTimeChange = (event, selectedTime) => {
    setShowReturnTimePicker(false);
    if (selectedTime) {
      setBookingDetails({ ...bookingDetails, returnTime: selectedTime });
    }
  };

  const getLocationDotStyle = (isPickup) => ({
    backgroundColor: isPickup ? '#00a82d' : '#ccc'
  });

  const getRideIconColor = (isSelected) => isSelected ? '#00a82d' : '#666';

  const getToggleStyle = (isActive) => ({
    backgroundColor: isActive ? '#00a82d' : '#e0e0e0'
  });

  const getNextButtonStyle = () => {
    return bookingDetails.pickupLocation && bookingDetails.dropoffLocation 
      ? styles.nextButton 
      : styles.nextButtonDisabled;
  };

  const navigateToRideConfirmation = () => {
    if (!bookingDetails.pickupLocation || !bookingDetails.dropoffLocation) {
      Alert.alert('Error', 'Please enter pickup and dropoff locations');
      return;
    }

    if (!bookingDetails.pickupCoordinates || !bookingDetails.dropoffCoordinates) {
      Alert.alert('Error', 'Location coordinates missing. Please select locations again.');
      return;
    }

    const selectedRide = rideTypes.find((ride) => ride.id === bookingDetails.rideType);

    navigation.navigate('RideConfirmation', {
      ride: {
        name: selectedRide?.name || 'Kabaza',
        vehicleType: bookingDetails.rideType,
        basePrice: selectedRide?.basePrice || 4500,
        estimatedTime: '5-10 min',
        distance: '0 km',
      },
      destination: bookingDetails.dropoffLocation,
      destinationAddress: bookingDetails.dropoffAddress || bookingDetails.dropoffLocation,
      destinationCoords: bookingDetails.dropoffCoordinates,
      pickupLocation: bookingDetails.pickupLocation,
      pickupCoords: bookingDetails.pickupCoordinates,
      riderInfo: {
        paymentMethod: 'cash',
        usePromo: false,
        promoDiscount: 0,
        userId: 'user_1771924083518',
        userName: 'Rider',
      },
      isScheduled: true,
      scheduleDetails: {
        date: bookingDetails.date,
        time: bookingDetails.time,
        returnTrip: bookingDetails.returnTrip,
        returnDate: bookingDetails.returnDate,
        returnTime: bookingDetails.returnTime,
        passengers: bookingDetails.passengers,
        luggage: bookingDetails.luggage,
        specialRequests: bookingDetails.specialRequests,
      },
      socketRequestId: `ride_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    });
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Where are you going?</Text>
      <Text style={styles.stepSubtitle}>Enter your trip details</Text>

      {/* Pickup Location */}
      <TouchableOpacity 
        style={styles.locationCard}
        onPress={() => navigation.navigate('SearchLocation', {
          onLocationSelect: (location) => {
            setBookingDetails({
              ...bookingDetails,
              pickupLocation: location.name,
              pickupCoordinates: location.coordinates,
              pickupAddress: location.address
            });
          },
          type: 'pickup'
        })}
      >
        <View style={[styles.locationDot, { backgroundColor: bookingDetails.pickupLocation ? '#00a82d' : '#ccc' }]} />
        <View style={styles.locationContent}>
          <Text style={styles.locationLabel}>PICKUP</Text>
          <Text style={bookingDetails.pickupLocation ? styles.locationText : styles.locationPlaceholder}>
            {bookingDetails.pickupLocation || 'Select pickup location'}
          </Text>
          <Text style={bookingDetails.pickupAddress ? styles.locationAddress : styles.locationPlaceholder}>
            {bookingDetails.pickupAddress || 'Select pickup address'}
          </Text>
        </View>
        <MaterialIcon name="search" size={20} color="#666" />
      </TouchableOpacity>

      {/* Dropoff Location */}
      <TouchableOpacity 
        style={styles.locationCard}
        onPress={() => navigation.navigate('SearchLocation', {
          onLocationSelect: (location) => {
            setBookingDetails({
              ...bookingDetails,
              dropoffLocation: location.name,
              dropoffCoordinates: location.coordinates,
              dropoffAddress: location.address
            });
          },
          type: 'dropoff'
        })}
      >
        <View style={[styles.locationDot, { backgroundColor: bookingDetails.dropoffLocation ? '#ff4444' : '#ccc' }]} />
        <View style={styles.locationContent}>
          <Text style={styles.locationLabel}>DROPOFF</Text>
          <Text style={bookingDetails.dropoffLocation ? styles.locationText : styles.locationPlaceholder}>
            {bookingDetails.dropoffLocation || 'Select dropoff location'}
          </Text>
        </View>
        <MaterialIcon name="search" size={20} color="#666" />
      </TouchableOpacity>

      {/* Swap Locations */}
      {bookingDetails.pickupLocation && bookingDetails.dropoffLocation && (
        <TouchableOpacity 
          style={styles.swapButton}
          onPress={() => setBookingDetails({
            ...bookingDetails,
            pickupLocation: bookingDetails.dropoffLocation,
            dropoffLocation: bookingDetails.pickupLocation,
          })}
        >
          <MaterialIcon name="swap-vert" size={20} color="#00a82d" />
          <Text style={styles.swapText}>Swap locations</Text>
        </TouchableOpacity>
      )}

      {/* Popular Destinations */}
      <Text style={styles.sectionTitle}>Popular Destinations</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.popularContainer}>
        {popularDestinations.map((dest) => (
          <TouchableOpacity
            key={dest.id}
            style={styles.popularCard}
            onPress={() => setBookingDetails({
              ...bookingDetails,
              dropoffLocation: dest.name,
              dropoffAddress: dest.address
            })}
          >
            <View style={styles.popularIcon}>
              <MaterialIcon name={dest.icon} size={24} color="#00a82d" />
            </View>
            <Text style={styles.popularName}>{dest.name}</Text>
            <Text style={styles.popularAddress}>{dest.address}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity 
        style={bookingDetails.pickupLocation && bookingDetails.dropoffLocation ? styles.nextButton : styles.nextButtonDisabled}
        onPress={() => setStep(2)}
        disabled={!bookingDetails.pickupLocation || !bookingDetails.dropoffLocation}
      >
        <Text style={styles.nextButtonText}>Continue</Text>
        <MaterialIcon name="arrow-forward" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>When?</Text>
      <Text style={styles.stepSubtitle}>Select date and time for your trip</Text>

      {/* Date Selection */}
      <TouchableOpacity 
        style={styles.dateTimeCard}
        onPress={() => setShowDatePicker(true)}
      >
        <View style={styles.dateTimeIcon}>
          <MaterialIcon name="calendar-today" size={24} color="#00a82d" />
        </View>
        <View style={styles.dateTimeInfo}>
          <Text style={styles.dateTimeLabel}>DEPARTURE DATE</Text>
          <Text style={styles.dateTimeValue}>{formatDate(bookingDetails.date)}</Text>
        </View>
        <MaterialIcon name="chevron-right" size={24} color="#666" />
      </TouchableOpacity>

      {/* Time Selection */}
      <TouchableOpacity 
        style={styles.dateTimeCard}
        onPress={() => setShowTimePicker(true)}
      >
        <View style={styles.dateTimeIcon}>
          <MaterialIcon name="access-time" size={24} color="#00a82d" />
        </View>
        <View style={styles.dateTimeInfo}>
          <Text style={styles.dateTimeLabel}>DEPARTURE TIME</Text>
          <Text style={styles.dateTimeValue}>{formatTime(bookingDetails.time)}</Text>
        </View>
        <MaterialIcon name="chevron-right" size={24} color="#666" />
      </TouchableOpacity>

      {/* Return Trip Toggle */}
      <TouchableOpacity 
        style={styles.returnTripCard}
        onPress={() => setBookingDetails({...bookingDetails, returnTrip: !bookingDetails.returnTrip})}
      >
        <View style={styles.returnTripLeft}>
          <MaterialIcon name="repeat" size={24} color={bookingDetails.returnTrip ? '#00a82d' : '#666'} />
          <View style={styles.returnTripText}>
            <Text style={styles.returnTripTitle}>Return trip</Text>
            <Text style={styles.returnTripSubtitle}>Book a round trip</Text>
          </View>
        </View>
        <View style={[styles.toggle, bookingDetails.returnTrip && styles.toggleActive]}>
          <View style={[styles.toggleCircle, bookingDetails.returnTrip && styles.toggleCircleActive]} />
        </View>
      </TouchableOpacity>

      {/* Return Date/Time (if return trip selected) */}
      {bookingDetails.returnTrip && (
        <View style={styles.returnContainer}>
          <TouchableOpacity 
            style={styles.dateTimeCard}
            onPress={() => setShowReturnDatePicker(true)}
          >
            <View style={styles.dateTimeIcon}>
              <MaterialIcon name="calendar-today" size={24} color="#ff9800" />
            </View>
            <View style={styles.dateTimeInfo}>
              <Text style={styles.dateTimeLabel}>RETURN DATE</Text>
              <Text style={styles.dateTimeValue}>{formatDate(bookingDetails.returnDate)}</Text>
            </View>
            <MaterialIcon name="chevron-right" size={24} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.dateTimeCard}
            onPress={() => setShowReturnTimePicker(true)}
          >
            <View style={styles.dateTimeIcon}>
              <MaterialIcon name="access-time" size={24} color="#ff9800" />
            </View>
            <View style={styles.dateTimeInfo}>
              <Text style={styles.dateTimeLabel}>RETURN TIME</Text>
              <Text style={styles.dateTimeValue}>{formatTime(bookingDetails.returnTime)}</Text>
            </View>
            <MaterialIcon name="chevron-right" size={24} color="#666" />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.buttonRow}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => setStep(1)}
        >
          <MaterialIcon name="arrow-back" size={20} color="#666" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.nextButton}
          onPress={() => setStep(3)}
        >
          <Text style={styles.nextButtonText}>Continue</Text>
          <MaterialIcon name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Choose your ride</Text>
      <Text style={styles.stepSubtitle}>Select your preferred ride type</Text>

      {/* Ride Options */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rideContainer}>
        {rideTypes.map((ride) => (
          <TouchableOpacity
            key={ride.id}
            style={[
              styles.rideTypeCard,
              bookingDetails.rideType === ride.id && styles.rideTypeCardSelected
            ]}
            onPress={() => setBookingDetails({...bookingDetails, rideType: ride.id})}
          >
            <View style={styles.rideIconContainer}>
              <MaterialIcon name={ride.icon} size={32} color={bookingDetails.rideType === ride.id ? '#00a82d' : '#666'} />
            </View>
            <View style={styles.rideInfo}>
              <Text style={styles.rideName}>{ride.name}</Text>
              <Text style={styles.ridePrice}>MK {ride.basePrice.toLocaleString()}</Text>
              <View style={styles.rideDetail}>
                <MaterialIcon name="person" size={14} color="#666" />
                <Text style={styles.rideDetailText}>{ride.capacity} seats</Text>
              </View>
              <View style={styles.rideDetail}>
                <MaterialIcon name="schedule" size={14} color="#666" />
                <Text style={styles.rideDetailText}>{ride.time}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Passenger & Luggage */}
      <View style={styles.optionsContainer}>
        <Text style={styles.optionsTitle}>Additional Options</Text>
        
        <View style={styles.optionRow}>
          <Text style={styles.optionLabel}>Passengers</Text>
          <View style={styles.counterContainer}>
            <TouchableOpacity 
              style={styles.counterButton}
              onPress={() => setBookingDetails({
                ...bookingDetails, 
                passengers: Math.max(1, bookingDetails.passengers - 1)
              })}
            >
              <MaterialIcon name="remove" size={20} color="#666" />
            </TouchableOpacity>
            <Text style={styles.counterValue}>{bookingDetails.passengers}</Text>
            <TouchableOpacity 
              style={styles.counterButton}
              onPress={() => {
                const selectedRide = rideTypes.find(r => r.id === bookingDetails.rideType);
                if (bookingDetails.passengers < (selectedRide?.capacity || 4)) {
                  setBookingDetails({...bookingDetails, passengers: bookingDetails.passengers + 1});
                }
              }}
            >
              <MaterialIcon name="add" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.optionRow}>
          <Text style={styles.optionLabel}>Luggage (bags)</Text>
          <View style={styles.counterContainer}>
            <TouchableOpacity 
              style={styles.counterButton}
              onPress={() => setBookingDetails({
                ...bookingDetails, 
                luggage: Math.max(0, bookingDetails.luggage - 1)
              })}
            >
              <MaterialIcon name="remove" size={20} color="#666" />
            </TouchableOpacity>
            <Text style={styles.counterValue}>{bookingDetails.luggage}</Text>
            <TouchableOpacity 
              style={styles.counterButton}
              onPress={() => setBookingDetails({...bookingDetails, luggage: bookingDetails.luggage + 1})}
            >
              <MaterialIcon name="add" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Special Requests */}
      <TextInput
        style={styles.requestsInput}
        placeholder="Special requests (e.g., wheelchair access, child seat)"
        multiline
        numberOfLines={3}
        value={bookingDetails.specialRequests}
        onChangeText={(text) => setBookingDetails({...bookingDetails, specialRequests: text})}
      />

      <View style={styles.buttonRow}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => setStep(2)}
        >
          <MaterialIcon name="arrow-back" size={20} color="#666" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.nextButton}
          onPress={() => setStep(4)}
        >
          <Text style={styles.nextButtonText}>Review</Text>
          <MaterialIcon name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep4 = () => {
    const selectedRide = rideTypes.find(r => r.id === bookingDetails.rideType);
    
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Review your booking</Text>
        <Text style={styles.stepSubtitle}>Confirm all details are correct</Text>

        {/* Trip Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Trip Details</Text>
          
          <View style={styles.summaryRow}>
            <MaterialIcon name="location-on" size={16} color="#00a82d" />
            <View style={styles.summaryTextContainer}>
              <Text style={styles.summaryLabel}>FROM</Text>
              <Text style={styles.summaryValue}>{bookingDetails.pickupLocation}</Text>
            </View>
          </View>

          <View style={styles.summaryRow}>
            <MaterialIcon name="location-on" size={16} color="#ff4444" />
            <View style={styles.summaryTextContainer}>
              <Text style={styles.summaryLabel}>TO</Text>
              <Text style={styles.summaryValue}>{bookingDetails.dropoffLocation}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <MaterialIcon name="calendar-today" size={16} color="#666" />
            <Text style={styles.summaryDetail}>
              {formatDate(bookingDetails.date)} at {formatTime(bookingDetails.time)}
            </Text>
          </View>

          {bookingDetails.returnTrip && (
            <View style={styles.summaryRow}>
              <MaterialIcon name="repeat" size={16} color="#666" />
              <Text style={styles.summaryDetail}>
                Return: {formatDate(bookingDetails.returnDate)} at {formatTime(bookingDetails.returnTime)}
              </Text>
            </View>
          )}
        </View>

        {/* Ride Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Ride Details</Text>
          
          <View style={styles.rideSummary}>
            <MaterialIcon name={selectedRide?.icon} size={24} color="#00a82d" />
            <View style={styles.rideSummaryInfo}>
              <Text style={styles.rideSummaryName}>{selectedRide?.name}</Text>
              <Text style={styles.rideSummaryCapacity}>
                {bookingDetails.passengers} passenger{bookingDetails.passengers > 1 ? 's' : ''} • 
                {bookingDetails.luggage} bag{bookingDetails.luggage > 1 ? 's' : ''}
              </Text>
            </View>
            <Text style={styles.rideSummaryPrice}>MK {selectedRide?.basePrice}</Text>
          </View>

          {bookingDetails.specialRequests ? (
            <View style={styles.specialRequests}>
              <Text style={styles.specialRequestsLabel}>Special Requests:</Text>
              <Text style={styles.specialRequestsText}>{bookingDetails.specialRequests}</Text>
            </View>
          ) : null}
        </View>

        {/* Price Breakdown */}
        <View style={styles.priceCard}>
          <Text style={styles.priceTitle}>Price Breakdown</Text>
          
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Base fare</Text>
            <Text style={styles.priceValue}>MK {selectedRide?.basePrice}</Text>
          </View>
          
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Distance fee</Text>
            <Text style={styles.priceValue}>MK 1,200</Text>
          </View>
          
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Booking fee</Text>
            <Text style={styles.priceValue}>MK 500</Text>
          </View>

          {bookingDetails.returnTrip && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Return trip discount</Text>
              <Text style={[styles.priceValue, { color: '#00a82d' }]}>- MK 300</Text>
            </View>
          )}

          <View style={styles.priceDivider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>
              MK {(selectedRide?.basePrice + 1200 + 500 - (bookingDetails.returnTrip ? 300 : 0))}
            </Text>
          </View>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => setStep(3)}
          >
            <MaterialIcon name="arrow-back" size={20} color="#666" />
            <Text style={styles.backButtonText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.confirmButton}
            onPress={navigateToRideConfirmation}
          >
            <Text style={styles.confirmButtonText}>Confirm Booking</Text>
            <MaterialIcon name="check" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book Ahead</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Progress Steps */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressStep, step >= 1 && styles.progressStepActive]}>
          <Text style={[styles.progressStepText, step >= 1 && styles.progressStepTextActive]}>1</Text>
        </View>
        <View style={[styles.progressLine, step >= 2 && styles.progressLineActive]} />
        <View style={[styles.progressStep, step >= 2 && styles.progressStepActive]}>
          <Text style={[styles.progressStepText, step >= 2 && styles.progressStepTextActive]}>2</Text>
        </View>
        <View style={[styles.progressLine, step >= 3 && styles.progressLineActive]} />
        <View style={[styles.progressStep, step >= 3 && styles.progressStepActive]}>
          <Text style={[styles.progressStepText, step >= 3 && styles.progressStepTextActive]}>3</Text>
        </View>
        <View style={[styles.progressLine, step >= 4 && styles.progressLineActive]} />
        <View style={[styles.progressStep, step >= 4 && styles.progressStepActive]}>
          <Text style={[styles.progressStepText, step >= 4 && styles.progressStepTextActive]}>4</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </ScrollView>

      {/* Date/Time Pickers */}
      {showDatePicker && (
        <DateTimePicker
          value={bookingDetails.date}
          mode="date"
          display="default"
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}

      {showTimePicker && (
        <DateTimePicker
          value={bookingDetails.time}
          mode="time"
          display="default"
          onChange={handleTimeChange}
        />
      )}

      {showReturnDatePicker && (
        <DateTimePicker
          value={bookingDetails.returnDate}
          mode="date"
          display="default"
          onChange={handleReturnDateChange}
          minimumDate={bookingDetails.date}
        />
      )}

      {showReturnTimePicker && (
        <DateTimePicker
          value={bookingDetails.returnTime}
          mode="time"
          display="default"
          onChange={handleReturnTimeChange}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 20,
  },
  progressStep: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [],
  },
  progressStepActive: {
    backgroundColor: '#00a82d',
  },
  progressStepText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  progressStepTextActive: {
    color: '#fff',
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 5,
    transform: [],
  },
  progressLineActive: {
    backgroundColor: '#00a82d',
  },
  stepContainer: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  locationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
    transform: [],
  },
  locationContent: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 10,
    color: '#999',
    marginBottom: 2,
  },
  locationText: {
    fontSize: 16,
    color: '#000',
  },
  locationPlaceholder: {
    fontSize: 16,
    color: '#999',
  },
  swapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  swapText: {
    fontSize: 14,
    color: '#00a82d',
    marginLeft: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
    marginBottom: 12,
  },
  popularContainer: {
    marginBottom: 24,
  },
  popularCard: {
    width: 140,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  popularIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    transform: [],
  },
  popularName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  popularAddress: {
    fontSize: 12,
    color: '#666',
  },
  dateTimeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dateTimeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    transform: [],
  },
  dateTimeInfo: {
    flex: 1,
  },
  dateTimeLabel: {
    fontSize: 10,
    color: '#999',
    marginBottom: 2,
  },
  dateTimeValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  returnTripCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  returnTripLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  returnTripText: {
    marginLeft: 12,
  },
  returnTripTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  returnTripSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  toggle: {
    width: 48,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e0e0e0',
    padding: 2,
    transform: [],
  },
  toggleActive: {
    backgroundColor: '#00a82d',
  },
  toggleCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    transform: [],
  },
  toggleCircleActive: {
    marginLeft: 24,
  },
  returnContainer: {
    marginTop: 8,
  },
  rideTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  rideTypeCardSelected: {
    borderColor: '#00a82d',
    backgroundColor: '#e8f5e9',
  },
  rideIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    transform: [],
  },
  rideInfo: {
    flex: 1,
  },
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  rideName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  ridePrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00a82d',
  },
  rideDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rideDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  rideDetailText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 2,
  },
  optionsContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
  },
  optionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  optionLabel: {
    fontSize: 14,
    color: '#666',
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  counterButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    transform: [],
  },
  counterValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginHorizontal: 12,
  },
  requestsInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: '#000',
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginLeft: 8,
  },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00a82d',
    paddingVertical: 12,
    borderRadius: 12,
    marginLeft: 16,
  },
  nextButtonDisabled: {
    backgroundColor: '#ccc',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginRight: 8,
  },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00a82d',
    paddingVertical: 12,
    borderRadius: 12,
    marginLeft: 16,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginRight: 8,
  },
  summaryCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  summaryTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  summaryLabel: {
    fontSize: 10,
    color: '#999',
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 14,
    color: '#000',
  },
  summaryDetail: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 12,
  },
  rideSummary: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rideSummaryInfo: {
    flex: 1,
    marginLeft: 12,
  },
  rideSummaryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  rideSummaryCapacity: {
    fontSize: 12,
    color: '#666',
  },
  rideSummaryPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00a82d',
  },
  specialRequests: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  specialRequestsLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  specialRequestsText: {
    fontSize: 14,
    color: '#000',
  },
  priceCard: {
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    padding: 16,
    marginVertical: 12,
  },
  priceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  priceDivider: {
    height: 1,
    backgroundColor: '#ccc',
    marginVertical: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#00a82d',
  },
});