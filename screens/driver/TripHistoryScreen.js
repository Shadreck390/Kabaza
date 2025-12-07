// screens/driver/TripHistoryScreen.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

export default function TripHistoryScreen({ navigation }) {
  const [selectedFilter, setSelectedFilter] = useState('week');
  
  const tripData = [
    {
      id: '1',
      date: 'Today, 14:30',
      passengerName: 'John M.',
      pickup: 'Shoprite, Lilongwe',
      destination: 'Kameza Roundabout',
      fare: 'MWK 1,200',
      rating: 5,
      status: 'completed'
    },
    {
      id: '2',
      date: 'Today, 11:15',
      passengerName: 'Sarah K.',
      pickup: 'Crossroads Complex',
      destination: 'Mchesi',
      fare: 'MWK 1,800',
      rating: 4,
      status: 'completed'
    },
    {
      id: '3',
      date: 'Yesterday, 16:45',
      passengerName: 'Michael B.',
      pickup: 'Old Town',
      destination: 'Area 3',
      fare: 'MWK 900',
      rating: 5,
      status: 'completed'
    },
    {
      id: '4',
      date: 'Yesterday, 09:30',
      passengerName: 'Grace T.',
      pickup: 'Bunda College',
      destination: 'Lilongwe City Center',
      fare: 'MWK 2,100',
      rating: 4,
      status: 'completed'
    },
    {
      id: '5',
      date: 'Dec 1, 18:20',
      passengerName: 'David L.',
      pickup: 'Kamuzu Central Hospital',
      destination: 'Area 25',
      fare: 'MWK 1,500',
      rating: 5,
      status: 'completed'
    },
  ];

  const earningsSummary = {
    today: 'MWK 3,000',
    week: 'MWK 18,500',
    month: 'MWK 72,000',
    total: 'MWK 72,000'
  };

  const renderTripItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.tripCard}
      onPress={() => navigation.navigate('TripDetails', { trip: item })}
    >
      <View style={styles.tripHeader}>
        <View>
          <Text style={styles.tripDate}>{item.date}</Text>
          <Text style={styles.passengerName}>{item.passengerName}</Text>
        </View>
        <Text style={styles.tripFare}>{item.fare}</Text>
      </View>
      
      <View style={styles.routeInfo}>
        <View style={styles.routeItem}>
          <Icon name="map-marker" size={12} color="#00B894" />
          <Text style={styles.routeText} numberOfLines={1}>{item.pickup}</Text>
        </View>
        <View style={styles.routeDivider} />
        <View style={styles.routeItem}>
          <Icon name="flag" size={12} color="#FF6B6B" />
          <Text style={styles.routeText} numberOfLines={1}>{item.destination}</Text>
        </View>
      </View>

      <View style={styles.tripFooter}>
        <View style={styles.ratingContainer}>
          {[...Array(5)].map((_, i) => (
            <Icon 
              key={i} 
              name="star" 
              size={14} 
              color={i < item.rating ? "#FFD700" : "#ddd"} 
            />
          ))}
          <Text style={styles.ratingText}>({item.rating}.0)</Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>Completed</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Earnings Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Earnings ({selectedFilter})</Text>
        <Text style={styles.summaryAmount}>{earningsSummary[selectedFilter]}</Text>
        
        <View style={styles.filterContainer}>
          {['today', 'week', 'month', 'total'].map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterButton,
                selectedFilter === filter && styles.filterButtonActive
              ]}
              onPress={() => setSelectedFilter(filter)}
            >
              <Text style={[
                styles.filterText,
                selectedFilter === filter && styles.filterTextActive
              ]}>
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Trip Count */}
      <View style={styles.tripCountContainer}>
        <Text style={styles.tripCountText}>
          {tripData.length} trips completed
        </Text>
        <TouchableOpacity style={styles.exportButton}>
          <Icon name="download" size={16} color="#00B894" />
          <Text style={styles.exportText}>Export</Text>
        </TouchableOpacity>
      </View>

      {/* Trip List */}
      <FlatList
        data={tripData}
        renderItem={renderTripItem}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        contentContainerStyle={styles.tripList}
      />

      {/* Empty State (if no trips) */}
      {tripData.length === 0 && (
        <View style={styles.emptyState}>
          <Icon name="history" size={60} color="#ccc" />
          <Text style={styles.emptyText}>No trip history yet</Text>
          <Text style={styles.emptySubtext}>Your completed trips will appear here</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  summaryCard: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: { fontSize: 14, color: '#666', marginBottom: 5 },
  summaryAmount: { fontSize: 32, fontWeight: 'bold', color: '#00B894', marginBottom: 20 },
  filterContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  filterButton: { 
    paddingVertical: 8, 
    paddingHorizontal: 15, 
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  filterButtonActive: { backgroundColor: '#00B894' },
  filterText: { fontSize: 12, color: '#666', fontWeight: '500' },
  filterTextActive: { color: '#fff' },
  tripCountContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginHorizontal: 15,
    marginBottom: 15,
  },
  tripCountText: { fontSize: 16, fontWeight: '600', color: '#333' },
  exportButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#00B894',
    gap: 5,
  },
  exportText: { fontSize: 12, color: '#00B894', fontWeight: '500' },
  tripList: { paddingHorizontal: 15 },
  tripCard: {
    backgroundColor: '#fff',
    marginBottom: 12,
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  tripHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  tripDate: { fontSize: 12, color: '#999', marginBottom: 2 },
  passengerName: { fontSize: 16, fontWeight: '600', color: '#333' },
  tripFare: { fontSize: 18, fontWeight: 'bold', color: '#00B894' },
  routeInfo: { marginBottom: 10 },
  routeItem: { flexDirection: 'row', alignItems: 'center', marginVertical: 3 },
  routeText: { fontSize: 13, color: '#666', marginLeft: 8, flex: 1 },
  routeDivider: { height: 1, backgroundColor: '#eee', marginLeft: 20, marginVertical: 5 },
  tripFooter: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginTop: 5,
  },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ratingText: { fontSize: 12, color: '#666', marginLeft: 5 },
  statusBadge: { 
    backgroundColor: '#E8F5E8', 
    paddingHorizontal: 10, 
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: { fontSize: 12, color: '#4CAF50', fontWeight: '500' },
  emptyState: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 50,
    marginTop: 50,
  },
  emptyText: { fontSize: 18, color: '#666', marginTop: 20, fontWeight: '600' },
  emptySubtext: { fontSize: 14, color: '#999', marginTop: 10, textAlign: 'center' },
});