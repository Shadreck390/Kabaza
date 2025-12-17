// src/store/slices/chatSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Service imports - FIXED:
import RideService from '@services/ride/RideService'; // If you have chat in ride service
import realTimeService from '@services/socket/realtimeUpdates';

// ====================
// INITIAL STATE
// ====================

const initialState = {
  // Active conversations
  conversations: [],
  activeConversation: null,
  
  // Messages
  messages: {},
  unreadCount: 0,
  
  // Chat participants
  participants: {},
  
  // Chat settings
  settings: {
    sound: true,
    vibration: true,
    preview: true,
    typingIndicator: true,
    readReceipts: true,
    deliveryReceipts: true,
    mediaAutoDownload: true,
    saveToGallery: false,
    fontSize: 'medium', // 'small', 'medium', 'large'
    bubbleStyle: 'default', // 'default', 'minimal', 'rounded'
  },
  
  // Connection status
  connection: {
    connected: false,
    reconnecting: false,
    lastConnected: null,
    connectionQuality: 'good', // 'good', 'fair', 'poor'
  },
  
  // Typing indicators
  typing: {},
  
  // Message status
  messageStatus: {},
  
  // Media attachments
  media: {
    uploading: {},
    downloads: {},
    gallery: [],
  },
  
  // Search and filters
  search: {
    query: '',
    results: [],
    active: false,
  },
  
  // Loading states
  loading: {
    conversations: false,
    messages: false,
    sending: false,
    uploading: false,
  },
  
  // Error states
  errors: {
    conversations: null,
    messages: null,
    sending: null,
    uploading: null,
    connection: null,
  },
  
  // Statistics
  stats: {
    totalMessages: 0,
    totalConversations: 0,
    totalMedia: 0,
    averageResponseTime: 0,
    lastMessageTime: null,
  },
  
  // Blocked users
  blockedUsers: [],
  
  // Muted conversations
  mutedConversations: [],
  
  // Archived conversations
  archivedConversations: [],
  
  // Pinned messages
  pinnedMessages: {},
  
  // Draft messages
  drafts: {},
};

