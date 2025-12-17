// src/store/slices/paymentSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Service imports - FIXED:
import PaymentService from '@services/payment/PaymentService'; // Fixed with alias

// TODO: Check if WalletService exists in your structure
// import WalletService from '@services/wallet/WalletService'; // Commented - check if folder exists

// ====================
// INITIAL STATE
// ====================

const initialState = {
  // Payment methods
  paymentMethods: [],
  defaultPaymentMethod: null,
  
  // Wallet balance
  wallet: {
    balance: 0,
    currency: 'MWK',
    formattedBalance: 'MWK 0.00',
    lastUpdated: null,
    isLocked: false,
    lockReason: null,
  },
  
  // Transaction history
  transactions: [],
  transactionHistory: [],
  
  // Payment processing
  currentPayment: null,
  paymentStatus: 'idle', // 'idle', 'processing', 'success', 'failed', 'cancelled'
  paymentResult: null,
  
  // Pending payments
  pendingPayments: [],
  
  // Payment settings
  settings: {
    autoTopUp: false,
    topUpThreshold: 1000, // Auto top up when balance goes below this
    topUpAmount: 5000, // Amount to top up
    defaultTopUpMethod: 'card',
    saveCards: true,
    saveReceipts: true,
    taxInclusive: true,
    tipPercentage: 10,
    roundUpDonations: false,
  },
  
  // Cards and bank accounts
  cards: [],
  bankAccounts: [],
  
  // Promotions and discounts
  promotions: [],
  activePromo: null,
  discountAmount: 0,
  
  // Receipts
  receipts: [],
  
  // Payment limits
  limits: {
    dailyLimit: 50000,
    transactionLimit: 20000,
    monthlyLimit: 500000,
    remainingDaily: 50000,
    remainingMonthly: 500000,
  },
  
  // Security and verification
  security: {
    pinEnabled: false,
    biometricEnabled: false,
    requireAuthForPayments: true,
    requireAuthAbove: 5000,
    lastVerified: null,
  },
  
  // Loading states
  loading: {
    wallet: false,
    transactions: false,
    payment: false,
    addingMethod: false,
    toppingUp: false,
  },
  
  // Error states
  errors: {
    wallet: null,
    transactions: null,
    payment: null,
    addingMethod: null,
    toppingUp: null,
  },
  
  // Statistics
  stats: {
    totalSpent: 0,
    totalReceived: 0,
    totalTransactions: 0,
    averageTransaction: 0,
    mostFrequentCategory: 'transport',
    lastTransactionTime: null,
    monthlySpending: 0,
    dailySpending: 0,
  },
  
  // Payment categories
  categories: {
    transport: 0,
    food: 0,
    shopping: 0,
    entertainment: 0,
    bills: 0,
    other: 0,
  },
  
  // Subscription and recurring payments
  subscriptions: [],
  recurringPayments: [],
  
  // Invoice management
  invoices: [],
  pendingInvoices: [],
  
  // Disputes and refunds
  disputes: [],
  refunds: [],
  
  // Tax and compliance
  tax: {
    vatRate: 0.16, // 16% VAT for Malawi
    withholdingTax: 0,
    taxNumber: null,
    compliant: true,
  },
  
  // Timestamps
  timestamps: {
    lastPayment: null,
    lastTopUp: null,
    lastStatement: null,
  },
};

// ====================
// SLICE DEFINITION
// ====================

