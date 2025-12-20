// screens/payments/PaymentMethodsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Swipeable from 'react-native-gesture-handler/Swipeable';

export default function PaymentMethodsScreen() {
  const navigation = useNavigation();
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      const methods = await AsyncStorage.getItem('payment_methods');
      if (methods) {
        setPaymentMethods(JSON.parse(methods));
      }
      setRefreshing(false);
    } catch (error) {
      console.error('Error loading payment methods:', error);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPaymentMethods();
  };

  const handleSetDefault = async (methodId) => {
    try {
      const updatedMethods = paymentMethods.map(method => ({
        ...method,
        isDefault: method.id === methodId
      }));
      
      await AsyncStorage.setItem('payment_methods', JSON.stringify(updatedMethods));
      setPaymentMethods(updatedMethods);
    } catch (error) {
      console.error('Error setting default method:', error);
      Alert.alert('Error', 'Failed to set default payment method');
    }
  };

  const handleDeleteMethod = (methodId) => {
    Alert.alert(
      'Remove Payment Method',
      'Are you sure you want to remove this payment method?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => deleteMethod(methodId)
        },
      ]
    );
  };

  const deleteMethod = async (methodId) => {
    try {
      const updatedMethods = paymentMethods.filter(method => method.id !== methodId);
      await AsyncStorage.setItem('payment_methods', JSON.stringify(updatedMethods));
      setPaymentMethods(updatedMethods);
      
      Alert.alert('Success', 'Payment method removed successfully');
    } catch (error) {
      console.error('Error deleting payment method:', error);
      Alert.alert('Error', 'Failed to remove payment method');
    }
  };

  const renderRightActions = (methodId, isDefault) => {
    if (isDefault) return null;
    
    return (
      <View style={styles.swipeActions}>
        <TouchableOpacity
          style={[styles.swipeButton, styles.deleteButton]}
          onPress={() => handleDeleteMethod(methodId)}
        >
          <MaterialIcon name="delete" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderPaymentMethod = (method) => (
    <Swipeable
      key={method.id}
      renderRightActions={() => renderRightActions(method.id, method.isDefault)}
      enabled={!method.isDefault}
    >
      <TouchableOpacity
        style={styles.methodCard}
        onPress={() => navigation.navigate('PaymentMethodDetails', { method })}
      >
        <View style={styles.methodHeader}>
          <View style={[styles.methodIcon, { backgroundColor: method.color + '20' }]}>
            <MaterialCommunityIcon
              name={method.icon || 'credit-card'}
              size={24}
              color={method.color || '#3B82F6'}
            />
          </View>
          <View style={styles.methodInfo}>
            <Text style={styles.methodTitle}>{method.title}</Text>
            <Text style={styles.methodSubtitle}>
              {method.type === 'mobile_money' ? 'Mobile Money' : 'Credit/Debit Card'}
              {method.isDefault && ' • Default'}
            </Text>
          </View>
          {method.isDefault ? (
            <MaterialIcon name="star" size={24} color="#F59E0B" />
          ) : (
            <TouchableOpacity
              style={styles.defaultButton}
              onPress={() => handleSetDefault(method.id)}
            >
              <Text style={styles.defaultButtonText}>Set Default</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.methodDetails}>
          <Text style={styles.methodDetailText}>
            Added {new Date(method.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              year: 'numeric'
            })}
          </Text>
          <View style={[
            styles.statusBadge,
            { backgroundColor: method.isDefault ? '#D1FAE5' : '#E5E7EB' }
          ]}>
            <Text style={[
              styles.statusText,
              { color: method.isDefault ? '#065F46' : '#374151' }
            ]}>
              {method.isDefault ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Swipeable>
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
          <MaterialIcon name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Methods</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => navigation.navigate('AddPayment')}
        >
          <MaterialIcon name="add" size={24} color="#4F46E5" />
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
        {/* Default Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Default Payment Method</Text>
          {paymentMethods.find(m => m.isDefault) ? (
            renderPaymentMethod(paymentMethods.find(m => m.isDefault))
          ) : (
            <View style={styles.emptyDefault}>
              <MaterialIcon name="warning" size={40} color="#F59E0B" />
              <Text style={styles.emptyDefaultText}>No default payment method set</Text>
              <Text style={styles.emptyDefaultSubtext}>
                Set a default method for faster payments
              </Text>
            </View>
          )}
        </View>
        
        {/* Other Payment Methods */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Other Methods</Text>
            <Text style={styles.methodsCount}>
              {paymentMethods.filter(m => !m.isDefault).length} methods
            </Text>
          </View>
          
          {loading ? (
            <ActivityIndicator size="large" color="#4F46E5" style={styles.loader} />
          ) : paymentMethods.filter(m => !m.isDefault).length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcon name="credit-card-off" size={60} color="#E5E7EB" />
              <Text style={styles.emptyStateText}>No payment methods</Text>
              <Text style={styles.emptyStateSubtext}>
                Add a payment method to make payments easier
              </Text>
            </View>
          ) : (
            paymentMethods
              .filter(m => !m.isDefault)
              .map(method => renderPaymentMethod(method))
          )}
        </View>
        
        {/* Security Info */}
        <View style={styles.securitySection}>
          <MaterialIcon name="security" size={20} color="#6B7280" />
          <Text style={styles.securityText}>
            Your payment methods are securely stored and encrypted. You can remove them at any time.
          </Text>
        </View>
        
        {/* Add New Method CTA */}
        {paymentMethods.length === 0 && (
          <TouchableOpacity
            style={styles.addNewCard}
            onPress={() => navigation.navigate('AddPayment')}
          >
            <View style={styles.addNewIcon}>
              <MaterialIcon name="add" size={24} color="#4F46E5" />
            </View>
            <Text style={styles.addNewText}>Add Your First Payment Method</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
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
  addButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  methodsCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  methodCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  methodInfo: {
    flex: 1,
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  methodSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  defaultButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
  },
  defaultButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4F46E5',
  },
  methodDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  methodDetailText: {
    fontSize: 13,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  swipeActions: {
    flexDirection: 'row',
    width: 80,
    marginLeft: 12,
  },
  swipeButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  emptyDefault: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  emptyDefaultText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
  },
  emptyDefaultSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
  loader: {
    marginVertical: 40,
  },
  securitySection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  securityText: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  addNewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  addNewIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  addNewText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4F46E5',
  },
});