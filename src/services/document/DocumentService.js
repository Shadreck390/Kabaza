// services/DocumentService.js - For Malawi Ride-Hailing App (Kabaza/Bolt Clone)
import { Platform, Alert, Linking } from 'react-native';
import ImagePicker from 'react-native-image-crop-picker';
import RNFS from 'react-native-fs';
import storage from '@react-native-firebase/storage';
import database from '@react-native-firebase/database';
import auth from '@react-native-firebase/auth';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';

class DocumentService {
  constructor() {
    this.currentUser = null;
    this.storageRef = storage();
    this.dbRef = database();
    this.userDocuments = {
      driver: {
        required: [
          { id: 'license', name: 'Driver License', description: 'Valid Malawi driving license' },
          { id: 'nrc', name: 'National ID (NRC)', description: 'Malawi National Registration Certificate' },
          { id: 'vehicle_registration', name: 'Vehicle Registration', description: 'Vehicle registration certificate' },
          { id: 'insurance', name: 'Insurance Certificate', description: 'Third-party insurance valid in Malawi' },
          { id: 'profile_photo', name: 'Profile Photo', description: 'Clear face photo for identification' }
        ],
        optional: [
          { id: 'good_conduct', name: 'Police Clearance', description: 'Certificate of good conduct (optional)' }
        ]
      },
      rider: {
        required: [
          { id: 'profile_photo', name: 'Profile Photo', description: 'Clear face photo for identification' }
        ],
        optional: []
      }
    };

    // File size limits (in MB)
    this.MAX_FILE_SIZE = {
      image: 5, // 5MB
      pdf: 10, // 10MB
    };

    // Allowed file types
    this.ALLOWED_TYPES = {
      image: ['image/jpeg', 'image/png', 'image/jpg'],
      pdf: ['application/pdf']
    };
  }

  // ====================
  // INITIALIZATION
  // ====================

  /**
   * Initialize with current user
   */
  initialize(userData) {
    this.currentUser = userData;
    console.log('📄 Document service initialized for:', userData?.id);
  }

  // ====================
  // PERMISSION METHODS
  // ====================

  /**
   * Request camera/gallery permissions for Malawi app
   */
  async requestMediaPermissions() {
    try {
      let permissions = [];
      
      if (Platform.OS === 'ios') {
        permissions = [
          PERMISSIONS.IOS.PHOTO_LIBRARY,
          PERMISSIONS.IOS.CAMERA,
        ];
      } else {
        permissions = [
          PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE,
          PERMISSIONS.ANDROID.CAMERA,
        ];
        
        if (Platform.Version >= 33) {
          permissions.push(PERMISSIONS.ANDROID.READ_MEDIA_IMAGES);
        }
      }

      const results = await Promise.all(
        permissions.map(permission => request(permission))
      );

      const allGranted = results.every(result => 
        result === RESULTS.GRANTED || result === RESULTS.LIMITED
      );

      if (!allGranted) {
        this.showPermissionAlert();
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Media permission error:', error);
      return false;
    }
  }

  /**
   * Show permission alert for Malawi users
   */
  showPermissionAlert() {
    Alert.alert(
      'Permission Required',
      'Kabaza Malawi needs access to your photos and camera to upload required documents like driver license and ID.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() }
      ]
    );
  }

  // ====================
  // DOCUMENT PICKER METHODS
  // ====================

  /**
   * Pick image from gallery
   */
  async pickImageFromGallery(options = {}) {
    try {
      const hasPermission = await this.requestMediaPermissions();
      if (!hasPermission) return null;

      const defaultOptions = {
        cropping: true,
        cropperCircleOverlay: false,
        width: 800,
        height: 800,
        compressImageQuality: 0.8,
        mediaType: 'photo',
        includeBase64: false,
      };

      const image = await ImagePicker.openPicker({
        ...defaultOptions,
        ...options,
      });

      // Validate file size
      const fileSizeMB = image.size / (1024 * 1024);
      if (fileSizeMB > this.MAX_FILE_SIZE.image) {
        throw new Error(`Image size (${fileSizeMB.toFixed(1)}MB) exceeds ${this.MAX_FILE_SIZE.image}MB limit`);
      }

      return {
        uri: image.path,
        name: `document_${Date.now()}.${image.mime.split('/')[1]}`,
        type: image.mime,
        size: image.size,
        width: image.width,
        height: image.height,
      };
    } catch (error) {
      console.error('❌ Image picker error:', error);
      if (error.code !== 'E_PICKER_CANCELLED') {
        Alert.alert('Error', 'Failed to pick image. Please try again.');
      }
      return null;
    }
  }

