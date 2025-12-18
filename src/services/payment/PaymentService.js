// Kabaza/services/payment/PaymentService.js
import socketService from '@services/socket/socketService';
import { SocketEvents } from '@services/socket/EventTypes';
import AsyncStorage from '@react-native-async-storage/async-storage';

class PaymentService {
  constructor() {
    this.paymentMethods = [];
    this.transactions = [];
    this.walletBalance = 0;
    this.pendingTransactions = [];
    this.paymentListeners = new Map();
    this.offlineTransactions = [];
  }

  // ====================
  // INITIALIZATION
  // ====================

  async initialize(userId) {
    try {
      console.log('💰 Initializing PaymentService for user:', userId);
      
      // Load cached data
      await this.loadCachedData();
      
      // Setup socket listeners
      this.setupPaymentListeners();
      
      // Sync with server
      await this.syncWithServer();
      
      console.log('✅ PaymentService initialized');
      return true;
      
    } catch (error) {
      console.error('❌ PaymentService initialization failed:', error);
      return false;
    }
  }

  async loadCachedData() {
    try {
      const cachedBalance = await AsyncStorage.getItem('wallet_balance');
      const cachedMethods = await AsyncStorage.getItem('payment_methods');
      const cachedTransactions = await AsyncStorage.getItem('payment_transactions');
      const cachedOffline = await AsyncStorage.getItem('offline_transactions');
      
      if (cachedBalance) {
        this.walletBalance = parseFloat(cachedBalance);
      }
      
      if (cachedMethods) {
        this.paymentMethods = JSON.parse(cachedMethods);
      }
      
      if (cachedTransactions) {
        this.transactions = JSON.parse(cachedTransactions);
      }
      
      if (cachedOffline) {
        this.offlineTransactions = JSON.parse(cachedOffline);
      }
      
    } catch (error) {
      console.error('❌ Failed to load cached payment data:', error);
    }
  }

  async cacheData() {
    try {
      await AsyncStorage.setItem('wallet_balance', this.walletBalance.toString());
      await AsyncStorage.setItem('payment_methods', JSON.stringify(this.paymentMethods));
      await AsyncStorage.setItem('payment_transactions', JSON.stringify(this.transactions));
      await AsyncStorage.setItem('offline_transactions', JSON.stringify(this.offlineTransactions));
    } catch (error) {
      console.error('❌ Failed to cache payment data:', error);
    }
  }

  // ====================
  // SOCKET LISTENERS
  // ====================

  setupPaymentListeners() {
    // Payment status updates
    socketService.on(SocketEvents.PAYMENT_CONFIRMED, (data) => {
      console.log('✅ Payment confirmed:', data.transactionId);
      this.handlePaymentConfirmed(data);
    });

    socketService.on(SocketEvents.PAYMENT_FAILED, (data) => {
      console.error('❌ Payment failed:', data.transactionId);
      this.handlePaymentFailed(data);
    });

    socketService.on('payment:wallet:update', (data) => {
      console.log('💰 Wallet updated:', data.balance);
      this.handleWalletUpdate(data);
    });

    socketService.on('payment:transaction:new', (data) => {
      console.log('📄 New transaction:', data.transactionId);
      this.handleNewTransaction(data);
    });

    socketService.on('payment:payout:status', (data) => {
      console.log('💸 Payout status:', data.status);
      this.handlePayoutStatus(data);
    });
  }

  // ====================
  // WALLET MANAGEMENT
  // ====================

  async getWalletBalance() {
    try {
      // Try to get fresh balance from server if connected
      if (socketService.isConnected()) {
        socketService.emit('payment:wallet:request', {
          timestamp: Date.now()
        });
      }
      
      return {
        balance: this.walletBalance,
        currency: 'MWK',
        lastUpdated: new Date().toISOString(),
        isOffline: !socketService.isConnected()
      };
      
    } catch (error) {
      console.error('❌ Failed to get wallet balance:', error);
      return {
        balance: this.walletBalance,
        currency: 'MWK',
        error: error.message,
        isOffline: true
      };
    }
  }

