// screens/rider/FavoritesScreen.js
import React, { useState, useEffect, useRef } from 'react';
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
  Animated,
  FlatList,
  Easing,
} from 'react-native';
import { MaterialIconFallback as MaterialIcon } from '@src/utils/iconUtils';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const FAVORITE_TYPES = {
  HOME: 'home',
  WORK: 'work',
  OTHER: 'other',
};

// Animation constants
const CARD_HEIGHT = 120;
const ANIMATION_DURATION = 300;

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

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const headerSlide = useRef(new Animated.Value(-20)).current;
  const modalSlide = useRef(new Animated.Value(height)).current;
  const cardAnimations = useRef([]);
  const searchBarScale = useRef(new Animated.Value(1)).current;

  // Initialize card animations
  if (cardAnimations.current.length !== favorites.length) {
    cardAnimations.current = favorites.map(() => ({
      scale: new Animated.Value(0.9),
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(20),
    }));
  }

  useEffect(() => {
    // Initial animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }),
      Animated.timing(headerSlide, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

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

    // Search bar animation
    if (searchQuery.length > 0) {
      Animated.spring(searchBarScale, {
        toValue: 1.02,
        useNativeDriver: true,
        tension: 150,
        friction: 3,
      }).start();
    } else {
      Animated.spring(searchBarScale, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    }
  }, [searchQuery, favorites]);

  useEffect(() => {
    // Animate cards in sequence
    cardAnimations.current.forEach((anim, index) => {
      Animated.sequence([
        Animated.delay(index * 100),
        Animated.parallel([
          Animated.spring(anim.scale, {
            toValue: 1,
            useNativeDriver: true,
            tension: 60,
            friction: 8,
          }),
          Animated.timing(anim.opacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
          }),
          Animated.timing(anim.translateY, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
          }),
        ]),
      ]).start();
    });
  }, [favorites]);

  const loadFavorites = async () => {
    try {
      const saved = await AsyncStorage.getItem('user_favorites');
      if (saved) {
        const parsed = JSON.parse(saved);
        setFavorites(parsed);
        setFilteredFavorites(parsed);
      } else {
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
    openModal();
  };

  const handleEditFavorite = (favorite) => {
    setNewFavorite(favorite);
    setEditingFavorite(favorite.id);
    openModal();
  };

  const openModal = () => {
    setShowAddModal(true);
    Animated.timing(modalSlide, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start();
  };

  const closeModal = () => {
    Animated.timing(modalSlide, {
      toValue: height,
      duration: 300,
      useNativeDriver: true,
      easing: Easing.in(Easing.cubic),
    }).start(() => {
      setShowAddModal(false);
    });
  };

  const handleSaveFavorite = async () => {
  // ✅ Add coordinates validation
  if (!newFavorite.name.trim() || !newFavorite.address.trim()) {
    Alert.alert('Error', 'Please enter name and address');
    return;
  }
  
  // ✅ Check if coordinates are missing
  if (!newFavorite.coordinates) {
    Alert.alert(
      'Location Required',
      'Please select a location on the map or enter valid coordinates',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Choose Location', 
          onPress: () => {
            // Navigate to map to pick location
            closeModal();
            setTimeout(() => {
              navigation.navigate('SearchLocation', {
                onLocationSelect: (location) => {
                  setNewFavorite({
                    ...newFavorite,
                    address: location.address,
                    coordinates: location.coordinates,
                  });
                  openModal();
                },
              });
            }, 300);
          }
        }
      ]
    );
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
  closeModal();
  
  // Success animation
  Animated.sequence([
    Animated.spring(searchBarScale, {
      toValue: 1.05,
      useNativeDriver: true,
      tension: 200,
      friction: 3,
    }),
    Animated.spring(searchBarScale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 200,
      friction: 3,
    }),
  ]).start();
  
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
            // Animate card removal
            const index = favorites.findIndex(fav => fav.id === id);
            if (index >= 0 && cardAnimations.current[index]) {
              Animated.parallel([
                Animated.timing(cardAnimations.current[index].scale, {
                  toValue: 0.8,
                  duration: 200,
                  useNativeDriver: true,
                }),
                Animated.timing(cardAnimations.current[index].opacity, {
                  toValue: 0,
                  duration: 200,
                  useNativeDriver: true,
                }),
              ]).start(() => {
                const updatedFavorites = favorites.filter(fav => fav.id !== id);
                saveFavorites(updatedFavorites);
              });
            } else {
              const updatedFavorites = favorites.filter(fav => fav.id !== id);
              saveFavorites(updatedFavorites);
            }
          },
        },
      ]
    );
  };

  const handleUseFavorite = (favorite) => {
    // Button press animation
    const buttonScale = new Animated.Value(1);
    Animated.sequence([
      Animated.spring(buttonScale, {
        toValue: 0.95,
        useNativeDriver: true,
        tension: 150,
        friction: 3,
      }),
      Animated.spring(buttonScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 150,
        friction: 3,
      }),
    ]).start();

    setTimeout(() => {
      navigation.navigate('RideSelection', {
        destination: favorite.name,
        destinationAddress: favorite.address,
        destinationCoordinates: favorite.coordinates,
      });
    }, 150);
  };

  const getIconForType = (type) => {
    switch (type) {
      case FAVORITE_TYPES.HOME:
        return { name: 'home', color: '#3B82F6', gradient: ['#3B82F6', '#2563EB'] };
      case FAVORITE_TYPES.WORK:
        return { name: 'work', color: '#22C55E', gradient: ['#22C55E', '#16A34A'] };
      default:
        return { name: 'place', color: '#6B7280', gradient: ['#6B7280', '#4B5563'] };
    }
  };

  const renderFavoriteItem = ({ item, index }) => {
    const icon = getIconForType(item.type);
    const anim = cardAnimations.current[index] || {
      scale: new Animated.Value(1),
      opacity: new Animated.Value(1),
      translateY: new Animated.Value(0),
    };

    return (
      <Animated.View
        style={[
          styles.favoriteCard,
          {
            opacity: anim.opacity,
            transform: [
              { scale: anim.scale },
              { translateY: anim.translateY },
            ],
          },
        ]}
      >
        <TouchableOpacity 
          style={styles.favoriteContent}
          onPress={() => handleUseFavorite(item)}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={icon.gradient}
            style={styles.favoriteIcon}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <MaterialIcon name={icon.name} size={28} color="#FFFFFF" />
          </LinearGradient>
          <View style={styles.favoriteInfo}>
            <Text style={styles.favoriteName}>{item.name}</Text>
            <Text style={styles.favoriteAddress} numberOfLines={1}>
              {item.address}
            </Text>
            <View style={styles.favoriteMeta}>
              <Text style={styles.favoriteType}>
                {item.type === FAVORITE_TYPES.HOME ? 'Home' : 
                 item.type === FAVORITE_TYPES.WORK ? 'Work' : 'Favorite'}
              </Text>
              <Text style={styles.favoriteDate}>
                Added: {item.createdAt}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
        
        <View style={styles.favoriteActions}>
          <TouchableOpacity 
            style={styles.favoriteAction}
            onPress={() => handleEditFavorite(item)}
            activeOpacity={0.6}
          >
            <View style={styles.editButton}>
              <MaterialIcon name="edit" size={18} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.favoriteAction}
            onPress={() => handleDeleteFavorite(item.id)}
            activeOpacity={0.6}
          >
            <View style={styles.deleteButton}>
              <MaterialIcon name="delete" size={18} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  const renderAddModal = () => (
    <Modal
      visible={showAddModal}
      animationType="none"
      transparent={true}
      onRequestClose={closeModal}
    >
      <Animated.View 
        style={[
          styles.modalOverlay,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <Animated.View 
          style={[
            styles.modalContent,
            {
              transform: [{ translateY: modalSlide }],
            },
          ]}
        >
          <LinearGradient
            colors={['#FFFFFF', '#F8FAFC']}
            style={styles.modalGradient}
          >
            {/* Modal Handle */}
            <View style={styles.modalHandleContainer}>
              <View style={styles.modalHandle} />
            </View>

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingFavorite ? 'Edit Favorite' : 'Add Favorite'}
              </Text>
              <TouchableOpacity 
                onPress={closeModal}
                activeOpacity={0.6}
                style={styles.closeModalButton}
              >
                <MaterialIcon name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalBody}
              showsVerticalScrollIndicator={false}
            >
              <Animated.View 
                style={[
                  styles.inputGroup,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                  },
                ]}
              >
                <Text style={styles.inputLabel}>Name *</Text>
                <View style={styles.inputContainer}>
                  <MaterialIcon name="local-offer" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Home, Work, Gym"
                    placeholderTextColor="#999"
                    value={newFavorite.name}
                    onChangeText={(text) => setNewFavorite({ ...newFavorite, name: text })}
                  />
                </View>
              </Animated.View>

              <Animated.View 
                style={[
                  styles.inputGroup,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                  },
                ]}
              >
                <Text style={styles.inputLabel}>Address *</Text>
                <View style={styles.inputContainer}>
                  <MaterialIcon name="location-on" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Enter full address"
                    placeholderTextColor="#999"
                    value={newFavorite.address}
                    onChangeText={(text) => setNewFavorite({ ...newFavorite, address: text })}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </Animated.View>

              <Animated.View 
                style={[
                  styles.inputGroup,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                  },
                ]}
              >
                <Text style={styles.inputLabel}>Type</Text>
                <View style={styles.typeOptions}>
                  {Object.values(FAVORITE_TYPES).map((type, index) => {
                    const typeConfig = getIconForType(type);
                    return (
                      <Animated.View
                        key={type}
                        style={{
                          opacity: fadeAnim,
                          transform: [{ translateY: slideAnim }],
                        }}
                      >
                        <TouchableOpacity
                          style={[
                            styles.typeOption,
                            newFavorite.type === type && styles.typeOptionSelected,
                          ]}
                          onPress={() => setNewFavorite({ ...newFavorite, type })}
                          activeOpacity={0.7}
                        >
                          {newFavorite.type === type ? (
                            <LinearGradient
                              colors={typeConfig.gradient}
                              style={styles.typeOptionIcon}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                            >
                              <MaterialIcon
                                name={type === FAVORITE_TYPES.HOME ? 'home' : 
                                      type === FAVORITE_TYPES.WORK ? 'work' : 'place'}
                                size={20}
                                color="#FFFFFF"
                              />
                            </LinearGradient>
                          ) : (
                            <View style={[styles.typeOptionIcon, { backgroundColor: '#F1F5F9' }]}>
                              <MaterialIcon
                                name={type === FAVORITE_TYPES.HOME ? 'home' : 
                                      type === FAVORITE_TYPES.WORK ? 'work' : 'place'}
                                size={20}
                                color="#666"
                              />
                            </View>
                          )}
                          <Text style={[
                            styles.typeOptionText,
                            newFavorite.type === type && styles.typeOptionTextSelected,
                          ]}>
                            {type === FAVORITE_TYPES.HOME ? 'Home' : 
                             type === FAVORITE_TYPES.WORK ? 'Work' : 'Other'}
                          </Text>
                        </TouchableOpacity>
                      </Animated.View>
                    );
                  })}
                </View>
              </Animated.View>

              <Animated.View
                style={{
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                }}
              >
                <TouchableOpacity 
                  style={styles.locationButton}
                  onPress={() => {
                    closeModal();
                    setTimeout(() => {
                      navigation.navigate('SearchLocation', {
                        onLocationSelect: (location) => {
                          setNewFavorite({
                            ...newFavorite,
                            address: location.address,
                            coordinates: location.coordinates,
                          });
                          openModal();
                        },
                      });
                    }, 300);
                  }}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={['#22C55E', '#16A34A']}
                    style={styles.locationButtonIcon}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <MaterialIcon name="map" size={20} color="#FFFFFF" />
                  </LinearGradient>
                  <View>
                    <Text style={styles.locationButtonTitle}>Choose on Map</Text>
                    <Text style={styles.locationButtonSubtitle}>Select location visually</Text>
                  </View>
                  <MaterialIcon name="chevron-right" size={20} color="#22C55E" />
                </TouchableOpacity>
              </Animated.View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={closeModal}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleSaveFavorite}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#22C55E', '#16A34A']}
                  style={styles.saveButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.saveButtonText}>
                    {editingFavorite ? 'Update' : 'Save'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Animated Header */}
      <Animated.View 
        style={[
          styles.header,
          {
            transform: [{ translateY: headerSlide }],
          },
        ]}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.6}
        >
          <LinearGradient
            colors={['#F1F5F9', '#E2E8F0']}
            style={styles.backButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <MaterialIcon name="arrow-back" size={20} color="#000000" />
          </LinearGradient>
        </TouchableOpacity>
        
        <Animated.Text 
          style={[
            styles.headerTitle,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          Favorites
        </Animated.Text>
        
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleAddFavorite}
          activeOpacity={0.6}
        >
          <LinearGradient
            colors={['#22C55E', '#16A34A']}
            style={styles.addButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <MaterialIcon name="add" size={20} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Animated Search Bar */}
      <Animated.View 
        style={[
          styles.searchContainer,
          {
            transform: [{ scale: searchBarScale }],
          },
        ]}
      >
        <MaterialIcon name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search favorites..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.6}>
            <MaterialIcon name="close" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Favorites List */}
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {filteredFavorites.length === 0 ? (
          <Animated.View 
            style={[
              styles.emptyState,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <LinearGradient
              colors={['#F1F5F9', '#E2E8F0']}
              style={styles.emptyStateIcon}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialIcon name="favorite-border" size={48} color="#94A3B8" />
            </LinearGradient>
            <Text style={styles.emptyStateTitle}>
              {searchQuery ? 'No matches found' : 'No favorites yet'}
            </Text>
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'Try different search terms' : 'Add your frequently visited locations'}
            </Text>
            <TouchableOpacity 
              style={styles.emptyStateButton}
              onPress={handleAddFavorite}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#22C55E', '#16A34A']}
                style={styles.emptyStateButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialIcon name="add" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.emptyStateButtonText}>Add Favorite</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <>
            <Animated.View 
              style={[
                styles.section,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <Text style={styles.sectionTitle}>
                {searchQuery ? 'Search Results' : 'My Favorites'} 
              </Text>
              <Text style={styles.sectionCount}>
                ({filteredFavorites.length})
              </Text>
            </Animated.View>
            <FlatList
              data={filteredFavorites}
              renderItem={renderFavoriteItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.favoritesList}
            />
          </>
        )}
      </Animated.View>

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
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 5,
  },
  backButton: {
    width: 44,
    height: 44,
  },
  backButtonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: -0.5,
  },
  addButton: {
    width: 44,
    height: 44,
  },
  addButtonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    marginTop: 20,
    marginBottom: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginRight: 8,
  },
  sectionCount: {
    fontSize: 20,
    fontWeight: '600',
    color: '#22C55E',
  },
  favoritesList: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  favoriteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  favoriteContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  favoriteIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  favoriteInfo: {
    flex: 1,
  },
  favoriteName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  favoriteAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 18,
  },
  favoriteMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  favoriteType: {
    fontSize: 12,
    color: '#22C55E',
    fontWeight: '600',
    backgroundColor: '#F0F9F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  favoriteDate: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  favoriteActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  favoriteAction: {
    marginLeft: 8,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
    paddingHorizontal: 32,
  },
  emptyStateIcon: {
    width: 100,
    height: 100,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  emptyStateButton: {
    width: '100%',
    maxWidth: 200,
  },
  emptyStateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyStateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
    maxHeight: height * 0.85,
  },
  modalGradient: {
    flex: 1,
  },
  modalHandleContainer: {
    paddingTop: 16,
    paddingBottom: 12,
    alignItems: 'center',
  },
  modalHandle: {
    width: 48,
    height: 5,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  closeModalButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
  },
  modalBody: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
    paddingVertical: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 16,
  },
  typeOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  typeOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: '#F8FAFC',
    gap: 8,
  },
  typeOptionSelected: {
    borderColor: '#22C55E',
    backgroundColor: '#F0F9F0',
  },
  typeOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  typeOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  typeOptionTextSelected: {
    color: '#22C55E',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    gap: 16,
    marginTop: 8,
  },
  locationButtonIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  locationButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  locationButtonSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  saveButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonGradient: {
    paddingVertical: 18,
    borderRadius: 16,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});