  /**
   * Take photo with camera
   */
  async takePhotoWithCamera(options = {}) {
    try {
      const hasPermission = await this.requestMediaPermissions();
      if (!hasPermission) return null;

      const defaultOptions = {
        cropping: true,
        width: 800,
        height: 800,
        compressImageQuality: 0.8,
        useFrontCamera: false,
      };

      const image = await ImagePicker.openCamera({
        ...defaultOptions,
        ...options,
      });

      // Validate file size
      const fileSizeMB = image.size / (1024 * 1024);
      if (fileSizeMB > this.MAX_FILE_SIZE.image) {
        throw new Error(`Image size (${fileSizeMB.toFixed(1)}MB) exceeds ${this.MAX_FILE_SIZE.image}MB limit`);
      }

      return {
        uri: image.path,
        name: `photo_${Date.now()}.${image.mime.split('/')[1]}`,
        type: image.mime,
        size: image.size,
        width: image.width,
        height: image.height,
      };
    } catch (error) {
      console.error('❌ Camera error:', error);
      if (error.code !== 'E_PICKER_CANCELLED') {
        Alert.alert('Error', 'Failed to take photo. Please try again.');
      }
      return null;
    }
  }

  // ====================
  // UPLOAD METHODS
  // ====================

  /**
   * Upload document to Firebase Storage
   */
  async uploadDocument(file, documentType, onProgress = null) {
    try {
      if (!this.currentUser?.id) {
        throw new Error('User not logged in');
      }

      if (!file || !file.uri) {
        throw new Error('Invalid file');
      }

      // Validate file type
      if (!this.isValidFileType(file.type, documentType)) {
        throw new Error(`Invalid file type. Allowed: ${this.ALLOWED_TYPES.image.join(', ')}`);
      }

      // Validate file size
      const fileSizeMB = file.size / (1024 * 1024);
      const maxSize = documentType === 'pdf' ? this.MAX_FILE_SIZE.pdf : this.MAX_FILE_SIZE.image;
      if (fileSizeMB > maxSize) {
        throw new Error(`File too large (${fileSizeMB.toFixed(1)}MB). Max size: ${maxSize}MB`);
      }

      // Create storage path
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop();
      const storagePath = `documents/${this.currentUser.id}/${documentType}_${timestamp}.${fileExtension}`;

      // Upload to Firebase Storage
      const reference = this.storageRef.ref(storagePath);
      const task = reference.putFile(file.uri);

      // Listen for progress
      if (onProgress) {
        task.on('state_changed', (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress(Math.round(progress));
        });
      }

      // Wait for upload to complete
      await task;

      // Get download URL
      const downloadURL = await reference.getDownloadURL();

      // Save document info to Realtime Database
      await this.saveDocumentInfo(documentType, {
        url: downloadURL,
        path: storagePath,
        name: file.name,
        type: file.type,
        size: file.size,
        uploadedAt: timestamp,
        status: 'pending', // pending, approved, rejected
        reviewedBy: null,
        reviewedAt: null,
        rejectionReason: null,
      });

      console.log(`✅ Document uploaded: ${documentType}`);
      return {
        success: true,
        url: downloadURL,
        path: storagePath,
        documentType,
      };
    } catch (error) {
      console.error('❌ Upload error:', error);
      throw error;
    }
  }

  /**
   * Save document metadata to database
   */
  async saveDocumentInfo(documentType, documentData) {
    try {
      const userRef = this.dbRef.ref(`users/${this.currentUser.id}/documents/${documentType}`);
      await userRef.set(documentData);

      // Update user document status
      await this.updateUserDocumentStatus();
    } catch (error) {
      console.error('❌ Save document info error:', error);
      throw error;
    }
  }

  /**
   * Update overall user document status
   */
  async updateUserDocumentStatus() {
    try {
      const documentsRef = this.dbRef.ref(`users/${this.currentUser.id}/documents`);
      const snapshot = await documentsRef.once('value');
      const documents = snapshot.val() || {};

      const requiredDocs = this.userDocuments[this.currentUser.type]?.required || [];
      const uploadedDocs = Object.keys(documents).filter(key => documents[key]?.url);
      
      const allRequiredUploaded = requiredDocs.every(doc => 
        uploadedDocs.includes(doc.id)
      );

      const allApproved = requiredDocs.every(doc => 
        documents[doc.id]?.status === 'approved'
      );

      const status = allApproved ? 'approved' : 
                    allRequiredUploaded ? 'under_review' : 
                    'incomplete';

      // Update user status
      await this.dbRef.ref(`users/${this.currentUser.id}`).update({
        documentStatus: status,
        documentUpdatedAt: Date.now(),
      });

      return status;
    } catch (error) {
      console.error('❌ Update status error:', error);
      throw error;
    }
  }

  // ====================
  // DOCUMENT MANAGEMENT
  // ====================

