// screens/payments/PayoutScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
  Dimensions,
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

export default function PayoutScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [walletData, setWalletData] = useState(null);
  const [payoutMethods, setPayoutMethods] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [quickAmounts] = useState([5000, 10000, 25000, 50000, 100000]);
  const [isInstant, setIsInstant] = useState(false);
  const [transactionHistory, setTransactionHistory] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load wallet data
      const savedWallet = await AsyncStorage.getItem('wallet_data');
      if (savedWallet) {
        const wallet = JSON.parse(savedWallet);
        setWalletData(wallet);
        
        // Only show for drivers
        if (!wallet.isDriver) {
          Alert.alert(
            'Access Restricted',
            'Payouts are only available for driver accounts.',
            [
              { text: 'OK', onPress: () => navigation.goBack() }
            ]
          );
        }
      }
      
      // Load payout methods
      const savedMethods = await AsyncStorage.getItem('payout_methods');
      if (savedMethods) {
        const methods = JSON.parse(savedMethods);
        setPayoutMethods(methods);
        if (methods.length > 0) {
          const defaultMethod = methods.find(m => m.isDefault) || methods[0];
          setSelectedMethod(defaultMethod);
        }
      }
      
      // Load payout history
      const savedHistory = await AsyncStorage.getItem('payout_history');
      if (savedHistory) {
        setTransactionHistory(JSON.parse(savedHistory));
      } else {
        // Mock payout history
        const mockHistory = [
          {
            id: '1',
            amount: 25000,
            fee: 250,
            netAmount: 24750,
            method: 'Mobile Money',
            status: 'completed',
            timestamp: new Date(Date.now() - 2 * 24 * 3600000).toISOString(),
            reference: 'PAYOUT-001',
          },
          {
            id: '2',
            amount: 15000,
            fee: 150,
            netAmount: 14850,
            method: 'Bank Transfer',
            status: 'pending',
            timestamp: new Date(Date.now() - 1 * 3600000).toISOString(),
            reference: 'PAYOUT-002',
          },
          {
            id: '3',
            amount: 30000,
            fee: 300,
            netAmount: 29700,
            method: 'Mobile Money',
            status: 'failed',
            timestamp: new Date(Date.now() - 5 * 24 * 3600000).toISOString(),
            reference: 'PAYOUT-003',
            failureReason: 'Insufficient funds',
          },
        ];
        setTransactionHistory(mockHistory);
        await AsyncStorage.setItem('payout_history', JSON.stringify(mockHistory));
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading payout data:', error);
      setLoading(false);
    }
  };

  const calculateFee = (amount) => {
    // 1% fee with minimum of 100 MWK
    const fee = Math.max(amount * 0.01, 100);
    return Math.round(fee);
  };

  const handleQuickAmountSelect = (amount) => {
    setWithdrawAmount(amount.toString());
  };

  const validateWithdrawal = () => {
    if (!selectedMethod) {
      Alert.alert('Error', 'Please select a payout method');
      return false;
    }

    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return false;
    }

    const amount = parseFloat(withdrawAmount);
    const minWithdrawal = 5000;
    const availableBalance = walletData?.balance || 0;

    if (amount < minWithdrawal) {
      Alert.alert('Error', `Minimum withdrawal amount is MK ${minWithdrawal.toLocaleString()}`);
      return false;
    }

    if (amount > availableBalance) {
      Alert.alert('Error', 'Insufficient balance for this withdrawal');
      return false;
    }

    return true;
  };

  const handleWithdraw = async () => {
    if (!validateWithdrawal()) return;

    setWithdrawLoading(true);

    try {
      const amount = parseFloat(withdrawAmount);
      const fee = calculateFee(amount);
      const netAmount = amount - fee;

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update wallet balance
      const updatedWallet = {
        ...walletData,
        balance: walletData.balance - amount,
      };
      await AsyncStorage.setItem('wallet_data', JSON.stringify(updatedWallet));
      setWalletData(updatedWallet);

      // Add to payout history
      const newPayout = {
        id: Date.now().toString(),
        amount: amount,
        fee: fee,
        netAmount: netAmount,
        method: selectedMethod.name,
        status: isInstant ? 'processing' : 'pending',
        timestamp: new Date().toISOString(),
        reference: `PAYOUT-${Date.now().toString().slice(-6)}`,
        isInstant: isInstant,
      };

      const updatedHistory = [newPayout, ...transactionHistory];
      await AsyncStorage.setItem('payout_history', JSON.stringify(updatedHistory));
      setTransactionHistory(updatedHistory);

      // Clear form
      setWithdrawAmount('');
      setIsInstant(false);

      Alert.alert(
        'Withdrawal Request Submitted',
        `Your withdrawal of MK ${amount.toLocaleString()} has been submitted successfully. ${
          isInstant ? 'Funds will be available within 2 hours.' : 'Funds will be processed within 24-48 hours.'
        }`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      Alert.alert('Error', 'Failed to process withdrawal. Please try again.');
    } finally {
      setWithdrawLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return `MK ${amount.toLocaleString()}`;
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return '#10B981';
      case 'processing':
        return '#3B82F6';
      case 'pending':
        return '#F59E0B';
      case 'failed':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return 'check-circle';
      case 'processing':
        return 'autorenew';
      case 'pending':
        return 'schedule';
      case 'failed':
        return 'error';
      default:
        return 'help';
    }
  };

  const renderBalanceSection = () => (
    <View style={styles.balanceSection}>
      <View style={styles.balanceCard}>
        <View style={styles.balanceHeader}>
          <MaterialIcon name="account-balance-wallet" size={24} color="#FFFFFF" />
          <Text style={styles.balanceTitle}>Available Balance</Text>
        </View>
        <Text style={styles.balanceAmount}>
          {formatCurrency(walletData?.balance || 0)}
        </Text>
        <View style={styles.balanceDetails}>
          <Text style={styles.balanceDetailText}>
            Pending: {formatCurrency(walletData?.pending || 0)}
          </Text>
          <Text style={styles.balanceDetailText}>
            Total Earned: {formatCurrency(walletData?.totalEarned || 0)}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderPayoutMethods = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Payout Method</Text>
        <TouchableOpacity
          style={styles.addMethodButton}
          onPress={() => navigation.navigate('AddPayoutMethod')}
        >
          <MaterialIcon name="add" size={20} color="#4F46E5" />
          <Text style={styles.addMethodText}>Add Method</Text>
        </TouchableOpacity>
      </View>
      
      {payoutMethods.length === 0 ? (
        <TouchableOpacity
          style={styles.emptyMethods}
          onPress={() => navigation.navigate('AddPayoutMethod')}
        >
          <MaterialIcon name="add-circle" size={40} color="#E5E7EB" />
          <Text style={styles.emptyMethodsText}>Add a payout method</Text>
          <Text style={styles.emptyMethodsSubtext}>
            You need to add a payout method to withdraw your earnings
          </Text>
        </TouchableOpacity>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.methodsScroll}
          contentContainerStyle={styles.methodsContainer}
        >
          {payoutMethods.map(method => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.methodCard,
                selectedMethod?.id === method.id && styles.methodCardSelected,
              ]}
              onPress={() => setSelectedMethod(method)}
            >
              <View style={[
                styles.methodIcon,
                { backgroundColor: method.color + '20' }
              ]}>
                <MaterialCommunityIcon
                  name={method.icon}
                  size={24}
                  color={method.color}
                />
              </View>
              <Text style={styles.methodName}>{method.name}</Text>
              <Text style={styles.methodDetails}>
                {method.details?.lastFour ? `••••${method.details.lastFour}` : method.type}
              </Text>
              {method.isDefault && (
                <View style={styles.defaultBadge}>
                  <MaterialIcon name="star" size={12} color="#FFFFFF" />
                  <Text style={styles.defaultBadgeText}>Default</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );

  const renderWithdrawalForm = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Withdrawal Amount</Text>
      
      <View style={styles.quickAmountsContainer}>
        <Text style={styles.formLabel}>Quick Select</Text>
        <View style={styles.quickAmountsGrid}>
          {quickAmounts.map((amount) => (
            <TouchableOpacity
              key={amount}
              style={[
                styles.quickAmountButton,
                withdrawAmount === amount.toString() && styles.quickAmountButtonSelected,
              ]}
              onPress={() => handleQuickAmountSelect(amount)}
            >
              <Text style={[
                styles.quickAmountText,
                withdrawAmount === amount.toString() && styles.quickAmountTextSelected,
              ]}>
                {formatCurrency(amount)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      <View style={styles.amountInputContainer}>
        <Text style={styles.formLabel}>Or Enter Custom Amount</Text>
        <View style={styles.amountInputWrapper}>
          <Text style={styles.currencySymbol}>MK</Text>
          <TextInput
            style={styles.amountInput}
            placeholder="0.00"
            keyboardType="numeric"
            value={withdrawAmount}
            onChangeText={setWithdrawAmount}
            placeholderTextColor="#9CA3AF"
          />
        </View>
      </View>
      
      <View style={styles.feeCalculator}>
        <View style={styles.feeRow}>
          <Text style={styles.feeLabel}>Withdrawal Amount</Text>
          <Text style={styles.feeValue}>
            {withdrawAmount ? formatCurrency(parseFloat(withdrawAmount)) : 'MK 0'}
          </Text>
        </View>
        <View style={styles.feeRow}>
          <Text style={styles.feeLabel}>Processing Fee (1%)</Text>
          <Text style={styles.feeValue}>
            {withdrawAmount ? formatCurrency(calculateFee(parseFloat(withdrawAmount))) : 'MK 0'}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.feeRow}>
          <Text style={[styles.feeLabel, styles.totalLabel]}>You Will Receive</Text>
          <Text style={[styles.feeValue, styles.totalValue]}>
            {withdrawAmount 
              ? formatCurrency(parseFloat(withdrawAmount) - calculateFee(parseFloat(withdrawAmount)))
              : 'MK 0'
            }
          </Text>
        </View>
      </View>
      
      <View style={styles.instantOption}>
        <View style={styles.instantInfo}>
          <MaterialIcon name="flash-on" size={20} color="#F59E0B" />
          <View>
            <Text style={styles.instantTitle}>Instant Payout</Text>
            <Text style={styles.instantSubtitle}>
              Get your money within 2 hours (Additional 1% fee)
            </Text>
          </View>
        </View>
        <Switch
          value={isInstant}
          onValueChange={setIsInstant}
          trackColor={{ false: '#D1D5DB', true: '#FDE68A' }}
          thumbColor={isInstant ? '#F59E0B' : '#FFFFFF'}
        />
      </View>
    </View>
  );

  const renderPayoutHistory = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Payouts</Text>
        {transactionHistory.length > 0 && (
          <TouchableOpacity onPress={() => navigation.navigate('PayoutHistory')}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {transactionHistory.length === 0 ? (
        <View style={styles.emptyHistory}>
          <MaterialIcon name="account-balance-wallet" size={60} color="#E5E7EB" />
          <Text style={styles.emptyHistoryText}>No payout history</Text>
          <Text style={styles.emptyHistorySubtext}>
            Your payout history will appear here
          </Text>
        </View>
      ) : (
        <View style={styles.historyList}>
          {transactionHistory.slice(0, 3).map((payout) => (
            <View key={payout.id} style={styles.historyItem}>
              <View style={styles.historyIcon}>
                <MaterialIcon
                  name={getStatusIcon(payout.status)}
                  size={24}
                  color={getStatusColor(payout.status)}
                />
              </View>
              <View style={styles.historyDetails}>
                <Text style={styles.historyAmount}>
                  {formatCurrency(payout.amount)}
                </Text>
                <Text style={styles.historyInfo}>
                  {payout.method} • {formatDate(payout.timestamp)}
                </Text>
              </View>
              <View style={styles.historyStatus}>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(payout.status) + '20' }
                ]}>
                  <Text style={[
                    styles.statusText,
                    { color: getStatusColor(payout.status) }
                  ]}>
                    {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
                  </Text>
                </View>
                <Text style={styles.historyNetAmount}>
                  Net: {formatCurrency(payout.netAmount)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (!walletData?.isDriver) {
    return null;
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
          <MaterialIcon name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payout</Text>
        <TouchableOpacity 
          style={styles.helpButton}
          onPress={() => navigation.navigate('PayoutHelp')}
        >
          <MaterialIcon name="help-outline" size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderBalanceSection()}
        {renderPayoutMethods()}
        {renderWithdrawalForm()}
        {renderPayoutHistory()}
        
        {/* Important Information */}
        <View style={styles.infoSection}>
          <MaterialIcon name="info" size={20} color="#3B82F6" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Important Information</Text>
            <Text style={styles.infoText}>
              • Minimum withdrawal: MK 5,000{'\n'}
              • Processing time: 24-48 hours (Standard), 2 hours (Instant){'\n'}
              • Processing fee: 1% (Standard), 2% (Instant){'\n'}
              • Withdrawals are processed on business days only
            </Text>
          </View>
        </View>
      </ScrollView>
      
      {/* Withdraw Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.withdrawButton,
            (!selectedMethod || !withdrawAmount || withdrawLoading) && styles.withdrawButtonDisabled,
          ]}
          onPress={handleWithdraw}
          disabled={!selectedMethod || !withdrawAmount || withdrawLoading}
        >
          {withdrawLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <MaterialIcon name="account-balance-wallet" size={20} color="#FFFFFF" />
              <Text style={styles.withdrawButtonText}>
                Withdraw {withdrawAmount ? formatCurrency(parseFloat(withdrawAmount)) : ''}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  helpButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  balanceSection: {
    padding: 16,
  },
  balanceCard: {
    backgroundColor: '#4F46E5',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
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
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  balanceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  balanceDetailText: {
    fontSize: 13,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  section: {
    paddingHorizontal: 16,
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
    color: '#111827',
  },
  addMethodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
  },
  addMethodText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4F46E5',
  },
  emptyMethods: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  emptyMethodsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMethodsSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  methodsScroll: {
    marginHorizontal: -16,
  },
  methodsContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  methodCard: {
    width: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  methodCardSelected: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  methodName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
    textAlign: 'center',
  },
  methodDetails: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 12,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  formLabel: {
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
    marginBottom: 24,
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
  feeCalculator: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  feeLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  feeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  instantOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  instantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  instantTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  instantSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  historyList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyDetails: {
    flex: 1,
  },
  historyAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  historyInfo: {
    fontSize: 12,
    color: '#6B7280',
  },
  historyStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  historyNetAmount: {
    fontSize: 12,
    color: '#6B7280',
  },
  emptyHistory: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
  },
  emptyHistoryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptyHistorySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4F46E5',
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#EFF6FF',
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 5,
  },
  withdrawButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  withdrawButtonDisabled: {
    opacity: 0.5,
  },
  withdrawButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});