// src/utils/iconUtils.js - PRODUCTION READY ICON SYSTEM
import React from 'react';
import { View, Text } from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicon from 'react-native-vector-icons/Ionicons';

// Comprehensive icon mapping with multiple fallbacks
const ICON_MAP = {
  // Location & Navigation
  'location': { 
    material: 'location-on', 
    fa: 'map-marker', 
    community: 'map-marker', 
    ion: 'location' 
  },
  'calendar-month': {
    material: 'calendar-view-month',
    fa: 'calendar',
    community: 'calendar',
    ion: 'calendar' 
  },
  'location-pin': { 
    material: 'location-pin', 
    fa: 'map-pin', 
    community: 'map-marker', 
    ion: 'location' 
  },
  'circle': { 
    material: 'circle', 
    fa: 'circle', 
    community: 'circle', 
    ion: 'ellipse' 
  },
  'radio-button-checked': { 
    material: 'radio-button-checked', 
    fa: 'dot-circle', 
    community: 'radiobox-marked', 
    ion: 'radio-button-on' 
  },
  'radio-button-unchecked': { 
    material: 'radio-button-unchecked', 
    fa: 'circle-thin', 
    community: 'radiobox-blank', 
    ion: 'radio-button-off' 
  },
  'directions-car': { 
    material: 'directions-car', 
    fa: 'car', 
    community: 'car', 
    ion: 'car' 
  },
  'map': { 
    material: 'map', 
    fa: 'map', 
    community: 'map', 
    ion: 'map' 
  },

  'label': { 
  material: 'local-offer', 
  fa: 'tag', 
  community: 'tag', 
  ion: 'pricetag' 
},

  'calendar-month': { 
  material: 'calendar-today',  // Fallback to calendar-today
  fa: 'calendar', 
  community: 'calendar-month', 
  ion: 'calendar' 
},
  
  // Actions & Status
  'star': { 
    material: 'star', 
    fa: 'star', 
    community: 'star', 
    ion: 'star' 
  },
  'check': { 
    material: 'check', 
    fa: 'check', 
    community: 'check', 
    ion: 'checkmark' 
  },
  'close': { 
    material: 'close', 
    fa: 'times', 
    community: 'close', 
    ion: 'close' 
  },
  'check-circle': { 
    material: 'check-circle', 
    fa: 'check-circle', 
    community: 'check-circle', 
    ion: 'checkmark-circle' 
  },
  'clock-o': { 
    material: 'schedule', 
    fa: 'clock-o', 
    community: 'clock-outline', 
    ion: 'time' 
  },
  'clock': { 
    material: 'schedule', 
    fa: 'clock-o', 
    community: 'clock-outline', 
    ion: 'time' 
  },
  
  // Communication
  'phone': { 
    material: 'phone', 
    fa: 'phone', 
    community: 'phone', 
    ion: 'call' 
  },
  'email': { 
    material: 'email', 
    fa: 'envelope', 
    community: 'email', 
    ion: 'mail' 
  },
  'notifications': { 
    material: 'notifications', 
    fa: 'bell', 
    community: 'bell', 
    ion: 'notifications' 
  },
  'bell': { 
    material: 'notifications', 
    fa: 'bell', 
    community: 'bell', 
    ion: 'notifications' 
  },
  
  // Payment & Money
  'money': { 
    material: 'attach-money', 
    fa: 'money', 
    community: 'cash', 
    ion: 'cash' 
  },
  'credit-card': { 
    material: 'credit-card', 
    fa: 'credit-card', 
    community: 'credit-card', 
    ion: 'card' 
  },
  'wallet': { 
    material: 'account-balance-wallet', 
    fa: 'wallet', 
    community: 'wallet', 
    ion: 'wallet' 
  },
  'mobile': { 
    material: 'smartphone', 
    fa: 'mobile', 
    community: 'cellphone', 
    ion: 'phone-portrait' 
  },
  'cc-visa': { 
    material: 'credit-card', 
    fa: 'cc-visa', 
    community: 'credit-card', 
    ion: 'card' 
  },
  
  // User & Profile
  'person': { 
    material: 'person', 
    fa: 'user', 
    community: 'account', 
    ion: 'person' 
  },
  'user': { 
    material: 'person', 
    fa: 'user', 
    community: 'account', 
    ion: 'person' 
  },
  'people': { 
    material: 'people', 
    fa: 'users', 
    community: 'account-group', 
    ion: 'people' 
  },
  'account': { 
    material: 'account-circle', 
    fa: 'user-circle', 
    community: 'account-circle', 
    ion: 'person-circle' 
  },
  
  // Media & Files
  'camera': { 
    material: 'camera-alt', 
    fa: 'camera', 
    community: 'camera', 
    ion: 'camera' 
  },
  'photo': { 
    material: 'photo', 
    fa: 'image', 
    community: 'image', 
    ion: 'image' 
  },
  'image': { 
    material: 'image', 
    fa: 'image', 
    community: 'image', 
    ion: 'image' 
  },
  'document': { 
    material: 'description', 
    fa: 'file', 
    community: 'file-document', 
    ion: 'document' 
  },
  'folder': { 
    material: 'folder', 
    fa: 'folder', 
    community: 'folder', 
    ion: 'folder' 
  },
  
  // Vehicle Types
  'car': { 
    material: 'directions-car', 
    fa: 'car', 
    community: 'car', 
    ion: 'car' 
  },
  'motorcycle': { 
    material: 'motorcycle', 
    fa: 'motorcycle', 
    community: 'motorcycle', 
    ion: 'bicycle' 
  },
  'rickshaw': { 
    material: 'airport-shuttle', 
    fa: 'truck', 
    community: 'bus', 
    ion: 'bus' 
  },
  'car-suv': { 
    material: 'airport-shuttle', 
    fa: 'car', 
    community: 'car', 
    ion: 'car-sport' 
  },
  'van-passenger': { 
    material: 'airport-shuttle', 
    fa: 'van-shuttle', 
    community: 'bus', 
    ion: 'bus' 
  },
  
  // Time & Schedule
  'schedule': { 
    material: 'schedule', 
    fa: 'calendar', 
    community: 'calendar', 
    ion: 'calendar' 
  },
  'calendar': { 
    material: 'event', 
    fa: 'calendar', 
    community: 'calendar', 
    ion: 'calendar' 
  },
  'access-time': { 
    material: 'access-time', 
    fa: 'clock-o', 
    community: 'clock-outline', 
    ion: 'time' 
  },
  
  // Settings & Actions
  'confirmation-number': { 
    material: 'pin', 
    fa: 'hashtag', 
    community: 'numeric', 
    ion: 'pricetag' 
  },
  'verified-user': { 
    material: 'verified-user', 
    fa: 'user-check', 
    community: 'account-check', 
    ion: 'person-checkmark' 
  },
  'support-agent': { 
    material: 'support-agent', 
    fa: 'headset', 
    community: 'account-tie', 
    ion: 'help-circle' 
  },
  'my-location': { 
    material: 'my-location', 
    fa: 'location-arrow', 
    community: 'map-marker', 
    ion: 'locate' 
  },
  'place': { 
    material: 'place', 
    fa: 'map-marker-alt', 
    community: 'map-marker', 
    ion: 'location' 
  },
  'settings': { 
    material: 'settings', 
    fa: 'cog', 
    community: 'cog', 
    ion: 'settings' 
  },
  'edit': { 
    material: 'edit', 
    fa: 'edit', 
    community: 'pencil', 
    ion: 'create' 
  },
  'delete': { 
    material: 'delete', 
    fa: 'trash', 
    community: 'delete', 
    ion: 'trash' 
  },
  'add': { 
    material: 'add', 
    fa: 'plus', 
    community: 'plus', 
    ion: 'add' 
  },
  'remove': { 
    material: 'remove', 
    fa: 'minus', 
    community: 'minus', 
    ion: 'remove' 
  },
  'search': { 
    material: 'search', 
    fa: 'search', 
    community: 'magnify', 
    ion: 'search' 
  },
  'filter': { 
    material: 'filter-list', 
    fa: 'filter', 
    community: 'filter', 
    ion: 'funnel' 
  },
  
  // Navigation & UI
  'menu': { 
    material: 'menu', 
    fa: 'bars', 
    community: 'menu', 
    ion: 'menu' 
  },
  'home': { 
    material: 'home', 
    fa: 'home', 
    community: 'home', 
    ion: 'home' 
  },
  'back': { 
    material: 'arrow-back', 
    fa: 'arrow-left', 
    community: 'arrow-left', 
    ion: 'arrow-back' 
  },
  'forward': { 
    material: 'arrow-forward', 
    fa: 'arrow-right', 
    community: 'arrow-right', 
    ion: 'arrow-forward' 
  },
  'up': { 
    material: 'arrow-upward', 
    fa: 'arrow-up', 
    community: 'arrow-up', 
    ion: 'arrow-up' 
  },
  'down': { 
    material: 'arrow-downward', 
    fa: 'arrow-down', 
    community: 'arrow-down', 
    ion: 'arrow-down' 
  },
  'chevron-right': { 
    material: 'chevron-right', 
    fa: 'chevron-right', 
    community: 'chevron-right', 
    ion: 'chevron-forward' 
  },
  'chevron-left': { 
    material: 'chevron-left', 
    fa: 'chevron-left', 
    community: 'chevron-left', 
    ion: 'chevron-back' 
  },
  'more-horiz': { 
    material: 'more-horiz', 
    fa: 'ellipsis-h', 
    community: 'dots-horizontal', 
    ion: 'ellipsis-horizontal' 
  },
  'more-vert': { 
    material: 'more-vert', 
    fa: 'ellipsis-v', 
    community: 'dots-vertical', 
    ion: 'ellipsis-vertical' 
  },
  
  // Status & States
  'warning': { 
    material: 'warning', 
    fa: 'exclamation-triangle', 
    community: 'alert', 
    ion: 'warning' 
  },
  'error': { 
    material: 'error', 
    fa: 'exclamation-circle', 
    community: 'alert-circle', 
    ion: 'alert-circle' 
  },
  'info': { 
    material: 'info', 
    fa: 'info-circle', 
    community: 'information', 
    ion: 'information-circle' 
  },
  'success': { 
    material: 'check-circle', 
    fa: 'check-circle', 
    community: 'check-circle', 
    ion: 'checkmark-circle' 
  },
  
  // Social & Sharing
  'share': { 
    material: 'share', 
    fa: 'share', 
    community: 'share', 
    ion: 'share' 
  },
  'favorite': { 
    material: 'favorite', 
    fa: 'heart', 
    community: 'heart', 
    ion: 'heart' 
  },
  'bookmark': { 
    material: 'bookmark', 
    fa: 'bookmark', 
    community: 'bookmark', 
    ion: 'bookmark' 
  },
  'thumb-up': { 
    material: 'thumb-up', 
    fa: 'thumbs-up', 
    community: 'thumb-up', 
    ion: 'thumbs-up' 
  },
  'thumb-down': { 
    material: 'thumb-down', 
    fa: 'thumbs-down', 
    community: 'thumb-down', 
    ion: 'thumbs-down' 
  },
  
  // Document Specific Icons
  'license': { 
    material: 'credit-card', 
    fa: 'id-card', 
    community: 'card', 
    ion: 'card' 
  },
  'nrc': { 
    material: 'badge', 
    fa: 'id-card', 
    community: 'badge', 
    ion: 'card' 
  },
  'vehicle-registration': { 
    material: 'directions-car', 
    fa: 'car', 
    community: 'car', 
    ion: 'car' 
  },
  'insurance': { 
    material: 'description', 
    fa: 'file-text', 
    community: 'file-document', 
    ion: 'document' 
  },
  'profile-photo': { 
    material: 'account-circle', 
    fa: 'user-circle', 
    community: 'account-circle', 
    ion: 'person-circle' 
  },
  
  // Package & Delivery
  'package': { 
    material: 'local-shipping', 
    fa: 'box', 
    community: 'package', 
    ion: 'cube' 
  },
  'delivery': { 
    material: 'local-shipping', 
    fa: 'truck', 
    community: 'truck', 
    ion: 'truck' 
  },
  'tracking': { 
    material: 'gps-fixed', 
    fa: 'location-arrow', 
    community: 'map-marker', 
    ion: 'location' 
  },
  
  // Security & Safety
  'lock': { 
    material: 'lock', 
    fa: 'lock', 
    community: 'lock', 
    ion: 'lock-closed' 
  },
  'unlock': { 
    material: 'lock-open', 
    fa: 'unlock', 
    community: 'lock-open', 
    ion: 'lock-open' 
  },
  'security': { 
    material: 'security', 
    fa: 'shield', 
    community: 'shield', 
    ion: 'shield-checkmark' 
  },
  'privacy': { 
    material: 'privacy-tip', 
    fa: 'user-secret', 
    community: 'shield-account', 
    ion: 'shield' 
  },
  
  // Emergency
  'sos': { 
    material: 'warning', 
    fa: 'exclamation-triangle', 
    community: 'alert', 
    ion: 'warning' 
  },
  'emergency': { 
    material: 'emergency', 
    fa: 'ambulance', 
    community: 'ambulance', 
    ion: 'medkit' 
  },
  'help': { 
    material: 'help', 
    fa: 'question-circle', 
    community: 'help-circle', 
    ion: 'help-circle' 
  },
  'support': { 
    material: 'support-agent', 
    fa: 'headset', 
    community: 'headset', 
    ion: 'headset' 
  },
  'local-offer': { 
    material: 'local-offer', 
    fa: 'tag', 
    community: 'tag', 
    ion: 'pricetag' 
  },
  'airplanemode-active': { 
    material: 'flight', 
    fa: 'plane', 
    community: 'airplane', 
    ion: 'airplane' 
  },
  'account-balance': { 
    material: 'account-balance', 
    fa: 'university', 
    community: 'bank', 
    ion: 'business' 
  },
  'refresh': { 
    material: 'refresh', 
    fa: 'sync', 
    community: 'refresh', 
    ion: 'refresh' 
  },
  'flight': { 
    material: 'flight', 
    fa: 'plane', 
    community: 'airplane', 
    ion: 'airplane' 
  },
  'shopping-mall': { 
    material: 'store', 
    fa: 'shopping-bag', 
    community: 'store', 
    ion: 'storefront' 
  },
  'stadium': { 
    material: 'stadium', 
    fa: 'building', 
    community: 'stadium', 
    ion: 'business' 
  },
  'hotel': { 
    material: 'hotel', 
    fa: 'bed', 
    community: 'hotel', 
    ion: 'bed' 
  },
  'swap-vert': { 
    material: 'swap-vert', 
    fa: 'exchange-alt', 
    community: 'swap-vertical', 
    ion: 'swap-vertical' 
  },
  'calendar-today': { 
    material: 'calendar-today', 
    fa: 'calendar-day', 
    community: 'calendar-today', 
    ion: 'calendar' 
  },
  'speed': { 
    material: 'speed', 
    fa: 'tachometer-alt', 
    community: 'speedometer', 
    ion: 'speedometer' 
  },
  'car-rental': { 
    material: 'airport-shuttle', 
    fa: 'car', 
    community: 'car', 
    ion: 'car' 
  },
  'eco': { 
    material: 'eco', 
    fa: 'leaf', 
    community: 'leaf', 
    ion: 'leaf' 
  },
  'event': { 
    material: 'event', 
    fa: 'calendar', 
    community: 'calendar', 
    ion: 'calendar' 
  },
  'repeat': { 
    material: 'repeat', 
    fa: 'redo', 
    community: 'repeat', 
    ion: 'refresh' 
  },
  'arrow-forward': { 
    material: 'arrow-forward', 
    fa: 'arrow-right', 
    community: 'arrow-right', 
    ion: 'arrow-forward' 
  },
  'arrow-back': { 
    material: 'arrow-back', 
    fa: 'arrow-left', 
    community: 'arrow-left', 
    ion: 'arrow-back' 
  },
  'attach-money': { 
    material: 'attach-money', 
    fa: 'dollar-sign', 
    community: 'cash', 
    ion: 'cash' 
  },
  'history': { 
    material: 'history', 
    fa: 'history', 
    community: 'history', 
    ion: 'time' 
  },
  'directions-bike': { 
    material: 'directions-bike', 
    fa: 'bicycle', 
    community: 'bicycle', 
    ion: 'bicycle' 
  },
  'local-shipping': { 
    material: 'local-shipping', 
    fa: 'truck', 
    community: 'truck', 
    ion: 'truck' 
  },
  'warning': { 
    material: 'warning', 
    fa: 'exclamation-triangle', 
    community: 'alert', 
    ion: 'warning' 
  },
  'check-circle': { 
    material: 'check-circle', 
    fa: 'check-circle', 
    community: 'check-circle', 
    ion: 'checkmark-circle' 
  },
  'location-on': { 
    material: 'location-on', 
    fa: 'map-marker', 
    community: 'map-marker', 
    ion: 'location' 
  },
  'gps-fixed': { 
    material: 'gps-fixed', 
    fa: 'location-arrow', 
    community: 'map-marker', 
    ion: 'location' 
  },
  'schedule': { 
    material: 'schedule', 
    fa: 'clock', 
    community: 'clock-outline', 
    ion: 'time' 
  },
  'access-time': { 
    material: 'access-time', 
    fa: 'clock', 
    community: 'clock-outline', 
    ion: 'time' 
  },
  'account-balance-wallet': { 
    material: 'account-balance-wallet', 
    fa: 'wallet', 
    community: 'wallet', 
    ion: 'wallet' 
  },
  'credit-card': { 
    material: 'credit-card', 
    fa: 'credit-card', 
    community: 'credit-card', 
    ion: 'card' 
  },
  'description': { 
    material: 'description', 
    fa: 'file-alt', 
    community: 'file-document', 
    ion: 'document' 
  },
  'privacy-tip': { 
    material: 'privacy-tip', 
    fa: 'user-secret', 
    community: 'shield-account', 
    ion: 'shield' 
  },
  'security': { 
    material: 'security', 
    fa: 'shield', 
    community: 'shield-checkmark', 
    ion: 'shield-checkmark' 
  },
  'lock': { 
    material: 'lock', 
    fa: 'lock', 
    community: 'lock', 
    ion: 'lock-closed' 
  },
  'lock-open': { 
    material: 'lock-open', 
    fa: 'unlock', 
    community: 'lock-open', 
    ion: 'lock-open' 
  },
  'notifications': { 
    material: 'notifications', 
    fa: 'bell', 
    community: 'bell', 
    ion: 'notifications' 
  },
  'favorite': { 
    material: 'favorite', 
    fa: 'heart', 
    community: 'heart', 
    ion: 'heart' 
  },
  'star': { 
    material: 'star', 
    fa: 'star', 
    community: 'star', 
    ion: 'star' 
  },
  'settings': { 
    material: 'settings', 
    fa: 'cog', 
    community: 'cog', 
    ion: 'settings' 
  },
  'menu': { 
    material: 'menu', 
    fa: 'bars', 
    community: 'menu', 
    ion: 'menu' 
  },
  'home': { 
    material: 'home', 
    fa: 'home', 
    community: 'home', 
    ion: 'home' 
  },
  'edit': { 
    material: 'edit', 
    fa: 'edit', 
    community: 'pencil', 
    ion: 'create' 
  },
  'delete': { 
    material: 'delete', 
    fa: 'trash', 
    community: 'delete', 
    ion: 'trash' 
  },
  'add': { 
    material: 'add', 
    fa: 'plus', 
    community: 'plus', 
    ion: 'add' 
  },
  'remove': { 
    material: 'remove', 
    fa: 'minus', 
    community: 'minus', 
    ion: 'remove' 
  },
  'search': { 
    material: 'search', 
    fa: 'search', 
    community: 'magnify', 
    ion: 'search' 
  },
  'filter-list': { 
    material: 'filter-list', 
    fa: 'filter', 
    community: 'filter', 
    ion: 'funnel' 
  },
  'more-horiz': { 
    material: 'more-horiz', 
    fa: 'ellipsis-h', 
    community: 'dots-horizontal', 
    ion: 'ellipsis-horizontal' 
  },
  'more-vert': { 
    material: 'more-vert', 
    fa: 'ellipsis-v', 
    community: 'dots-vertical', 
    ion: 'ellipsis-vertical' 
  },
  'chevron-right': { 
    material: 'chevron-right', 
    fa: 'chevron-right', 
    community: 'chevron-right', 
    ion: 'chevron-forward' 
  },
  'chevron-left': { 
    material: 'chevron-left', 
    fa: 'chevron-left', 
    community: 'chevron-left', 
    ion: 'chevron-back' 
  },
  'arrow-upward': { 
    material: 'arrow-upward', 
    fa: 'arrow-up', 
    community: 'arrow-up', 
    ion: 'arrow-up' 
  },
  'arrow-downward': { 
    material: 'arrow-downward', 
    fa: 'arrow-down', 
    community: 'arrow-down', 
    ion: 'arrow-down' 
  },
  'arrow-up': { 
    material: 'arrow-upward', 
    fa: 'arrow-up', 
    community: 'arrow-up', 
    ion: 'arrow-up' 
  },
  'arrow-down': { 
    material: 'arrow-downward', 
    fa: 'arrow-down', 
    community: 'arrow-down', 
    ion: 'arrow-down' 
  },
  'arrow-left': { 
    material: 'arrow-back', 
    fa: 'arrow-left', 
    community: 'arrow-left', 
    ion: 'arrow-back' 
  },
  'arrow-right': { 
    material: 'arrow-forward', 
    fa: 'arrow-right', 
    community: 'arrow-right', 
    ion: 'arrow-forward' 
  },
  'circle': { 
    material: 'circle', 
    fa: 'circle', 
    community: 'circle', 
    ion: 'ellipse' 
  },
  'check': { 
    material: 'check', 
    fa: 'check', 
    community: 'check', 
    ion: 'checkmark' 
  },
  'close': { 
    material: 'close', 
    fa: 'times', 
    community: 'close', 
    ion: 'close' 
  },
  'person': { 
    material: 'person', 
    fa: 'user', 
    community: 'account', 
    ion: 'person' 
  },
  'people': { 
    material: 'people', 
    fa: 'users', 
    community: 'account-group', 
    ion: 'people' 
  },
  'account-circle': { 
    material: 'account-circle', 
    fa: 'user-circle', 
    community: 'account-circle', 
    ion: 'person-circle' 
  },
  'phone': { 
    material: 'phone', 
    fa: 'phone', 
    community: 'phone', 
    ion: 'call' 
  },
  'email': { 
    material: 'email', 
    fa: 'envelope', 
    community: 'email', 
    ion: 'mail' 
  },
  'share': { 
    material: 'share', 
    fa: 'share', 
    community: 'share', 
    ion: 'share' 
  },
  'bookmark': { 
    material: 'bookmark', 
    fa: 'bookmark', 
    community: 'bookmark', 
    ion: 'bookmark' 
  },
  'thumb-up': { 
    material: 'thumb-up', 
    fa: 'thumbs-up', 
    community: 'thumb-up', 
    ion: 'thumbs-up' 
  },
  'thumb-down': { 
    material: 'thumb-down', 
    fa: 'thumbs-down', 
    community: 'thumb-down', 
    ion: 'thumbs-down' 
  },
  'camera-alt': { 
    material: 'camera-alt', 
    fa: 'camera', 
    community: 'camera', 
    ion: 'camera' 
  },
  'photo': { 
    material: 'photo', 
    fa: 'image', 
    community: 'image', 
    ion: 'image' 
  },
  'image': { 
    material: 'image', 
    fa: 'image', 
    community: 'image', 
    ion: 'image' 
  },
  'folder': { 
    material: 'folder', 
    fa: 'folder', 
    community: 'folder', 
    ion: 'folder' 
  },
  'directions-car': { 
    material: 'directions-car', 
    fa: 'car', 
    community: 'car', 
    ion: 'car' 
  },
  'motorcycle': { 
    material: 'motorcycle', 
    fa: 'motorcycle', 
    community: 'motorcycle', 
    ion: 'bicycle' 
  },
  'airport-shuttle': { 
    material: 'airport-shuttle', 
    fa: 'shuttle-van', 
    community: 'bus', 
    ion: 'bus' 
  },
  'map': { 
    material: 'map', 
    fa: 'map', 
    community: 'map', 
    ion: 'map' 
  },
  'location-pin': { 
    material: 'location-pin', 
    fa: 'map-pin', 
    community: 'map-marker', 
    ion: 'location' 
  },
  'smartphone': { 
    material: 'smartphone', 
    fa: 'mobile', 
    community: 'cellphone', 
    ion: 'phone-portrait' 
  },
  'badge': { 
    material: 'badge', 
    fa: 'id-card', 
    community: 'badge', 
    ion: 'card' 
  },
  'cash': { 
    material: 'attach-money', 
    fa: 'money', 
    community: 'cash', 
    ion: 'cash' 
  },
  'card': { 
    material: 'credit-card', 
    fa: 'credit-card', 
    community: 'credit-card', 
    ion: 'card' 
  },
  'file-document': { 
    material: 'description', 
    fa: 'file-alt', 
    community: 'file-document', 
    ion: 'document' 
  },
  'package': { 
    material: 'local-shipping', 
    fa: 'box', 
    community: 'package', 
    ion: 'cube' 
  },
  'truck': { 
    material: 'local-shipping', 
    fa: 'truck', 
    community: 'truck', 
    ion: 'truck' 
  },
  'ambulance': { 
    material: 'emergency', 
    fa: 'ambulance', 
    community: 'ambulance', 
    ion: 'medkit' 
  },
  'headset': { 
    material: 'support-agent', 
    fa: 'headset', 
    community: 'headset', 
    ion: 'headset' 
  },
  'shield': { 
    material: 'security', 
    fa: 'shield', 
    community: 'shield-checkmark', 
    ion: 'shield-checkmark' 
  },
  'shield-account': { 
    material: 'privacy-tip', 
    fa: 'user-secret', 
    community: 'shield-account', 
    ion: 'shield' 
  },
  'alert': { 
    material: 'warning', 
    fa: 'exclamation-triangle', 
    community: 'alert', 
    ion: 'warning' 
  },
  'alert-circle': { 
    material: 'error', 
    fa: 'exclamation-circle', 
    community: 'alert-circle', 
    ion: 'alert-circle' 
  },
  'information': { 
    material: 'info', 
    fa: 'info-circle', 
    community: 'information', 
    ion: 'information-circle' 
  },
  'help-circle': { 
    material: 'help', 
    fa: 'question-circle', 
    community: 'help-circle', 
    ion: 'help-circle' 
  },
  'dots-horizontal': { 
    material: 'more-horiz', 
    fa: 'ellipsis-h', 
    community: 'dots-horizontal', 
    ion: 'ellipsis-horizontal' 
  },
  'dots-vertical': { 
    material: 'more-vert', 
    fa: 'ellipsis-v', 
    community: 'dots-vertical', 
    ion: 'ellipsis-vertical' 
  },
  'magnify': { 
    material: 'search', 
    fa: 'search', 
    community: 'magnify', 
    ion: 'search' 
  },
  'funnel': { 
    material: 'filter-list', 
    fa: 'filter', 
    community: 'filter', 
    ion: 'funnel' 
  },
  'cog': { 
    material: 'settings', 
    fa: 'cog', 
    community: 'cog', 
    ion: 'settings' 
  },
  'pencil': { 
    material: 'edit', 
    fa: 'edit', 
    community: 'pencil', 
    ion: 'create' 
  },
  'trash': { 
    material: 'delete', 
    fa: 'trash', 
    community: 'delete', 
    ion: 'trash' 
  },
  'plus': { 
    material: 'add', 
    fa: 'plus', 
    community: 'plus', 
    ion: 'add' 
  },
  'minus': { 
    material: 'remove', 
    fa: 'minus', 
    community: 'minus', 
    ion: 'remove' 
  },
  'bars': { 
    material: 'menu', 
    fa: 'bars', 
    community: 'menu', 
    ion: 'menu' 
  },
  'user': { 
    material: 'person', 
    fa: 'user', 
    community: 'account', 
    ion: 'person' 
  },
  'users': { 
    material: 'people', 
    fa: 'users', 
    community: 'account-group', 
    ion: 'people' 
  },
  'user-circle': { 
    material: 'account-circle', 
    fa: 'user-circle', 
    community: 'account-circle', 
    ion: 'person-circle' 
  },
  'envelope': { 
    material: 'email', 
    fa: 'envelope', 
    community: 'email', 
    ion: 'mail' 
  },
  'bell': { 
    material: 'notifications', 
    fa: 'bell', 
    community: 'bell', 
    ion: 'notifications' 
  },
  'heart': { 
    material: 'favorite', 
    fa: 'heart', 
    community: 'heart', 
    ion: 'heart' 
  },
  'times': { 
    material: 'close', 
    fa: 'times', 
    community: 'close', 
    ion: 'close' 
  },
  'clock': { 
    material: 'schedule', 
    fa: 'clock', 
    community: 'clock-outline', 
    ion: 'time' 
  },
  'clock-o': { 
    material: 'schedule', 
    fa: 'clock-o', 
    community: 'clock-outline', 
    ion: 'time' 
  },
  'calendar': { 
    material: 'event', 
    fa: 'calendar', 
    community: 'calendar', 
    ion: 'calendar' 
  },
  'calendar-day': { 
    material: 'calendar-today', 
    fa: 'calendar-day', 
    community: 'calendar-today', 
    ion: 'calendar' 
  },
  'money': { 
    material: 'attach-money', 
    fa: 'money', 
    community: 'cash', 
    ion: 'cash' 
  },
  'dollar-sign': { 
    material: 'attach-money', 
    fa: 'dollar-sign', 
    community: 'cash', 
    ion: 'cash' 
  },
  'wallet': { 
    material: 'account-balance-wallet', 
    fa: 'wallet', 
    community: 'wallet', 
    ion: 'wallet' 
  },
  'mobile': { 
    material: 'smartphone', 
    fa: 'mobile', 
    community: 'cellphone', 
    ion: 'phone-portrait' 
  },
  'file': { 
    material: 'description', 
    fa: 'file', 
    community: 'file-document', 
    ion: 'document' 
  },
  'file-alt': { 
    material: 'description', 
    fa: 'file-alt', 
    community: 'file-document', 
    ion: 'document' 
  },
  'file-text': { 
    material: 'description', 
    fa: 'file-text', 
    community: 'file-document', 
    ion: 'document' 
  },
  'building': { 
    material: 'business', 
    fa: 'building', 
    community: 'office-building', 
    ion: 'business' 
  },
  'bed': { 
    material: 'hotel', 
    fa: 'bed', 
    community: 'hotel', 
    ion: 'bed' 
  },
  'leaf': { 
    material: 'eco', 
    fa: 'leaf', 
    community: 'leaf', 
    ion: 'leaf' 
  },
  'plane': { 
    material: 'flight', 
    fa: 'plane', 
    community: 'airplane', 
    ion: 'airplane' 
  },
  'shopping-bag': { 
    material: 'shopping-bag', 
    fa: 'shopping-bag', 
    community: 'shopping', 
    ion: 'bag' 
  },
  'storefront': { 
    material: 'store', 
    fa: 'store', 
    community: 'store', 
    ion: 'storefront' 
  },
  'exchange-alt': { 
    material: 'swap-vert', 
    fa: 'exchange-alt', 
    community: 'swap-vertical', 
    ion: 'swap-vertical' 
  },
  'swap-vertical': { 
    material: 'swap-vert', 
    fa: 'exchange-alt', 
    community: 'swap-vertical', 
    ion: 'swap-vertical' 
  },
  'tachometer-alt': { 
    material: 'speed', 
    fa: 'tachometer-alt', 
    community: 'speedometer', 
    ion: 'speedometer' 
  },
  'speedometer': { 
    material: 'speed', 
    fa: 'tachometer-alt', 
    community: 'speedometer', 
    ion: 'speedometer' 
  },
  'bicycle': { 
    material: 'directions-bike', 
    fa: 'bicycle', 
    community: 'bicycle', 
    ion: 'bicycle' 
  },
  'redo': { 
    material: 'repeat', 
    fa: 'redo', 
    community: 'repeat', 
    ion: 'refresh' 
  },
  'refresh': { 
    material: 'repeat', 
    fa: 'redo', 
    community: 'repeat', 
    ion: 'refresh' 
  },
  'checkmark': { 
    material: 'check', 
    fa: 'check', 
    community: 'check', 
    ion: 'checkmark' 
  },
  
  // Additional missing icons from logs
  'straighten': { 
    material: 'straighten', 
    fa: 'ruler-horizontal', 
    community: 'ruler', 
    ion: 'resize' 
  },
  'timer': { 
    material: 'timer', 
    fa: 'clock', 
    community: 'timer', 
    ion: 'time' 
  },
  'star-border': { 
    material: 'star-border', 
    fa: 'star', 
    community: 'star-outline', 
    ion: 'star-outline' 
  },
  'cancel': { 
    material: 'cancel', 
    fa: 'times', 
    community: 'close', 
    ion: 'close' 
  },
  'receipt': { 
    material: 'receipt', 
    fa: 'receipt', 
    community: 'receipt', 
    ion: 'receipt' 
  },
  'chat': { 
    material: 'chat', 
    fa: 'comments', 
    community: 'message', 
    ion: 'chatbubble' 
  },
  'favorite-border': { 
    material: 'favorite-border', 
    fa: 'heart', 
    community: 'heart-outline', 
    ion: 'heart-outline' 
  },
  'work': { 
    material: 'work', 
    fa: 'briefcase', 
    community: 'briefcase', 
    ion: 'briefcase' 
  },
  'sort': { 
    material: 'sort', 
    fa: 'sort', 
    community: 'sort', 
    ion: 'funnel' 
  },
  'shopping-cart': { 
    material: 'shopping-cart', 
    fa: 'shopping-cart', 
    community: 'cart', 
    ion: 'cart' 
  },
  'local-hospital': { 
    material: 'local-hospital', 
    fa: 'hospital', 
    community: 'hospital', 
    ion: 'medical' 
  },
  'apartment': { 
    material: 'apartment', 
    fa: 'building', 
    community: 'office-building', 
    ion: 'business' 
  },
  'nature-people': { 
    material: 'nature-people', 
    fa: 'hiking', 
    community: 'hiking', 
    ion: 'walk' 
  },
  'school': { 
    material: 'school', 
    fa: 'graduation-cap', 
    community: 'school', 
    ion: 'school' 
  },
  'local-police': { 
    material: 'local-police', 
    fa: 'shield-alt', 
    community: 'police', 
    ion: 'shield' 
  },
  'store': { 
    material: 'store', 
    fa: 'store', 
    community: 'store', 
    ion: 'storefront' 
  },
  'directions': { 
    material: 'directions', 
    fa: 'directions', 
    community: 'directions', 
    ion: 'navigate' 
  },
  'local-taxi': { 
    material: 'local-taxi', 
    fa: 'taxi', 
    community: 'taxi', 
    ion: 'car' 
  },
  'wifi-off': { 
    material: 'wifi-off', 
    fa: 'wifi', 
    community: 'wifi-off', 
    ion: 'wifi' 
  },
  'person-search': { 
    material: 'person-search', 
    fa: 'user-search', 
    community: 'account-search', 
    ion: 'person' 
  },
  'keyboard-arrow-down': { 
    material: 'keyboard-arrow-down', 
    fa: 'chevron-down', 
    community: 'chevron-down', 
    ion: 'chevron-down' 
  },
  'checkmark-circle': { 
    material: 'check-circle', 
    fa: 'check-circle', 
    community: 'check-circle', 
    ion: 'checkmark-circle' 
  },
  'location': { 
    material: 'location-on', 
    fa: 'map-marker', 
    community: 'map-marker', 
    ion: 'location' 
  },
  'location-arrow': { 
    material: 'gps-fixed', 
    fa: 'location-arrow', 
    community: 'map-marker', 
    ion: 'location' 
  },
  'map-marker': { 
    material: 'location-on', 
    fa: 'map-marker', 
    community: 'map-marker', 
    ion: 'location' 
  },
  'cube': { 
    material: 'local-shipping', 
    fa: 'cube', 
    community: 'package', 
    ion: 'cube' 
  },
  'box': { 
    material: 'local-shipping', 
    fa: 'box', 
    community: 'package', 
    ion: 'cube' 
  },
  'user-secret': { 
    material: 'privacy-tip', 
    fa: 'user-secret', 
    community: 'shield-account', 
    ion: 'shield' 
  },
  'shield-checkmark': { 
    material: 'security', 
    fa: 'shield', 
    community: 'shield-checkmark', 
    ion: 'shield-checkmark' 
  },
  'lock-closed': { 
    material: 'lock', 
    fa: 'lock', 
    community: 'lock', 
    ion: 'lock-closed' 
  },
  'unlock': { 
    material: 'lock-open', 
    fa: 'unlock', 
    community: 'lock-open', 
    ion: 'lock-open' 
  },
  'bag': { 
    material: 'shopping-bag', 
    fa: 'shopping-bag', 
    community: 'shopping', 
    ion: 'bag' 
  },
  'office-building': { 
    material: 'business', 
    fa: 'building', 
    community: 'office-building', 
    ion: 'business' 
  },
  'business': { 
    material: 'business', 
    fa: 'building', 
    community: 'office-building', 
    ion: 'business' 
  },
  'shopping': { 
    material: 'shopping-bag', 
    fa: 'shopping-bag', 
    community: 'shopping', 
    ion: 'bag' 
  },
  'cellphone': { 
    material: 'smartphone', 
    fa: 'mobile', 
    community: 'cellphone', 
    ion: 'phone-portrait' 
  },
  'bus': { 
    material: 'airport-shuttle', 
    fa: 'bus', 
    community: 'bus', 
    ion: 'bus' 
  },
  'car-sport': { 
    material: 'directions-car', 
    fa: 'car', 
    community: 'car', 
    ion: 'car-sport' 
  },
  'ellipse': { 
    material: 'circle', 
    fa: 'circle', 
    community: 'circle', 
    ion: 'ellipse' 
  },
  'time': { 
    material: 'schedule', 
    fa: 'clock', 
    community: 'clock-outline', 
    ion: 'time' 
  },
  'medkit': { 
    material: 'emergency', 
    fa: 'medkit', 
    community: 'ambulance', 
    ion: 'medkit' 
  },
  'van-shuttle': { 
    material: 'airport-shuttle', 
    fa: 'van-shuttle', 
    community: 'bus', 
    ion: 'bus' 
  },
  'id-card': { 
    material: 'badge', 
    fa: 'id-card', 
    community: 'badge', 
    ion: 'card' 
  },
  'question-circle': { 
    material: 'help', 
    fa: 'question-circle', 
    community: 'help-circle', 
    ion: 'help-circle' 
  },
  'exclamation-triangle': { 
    material: 'warning', 
    fa: 'exclamation-triangle', 
    community: 'alert', 
    ion: 'warning' 
  },
  'exclamation-circle': { 
    material: 'error', 
    fa: 'exclamation-circle', 
    community: 'alert-circle', 
    ion: 'alert-circle' 
  },
  'info-circle': { 
    material: 'info', 
    fa: 'info-circle', 
    community: 'information', 
    ion: 'information-circle' 
  },
  'headset': { 
    material: 'support-agent', 
    fa: 'headset', 
    community: 'headset', 
    ion: 'headset' 
  },
  'ambulance': { 
    material: 'emergency', 
    fa: 'ambulance', 
    community: 'ambulance', 
    ion: 'medkit' 
  },
  'shuttle-van': { 
    material: 'airport-shuttle', 
    fa: 'shuttle-van', 
    community: 'bus', 
    ion: 'bus' 
  },
  
  // ===== ADD THESE MISSING ICONS HERE =====
  'briefcase': { 
    material: 'work', 
    fa: 'briefcase', 
    community: 'briefcase', 
    ion: 'briefcase' 
  },
  'city': { 
    material: 'location-city', 
    fa: 'building', 
    community: 'city', 
    ion: 'business' 
  },
  'history': { 
    material: 'history', 
    fa: 'history', 
    community: 'history', 
    ion: 'time' 
  },
  'current-location': { 
    material: 'my-location', 
    fa: 'location-arrow', 
    community: 'map-marker', 
    ion: 'locate' 
  },
  'search-off': { 
    material: 'search-off', 
    fa: 'search', 
    community: 'search-off', 
    ion: 'search' 
  },
  'map-pin': { 
    material: 'place', 
    fa: 'map-pin', 
    community: 'map-marker', 
    ion: 'location' 
  },
};