// ====================
// SLICE DEFINITION
// ====================

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    // ====================
    // CONVERSATION MANAGEMENT
    // ====================
    
    setConversations: (state, action) => {
      state.conversations = action.payload;
    },
    
    addConversation: (state, action) => {
      const conversation = action.payload;
      const exists = state.conversations.find(c => c.id === conversation.id);
      
      if (!exists) {
        state.conversations.unshift(conversation);
        state.stats.totalConversations += 1;
      }
    },
    
    updateConversation: (state, action) => {
      const { id, updates } = action.payload;
      const index = state.conversations.findIndex(c => c.id === id);
      
      if (index !== -1) {
        state.conversations[index] = {
          ...state.conversations[index],
          ...updates,
          updatedAt: Date.now(),
        };
        
        // Move to top
        const conversation = state.conversations.splice(index, 1)[0];
        state.conversations.unshift(conversation);
      }
    },
    
    removeConversation: (state, action) => {
      const conversationId = action.payload;
      state.conversations = state.conversations.filter(c => c.id !== conversationId);
      
      // Remove messages
      delete state.messages[conversationId];
      
      // Remove from archived if present
      state.archivedConversations = state.archivedConversations.filter(
        id => id !== conversationId
      );
      
      // Remove from muted if present
      state.mutedConversations = state.mutedConversations.filter(
        id => id !== conversationId
      );
    },
    
    setActiveConversation: (state, action) => {
      state.activeConversation = action.payload;
      
      // Mark all messages as read
      if (action.payload && state.messages[action.payload]) {
        const messages = state.messages[action.payload];
        let unreadReduced = 0;
        
        messages.forEach(message => {
          if (!message.read && message.senderId !== action.payload) {
            message.read = true;
            message.readAt = Date.now();
            unreadReduced += 1;
          }
        });
        
        state.unreadCount = Math.max(0, state.unreadCount - unreadReduced);
      }
    },
    
    clearActiveConversation: (state) => {
      state.activeConversation = null;
    },
    
    // ====================
    // MESSAGE MANAGEMENT
    // ====================
    
    addMessage: (state, action) => {
      const { conversationId, message } = action.payload;
      
      if (!state.messages[conversationId]) {
        state.messages[conversationId] = [];
      }
      
      const newMessage = {
        ...message,
        id: message.id || `temp_${Date.now()}`,
        timestamp: message.timestamp || Date.now(),
        status: message.status || 'sent',
        read: false,
        delivered: false,
      };
      
      state.messages[conversationId].push(newMessage);
      state.stats.totalMessages += 1;
      state.stats.lastMessageTime = newMessage.timestamp;
      
      // Update conversation last message
      const conversationIndex = state.conversations.findIndex(c => c.id === conversationId);
      if (conversationIndex !== -1) {
        state.conversations[conversationIndex] = {
          ...state.conversations[conversationIndex],
          lastMessage: newMessage.content,
          lastMessageTime: newMessage.timestamp,
          unreadCount: state.activeConversation === conversationId ? 
            0 : (state.conversations[conversationIndex].unreadCount || 0) + 1,
        };
        
        // Move to top
        const conversation = state.conversations.splice(conversationIndex, 1)[0];
        state.conversations.unshift(conversation);
      }
      
      // Increment unread count if not active conversation
      if (state.activeConversation !== conversationId) {
        state.unreadCount += 1;
      }
    },
    
    updateMessageStatus: (state, action) => {
      const { conversationId, messageId, status, timestamp } = action.payload;
      
      if (state.messages[conversationId]) {
        const messageIndex = state.messages[conversationId].findIndex(
          m => m.id === messageId
        );
        
        if (messageIndex !== -1) {
          const message = state.messages[conversationId][messageIndex];
          
          if (status === 'delivered' && !message.delivered) {
            message.delivered = true;
            message.deliveredAt = timestamp || Date.now();
          } else if (status === 'read' && !message.read) {
            message.read = true;
            message.readAt = timestamp || Date.now();
            
            // Reduce unread count
            if (state.activeConversation !== conversationId) {
              state.unreadCount = Math.max(0, state.unreadCount - 1);
            }
          }
          
          message.status = status;
        }
      }
      
      // Update message status map
      state.messageStatus[messageId] = {
        ...state.messageStatus[messageId],
        status,
        updatedAt: timestamp || Date.now(),
      };
    },
    
    deleteMessage: (state, action) => {
      const { conversationId, messageId } = action.payload;
      
      if (state.messages[conversationId]) {
        state.messages[conversationId] = state.messages[conversationId].filter(
          m => m.id !== messageId
        );
      }
    },
    
    clearMessages: (state, action) => {
      const conversationId = action.payload;
      if (state.messages[conversationId]) {
        state.messages[conversationId] = [];
      }
    },
    
    // ====================
    // PARTICIPANT MANAGEMENT
    // ====================
    
    addParticipant: (state, action) => {
      const { conversationId, participant } = action.payload;
      
      if (!state.participants[conversationId]) {
        state.participants[conversationId] = [];
      }
      
      const exists = state.participants[conversationId].find(
        p => p.id === participant.id
      );
      
      if (!exists) {
        state.participants[conversationId].push(participant);
      }
    },
    
    updateParticipant: (state, action) => {
      const { conversationId, participantId, updates } = action.payload;
      
      if (state.participants[conversationId]) {
        const index = state.participants[conversationId].findIndex(
          p => p.id === participantId
        );
        
        if (index !== -1) {
          state.participants[conversationId][index] = {
            ...state.participants[conversationId][index],
            ...updates,
          };
        }
      }
    },
    
    removeParticipant: (state, action) => {
      const { conversationId, participantId } = action.payload;
      
      if (state.participants[conversationId]) {
        state.participants[conversationId] = state.participants[conversationId].filter(
          p => p.id !== participantId
        );
      }
    },
    
    // ====================
    // TYPING INDICATORS
    // ====================
    
    setTyping: (state, action) => {
      const { conversationId, userId, isTyping } = action.payload;
      
      if (!state.typing[conversationId]) {
        state.typing[conversationId] = {};
      }
      
      state.typing[conversationId][userId] = isTyping;
    },
    
    clearTyping: (state, action) => {
      const conversationId = action.payload;
      delete state.typing[conversationId];
    },
    
    // ====================
    // CONNECTION STATUS
    // ====================
    
    setChatConnection: (state, action) => {
      state.connection.connected = action.payload;
      state.connection.lastConnected = action.payload ? Date.now() : null;
      state.connection.reconnecting = false;
    },
    
    setReconnecting: (state, action) => {
      state.connection.reconnecting = action.payload;
    },
    
    setConnectionQuality: (state, action) => {
      state.connection.connectionQuality = action.payload;
    },
    
    // ====================
    // MEDIA MANAGEMENT
    // ====================
    
    addMediaUpload: (state, action) => {
      const { messageId, progress } = action.payload;
      state.media.uploading[messageId] = progress;
    },
    
    removeMediaUpload: (state, action) => {
      delete state.media.uploading[action.payload];
    },
    
    addMediaDownload: (state, action) => {
      const { mediaId, progress } = action.payload;
      state.media.downloads[mediaId] = progress;
    },
    
    removeMediaDownload: (state, action) => {
      delete state.media.downloads[action.payload];
    },
    
    addToGallery: (state, action) => {
      state.media.gallery.unshift(action.payload);
      
      // Keep only last 100 items
      if (state.media.gallery.length > 100) {
        state.media.gallery.pop();
      }
    },
    
    // ====================
    // SEARCH MANAGEMENT
    // ====================
    
    setSearchQuery: (state, action) => {
      state.search.query = action.payload;
      state.search.active = !!action.payload;
    },
    
    setSearchResults: (state, action) => {
      state.search.results = action.payload;
    },
    
    clearSearch: (state) => {
      state.search.query = '';
      state.search.results = [];
      state.search.active = false;
    },
    
    // ====================
    // BLOCK & MUTE
    // ====================
    
    blockUser: (state, action) => {
      const userId = action.payload;
      if (!state.blockedUsers.includes(userId)) {
        state.blockedUsers.push(userId);
      }
    },
    
    unblockUser: (state, action) => {
      const userId = action.payload;
      state.blockedUsers = state.blockedUsers.filter(id => id !== userId);
    },
    
    muteConversation: (state, action) => {
      const conversationId = action.payload;
      if (!state.mutedConversations.includes(conversationId)) {
        state.mutedConversations.push(conversationId);
      }
    },
    
    unmuteConversation: (state, action) => {
      const conversationId = action.payload;
      state.mutedConversations = state.mutedConversations.filter(
        id => id !== conversationId
      );
    },
    
    // ====================
    // ARCHIVE & PIN
    // ====================
    
    archiveConversation: (state, action) => {
      const conversationId = action.payload;
      if (!state.archivedConversations.includes(conversationId)) {
        state.archivedConversations.push(conversationId);
      }
      
      // Remove from active conversations
      state.conversations = state.conversations.filter(c => c.id !== conversationId);
    },
    
    unarchiveConversation: (state, action) => {
      const conversationId = action.payload;
      state.archivedConversations = state.archivedConversations.filter(
        id => id !== conversationId
      );
    },
    
    pinMessage: (state, action) => {
      const { conversationId, message } = action.payload;
      
      if (!state.pinnedMessages[conversationId]) {
        state.pinnedMessages[conversationId] = [];
      }
      
      const exists = state.pinnedMessages[conversationId].find(
        m => m.id === message.id
      );
      
      if (!exists) {
        state.pinnedMessages[conversationId].unshift(message);
        
        // Keep only last 5 pinned messages per conversation
        if (state.pinnedMessages[conversationId].length > 5) {
          state.pinnedMessages[conversationId].pop();
        }
      }
    },
    
    unpinMessage: (state, action) => {
      const { conversationId, messageId } = action.payload;
      
      if (state.pinnedMessages[conversationId]) {
        state.pinnedMessages[conversationId] = state.pinnedMessages[conversationId].filter(
          m => m.id !== messageId
        );
      }
    },
    
    // ====================
    // DRAFT MANAGEMENT
    // ====================
    
    saveDraft: (state, action) => {
      const { conversationId, draft } = action.payload;
      state.drafts[conversationId] = draft;
    },
    
    clearDraft: (state, action) => {
      delete state.drafts[action.payload];
    },
    
    clearAllDrafts: (state) => {
      state.drafts = {};
    },
    
    // ====================
    // SETTINGS MANAGEMENT
    // ====================
    
    updateChatSettings: (state, action) => {
      state.settings = {
        ...state.settings,
        ...action.payload,
      };
    },
    
    // ====================
    // ERROR HANDLING
    // ====================
    
    setError: (state, action) => {
      const { key, error } = action.payload;
      if (state.errors[key] !== undefined) {
        state.errors[key] = error;
      }
    },
    
    clearError: (state, action) => {
      const key = action.payload;
      if (state.errors[key]) {
        state.errors[key] = null;
      }
    },
    
    // ====================
    // STATISTICS
    // ====================
    
    updateChatStats: (state, action) => {
      state.stats = {
        ...state.stats,
        ...action.payload,
      };
    },
    
    // ====================
    // RESET & CLEANUP
    // ====================
    
    resetChatState: (state) => {
      return {
        ...initialState,
        settings: state.settings,
        blockedUsers: state.blockedUsers,
      };
    },
  },
});

