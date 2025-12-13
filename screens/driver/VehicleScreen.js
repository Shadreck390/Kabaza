// screens/driver/VehicleScreen.js
import React, { useState, useEffect, useContext } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Image, Alert, RefreshControl, ActivityIndicator, Modal 
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../../context/AuthContext';

// API Service functions (create these in a separate file and import)
const API_BASE_URL = 'https://your-api-domain.com/api';

const vehicleAPI = {
  getVehicles: async (token) => {
    try {
      const response = await fetch(`${API_BASE_URL}/driver/vehicles`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch vehicles');
      }
      
      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  addVehicle: async (vehicleData, token) => {
    try {
      const response = await fetch(`${API_BASE_URL}/driver/vehicles`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(vehicleData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to add vehicle');
      }
      
      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  updateVehicle: async (vehicleId, vehicleData, token) => {
    try {
      const response = await fetch(`${API_BASE_URL}/driver/vehicles/${vehicleId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(vehicleData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update vehicle');
      }
      
      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  deleteVehicle: async (vehicleId, token) => {
    try {
      const response = await fetch(`${API_BASE_URL}/driver/vehicles/${vehicleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete vehicle');
      }
      
      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  uploadVehicleImage: async (image, vehicleId, imageType, token) => {
    try {
      const formData = new FormData();
      formData.append('image', {
        uri: image.uri,
        type: image.type || 'image/jpeg',
        name: image.fileName || `vehicle_${vehicleId}_${imageType}.jpg`,
      });
      formData.append('imageType', imageType);
      
      const response = await fetch(`${API_BASE_URL}/driver/vehicles/${vehicleId}/upload-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload image');
      }
      
      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  setPrimaryVehicle: async (vehicleId, token) => {
    try {
      const response = await fetch(`${API_BASE_URL}/driver/vehicles/${vehicleId}/set-primary`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to set primary vehicle');
      }
      
      return await response.json();
    } catch (error) {
      throw error;
    }
  },
};

export default function VehicleScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState(null);
  const [primaryVehicleId, setPrimaryVehicleId] = useState(null);
  const [isSettingPrimary, setIsSettingPrimary] = useState(false);

  // Load vehicles from API
  const loadVehicles = async () => {
    try {
      const data = await vehicleAPI.getVehicles(userToken);
      setVehicles(data.vehicles || []);
      setPrimaryVehicleId(data.primaryVehicleId || null);
      
      // Cache vehicles locally for offline access
      await AsyncStorage.setItem('driver_vehicles_cache', JSON.stringify({
        vehicles: data.vehicles || [],
        primaryVehicleId: data.primaryVehicleId || null,
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.error('Error loading vehicles:', error);
      
      // Try to load from cache
      try {
        const cachedData = await AsyncStorage.getItem('driver_vehicles_cache');
        if (cachedData) {
          const { vehicles: cachedVehicles, primaryVehicleId: cachedPrimaryId } = JSON.parse(cachedData);
          setVehicles(cachedVehicles || []);
          setPrimaryVehicleId(cachedPrimaryId || null);
          Alert.alert('Info', 'Showing cached data. Check your internet connection.');
        } else {
          Alert.alert('Error', 'Failed to load vehicles. Please check your internet connection.');
        }
      } catch (cacheError) {
        console.error('Cache error:', cacheError);
        Alert.alert('Error', 'Failed to load vehicles');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadVehicles();
    
    // Set up real-time updates (using WebSocket or polling)
    const updateInterval = setInterval(() => {
      // Poll for updates every 30 seconds
      loadVehicles();
    }, 30000);
    
    // Listen for vehicle updates from other screens
    const unsubscribe = navigation.addListener('focus', () => {
      loadVehicles();
    });
    
    return () => {
      clearInterval(updateInterval);
      unsubscribe();
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadVehicles();
  };

  const handleAddVehicle = () => {
    navigation.navigate('AddVehicle', { 
      onSave: handleVehicleSaved,
      token: userToken,
    });
  };

  const handleVehicleSaved = async (newVehicle) => {
    try {
      // Add vehicle to API
      const response = await vehicleAPI.addVehicle(newVehicle, userToken);
      
      // Update local state
      setVehicles(prev => [...prev, response.vehicle]);
      
      Alert.alert('Success', 'Vehicle added successfully! It will be reviewed by our team.');
    } catch (error) {
      console.error('Error adding vehicle:', error);
      Alert.alert('Error', 'Failed to add vehicle. Please try again.');
    }
  };

  const handleEditVehicle = (vehicle) => {
    navigation.navigate('AddVehicle', { 
      vehicle, 
      onSave: (updatedVehicle) => handleVehicleUpdated(updatedVehicle, vehicle.id),
      token: userToken,
    });
  };

  const handleVehicleUpdated = async (updatedVehicle, vehicleId) => {
    try {
      // Update vehicle in API
      const response = await vehicleAPI.updateVehicle(vehicleId, updatedVehicle, userToken);
      
      // Update local state
      setVehicles(prev => prev.map(vehicle => 
        vehicle.id === vehicleId ? { ...response.vehicle } : vehicle
      ));
      
      Alert.alert('Success', 'Vehicle updated successfully!');
    } catch (error) {
      console.error('Error updating vehicle:', error);
      Alert.alert('Error', 'Failed to update vehicle. Please try again.');
    }
  };

  const handleDeleteVehicle = (vehicle) => {
    setVehicleToDelete(vehicle);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!vehicleToDelete) return;

    try {
      // Delete from API
      await vehicleAPI.deleteVehicle(vehicleToDelete.id, userToken);
      
      // Update local state
      const updatedVehicles = vehicles.filter(v => v.id !== vehicleToDelete.id);
      setVehicles(updatedVehicles);
      
      // Update primary vehicle if deleted vehicle was primary
      if (primaryVehicleId === vehicleToDelete.id) {
        setPrimaryVehicleId(null);
      }
      
      Alert.alert('Success', 'Vehicle deleted successfully');
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      Alert.alert('Error', 'Failed to delete vehicle. Please try again.');
    }
    
    setDeleteModalVisible(false);
    setVehicleToDelete(null);
  };

  const handleSetPrimary = async (vehicleId) => {
    if (primaryVehicleId === vehicleId) return;
    
    setIsSettingPrimary(true);
    try {
      // Set as primary in API
      await vehicleAPI.setPrimaryVehicle(vehicleId, userToken);
      
      // Update local state
      setPrimaryVehicleId(vehicleId);
      
      Alert.alert('Success', 'Vehicle set as primary');
    } catch (error) {
      console.error('Error setting primary vehicle:', error);
      Alert.alert('Error', 'Failed to set primary vehicle. Please try again.');
    } finally {
      setIsSettingPrimary(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return '#4CAF50';
      case 'pending': return '#FFA726';
      case 'rejected': return '#FF6B6B';
      case 'under_review': return '#2196F3';
      case 'expired': return '#9C27B0';
      default: return '#666';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return 'check-circle';
      case 'pending': return 'clock-o';
      case 'rejected': return 'times-circle';
      case 'under_review': return 'search';
      case 'expired': return 'calendar-times-o';
      default: return 'question-circle';
    }
  };

  const getVehicleIcon = (type) => {
    switch (type) {
      case 'motorcycle': return 'motorcycle';
      case 'car': return 'car';
      case 'minibus': return 'bus';
      case 'bicycle': return 'bicycle';
      case 'truck': return 'truck';
      case 'scooter': return 'motorcycle';
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
            <View style={styles.vehicleTitleRow}>
              <Text style={styles.vehicleMakeModel}>{vehicle.make} {vehicle.model}</Text>
              {primaryVehicleId === vehicle.id && (
                <View style={styles.primaryBadge}>
                  <Icon name="star" size={12} color="#FFD700" />
                  <Text style={styles.primaryText}>Primary</Text>
                </View>
              )}
            </View>
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
          <Text style={styles.detailValue}>{vehicle.plate_number || vehicle.plate}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Icon name="calendar" size={14} color="#666" />
          <Text style={styles.detailLabel}>Added:</Text>
          <Text style={styles.detailValue}>{formatDate(vehicle.created_at)}</Text>
        </View>

        <View style={styles.detailRow}>
          <Icon name="file-text" size={14} color="#666" />
          <Text style={styles.detailLabel}>Insurance:</Text>
          <Text style={[
            styles.detailValue,
            vehicle.insurance_expiry && new Date(vehicle.insurance_expiry) < new Date() 
              ? { color: '#FF6B6B' } 
              : {}
          ]}>
            {vehicle.insurance_expiry ? formatDate(vehicle.insurance_expiry) : 'N/A'}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Icon name="road" size={14} color="#666" />
          <Text style={styles.detailLabel}>Tax:</Text>
          <Text style={[
            styles.detailValue,
            vehicle.road_tax_expiry && new Date(vehicle.road_tax_expiry) < new Date() 
              ? { color: '#FF6B6B' } 
              : {}
          ]}>
            {vehicle.road_tax_expiry ? formatDate(vehicle.road_tax_expiry) : 'N/A'}
          </Text>
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
            {vehicle.status.split('_').map(word => 
              word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ')}
          </Text>
        </View>
        {vehicle.status_message && (
          <Text style={styles.statusMessage}>{vehicle.status_message}</Text>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.viewButton} onPress={() => setSelectedVehicle(vehicle)}>
          <Icon name="eye" size={14} color="#00B894" />
          <Text style={styles.viewButtonText}>View Details</Text>
        </TouchableOpacity>
        
        {vehicle.status === 'approved' && (
          <TouchableOpacity 
            style={styles.setPrimaryButton}
            onPress={() => handleSetPrimary(vehicle.id)}
            disabled={isSettingPrimary || primaryVehicleId === vehicle.id}
          >
            {isSettingPrimary && primaryVehicleId === vehicle.id ? (
              <ActivityIndicator size="small" color="#FFD700" />
            ) : (
              <>
                <Icon 
                  name={primaryVehicleId === vehicle.id ? "star" : "star-o"} 
                  size={14} 
                  color={primaryVehicleId === vehicle.id ? "#FFD700" : "#666"} 
                />
                <Text style={[
                  styles.setPrimaryText,
                  { color: primaryVehicleId === vehicle.id ? "#FFD700" : "#666" }
                ]}>
                  {primaryVehicleId === vehicle.id ? 'Primary' : 'Set as Primary'}
                </Text>
              </>
            )}
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
            {vehicles.filter(v => v.status === 'pending' || v.status === 'under_review').length}
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
                  {selectedVehicle.images && Object.keys(selectedVehicle.images).length > 0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
                      {Object.entries(selectedVehicle.images).map(([key, image]) => (
                        image?.url ? (
                          <Image
                            key={key}
                            source={{ uri: image.url }}
                            style={styles.vehicleImage}
                          />
                        ) : null
                      ))}
                    </ScrollView>
                  ) : (
                    <View style={styles.noImagesContainer}>
                      <Icon name="image" size={40} color="#ccc" />
                      <Text style={styles.noImagesText}>No images available</Text>
                    </View>
                  )}

                  {/* Basic Info */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Basic Information</Text>
                    <View style={styles.modalDetails}>
                      <View style={styles.modalDetailRow}>
                        <Text style={styles.modalDetailLabel}>Type:</Text>
                        <Text style={styles.modalDetailValue}>
                          {selectedVehicle.type === 'motorcycle' ? 'Motorcycle (Kabaza)' : 
                           selectedVehicle.type === 'car' ? 'Car' : 
                           selectedVehicle.type === 'minibus' ? 'Minibus' : 
                           selectedVehicle.type === 'truck' ? 'Truck' : 
                           selectedVehicle.type === 'scooter' ? 'Scooter' : 
                           selectedVehicle.type === 'bicycle' ? 'Bicycle' : 'Vehicle'}
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
                        <Text style={styles.modalDetailValue}>
                          {selectedVehicle.plate_number || selectedVehicle.plate}
                        </Text>
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
                          {selectedVehicle.engine_number || 'N/A'}
                        </Text>
                      </View>
                      <View style={styles.modalDetailRow}>
                        <Text style={styles.modalDetailLabel}>Chassis No:</Text>
                        <Text style={styles.modalDetailValue}>
                          {selectedVehicle.chassis_number || 'N/A'}
                        </Text>
                      </View>
                      <View style={styles.modalDetailRow}>
                        <Text style={styles.modalDetailLabel}>VIN:</Text>
                        <Text style={styles.modalDetailValue}>
                          {selectedVehicle.vin || 'N/A'}
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
                          selectedVehicle.insurance_expiry && new Date(selectedVehicle.insurance_expiry) < new Date() 
                            ? { color: '#FF6B6B', fontWeight: 'bold' } 
                            : {}
                        ]}>
                          {selectedVehicle.insurance_expiry ? formatDate(selectedVehicle.insurance_expiry) : 'Not Provided'}
                          {selectedVehicle.insurance_expiry && new Date(selectedVehicle.insurance_expiry) < new Date() && ' (Expired)'}
                        </Text>
                      </View>
                      <View style={styles.modalDetailRow}>
                        <Text style={styles.modalDetailLabel}>Road Tax Expiry:</Text>
                        <Text style={[
                          styles.modalDetailValue,
                          selectedVehicle.road_tax_expiry && new Date(selectedVehicle.road_tax_expiry) < new Date() 
                            ? { color: '#FF6B6B', fontWeight: 'bold' } 
                            : {}
                        ]}>
                          {selectedVehicle.road_tax_expiry ? formatDate(selectedVehicle.road_tax_expiry) : 'Not Provided'}
                          {selectedVehicle.road_tax_expiry && new Date(selectedVehicle.road_tax_expiry) < new Date() && ' (Expired)'}
                        </Text>
                      </View>
                      <View style={styles.modalDetailRow}>
                        <Text style={styles.modalDetailLabel}>Registration No:</Text>
                        <Text style={styles.modalDetailValue}>
                          {selectedVehicle.registration_number || 'N/A'}
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
                        {selectedVehicle.status.split('_').map(word => 
                          word.charAt(0).toUpperCase() + word.slice(1)
                        ).join(' ')}
                      </Text>
                    </View>
                    <Text style={styles.statusDescription}>
                      {selectedVehicle.status_message || 'No status message available'}
                    </Text>
                    {selectedVehicle.verified_at && (
                      <Text style={styles.verificationDate}>
                        Verified on: {formatDate(selectedVehicle.verified_at)}
                      </Text>
                    )}
                    {selectedVehicle.updated_at && (
                      <Text style={styles.verificationDate}>
                        Last updated: {formatDate(selectedVehicle.updated_at)}
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
            <Text style={styles.warningText}>
              {primaryVehicleId === vehicleToDelete?.id && 
                'Warning: This is your primary vehicle. You need to set another vehicle as primary before deleting.'}
            </Text>
            <View style={styles.confirmModalButtons}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.deleteConfirmButton,
                  primaryVehicleId === vehicleToDelete?.id && styles.disabledDeleteButton
                ]}
                onPress={confirmDelete}
                disabled={primaryVehicleId === vehicleToDelete?.id}
              >
                <Text style={styles.deleteConfirmText}>
                  {primaryVehicleId === vehicleToDelete?.id ? 'Cannot Delete' : 'Delete'}
                </Text>
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
  vehicleTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  vehicleMakeModel: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 2, flex: 1 },
  vehicleYearColor: { fontSize: 14, color: '#666' },
  primaryBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFF9C4', 
    paddingHorizontal: 8, 
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  primaryText: { fontSize: 10, color: '#F57C00', fontWeight: '600' },
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
  setPrimaryText: { fontSize: 14, fontWeight: '500' },
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
  noImagesContainer: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    marginBottom: 20,
  },
  noImagesText: { fontSize: 14, color: '#999', marginTop: 10 },
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
  confirmModalText: { fontSize: 15, color: '#666', textAlign: 'center', lineHeight: 22, marginBottom: 15 },
  warningText: { fontSize: 13, color: '#FF6B6B', textAlign: 'center', marginBottom: 20, fontWeight: '500' },
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
  disabledDeleteButton: { backgroundColor: '#cccccc' },
  deleteConfirmText: { fontSize: 16, color: '#fff', fontWeight: 'bold' },
});