  /**
   * Get user's documents
   */
  async getUserDocuments() {
    try {
      if (!this.currentUser?.id) return {};

      const snapshot = await this.dbRef
        .ref(`users/${this.currentUser.id}/documents`)
        .once('value');
      
      return snapshot.val() || {};
    } catch (error) {
      console.error('❌ Get documents error:', error);
      return {};
    }
  }

  /**
   * Get required documents for user type
   */
  getRequiredDocuments(userType = 'driver') {
    return this.userDocuments[userType] || this.userDocuments.driver;
  }

  /**
   * Check if document is uploaded
   */
  async isDocumentUploaded(documentType) {
    const documents = await this.getUserDocuments();
    return !!documents[documentType]?.url;
  }

  /**
   * Get document status
   */
  async getDocumentStatus(documentType) {
    const documents = await this.getUserDocuments();
    const doc = documents[documentType];
    
    if (!doc) return 'not_uploaded';
    return doc.status || 'pending';
  }

  /**
   * Delete document
   */
  async deleteDocument(documentType) {
    try {
      // Get document info
      const documents = await this.getUserDocuments();
      const document = documents[documentType];

      if (!document) {
        throw new Error('Document not found');
      }

      // Delete from storage
      if (document.path) {
        await this.storageRef.ref(document.path).delete();
      }

      // Delete from database
      await this.dbRef
        .ref(`users/${this.currentUser.id}/documents/${documentType}`)
        .remove();

      // Update status
      await this.updateUserDocumentStatus();

      console.log(`🗑️ Document deleted: ${documentType}`);
      return true;
    } catch (error) {
      console.error('❌ Delete document error:', error);
      throw error;
    }
  }

  // ====================
  // VALIDATION METHODS
  // ====================

  /**
   * Validate file type
   */
  isValidFileType(fileType, documentType) {
    const allowedTypes = documentType === 'pdf' 
      ? this.ALLOWED_TYPES.pdf 
      : this.ALLOWED_TYPES.image;
    
    return allowedTypes.includes(fileType);
  }

  /**
   * Validate Malawi NRC format
   */
  isValidMalawiNRC(nrcNumber) {
    // Malawi NRC format: Area/BirthYear/SerialNumber
    // Example: KA/90/12345
    const nrcRegex = /^[A-Z]{2}\/\d{2}\/\d{5,7}$/;
    return nrcRegex.test(nrcNumber);
  }

  /**
   * Validate Malawi license number
   */
  isValidMalawiLicense(licenseNumber) {
    // Malawi driver's license format
    const licenseRegex = /^[A-Z]{2}\d{6}$/;
    return licenseRegex.test(licenseNumber);
  }

  // ====================
  // UTILITY METHODS
  // ====================

  /**
   * Format file size
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get document icon based on type
   */
  getDocumentIcon(documentType) {
    const icons = {
      license: '🪪',
      nrc: '🆔',
      vehicle_registration: '🚗',
      insurance: '📑',
      profile_photo: '📷',
      good_conduct: '👮',
      default: '📄'
    };
    
    return icons[documentType] || icons.default;
  }

  /**
   * Get status color
   */
  getStatusColor(status) {
    const colors = {
      approved: 'green',
      pending: 'orange',
      rejected: 'red',
      incomplete: 'gray',
      not_uploaded: 'lightgray'
    };
    
    return colors[status] || 'gray';
  }

  // ====================
  // ADMIN METHODS (for admin panel)
  // ====================

  /**
   * Review document (admin function)
   */
  async reviewDocument(userId, documentType, action, reason = '') {
    try {
      const updates = {
        status: action, // 'approved' or 'rejected'
        reviewedBy: auth().currentUser?.uid,
        reviewedAt: Date.now(),
      };

      if (action === 'rejected') {
        updates.rejectionReason = reason;
      }

      await this.dbRef
        .ref(`users/${userId}/documents/${documentType}`)
        .update(updates);

      // Update user status
      const userRef = this.dbRef.ref(`users/${userId}`);
      const snapshot = await userRef.once('value');
      const userData = snapshot.val();

      if (userData) {
        await this.updateUserDocumentStatusForUser(userId, userData.type);
      }

      console.log(`✅ Document ${action}: ${documentType} for user ${userId}`);
      return true;
    } catch (error) {
      console.error('❌ Review document error:', error);
      throw error;
    }
  }

  /**
   * Update document status for specific user
   */
  async updateUserDocumentStatusForUser(userId, userType) {
    // Similar to updateUserDocumentStatus but for any user
    // Implementation depends on your admin structure
  }

  // ====================
  // CLEANUP
  // ====================

  /**
   * Clean up resources
   */
  cleanup() {
    this.currentUser = null;
    console.log('📄 Document service cleaned up');
  }
}

// Create and export singleton instance
const documentServiceInstance = new DocumentService();
export default documentServiceInstance;