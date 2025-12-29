// screens/driver/DriverEarningsDetails.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const TIME_FILTERS = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'all', label: 'All Time' },
];

export default function DriverEarningsDetails() {
  const navigation = useNavigation();
  const [selectedFilter, setSelectedFilter] = useState('week');
  const [earningsData, setEarningsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [withdrawalAmount, setWithdrawalAmount] = useState('');

  useEffect(() => {
    loadEarningsData();
  }, [selectedFilter]);

  const loadEarningsData = async () => {
    try {
      setLoading(true);
      
      // Simulate API call delay
      setTimeout(() => {
        // Mock data based on filter
        const mockData = {
          today: {
            totalEarnings: 12500,
            totalRides: 8,
            averagePerRide: 1563,
            onlineHours: 6.5,
            earningsPerHour: 1923,
            breakdown: [
              { category: 'Ride Fares', amount: 10500, percentage: 84 },
              { category: 'Tips', amount: 1500, percentage: 12 },
              { category: 'Bonuses', amount: 500, percentage: 4 },
            ],
            dailyBreakdown: [
              { day: 'Mon', earnings: 12000, rides: 7 },
              { day: 'Tue', earnings: 12500, rides: 8 },
              { day: 'Wed', earnings: 0, rides: 0 },
              { day: 'Thu', earnings: 0, rides: 0 },
              { day: 'Fri', earnings: 0, rides: 0 },
              { day: 'Sat', earnings: 0, rides: 0 },
              { day: 'Sun', earnings: 0, rides: 0 },
            ],
            recentTransactions: [
              { id: '1', time: '10:45 AM', amount: 850, type: 'ride', passenger: 'Alice M.' },
              { id: '2', time: '11:20 AM', amount: 1200, type: 'ride', passenger: 'Bob K.' },
              { id: '3', time: '2:15 PM', amount: 500, type: 'tip', passenger: 'Charlie L.' },
              { id: '4', time: '4:30 PM', amount: 950, type: 'ride', passenger: 'Diana M.' },
            ],
          },
          week: {
            totalEarnings: 87500,
            totalRides: 56,
            averagePerRide: 1563,
            onlineHours: 42,
            earningsPerHour: 2083,
            breakdown: [
              { category: 'Ride Fares', amount: 73500, percentage: 84 },
              { category: 'Tips', amount: 10500, percentage: 12 },
              { category: 'Bonuses', amount: 3500, percentage: 4 },
            ],
            dailyBreakdown: [
              { day: 'Mon', earnings: 12000, rides: 7 },
              { day: 'Tue', earnings: 12500, rides: 8 },
              { day: 'Wed', earnings: 11000, rides: 7 },
              { day: 'Thu', earnings: 13000, rides: 8 },
              { day: 'Fri', earnings: 14500, rides: 9 },
              { day: 'Sat', earnings: 15500, rides: 10 },
              { day: 'Sun', earnings: 9000, rides: 7 },
            ],
            recentTransactions: [
              { id: '1', time: 'Today, 10:45 AM', amount: 850, type: 'ride', passenger: 'Alice M.' },
              { id: '2', time: 'Today, 11:20 AM', amount: 1200, type: 'ride', passenger: 'Bob K.' },
              { id: '3', time: 'Yesterday, 2:15 PM', amount: 500, type: 'tip', passenger: 'Charlie L.' },
              { id: '4', time: 'Yesterday, 4:30 PM', amount: 950, type: 'ride', passenger: 'Diana M.' },
            ],
          },
          month: {
            totalEarnings: 350000,
            totalRides: 224,
            averagePerRide: 1563,
            onlineHours: 168,
            earningsPerHour: 2083,
            breakdown: [
              { category: 'Ride Fares', amount: 294000, percentage: 84 },
              { category: 'Tips', amount: 42000, percentage: 12 },
              { category: 'Bonuses', amount: 14000, percentage: 4 },
            ],
            dailyBreakdown: [],
            recentTransactions: [],
          },
          all: {
            totalEarnings: 1250000,
            totalRides: 800,
            averagePerRide: 1563,
            onlineHours: 600,
            earningsPerHour: 2083,
            breakdown: [
              { category: 'Ride Fares', amount: 1050000, percentage: 84 },
              { category: 'Tips', amount: 150000, percentage: 12 },
              { category: 'Bonuses', amount: 50000, percentage: 4 },
            ],
            dailyBreakdown: [],
            recentTransactions: [],
          },
        };

        setEarningsData(mockData[selectedFilter]);
        setLoading(false);
        setRefreshing(false);
      }, 1000);
    } catch (error) {
      console.error('Error loading earnings:', error);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadEarningsData();
  };

  const handleWithdraw = () => {
    setShowWithdrawalModal(true);
  };

  const handleWithdrawalSubmit = () => {
    // In production, this would be an API call
    if (!withdrawalAmount || parseFloat(withdrawalAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (parseFloat(withdrawalAmount) > earningsData.totalEarnings) {
      alert('Amount exceeds available balance');
      return;
    }

    // Process withdrawal
    console.log('Withdrawal requested:', withdrawalAmount);
    
    setShowWithdrawalModal(false);
    setWithdrawalAmount('');
    alert(`Withdrawal request of MK ${withdrawalAmount} submitted!`);
  };

  const formatCurrency = (amount) => {
    return `MK ${amount.toLocaleString()}`;
  };

  const renderSummaryCards = () => (
    <View style={styles.summaryGrid}>
      <View style={styles.summaryCard}>
        <MaterialIcon name="attach-money" size={24} color="#22C55E" />
        <Text style={styles.summaryValue}>{formatCurrency(earningsData.totalEarnings)}</Text>
        <Text style={styles.summaryLabel}>Total Earnings</Text>
      </View>
      
      <View style={styles.summaryCard}>
        <MaterialIcon name="directions-car" size={24} color="#3B82F6" />
        <Text style={styles.summaryValue}>{earningsData.totalRides}</Text>
        <Text style={styles.summaryLabel}>Total Rides</Text>
      </View>
      
      <View style={styles.summaryCard}>
        <MaterialIcon name="trending-up" size={24} color="#F59E0B" />
        <Text style={styles.summaryValue}>{formatCurrency(earningsData.averagePerRide)}</Text>
        <Text style={styles.summaryLabel}>Avg per Ride</Text>
      </View>
      
      <View style={styles.summaryCard}>
        <MaterialIcon name="timer" size={24} color="#8B5CF6" />
        <Text style={styles.summaryValue}>{formatCurrency(earningsData.earningsPerHour)}</Text>
        <Text style={styles.summaryLabel}>Per Hour</Text>
      </View>
    </View>
  );

  const renderBreakdown = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Earnings Breakdown</Text>
        <Text style={styles.sectionSubtitle}>{selectedFilter}</Text>
      </View>
      
      <View style={styles.breakdownContainer}>
        {earningsData.breakdown.map((item, index) => (
          <View key={index} style={styles.breakdownItem}>
            <View style={styles.breakdownHeader}>
              <Text style={styles.breakdownLabel}>{item.category}</Text>
              <Text style={styles.breakdownAmount}>{formatCurrency(item.amount)}</Text>
            </View>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill,
                  { width: `${item.percentage}%`, backgroundColor: getColorForIndex(index) }
                ]} 
              />
            </View>
            <Text style={styles.breakdownPercentage}>{item.percentage}%</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const getColorForIndex = (index) => {
    const colors = ['#22C55E', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];
    return colors[index % colors.length];
  };

  const renderDailyBreakdown = () => {
    if (!earningsData.dailyBreakdown || earningsData.dailyBreakdown.length === 0) {
      return null;
    }

    const maxEarnings = Math.max(...earningsData.dailyBreakdown.map(d => d.earnings));
    
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Daily Performance</Text>
        <View style={styles.dailyChart}>
          {earningsData.dailyBreakdown.map((day, index) => {
            const height = maxEarnings > 0 ? (day.earnings / maxEarnings) * 80 : 0;
            
            return (
              <View key={index} style={styles.chartColumn}>
                <View style={styles.chartValueContainer}>
                  <Text style={styles.chartValue}>{day.earnings > 0 ? `MK ${day.earnings/1000}k` : '-'}</Text>
                </View>
                <View 
                  style={[
                    styles.chartBar,
                    { height: height, backgroundColor: day.earnings > 0 ? '#22C55E' : '#E5E7EB' }
                  ]} 
                />
                <Text style={styles.chartLabel}>{day.day}</Text>
                <Text style={styles.chartRides}>{day.rides} rides</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderRecentTransactions = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        <TouchableOpacity onPress={() => navigation.navigate('TransactionHistory')}>
          <Text style={styles.seeAllText}>See All</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.transactionsList}>
        {earningsData.recentTransactions.map((transaction) => (
          <View key={transaction.id} style={styles.transactionItem}>
            <View style={[
              styles.transactionIcon,
              { backgroundColor: transaction.type === 'tip' ? '#FEF2F2' : '#F0F9F0' }
            ]}>
              <MaterialIcon 
                name={transaction.type === 'tip' ? 'emoji-events' : 'directions-car'} 
                size={20} 
                color={transaction.type === 'tip' ? '#EF4444' : '#22C55E'} 
              />
            </View>
            
            <View style={styles.transactionInfo}>
              <Text style={styles.transactionType}>
                {transaction.type === 'ride' ? 'Ride Fare' : 'Tip'} • {transaction.passenger}
              </Text>
              <Text style={styles.transactionTime}>{transaction.time}</Text>
            </View>
            
            <Text style={styles.transactionAmount}>
              +{formatCurrency(transaction.amount)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderWithdrawalModal = () => (
    <Modal
      visible={showWithdrawalModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowWithdrawalModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Withdraw Earnings</Text>
            <TouchableOpacity onPress={() => setShowWithdrawalModal(false)}>
              <MaterialIcon name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <View style={styles.balanceInfo}>
              <Text style={styles.balanceLabel}>Available Balance</Text>
              <Text style={styles.balanceAmount}>
                {formatCurrency(earningsData?.totalEarnings || 0)}
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Amount to Withdraw (MK)</Text>
              <View style={styles.amountInputContainer}>
                <Text style={styles.currencySymbol}>MK</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="Enter amount"
                  value={withdrawalAmount}
                  onChangeText={setWithdrawalAmount}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.quickAmounts}>
              {[5000, 10000, 25000, 50000].map((amount) => (
                <TouchableOpacity
                  key={amount}
                  style={styles.quickAmount}
                  onPress={() => setWithdrawalAmount(amount.toString())}
                >
                  <Text style={styles.quickAmountText}>MK {amount.toLocaleString()}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.withdrawalInfo}>
              <MaterialIcon name="info" size={16} color="#666" />
              <Text style={styles.withdrawalInfoText}>
                Withdrawals are processed within 24-48 hours. Minimum withdrawal is MK 5,000.
              </Text>
            </View>
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setShowWithdrawalModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.withdrawButton}
              onPress={handleWithdrawalSubmit}
            >
              <Text style={styles.withdrawButtonText}>Withdraw</Text>
            </TouchableOpacity>
          </View>
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
        <Text style={styles.headerTitle}>Earnings Details</Text>
        <TouchableOpacity 
          style={styles.withdrawButtonHeader}
          onPress={handleWithdraw}
        >
          <MaterialIcon name="account-balance-wallet" size={20} color="#22C55E" />
          <Text style={styles.withdrawButtonTextHeader}>Withdraw</Text>
        </TouchableOpacity>
      </View>

      {/* Time Filters */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        {TIME_FILTERS.map((filter) => (
          <TouchableOpacity
            key={filter.id}
            style={[
              styles.filterButton,
              selectedFilter === filter.id && styles.filterButtonActive,
            ]}
            onPress={() => setSelectedFilter(filter.id)}
          >
            <Text style={[
              styles.filterText,
              selectedFilter === filter.id && styles.filterTextActive,
            ]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22C55E" />
          <Text style={styles.loadingText}>Loading earnings data...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#22C55E']}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {renderSummaryCards()}
          {renderBreakdown()}
          {renderDailyBreakdown()}
          {renderRecentTransactions()}
        </ScrollView>
      )}

      {/* Withdrawal Modal */}
      {renderWithdrawalModal()}
    </View>
  );
}

// Add TextInput import if not already imported
import { TextInput } from 'react-native';

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
  withdrawButtonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  withdrawButtonTextHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22C55E',
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filtersContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#22C55E',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginTop: 16,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
    marginBottom: 24,
  },
  summaryCard: {
    width: (width - 64) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    margin: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginTop: 8,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  seeAllText: {
    fontSize: 14,
    color: '#22C55E',
    fontWeight: '500',
  },
  breakdownContainer: {
    gap: 12,
  },
  breakdownItem: {
    marginBottom: 8,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#000000',
  },
  breakdownAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  breakdownPercentage: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 4,
  },
  dailyChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
  },
  chartColumn: {
    alignItems: 'center',
    flex: 1,
  },
  chartValueContainer: {
    marginBottom: 4,
  },
  chartValue: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
  },
  chartBar: {
    width: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  chartLabel: {
    fontSize: 12,
    color: '#000000',
    fontWeight: '500',
  },
  chartRides: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  transactionsList: {
    gap: 12,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionType: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 2,
  },
  transactionTime: {
    fontSize: 12,
    color: '#666',
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22C55E',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
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
  balanceInfo: {
    backgroundColor: '#F0F9F0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#22C55E',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 8,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    overflow: 'hidden',
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    paddingHorizontal: 16,
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  quickAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  quickAmount: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quickAmountText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  withdrawalInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEFCE8',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  withdrawalInfoText: {
    flex: 1,
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
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
  withdrawButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#22C55E',
  },
  withdrawButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});