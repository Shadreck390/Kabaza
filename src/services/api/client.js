// src/services/api/utils.js - API utilities
import api from './client';

const apiUtils = {
  // File upload
  uploadFile: (file, endpoint, onProgress = null) => {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      type: file.type || 'image/jpeg',
      name: file.name || `upload_${Date.now()}.jpg`,
    });
    
    return api.post(endpoint, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    });
  },
  
  // Multiple files upload
  uploadMultipleFiles: (files, endpoint, onProgress = null) => {
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append(`files[${index}]`, {
        uri: file.uri,
        type: file.type,
        name: file.name || `file_${index}_${Date.now()}.${file.type.split('/')[1]}`,
      });
    });
    
    return api.post(endpoint, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    });
  },
  
  // Cancel token
  createCancelToken: () => axios.CancelToken.source(),
  
  // Check if error is cancellation
  isCancel: (error) => axios.isCancel(error),
  
  // Set base URL
  setBaseURL: (url) => {
    api.defaults.baseURL = url;
  },
  
  // Set auth token
  setAuthToken: (token) => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  },
  
  // Clear token
  clearToken: () => {
    delete api.defaults.headers.common['Authorization'];
  },
  
  // Get base URL
  getBaseURL: () => api.defaults.baseURL,
};

export default apiUtils;