// ====================
// ACTION CREATORS
// ====================

export const {
  setConversations,
  addConversation,
  updateConversation,
  removeConversation,
  setActiveConversation,
  clearActiveConversation,
  addMessage,
  updateMessageStatus,
  deleteMessage,
  clearMessages,
  addParticipant,
  updateParticipant,
  removeParticipant,
  setTyping,
  clearTyping,
  setChatConnection,
  setReconnecting,
  setConnectionQuality,
  addMediaUpload,
  removeMediaUpload,
  addMediaDownload,
  removeMediaDownload,
  addToGallery,
  setSearchQuery,
  setSearchResults,
  clearSearch,
  blockUser,
  unblockUser,
  muteConversation,
  unmuteConversation,
  archiveConversation,
  unarchiveConversation,
  pinMessage,
  unpinMessage,
  saveDraft,
  clearDraft,
  clearAllDrafts,
  updateChatSettings,
  setError,
  clearError,
  updateChatStats,
  resetChatState,
} = chatSlice.actions;

// ====================
// SELECTORS
// ====================

export const selectChat = (state) => state.chat;
export const selectConversations = (state) => state.chat.conversations;
export const selectActiveConversation = (state) => state.chat.activeConversation;
export const selectMessages = (state) => state.chat.messages;
export const selectUnreadCount = (state) => state.chat.unreadCount;
export const selectParticipants = (state) => state.chat.participants;
export const selectChatSettings = (state) => state.chat.settings;
export const selectConnection = (state) => state.chat.connection;
export const selectTyping = (state) => state.chat.typing;
export const selectMedia = (state) => state.chat.media;
export const selectSearch = (state) => state.chat.search;
export const selectBlockedUsers = (state) => state.chat.blockedUsers;
export const selectMutedConversations = (state) => state.chat.mutedConversations;
export const selectArchivedConversations = (state) => state.chat.archivedConversations;
export const selectPinnedMessages = (state) => state.chat.pinnedMessages;
export const selectDrafts = (state) => state.chat.drafts;
export const selectLoading = (state) => state.chat.loading;
export const selectErrors = (state) => state.chat.errors;
export const selectStats = (state) => state.chat.stats;

