// screens/rider/FavoritesScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const FAVORITE_TYPES = {
  HOME: 'home',
  WORK: 'work',
  OTHER: 'other',
};

export default function FavoritesScreen() {
  const navigation = useNavigation();
  const [favorites, setFavorites] = useState([]);
  const [filteredFavorites, setFilteredFavorites] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingFavorite, setEditingFavorite] = useState(null);
  const [newFavorite, setNewFavorite] = useState({
    name: '',
    address: '',
    type: FAVORITE_TYPES.OTHER,
    coordinates: null,
  });

  useEffect(() => {
    loadFavorites();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredFavorites(favorites);
    } else {
      const filtered = favorites.filter(
        fav =>
          fav.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          fav.address.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredFavorites(filtered);
    }
  }, [searchQuery, favorites]);

  const loadFavorites = async () => {
    try {
      const saved = await AsyncStorage.getItem('user_favorites');
      if (saved) {
        const parsed = JSON.parse(saved);
        setFavorites(parsed);
        setFilteredFavorites(parsed);
      } else {
        // Default favorites
        const defaultFavorites = [
          {
            id: '1',
            name: 'Home',
            address: '123 Mchinji Road, Area 3, Lilongwe',
            type: FAVORITE_TYPES.HOME,
            coordinates: { latitude: -13.9583, longitude: 33.7689 },
            createdAt: '2024-01-01',
          },
          {
            id: '2',
            name: 'Work',
            address: 'Lilongwe City Mall, M1 Road',
            type: FAVORITE_TYPES.WORK,
            coordinates: { latitude: -13.9772, longitude: 33.7720 },
            createdAt: '2024-01-02',
          },
          {
            id: '3',
            name: 'Gym',
            address: 'Fitness World, Old Town',
            type: FAVORITE_TYPES.OTHER,
            coordinates: { latitude: -13.9700, longitude: 33.7750 },
            createdAt: '2024-01-03',
          },
        ];
        setFavorites(defaultFavorites);
        setFilteredFavorites(defaultFavorites);
        await AsyncStorage.setItem('user_favorites', JSON.stringify(defaultFavorites));
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  const saveFavorites = async (updatedFavorites) => {
    try {
      await AsyncStorage.setItem('user_favorites', JSON.stringify(updatedFavorites));
      setFavorites(updatedFavorites);
      setFilteredFavorites(updatedFavorites);
    } catch (error) {
      console.error('Error saving favorites:', error);
    }
  };

  const handleAddFavorite = () => {
    setNewFavorite({
      name: '',
      address: '',
      type: FAVORITE_TYPES.OTHER,
      coordinates: null,
    });
    setEditingFavorite(null);
    setShowAddModal(true);
  };

  const handleEditFavorite = (favorite) => {
    setNewFavorite(favorite);
    setEditingFavorite(favorite.id);
    setShowAddModal(true);
  };

  const handleSaveFavorite = async () => {
    if (!newFavorite.name.trim() || !newFavorite.address.trim()) {
      Alert.alert('Error', 'Please enter name and address');
      return;
    }

    let updatedFavorites;
    
    if (editingFavorite) {
      updatedFavorites = favorites.map(fav =>
        fav.id === editingFavorite ? { ...newFavorite, id: editingFavorite } : fav
      );
    } else {
      const newId = Date.now().toString();
      updatedFavorites = [
        ...favorites,
        {
          ...newFavorite,
          id: newId,
          createdAt: new Date().toISOString().split('T')[0],
        },
      ];
    }

    await saveFavorites(updatedFavorites);
    setShowAddModal(false);
    Alert.alert('Success', editingFavorite ? 'Favorite updated' : 'Favorite added');
  };

  const handleDeleteFavorite = (id) => {
    Alert.alert(
      'Delete Favorite',
      'Are you sure you want to delete this favorite location?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedFavorites = favorites.filter(fav => fav.id !== id);
            await saveFavorites(updatedFavorites);
          },
        },
      ]
    );
  };

  const handleUseFavorite = (favorite) => {
    navigation.navigate('RideSelection', {
      destination: favorite.name,
      destinationAddress: favorite.address,
      destinationCoordinates: favorite.coordinates,
    });
  };

  const getIconForType = (type) => {
    switch (type) {
      case FAVORITE_TYPES.HOME:
        return { name: 'home', color: '#3B82F6' };
      case FAVORITE_TYPES.WORK:
        return { name: 'work', color: '#22C55E' };
      default:
        return { name: 'place', color: '#6B7280' };
    }
  };

  const renderFavoriteItem = (item) => {
    const icon = getIconForType(item.type);
    
    return (
      <View key={item.id} style={styles.favoriteCard}>
        <TouchableOpacity 
          style={styles.favoriteContent}
          onPress={() => handleUseFavorite(item)}
        >
          <View style={[styles.favoriteIcon, { backgroundColor: `${icon.color}15` }]}>
            <MaterialIcon name={icon.name} size={24} color={icon.color} />
          </View>
          <View style={styles.favoriteInfo}>
            <Text style={styles.favoriteName}>{item.name}</Text>
            <Text style={styles.favoriteAddress} numberOfLines={1}>
              {item.address}
            </Text>
            <Text style={styles.favoriteType}>
              {item.type === FAVORITE_TYPES.HOME ? 'Home' : 
               item.type === FAVORITE_TYPES.WORK ? 'Work' : 'Favorite'}
            </Text>
          </View>
        </TouchableOpacity>
        
        <View style={styles.favoriteActions}>
          <TouchableOpacity 
            style={styles.favoriteAction}
            onPress={() => handleEditFavorite(item)}
          >
            <MaterialIcon name="edit" size={20} color="#6B7280" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.favoriteAction}
            onPress={() => handleDeleteFavorite(item.id)}
          >
            <MaterialIcon name="delete" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderAddModal = () => (
    <Modal
      visible={showAddModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowAddModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingFavorite ? 'Edit Favorite' : 'Add Favorite'}
            </Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <MaterialIcon name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Home, Work, Gym"
                value={newFavorite.name}
                onChangeText={(text) => setNewFavorite({ ...newFavorite, name: text })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Address *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter full address"
                value={newFavorite.address}
                onChangeText={(text) => setNewFavorite({ ...newFavorite, address: text })}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Type</Text>
              <View style={styles.typeOptions}>
                {Object.values(FAVORITE_TYPES).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeOption,
                      newFavorite.type === type && styles.typeOptionSelected,
                    ]}
                    onPress={() => setNewFavorite({ ...newFavorite, type })}
                  >
                    <MaterialIcon
                      name={type === FAVORITE_TYPES.HOME ? 'home' : 
                            type === FAVORITE_TYPES.WORK ? 'work' : 'place'}
                      size={20}
                      color={newFavorite.type === type ? '#FFFFFF' : '#666'}
                    />
                    <Text style={[
                      styles.typeOptionText,
                      newFavorite.type === type && styles.typeOptionTextSelected,
                    ]}>
                      {type === FAVORITE_TYPES.HOME ? 'Home' : 
                       type === FAVORITE_TYPES.WORK ? 'Work' : 'Other'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity 
              style={styles.locationButton}
              onPress={() => {
                setShowAddModal(false);
                navigation.navigate('SearchLocation', {
                  onLocationSelect: (location) => {
                    setNewFavorite({
                      ...newFavorite,
                      address: location.address,
                      coordinates: location.coordinates,
                    });
                    setShowAddModal(true);
                  },
                });
              }}
            >
              <MaterialIcon name="map" size={20} color="#22C55E" />
              <Text style={styles.locationButtonText}>Choose on Map</Text>
            </TouchableOpacity>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setShowAddModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.saveButton}
              onPress={handleSaveFavorite}
            >
              <Text style={styles.saveButtonText}>
                {editingFavorite ? 'Update' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
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
          <MaterialIcon name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Favorites</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleAddFavorite}
        >
          <MaterialIcon name="add" size={24} color="#000000" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialIcon name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search favorites..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <MaterialIcon name="close" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {/* Favorites List */}
      <ScrollView style={styles.content}>
        {filteredFavorites.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcon name="favorite-border" size={64} color="#D1D5DB" />
            <Text style={styles.emptyStateTitle}>No favorites yet</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'No matches found' : 'Add your frequently visited locations'}
            </Text>
            <TouchableOpacity 
              style={styles.emptyStateButton}
              onPress={handleAddFavorite}
            >
              <Text style={styles.emptyStateButtonText}>Add Favorite</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {searchQuery ? 'Search Results' : 'My Favorites'} 
                ({filteredFavorites.length})
              </Text>
            </View>
            {filteredFavorites.map(renderFavoriteItem)}
          </>
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      {renderAddModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 40,
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
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginTop: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  favoriteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  favoriteContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  favoriteIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  favoriteInfo: {
    flex: 1,
  },
  favoriteName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  favoriteAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  favoriteType: {
    fontSize: 12,
    color: '#22C55E',
    fontWeight: '500',
  },
  favoriteActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  favoriteAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginTop: 24,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  emptyStateButton: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyStateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  modalBody: {
    padding: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000000',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  typeOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    gap: 8,
  },
  typeOptionSelected: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },
  typeOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  typeOptionTextSelected: {
    color: '#FFFFFF',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#22C55E',
    backgroundColor: '#F0F9F0',
    gap: 8,
    marginTop: 8,
  },
  locationButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#22C55E',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    marginRight: 12,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#22C55E',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});