const paymentSlice = createSlice({
  name: 'payment',
  initialState,
  reducers: {
    // ====================
    // WALLET MANAGEMENT
    // ====================
    
    setWalletBalance: (state, action) => {
      const { balance, currency } = action.payload;
      state.wallet.balance = balance;
      state.wallet.currency = currency || 'MWK';
      state.wallet.formattedBalance = `${state.wallet.currency} ${balance.toLocaleString()}`;
      state.wallet.lastUpdated = Date.now();
    },
    
    updateWalletBalance: (state, action) => {
      const amount = action.payload;
      state.wallet.balance += amount;
      state.wallet.formattedBalance = `${state.wallet.currency} ${state.wallet.balance.toLocaleString()}`;
      state.wallet.lastUpdated = Date.now();
    },
    
    lockWallet: (state, action) => {
      state.wallet.isLocked = true;
      state.wallet.lockReason = action.payload || 'Security concern';
    },
    
    unlockWallet: (state) => {
      state.wallet.isLocked = false;
      state.wallet.lockReason = null;
    },
    
    // ====================
    // PAYMENT METHODS
    // ====================
    
    setPaymentMethods: (state, action) => {
      state.paymentMethods = action.payload;
      
      // Set default if not set
      if (!state.defaultPaymentMethod && action.payload.length > 0) {
        const defaultMethod = action.payload.find(method => method.isDefault) || action.payload[0];
        state.defaultPaymentMethod = defaultMethod.id;
      }
    },
    
    addPaymentMethod: (state, action) => {
      const method = {
        ...action.payload,
        id: action.payload.id || `card_${Date.now()}`,
        addedAt: Date.now(),
        isDefault: state.paymentMethods.length === 0,
      };
      
      state.paymentMethods.push(method);
      
      if (method.isDefault) {
        state.defaultPaymentMethod = method.id;
      }
    },
    
    removePaymentMethod: (state, action) => {
      const methodId = action.payload;
      state.paymentMethods = state.paymentMethods.filter(method => method.id !== methodId);
      
      // If default was removed, set new default
      if (state.defaultPaymentMethod === methodId) {
        state.defaultPaymentMethod = state.paymentMethods.length > 0 ? 
          state.paymentMethods[0].id : null;
      }
    },
    
    setDefaultPaymentMethod: (state, action) => {
      const methodId = action.payload;
      
      // Check if method exists
      const methodExists = state.paymentMethods.some(method => method.id === methodId);
      
      if (methodExists) {
        state.defaultPaymentMethod = methodId;
        
        // Update isDefault flags
        state.paymentMethods = state.paymentMethods.map(method => ({
          ...method,
          isDefault: method.id === methodId,
        }));
      }
    },
    
    // ====================
    // TRANSACTION MANAGEMENT
    // ====================
    
    addTransaction: (state, action) => {
      const transaction = {
        ...action.payload,
        id: action.payload.id || `txn_${Date.now()}`,
        timestamp: action.payload.timestamp || Date.now(),
        status: 'completed',
      };
      
      state.transactions.unshift(transaction);
      state.transactionHistory.unshift(transaction);
      state.stats.totalTransactions += 1;
      state.timestamps.lastPayment = transaction.timestamp;
      
      // Update stats
      if (transaction.type === 'debit') {
        state.stats.totalSpent += transaction.amount;
        state.stats.dailySpending += transaction.amount;
        state.stats.monthlySpending += transaction.amount;
        
        // Update category spending
        if (transaction.category && state.categories[transaction.category] !== undefined) {
          state.categories[transaction.category] += transaction.amount;
        } else {
          state.categories.other += transaction.amount;
        }
        
        // Update wallet balance
        state.wallet.balance -= transaction.amount;
        state.wallet.formattedBalance = `${state.wallet.currency} ${state.wallet.balance.toLocaleString()}`;
        
        // Update limits
        state.limits.remainingDaily -= transaction.amount;
        state.limits.remainingMonthly -= transaction.amount;
      } else if (transaction.type === 'credit') {
        state.stats.totalReceived += transaction.amount;
        
        // Update wallet balance for top-ups
        if (transaction.category === 'topup') {
          state.wallet.balance += transaction.amount;
          state.wallet.formattedBalance = `${state.wallet.currency} ${state.wallet.balance.toLocaleString()}`;
          state.timestamps.lastTopUp = transaction.timestamp;
        }
      }
      
      // Update average transaction
      state.stats.averageTransaction = state.stats.totalSpent / state.stats.totalTransactions;
      
      // Keep only last 100 transactions
      if (state.transactions.length > 100) {
        state.transactions.pop();
      }
      
      // Keep only last 500 in history
      if (state.transactionHistory.length > 500) {
        state.transactionHistory.pop();
      }
    },
    
    updateTransactionStatus: (state, action) => {
      const { transactionId, status, data } = action.payload;
      
      // Update in transactions
      const transactionIndex = state.transactions.findIndex(t => t.id === transactionId);
      if (transactionIndex !== -1) {
        state.transactions[transactionIndex] = {
          ...state.transactions[transactionIndex],
          status,
          ...data,
        };
      }
      
      // Update in history
      const historyIndex = state.transactionHistory.findIndex(t => t.id === transactionId);
      if (historyIndex !== -1) {
        state.transactionHistory[historyIndex] = {
          ...state.transactionHistory[historyIndex],
          status,
          ...data,
        };
      }
    },
    
    clearTransactions: (state) => {
      state.transactions = [];
    },
    
    // ====================
    // PAYMENT PROCESSING
    // ====================
    
    setCurrentPayment: (state, action) => {
      state.currentPayment = action.payload;
      state.paymentStatus = 'processing';
      state.paymentResult = null;
    },
    
    setPaymentStatus: (state, action) => {
      state.paymentStatus = action.payload.status;
      state.paymentResult = action.payload.result || null;
      
      if (action.payload.status === 'success' && state.currentPayment) {
        // Add to transactions
        const transaction = {
          ...state.currentPayment,
          id: `txn_${Date.now()}`,
          timestamp: Date.now(),
          status: 'completed',
        };
        
        state.transactions.unshift(transaction);
        state.stats.totalTransactions += 1;
        
        // Reset current payment
        state.currentPayment = null;
      }
    },
    
    clearPayment: (state) => {
      state.currentPayment = null;
      state.paymentStatus = 'idle';
      state.paymentResult = null;
    },
    
    // ====================
    // PENDING PAYMENTS
    // ====================
    
    addPendingPayment: (state, action) => {
      const payment = {
        ...action.payload,
        id: action.payload.id || `pending_${Date.now()}`,
        addedAt: Date.now(),
        attempts: 0,
      };
      
      state.pendingPayments.push(payment);
    },
    
    removePendingPayment: (state, action) => {
      const paymentId = action.payload;
      state.pendingPayments = state.pendingPayments.filter(p => p.id !== paymentId);
    },
    
    updatePendingPayment: (state, action) => {
      const { paymentId, updates } = action.payload;
      const index = state.pendingPayments.findIndex(p => p.id === paymentId);
      
      if (index !== -1) {
        state.pendingPayments[index] = {
          ...state.pendingPayments[index],
          ...updates,
          attempts: (state.pendingPayments[index].attempts || 0) + 1,
        };
      }
    },
    
    clearPendingPayments: (state) => {
      state.pendingPayments = [];
    },
    
    // ====================
    // SETTINGS MANAGEMENT
    // ====================
    
    updatePaymentSettings: (state, action) => {
      state.settings = {
        ...state.settings,
        ...action.payload,
      };
    },
    
    toggleAutoTopUp: (state) => {
      state.settings.autoTopUp = !state.settings.autoTopUp;
    },
    
    // ====================
    // CARDS & BANK ACCOUNTS
    // ====================
    
    addCard: (state, action) => {
      const card = {
        ...action.payload,
        id: action.payload.id || `card_${Date.now()}`,
        addedAt: Date.now(),
        isDefault: state.cards.length === 0,
      };
      
      state.cards.push(card);
    },
    
    removeCard: (state, action) => {
      const cardId = action.payload;
      state.cards = state.cards.filter(card => card.id !== cardId);
      
      // Also remove from payment methods
      state.paymentMethods = state.paymentMethods.filter(
        method => !(method.type === 'card' && method.id === cardId)
      );
    },
    
    addBankAccount: (state, action) => {
      const account = {
        ...action.payload,
        id: action.payload.id || `bank_${Date.now()}`,
        addedAt: Date.now(),
      };
      
      state.bankAccounts.push(account);
    },
    
    removeBankAccount: (state, action) => {
      const accountId = action.payload;
      state.bankAccounts = state.bankAccounts.filter(account => account.id !== accountId);
    },
    
    // ====================
    // PROMOTIONS & DISCOUNTS
    // ====================
    
    setPromotions: (state, action) => {
      state.promotions = action.payload;
    },
    
    applyPromotion: (state, action) => {
      const promotion = action.payload;
      state.activePromo = promotion;
      state.discountAmount = promotion.discountAmount || 0;
    },
    
    removePromotion: (state) => {
      state.activePromo = null;
      state.discountAmount = 0;
    },
    
    // ====================
    // RECEIPTS MANAGEMENT
    // ====================
    
    addReceipt: (state, action) => {
      const receipt = {
        ...action.payload,
        id: action.payload.id || `receipt_${Date.now()}`,
        savedAt: Date.now(),
      };
      
      state.receipts.unshift(receipt);
      
      // Keep only last 100 receipts
      if (state.receipts.length > 100) {
        state.receipts.pop();
      }
    },
    
    removeReceipt: (state, action) => {
      const receiptId = action.payload;
      state.receipts = state.receipts.filter(r => r.id !== receiptId);
    },
    
    // ====================
    // LIMITS MANAGEMENT
    // ====================
    
    updateLimits: (state, action) => {
      state.limits = {
        ...state.limits,
        ...action.payload,
      };
    },
    
    resetDailyLimits: (state) => {
      state.limits.remainingDaily = state.limits.dailyLimit;
      state.stats.dailySpending = 0;
    },
    
    resetMonthlyLimits: (state) => {
      state.limits.remainingMonthly = state.limits.monthlyLimit;
      state.stats.monthlySpending = 0;
    },
    
    // ====================
    // SECURITY MANAGEMENT
    // ====================
    
    updateSecuritySettings: (state, action) => {
      state.security = {
        ...state.security,
        ...action.payload,
      };
    },
    
    togglePinSecurity: (state) => {
      state.security.pinEnabled = !state.security.pinEnabled;
    },
    
    toggleBiometricSecurity: (state) => {
      state.security.biometricEnabled = !state.security.biometricEnabled;
    },
    
    // ====================
    // SUBSCRIPTIONS
    // ====================
    
    addSubscription: (state, action) => {
      const subscription = {
        ...action.payload,
        id: action.payload.id || `sub_${Date.now()}`,
        subscribedAt: Date.now(),
      };
      
      state.subscriptions.push(subscription);
    },
    
    cancelSubscription: (state, action) => {
      const subscriptionId = action.payload;
      const index = state.subscriptions.findIndex(s => s.id === subscriptionId);
      
      if (index !== -1) {
        state.subscriptions[index] = {
          ...state.subscriptions[index],
          status: 'cancelled',
          cancelledAt: Date.now(),
        };
      }
    },
    
    // ====================
    // INVOICES
    // ====================
    
    addInvoice: (state, action) => {
      const invoice = {
        ...action.payload,
        id: action.payload.id || `inv_${Date.now()}`,
        created: Date.now(),
        status: 'pending',
      };
      
      state.invoices.push(invoice);
      state.pendingInvoices.push(invoice);
    },
    
    markInvoiceAsPaid: (state, action) => {
      const invoiceId = action.payload;
      
      // Update in invoices
      const invoiceIndex = state.invoices.findIndex(i => i.id === invoiceId);
      if (invoiceIndex !== -1) {
        state.invoices[invoiceIndex] = {
          ...state.invoices[invoiceIndex],
          status: 'paid',
          paidAt: Date.now(),
        };
      }
      
      // Remove from pending
      state.pendingInvoices = state.pendingInvoices.filter(i => i.id !== invoiceId);
    },
    
    // ====================
    // DISPUTES & REFUNDS
    // ====================
    
    addDispute: (state, action) => {
      const dispute = {
        ...action.payload,
        id: action.payload.id || `dispute_${Date.now()}`,
        filedAt: Date.now(),
        status: 'open',
      };
      
      state.disputes.push(dispute);
    },
    
    addRefund: (state, action) => {
      const refund = {
        ...action.payload,
        id: action.payload.id || `refund_${Date.now()}`,
        processedAt: Date.now(),
        status: 'processing',
      };
      
      state.refunds.push(refund);
    },
    
    // ====================
    // TAX MANAGEMENT
    // ====================
    
    updateTaxSettings: (state, action) => {
      state.tax = {
        ...state.tax,
        ...action.payload,
      };
    },
    
    // ====================
    // ERROR HANDLING
    // ====================
    
    setError: (state, action) => {
      const { key, error } = action.payload;
      if (state.errors[key] !== undefined) {
        state.errors[key] = error;
      }
    },
    
    clearError: (state, action) => {
      const key = action.payload;
      if (state.errors[key]) {
        state.errors[key] = null;
      }
    },
    
    clearAllErrors: (state) => {
      Object.keys(state.errors).forEach(key => {
        state.errors[key] = null;
      });
    },
    
    // ====================
    // STATISTICS
    // ====================
    
    updatePaymentStats: (state, action) => {
      state.stats = {
        ...state.stats,
        ...action.payload,
      };
    },
    
    // ====================
    // RESET & CLEANUP
    // ====================
    
    resetPaymentState: (state) => {
      return {
        ...initialState,
        paymentMethods: state.paymentMethods,
        wallet: state.wallet,
        settings: state.settings,
        security: state.security,
        tax: state.tax,
      };
    },
    
    resetDailyStats: (state) => {
      state.stats.dailySpending = 0;
      state.limits.remainingDaily = state.limits.dailyLimit;
    },
  },
});