// Derived Selectors
export const selectActiveMessages = (state) => {
  const conversationId = state.chat.activeConversation;
  return conversationId ? state.chat.messages[conversationId] || [] : [];
};

export const selectConversationById = (id) => (state) =>
  state.chat.conversations.find(c => c.id === id);

export const selectUnreadConversations = (state) =>
  state.chat.conversations.filter(c => c.unreadCount > 0);

export const selectIsUserBlocked = (userId) => (state) =>
  state.chat.blockedUsers.includes(userId);

export const selectIsConversationMuted = (conversationId) => (state) =>
  state.chat.mutedConversations.includes(conversationId);

export const selectIsTyping = (conversationId, userId) => (state) =>
  state.chat.typing[conversationId]?.[userId] || false;

export const selectConversationParticipants = (conversationId) => (state) =>
  state.chat.participants[conversationId] || [];

export const selectMessageStatus = (messageId) => (state) =>
  state.chat.messageStatus[messageId];

export const selectMediaUploadProgress = (messageId) => (state) =>
  state.chat.media.uploading[messageId];

export const selectMediaDownloadProgress = (mediaId) => (state) =>
  state.chat.media.downloads[mediaId];

export const selectDraftForConversation = (conversationId) => (state) =>
  state.chat.drafts[conversationId];

export const selectPinnedMessagesForConversation = (conversationId) => (state) =>
  state.chat.pinnedMessages[conversationId] || [];

export const selectSearchResultsForQuery = (query) => (state) => {
  if (!query) return [];
  
  const results = [];
  const normalizedQuery = query.toLowerCase();
  
  // Search in conversations
  state.chat.conversations.forEach(conversation => {
    if (
      conversation.name?.toLowerCase().includes(normalizedQuery) ||
      conversation.lastMessage?.toLowerCase().includes(normalizedQuery)
    ) {
      results.push({
        type: 'conversation',
        data: conversation,
      });
    }
  });
  
  // Search in messages
  Object.entries(state.chat.messages).forEach(([conversationId, messages]) => {
    const matchedMessages = messages.filter(message =>
      message.content?.toLowerCase().includes(normalizedQuery)
    );
    
    if (matchedMessages.length > 0) {
      results.push({
        type: 'messages',
        conversationId,
        data: matchedMessages.slice(0, 3), // Limit to 3 messages per conversation
      });
    }
  });
  
  return results;
};

export default chatSlice.reducer;