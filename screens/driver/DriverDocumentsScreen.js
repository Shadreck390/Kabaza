// screens/driver/DriverDocumentsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  Alert,
  Image,
  Platform,
  Linking,
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'react-native-document-picker';
import * as ImagePicker from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const DOCUMENT_TYPES = {
  LICENSE: {
    id: 'license',
    title: 'Driver\'s License',
    description: 'Valid driver\'s license',
    icon: 'card-account-details',
    required: true,
    maxSize: 5, // MB
    allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
  },
  VEHICLE_REGISTRATION: {
    id: 'vehicle_registration',
    title: 'Vehicle Registration',
    description: 'Vehicle registration certificate',
    icon: 'car',
    required: true,
    maxSize: 5,
    allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
  },
  INSURANCE: {
    id: 'insurance',
    title: 'Insurance Certificate',
    description: 'Vehicle insurance certificate',
    icon: 'shield-check',
    required: true,
    maxSize: 5,
    allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
  },
  PROFILE_PHOTO: {
    id: 'profile_photo',
    title: 'Profile Photo',
    description: 'Clear face photo',
    icon: 'camera',
    required: true,
    maxSize: 2,
    allowedTypes: ['image/jpeg', 'image/png'],
  },
  VEHICLE_PHOTO: {
    id: 'vehicle_photo',
    title: 'Vehicle Photo',
    description: 'Clear vehicle photo',
    icon: 'car',
    required: true,
    maxSize: 2,
    allowedTypes: ['image/jpeg', 'image/png'],
  },
  BACKGROUND_CHECK: {
    id: 'background_check',
    title: 'Background Check',
    description: 'Police clearance certificate',
    icon: 'badge-account',
    required: false,
    maxSize: 5,
    allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
  },
};

const DOCUMENT_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
  MISSING: 'missing',
};

