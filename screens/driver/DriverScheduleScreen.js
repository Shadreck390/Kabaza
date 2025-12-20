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
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Calendar } from 'react-native-calendars';

const { width } = Dimensions.get('window');

const WEEK_DAYS = [
  { id: 'mon', label: 'Monday', short: 'Mon' },
  { id: 'tue', label: 'Tuesday', short: 'Tue' },
  { id: 'wed', label: 'Wednesday', short: 'Wed' },
  { id: 'thu', label: 'Thursday', short: 'Thu' },
  { id: 'fri', label: 'Friday', short: 'Fri' },
  { id: 'sat', label: 'Saturday', short: 'Sat' },
  { id: 'sun', label: 'Sunday', short: 'Sun' },
];

const TIME_SLOTS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00', '23:00',
];

export default function DriverScheduleScreen() {
  const navigation = useNavigation();
  const [schedule, setSchedule] = useState({});
  const [isOnline, setIsOnline] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [customSchedule, setCustomSchedule] = useState({});

  useEffect(() => {
    loadSchedule();
  }, []);

  const loadSchedule = async () => {
    try {
      const saved = await AsyncStorage.getItem('driver_schedule');
      if (saved) {
        setSchedule(JSON.parse(saved));
      } else {
        // Default schedule: weekdays 8 AM - 6 PM
        const defaultSchedule = {};
        WEEK_DAYS.forEach(day => {
          if (['sat', 'sun'].includes(day.id)) {
            defaultSchedule[day.id] = { enabled: false, start: '08:00', end: '18:00' };
          } else {
            defaultSchedule[day.id] = { enabled: true, start: '08:00', end: '18:00' };
          }
        });
        setSchedule(defaultSchedule);
      }

      const onlineStatus = await AsyncStorage.getItem('driver_online_status');
      setIsOnline(onlineStatus === 'true');

      const savedCustom = await AsyncStorage.getItem('driver_custom_schedule');
      if (savedCustom) {
        setCustomSchedule(JSON.parse(savedCustom));
      }
    } catch (error) {
      console.error('Error loading schedule:', error);
    }
  };

  const saveSchedule = async (updatedSchedule) => {
    try {
      await AsyncStorage.setItem('driver_schedule', JSON.stringify(updatedSchedule));
      setSchedule(updatedSchedule);
    } catch (error) {
      console.error('Error saving schedule:', error);
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

  const updateTime = (dayId, type, time) => {
    const updatedSchedule = {
      ...schedule,
      [dayId]: {
        ...schedule[dayId],
        [type]: time,
      },
    };
    saveSchedule(updatedSchedule);
  };

  const toggleOnlineStatus = async () => {
    const newStatus = !isOnline;
    setIsOnline(newStatus);
    await AsyncStorage.setItem('driver_online_status', newStatus.toString());
    
    if (newStatus) {
      Alert.alert(
        'You\'re Online!',
        'You will now receive ride requests based on your schedule.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleDayPress = (dayId) => {
    setSelectedDay(dayId);
    setShowTimePicker(true);
  };

  const handleTimeSelect = (time) => {
    if (selectedDay) {
      // Determine if this is start or end time based on current times
      const currentStart = schedule[selectedDay].start;
      const currentEnd = schedule[selectedDay].end;
      
      // If time is before current start, set as start
      // If time is after current end, set as end
      // Otherwise, toggle between start and end
      if (time < currentStart) {
        updateTime(selectedDay, 'start', time);
      } else if (time > currentEnd) {
        updateTime(selectedDay, 'end', time);
      } else {
        // Toggle between setting start or end
        const timeDiffStart = Math.abs(parseInt(time) - parseInt(currentStart.replace(':', '')));
        const timeDiffEnd = Math.abs(parseInt(time) - parseInt(currentEnd.replace(':', '')));
        
        if (timeDiffStart < timeDiffEnd) {
          updateTime(selectedDay, 'start', time);
        } else {
          updateTime(selectedDay, 'end', time);
        }
      }
    }
    setShowTimePicker(false);
  };

  const handleAddCustomSchedule = () => {
    setCalendarVisible(true);
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date.dateString);
    setCalendarVisible(false);
    // Navigate to custom schedule editor or show modal
    Alert.alert(
      'Custom Schedule',
      `Set custom schedule for ${date.dateString}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Set Schedule', onPress: () => editCustomSchedule(date.dateString) },
      ]
    );
  };

  const editCustomSchedule = (date) => {
    // In production, this would open a custom schedule editor
    navigation.navigate('CustomScheduleEditor', { date });
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

  const renderDaySchedule = (day) => {
    const daySchedule = schedule[day.id];
    
    return (
      <View key={day.id} style={styles.dayCard}>
        <View style={styles.dayHeader}>
          <Text style={styles.dayLabel}>{day.label}</Text>
          <Switch
            value={daySchedule?.enabled || false}
            onValueChange={() => toggleDay(day.id)}
            trackColor={{ false: '#D1D5DB', true: '#22C55E' }}
            thumbColor="#FFFFFF"
          />
        </View>
        
        {daySchedule?.enabled ? (
          <TouchableOpacity 
            style={styles.timeSelector}
            onPress={() => handleDayPress(day.id)}
          >
            <MaterialIcon name="access-time" size={20} color="#3B82F6" />
            <Text style={styles.timeText}>
              {daySchedule.start} - {daySchedule.end}
            </Text>
            <Text style={styles.hoursText}>
              ({parseInt(daySchedule.end.split(':')[0]) - parseInt(daySchedule.start.split(':')[0])}h)
            </Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.dayOffText}>Day Off</Text>
        )}
      </View>
    );
  };

  const renderTimePicker = () => (
    <Modal
      visible={showTimePicker}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowTimePicker(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {selectedDay ? `Set hours for ${WEEK_DAYS.find(d => d.id === selectedDay)?.label}` : 'Select Time'}
            </Text>
            <TouchableOpacity onPress={() => setShowTimePicker(false)}>
              <MaterialIcon name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.timeGrid}>
            {TIME_SLOTS.map((time) => {
              const isSelected = selectedDay && 
                (time === schedule[selectedDay]?.start || time === schedule[selectedDay]?.end);
              
              return (
                <TouchableOpacity
                  key={time}
                  style={[
                    styles.timeSlot,
                    isSelected && styles.timeSlotSelected,
                  ]}
                  onPress={() => handleTimeSelect(time)}
                >
                  <Text style={[
                    styles.timeSlotText,
                    isSelected && styles.timeSlotTextSelected,
                  ]}>
                    {time}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
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
            }}
            theme={{
              selectedDayBackgroundColor: '#22C55E',
              todayTextColor: '#22C55E',
              arrowColor: '#22C55E',
            }}
          />
        </View>
      </View>
    </Modal>
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
        <Text style={styles.headerTitle}>My Schedule</Text>
        <TouchableOpacity 
          style={styles.saveButton}
          onPress={() => Alert.alert('Schedule Saved', 'Your schedule has been updated.')}
        >
          <MaterialIcon name="check" size={24} color="#22C55E" />
        </TouchableOpacity>
      </View>

      {/* Online Status */}
      <View style={styles.onlineStatusCard}>
        <View style={styles.statusHeader}>
          <View style={[styles.statusIndicator, { backgroundColor: isOnline ? '#22C55E' : '#6B7280' }]} />
          <Text style={styles.statusText}>
            {isOnline ? 'Online - Accepting Rides' : 'Offline - Not Accepting Rides'}
          </Text>
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
      >
        {/* Weekly Schedule */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Weekly Schedule</Text>
            <View style={styles.sectionStats}>
              <MaterialIcon name="schedule" size={16} color="#666" />
              <Text style={styles.sectionStatsText}>
                {getWeeklyHours()}h per week
              </Text>
            </View>
          </View>
          
          {WEEK_DAYS.map(renderDaySchedule)}
        </View>

        {/* Custom Dates */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Custom Dates</Text>
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
              <Text style={styles.emptyCustomTitle}>No custom dates</Text>
              <Text style={styles.emptyCustomText}>
                Add special dates when you want to work different hours
              </Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {Object.entries(customSchedule).map(([date, schedule]) => (
                <View key={date} style={styles.customDateCard}>
                  <Text style={styles.customDate}>{date}</Text>
                  <Text style={styles.customTime}>
                    {schedule.start} - {schedule.end}
                  </Text>
                  <TouchableOpacity style={styles.removeCustom}>
                    <MaterialIcon name="close" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Schedule Tips */}
        <View style={styles.tipsCard}>
          <MaterialIcon name="lightbulb" size={24} color="#F59E0B" />
          <View style={styles.tipsContent}>
            <Text style={styles.tipsTitle}>Schedule Tips</Text>
            <Text style={styles.tipsText}>
              • Peak hours: 7-9 AM & 4-7 PM{'\n'}
              • Weekends have higher demand{'\n'}
              • Keep schedule consistent for better earnings{'\n'}
              • Update schedule at least 24 hours in advance
            </Text>
          </View>
        </View>

        {/* Earnings Estimate */}
        <View style={styles.earningsCard}>
          <View style={styles.earningsHeader}>
            <Text style={styles.earningsTitle}>Weekly Earnings Estimate</Text>
            <MaterialIcon name="trending-up" size={20} color="#22C55E" />
          </View>
          <Text style={styles.earningsAmount}>MK {(getWeeklyHours() * 2000).toLocaleString()}</Text>
          <Text style={styles.earningsNote}>
            Based on average MK 2,000/hour earnings
          </Text>
        </View>
      </ScrollView>

      {/* Time Picker Modal */}
      {renderTimePicker()}

      {/* Calendar Modal */}
      {renderCalendarModal()}
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
  saveButton: {
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
    gap: 12,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
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
  sectionStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionStatsText: {
    fontSize: 14,
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
  dayLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  timeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9F0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  timeText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    flex: 1,
  },
  hoursText: {
    fontSize: 14,
    color: '#666',
  },
  dayOffText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    paddingVertical: 12,
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
    padding: 32,
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
  },
  customDateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  customDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  customTime: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  removeCustom: {
    alignSelf: 'flex-end',
  },
  tipsCard: {
    flexDirection: 'row',
    backgroundColor: '#FEFCE8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  tipsContent: {
    flex: 1,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  tipsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  earningsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  earningsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  earningsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  earningsAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#22C55E',
    marginBottom: 4,
  },
  earningsNote: {
    fontSize: 14,
    color: '#666',
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
    maxHeight: height * 0.6,
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
  timeGrid: {
    padding: 20,
  },
  timeSlot: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    marginBottom: 8,
    alignItems: 'center',
  },
  timeSlotSelected: {
    backgroundColor: '#22C55E',
  },
  timeSlotText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
  },
  timeSlotTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
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