// ====================
// ACTION CREATORS
// ====================

export const {
  setWalletBalance,
  updateWalletBalance,
  lockWallet,
  unlockWallet,
  setPaymentMethods,
  addPaymentMethod,
  removePaymentMethod,
  setDefaultPaymentMethod,
  addTransaction,
  updateTransactionStatus,
  clearTransactions,
  setCurrentPayment,
  setPaymentStatus,
  clearPayment,
  addPendingPayment,
  removePendingPayment,
  updatePendingPayment,
  clearPendingPayments,
  updatePaymentSettings,
  toggleAutoTopUp,
  addCard,
  removeCard,
  addBankAccount,
  removeBankAccount,
  setPromotions,
  applyPromotion,
  removePromotion,
  addReceipt,
  removeReceipt,
  updateLimits,
  resetDailyLimits,
  resetMonthlyLimits,
  updateSecuritySettings,
  togglePinSecurity,
  toggleBiometricSecurity,
  addSubscription,
  cancelSubscription,
  addInvoice,
  markInvoiceAsPaid,
  addDispute,
  addRefund,
  updateTaxSettings,
  setError,
  clearError,
  clearAllErrors,
  updatePaymentStats,
  resetPaymentState,
  resetDailyStats,
} = paymentSlice.actions;

// ====================
// SELECTORS
// ====================