export default function DriverDocumentsScreen() {
  const navigation = useNavigation();
  const [documents, setDocuments] = useState({});
  const [uploading, setUploading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState('pending'); // pending, verified, rejected
  const [verificationProgress, setVerificationProgress] = useState(60);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const saved = await AsyncStorage.getItem('driver_documents');
      if (saved) {
        setDocuments(JSON.parse(saved));
      } else {
        // Initialize empty documents
        const initialDocs = {};
        Object.values(DOCUMENT_TYPES).forEach(docType => {
          initialDocs[docType.id] = {
            ...docType,
            status: DOCUMENT_STATUS.MISSING,
            file: null,
            uploadedAt: null,
            reviewedAt: null,
            rejectionReason: null,
            expiresAt: null,
          };
        });
        setDocuments(initialDocs);
      }

      // Load verification status
      const status = await AsyncStorage.getItem('driver_verification_status');
      setVerificationStatus(status || 'pending');
      
      // Calculate progress
      const approvedCount = Object.values(documents).filter(
        doc => doc.status === DOCUMENT_STATUS.APPROVED
      ).length;
      const totalRequired = Object.values(DOCUMENT_TYPES).filter(
        doc => doc.required
      ).length;
      setVerificationProgress(Math.round((approvedCount / totalRequired) * 100));
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const saveDocuments = async (updatedDocuments) => {
    try {
      await AsyncStorage.setItem('driver_documents', JSON.stringify(updatedDocuments));
      setDocuments(updatedDocuments);
      
      // Update progress
      const approvedCount = Object.values(updatedDocuments).filter(
        doc => doc.status === DOCUMENT_STATUS.APPROVED
      ).length;
      const totalRequired = Object.values(DOCUMENT_TYPES).filter(
        doc => doc.required
      ).length;
      setVerificationProgress(Math.round((approvedCount / totalRequired) * 100));
    } catch (error) {
      console.error('Error saving documents:', error);
    }
  };

  const handleUploadDocument = async (docType) => {
    try {
      // For images, use image picker
      if (docType.id.includes('photo')) {
        const options = {
          mediaType: 'photo',
          includeBase64: false,
          maxHeight: 2000,
          maxWidth: 2000,
        };

        ImagePicker.launchImageLibrary(options, async (response) => {
          if (response.didCancel) {
            console.log('User cancelled image picker');
          } else if (response.error) {
            Alert.alert('Error', 'Failed to pick image');
          } else {
            await processDocumentUpload(docType, response.assets[0]);
          }
        });
      } else {
        // For documents, use document picker
        const result = await DocumentPicker.pick({
          type: [DocumentPicker.types.images, DocumentPicker.types.pdf],
        });

        await processDocumentUpload(docType, result[0]);
      }
    } catch (error) {
      if (DocumentPicker.isCancel(error)) {
        console.log('User cancelled document picker');
      } else {
        Alert.alert('Error', 'Failed to pick document');
      }
    }
  };

  const processDocumentUpload = async (docType, file) => {
    try {
      setUploading(true);

      // Simulate upload process
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Update document status
      const updatedDocuments = {
        ...documents,
        [docType.id]: {
          ...documents[docType.id],
          file: {
            uri: file.uri,
            name: file.fileName || `document_${Date.now()}`,
            type: file.type,
            size: file.fileSize,
          },
          status: DOCUMENT_STATUS.PENDING,
          uploadedAt: new Date().toISOString(),
          reviewedAt: null,
          rejectionReason: null,
        },
      };

      await saveDocuments(updatedDocuments);

      Alert.alert(
        'Success',
        `${docType.title} uploaded successfully! It will be reviewed within 24-48 hours.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleViewDocument = (document) => {
    if (!document.file) {
      Alert.alert('No Document', 'Please upload a document first');
      return;
    }

    Alert.alert(
      'Document Options',
      'What would you like to do?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'View Details', onPress: () => viewDocumentDetails(document) },
        { text: 'Replace', onPress: () => handleUploadDocument(document) },
        { text: 'Delete', style: 'destructive', onPress: () => handleDeleteDocument(document) },
      ]
    );
  };

  const viewDocumentDetails = (document) => {
    navigation.navigate('DocumentPreview', { document });
  };

  const handleDeleteDocument = async (document) => {
    Alert.alert(
      'Delete Document',
      `Are you sure you want to delete your ${document.title}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedDocuments = {
              ...documents,
              [document.id]: {
                ...documents[document.id],
                file: null,
                status: DOCUMENT_STATUS.MISSING,
                uploadedAt: null,
              },
            };
            await saveDocuments(updatedDocuments);
          },
        },
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case DOCUMENT_STATUS.APPROVED:
        return '#22C55E';
      case DOCUMENT_STATUS.PENDING:
        return '#F59E0B';
      case DOCUMENT_STATUS.REJECTED:
        return '#EF4444';
      case DOCUMENT_STATUS.EXPIRED:
        return '#8B5CF6';
      default:
        return '#6B7280';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case DOCUMENT_STATUS.APPROVED:
        return 'Approved';
      case DOCUMENT_STATUS.PENDING:
        return 'Under Review';
      case DOCUMENT_STATUS.REJECTED:
        return 'Rejected';
      case DOCUMENT_STATUS.EXPIRED:
        return 'Expired';
      default:
        return 'Not Uploaded';
    }
  };

  const renderVerificationStatus = () => (
    <View style={styles.verificationCard}>
      <View style={styles.verificationHeader}>
        <View style={styles.verificationIcon}>
          <MaterialIcon 
            name={verificationStatus === 'verified' ? 'verified' : 'hourglass-empty'} 
            size={24} 
            color={verificationStatus === 'verified' ? '#22C55E' : '#F59E0B'} 
          />
        </View>
        <View style={styles.verificationInfo}>
          <Text style={styles.verificationTitle}>
            {verificationStatus === 'verified' ? 'Verified Driver' : 'Verification in Progress'}
          </Text>
          <Text style={styles.verificationSubtitle}>
            {verificationStatus === 'verified' 
              ? 'All documents approved ✅' 
              : `${verificationProgress}% complete`}
          </Text>
        </View>
      </View>
      
      {verificationStatus !== 'verified' && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill,
                { width: `${verificationProgress}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>{verificationProgress}%</Text>
        </View>
      )}
    </View>
  );

  const renderDocumentCard = (docType) => {
    const document = documents[docType.id];
    const statusColor = getStatusColor(document?.status);
    const statusText = getStatusText(document?.status);
    const hasFile = document?.file;

    return (
      <TouchableOpacity
        key={docType.id}
        style={styles.documentCard}
        onPress={() => handleViewDocument(document)}
        disabled={uploading}
      >
        <View style={styles.documentHeader}>
          <View style={[styles.documentIcon, { backgroundColor: `${statusColor}15` }]}>
            <MaterialCommunityIcon 
              name={docType.icon} 
              size={24} 
              color={statusColor} 
            />
          </View>
          
          <View style={styles.documentInfo}>
            <Text style={styles.documentTitle}>{docType.title}</Text>
            <Text style={styles.documentDescription}>{docType.description}</Text>
            
            {hasFile && document.uploadedAt && (
              <Text style={styles.documentDate}>
                Uploaded: {new Date(document.uploadedAt).toLocaleDateString()}
              </Text>
            )}
            
            {document?.rejectionReason && (
              <Text style={styles.rejectionReason}>
                {document.rejectionReason}
              </Text>
            )}
          </View>
          
          <View style={styles.documentStatus}>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {statusText}
              </Text>
            </View>
            
            {docType.required && (
              <Text style={styles.requiredBadge}>Required</Text>
            )}
          </View>
        </View>
        
        <View style={styles.documentActions}>
          {!hasFile || document.status === DOCUMENT_STATUS.REJECTED ? (
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => handleUploadDocument(docType)}
              disabled={uploading}
            >
              <MaterialIcon name="cloud-upload" size={20} color="#FFFFFF" />
              <Text style={styles.uploadButtonText}>
                {document.status === DOCUMENT_STATUS.REJECTED ? 'Re-upload' : 'Upload'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.viewButton}
              onPress={() => handleViewDocument(document)}
            >
              <MaterialIcon name="visibility" size={20} color="#3B82F6" />
              <Text style={styles.viewButtonText}>View</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderRequiredDocuments = () => {
    const requiredDocs = Object.values(DOCUMENT_TYPES).filter(doc => doc.required);
    
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Required Documents</Text>
          <Text style={styles.sectionCount}>
            {requiredDocs.length} documents
          </Text>
        </View>
        {requiredDocs.map(renderDocumentCard)}
      </View>
    );
  };

  const renderOptionalDocuments = () => {
    const optionalDocs = Object.values(DOCUMENT_TYPES).filter(doc => !doc.required);
    
    if (optionalDocs.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Optional Documents</Text>
          <Text style={styles.sectionSubtitle}>Increase your chances</Text>
        </View>
        {optionalDocs.map(renderDocumentCard)}
      </View>
    );
  };

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
        <Text style={styles.headerTitle}>My Documents</Text>
        <TouchableOpacity 
          style={styles.helpButton}
          onPress={() => navigation.navigate('DriverSupport')}
        >
          <MaterialIcon name="help-outline" size={24} color="#000000" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Verification Status */}
        {renderVerificationStatus()}

        {/* Required Documents */}
        {renderRequiredDocuments()}

        {/* Optional Documents */}
        {renderOptionalDocuments()}

        {/* Upload Tips */}
        <View style={styles.tipsCard}>
          <MaterialIcon name="lightbulb" size={24} color="#F59E0B" />
          <View style={styles.tipsContent}>
            <Text style={styles.tipsTitle}>Upload Tips</Text>
            <Text style={styles.tipsText}>
              • Ensure documents are clear and readable{'\n'}
              • Photos should be well-lit and in focus{'\n'}
              • File size should not exceed 5MB{'\n'}
              • Accepted formats: JPG, PNG, PDF{'\n'}
              • All documents must be valid and current
            </Text>
          </View>
        </View>

        {/* Contact Support */}
        <TouchableOpacity 
          style={styles.supportCard}
          onPress={() => navigation.navigate('DriverSupport')}
        >
          <MaterialIcon name="support-agent" size={24} color="#3B82F6" />
          <View style={styles.supportContent}>
            <Text style={styles.supportTitle}>Need Help?</Text>
            <Text style={styles.supportText}>
              Contact our verification team for assistance with document uploads
            </Text>
          </View>
          <MaterialIcon name="chevron-right" size={24} color="#6B7280" />
        </TouchableOpacity>
      </ScrollView>

      {/* Uploading Overlay */}
      {uploading && (
        <View style={styles.uploadingOverlay}>
          <View style={styles.uploadingContainer}>
            <MaterialIcon name="cloud-upload" size={48} color="#22C55E" />
            <Text style={styles.uploadingText}>Uploading document...</Text>
          </View>
        </View>
      )}
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
  helpButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  verificationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  verificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  verificationIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F0F9F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  verificationInfo: {
    flex: 1,
  },
  verificationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  verificationSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#22C55E',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22C55E',
    minWidth: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  sectionCount: {
    fontSize: 14,
    color: '#666',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  documentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  documentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  documentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  documentInfo: {
    flex: 1,
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  documentDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  documentDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  rejectionReason: {
    fontSize: 12,
    color: '#EF4444',
    fontStyle: 'italic',
    marginTop: 4,
  },
  documentStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  requiredBadge: {
    fontSize: 10,
    color: '#EF4444',
    fontWeight: '500',
  },
  documentActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22C55E',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  tipsCard: {
    flexDirection: 'row',
    backgroundColor: '#FEFCE8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  tipsContent: {
    flex: 1,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  tipsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  supportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  supportContent: {
    flex: 1,
    marginHorizontal: 12,
  },
  supportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  supportText: {
    fontSize: 14,
    color: '#666',
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  uploadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginTop: 16,
  },
});