// Optimized fallback component with memoization
const FallbackIcon = React.memo(({ name, size = 24, color = '#666', style }) => {
  // Essential emoji fallbacks for critical icons
  const fallbackMap = {
    'location': '📍',
    'camera': '📷',
    'photo': '🖼️',
    'notifications': '🔔',
    'people': '👥',
    'license': '🪪',
    'nrc': '🆔',
    'vehicle-registration': '🚗',
    'document': '📄',
  };

  return (
    <View style={[{ justifyContent: 'center', alignItems: 'center' }, style]}>
      <Text style={{ fontSize: size, color, lineHeight: size, textAlign: 'center' }}>
        {fallbackMap[name] || '?'}
      </Text>
    </View>
  );
});

FallbackIcon.displayName = 'FallbackIcon';

// Production-ready Icon component with comprehensive fallback system
const Icon = React.memo(({ 
  name, 
  type = 'material', // 'material', 'fa', 'community', 'ion'
  size = 24, 
  color = '#666', 
  style,
  fallback = true,
  ...props 
}) => {
  const iconConfig = ICON_MAP[name];
  
  if (!iconConfig) {
    console.warn(`[IconUtils] Icon "${name}" not found in icon map`);
    return fallback ? <FallbackIcon name={name} size={size} color={color} style={style} /> : null;
  }

  // Try primary icon type first
  try {
    switch (type) {
      case 'material':
        if (iconConfig.material) {
          return <MaterialIcon name={iconConfig.material} size={size} color={color} style={style} {...props} />;
        }
        break;
        
      case 'fa':
        if (iconConfig.fa) {
          return <FontAwesome name={iconConfig.fa} size={size} color={color} style={style} {...props} />;
        }
        break;
        
      case 'community':
        if (iconConfig.community) {
          return <MaterialCommunityIcon name={iconConfig.community} size={size} color={color} style={style} {...props} />;
        }
        break;
        
      case 'ion':
        if (iconConfig.ion) {
          return <Ionicon name={iconConfig.ion} size={size} color={color} style={style} {...props} />;
        }
        break;
    }
  } catch (error) {
    console.warn(`[IconUtils] Error rendering ${type} icon "${name}":`, error);
  }

  // Automatic fallback chain: MaterialIcons → FontAwesome → MaterialCommunityIcons → Ionicons
  const fallbackChain = [
    { lib: MaterialIcon, key: 'material' },
    { lib: FontAwesome, key: 'fa' },
    { lib: MaterialCommunityIcon, key: 'community' },
    { lib: Ionicon, key: 'ion' },
  ];

  for (const { lib, key } of fallbackChain) {
    const iconName = iconConfig[key];
    if (iconName && lib) {
      try {
        return React.createElement(lib, {
          name: iconName,
          size,
          color,
          style,
          ...props
        });
      } catch (fallbackError) {
        console.warn(`[IconUtils] Fallback failed for ${key} "${iconName}":`, fallbackError);
        continue;
      }
    }
  }

  // Final fallback to emoji
  return fallback ? <FallbackIcon name={name} size={size} color={color} style={style} /> : null;
});

Icon.displayName = 'Icon';

// Convenience components for each icon library
export const MaterialIconFallback = React.memo((props) => <Icon type="material" {...props} />);
export const FontAwesomeFallback = React.memo((props) => <Icon type="fa" {...props} />);
export const CommunityIconFallback = React.memo((props) => <Icon type="community" {...props} />);
export const IoniconFallback = React.memo((props) => <Icon type="ion" {...props} />);

// Set display names for debugging
MaterialIconFallback.displayName = 'MaterialIconFallback';
FontAwesomeFallback.displayName = 'FontAwesomeFallback';
CommunityIconFallback.displayName = 'CommunityIconFallback';
IoniconFallback.displayName = 'IoniconFallback';

// Utility functions for icon management
export const isIconAvailable = (name, type = 'material') => {
  const iconConfig = ICON_MAP[name];
  return !!(iconConfig && iconConfig[type]);
};

export const getIconName = (name, type = 'material') => {
  const iconConfig = ICON_MAP[name];
  return iconConfig ? iconConfig[type] : null;
};

export const getAllIconNames = () => Object.keys(ICON_MAP);

// Export icon map for reference and debugging
export { ICON_MAP };

// Export default Icon component
export default Icon;