export const selectPayment = (state) => state.payment;
export const selectWallet = (state) => state.payment.wallet;
export const selectWalletBalance = (state) => state.payment.wallet.balance;
export const selectPaymentMethods = (state) => state.payment.paymentMethods;
export const selectDefaultPaymentMethod = (state) => state.payment.defaultPaymentMethod;
export const selectTransactions = (state) => state.payment.transactions;
export const selectTransactionHistory = (state) => state.payment.transactionHistory;
export const selectCurrentPayment = (state) => state.payment.currentPayment;
export const selectPaymentStatus = (state) => state.payment.paymentStatus;
export const selectPaymentResult = (state) => state.payment.paymentResult;
export const selectPendingPayments = (state) => state.payment.pendingPayments;
export const selectPaymentSettings = (state) => state.payment.settings;
export const selectCards = (state) => state.payment.cards;
export const selectBankAccounts = (state) => state.payment.bankAccounts;
export const selectPromotions = (state) => state.payment.promotions;
export const selectActivePromo = (state) => state.payment.activePromo;
export const selectDiscountAmount = (state) => state.payment.discountAmount;
export const selectReceipts = (state) => state.payment.receipts;
export const selectLimits = (state) => state.payment.limits;
export const selectSecurity = (state) => state.payment.security;
export const selectSubscriptions = (state) => state.payment.subscriptions;
export const selectInvoices = (state) => state.payment.invoices;
export const selectPendingInvoices = (state) => state.payment.pendingInvoices;
export const selectDisputes = (state) => state.payment.disputes;
export const selectRefunds = (state) => state.payment.refunds;
export const selectTax = (state) => state.payment.tax;
export const selectLoading = (state) => state.payment.loading;
export const selectErrors = (state) => state.payment.errors;
export const selectStats = (state) => state.payment.stats;
export const selectCategories = (state) => state.payment.categories;
export const selectTimestamps = (state) => state.payment.timestamps;

