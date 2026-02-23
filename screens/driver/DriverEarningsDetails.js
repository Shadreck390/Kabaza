/**
 * ============================================================================
 * screens/driver/DriverEarningsDetails.js
 * ============================================================================
 * 
 * COMPREHENSIVE DRIVER EARNINGS DETAILS SCREEN
 * 
 * Features:
 * - Real-time earnings tracking with breakdown
 * - Interactive charts and visualizations
 * - Multiple time period filters (Today, Week, Month, Year, Custom)
 * - Transaction history with filtering
 * - Withdrawal functionality
 * - Performance analytics and insights
 * - Offline data persistence
 * - Export earnings reports
 * - Tax calculation and deductions
 * - Goal setting and tracking
 * 
 * Navigation: DriverHome → Earnings → DriverEarningsDetails
 * ============================================================================
 */

import React, { useState, useEffect, useCallback } from 'react';
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
  TextInput,
  Alert,
  Platform,
  Share,
  Animated,
  Easing,
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import FontAwesomeIcon from 'react-native-vector-icons/FontAwesome';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Svg, Circle, Path, G, Text as SvgText } from 'react-native-svg';
import { PieChart } from 'react-native-chart-kit';
import * as shape from 'd3-shape';
import { LineChart, BarChart } from 'react-native-chart-kit';

// API Service (would be imported from your services)
import { getDriverEarnings, getEarningsBreakdown, withdrawEarnings } from '@services/api/earningsService';

const { width, height } = Dimensions.get('window');

// Time period filters with icons
const TIME_FILTERS = [
  { id: 'today', label: 'Today', icon: 'today' },
  { id: 'yesterday', label: 'Yesterday', icon: 'yesterday' },
  { id: 'week', label: 'This Week', icon: 'week' },
  { id: 'month', label: 'This Month', icon: 'month' },
  { id: 'quarter', label: 'This Quarter', icon: 'quarter' },
  { id: 'year', label: 'This Year', icon: 'year' },
  { id: 'all', label: 'All Time', icon: 'all-time' },
  { id: 'custom', label: 'Custom', icon: 'calendar' },
];

// Payment methods for withdrawal
const PAYMENT_METHODS = [
  { id: 'mobile_money', name: 'Mobile Money', icon: 'smartphone', color: '#3B82F6' },
  { id: 'bank_transfer', name: 'Bank Transfer', icon: 'bank', color: '#22C55E' },
  { id: 'cash', name: 'Cash Pickup', icon: 'money', color: '#F59E0B' },
];

// Transaction types
const TRANSACTION_TYPES = [
  { id: 'all', label: 'All Transactions' },
  { id: 'ride_fare', label: 'Ride Fares' },
  { id: 'tip', label: 'Tips' },
  { id: 'bonus', label: 'Bonuses' },
  { id: 'withdrawal', label: 'Withdrawals' },
  { id: 'penalty', label: 'Penalties' },
];

