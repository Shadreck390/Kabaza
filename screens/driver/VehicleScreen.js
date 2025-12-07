// screens/driver/VehicleScreen.js
import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Image, Alert, RefreshControl, ActivityIndicator, Modal 
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function VehicleScreen({ navigation }) {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState(null);

  // Load vehicles from storage
  const loadVehicles = async () => {
    try {
      const savedVehicles = await AsyncStorage.getItem('driver_vehicles');
      if (savedVehicles) {
        setVehicles(JSON.parse(savedVehicles));
      } else {
        // Default vehicles if none exist
        const defaultVehicles = [
          {
            id: '1',
            type: 'motorcycle',
            make: 'TVS',
            model: 'Apache RTR 160',
            year: '2022',
            color: 'Red',
            plate: 'LL 1234',
            engineNumber: 'TVS2022XYZ123',
            chassisNumber: 'CHS2022XYZ456',
            insuranceExpiry: '31/12/2024',
            roadTaxExpiry: '31/12/2024',
            status: 'approved', // pending, approved, rejected
            statusMessage: 'Vehicle approved and ready for rides',
            images: {
              front: null,
              back: null,
              side: null,
              registration: null,
            },
            addedDate: '2024-01-15',
            verificationDate: '2024-01-16'
          }
        ];
        setVehicles(defaultVehicles);
        await AsyncStorage.setItem('driver_vehicles', JSON.stringify(defaultVehicles));
      }
    } catch (error) {
      console.error('Error loading vehicles:', error);
      Alert.alert('Error', 'Failed to load vehicles');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadVehicles();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadVehicles();
  };

  const handleAddVehicle = () => {
    navigation.navigate('AddVehicle', { onSave: handleVehicleSaved });
  };

  const handleVehicleSaved = (newVehicle) => {
    const updatedVehicles = [...vehicles, newVehicle];
    setVehicles(updatedVehicles);
    saveVehicles(updatedVehicles);
  };

  const handleEditVehicle = (vehicle) => {
    navigation.navigate('AddVehicle', { 
      vehicle, 
      onSave: (updatedVehicle) => handleVehicleUpdated(updatedVehicle, vehicle.id) 
    });
  };

  const handleVehicleUpdated = (updatedVehicle, oldId) => {
    const updatedVehicles = vehicles.map(vehicle => 
      vehicle.id === oldId ? { ...updatedVehicle, id: oldId } : vehicle
    );
    setVehicles(updatedVehicles);
    saveVehicles(updatedVehicles);
  };

  const handleDeleteVehicle = (vehicle) => {
    setVehicleToDelete(vehicle);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!vehicleToDelete) return;

    const updatedVehicles = vehicles.filter(v => v.id !== vehicleToDelete.id);
    setVehicles(updatedVehicles);
    
    try {
      await AsyncStorage.setItem('driver_vehicles', JSON.stringify(updatedVehicles));
      Alert.alert('Success', 'Vehicle deleted successfully');
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      Alert.alert('Error', 'Failed to delete vehicle');
    }
    
    setDeleteModalVisible(false);
    setVehicleToDelete(null);
  };

  const saveVehicles = async (vehiclesList) => {
    try {
      await AsyncStorage.setItem('driver_vehicles', JSON.stringify(vehiclesList));
    } catch (error) {
      console.error('Error saving vehicles:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return '#4CAF50';
      case 'pending': return '#FFA726';
      case 'rejected': return '#FF6B6B';
      default: return '#666';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return 'check-circle';
      case 'pending': return 'clock-o';
      case 'rejected': return 'times-circle';
      default: return 'question-circle';
    }
  };

  const getVehicleIcon = (type) => {
    switch (type) {
      case 'motorcycle': return 'motorcycle';
      case 'car': return 'car';
      case 'minibus': return 'bus';
      case 'bicycle': return 'bicycle';
      default: return 'car';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const renderVehicleCard = (vehicle) => (
    <View key={vehicle.id} style={styles.vehicleCard}>
      {/* Vehicle Header */}
      <View style={styles.vehicleHeader}>
        <View style={styles.vehicleInfo}>
          <Icon name={getVehicleIcon(vehicle.type)} size={24} color="#00B894" />
          <View style={styles.vehicleTitle}>
            <Text style={styles.vehicleMakeModel}>{vehicle.make} {vehicle.model}</Text>
            <Text style={styles.vehicleYearColor}>{vehicle.year} • {vehicle.color}</Text>
          </View>
        </View>
        <View style={styles.vehicleActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleEditVehicle(vehicle)}
          >
            <Icon name="edit" size={16} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleDeleteVehicle(vehicle)}
          >
            <Icon name="trash" size={16} color="#FF6B6B" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Vehicle Details */}
      <View style={styles.vehicleDetails}>
        <View style={styles.detailRow}>
          <Icon name="hashtag" size={14} color="#666" />
          <Text style={styles.detailLabel}>Plate:</Text>
          <Text style={styles.detailValue}>{vehicle.plate}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Icon name="calendar" size={14} color="#666" />
          <Text style={styles.detailLabel}>Added:</Text>
          <Text style={styles.detailValue}>{formatDate(vehicle.addedDate)}</Text>
        </View>

        <View style={styles.detailRow}>
          <Icon name="file-text" size={14} color="#666" />
          <Text style={styles.detailLabel}>Insurance:</Text>
          <Text style={styles.detailValue}>{vehicle.insuranceExpiry || 'N/A'}</Text>
        </View>

        <View style={styles.detailRow}>
          <Icon name="road" size={14} color="#666" />
          <Text style={styles.detailLabel}>Tax:</Text>
          <Text style={styles.detailValue}>{vehicle.roadTaxExpiry || 'N/A'}</Text>
        </View>
      </View>

      {/* Status Bar */}
      <View style={styles.statusContainer}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(vehicle.status) + '20' }]}>
          <Icon 
            name={getStatusIcon(vehicle.status)} 
            size={14} 
            color={getStatusColor(vehicle.status)} 
          />
          <Text style={[styles.statusText, { color: getStatusColor(vehicle.status) }]}>
            {vehicle.status.charAt(0).toUpperCase() + vehicle.status.slice(1)}
          </Text>
        </View>
        {vehicle.statusMessage && (
          <Text style={styles.statusMessage}>{vehicle.statusMessage}</Text>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.viewButton} onPress={() => setSelectedVehicle(vehicle)}>
          <Icon name="eye" size={14} color="#00B894" />
          <Text style={styles.viewButtonText}>View Details</Text>
        </TouchableOpacity>
        
        {vehicle.status === 'approved' && (
          <TouchableOpacity style={styles.setPrimaryButton}>
            <Icon name="star" size={14} color="#FFD700" />
            <Text style={styles.setPrimaryText}>Set as Primary</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00B894" />
        <Text style={styles.loadingText}>Loading vehicles...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={20} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Vehicles</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddVehicle}>
          <Icon name="plus" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Stats Summary */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{vehicles.length}</Text>
          <Text style={styles.statLabel}>Total Vehicles</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {vehicles.filter(v => v.status === 'approved').length}
          </Text>
          <Text style={styles.statLabel}>Approved</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {vehicles.filter(v => v.status === 'pending').length}
          </Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
      </View>

      {/* Vehicle List */}
      <ScrollView
        style={styles.vehicleList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#00B894']}
          />
        }
      >
        {vehicles.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="car" size={60} color="#ccc" />
            <Text style={styles.emptyTitle}>No Vehicles Added</Text>
            <Text style={styles.emptyText}>
              Add your first vehicle to start accepting rides
            </Text>
            <TouchableOpacity style={styles.addFirstButton} onPress={handleAddVehicle}>
              <Icon name="plus" size={18} color="#fff" />
              <Text style={styles.addFirstText}>Add First Vehicle</Text>
            </TouchableOpacity>
          </View>
        ) : (
          vehicles.map(renderVehicleCard)
        )}
      </ScrollView>

      {/* Add Vehicle Button */}
      {vehicles.length > 0 && (
        <TouchableOpacity style={styles.floatingAddButton} onPress={handleAddVehicle}>
          <Icon name="plus" size={24} color="#fff" />
          <Text style={styles.floatingAddText}>Add Vehicle</Text>
        </TouchableOpacity>
      )}

      {/* Vehicle Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={!!selectedVehicle}
        onRequestClose={() => setSelectedVehicle(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {selectedVehicle && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Vehicle Details</Text>
                  <TouchableOpacity onPress={() => setSelectedVehicle(null)}>
                    <Icon name="times" size={20} color="#666" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody}>
                  {/* Vehicle Images */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
                    {Object.entries(selectedVehicle.images || {}).map(([key, image]) => (
                      image ? (
                        <Image
                          key={key}
                          source={{ uri: image.uri }}
                          style={styles.vehicleImage}
                        />
                      ) : (
                        <View key={key} style={styles.imagePlaceholder}>
                          <Icon name="image" size={30} color="#ccc" />
                          <Text style={styles.imagePlaceholderText}>
                            {key.charAt(0).toUpperCase() + key.slice(1)} Photo
                          </Text>
                        </View>
                      )
                    ))}
                  </ScrollView>

                  {/* Basic Info */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Basic Information</Text>
                    <View style={styles.modalDetails}>
                      <View style={styles.modalDetailRow}>
                        <Text style={styles.modalDetailLabel}>Type:</Text>
                        <Text style={styles.modalDetailValue}>
                          {selectedVehicle.type === 'motorcycle' ? 'Motorcycle (Kabaza)' : 
                           selectedVehicle.type === 'car' ? 'Car' : 
                           selectedVehicle.type === 'minibus' ? 'Minibus' : 'Bicycle'}
                        </Text>
                      </View>
                      <View style={styles.modalDetailRow}>
                        <Text style={styles.modalDetailLabel}>Make & Model:</Text>
                        <Text style={styles.modalDetailValue}>
                          {selectedVehicle.make} {selectedVehicle.model}
                        </Text>
                      </View>
                      <View style={styles.modalDetailRow}>
                        <Text style={styles.modalDetailLabel}>Year & Color:</Text>
                        <Text style={styles.modalDetailValue}>
                          {selectedVehicle.year} • {selectedVehicle.color}
                        </Text>
                      </View>
                      <View style={styles.modalDetailRow}>
                        <Text style={styles.modalDetailLabel}>Plate Number:</Text>
                        <Text style={styles.modalDetailValue}>{selectedVehicle.plate}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Identification */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Identification</Text>
                    <View style={styles.modalDetails}>
                      <View style={styles.modalDetailRow}>
                        <Text style={styles.modalDetailLabel}>Engine No:</Text>
                        <Text style={styles.modalDetailValue}>
                          {selectedVehicle.engineNumber || 'N/A'}
                        </Text>
                      </View>
                      <View style={styles.modalDetailRow}>
                        <Text style={styles.modalDetailLabel}>Chassis No:</Text>
                        <Text style={styles.modalDetailValue}>
                          {selectedVehicle.chassisNumber || 'N/A'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Documents */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Documents</Text>
                    <View style={styles.modalDetails}>
                      <View style={styles.modalDetailRow}>
                        <Text style={styles.modalDetailLabel}>Insurance Expiry:</Text>
                        <Text style={[
                          styles.modalDetailValue,
                          !selectedVehicle.insuranceExpiry && { color: '#FF6B6B' }
                        ]}>
                          {selectedVehicle.insuranceExpiry || 'Not Provided'}
                        </Text>
                      </View>
                      <View style={styles.modalDetailRow}>
                        <Text style={styles.modalDetailLabel}>Road Tax Expiry:</Text>
                        <Text style={[
                          styles.modalDetailValue,
                          !selectedVehicle.roadTaxExpiry && { color: '#FF6B6B' }
                        ]}>
                          {selectedVehicle.roadTaxExpiry || 'Not Provided'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Status */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Verification Status</Text>
                    <View style={[styles.statusBadge, { 
                      backgroundColor: getStatusColor(selectedVehicle.status) + '20',
                      alignSelf: 'flex-start',
                      marginBottom: 10,
                    }]}>
                      <Icon 
                        name={getStatusIcon(selectedVehicle.status)} 
                        size={16} 
                        color={getStatusColor(selectedVehicle.status)} 
                      />
                      <Text style={[styles.statusText, { 
                        color: getStatusColor(selectedVehicle.status),
                        fontSize: 14,
                      }]}>
                        {selectedVehicle.status.charAt(0).toUpperCase() + selectedVehicle.status.slice(1)}
                      </Text>
                    </View>
                    <Text style={styles.statusDescription}>
                      {selectedVehicle.statusMessage || 'No status message available'}
                    </Text>
                    {selectedVehicle.verificationDate && (
                      <Text style={styles.verificationDate}>
                        Verified on: {formatDate(selectedVehicle.verificationDate)}
                      </Text>
                    )}
                  </View>
                </ScrollView>

                <View style={styles.modalFooter}>
                  <TouchableOpacity 
                    style={styles.modalEditButton}
                    onPress={() => {
                      setSelectedVehicle(null);
                      handleEditVehicle(selectedVehicle);
                    }}
                  >
                    <Icon name="edit" size={18} color="#fff" />
                    <Text style={styles.modalEditText}>Edit Vehicle</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={deleteModalVisible}
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.confirmModalContainer}>
          <View style={styles.confirmModalContent}>
            <Icon name="exclamation-triangle" size={50} color="#FF6B6B" />
            <Text style={styles.confirmModalTitle}>Delete Vehicle</Text>
            <Text style={styles.confirmModalText}>
              Are you sure you want to delete {vehicleToDelete?.make} {vehicleToDelete?.model}?
              This action cannot be undone.
            </Text>
            <View style={styles.confirmModalButtons}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.deleteConfirmButton}
                onPress={confirmDelete}
              >
                <Text style={styles.deleteConfirmText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#fff' 
  },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  addButton: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: '#00B894',
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  statsContainer: { 
    flexDirection: 'row', 
    backgroundColor: '#fff', 
    marginTop: 10,
    paddingVertical: 20,
    paddingHorizontal: 15,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 24, fontWeight: 'bold', color: '#00B894', marginBottom: 5 },
  statLabel: { fontSize: 12, color: '#666' },
  vehicleList: { flex: 1, paddingHorizontal: 15, paddingTop: 15 },
  emptyState: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 40,
    marginTop: 50,
  },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#666', marginTop: 20, marginBottom: 10 },
  emptyText: { fontSize: 14, color: '#999', textAlign: 'center', marginBottom: 30, lineHeight: 20 },
  addFirstButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#00B894', 
    paddingHorizontal: 25, 
    paddingVertical: 12,
    borderRadius: 8,
    gap: 10,
  },
  addFirstText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  vehicleCard: { 
    backgroundColor: '#fff', 
    marginBottom: 15, 
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  vehicleHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  vehicleInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  vehicleTitle: { marginLeft: 15, flex: 1 },
  vehicleMakeModel: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 2 },
  vehicleYearColor: { fontSize: 14, color: '#666' },
  vehicleActions: { flexDirection: 'row', gap: 10 },
  actionButton: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    backgroundColor: '#f5f5f5',
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  vehicleDetails: { marginBottom: 15 },
  detailRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 8,
    gap: 8,
  },
  detailLabel: { fontSize: 13, color: '#666', width: 70 },
  detailValue: { fontSize: 13, color: '#333', fontWeight: '500', flex: 1 },
  statusContainer: { marginBottom: 15 },
  statusBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    alignSelf: 'flex-start',
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 15,
    gap: 6,
  },
  statusText: { fontSize: 12, fontWeight: '600' },
  statusMessage: { fontSize: 12, color: '#666', marginTop: 5, lineHeight: 16 },
  quickActions: { 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 15,
  },
  viewButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6,
  },
  viewButtonText: { fontSize: 14, color: '#00B894', fontWeight: '500' },
  setPrimaryButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6,
  },
  setPrimaryText: { fontSize: 14, color: '#FFD700', fontWeight: '500' },
  floatingAddButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00B894',
    paddingHorizontal: 25,
    paddingVertical: 15,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
    gap: 10,
  },
  floatingAddText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  // Modal Styles
  modalContainer: { 
    flex: 1, 
    justifyContent: 'flex-end', 
    backgroundColor: 'rgba(0,0,0,0.5)' 
  },
  modalContent: { 
    backgroundColor: '#fff', 
    borderTopLeftRadius: 20, 
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  modalBody: { padding: 20 },
  imageScroll: { marginBottom: 20 },
  vehicleImage: { width: 200, height: 150, borderRadius: 10, marginRight: 10 },
  imagePlaceholder: { 
    width: 200, 
    height: 150, 
    borderRadius: 10, 
    backgroundColor: '#f5f5f5',
    justifyContent: 'center', 
    alignItems: 'center',
    marginRight: 10,
  },
  imagePlaceholderText: { fontSize: 12, color: '#999', marginTop: 8 },
  modalSection: { marginBottom: 25 },
  modalSectionTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 15 },
  modalDetails: { backgroundColor: '#f8f9fa', padding: 15, borderRadius: 10 },
  modalDetailRow: { 
    flexDirection: 'row', 
    marginBottom: 12,
  },
  modalDetailLabel: { fontSize: 14, color: '#666', width: 120 },
  modalDetailValue: { fontSize: 14, color: '#333', fontWeight: '500', flex: 1 },
  statusDescription: { fontSize: 14, color: '#666', lineHeight: 20, marginBottom: 10 },
  verificationDate: { fontSize: 12, color: '#999', fontStyle: 'italic' },
  modalFooter: { 
    padding: 20, 
    borderTopWidth: 1, 
    borderTopColor: '#eee',
  },
  modalEditButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: '#00B894', 
    padding: 15, 
    borderRadius: 10,
    gap: 10,
  },
  modalEditText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  // Delete Modal Styles
  confirmModalContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'rgba(0,0,0,0.5)' 
  },
  confirmModalContent: { 
    backgroundColor: '#fff', 
    padding: 25, 
    borderRadius: 15, 
    width: '85%',
    alignItems: 'center',
  },
  confirmModalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginTop: 15, marginBottom: 10 },
  confirmModalText: { fontSize: 15, color: '#666', textAlign: 'center', lineHeight: 22, marginBottom: 25 },
  confirmModalButtons: { flexDirection: 'row', gap: 15, width: '100%' },
  cancelButton: { 
    flex: 1, 
    padding: 15, 
    borderRadius: 10, 
    borderWidth: 1, 
    borderColor: '#ddd',
    alignItems: 'center',
  },
  cancelButtonText: { fontSize: 16, color: '#666', fontWeight: '600' },
  deleteConfirmButton: { 
    flex: 1, 
    padding: 15, 
    borderRadius: 10, 
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
  },
  deleteConfirmText: { fontSize: 16, color: '#fff', fontWeight: 'bold' },
});