// Derived Selectors
export const selectFormattedWalletBalance = (state) =>
  state.payment.wallet.formattedBalance;

export const selectDefaultPaymentMethodDetails = (state) => {
  const methodId = state.payment.defaultPaymentMethod;
  return state.payment.paymentMethods.find(method => method.id === methodId);
};

export const selectRecentTransactions = (limit = 10) => (state) =>
  state.payment.transactions.slice(0, limit);

export const selectTransactionById = (id) => (state) =>
  state.payment.transactions.find(t => t.id === id) ||
  state.payment.transactionHistory.find(t => t.id === id);

export const selectTotalSpent = (state) => state.payment.stats.totalSpent;

export const selectDailySpending = (state) => state.payment.stats.dailySpending;

export const selectMonthlySpending = (state) => state.payment.stats.monthlySpending;

export const selectRemainingDailyLimit = (state) =>
  state.payment.limits.remainingDaily;

export const selectRemainingMonthlyLimit = (state) =>
  state.payment.limits.remainingMonthly;

export const selectIsWalletLocked = (state) => state.payment.wallet.isLocked;

export const selectCanMakePayment = (amount) => (state) => {
  if (state.payment.wallet.isLocked) return false;
  
  if (amount > state.payment.limits.transactionLimit) return false;
  
  if (amount > state.payment.limits.remainingDaily) return false;
  
  if (amount > state.payment.limits.remainingMonthly) return false;
  
  return true;
};

export const selectPaymentSummary = (state) => ({
  balance: state.payment.wallet.balance,
  formattedBalance: state.payment.wallet.formattedBalance,
  totalSpent: state.payment.stats.totalSpent,
  dailySpending: state.payment.stats.dailySpending,
  monthlySpending: state.payment.stats.monthlySpending,
  remainingDaily: state.payment.limits.remainingDaily,
  remainingMonthly: state.payment.limits.remainingMonthly,
  totalTransactions: state.payment.stats.totalTransactions,
  defaultMethod: state.payment.defaultPaymentMethod,
  isWalletLocked: state.payment.wallet.isLocked,
  activePromo: state.payment.activePromo,
  discountAmount: state.payment.discountAmount,
});

export const selectCategorySpending = (category) => (state) =>
  state.payment.categories[category] || 0;

export const selectTopSpendingCategories = (limit = 5) => (state) => {
  const categories = Object.entries(state.payment.categories)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
  
  return categories;
};

export default paymentSlice.reducer;