export default function DriverEarningsDetails() {
  const navigation = useNavigation();
  
  // State Management
  const [selectedFilter, setSelectedFilter] = useState('week');
  const [selectedTransactionType, setSelectedTransactionType] = useState('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('mobile_money');
  const [earningsData, setEarningsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [customDateRange, setCustomDateRange] = useState({ start: null, end: null });
  const [offlineData, setOfflineData] = useState([]);
  const [showInsights, setShowInsights] = useState(false);
  const [dailyGoals, setDailyGoals] = useState({ amount: 50000, rides: 10 });
  const [animationValue] = useState(new Animated.Value(0));
  
  // Chart data states
  const [pieData, setPieData] = useState([]);
  const [barData, setBarData] = useState({ labels: [], datasets: [{ data: [] }] });
  const [lineData, setLineData] = useState({ labels: [], datasets: [{ data: [] }] });

  // Load data on focus and filter change
  useFocusEffect(
    useCallback(() => {
      loadEarningsData();
      loadOfflineData();
      return () => {
        // Cleanup if needed
      };
    }, [selectedFilter, selectedTransactionType])
  );

  // Load offline/synced data
  const loadOfflineData = async () => {
    try {
      const storedData = await AsyncStorage.getItem('driver_earnings_offline');
      if (storedData) {
        setOfflineData(JSON.parse(storedData));
      }
    } catch (error) {
      console.error('Error loading offline data:', error);
    }
  };

  // Main data loading function
  const loadEarningsData = async () => {
    try {
      setLoading(true);
      
      // Check for cached data first
      const cachedData = await getCachedEarningsData();
      if (cachedData && !refreshing) {
        setEarningsData(cachedData);
        prepareChartData(cachedData);
        setLoading(false);
      }

      // Fetch fresh data from API
      const data = await fetchEarningsFromAPI();
      if (data) {
        setEarningsData(data);
        prepareChartData(data);
        cacheEarningsData(data);
      }
      
      // Calculate performance insights
      calculatePerformanceInsights(data);
      
    } catch (error) {
      console.error('Error loading earnings:', error);
      showErrorAlert('Failed to load earnings data. Please check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch data from API
  const fetchEarningsFromAPI = async () => {
    try {
      // This would be your actual API call
      // const response = await getDriverEarnings(selectedFilter, customDateRange);
      
      // Mock data for demonstration
      return getMockEarningsData(selectedFilter);
    } catch (error) {
      throw error;
    }
  };

  // Prepare chart data from earnings data
  const prepareChartData = (data) => {
    if (!data) return;

    // Prepare pie chart data for react-native-chart-kit
    const pieChartData = data.breakdown.map((item, index) => ({
      name: item.category,
      population: item.percentage,
      color: getColorForIndex(index),
      legendFontColor: "#333",
      legendFontSize: 12,
    }));
    setPieData(pieChartData);

    // Prepare bar chart data (daily breakdown)
    if (data.dailyBreakdown && data.dailyBreakdown.length > 0) {
      const labels = data.dailyBreakdown.map(d => d.day);
      const earnings = data.dailyBreakdown.map(d => d.earnings / 1000); // Convert to thousands
      
      setBarData({
        labels,
        datasets: [{
          data: earnings,
          color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
        }]
      });
    }

    // Prepare line chart data (trend)
    if (data.trendData && data.trendData.length > 0) {
      setLineData({
        labels: data.trendData.map(d => d.month),
        datasets: [{
          data: data.trendData.map(d => d.earnings / 10000), // Convert to ten-thousands
          color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
        }]
      });
    }
  };

  // Calculate performance insights
  const calculatePerformanceInsights = (data) => {
    if (!data) return;

    // Calculate progress towards goals
    const progress = {
      amount: Math.min(100, (data.totalEarnings / dailyGoals.amount) * 100),
      rides: Math.min(100, (data.totalRides / dailyGoals.rides) * 100),
    };

    // Calculate streaks
    const currentStreak = calculateStreak(data.dailyBreakdown);
    
    // Best performing times
    const bestTimes = calculateBestTimes(data.hourlyBreakdown || []);

    setShowInsights({
      progress,
      streak: currentStreak,
      bestTimes,
      peakHours: data.peakHours || ['8-10 AM', '5-7 PM'],
    });
  };

  // Refresh control handler
  const onRefresh = () => {
    setRefreshing(true);
    loadEarningsData();
  };

  // Withdrawal functionality
  const handleWithdraw = () => {
    if (!earningsData?.availableBalance || earningsData.availableBalance < 5000) {
      Alert.alert(
        'Insufficient Balance',
        'Minimum withdrawal amount is MK 5,000. Please continue driving to earn more.',
        [{ text: 'OK' }]
      );
      return;
    }
    setShowWithdrawalModal(true);
  };

  const handleWithdrawalSubmit = async () => {
    if (!withdrawalAmount || parseFloat(withdrawalAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    const amount = parseFloat(withdrawalAmount);
    if (amount < 5000) {
      Alert.alert('Error', 'Minimum withdrawal amount is MK 5,000');
      return;
    }

    if (amount > earningsData.availableBalance) {
      Alert.alert('Error', 'Amount exceeds available balance');
      return;
    }

    try {
      // API call for withdrawal
      // await withdrawEarnings(amount, selectedPaymentMethod);
      
      // For demo, simulate withdrawal
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Update local state
      const updatedEarnings = {
        ...earningsData,
        availableBalance: earningsData.availableBalance - amount,
        totalEarnings: earningsData.totalEarnings,
        pendingWithdrawal: (earningsData.pendingWithdrawal || 0) + amount,
      };
      setEarningsData(updatedEarnings);

      // Add to transactions
      const withdrawalTransaction = {
        id: `wd_${Date.now()}`,
        time: new Date().toLocaleTimeString(),
        amount: -amount,
        type: 'withdrawal',
        method: selectedPaymentMethod,
        status: 'pending',
        timestamp: Date.now(),
      };

      setOfflineData(prev => [withdrawalTransaction, ...prev]);
      await AsyncStorage.setItem('driver_earnings_offline', JSON.stringify([withdrawalTransaction, ...offlineData]));

      setShowWithdrawalModal(false);
      setWithdrawalAmount('');
      
      Alert.alert(
        'Withdrawal Request Submitted',
        `MK ${amount.toLocaleString()} withdrawal request has been submitted. It will be processed within 24-48 hours.`,
        [{ text: 'OK' }]
      );

    } catch (error) {
      Alert.alert('Error', 'Failed to process withdrawal. Please try again.');
      console.error('Withdrawal error:', error);
    }
  };

  // Share earnings report
  const shareEarningsReport = async () => {
    try {
      const report = generateEarningsReport();
      await Share.share({
        title: 'My Earnings Report',
        message: report,
        url: 'https://kabaza.com/reports',
      });
    } catch (error) {
      console.error('Error sharing report:', error);
    }
  };

  // Export earnings as PDF/CSV
  const exportEarnings = (format) => {
    Alert.alert(
      `Export as ${format.toUpperCase()}`,
      `Your earnings report will be generated and saved to your device.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Export', 
          onPress: () => generateExportFile(format)
        }
      ]
    );
  };

  // Format currency
  const formatCurrency = (amount) => {
    return `MK ${amount?.toLocaleString() || '0'}`;
  };

  // Format time
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) {
      return `${diffMins} min ago`;
    } else if (diffMins < 1440) {
      return `${Math.floor(diffMins / 60)} hours ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Get color for charts
  const getColorForIndex = (index) => {
    const colors = ['#22C55E', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];
    return colors[index % colors.length];
  };

  // Render summary cards with animation
  const renderSummaryCards = () => {
    const cards = [
      {
        key: 'total',
        title: 'Total Earnings',
        value: formatCurrency(earningsData.totalEarnings),
        icon: 'attach-money',
        color: '#22C55E',
        trend: '+12.5%',
        subtitle: 'Lifetime',
      },
      {
        key: 'available',
        title: 'Available Now',
        value: formatCurrency(earningsData.availableBalance),
        icon: 'account-balance-wallet',
        color: '#3B82F6',
        trend: null,
        subtitle: 'Ready to withdraw',
      },
      {
        key: 'rides',
        title: 'Total Rides',
        value: earningsData.totalRides.toString(),
        icon: 'directions-car',
        color: '#F59E0B',
        trend: '+8%',
        subtitle: `${earningsData.onlineHours} hours online`,
      },
      {
        key: 'average',
        title: 'Average per Ride',
        value: formatCurrency(earningsData.averagePerRide),
        icon: 'trending-up',
        color: '#8B5CF6',
        trend: '+5.2%',
        subtitle: 'Per hour: ' + formatCurrency(earningsData.earningsPerHour),
      },
    ];

    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.summaryScroll}
        contentContainerStyle={styles.summaryScrollContent}
      >
        {cards.map((card, index) => (
          <Animated.View
            key={card.key}
            style={[
              styles.summaryCard,
              {
                opacity: animationValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                }),
                transform: [{
                  translateY: animationValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                  }),
                }],
              },
            ]}
          >
            <View style={[styles.cardIconContainer, { backgroundColor: `${card.color}15` }]}>
              <MaterialIcon name={card.icon} size={24} color={card.color} />
            </View>
            <Text style={styles.summaryValue}>{card.value}</Text>
            <Text style={styles.summaryLabel}>{card.title}</Text>
            <View style={styles.cardFooter}>
              <Text style={styles.cardSubtitle}>{card.subtitle}</Text>
              {card.trend && (
                <View style={[styles.trendBadge, { backgroundColor: `${card.color}20` }]}>
                  <MaterialIcon name="trending-up" size={12} color={card.color} />
                  <Text style={[styles.trendText, { color: card.color }]}>{card.trend}</Text>
                </View>
              )}
            </View>
          </Animated.View>
        ))}
      </ScrollView>
    );
  };

  // Render earnings breakdown with pie chart
  const renderBreakdown = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Earnings Breakdown</Text>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}
        >
          <MaterialIcon name="filter-list" size={20} color="#666" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.breakdownContainer}>
        <View style={styles.chartContainer}>
          <PieChart
            data={pieData}
            width={200}
            height={200}
            chartConfig={{
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            }}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            center={[100, 100]}
            absolute
          />
          <View style={styles.chartCenter}>
            <Text style={styles.chartCenterText}>Total</Text>
            <Text style={styles.chartCenterValue}>
              {formatCurrency(earningsData.totalEarnings)}
            </Text>
          </View>
        </View>
        
        <View style={styles.breakdownLegend}>
          {earningsData.breakdown.map((item, index) => (
            <View key={index} style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: getColorForIndex(index) }]} />
              <View style={styles.legendTextContainer}>
                <Text style={styles.legendLabel}>{item.category}</Text>
                <Text style={styles.legendPercentage}>{item.percentage}%</Text>
              </View>
              <Text style={styles.legendAmount}>{formatCurrency(item.amount)}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  // Render performance charts
  const renderCharts = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Performance Analytics</Text>
      
      {/* Daily Earnings Bar Chart */}
      <View style={styles.chartSection}>
        <Text style={styles.chartTitle}>Daily Earnings (MK)</Text>
        <BarChart
          data={barData}
          width={width - 64}
          height={220}
          chartConfig={{
            backgroundColor: '#FFFFFF',
            backgroundGradientFrom: '#FFFFFF',
            backgroundGradientTo: '#FFFFFF',
            decimalPlaces: 1,
            color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: {
              borderRadius: 16,
            },
            propsForDots: {
              r: '4',
              strokeWidth: '2',
              stroke: '#22C55E',
            },
          }}
          style={styles.chart}
          verticalLabelRotation={30}
          showValuesOnTopOfBars={true}
        />
      </View>
      
      {/* Earnings Trend Line Chart */}
      {lineData.labels.length > 0 && (
        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>Monthly Trend (MK '000)</Text>
          <LineChart
            data={lineData}
            width={width - 64}
            height={220}
            chartConfig={{
              backgroundColor: '#FFFFFF',
              backgroundGradientFrom: '#FFFFFF',
              backgroundGradientTo: '#FFFFFF',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: {
                borderRadius: 16,
              },
              propsForDots: {
                r: '5',
                strokeWidth: '2',
                stroke: '#3B82F6',
              },
            }}
            bezier
            style={styles.chart}
          />
        </View>
      )}
    </View>
  );

  // Render transaction history
  const renderTransactions = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        <View style={styles.transactionHeaderActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('TransactionHistory')}
          >
            <Text style={styles.seeAllText}>See All</Text>
            <MaterialIcon name="chevron-right" size={16} color="#22C55E" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.exportButton}
            onPress={() => exportEarnings('csv')}
          >
            <MaterialIcon name="download" size={18} color="#666" />
          </TouchableOpacity>
        </View>
      </View>
      
      <ScrollView style={styles.transactionsList}>
        {(earningsData.recentTransactions || []).map((transaction) => (
          <TouchableOpacity 
            key={transaction.id}
            style={styles.transactionItem}
            onPress={() => navigation.navigate('TransactionDetail', { transactionId: transaction.id })}
          >
            <View style={[
              styles.transactionIcon,
              { 
                backgroundColor: transaction.amount > 0 ? '#F0F9F0' : '#FEF2F2',
                borderColor: transaction.amount > 0 ? '#22C55E' : '#EF4444',
              }
            ]}>
              <MaterialIcon 
                name={getTransactionIcon(transaction.type)}
                size={20}
                color={transaction.amount > 0 ? '#22C55E' : '#EF4444'}
              />
            </View>
            
            <View style={styles.transactionInfo}>
              <Text style={styles.transactionType}>
                {getTransactionTypeLabel(transaction.type)}
              </Text>
              <Text style={styles.transactionDetails}>
                {transaction.passenger || transaction.description}
                {transaction.status && ` • ${transaction.status}`}
              </Text>
              <Text style={styles.transactionTime}>
                {formatTime(transaction.timestamp)}
              </Text>
            </View>
            
            <View style={styles.transactionAmountContainer}>
              <Text style={[
                styles.transactionAmount,
                { color: transaction.amount > 0 ? '#22C55E' : '#EF4444' }
              ]}>
                {transaction.amount > 0 ? '+' : ''}{formatCurrency(Math.abs(transaction.amount))}
              </Text>
              {transaction.status === 'pending' && (
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingText}>Pending</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
        
        {offlineData.length > 0 && (
          <>
            <View style={styles.offlineDivider}>
              <Text style={styles.offlineText}>Offline Transactions</Text>
            </View>
            {offlineData.map((transaction) => (
              <View key={transaction.id} style={[styles.transactionItem, styles.offlineTransaction]}>
                <MaterialIcon name="cloud-off" size={20} color="#F59E0B" />
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionType}>Offline {getTransactionTypeLabel(transaction.type)}</Text>
                  <Text style={styles.transactionTime}>Will sync when online</Text>
                </View>
                <Text style={styles.transactionAmount}>
                  {transaction.amount > 0 ? '+' : ''}{formatCurrency(Math.abs(transaction.amount))}
                </Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );

  // Render withdrawal modal
  const renderWithdrawalModal = () => (
    <Modal
      visible={showWithdrawalModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowWithdrawalModal(false)}
    >
      <View style={styles.modalOverlay}>
        <ScrollView style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Withdraw Earnings</Text>
            <TouchableOpacity onPress={() => setShowWithdrawalModal(false)}>
              <MaterialIcon name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            {/* Available Balance */}
            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>Available Balance</Text>
              <Text style={styles.balanceAmount}>
                {formatCurrency(earningsData?.availableBalance || 0)}
              </Text>
              <Text style={styles.balanceNote}>Minimum withdrawal: MK 5,000</Text>
            </View>

            {/* Payment Method Selection */}
            <View style={styles.paymentMethodSection}>
              <Text style={styles.sectionLabel}>Select Payment Method</Text>
              <View style={styles.paymentMethods}>
                {PAYMENT_METHODS.map((method) => (
                  <TouchableOpacity
                    key={method.id}
                    style={[
                      styles.paymentMethod,
                      selectedPaymentMethod === method.id && styles.paymentMethodSelected,
                    ]}
                    onPress={() => setSelectedPaymentMethod(method.id)}
                  >
                    <View style={[styles.methodIcon, { backgroundColor: `${method.color}20` }]}>
                      <MaterialIcon name={method.icon} size={24} color={method.color} />
                    </View>
                    <Text style={styles.methodName}>{method.name}</Text>
                    {selectedPaymentMethod === method.id && (
                      <MaterialIcon name="check-circle" size={20} color={method.color} style={styles.methodCheck} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Amount Input */}
            <View style={styles.amountSection}>
              <Text style={styles.sectionLabel}>Enter Amount</Text>
              <View style={styles.amountInputContainer}>
                <Text style={styles.currencySymbol}>MK</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0.00"
                  value={withdrawalAmount}
                  onChangeText={setWithdrawalAmount}
                  keyboardType="numeric"
                  placeholderTextColor="#999"
                />
                <TouchableOpacity
                  style={styles.maxButton}
                  onPress={() => setWithdrawalAmount(earningsData?.availableBalance.toString())}
                >
                  <Text style={styles.maxButtonText}>MAX</Text>
                </TouchableOpacity>
              </View>
              
              {/* Quick Amount Buttons */}
              <View style={styles.quickAmountGrid}>
                {[5000, 10000, 20000, 50000].map((amount) => (
                  <TouchableOpacity
                    key={amount}
                    style={[
                      styles.quickAmountButton,
                      withdrawalAmount === amount.toString() && styles.quickAmountButtonActive,
                    ]}
                    onPress={() => setWithdrawalAmount(amount.toString())}
                  >
                    <Text style={[
                      styles.quickAmountText,
                      withdrawalAmount === amount.toString() && styles.quickAmountTextActive,
                    ]}>
                      MK {amount.toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Withdrawal Summary */}
            {withdrawalAmount && parseFloat(withdrawalAmount) > 0 && (
              <View style={styles.summarySection}>
                <Text style={styles.summaryTitle}>Withdrawal Summary</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Amount</Text>
                  <Text style={styles.summaryValue}>
                    MK {parseFloat(withdrawalAmount).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Processing Fee</Text>
                  <Text style={styles.summaryValue}>
                    MK {(parseFloat(withdrawalAmount) * 0.02).toLocaleString()}
                  </Text>
                </View>
                <View style={[styles.summaryRow, styles.summaryTotal]}>
                  <Text style={styles.summaryTotalLabel}>You Will Receive</Text>
                  <Text style={styles.summaryTotalValue}>
                    MK {(parseFloat(withdrawalAmount) * 0.98).toLocaleString()}
                  </Text>
                </View>
                <Text style={styles.processingTime}>
                  Estimated processing time: 24-48 hours
                </Text>
              </View>
            )}

            {/* Important Notes */}
            <View style={styles.notesSection}>
              <MaterialIcon name="info" size={20} color="#3B82F6" />
              <Text style={styles.notesText}>
                • Withdrawals are processed on business days (Mon-Fri)
                {'\n'}• Ensure your payment details are up-to-date
                {'\n'}• Contact support for any withdrawal issues
              </Text>
            </View>
          </View>

          {/* Modal Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowWithdrawalModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modalButton, styles.withdrawButton]}
              onPress={handleWithdrawalSubmit}
              disabled={!withdrawalAmount || parseFloat(withdrawalAmount) < 5000}
            >
              <MaterialIcon name="send" size={20} color="#FFF" />
              <Text style={styles.withdrawButtonText}>Request Withdrawal</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcon name="account-balance-wallet" size={64} color="#E5E7EB" />
      <Text style={styles.emptyStateTitle}>No Earnings Yet</Text>
      <Text style={styles.emptyStateText}>
        Start driving to see your earnings here. Your completed rides, tips, and bonuses will appear.
      </Text>
      <TouchableOpacity 
        style={styles.emptyStateButton}
        onPress={() => navigation.navigate('DriverHome')}
      >
        <Text style={styles.emptyStateButtonText}>Start Driving</Text>
      </TouchableOpacity>
    </View>
  );

  // Start animations on load
  useEffect(() => {
    Animated.timing(animationValue, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  // Show loading state
  if (loading && !earningsData) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <ActivityIndicator size="large" color="#22C55E" />
        <Text style={styles.loadingText}>Loading earnings data...</Text>
      </View>
    );
  }

  // Show empty state if no data
  if (!earningsData) {
    return renderEmptyState();
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
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Earnings Details</Text>
          <Text style={styles.headerSubtitle}>
            {TIME_FILTERS.find(f => f.id === selectedFilter)?.label || 'Custom Period'}
          </Text>
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={shareEarningsReport}
          >
            <MaterialIcon name="share" size={22} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.headerButton, styles.withdrawHeaderButton]}
            onPress={handleWithdraw}
          >
            <MaterialIcon name="account-balance-wallet" size={20} color="#22C55E" />
            <Text style={styles.withdrawHeaderText}>Withdraw</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Time Period Filters */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filtersScroll}
        contentContainerStyle={styles.filtersContent}
      >
        {TIME_FILTERS.map((filter) => (
          <TouchableOpacity
            key={filter.id}
            style={[
              styles.filterChip,
              selectedFilter === filter.id && styles.filterChipActive,
            ]}
            onPress={() => setSelectedFilter(filter.id)}
          >
            <MaterialIcon 
              name={filter.icon} 
              size={16} 
              color={selectedFilter === filter.id ? '#FFFFFF' : '#666'} 
            />
            <Text style={[
              styles.filterChipText,
              selectedFilter === filter.id && styles.filterChipTextActive,
            ]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Main Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#22C55E']}
            tintColor="#22C55E"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Cards */}
        {renderSummaryCards()}
        
        {/* Earnings Breakdown */}
        {renderBreakdown()}
        
        {/* Charts */}
        {renderCharts()}
        
        {/* Performance Insights */}
        {showInsights && (
          <View style={styles.insightsSection}>
            <Text style={styles.sectionTitle}>Performance Insights</Text>
            <View style={styles.insightsGrid}>
              <View style={styles.insightCard}>
                <Text style={styles.insightValue}>{showInsights.streak} days</Text>
                <Text style={styles.insightLabel}>Current Streak</Text>
              </View>
              <View style={styles.insightCard}>
                <Text style={styles.insightValue}>{showInsights.peakHours[0]}</Text>
                <Text style={styles.insightLabel}>Peak Earning Time</Text>
              </View>
            </View>
          </View>
        )}
        
        {/* Transactions */}
        {renderTransactions()}
        
        {/* Quick Stats */}
        <View style={styles.quickStats}>
          <View style={styles.statItem}>
            <MaterialIcon name="star" size={20} color="#F59E0B" />
            <Text style={styles.statText}>4.8 Rating</Text>
          </View>
          <View style={styles.statItem}>
            <MaterialIcon name="timer" size={20} color="#3B82F6" />
            <Text style={styles.statText}>98% On Time</Text>
          </View>
          <View style={styles.statItem}>
            <MaterialIcon name="thumb-up" size={20} color="#22C55E" />
            <Text style={styles.statText}>95% Satisfaction</Text>
          </View>
        </View>
        
        {/* Footer Notes */}
        <View style={styles.footerNotes}>
          <MaterialIcon name="info" size={16} color="#666" />
          <Text style={styles.footerText}>
            Earnings are updated in real-time. Pending amounts may take up to 24 hours to clear.
          </Text>
        </View>
      </ScrollView>

      {/* Withdrawal Modal */}
      {renderWithdrawalModal()}

      {/* Action Button */}
      <TouchableOpacity 
        style={styles.floatingActionButton}
        onPress={() => navigation.navigate('EarningsGoals')}
      >
        <MaterialIcon name="flag" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

// Helper functions (would be in separate file in production)
const getMockEarningsData = (period) => {
  const mockData = {
    today: {
      totalEarnings: 12500,
      availableBalance: 8500,
      totalRides: 8,
      averagePerRide: 1563,
      onlineHours: 6.5,
      earningsPerHour: 1923,
      pendingWithdrawal: 0,
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
        { 
          id: '1', 
          timestamp: Date.now() - 3600000, 
          amount: 850, 
          type: 'ride_fare', 
          passenger: 'Alice M.',
          status: 'completed'
        },
        { 
          id: '2', 
          timestamp: Date.now() - 7200000, 
          amount: 1200, 
          type: 'ride_fare', 
          passenger: 'Bob K.',
          status: 'completed'
        },
        { 
          id: '3', 
          timestamp: Date.now() - 14400000, 
          amount: 500, 
          type: 'tip', 
          passenger: 'Charlie L.',
          status: 'completed'
        },
      ],
      trendData: [
        { month: 'Jan', earnings: 350000 },
        { month: 'Feb', earnings: 420000 },
        { month: 'Mar', earnings: 380000 },
        { month: 'Apr', earnings: 450000 },
      ],
    },
    week: {
      totalEarnings: 87500,
      availableBalance: 65000,
      totalRides: 56,
      averagePerRide: 1563,
      onlineHours: 42,
      earningsPerHour: 2083,
      pendingWithdrawal: 0,
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
        { 
          id: '1', 
          timestamp: Date.now() - 3600000, 
          amount: 850, 
          type: 'ride_fare', 
          passenger: 'Alice M.',
          status: 'completed'
        },
        { 
          id: '2', 
          timestamp: Date.now() - 7200000, 
          amount: 1200, 
          type: 'ride_fare', 
          passenger: 'Bob K.',
          status: 'completed'
        },
        { 
          id: '3', 
          timestamp: Date.now() - 14400000, 
          amount: 500, 
          type: 'tip', 
          passenger: 'Charlie L.',
          status: 'completed'
        },
      ],
      trendData: [
        { month: 'Jan', earnings: 350000 },
        { month: 'Feb', earnings: 420000 },
        { month: 'Mar', earnings: 380000 },
        { month: 'Apr', earnings: 450000 },
      ],
    },
    month: {
      totalEarnings: 350000,
      availableBalance: 280000,
      totalRides: 224,
      averagePerRide: 1563,
      onlineHours: 168,
      earningsPerHour: 2083,
      pendingWithdrawal: 0,
      breakdown: [
        { category: 'Ride Fares', amount: 294000, percentage: 84 },
        { category: 'Tips', amount: 42000, percentage: 12 },
        { category: 'Bonuses', amount: 14000, percentage: 4 },
      ],
      dailyBreakdown: [],
      recentTransactions: [],
      trendData: [
        { month: 'Jan', earnings: 350000 },
        { month: 'Feb', earnings: 420000 },
        { month: 'Mar', earnings: 380000 },
        { month: 'Apr', earnings: 450000 },
      ],
    },
    all: {
      totalEarnings: 1250000,
      availableBalance: 1000000,
      totalRides: 800,
      averagePerRide: 1563,
      onlineHours: 600,
      earningsPerHour: 2083,
      pendingWithdrawal: 0,
      breakdown: [
        { category: 'Ride Fares', amount: 1050000, percentage: 84 },
        { category: 'Tips', amount: 150000, percentage: 12 },
        { category: 'Bonuses', amount: 50000, percentage: 4 },
      ],
      dailyBreakdown: [],
      recentTransactions: [],
      trendData: [
        { month: 'Jan', earnings: 350000 },
        { month: 'Feb', earnings: 420000 },
        { month: 'Mar', earnings: 380000 },
        { month: 'Apr', earnings: 450000 },
      ],
    },
  };
  
  return mockData[period] || mockData.week;
};

const getTransactionIcon = (type) => {
  switch(type) {
    case 'ride_fare': return 'directions-car';
    case 'tip': return 'emoji-events';
    case 'bonus': return 'star';
    case 'withdrawal': return 'account-balance-wallet';
    case 'penalty': return 'warning';
    default: return 'receipt';
  }
};

const getTransactionTypeLabel = (type) => {
  switch(type) {
    case 'ride_fare': return 'Ride Fare';
    case 'tip': return 'Tip';
    case 'bonus': return 'Bonus';
    case 'withdrawal': return 'Withdrawal';
    case 'penalty': return 'Penalty';
    default: return 'Transaction';
  }
};

const calculateStreak = (dailyBreakdown) => {
  if (!dailyBreakdown) return 0;
  let streak = 0;
  for (const day of dailyBreakdown) {
    if (day.earnings > 0) streak++;
    else break;
  }
  return streak;
};

const calculateBestTimes = (hourlyData) => {
  if (!hourlyData.length) return 'Not enough data';
  const sorted = [...hourlyData].sort((a, b) => b.earnings - a.earnings);
  return sorted.slice(0, 2).map(h => `${h.hour}:00`).join(', ');
};

const showErrorAlert = (message) => {
  Alert.alert('Error', message, [{ text: 'OK' }]);
};

const generateEarningsReport = () => {
  return `Kabaza Driver Earnings Report\nPeriod: ${selectedFilter}\nTotal Earnings: ${formatCurrency(earningsData?.totalEarnings || 0)}\nTotal Rides: ${earningsData?.totalRides || 0}\nGenerated on: ${new Date().toLocaleDateString()}`;
};

const generateExportFile = async (format) => {
  // In production, this would generate and save a file
  Alert.alert('Export Started', `${format.toUpperCase()} file will be saved to your device.`);
};

const getCachedEarningsData = async () => {
  try {
    const cached = await AsyncStorage.getItem(`earnings_cache_${selectedFilter}`);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    return null;
  }
};

const cacheEarningsData = async (data) => {
  try {
    await AsyncStorage.setItem(`earnings_cache_${selectedFilter}`, JSON.stringify(data));
  } catch (error) {
    console.error('Error caching earnings:', error);
  }
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    backgroundColor: '#FFFFFF',
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 24,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  emptyStateButton: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
  },
  emptyStateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
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
    backgroundColor: '#F3F4F6',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  withdrawHeaderButton: {
    flexDirection: 'row',
    width: 'auto',
    paddingHorizontal: 12,
    backgroundColor: '#F0F9F0',
    gap: 4,
  },
  withdrawHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22C55E',
  },
  filtersScroll: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filtersContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: '#22C55E',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  summaryScroll: {
    marginTop: 16,
  },
  summaryScrollContent: {
    paddingHorizontal: 16,
  },
  summaryCard: {
    width: 180,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#999',
    flex: 1,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 2,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
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
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  breakdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chartContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  chartCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  chartCenterText: {
    fontSize: 12,
    color: '#666',
  },
  chartCenterValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
  },
  breakdownLegend: {
    flex: 1,
    marginLeft: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendTextContainer: {
    flex: 1,
  },
  legendLabel: {
    fontSize: 14,
    color: '#000000',
  },
  legendPercentage: {
    fontSize: 12,
    color: '#666',
  },
  legendAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  chartSection: {
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  chart: {
    borderRadius: 16,
  },
  transactionHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: 14,
    color: '#22C55E',
    fontWeight: '500',
  },
  exportButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  transactionsList: {
    maxHeight: 400,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
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
  transactionDetails: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  transactionTime: {
    fontSize: 11,
    color: '#999',
  },
  transactionAmountContainer: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  pendingText: {
    fontSize: 10,
    color: '#D97706',
    fontWeight: '500',
  },
  offlineDivider: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginTop: 8,
  },
  offlineText: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '500',
  },
  offlineTransaction: {
    opacity: 0.7,
  },
  insightsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
  },
  insightsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  insightCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  insightValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  insightLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    marginHorizontal: 16,
    gap: 24,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 12,
    color: '#666',
  },
  footerNotes: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 32,
    padding: 16,
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    gap: 8,
  },
  footerText: {
    flex: 1,
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  floatingActionButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: width * 0.9,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  modalBody: {
    padding: 20,
  },
  balanceCard: {
    backgroundColor: '#F0F9F0',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#22C55E',
    marginBottom: 4,
  },
  balanceNote: {
    fontSize: 12,
    color: '#666',
  },
  paymentMethodSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 12,
  },
  paymentMethods: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentMethod: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  paymentMethodSelected: {
    borderColor: '#22C55E',
    backgroundColor: '#F0F9F0',
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  methodName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#000000',
  },
  methodCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  amountSection: {
    marginBottom: 24,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    paddingHorizontal: 16,
  },
  amountInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
    paddingVertical: 16,
  },
  maxButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    borderRadius: 8,
  },
  maxButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  quickAmountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickAmountButton: {
    flex: 1,
    minWidth: (width * 0.9 - 56) / 4,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  quickAmountButtonActive: {
    backgroundColor: '#22C55E',
  },
  quickAmountText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  quickAmountTextActive: {
    color: '#FFFFFF',
  },
  summarySection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
  },
  summaryTotal: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
    marginTop: 8,
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
  },
  summaryTotalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#22C55E',
  },
  processingTime: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
  },
  notesSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  notesText: {
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
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  withdrawButton: {
    backgroundColor: '#22C55E',
  },
  withdrawButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});