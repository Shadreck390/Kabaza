// screens/payments/TransactionHistory.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  FlatList,
  Dimensions,
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

export default function TransactionHistory() {
  const navigation = useNavigation();
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'credit', 'debit', 'pending'
  const [showFilterModal, setShowFilterModal] = useState(false);

  useEffect(() => {
    loadTransactions();
  }, []);

  useEffect(() => {
    filterTransactions();
  }, [transactions, filter, searchQuery]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      
      const savedTransactions = await AsyncStorage.getItem('wallet_transactions');
      if (savedTransactions) {
        const parsed = JSON.parse(savedTransactions);
        setTransactions(parsed);
      } else {
        // Load mock data
        const mockTransactions = [
          // Recent transactions
          {
            id: '1',
            type: 'credit',
            amount: 5000,
            description: 'Mobile Money Top-up',
            status: 'completed',
            timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
            icon: 'smartphone',
            color: '#22C55E',
            reference: 'TXN-001',
            category: 'topup',
          },
          {
            id: '2',
            type: 'debit',
            amount: 850,
            description: 'Ride Payment - #RIDE-001',
            status: 'completed',
            timestamp: new Date(Date.now() - 24 * 3600000).toISOString(),
            icon: 'directions-car',
            color: '#EF4444',
            reference: 'RIDE-001',
            category: 'ride',
          },
          {
            id: '3',
            type: 'credit',
            amount: 500,
            description: 'Referral Bonus - John Doe',
            status: 'completed',
            timestamp: new Date(Date.now() - 3 * 24 * 3600000).toISOString(),
            icon: 'people',
            color: '#22C55E',
            reference: 'REF-001',
            category: 'bonus',
          },
          {
            id: '4',
            type: 'debit',
            amount: 1200,
            description: 'Ride Payment - #RIDE-002',
            status: 'completed',
            timestamp: new Date(Date.now() - 5 * 24 * 3600000).toISOString(),
            icon: 'directions-car',
            color: '#EF4444',
            reference: 'RIDE-002',
            category: 'ride',
          },
          {
            id: '5',
            type: 'credit',
            amount: 2500,
            description: 'Promotional Credit',
            status: 'completed',
            timestamp: new Date(Date.now() - 7 * 24 * 3600000).toISOString(),
            icon: 'local-offer',
            color: '#22C55E',
            reference: 'PROMO-001',
            category: 'promotion',
          },
          // Older transactions
          {
            id: '6',
            type: 'debit',
            amount: 1500,
            description: 'Ride Payment - #RIDE-003',
            status: 'completed',
            timestamp: new Date(Date.now() - 10 * 24 * 3600000).toISOString(),
            icon: 'directions-car',
            color: '#EF4444',
            reference: 'RIDE-003',
            category: 'ride',
          },
          {
            id: '7',
            type: 'credit',
            amount: 10000,
            description: 'Bank Transfer',
            status: 'completed',
            timestamp: new Date(Date.now() - 15 * 24 * 3600000).toISOString(),
            icon: 'account-balance',
            color: '#22C55E',
            reference: 'BANK-001',
            category: 'transfer',
          },
          {
            id: '8',
            type: 'debit',
            amount: 750,
            description: 'Ride Payment - #RIDE-004',
            status: 'pending',
            timestamp: new Date(Date.now() - 1 * 3600000).toISOString(),
            icon: 'directions-car',
            color: '#F59E0B',
            reference: 'RIDE-004',
            category: 'ride',
          },
          {
            id: '9',
            type: 'credit',
            amount: 1500,
            description: 'Refund - #RIDE-002',
            status: 'completed',
            timestamp: new Date(Date.now() - 4 * 24 * 3600000).toISOString(),
            icon: 'refresh',
            color: '#22C55E',
            reference: 'REFUND-001',
            category: 'refund',
          },
          {
            id: '10',
            type: 'debit',
            amount: 2000,
            description: 'Airport Surcharge',
            status: 'completed',
            timestamp: new Date(Date.now() - 8 * 24 * 3600000).toISOString(),
            icon: 'airplanemode-active',
            color: '#EF4444',
            reference: 'SUR-001',
            category: 'fee',
          },
        ];
        setTransactions(mockTransactions);
        await AsyncStorage.setItem('wallet_transactions', JSON.stringify(mockTransactions));
      }
      
      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error('Error loading transactions:', error);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTransactions();
  };

  const filterTransactions = () => {
    let filtered = [...transactions];

    // Apply type filter
    if (filter !== 'all') {
      if (filter === 'pending') {
        filtered = filtered.filter(t => t.status === 'pending');
      } else {
        filtered = filtered.filter(t => t.type === filter);
      }
    }

    // Apply search filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        t =>
          t.description.toLowerCase().includes(query) ||
          t.reference.toLowerCase().includes(query) ||
          t.amount.toString().includes(query)
      );
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    setFilteredTransactions(filtered);
  };

  const formatCurrency = (amount) => {
    return `MK ${amount.toLocaleString()}`;
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffDays === 0) {
      return `Today, ${date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    } else if (diffDays === 1) {
      return `Yesterday, ${date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    } else if (diffDays < 7) {
      return `${date.toLocaleDateString('en-US', {
        weekday: 'short',
      })}, ${date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return '#10B981';
      case 'pending':
        return '#F59E0B';
      case 'failed':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusBgColor = (status) => {
    switch (status) {
      case 'completed':
        return '#D1FAE5';
      case 'pending':
        return '#FEF3C7';
      case 'failed':
        return '#FEE2E2';
      default:
        return '#F3F4F6';
    }
  };

  const groupTransactionsByDate = () => {
    const groups = {};
    
    filteredTransactions.forEach(transaction => {
      const date = new Date(transaction.timestamp);
      const dateKey = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      
      groups[dateKey].push(transaction);
    });
    
    return groups;
  };

  const renderTransaction = ({ item }) => (
    <TouchableOpacity
      style={styles.transactionCard}
      onPress={() => navigation.navigate('TransactionDetails', { transaction: item })}
    >
      <View style={styles.transactionIconContainer}>
        <MaterialIcon 
          name={item.icon} 
          size={24} 
          color={item.color} 
        />
      </View>
      
      <View style={styles.transactionDetails}>
        <Text style={styles.transactionDescription} numberOfLines={1}>
          {item.description}
        </Text>
        <View style={styles.transactionMeta}>
          <Text style={styles.transactionReference}>{item.reference}</Text>
          <Text style={styles.transactionDate}>
            {formatDate(item.timestamp)}
          </Text>
        </View>
      </View>
      
      <View style={styles.transactionAmountContainer}>
        <Text style={[
          styles.transactionAmount,
          { color: item.type === 'credit' ? '#10B981' : '#EF4444' }
        ]}>
          {item.type === 'credit' ? '+' : '-'}{formatCurrency(item.amount)}
        </Text>
        <View style={[
          styles.statusBadge,
          { backgroundColor: getStatusBgColor(item.status) }
        ]}>
          <Text style={[
            styles.statusText,
            { color: getStatusColor(item.status) }
          ]}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderDateGroup = (date, transactions) => (
    <View key={date} style={styles.dateGroup}>
      <Text style={styles.dateHeader}>{date}</Text>
      <View style={styles.transactionsList}>
        {transactions.map(transaction => (
          <View key={transaction.id}>
            {renderTransaction({ item: transaction })}
          </View>
        ))}
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcon name="receipt-long" size={80} color="#E5E7EB" />
      <Text style={styles.emptyStateTitle}>No transactions found</Text>
      <Text style={styles.emptyStateSubtitle}>
        {searchQuery || filter !== 'all'
          ? 'Try changing your search or filter'
          : 'Your transaction history will appear here'}
      </Text>
      {(searchQuery || filter !== 'all') && (
        <TouchableOpacity
          style={styles.resetButton}
          onPress={() => {
            setSearchQuery('');
            setFilter('all');
          }}
        >
          <Text style={styles.resetButtonText}>Clear filters</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const filterOptions = [
    { key: 'all', label: 'All', icon: 'list' },
    { key: 'credit', label: 'Credits', icon: 'arrow-downward' },
    { key: 'debit', label: 'Debits', icon: 'arrow-upward' },
    { key: 'pending', label: 'Pending', icon: 'schedule' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcon name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transaction History</Text>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setShowFilterModal(!showFilterModal)}
        >
          <MaterialIcon name="filter-list" size={24} color={filter !== 'all' ? '#4F46E5' : '#6B7280'} />
        </TouchableOpacity>
      </View>
      
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <MaterialIcon name="search" size={20} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search transactions..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcon name="close" size={20} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {/* Filter Options */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContainer}
      >
        {filterOptions.map(option => (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.filterPill,
              filter === option.key && styles.filterPillActive,
            ]}
            onPress={() => setFilter(option.key)}
          >
            <MaterialIcon
              name={option.icon}
              size={16}
              color={filter === option.key ? '#4F46E5' : '#6B7280'}
            />
            <Text style={[
              styles.filterText,
              filter === option.key && styles.filterTextActive,
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      {/* Stats Summary */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Total Credit</Text>
          <Text style={[styles.statValue, { color: '#10B981' }]}>
            {formatCurrency(
              filteredTransactions
                .filter(t => t.type === 'credit')
                .reduce((sum, t) => sum + t.amount, 0)
            )}
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Total Debit</Text>
          <Text style={[styles.statValue, { color: '#EF4444' }]}>
            {formatCurrency(
              filteredTransactions
                .filter(t => t.type === 'debit')
                .reduce((sum, t) => sum + t.amount, 0)
            )}
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Count</Text>
          <Text style={styles.statValue}>{filteredTransactions.length}</Text>
        </View>
      </View>
      
      {/* Transactions List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      ) : (
        <FlatList
          data={Object.entries(groupTransactionsByDate())}
          keyExtractor={([date]) => date}
          renderItem={({ item: [date, transactions] }) => renderDateGroup(date, transactions)}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#4F46E5']}
              tintColor="#4F46E5"
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: StatusBar.currentHeight + 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  filterButton: {
    padding: 8,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#111827',
  },
  filterScroll: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 16,
  },
  filterContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    gap: 6,
  },
  filterPillActive: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#4F46E5',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterTextActive: {
    color: '#4F46E5',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  dateGroup: {
    marginBottom: 24,
  },
  dateHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    paddingLeft: 8,
  },
  transactionsList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  transactionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  transactionReference: {
    fontSize: 12,
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  transactionAmountContainer: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 24,
  },
  resetButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});