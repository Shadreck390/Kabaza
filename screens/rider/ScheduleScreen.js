// screens/rider/ScheduleScreen.js
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
} from 'react-native';
import { MaterialIconFallback as MaterialIcon } from '@src/utils/iconUtils';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function ScheduleScreen({ navigation }) {
  const [step, setStep] = useState(1); // 1: select date, 2: select time, 3: recurring options, 4: confirm
  
  const [scheduleDetails, setScheduleDetails] = useState({
    date: new Date(),
    time: new Date(),
    recurring: 'none', // none, daily, weekly, monthly
    selectedDays: [], // for weekly recurring
    rideType: 'kabaza',
    pickupLocation: '',
    dropoffLocation: '',
    notes: '',
    estimatedPrice: 'MK 4,500 - MK 6,500',
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const recurringOptions = [
    { id: 'none', label: 'One time', icon: 'event' },
    { id: 'daily', label: 'Daily', icon: 'today' },
    { id: 'weekly', label: 'Weekly', icon: 'date-range' },
    { id: 'monthly', label: 'Monthly', icon: 'calendar-month' },
  ];

  const weekDays = [
    { id: 'mon', label: 'Mon' },
    { id: 'tue', label: 'Tue' },
    { id: 'wed', label: 'Wed' },
    { id: 'thu', label: 'Thu' },
    { id: 'fri', label: 'Fri' },
    { id: 'sat', label: 'Sat' },
    { id: 'sun', label: 'Sun' },
  ];

  const rideTypes = [
    { id: 'kabaza', label: 'Kabaza', icon: 'motorcycle', price: 'MK 4,500' },
    { id: 'comfort', label: 'Comfort', icon: 'directions-car', price: 'MK 6,500' },
    { id: 'green', label: 'Green', icon: 'eco', price: 'MK 5,500' },
  ];

  const formatDate = (date) => {
    return date.toLocaleDateString('en-MW', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
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
      setScheduleDetails({ ...scheduleDetails, date: selectedDate });
    }
  };

  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      setScheduleDetails({ ...scheduleDetails, time: selectedTime });
    }
  };

  const toggleDay = (dayId) => {
    const currentDays = scheduleDetails.selectedDays;
    if (currentDays.includes(dayId)) {
      setScheduleDetails({
        ...scheduleDetails,
        selectedDays: currentDays.filter(d => d !== dayId)
      });
    } else {
      setScheduleDetails({
        ...scheduleDetails,
        selectedDays: [...currentDays, dayId]
      });
    }
  };

  const handleScheduleRide = () => {
    if (!scheduleDetails.pickupLocation || !scheduleDetails.dropoffLocation) {
      Alert.alert('Error', 'Please enter pickup and dropoff locations');
      return;
    }

    if (!scheduleDetails.pickupCoordinates || !scheduleDetails.dropoffCoordinates) {
      Alert.alert('Error', 'Location coordinates missing. Please select locations again.');
      return;
    }

    // Navigate to confirmation screen with schedule details
    navigation.navigate('RideConfirmation', {
      isScheduled: true,
      scheduleDetails: scheduleDetails,
      pickupLocation: scheduleDetails.pickupLocation,
      pickupCoords: scheduleDetails.pickupCoordinates,
      destination: scheduleDetails.dropoffLocation,
      destinationCoords: scheduleDetails.dropoffCoordinates,
      ride: {
        name: scheduleDetails.rideType === 'kabaza' ? 'Life Bike' : 
              scheduleDetails.rideType === 'comfort' ? 'Lion King Bike' : 'Kiwasaki Bike',
        vehicleType: scheduleDetails.rideType,
        basePrice: scheduleDetails.rideType === 'kabaza' ? 4500 : 
                   scheduleDetails.rideType === 'comfort' ? 6500 : 5500,
        estimatedTime: '5-10 min',
        distance: '0 km',
      }
    });
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>When do you need the ride?</Text>
      <Text style={styles.stepSubtitle}>Select date and time</Text>

      {/* Date Picker */}
      <TouchableOpacity 
        style={styles.dateTimeCard}
        onPress={() => setShowDatePicker(true)}
      >
        <View style={styles.dateTimeIcon}>
          <MaterialIcon name="calendar-today" size={24} color="#00a82d" />
        </View>
        <View style={styles.dateTimeInfo}>
          <Text style={styles.dateTimeLabel}>Date</Text>
          <Text style={styles.dateTimeValue}>{formatDate(scheduleDetails.date)}</Text>
        </View>
        <MaterialIcon name="chevron-right" size={24} color="#666" />
      </TouchableOpacity>

      {/* Time Picker */}
      <TouchableOpacity 
        style={styles.dateTimeCard}
        onPress={() => setShowTimePicker(true)}
      >
        <View style={styles.dateTimeIcon}>
          <MaterialIcon name="access-time" size={24} color="#00a82d" />
        </View>
        <View style={styles.dateTimeInfo}>
          <Text style={styles.dateTimeLabel}>Time</Text>
          <Text style={styles.dateTimeValue}>{formatTime(scheduleDetails.time)}</Text>
        </View>
        <MaterialIcon name="chevron-right" size={24} color="#666" />
      </TouchableOpacity>

      {/* Quick Select Options */}
      <Text style={styles.sectionTitle}>Quick Select</Text>
      <View style={styles.quickSelectContainer}>
        <TouchableOpacity style={styles.quickSelectChip}>
          <Text style={styles.quickSelectText}>Tomorrow</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickSelectChip}>
          <Text style={styles.quickSelectText}>This Weekend</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickSelectChip}>
          <Text style={styles.quickSelectText}>Next Week</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.nextButton}
        onPress={() => setStep(2)}
      >
        <Text style={styles.nextButtonText}>Continue</Text>
        <MaterialIcon name="arrow-forward" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Recurring Ride?</Text>
      <Text style={styles.stepSubtitle}>Choose how often you need this ride</Text>

      {recurringOptions.map((option) => (
        <TouchableOpacity
          key={option.id}
          style={[
            styles.recurringCard,
            scheduleDetails.recurring === option.id && styles.recurringCardSelected
          ]}
          onPress={() => {
            setScheduleDetails({ ...scheduleDetails, recurring: option.id });
            if (option.id === 'weekly') {
              // Stay on step 2 to show day selection
            } else if (option.id === 'none') {
              setStep(3); // Skip to locations if one-time
            } else {
              setStep(3); // Daily/Monthly go to locations
            }
          }}
        >
          <View style={styles.recurringIcon}>
            <MaterialIcon 
              name={option.icon} 
              size={24} 
              color={scheduleDetails.recurring === option.id ? '#00a82d' : '#666'} 
            />
          </View>
          <Text style={[
            styles.recurringLabel,
            scheduleDetails.recurring === option.id && styles.recurringLabelSelected
          ]}>
            {option.label}
          </Text>
          <MaterialIcon 
            name={scheduleDetails.recurring === option.id ? 'radio-button-checked' : 'radio-button-unchecked'} 
            size={20} 
            color={scheduleDetails.recurring === option.id ? '#00a82d' : '#666'} 
          />
        </TouchableOpacity>
      ))}

      {/* Weekly Day Selection - Only show if weekly recurring is selected */}
      {scheduleDetails.recurring === 'weekly' && (
        <View style={styles.weeklyContainer}>
          <Text style={styles.weeklyTitle}>Select days</Text>
          <View style={styles.weekDaysContainer}>
            {weekDays.map((day) => (
              <TouchableOpacity
                key={day.id}
                style={[
                  styles.dayChip,
                  scheduleDetails.selectedDays.includes(day.id) && styles.dayChipSelected
                ]}
                onPress={() => toggleDay(day.id)}
              >
                <Text style={[
                  styles.dayChipText,
                  scheduleDetails.selectedDays.includes(day.id) && styles.dayChipTextSelected
                ]}>
                  {day.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {scheduleDetails.selectedDays.length === 0 && (
            <Text style={styles.warningText}>Select at least one day</Text>
          )}
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
          style={[
            styles.nextButton,
            scheduleDetails.recurring === 'weekly' && 
            scheduleDetails.selectedDays.length === 0 && 
            styles.nextButtonDisabled
          ]}
          onPress={() => {
            if (scheduleDetails.recurring === 'weekly' && scheduleDetails.selectedDays.length === 0) {
              Alert.alert('Error', 'Please select at least one day');
              return;
            }
            setStep(3);
          }}
          disabled={scheduleDetails.recurring === 'weekly' && scheduleDetails.selectedDays.length === 0}
        >
          <Text style={styles.nextButtonText}>Continue</Text>
          <MaterialIcon name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Where to?</Text>
      <Text style={styles.stepSubtitle}>Enter pickup and dropoff locations</Text>

      {/* Pickup Location */}
      <TouchableOpacity 
        style={styles.locationCard}
        onPress={() => navigation.navigate('SearchLocation', {
          onLocationSelect: (location) => {
            setScheduleDetails({
              ...scheduleDetails,
              pickupLocation: location.name,
              pickupCoordinates: location.coordinates,
              pickupAddress: location.address
            });
          },
          type: 'pickup'
        })}
      >
        <View style={[styles.locationDot, { backgroundColor: '#00a82d' }]} />
        <Text style={scheduleDetails.pickupLocation ? styles.locationText : styles.locationPlaceholder}>
          {scheduleDetails.pickupLocation || 'Pickup location'}
        </Text>
        <MaterialIcon name="search" size={20} color="#666" />
      </TouchableOpacity>

      {/* Dropoff Location */}
      <TouchableOpacity 
        style={styles.locationCard}
        onPress={() => navigation.navigate('SearchLocation', {
          onLocationSelect: (location) => {
            setScheduleDetails({
              ...scheduleDetails,
              dropoffLocation: location.name,
              dropoffCoordinates: location.coordinates,
              dropoffAddress: location.address
            });
          },
          type: 'dropoff'
        })}
      >
        <View style={[styles.locationDot, { backgroundColor: '#ff4444' }]} />
        <Text style={scheduleDetails.dropoffLocation ? styles.locationText : styles.locationPlaceholder}>
          {scheduleDetails.dropoffLocation || 'Dropoff location'}
        </Text>
        <MaterialIcon name="search" size={20} color="#666" />
      </TouchableOpacity>

      {/* Recent Locations */}
      <Text style={styles.sectionTitle}>Recent</Text>
      <TouchableOpacity style={styles.recentLocation}>
        <MaterialIcon name="history" size={20} color="#666" />
        <Text style={styles.recentLocationText}>Crossroads Shopping Mall</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.recentLocation}>
        <MaterialIcon name="history" size={20} color="#666" />
        <Text style={styles.recentLocationText}>Bingu National Stadium</Text>
      </TouchableOpacity>

      {/* Additional Notes */}
      <TextInput
        style={styles.notesInput}
        placeholder="Add notes for driver (optional)"
        multiline
        numberOfLines={3}
        value={scheduleDetails.notes}
        onChangeText={(text) => setScheduleDetails({...scheduleDetails, notes: text})}
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
          style={[
            styles.nextButton,
            (!scheduleDetails.pickupLocation || !scheduleDetails.dropoffLocation) && 
            styles.nextButtonDisabled
          ]}
          onPress={() => {
            if (!scheduleDetails.pickupLocation || !scheduleDetails.dropoffLocation) {
              Alert.alert('Error', 'Please enter both pickup and dropoff locations');
              return;
            }
            setStep(4);
          }}
          disabled={!scheduleDetails.pickupLocation || !scheduleDetails.dropoffLocation}
        >
          <Text style={styles.nextButtonText}>Continue</Text>
          <MaterialIcon name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Choose your ride</Text>
      <Text style={styles.stepSubtitle}>Select preferred vehicle type</Text>

      {rideTypes.map((ride) => (
        <TouchableOpacity
          key={ride.id}
          style={[
            styles.rideTypeCard,
            scheduleDetails.rideType === ride.id && styles.rideTypeCardSelected
          ]}
          onPress={() => setScheduleDetails({...scheduleDetails, rideType: ride.id})}
        >
          <View style={styles.rideIcon}>
            <MaterialIcon name={ride.icon} size={32} color={scheduleDetails.rideType === ride.id ? '#00a82d' : '#666'} />
          </View>
          <View style={styles.rideInfo}>
            <Text style={styles.rideName}>{ride.label}</Text>
            <Text style={styles.ridePrice}>{ride.price}</Text>
          </View>
          <MaterialIcon 
            name={scheduleDetails.rideType === ride.id ? 'radio-button-checked' : 'radio-button-unchecked'} 
            size={24} 
            color={scheduleDetails.rideType === ride.id ? '#00a82d' : '#666'} 
          />
        </TouchableOpacity>
      ))}

      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Schedule Summary</Text>
        
        <View style={styles.summaryRow}>
          <MaterialIcon name="calendar-today" size={16} color="#666" />
          <Text style={styles.summaryText}>
            {formatDate(scheduleDetails.date)} at {formatTime(scheduleDetails.time)}
          </Text>
        </View>

        {scheduleDetails.recurring !== 'none' && (
          <View style={styles.summaryRow}>
            <MaterialIcon name="repeat" size={16} color="#666" />
            <Text style={styles.summaryText}>
              {scheduleDetails.recurring === 'daily' ? 'Daily' : 
               scheduleDetails.recurring === 'weekly' ? `Weekly on ${scheduleDetails.selectedDays.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')}` :
               'Monthly'}
            </Text>
          </View>
        )}

        <View style={styles.summaryRow}>
          <MaterialIcon name="location-on" size={16} color="#666" />
          <Text style={styles.summaryText} numberOfLines={1}>
            From: {scheduleDetails.pickupLocation}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <MaterialIcon name="location-on" size={16} color="#ff4444" />
          <Text style={styles.summaryText} numberOfLines={1}>
            To: {scheduleDetails.dropoffLocation}
          </Text>
        </View>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => setStep(3)}
        >
          <MaterialIcon name="arrow-back" size={20} color="#666" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.confirmButton}
          onPress={handleScheduleRide}
        >
          <Text style={styles.confirmButtonText}>Schedule Ride</Text>
          <MaterialIcon name="check" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Schedule a Ride</Text>
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
          value={scheduleDetails.date}
          mode="date"
          display="default"
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}

      {showTimePicker && (
        <DateTimePicker
          value={scheduleDetails.time}
          mode="time"
          display="default"
          onChange={handleTimeChange}
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
  },
  dateTimeInfo: {
    flex: 1,
  },
  dateTimeLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  dateTimeValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginTop: 20,
    marginBottom: 12,
  },
  quickSelectContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  quickSelectChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  quickSelectText: {
    fontSize: 14,
    color: '#666',
  },
  recurringCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  recurringCardSelected: {
    borderColor: '#00a82d',
    backgroundColor: '#e8f5e9',
  },
  recurringIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recurringLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  recurringLabelSelected: {
    color: '#00a82d',
  },
  weeklyContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  weeklyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  weekDaysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dayChipSelected: {
    backgroundColor: '#00a82d',
    borderColor: '#00a82d',
  },
  dayChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  dayChipTextSelected: {
    color: '#fff',
  },
  warningText: {
    fontSize: 12,
    color: '#ff4444',
    marginTop: 8,
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
  },
  locationText: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  locationPlaceholder: {
    flex: 1,
    fontSize: 16,
    color: '#999',
  },
  recentLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  recentLocationText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
  },
  notesInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    fontSize: 14,
    color: '#000',
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#e0e0e0',
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
  },
  rideInfo: {
    flex: 1,
  },
  rideName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  ridePrice: {
    fontSize: 14,
    color: '#00a82d',
  },
  summaryCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginVertical: 20,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
    flex: 1,
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
});