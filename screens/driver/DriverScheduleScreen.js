// screens/driver/DriverScheduleScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  Switch,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Calendar } from 'react-native-calendars';
import DateTimePicker from '@react-native-community/datetimepicker';

const { width, height } = Dimensions.get('window');

const WEEK_DAYS = [
  { id: 'mon', label: 'Monday', short: 'Mon', key: 1 },
  { id: 'tue', label: 'Tuesday', short: 'Tue', key: 2 },
  { id: 'wed', label: 'Wednesday', short: 'Wed', key: 3 },
  { id: 'thu', label: 'Thursday', short: 'Thu', key: 4 },
  { id: 'fri', label: 'Friday', short: 'Fri', key: 5 },
  { id: 'sat', label: 'Saturday', short: 'Sat', key: 6 },
  { id: 'sun', label: 'Sunday', short: 'Sun', key: 0 },
];

const PEAK_HOURS = [
  { start: '07:00', end: '09:00', label: 'Morning Peak' },
  { start: '16:00', end: '19:00', label: 'Evening Peak' },
];

export default function DriverScheduleScreen() {
  const navigation = useNavigation();
  const [schedule, setSchedule] = useState({});
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [customSchedule, setCustomSchedule] = useState({});
  const [showTimeRangePicker, setShowTimeRangePicker] = useState(false);
  const [editingTimeType, setEditingTimeType] = useState(null); // 'start' or 'end'
  const [tempStartTime, setTempStartTime] = useState('08:00');
  const [tempEndTime, setTempEndTime] = useState('18:00');
  const [showNotifications, setShowNotifications] = useState(true);

  useEffect(() => {
    loadSchedule();
    loadSettings();
  }, []);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      const saved = await AsyncStorage.getItem('driver_schedule');
      
      if (saved) {
        setSchedule(JSON.parse(saved));
      } else {
        // Initialize default schedule
        const defaultSchedule = {};
        WEEK_DAYS.forEach(day => {
          defaultSchedule[day.id] = {
            enabled: !['sat', 'sun'].includes(day.id),
            start: '08:00',
            end: '18:00',
            peakHours: PEAK_HOURS.map(peak => ({
              ...peak,
              enabled: true
            }))
          };
        });
        setSchedule(defaultSchedule);
        await AsyncStorage.setItem('driver_schedule', JSON.stringify(defaultSchedule));
      }

      const onlineStatus = await AsyncStorage.getItem('driver_online_status');
      setIsOnline(onlineStatus === 'true');

      const savedCustom = await AsyncStorage.getItem('driver_custom_schedule');
      if (savedCustom) {
        setCustomSchedule(JSON.parse(savedCustom));
      }
    } catch (error) {
      console.error('Error loading schedule:', error);
      Alert.alert('Error', 'Failed to load schedule');
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const notifications = await AsyncStorage.getItem('schedule_notifications');
      setShowNotifications(notifications !== 'false');
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSchedule = async (updatedSchedule) => {
    try {
      await AsyncStorage.setItem('driver_schedule', JSON.stringify(updatedSchedule));
      setSchedule(updatedSchedule);
      
      // Show success message
      if (showNotifications) {
        Alert.alert('Success', 'Schedule updated successfully');
      }
    } catch (error) {
      console.error('Error saving schedule:', error);
      Alert.alert('Error', 'Failed to save schedule');
    }
  };

  const toggleDay = (dayId) => {
    const updatedSchedule = {
      ...schedule,
      [dayId]: {
        ...schedule[dayId],
        enabled: !schedule[dayId].enabled,
      },
    };
    saveSchedule(updatedSchedule);
  };

  const updateTimeRange = (dayId, start, end) => {
    const updatedSchedule = {
      ...schedule,
      [dayId]: {
        ...schedule[dayId],
        start,
        end,
      },
    };
    saveSchedule(updatedSchedule);
  };

  const togglePeakHour = (dayId, peakIndex) => {
    const updatedPeakHours = [...schedule[dayId].peakHours];
    updatedPeakHours[peakIndex] = {
      ...updatedPeakHours[peakIndex],
      enabled: !updatedPeakHours[peakIndex].enabled
    };

    const updatedSchedule = {
      ...schedule,
      [dayId]: {
        ...schedule[dayId],
        peakHours: updatedPeakHours,
      },
    };
    saveSchedule(updatedSchedule);
  };

  const toggleOnlineStatus = async () => {
    const newStatus = !isOnline;
    setIsOnline(newStatus);
    await AsyncStorage.setItem('driver_online_status', newStatus.toString());
    
    if (newStatus && showNotifications) {
      Alert.alert(
        'You\'re Online! 🎉',
        'You will now receive ride requests based on your schedule.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleDayPress = (dayId) => {
    setSelectedDay(dayId);
    setTempStartTime(schedule[dayId].start);
    setTempEndTime(schedule[dayId].end);
    setShowTimeRangePicker(true);
  };

  const handleTimeRangeSave = () => {
    if (selectedDay) {
      updateTimeRange(selectedDay, tempStartTime, tempEndTime);
    }
    setShowTimeRangePicker(false);
  };

  const parseTimeToDate = (timeString) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours);
    date.setMinutes(minutes);
    return date;
  };

  const formatTimeToString = (date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const handleStartTimeChange = (event, selectedDate) => {
    if (selectedDate) {
      setTempStartTime(formatTimeToString(selectedDate));
    }
  };

  const handleEndTimeChange = (event, selectedDate) => {
    if (selectedDate) {
      setTempEndTime(formatTimeToString(selectedDate));
    }
  };

  const handleAddCustomSchedule = () => {
    setCalendarVisible(true);
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date.dateString);
    setCalendarVisible(false);
    
    // Show custom schedule editor
    navigation.navigate('CustomScheduleEditor', { 
      date: date.dateString,
      onSave: handleCustomScheduleSave 
    });
  };

  const handleCustomScheduleSave = (date, customSchedule) => {
    const updatedCustom = {
      ...customSchedule,
      [date]: customSchedule
    };
    setCustomSchedule(updatedCustom);
    AsyncStorage.setItem('driver_custom_schedule', JSON.stringify(updatedCustom));
  };

  const removeCustomSchedule = (date) => {
    Alert.alert(
      'Remove Schedule',
      `Are you sure you want to remove schedule for ${date}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => {
            const updatedCustom = { ...customSchedule };
            delete updatedCustom[date];
            setCustomSchedule(updatedCustom);
            AsyncStorage.setItem('driver_custom_schedule', JSON.stringify(updatedCustom));
          }
        },
      ]
    );
  };

  const getWeeklyHours = () => {
    let totalHours = 0;
    Object.values(schedule).forEach(day => {
      if (day.enabled) {
        const startHour = parseInt(day.start.split(':')[0]);
        const endHour = parseInt(day.end.split(':')[0]);
        totalHours += (endHour - startHour);
      }
    });
    return totalHours;
  };

  const getPeakHoursCoverage = () => {
    let coveredPeakHours = 0;
    let totalPeakHours = 0;
    
    Object.values(schedule).forEach(day => {
      if (day.enabled) {
        day.peakHours.forEach(peak => {
          totalPeakHours++;
          if (peak.enabled) {
            coveredPeakHours++;
          }
        });
      }
    });
    
    return totalPeakHours > 0 ? Math.round((coveredPeakHours / totalPeakHours) * 100) : 0;
  };

  const calculateEarningsEstimate = () => {
    const weeklyHours = getWeeklyHours();
    const peakCoverage = getPeakHoursCoverage() / 100;
    const baseRate = 2000; // MK per hour
    const peakMultiplier = 1.5; // 50% more during peak hours
    
    // Calculate earnings with peak hour bonus
    const peakHours = weeklyHours * 0.3 * peakCoverage; // Assume 30% are peak hours
    const regularHours = weeklyHours - peakHours;
    
    const earnings = (regularHours * baseRate) + (peakHours * baseRate * peakMultiplier);
    return Math.round(earnings);
  };

  const toggleNotifications = async () => {
    const newValue = !showNotifications;
    setShowNotifications(newValue);
    await AsyncStorage.setItem('schedule_notifications', newValue.toString());
  };

  const renderDaySchedule = (day) => {
    const daySchedule = schedule[day.id];
    if (!daySchedule) return null;
    
    const hours = parseInt(daySchedule.end.split(':')[0]) - parseInt(daySchedule.start.split(':')[0]);
    
    return (
      <View key={day.id} style={styles.dayCard}>
        <View style={styles.dayHeader}>
          <View style={styles.dayLabelContainer}>
            <Text style={styles.dayLabel}>{day.label}</Text>
            {daySchedule.enabled && (
              <View style={styles.hoursBadge}>
                <Text style={styles.hoursBadgeText}>{hours}h</Text>
              </View>
            )}
          </View>
          <Switch
            value={daySchedule.enabled}
            onValueChange={() => toggleDay(day.id)}
            trackColor={{ false: '#D1D5DB', true: '#22C55E' }}
            thumbColor="#FFFFFF"
          />
        </View>
        
        {daySchedule.enabled ? (
          <>
            <TouchableOpacity 
              style={styles.timeSelector}
              onPress={() => handleDayPress(day.id)}
            >
              <MaterialIcon name="access-time" size={20} color="#3B82F6" />
              <Text style={styles.timeText}>
                {daySchedule.start} - {daySchedule.end}
              </Text>
              <MaterialIcon name="edit" size={16} color="#666" />
            </TouchableOpacity>
            
            {/* Peak Hours */}
            <View style={styles.peakHoursContainer}>
              <Text style={styles.peakHoursTitle}>Peak Hours:</Text>
              <View style={styles.peakHoursList}>
                {daySchedule.peakHours.map((peak, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.peakHourBadge,
                      !peak.enabled && styles.peakHourDisabled,
                    ]}
                    onPress={() => togglePeakHour(day.id, index)}
                  >
                    <Text style={[
                      styles.peakHourText,
                      !peak.enabled && styles.peakHourTextDisabled,
                    ]}>
                      {peak.label}
                    </Text>
                    {peak.enabled && (
                      <MaterialIcon name="star" size={12} color="#F59E0B" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        ) : (
          <View style={styles.dayOffContainer}>
            <MaterialIcon name="beach-access" size={20} color="#9CA3AF" />
            <Text style={styles.dayOffText}>Day Off</Text>
          </View>
        )}
      </View>
    );
  };

  const renderTimeRangePicker = () => (
    <Modal
      visible={showTimeRangePicker}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowTimeRangePicker(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Set Working Hours for {WEEK_DAYS.find(d => d.id === selectedDay)?.label}
            </Text>
            <TouchableOpacity onPress={() => setShowTimeRangePicker(false)}>
              <MaterialIcon name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.timePickerContainer}>
            <View style={styles.timeInputGroup}>
              <Text style={styles.timeInputLabel}>Start Time</Text>
              <DateTimePicker
                value={parseTimeToDate(tempStartTime)}
                mode="time"
                display="spinner"
                onChange={handleStartTimeChange}
                style={styles.timePicker}
              />
            </View>
            
            <View style={styles.timeInputGroup}>
              <Text style={styles.timeInputLabel}>End Time</Text>
              <DateTimePicker
                value={parseTimeToDate(tempEndTime)}
                mode="time"
                display="spinner"
                onChange={handleEndTimeChange}
                style={styles.timePicker}
              />
            </View>
          </View>
          
          <View style={styles.selectedTimePreview}>
            <Text style={styles.selectedTimeText}>
              Selected: {tempStartTime} - {tempEndTime}
            </Text>
            <Text style={styles.totalHoursText}>
              Total: {parseInt(tempEndTime.split(':')[0]) - parseInt(tempStartTime.split(':')[0])} hours
            </Text>
          </View>
          
          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setShowTimeRangePicker(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.saveButton}
              onPress={handleTimeRangeSave}
            >
              <Text style={styles.saveButtonText}>Save Hours</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderCalendarModal = () => (
    <Modal
      visible={calendarVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setCalendarVisible(false)}
    >
      <View style={styles.calendarOverlay}>
        <View style={styles.calendarContent}>
          <View style={styles.calendarHeader}>
            <Text style={styles.calendarTitle}>Select Date</Text>
            <TouchableOpacity onPress={() => setCalendarVisible(false)}>
              <MaterialIcon name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>
          
          <Calendar
            onDayPress={handleDateSelect}
            markedDates={{
              [selectedDate]: { selected: true, selectedColor: '#22C55E' },
              ...Object.keys(customSchedule).reduce((acc, date) => {
                acc[date] = { marked: true, dotColor: '#3B82F6' };
                return acc;
              }, {})
            }}
            theme={{
              selectedDayBackgroundColor: '#22C55E',
              todayTextColor: '#22C55E',
              arrowColor: '#22C55E',
            }}
            minDate={new Date().toISOString().split('T')[0]}
          />
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#22C55E" />
        <Text style={styles.loadingText}>Loading your schedule...</Text>
      </View>
    );
  }

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
        <Text style={styles.headerTitle}>My Schedule</Text>
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={() => navigation.navigate('ScheduleSettings')}
        >
          <MaterialIcon name="settings" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Online Status */}
      <View style={styles.onlineStatusCard}>
        <View style={styles.statusHeader}>
          <View style={styles.statusIndicatorContainer}>
            <View style={[styles.statusIndicator, { backgroundColor: isOnline ? '#22C55E' : '#6B7280' }]} />
            <View style={styles.statusPulse} />
          </View>
          <View>
            <Text style={styles.statusText}>
              {isOnline ? 'Online - Accepting Rides' : 'Offline'}
            </Text>
            <Text style={styles.statusSubtext}>
              {isOnline ? 'You will receive ride requests' : 'You will not receive ride requests'}
            </Text>
          </View>
        </View>
        <Switch
          value={isOnline}
          onValueChange={toggleOnlineStatus}
          trackColor={{ false: '#D1D5DB', true: '#22C55E' }}
          thumbColor="#FFFFFF"
        />
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={loadSchedule}
            colors={['#22C55E']}
          />
        }
      >
        {/* Weekly Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <MaterialIcon name="schedule" size={24} color="#3B82F6" />
            <Text style={styles.statValue}>{getWeeklyHours()}h</Text>
            <Text style={styles.statLabel}>Weekly Hours</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialIcon name="trending-up" size={24} color="#22C55E" />
            <Text style={styles.statValue}>{getPeakHoursCoverage()}%</Text>
            <Text style={styles.statLabel}>Peak Coverage</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialIcon name="attach-money" size={24} color="#F59E0B" />
            <Text style={styles.statValue}>MK {calculateEarningsEstimate().toLocaleString()}</Text>
            <Text style={styles.statLabel}>Est. Weekly</Text>
          </View>
        </View>

        {/* Weekly Schedule */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Weekly Schedule</Text>
            <TouchableOpacity 
              style={styles.quickSetButton}
              onPress={() => {
                // Quick set: weekdays 8-6
                const updatedSchedule = { ...schedule };
                WEEK_DAYS.forEach(day => {
                  updatedSchedule[day.id] = {
                    ...updatedSchedule[day.id],
                    enabled: !['sat', 'sun'].includes(day.id),
                    start: '08:00',
                    end: '18:00',
                  };
                });
                saveSchedule(updatedSchedule);
              }}
            >
              <Text style={styles.quickSetText}>Set Weekdays</Text>
            </TouchableOpacity>
          </View>
          
          {WEEK_DAYS.map(renderDaySchedule)}
        </View>

        {/* Custom Dates */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Special Dates</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={handleAddCustomSchedule}
            >
              <MaterialIcon name="add" size={20} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Add Date</Text>
            </TouchableOpacity>
          </View>
          
          {Object.keys(customSchedule).length === 0 ? (
            <View style={styles.emptyCustom}>
              <MaterialIcon name="calendar-today" size={48} color="#D1D5DB" />
              <Text style={styles.emptyCustomTitle}>No special dates</Text>
              <Text style={styles.emptyCustomText}>
                Add dates when you want to work different hours
              </Text>
            </View>
          ) : (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.customDatesScroll}
            >
              {Object.entries(customSchedule).map(([date, schedule]) => (
                <View key={date} style={styles.customDateCard}>
                  <View style={styles.customDateHeader}>
                    <Text style={styles.customDate}>{date}</Text>
                    <TouchableOpacity 
                      style={styles.removeCustom}
                      onPress={() => removeCustomSchedule(date)}
                    >
                      <MaterialIcon name="close" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.customTime}>
                    {schedule.start} - {schedule.end}
                  </Text>
                  {schedule.note && (
                    <Text style={styles.customNote}>{schedule.note}</Text>
                  )}
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Notifications Setting */}
        <View style={styles.settingsCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <MaterialIcon name="notifications" size={24} color="#666" />
              <View style={styles.settingTexts}>
                <Text style={styles.settingTitle}>Schedule Notifications</Text>
                <Text style={styles.settingDescription}>
                  Get reminders before your shift starts
                </Text>
              </View>
            </View>
            <Switch
              value={showNotifications}
              onValueChange={toggleNotifications}
              trackColor={{ false: '#D1D5DB', true: '#22C55E' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Tips */}
        <View style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <MaterialIcon name="lightbulb" size={24} color="#F59E0B" />
            <Text style={styles.tipsTitle}>Maximize Your Earnings</Text>
          </View>
          <View style={styles.tipItem}>
            <MaterialIcon name="check-circle" size={16} color="#22C55E" />
            <Text style={styles.tipText}>Enable peak hours for 50% higher rates</Text>
          </View>
          <View style={styles.tipItem}>
            <MaterialIcon name="check-circle" size={16} color="#22C55E" />
            <Text style={styles.tipText}>Keep your schedule consistent for better matching</Text>
          </View>
          <View style={styles.tipItem}>
            <MaterialIcon name="check-circle" size={16} color="#22C55E" />
            <Text style={styles.tipText}>Update schedule at least 24 hours in advance</Text>
          </View>
        </View>
      </ScrollView>

      {/* Time Range Picker Modal */}
      {renderTimeRangePicker()}

      {/* Calendar Modal */}
      {renderCalendarModal()}
    </View>
  );
}

// Add missing imports
import { RefreshControl } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
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
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineStatusCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statusIndicatorContainer: {
    position: 'relative',
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    zIndex: 1,
  },
  statusPulse: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#22C55E',
    opacity: 0.3,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  statusSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
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
  quickSetButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
  },
  quickSetText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  dayCard: {
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
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  hoursBadge: {
    backgroundColor: '#F0F9F0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  hoursBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#22C55E',
  },
  timeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 12,
    marginBottom: 12,
  },
  timeText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    flex: 1,
  },
  peakHoursContainer: {
    marginTop: 8,
  },
  peakHoursTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  peakHoursList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  peakHourBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEFCE8',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  peakHourDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  peakHourText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#92400E',
  },
  peakHourTextDisabled: {
    color: '#9CA3AF',
  },
  dayOffContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  dayOffText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22C55E',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyCustom: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 40,
  },
  emptyCustomTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyCustomText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  customDatesScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  customDateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    width: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  customDateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  customDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  customTime: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  customNote: {
    fontSize: 12,
    color: '#3B82F6',
    fontStyle: 'italic',
  },
  removeCustom: {
    padding: 2,
  },
  settingsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingTexts: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  tipsCard: {
    backgroundColor: '#F0F9F0',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    lineHeight: 20,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.8,
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
    flex: 1,
    paddingRight: 16,
  },
  timePickerContainer: {
    padding: 20,
  },
  timeInputGroup: {
    marginBottom: 24,
  },
  timeInputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  timePicker: {
    width: '100%',
  },
  selectedTimePreview: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  selectedTimeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  totalHoursText: {
    fontSize: 14,
    color: '#666',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#22C55E',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  calendarOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  calendarContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
});