  async updateWalletBalance(amount, reason, transactionId = null) {
    try {
      const newBalance = this.walletBalance + amount;
      
      // Validate balance
      if (newBalance < 0) {
        throw new Error('Insufficient funds');
      }
      
      this.walletBalance = newBalance;
      
      // Create transaction record
      const transaction = {
        transactionId: transactionId || `txn_${Date.now()}`,
        amount,
        type: amount >= 0 ? 'credit' : 'debit',
        balanceBefore: this.walletBalance - amount,
        balanceAfter: this.walletBalance,
        reason,
        status: 'completed',
        timestamp: new Date().toISOString(),
        synced: socketService.isConnected()
      };
      
      this.transactions.unshift(transaction);
      
      // Cache data
      await this.cacheData();
      
      // Notify listeners
      this.notifyPaymentListeners('wallet_updated', {
        balance: this.walletBalance,
        transaction
      });
      
      // Sync with server if connected
      if (socketService.isConnected()) {
        socketService.emit('payment:wallet:update', {
          transactionId: transaction.transactionId,
          amount,
          newBalance: this.walletBalance,
          reason,
          timestamp: Date.now()
        });
      } else {
        // Queue for offline sync
        this.queueOfflineTransaction(transaction);
      }
      
      console.log(`💰 Wallet updated: ${amount >= 0 ? '+' : ''}${amount} MWK, New balance: ${this.walletBalance} MWK`);
      return transaction;
      
    } catch (error) {
      console.error('❌ Failed to update wallet:', error);
      throw error;
    }
  }

  // ====================
  // PAYMENT PROCESSING
  // ====================

  async processRidePayment(rideData, paymentMethod) {
    try {
      const { rideId, fare, distance, duration } = rideData;
      
      if (fare <= 0) {
        throw new Error('Invalid fare amount');
      }
      
      const transactionId = `ride_${rideId}_${Date.now()}`;
      
      const paymentData = {
        transactionId,
        rideId,
        amount: fare,
        paymentMethod,
        status: 'processing',
        initiatedAt: new Date().toISOString(),
        details: {
          distance,
          duration,
          fareBreakdown: rideData.fareBreakdown || {}
        }
      };
      
      // Add to pending transactions
      this.pendingTransactions.push(paymentData);
      
      // Notify payment initiation
      this.notifyPaymentListeners('payment_initiated', paymentData);
      
      // Process based on payment method
      let result;
      
      switch (paymentMethod) {
        case 'wallet':
          result = await this.processWalletPayment(fare, transactionId, `Ride: ${rideId}`);
          break;
          
        case 'cash':
          result = await this.processCashPayment(fare, transactionId, rideId);
          break;
          
        case 'mobile_money':
          result = await this.processMobileMoneyPayment(fare, transactionId, rideId);
          break;
          
        case 'card':
          result = await this.processCardPayment(fare, transactionId, rideId);
          break;
          
        default:
          throw new Error(`Unsupported payment method: ${paymentMethod}`);
      }
      
      // Remove from pending
      this.pendingTransactions = this.pendingTransactions.filter(
        tx => tx.transactionId !== transactionId
      );
      
      console.log(`✅ Payment processed: ${transactionId}, Amount: ${fare} MWK`);
      return result;
      
    } catch (error) {
      console.error('❌ Payment processing failed:', error);
      
      // Update transaction status
      const failedTransaction = {
        ...paymentData,
        status: 'failed',
        error: error.message,
        failedAt: new Date().toISOString()
      };
      
      this.notifyPaymentListeners('payment_failed', failedTransaction);
      throw error;
    }
  }

