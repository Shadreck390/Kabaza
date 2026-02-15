// src/components/CameraView.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { RNCamera } from 'react-native-camera';
import * as ImagePicker from 'react-native-image-picker';

const { width, height } = Dimensions.get('window');

const CameraView = ({
  visible = false,
  onClose = () => {},
  onPhotoCaptured = () => {},
  title = 'Take Photo',
  subtitle = 'Position document clearly within frame',
  type = 'document', // 'document', 'vehicle', 'profile', 'license'
  allowGallery = true,
  flashMode = 'auto',
  aspectRatio = '4:3',
}) => {
  const [cameraType, setCameraType] = useState(RNCamera.Constants.Type.back);
  const [flash, setFlash] = useState(RNCamera.Constants.FlashMode[flashMode]);
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const cameraRef = useRef(null);

  useEffect(() => {
    if (visible) {
      requestCameraPermission();
    }
  }, [visible]);

  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'Kabaza needs access to your camera to take photos.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        setHasPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
      } catch (err) {
        console.error('Permission error:', err);
        setHasPermission(false);
      }
    } else {
      // iOS permissions are handled by react-native-camera
      setHasPermission(true);
    }
  };

  const toggleCameraType = () => {
    setCameraType(
      cameraType === RNCamera.Constants.Type.back
        ? RNCamera.Constants.Type.front
        : RNCamera.Constants.Type.back
    );
  };

  const toggleFlash = () => {
    const flashModes = [
      RNCamera.Constants.FlashMode.off,
      RNCamera.Constants.FlashMode.on,
      RNCamera.Constants.FlashMode.auto,
      RNCamera.Constants.FlashMode.torch,
    ];
    const currentIndex = flashModes.indexOf(flash);
    const nextIndex = (currentIndex + 1) % flashModes.length;
    setFlash(flashModes[nextIndex]);
  };

  const takePicture = async () => {
    if (cameraRef.current && !isRecording) {
      setIsLoading(true);
      try {
        const options = {
          quality: 0.8,
          base64: true,
          width: 1200,
          fixOrientation: true,
          forceUpOrientation: true,
        };

        const data = await cameraRef.current.takePictureAsync(options);

        if (data) {
          onPhotoCaptured({
            uri: data.uri,
            base64: data.base64,
            width: data.width,
            height: data.height,
            type: 'image/jpeg',
            fileName: `photo_${Date.now()}.jpg`,
          });
        }
      } catch (error) {
        console.error('Error taking picture:', error);
        Alert.alert('Error', 'Failed to take photo. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const pickFromGallery = async () => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 1200,
      maxHeight: 1200,
      includeBase64: true,
      selectionLimit: 1,
    };

    try {
      const response = await ImagePicker.launchImageLibrary(options);

      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.error) {
        console.error('ImagePicker Error: ', response.error);
        Alert.alert('Error', 'Failed to pick image from gallery.');
      } else if (response.assets && response.assets.length > 0) {
        const asset = response.assets[0];
        onPhotoCaptured({
          uri: asset.uri,
          base64: asset.base64,
          width: asset.width,
          height: asset.height,
          type: asset.type || 'image/jpeg',
          fileName: asset.fileName || `gallery_${Date.now()}.jpg`,
        });
      }
    } catch (error) {
      console.error('Gallery pick error:', error);
      Alert.alert('Error', 'Failed to access gallery.');
    }
  };

  const getFlashIcon = () => {
    switch (flash) {
      case RNCamera.Constants.FlashMode.off:
        return 'flash-off';
      case RNCamera.Constants.FlashMode.on:
        return 'flash-on';
      case RNCamera.Constants.FlashMode.auto:
        return 'flash-auto';
      case RNCamera.Constants.FlashMode.torch:
        return 'highlight';
      default:
        return 'flash-auto';
    }
  };

  const getGuideFrame = () => {
    const guideStyles = {
      document: {
        width: width * 0.8,
        height: height * 0.4,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#00ff00',
        borderStyle: 'dashed',
        position: 'absolute',
        top: height * 0.3,
        left: width * 0.1,
        backgroundColor: 'transparent',
      },
      vehicle: {
        width: width * 0.9,
        height: height * 0.3,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#ffff00',
        borderStyle: 'dashed',
        position: 'absolute',
        top: height * 0.35,
        left: width * 0.05,
        backgroundColor: 'transparent',
      },
      profile: {
        width: 200,
        height: 200,
        borderRadius: 100,
        borderWidth: 2,
        borderColor: '#ff00ff',
        borderStyle: 'dashed',
        position: 'absolute',
        top: height * 0.25,
        left: (width - 200) / 2,
        backgroundColor: 'transparent',
      },
      license: {
        width: width * 0.7,
        height: height * 0.2,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#00ffff',
        borderStyle: 'dashed',
        position: 'absolute',
        top: height * 0.4,
        left: width * 0.15,
        backgroundColor: 'transparent',
      },
    };

    return guideStyles[type] || guideStyles.document;
  };

  const getTypeInstructions = () => {
    const instructions = {
      document: 'Ensure document is fully visible and well-lit',
      vehicle: 'Capture entire vehicle including license plate',
      profile: 'Position face within the circle frame',
      license: 'Capture entire driver\'s license clearly',
    };

    return instructions[type] || instructions.document;
  };

  if (!visible) return null;

  if (hasPermission === false) {
    return (
      <Modal visible={visible} transparent={true} animationType="slide">
        <View style={styles.permissionContainer}>
          <View style={styles.permissionContent}>
            <Icon name="camera" size={60} color="#FF6B6B" />
            <Text style={styles.permissionTitle}>Camera Access Required</Text>
            <Text style={styles.permissionText}>
              Please enable camera access in your device settings to use this feature.
            </Text>
            <TouchableOpacity style={styles.permissionButton} onPress={onClose}>
              <Text style={styles.permissionButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent={true} animationType="slide">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Icon name="times" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{title}</Text>
            <Text style={styles.headerSubtitle}>{getTypeInstructions()}</Text>
          </View>
          <View style={styles.headerRight} />
        </View>

        {/* Camera Preview */}
        <View style={styles.cameraContainer}>
          {hasPermission === true ? (
            <RNCamera
              ref={cameraRef}
              style={styles.cameraPreview}
              type={cameraType}
              flashMode={flash}
              captureAudio={false}
              androidCameraPermissionOptions={{
                title: 'Permission to use camera',
                message: 'We need your permission to use your camera',
                buttonPositive: 'Ok',
                buttonNegative: 'Cancel',
              }}
              ratio={aspectRatio}
            >
              {/* Guide Frame */}
              <View style={getGuideFrame()} />
              
              {/* Instructions Overlay */}
              <View style={styles.instructionsOverlay}>
                <Text style={styles.instructionsText}>
                  {subtitle}
                </Text>
              </View>
            </RNCamera>
          ) : (
            <View style={styles.loadingCamera}>
              <ActivityIndicator size="large" color="#00B894" />
              <Text style={styles.loadingText}>Initializing camera...</Text>
            </View>
          )}
        </View>

        {/* Controls */}
        <View style={styles.controlsContainer}>
          {/* Left Controls */}
          <View style={styles.leftControls}>
            {allowGallery && (
              <TouchableOpacity 
                style={styles.galleryButton} 
                onPress={pickFromGallery}
                disabled={isLoading}
              >
                <Icon name="photo" size={24} color="#fff" />
              </TouchableOpacity>
            )}
          </View>

          {/* Center Controls - Capture Button */}
          <View style={styles.centerControls}>
            <TouchableOpacity
              style={[styles.captureButton, isLoading && styles.captureButtonDisabled]}
              onPress={takePicture}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <View style={styles.captureButtonInner} />
              )}
            </TouchableOpacity>
          </View>

          {/* Right Controls */}
          <View style={styles.rightControls}>
            <TouchableOpacity 
              style={styles.flashButton} 
              onPress={toggleFlash}
              disabled={isLoading}
            >
              <Icon name={getFlashIcon()} size={24} color="#fff" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.switchButton} 
              onPress={toggleCameraType}
              disabled={isLoading}
            >
              <Icon name="refresh" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            • Hold steady for clear photo
          </Text>
          <Text style={styles.infoText}>
            • Ensure good lighting
          </Text>
          <Text style={styles.infoText}>
            • Avoid glare and shadows
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    width: '90%',
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  permissionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: '#00B894',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 12,
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  closeButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraPreview: {
    flex: 1,
  },
  loadingCamera: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    fontSize: 16,
    color: '#fff',
    marginTop: 20,
  },
  instructionsOverlay: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionsText: {
    fontSize: 16,
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    textAlign: 'center',
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 30,
    paddingVertical: 30,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  leftControls: {
    flex: 1,
    alignItems: 'flex-start',
  },
  centerControls: {
    flex: 1,
    alignItems: 'center',
  },
  rightControls: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 20,
  },
  galleryButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flashButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  captureButtonDisabled: {
    opacity: 0.6,
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: '#000',
  },
  infoContainer: {
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  infoText: {
    fontSize: 12,
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 4,
  },
});

export default CameraView;