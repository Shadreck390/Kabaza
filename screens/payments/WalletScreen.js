// screens/payments/WalletScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

export default function WalletScreen() {
  const navigation = useNavigation();
  const [walletData, setWalletData] = useState({
    balance: 12500,
    pending: 2500,
    totalEarned: 50000,
    currency: 'MWK',
    isDriver: false,
  });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddMoneyModal, setShowAddMoneyModal] = useState(false);
  const [addAmount, setAddAmount] = useState('');
  const [quickAmounts] = useState([500, 1000, 2500, 5000, 10000]);

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      setLoading(true);
      
      // Load wallet data from AsyncStorage
      const savedWallet = await AsyncStorage.getItem('wallet_data');
      if (savedWallet) {
        setWalletData(JSON.parse(savedWallet));
      }
      
      // Load transactions
      const savedTransactions = await AsyncStorage.getItem('wallet_transactions');
      if (savedTransactions) {
        setTransactions(JSON.parse(savedTransactions));
      } else {
        // Mock transactions
        const mockTransactions = [
          {
            id: '1',
            type: 'credit',
            amount: 5000,
            description: 'Mobile Money Top-up',
            status: 'completed',
            timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
            icon: 'smartphone',
            color: '#22C55E',
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
          },
          {
            id: '3',
            type: 'credit',
            amount: 500,
            description: 'Referral Bonus',
            status: 'completed',
            timestamp: new Date(Date.now() - 3 * 24 * 3600000).toISOString(),
            icon: 'people',
            color: '#22C55E',
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
          },
        ];
        setTransactions(mockTransactions);
      }
      
      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error('Error loading wallet data:', error);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadWalletData();
  };

  const handleAddMoney = () => {
    setShowAddMoneyModal(true);
  };

  const handleWithdraw = () => {
    if (walletData.isDriver) {
      navigation.navigate('PayoutScreen');
    } else {
      Alert.alert(
        'Withdrawal',
        'Withdrawals are only available for driver accounts. Switch to driver account to withdraw earnings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Switch to Driver', onPress: () => navigation.navigate('DriverRegistration') },
        ]
      );
    }
  };

  const handleQuickAmountSelect = (amount) => {
    setAddAmount(amount.toString());
  };

  const handleAddMoneySubmit = async () => {
    if (!addAmount || parseFloat(addAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    const amount = parseFloat(addAmount);
    
    try {
      // Simulate API call
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Update wallet balance
      const updatedWallet = {
        ...walletData,
        balance: walletData.balance + amount,
      };
      
      // Add transaction
      const newTransaction = {
        id: Date.now().toString(),
        type: 'credit',
        amount: amount,
        description: 'Wallet Top-up',
        status: 'completed',
        timestamp: new Date().toISOString(),
        icon: 'account-balance-wallet',
        color: '#22C55E',
      };
      
      const updatedTransactions = [newTransaction, ...transactions];
      
      // Save to AsyncStorage
      await AsyncStorage.setItem('wallet_data', JSON.stringify(updatedWallet));
      await AsyncStorage.setItem('wallet_transactions', JSON.stringify(updatedTransactions));
      
      // Update state
      setWalletData(updatedWallet);
      setTransactions(updatedTransactions);
      setShowAddMoneyModal(false);
      setAddAmount('');
      
      Alert.alert(
        'Success',
        `MK ${amount.toLocaleString()} added to your wallet`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error adding money:', error);
      Alert.alert('Error', 'Failed to add money. Please try again.');
    } finally {
      setLoading(false);
    }
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
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const renderBalanceCards = () => (
    <View style={styles.balanceSection}>
      <View style={styles.balanceCard}>
        <View style={styles.balanceHeader}>
          <MaterialIcon name="account-balance-wallet" size={24} color="#FFFFFF" />
          <Text style={styles.balanceTitle}>Available Balance</Text>
        </View>
        <Text style={styles.balanceAmount}>
          {formatCurrency(walletData.balance)}
        </Text>
        <Text style={styles.balanceSubtitle}>Ready to use</Text>
      </View>
      
      {walletData.isDriver && (
        <View style={[styles.balanceCard, styles.pendingCard]}>
          <View style={styles.balanceHeader}>
            <MaterialIcon name="schedule" size={24} color="#FFFFFF" />
            <Text style={styles.balanceTitle}>Pending</Text>
          </View>
          <Text style={styles.balanceAmount}>
            {formatCurrency(walletData.pending)}
          </Text>
          <Text style={styles.balanceSubtitle}>Processing</Text>
        </View>
      )}
    </View>
  );

  const renderQuickActions = () => (
    <View style={styles.actionsSection}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={handleAddMoney}
        >
          <View style={[styles.actionIconContainer, { backgroundColor: '#ECFDF5' }]}>
            <MaterialCommunityIcon name="plus-circle" size={28} color="#10B981" />
          </View>
          <Text style={styles.actionText}>Add Money</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={handleWithdraw}
        >
          <View style={[styles.actionIconContainer, { backgroundColor: '#FEF3F2' }]}>
            <MaterialCommunityIcon name="bank-transfer" size={28} color="#EF4444" />
          </View>
          <Text style={styles.actionText}>Withdraw</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('TransactionHistory')}
        >
          <View style={[styles.actionIconContainer, { backgroundColor: '#EFF6FF' }]}>
            <MaterialIcon name="history" size={28} color="#3B82F6" />
          </View>
          <Text style={styles.actionText}>History</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('PayoutMethods')}
        >
          <View style={[styles.actionIconContainer, { backgroundColor: '#F5F3FF' }]}>
            <MaterialIcon name="payments" size={28} color="#8B5CF6" />
          </View>
          <Text style={styles.actionText}>Payout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStats = () => (
    <View style={styles.statsSection}>
      <Text style={styles.sectionTitle}>Stats</Text>
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <MaterialIcon name="trending-up" size={20} color="#10B981" />
          <Text style={styles.statValue}>{formatCurrency(walletData.totalEarned)}</Text>
          <Text style={styles.statLabel}>Total Earned</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <MaterialIcon name="swap-horiz" size={20} color="#3B82F6" />
          <Text style={styles.statValue}>{transactions.length}</Text>
          <Text style={styles.statLabel}>Transactions</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <MaterialIcon name="account-balance-wallet" size={20} color="#8B5CF6" />
          <Text style={styles.statValue}>
            {walletData.isDriver ? 'Driver' : 'Rider'}
          </Text>
          <Text style={styles.statLabel}>Account Type</Text>
        </View>
      </View>
    </View>
  );

  const renderTransactions = () => (
    <View style={styles.transactionsSection}>
      <View style={styles.transactionsHeader}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        {transactions.length > 0 && (
          <TouchableOpacity onPress={() => navigation.navigate('TransactionHistory')}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {loading && transactions.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcon name="account-balance-wallet" size={60} color="#E5E7EB" />
          <Text style={styles.emptyStateText}>Loading transactions...</Text>
        </View>
      ) : transactions.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcon name="receipt-long" size={60} color="#E5E7EB" />
          <Text style={styles.emptyStateText}>No transactions yet</Text>
          <Text style={styles.emptyStateSubtext}>Your transaction history will appear here</Text>
        </View>
      ) : (
        <View style={styles.transactionsList}>
          {transactions.slice(0, 5).map((transaction) => (
            <TouchableOpacity 
              key={transaction.id} 
              style={styles.transactionItem}
              onPress={() => navigation.navigate('TransactionDetails', { transaction })}
            >
              <View style={styles.transactionIconContainer}>
                <MaterialIcon 
                  name={transaction.icon} 
                  size={24} 
                  color={transaction.color} 
                />
              </View>
              <View style={styles.transactionDetails}>
                <Text style={styles.transactionDescription} numberOfLines={1}>
                  {transaction.description}
                </Text>
                <Text style={styles.transactionDate}>
                  {formatDate(transaction.timestamp)}
                </Text>
              </View>
              <View style={styles.transactionAmountContainer}>
                <Text style={[
                  styles.transactionAmount,
                  { color: transaction.type === 'credit' ? '#10B981' : '#EF4444' }
                ]}>
                  {transaction.type === 'credit' ? '+' : '-'}{formatCurrency(transaction.amount)}
                </Text>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: transaction.status === 'completed' ? '#D1FAE5' : '#FEF3C7' }
                ]}>
                  <Text style={[
                    styles.statusText,
                    { color: transaction.status === 'completed' ? '#065F46' : '#92400E' }
                  ]}>
                    {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  const renderAddMoneyModal = () => (
    <Modal
      visible={showAddMoneyModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowAddMoneyModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Money to Wallet</Text>
            <TouchableOpacity onPress={() => setShowAddMoneyModal(false)}>
              <MaterialIcon name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.quickAmountsContainer}>
            <Text style={styles.modalLabel}>Quick Select</Text>
            <View style={styles.quickAmountsGrid}>
              {quickAmounts.map((amount) => (
                <TouchableOpacity
                  key={amount}
                  style={[
                    styles.quickAmountButton,
                    addAmount === amount.toString() && styles.quickAmountButtonSelected
                  ]}
                  onPress={() => handleQuickAmountSelect(amount)}
                >
                  <Text style={[
                    styles.quickAmountText,
                    addAmount === amount.toString() && styles.quickAmountTextSelected
                  ]}>
                    MK {amount.toLocaleString()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <View style={styles.amountInputContainer}>
            <Text style={styles.modalLabel}>Or Enter Custom Amount</Text>
            <View style={styles.amountInputWrapper}>
              <Text style={styles.currencySymbol}>MK</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                keyboardType="numeric"
                value={addAmount}
                onChangeText={setAddAmount}
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>
          
          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowAddMoneyModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modalButton, styles.confirmButton]}
              onPress={handleAddMoneySubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmButtonText}>
                  Add {addAmount ? `MK ${parseFloat(addAmount).toLocaleString()}` : 'Money'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcon name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Wallet</Text>
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={() => navigation.navigate('WalletSettings')}
        >
          <MaterialIcon name="settings" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4F46E5']}
            tintColor="#4F46E5"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderBalanceCards()}
        {renderQuickActions()}
        {renderStats()}
        {renderTransactions()}
        
        {/* Safety & Security Note */}
        <View style={styles.securityNote}>
          <MaterialIcon name="security" size={20} color="#6B7280" />
          <Text style={styles.securityText}>
            Your funds are securely held in an escrow account. All transactions are encrypted.
          </Text>
        </View>
      </ScrollView>
      
      {renderAddMoneyModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#4F46E5',
    paddingTop: StatusBar.currentHeight + 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  settingsButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  balanceSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    flexDirection: 'row',
    gap: 12,
  },
  balanceCard: {
    flex: 1,
    backgroundColor: '#4F46E5',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  pendingCard: {
    backgroundColor: '#F59E0B',
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  balanceTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    opacity: 0.9,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  balanceSubtitle: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  actionsSection: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    alignItems: 'center',
    flex: 1,
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
  },
  statsSection: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  statsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
  },
  transactionsSection: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4F46E5',
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
  transactionsList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  transactionItem: {
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
  transactionDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  transactionAmountContainer: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
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
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    marginHorizontal: 16,
    marginTop: 24,
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  securityText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 12,
  },
  quickAmountsContainer: {
    marginBottom: 24,
  },
  quickAmountsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickAmountButton: {
    flex: 1,
    minWidth: (width - 64) / 3 - 8,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quickAmountButtonSelected: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  quickAmountText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  quickAmountTextSelected: {
    color: '#FFFFFF',
  },
  amountInputContainer: {
    marginBottom: 32,
  },
  amountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: '600',
    color: '#111827',
    paddingVertical: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  confirmButton: {
    backgroundColor: '#4F46E5',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});