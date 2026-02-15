// screens/rider/PackageDetailsScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
  Image,
  Alert,
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

export default function PackageDetailsScreen({ navigation, route }) {
  const { packageId, packageData } = route.params || {};
  
  const [packageDetails, setPackageDetails] = useState(packageData || {
    id: packageId || `PKG${Math.floor(Math.random() * 10000)}`,
    status: 'pending',
    sender: {
      name: 'John Doe',
      phone: '+265 888 123 456',
      address: 'Area 3, Lilongwe',
    },
    recipient: {
      name: 'Jane Smith',
      phone: '+265 999 789 012',
      address: 'Area 18, Lilongwe',
    },
    package: {
      type: 'parcel',
      weight: '1-2 kg',
      description: 'Birthday gift',
      fragile: true,
      value: 'MK 15,000',
    },
    tracking: {
      estimatedPickup: '2026-02-15 14:30',
      estimatedDelivery: '2026-02-15 15:15',
      currentStatus: 'Pending',
    },
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editedDetails, setEditedDetails] = useState(packageDetails);

  const packageTypes = [
    { id: 'document', label: 'Document', icon: 'description' },
    { id: 'parcel', label: 'Parcel', icon: 'inventory' },
    { id: 'food', label: 'Food', icon: 'restaurant' },
    { id: 'grocery', label: 'Groceries', icon: 'shopping-cart' },
    { id: 'medicine', label: 'Medicine', icon: 'local-pharmacy' },
    { id: 'electronics', label: 'Electronics', icon: 'devices' },
    { id: 'clothing', label: 'Clothing', icon: 'checkroom' },
    { id: 'other', label: 'Other', icon: 'help' },
  ];

  const getStatusColor = (status) => {
    switch(status) {
      case 'pending': return '#ff9800';
      case 'picked_up': return '#2196f3';
      case 'in_transit': return '#00a82d';
      case 'delivered': return '#4caf50';
      case 'cancelled': return '#f44336';
      default: return '#666';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'pending': return 'schedule';
      case 'picked_up': return 'motorcycle';
      case 'in_transit': return 'local-shipping';
      case 'delivered': return 'check-circle';
      case 'cancelled': return 'cancel';
      default: return 'info';
    }
  };

  const handleSave = () => {
    setPackageDetails(editedDetails);
    setIsEditing(false);
    Alert.alert('Success', 'Package details updated');
  };

  const handleCancel = () => {
    setEditedDetails(packageDetails);
    setIsEditing(false);
  };

  const handleTrackPackage = () => {
    navigation.navigate('PackageTracking', {
      packageId: packageDetails.id,
      packageData: packageDetails,
    });
  };

  const renderViewMode = () => (
    <>
      {/* Status Banner */}
      <View style={[styles.statusBanner, { backgroundColor: getStatusColor(packageDetails.status) + '20' }]}>
        <MaterialIcon name={getStatusIcon(packageDetails.status)} size={32} color={getStatusColor(packageDetails.status)} />
        <View style={styles.statusInfo}>
          <Text style={styles.statusLabel}>Current Status</Text>
          <Text style={[styles.statusValue, { color: getStatusColor(packageDetails.status) }]}>
            {packageDetails.status.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
        <TouchableOpacity style={styles.trackButton} onPress={handleTrackPackage}>
          <Text style={styles.trackButtonText}>Track</Text>
          <MaterialIcon name="chevron-right" size={20} color="#00a82d" />
        </TouchableOpacity>
      </View>

      {/* Package ID */}
      <View style={styles.idContainer}>
        <Text style={styles.idLabel}>Package ID</Text>
        <Text style={styles.idValue}>{packageDetails.id}</Text>
        <TouchableOpacity>
          <MaterialIcon name="content-copy" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Sender Info */}
      <View style={styles.infoCard}>
        <View style={styles.cardHeader}>
          <MaterialIcon name="person" size={20} color="#00a82d" />
          <Text style={styles.cardTitle}>Sender</Text>
        </View>
        <Text style={styles.infoName}>{packageDetails.sender.name}</Text>
        <Text style={styles.infoPhone}>{packageDetails.sender.phone}</Text>
        <Text style={styles.infoAddress}>{packageDetails.sender.address}</Text>
      </View>

      {/* Recipient Info */}
      <View style={styles.infoCard}>
        <View style={styles.cardHeader}>
          <MaterialIcon name="person" size={20} color="#ff9800" />
          <Text style={styles.cardTitle}>Recipient</Text>
        </View>
        <Text style={styles.infoName}>{packageDetails.recipient.name}</Text>
        <Text style={styles.infoPhone}>{packageDetails.recipient.phone}</Text>
        <Text style={styles.infoAddress}>{packageDetails.recipient.address}</Text>
      </View>

      {/* Package Info */}
      <View style={styles.infoCard}>
        <View style={styles.cardHeader}>
          <MaterialIcon name="inventory" size={20} color="#2196f3" />
          <Text style={styles.cardTitle}>Package Details</Text>
        </View>
        
        <View style={styles.packageTypeBadge}>
          <MaterialIcon name={packageTypes.find(t => t.id === packageDetails.package.type)?.icon || 'inventory'} size={16} color="#fff" />
          <Text style={styles.packageTypeText}>{packageDetails.package.type}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Weight:</Text>
          <Text style={styles.detailValue}>{packageDetails.package.weight}</Text>
        </View>

        {packageDetails.package.description && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Description:</Text>
            <Text style={styles.detailValue}>{packageDetails.package.description}</Text>
          </View>
        )}

        {packageDetails.package.fragile && (
          <View style={styles.warningTag}>
            <MaterialIcon name="warning" size={14} color="#ff9800" />
            <Text style={styles.warningText}>Fragile</Text>
          </View>
        )}

        {packageDetails.package.value && (
          <View style={styles.valueTag}>
            <MaterialIcon name="attach-money" size={14} color="#00a82d" />
            <Text style={styles.valueText}>Declared value: {packageDetails.package.value}</Text>
          </View>
        )}
      </View>

      {/* Timeline */}
      <View style={styles.timelineCard}>
        <Text style={styles.timelineTitle}>Estimated Timeline</Text>
        
        <View style={styles.timelineItem}>
          <View style={[styles.timelineDot, { backgroundColor: '#00a82d' }]} />
          <View style={styles.timelineContent}>
            <Text style={styles.timelineLabel}>Pickup</Text>
            <Text style={styles.timelineTime}>{packageDetails.tracking.estimatedPickup}</Text>
          </View>
        </View>

        <View style={styles.timelineLine} />

        <View style={styles.timelineItem}>
          <View style={[styles.timelineDot, { backgroundColor: '#ff9800' }]} />
          <View style={styles.timelineContent}>
            <Text style={styles.timelineLabel}>Delivery</Text>
            <Text style={styles.timelineTime}>{packageDetails.tracking.estimatedDelivery}</Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.editButton} onPress={() => setIsEditing(true)}>
          <MaterialIcon name="edit" size={20} color="#fff" />
          <Text style={styles.editButtonText}>Edit Details</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.supportButton}>
          <MaterialIcon name="support-agent" size={20} color="#666" />
          <Text style={styles.supportButtonText}>Get Support</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.cancelButton}>
        <Text style={styles.cancelButtonText}>Cancel Delivery</Text>
      </TouchableOpacity>
    </>
  );

  const renderEditMode = () => (
    <>
      <Text style={styles.editTitle}>Edit Package Details</Text>

      {/* Sender Info Edit */}
      <View style={styles.editSection}>
        <Text style={styles.editSectionTitle}>Sender Information</Text>
        
        <View style={styles.inputContainer}>
          <MaterialIcon name="person" size={20} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Sender name"
            value={editedDetails.sender.name}
            onChangeText={(text) => setEditedDetails({
              ...editedDetails,
              sender: { ...editedDetails.sender, name: text }
            })}
          />
        </View>

        <View style={styles.inputContainer}>
          <MaterialIcon name="phone" size={20} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Sender phone"
            keyboardType="phone-pad"
            value={editedDetails.sender.phone}
            onChangeText={(text) => setEditedDetails({
              ...editedDetails,
              sender: { ...editedDetails.sender, phone: text }
            })}
          />
        </View>

        <View style={styles.inputContainer}>
          <MaterialIcon name="location-on" size={20} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Sender address"
            value={editedDetails.sender.address}
            onChangeText={(text) => setEditedDetails({
              ...editedDetails,
              sender: { ...editedDetails.sender, address: text }
            })}
          />
        </View>
      </View>

      {/* Recipient Info Edit */}
      <View style={styles.editSection}>
        <Text style={styles.editSectionTitle}>Recipient Information</Text>
        
        <View style={styles.inputContainer}>
          <MaterialIcon name="person" size={20} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Recipient name"
            value={editedDetails.recipient.name}
            onChangeText={(text) => setEditedDetails({
              ...editedDetails,
              recipient: { ...editedDetails.recipient, name: text }
            })}
          />
        </View>

        <View style={styles.inputContainer}>
          <MaterialIcon name="phone" size={20} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Recipient phone"
            keyboardType="phone-pad"
            value={editedDetails.recipient.phone}
            onChangeText={(text) => setEditedDetails({
              ...editedDetails,
              recipient: { ...editedDetails.recipient, phone: text }
            })}
          />
        </View>

        <View style={styles.inputContainer}>
          <MaterialIcon name="location-on" size={20} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Recipient address"
            value={editedDetails.recipient.address}
            onChangeText={(text) => setEditedDetails({
              ...editedDetails,
              recipient: { ...editedDetails.recipient, address: text }
            })}
          />
        </View>
      </View>

      {/* Package Info Edit */}
      <View style={styles.editSection}>
        <Text style={styles.editSectionTitle}>Package Information</Text>

        <Text style={styles.pickerLabel}>Package Type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typePicker}>
          {packageTypes.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.typeChip,
                editedDetails.package.type === type.id && styles.typeChipSelected
              ]}
              onPress={() => setEditedDetails({
                ...editedDetails,
                package: { ...editedDetails.package, type: type.id }
              })}
            >
              <MaterialIcon 
                name={type.icon} 
                size={20} 
                color={editedDetails.package.type === type.id ? '#fff' : '#666'} 
              />
              <Text style={[
                styles.typeChipText,
                editedDetails.package.type === type.id && styles.typeChipTextSelected
              ]}>
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.inputContainer}>
          <MaterialIcon name="fitness-center" size={20} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Weight (e.g., 1-2 kg)"
            value={editedDetails.package.weight}
            onChangeText={(text) => setEditedDetails({
              ...editedDetails,
              package: { ...editedDetails.package, weight: text }
            })}
          />
        </View>

        <View style={styles.inputContainer}>
          <MaterialIcon name="description" size={20} color="#666" style={styles.inputIcon} />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Description"
            multiline
            numberOfLines={3}
            value={editedDetails.package.description}
            onChangeText={(text) => setEditedDetails({
              ...editedDetails,
              package: { ...editedDetails.package, description: text }
            })}
          />
        </View>

        <View style={styles.checkboxRow}>
          <TouchableOpacity
            style={[styles.checkbox, editedDetails.package.fragile && styles.checkboxChecked]}
            onPress={() => setEditedDetails({
              ...editedDetails,
              package: { ...editedDetails.package, fragile: !editedDetails.package.fragile }
            })}
          >
            {editedDetails.package.fragile && <MaterialIcon name="check" size={16} color="#fff" />}
          </TouchableOpacity>
          <Text style={styles.checkboxLabel}>Fragile item</Text>
        </View>

        <View style={styles.inputContainer}>
          <MaterialIcon name="attach-money" size={20} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Declared value (e.g., MK 15,000)"
            value={editedDetails.package.value}
            onChangeText={(text) => setEditedDetails({
              ...editedDetails,
              package: { ...editedDetails.package, value: text }
            })}
          />
        </View>
      </View>

      {/* Edit Actions */}
      <View style={styles.editActions}>
        <TouchableOpacity style={styles.cancelEditButton} onPress={handleCancel}>
          <Text style={styles.cancelEditText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Changes</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Package Details</Text>
        <TouchableOpacity onPress={() => navigation.navigate('PackageTracking', { packageId: packageDetails.id })}>
          <MaterialIcon name="location-on" size={24} color="#00a82d" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {isEditing ? renderEditMode() : renderViewMode()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  content: {
    padding: 20,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  statusInfo: {
    flex: 1,
    marginLeft: 12,
  },
  statusLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  trackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#00a82d',
  },
  trackButtonText: {
    fontSize: 14,
    color: '#00a82d',
    fontWeight: '600',
    marginRight: 4,
  },
  idContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  idLabel: {
    fontSize: 12,
    color: '#666',
    marginRight: 8,
  },
  idValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  infoCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginLeft: 8,
  },
  infoName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  infoPhone: {
    fontSize: 14,
    color: '#00a82d',
    marginBottom: 2,
  },
  infoAddress: {
    fontSize: 14,
    color: '#666',
  },
  packageTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00a82d',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
  },
  packageTypeText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    marginLeft: 4,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    width: 80,
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    color: '#000',
  },
  warningTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3e0',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  warningText: {
    fontSize: 12,
    color: '#ff9800',
    marginLeft: 4,
  },
  valueTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  valueText: {
    fontSize: 12,
    color: '#00a82d',
    marginLeft: 4,
  },
  timelineCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginVertical: 12,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  timelineContent: {
    flex: 1,
  },
  timelineLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  timelineTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  timelineLine: {
    width: 2,
    height: 20,
    backgroundColor: '#e0e0e0',
    marginLeft: 5,
    marginVertical: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00a82d',
    paddingVertical: 14,
    borderRadius: 12,
    marginRight: 8,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  supportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginLeft: 8,
  },
  supportButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginLeft: 8,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 8,
    marginBottom: 20,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#f44336',
    fontWeight: '600',
  },
  editTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 20,
  },
  editSection: {
    marginBottom: 24,
  },
  editSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#000',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pickerLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  typePicker: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  typeChipSelected: {
    backgroundColor: '#00a82d',
    borderColor: '#00a82d',
  },
  typeChipText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  typeChipTextSelected: {
    color: '#fff',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: '#00a82d',
    borderColor: '#00a82d',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#000',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 30,
  },
  cancelEditButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginRight: 8,
  },
  cancelEditText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#00a82d',
    paddingVertical: 14,
    borderRadius: 12,
    marginLeft: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});