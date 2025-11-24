// screens/driver/EarningsScreen.js
import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl 
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import Header from 'components/Header';
import Loading from 'components/Loading';

export default function EarningsScreen({ route, navigation }) {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [earningsData, setEarningsData] = useState({
    today: { amount: 0, rides: 0, hours: 0 },
    week: { amount: 0, rides: 0, hours: 0 },
    month: { amount: 0, rides: 0, hours: 0 },
    total: { amount: 0, rides: 0, hours: 0 }
  });

  // Get user data from registration flow
  const { phone, authMethod, socialUserInfo, userProfile } = route.params || {};

  // Display user info based on auth method
  const getUserInfo = () => {
    if (userProfile?.fullName) {
      return userProfile.fullName;
    } else if (socialUserInfo?.name) {
      return socialUserInfo.name;
    } else if (phone) {
      return `Driver (${phone})`;
    }
    return "Driver";
  };

  const fetchEarningsData = async () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      // Mock data - replace with actual API call
      setEarningsData({
        today: { amount: 0, rides: 0, hours: 0 },
        week: { amount: 0, rides: 0, hours: 0 },
        month: { amount: 0, rides: 0, hours: 0 },
        total: { amount: 0, rides: 0, hours: 0 }
      });
      setLoading(false);
      setRefreshing(false);
    }, 1500);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchEarningsData();
  };

  useEffect(() => {
    fetchEarningsData();
  }, []);

  const getPeriodData = () => {
    return earningsData[selectedPeriod] || earningsData.today;
  };

  const formatCurrency = (amount) => {
    return `MK ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  const periodButtons = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'total', label: 'All Time' },
  ];

  const currentData = getPeriodData();

  if (loading && !refreshing) {
    return <Loading message="Loading your earnings..." />;
  }

  return (
    <View style={styles.container}>
      <Header 
        title="Earnings" 
        showBack={true}
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* User Welcome Card */}
        <View style={styles.welcomeCard}>
          <View style={styles.avatarContainer}>
            <Icon name="user-circle" size={50} color="#6c3" />
          </View>
          <View style={styles.welcomeTextContainer}>
            <Text style={styles.welcomeName}>{getUserInfo()}</Text>
            <Text style={styles.welcomeSubtitle}>Your driving earnings</Text>
          </View>
        </View>

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {periodButtons.map((period) => (
            <TouchableOpacity
              key={period.key}
              style={[
                styles.periodButton,
                selectedPeriod === period.key && styles.periodButtonActive
              ]}
              onPress={() => setSelectedPeriod(period.key)}
            >
              <Text style={[
                styles.periodButtonText,
                selectedPeriod === period.key && styles.periodButtonTextActive
              ]}>
                {period.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Main Earnings Card */}
        <View style={styles.mainEarningsCard}>
          <Text style={styles.mainEarningsLabel}>
            {selectedPeriod === 'today' ? "Today's Earnings" :
             selectedPeriod === 'week' ? "This Week's Earnings" :
             selectedPeriod === 'month' ? "This Month's Earnings" : "Total Earnings"}
          </Text>
          <Text style={styles.mainEarningsAmount}>
            {formatCurrency(currentData.amount)}
          </Text>
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Icon name="car" size={20} color="#6c3" />
              <Text style={styles.statNumber}>{currentData.rides}</Text>
              <Text style={styles.statLabel}>Rides</Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statItem}>
              <Icon name="clock-o" size={20} color="#6c3" />
              <Text style={styles.statNumber}>{currentData.hours}h</Text>
              <Text style={styles.statLabel}>Online</Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statItem}>
              <Icon name="money" size={20} color="#6c3" />
              <Text style={styles.statNumber}>
                {currentData.rides > 0 ? formatCurrency(currentData.amount / currentData.rides) : 'MK 0.00'}
              </Text>
              <Text style={styles.statLabel}>Avg/Ride</Text>
            </View>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.quickStatsContainer}>
          <View style={styles.quickStatCard}>
            <Icon name="trophy" size={24} color="#FFD700" />
            <Text style={styles.quickStatValue}>0</Text>
            <Text style={styles.quickStatLabel}>Completed Rides</Text>
          </View>
          
          <View style={styles.quickStatCard}>
            <Icon name="star" size={24} color="#FF6B6B" />
            <Text style={styles.quickStatValue}>0.0</Text>
            <Text style={styles.quickStatLabel}>Rating</Text>
          </View>
          
          <View style={styles.quickStatCard}>
            <Icon name="check-circle" size={24} color="#4CAF50" />
            <Text style={styles.quickStatValue}>100%</Text>
            <Text style={styles.quickStatLabel}>Acceptance</Text>
          </View>
        </View>

        {/* Earnings Breakdown */}
        <View style={styles.breakdownCard}>
          <Text style={styles.breakdownTitle}>Earnings Breakdown</Text>
          
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>Ride Fares</Text>
            <Text style={styles.breakdownValue}>{formatCurrency(0)}</Text>
          </View>
          
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>Tips</Text>
            <Text style={styles.breakdownValue}>{formatCurrency(0)}</Text>
          </View>
          
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>Bonuses</Text>
            <Text style={styles.breakdownValue}>{formatCurrency(0)}</Text>
          </View>
          
          <View style={[styles.breakdownItem, styles.breakdownTotal]}>
            <Text style={styles.breakdownTotalLabel}>Total Earnings</Text>
            <Text style={styles.breakdownTotalValue}>{formatCurrency(0)}</Text>
          </View>
        </View>

        {/* Call to Action */}
        <View style={styles.ctaCard}>
          <Icon name="road" size={40} color="#6c3" />
          <Text style={styles.ctaTitle}>Start Earning Today!</Text>
          <Text style={styles.ctaDescription}>
            Go online and accept ride requests to start earning money with Kabaza.
          </Text>
          <TouchableOpacity 
            style={styles.ctaButton}
            onPress={() => navigation.navigate('DriverHome')}
          >
            <Text style={styles.ctaButtonText}>Go Online Now</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerText}>
          Earnings update in real-time. Contact support for any discrepancies.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  welcomeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  avatarContainer: {
    marginRight: 15,
  },
  welcomeTextContainer: {
    flex: 1,
  },
  welcomeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodButtonActive: {
    backgroundColor: '#6c3',
  },
  periodButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  mainEarningsCard: {
    backgroundColor: '#6c3',
    padding: 25,
    borderRadius: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  mainEarningsLabel: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 10,
  },
  mainEarningsAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  quickStatsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 10,
  },
  quickStatCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  quickStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 5,
  },
  quickStatLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  breakdownCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  breakdownTotal: {
    borderBottomWidth: 0,
    marginTop: 10,
    paddingTop: 15,
    borderTopWidth: 2,
    borderTopColor: '#6c3',
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#666',
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  breakdownTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  breakdownTotalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6c3',
  },
  ctaCard: {
    backgroundColor: '#fff',
    padding: 25,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  ctaTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 10,
  },
  ctaDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  ctaButton: {
    backgroundColor: '#6c3',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  ctaButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
});