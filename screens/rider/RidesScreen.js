// screens/rider/RidesScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { getRideHistory } from '../../src/utils/userStorage';

const RidesScreen = ({ navigation, route }) => {
  const [activeTab, setActiveTab] = useState('Past');
  const [rideHistory, setRideHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRideHistory();
  }, []);

  const loadRideHistory = async () => {
    try {
      const history = await getRideHistory();
      setRideHistory(history);
    } catch (error) {
      console.error('Failed to load ride history:', error);
      // Fallback sample data
      setRideHistory([
        {
          id: '1',
          date: '3 Dec 2025 · 21:55',
          destination: '6th Avenue, Lilongwe, Malawi',
          price: 'MK 850',
          status: 'completed',
        },
        {
          id: '2',
          date: '10 Oct 2025 · 21:58',
          destination: 'Kamuzu Central Hospital, Lilongwe, Malawi',
          price: 'MK 1,100',
          status: 'completed',
        },
        {
          id: '3',
          date: '9 Oct 2025 · 20:30',
          destination: 'Area 3 Shopping Complex, Lilongwe',
          price: 'MK 0',
          status: 'cancelled',
        },
        {
          id: '4',
          date: '5 Oct 2025 · 18:15',
          destination: 'Bingu National Stadium, Lilongwe',
          price: 'MK 950',
          status: 'completed',
        },
        {
          id: '5',
          date: '1 Oct 2025 · 14:20',
          destination: 'Mzuzu University, Mzuzu',
          price: 'MK 1,500',
          status: 'completed',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const renderRideItem = ({ item }) => (
    <TouchableOpacity style={styles.rideItem}>
      <View style={styles.rideHeader}>
        <Text style={styles.rideDate}>{item.date}</Text>
        <Text style={[
          styles.ridePrice,
          item.status === 'cancelled' && styles.cancelledPrice
        ]}>
          {item.price}
        </Text>
      </View>
      
      <View style={styles.rideDetails}>
        <MaterialIcon name="location-pin" size={16} color="#666" />
        <Text style={styles.locationText} numberOfLines={2}>
          {item.destination}
        </Text>
      </View>
      
      {item.status === 'cancelled' && (
        <View style={styles.cancelledBadge}>
          <Text style={styles.cancelledText}>Cancelled</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderMonthSection = (month, year, rides) => {
    if (rides.length === 0) return null;

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    return (
      <View key={`${month}-${year}`} style={styles.monthSection}>
        <Text style={styles.monthTitle}>
          {monthNames[month]} {year}
        </Text>
        <FlatList
          data={rides}
          renderItem={renderRideItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
        />
      </View>
    );
  };

  // Group rides by month
  const groupRidesByMonth = () => {
    const grouped = {};
    
    rideHistory.forEach(ride => {
      // Extract month and year from date string
      const dateMatch = ride.date.match(/(\d{1,2}) (\w{3}) (\d{4})/);
      if (dateMatch) {
        const [, day, monthStr, year] = dateMatch;
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = monthNames.indexOf(monthStr);
        
        if (month !== -1) {
          const key = `${year}-${month}`;
          if (!grouped[key]) {
            grouped[key] = [];
          }
          grouped[key].push(ride);
        }
      }
    });
    
    return grouped;
  };

  const groupedRides = groupRidesByMonth();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Rides</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'Past' && styles.activeTab]}
          onPress={() => setActiveTab('Past')}
        >
          <Text style={[styles.tabText, activeTab === 'Past' && styles.activeTabText]}>
            Past
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'Upcoming' && styles.activeTab]}
          onPress={() => setActiveTab('Upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'Upcoming' && styles.activeTabText]}>
            Upcoming
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

      {/* Ride List */}
      <ScrollView style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text>Loading your rides...</Text>
          </View>
        ) : rideHistory.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcon name="history" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No rides yet</Text>
            <Text style={styles.emptyText}>
              Your ride history will appear here
            </Text>
          </View>
        ) : (
          // Display grouped rides
          Object.keys(groupedRides)
            .sort((a, b) => b.localeCompare(a)) // Sort newest first
            .map(key => {
              const [year, month] = key.split('-').map(Number);
              return renderMonthSection(month, year, groupedRides[key]);
            })
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 16,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#000',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#000',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginBottom: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  monthSection: {
    marginBottom: 24,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  rideItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rideDate: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  ridePrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  cancelledPrice: {
    color: '#ff6b6b',
  },
  rideDetails: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  locationText: {
    fontSize: 15,
    color: '#000',
    marginLeft: 8,
    flex: 1,
  },
  cancelledBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffebee',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  cancelledText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#ff6b6b',
  },
});

export default RidesScreen;