  async processWalletPayment(amount, transactionId, description) {
    try {
      // Check if sufficient balance
      if (this.walletBalance < amount) {
        throw new Error('Insufficient wallet balance');
      }
      
      // Deduct from wallet
      const transaction = await this.updateWalletBalance(
        -amount,
        description,
        transactionId
      );
      
      return {
        success: true,
        transactionId,
        amount,
        newBalance: this.walletBalance,
        method: 'wallet',
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Wallet payment failed:', error);
      throw error;
    }
  }

  async processCashPayment(amount, transactionId, rideId) {
    try {
      // Cash payments are always successful in app
      // Actual cash handling happens offline
      const transaction = {
        transactionId,
        rideId,
        amount,
        method: 'cash',
        status: 'pending_collection',
        requiresCollection: true,
        timestamp: new Date().toISOString(),
        notes: 'Cash to be collected from rider'
      };
      
      this.transactions.unshift(transaction);
      await this.cacheData();
      
      // Notify driver about cash payment
      this.notifyPaymentListeners('cash_payment_pending', transaction);
      
      return {
        success: true,
        transactionId,
        amount,
        method: 'cash',
        status: 'pending_collection',
        message: 'Please collect cash from rider',
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Cash payment processing failed:', error);
      throw error;
    }
  }

  async processMobileMoneyPayment(amount, transactionId, rideId) {
    try {
      // Simulate mobile money payment
      const transaction = {
        transactionId,
        rideId,
        amount,
        method: 'mobile_money',
        status: 'processing',
        provider: 'Airtel Money', // Default for Malawi
        timestamp: new Date().toISOString()
      };
      
      // In real app, this would integrate with mobile money API
      // For now, simulate success after 2 seconds
      return new Promise((resolve) => {
        setTimeout(() => {
          const result = {
            success: true,
            transactionId,
            amount,
            method: 'mobile_money',
            status: 'completed',
            provider: 'Airtel Money',
            reference: `MM_${Date.now()}`,
            timestamp: new Date().toISOString()
          };
          
          transaction.status = 'completed';
          this.transactions.unshift(transaction);
          this.cacheData();
          
          // Notify completion
          this.notifyPaymentListeners('mobile_money_completed', result);
          
          resolve(result);
        }, 2000);
      });
      
    } catch (error) {
      console.error('❌ Mobile money payment failed:', error);
      throw error;
    }
  }

  async processCardPayment(amount, transactionId, rideId) {
    try {
      // Simulate card payment
      const transaction = {
        transactionId,
        rideId,
        amount,
        method: 'card',
        status: 'processing',
        timestamp: new Date().toISOString()
      };
      
      // In real app, this would integrate with card payment gateway
      return new Promise((resolve) => {
        setTimeout(() => {
          const result = {
            success: true,
            transactionId,
            amount,
            method: 'card',
            status: 'completed',
            authorizationCode: `AUTH_${Date.now()}`,
            timestamp: new Date().toISOString()
          };
          
          transaction.status = 'completed';
          this.transactions.unshift(transaction);
          this.cacheData();
          
          this.notifyPaymentListeners('card_payment_completed', result);
          
          resolve(result);
        }, 3000);
      });
      
    } catch (error) {
      console.error('❌ Card payment failed:', error);
      throw error;
    }
  }

  // ====================
  // PAYMENT METHODS
  // ====================

  async getPaymentMethods() {
    try {
      // Default payment methods for Malawi
      const defaultMethods = [
        {
          id: 'cash',
          type: 'cash',
          name: 'Cash',
          isDefault: true,
          icon: 'money',
          enabled: true,
          description: 'Pay with cash'
        },
        {
          id: 'wallet',
          type: 'wallet',
          name: 'Wallet',
          icon: 'credit-card',
          enabled: true,
          balance: this.walletBalance,
          description: `Balance: ${this.walletBalance} MWK`
        },
        {
          id: 'airtel_money',
          type: 'mobile_money',
          name: 'Airtel Money',
          icon: 'mobile',
          enabled: true,
          provider: 'Airtel',
          description: 'Pay with Airtel Money'
        },
        {
          id: 'tnm_mpamba',
          type: 'mobile_money',
          name: 'TNM Mpamba',
          icon: 'mobile',
          enabled: true,
          provider: 'TNM',
          description: 'Pay with TNM Mpamba'
        },
        {
          id: 'card',
          type: 'card',
          name: 'Card',
          icon: 'cc-visa',
          enabled: false, // Disabled by default, need setup
          description: 'Add credit/debit card'
        }
      ];
      
      // Merge with stored methods
      const methods = [...defaultMethods];
      
      // Add any additional stored methods
      this.paymentMethods.forEach(storedMethod => {
        if (!methods.find(m => m.id === storedMethod.id)) {
          methods.push(storedMethod);
        }
      });
      
      return methods;
      
    } catch (error) {
      console.error('❌ Failed to get payment methods:', error);
      return [];
    }
  }

  async addPaymentMethod(methodData) {
    try {
      const methodId = `method_${Date.now()}`;
      const newMethod = {
        id: methodId,
        ...methodData,
        addedAt: new Date().toISOString(),
        isVerified: false
      };
      
      this.paymentMethods.push(newMethod);
      await this.cacheData();
      
      // Notify listeners
      this.notifyPaymentListeners('payment_method_added', newMethod);
      
      console.log('✅ Payment method added:', methodData.type);
      return newMethod;
      
    } catch (error) {
      console.error('❌ Failed to add payment method:', error);
      throw error;
    }
  }

  async removePaymentMethod(methodId) {
    try {
      const index = this.paymentMethods.findIndex(m => m.id === methodId);
      
      if (index === -1) {
        throw new Error('Payment method not found');
      }
      
      const removedMethod = this.paymentMethods.splice(index, 1)[0];
      await this.cacheData();
      
      this.notifyPaymentListeners('payment_method_removed', removedMethod);
      
      console.log('🗑️ Payment method removed:', methodId);
      return true;
      
    } catch (error) {
      console.error('❌ Failed to remove payment method:', error);
      throw error;
    }
  }

  // ====================
  // TRANSACTIONS
  // ====================

  async getTransactions(limit = 20, offset = 0) {
    try {
      const recentTransactions = this.transactions.slice(offset, offset + limit);
      
      return {
        transactions: recentTransactions,
        total: this.transactions.length,
        hasMore: offset + limit < this.transactions.length,
        balance: this.walletBalance
      };
      
    } catch (error) {
      console.error('❌ Failed to get transactions:', error);
      return {
        transactions: [],
        total: 0,
        hasMore: false,
        balance: this.walletBalance,
        error: error.message
      };
    }
  }

  async getTransaction(transactionId) {
    try {
      const transaction = this.transactions.find(tx => tx.transactionId === transactionId);
      
      if (!transaction) {
        throw new Error('Transaction not found');
      }
      
      return transaction;
      
    } catch (error) {
      console.error('❌ Failed to get transaction:', error);
      throw error;
    }
  }

  // ====================
  // PAYOUTS (FOR DRIVERS)
  // ====================

  async requestPayout(amount, method) {
    try {
      if (amount > this.walletBalance) {
        throw new Error('Insufficient balance for payout');
      }
      
      if (amount < 1000) {
        throw new Error('Minimum payout amount is 1000 MWK');
      }
      
      const payoutId = `payout_${Date.now()}`;
      
      const payoutData = {
        payoutId,
        amount,
        method,
        status: 'requested',
        requestedAt: new Date().toISOString(),
        estimatedCompletion: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      };
      
      // Deduct from wallet immediately
      await this.updateWalletBalance(
        -amount,
        `Payout to ${method}`,
        payoutId
      );
      
      // In real app, this would call payout API
      // For now, simulate processing
      setTimeout(() => {
        this.completePayout(payoutId);
      }, 5000);
      
      console.log(`💸 Payout requested: ${amount} MWK via ${method}`);
      return payoutData;
      
    } catch (error) {
      console.error('❌ Payout request failed:', error);
      throw error;
    }
  }

  async completePayout(payoutId) {
    try {
      // Find and update payout
      // In real app, this would be triggered by server
      
      const completedPayout = {
        payoutId,
        status: 'completed',
        completedAt: new Date().toISOString(),
        message: 'Payout processed successfully'
      };
      
      this.notifyPaymentListeners('payout_completed', completedPayout);
      
      console.log(`✅ Payout completed: ${payoutId}`);
      return completedPayout;
      
    } catch (error) {
      console.error('❌ Failed to complete payout:', error);
      throw error;
    }
  }

  // ====================
  // EVENT HANDLERS
  // ====================

  handlePaymentConfirmed(data) {
    const transaction = this.transactions.find(tx => tx.transactionId === data.transactionId);
    
    if (transaction) {
      transaction.status = 'completed';
      transaction.confirmedAt = new Date().toISOString();
      this.cacheData();
      
      this.notifyPaymentListeners('payment_confirmed', data);
    }
  }

  handlePaymentFailed(data) {
    const transaction = this.transactions.find(tx => tx.transactionId === data.transactionId);
    
    if (transaction) {
      transaction.status = 'failed';
      transaction.error = data.error;
      transaction.failedAt = new Date().toISOString();
      this.cacheData();
      
      this.notifyPaymentListeners('payment_failed', data);
    }
  }

  handleWalletUpdate(data) {
    if (data.balance !== undefined) {
      this.walletBalance = data.balance;
      this.cacheData();
      
      this.notifyPaymentListeners('wallet_updated', data);
    }
  }

  handleNewTransaction(data) {
    this.transactions.unshift(data);
    this.cacheData();
    
    this.notifyPaymentListeners('new_transaction', data);
  }

  handlePayoutStatus(data) {
    this.notifyPaymentListeners('payout_status', data);
  }

  // ====================
  // OFFLINE SUPPORT
  // ====================

  queueOfflineTransaction(transaction) {
    this.offlineTransactions.push({
      ...transaction,
      queuedAt: new Date().toISOString()
    });
    
    this.cacheData();
    
    console.log(`📤 Transaction queued for offline sync: ${transaction.transactionId}`);
  }

  async syncOfflineTransactions() {
    if (this.offlineTransactions.length === 0 || !socketService.isConnected()) {
      return { synced: 0, failed: 0 };
    }
    
    console.log(`🔄 Syncing ${this.offlineTransactions.length} offline transactions...`);
    
    let synced = 0;
    let failed = 0;
    
    for (const transaction of [...this.offlineTransactions]) {
      try {
        // Send to server
        socketService.emit('payment:transaction:sync', transaction);
        
        // Remove from queue
        this.offlineTransactions = this.offlineTransactions.filter(
          tx => tx.transactionId !== transaction.transactionId
        );
        
        synced++;
        
      } catch (error) {
        console.error(`❌ Failed to sync transaction ${transaction.transactionId}:`, error);
        failed++;
      }
    }
    
    await this.cacheData();
    
    console.log(`✅ Offline sync completed: ${synced} synced, ${failed} failed`);
    return { synced, failed };
  }

  // ====================
  // EVENT SYSTEM
  // ====================

  onPaymentEvent(event, callback) {
    if (!this.paymentListeners.has(event)) {
      this.paymentListeners.set(event, []);
    }
    
    this.paymentListeners.get(event).push(callback);
    
    return () => {
      const listeners = this.paymentListeners.get(event);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }

  notifyPaymentListeners(event, data) {
    if (this.paymentListeners.has(event)) {
      this.paymentListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  // ====================
  // SERVER SYNC
  // ====================

  async syncWithServer() {
    try {
      if (!socketService.isConnected()) {
        console.log('🌐 Offline - skipping server sync');
        return { success: false, reason: 'offline' };
      }
      
      console.log('🔄 Syncing payment data with server...');
      
      // Sync wallet balance
      socketService.emit('payment:sync:request', {
        timestamp: Date.now(),
        lastSync: await AsyncStorage.getItem('last_payment_sync') || 0
      });
      
      // Sync offline transactions
      await this.syncOfflineTransactions();
      
      await AsyncStorage.setItem('last_payment_sync', Date.now().toString());
      
      console.log('✅ Payment data synced with server');
      return { success: true };
      
    } catch (error) {
      console.error('❌ Server sync failed:', error);
      return { success: false, error: error.message };
    }
  }

  // ====================
  // CLEANUP
  // ====================

  async cleanup() {
    this.paymentListeners.clear();
    await this.syncWithServer();
    console.log('🧹 PaymentService cleanup complete');
  }
}

const paymentServiceInstance = new PaymentService();
export default paymentServiceInstance;