// screens/common/ChatScreen.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Dimensions,
  Alert,
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import io from 'socket.io-client';

const { width, height } = Dimensions.get('window');

export default function ChatScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { rideId, otherUser, userType = 'rider' } = route.params || {};
  
  const flatListRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');

  useEffect(() => {
    // Initialize WebSocket connection
    const newSocket = io('YOUR_WEBSOCKET_URL', {
      query: { rideId, userType }
    });
    
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setConnectionStatus('connected');
      loadChatHistory();
    });

    newSocket.on('disconnect', () => {
      setConnectionStatus('disconnected');
    });

    newSocket.on('new_message', (message) => {
      setMessages(prev => [...prev, message]);
      scrollToBottom();
    });

    newSocket.on('user_typing', (data) => {
      if (data.userId !== otherUser?.id) {
        setIsTyping(data.isTyping);
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, [rideId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadChatHistory = () => {
    // Mock chat history
    const mockMessages = [
      {
        id: '1',
        text: 'Hello, I\'ll be there in 5 minutes',
        senderId: otherUser?.id || 'driver-001',
        senderName: otherUser?.name || 'John',
        timestamp: '10:45 AM',
        isSender: false,
      },
      {
        id: '2',
        text: 'Okay, I\'m waiting at the main entrance',
        senderId: 'user',
        senderName: 'You',
        timestamp: '10:46 AM',
        isSender: true,
      },
      {
        id: '3',
        text: 'I\'m wearing a blue shirt',
        senderId: 'user',
        senderName: 'You',
        timestamp: '10:46 AM',
        isSender: true,
      },
      {
        id: '4',
        text: 'Got it, see you soon!',
        senderId: otherUser?.id || 'driver-001',
        senderName: otherUser?.name || 'John',
        timestamp: '10:47 AM',
        isSender: false,
      },
    ];
    
    setMessages(mockMessages);
  };

  const scrollToBottom = () => {
    if (flatListRef.current && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const message = {
      id: Date.now().toString(),
      text: newMessage.trim(),
      senderId: 'user',
      senderName: 'You',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSender: true,
    };

    // Send via WebSocket
    if (socket && connectionStatus === 'connected') {
      socket.emit('send_message', {
        rideId,
        message: newMessage.trim(),
        recipientId: otherUser?.id,
      });
    }

    setMessages(prev => [...prev, message]);
    setNewMessage('');
    scrollToBottom();
  };

  const handleTyping = (isTyping) => {
    if (socket && connectionStatus === 'connected') {
      socket.emit('typing', {
        rideId,
        isTyping,
        recipientId: otherUser?.id,
      });
    }
  };

  const renderMessage = ({ item }) => (
    <View style={[
      styles.messageContainer,
      item.isSender ? styles.senderMessage : styles.receiverMessage
    ]}>
      {!item.isSender && (
        <View style={styles.messageHeader}>
          <Text style={styles.senderName}>{item.senderName}</Text>
        </View>
      )}
      
      <View style={[
        styles.messageBubble,
        item.isSender ? styles.senderBubble : styles.receiverBubble
      ]}>
        <Text style={[
          styles.messageText,
          item.isSender ? styles.senderText : styles.receiverText
        ]}>
          {item.text}
        </Text>
      </View>
      
      <Text style={styles.messageTime}>{item.timestamp}</Text>
    </View>
  );

  const renderTypingIndicator = () => {
    if (!isTyping) return null;
    
    return (
      <View style={styles.typingContainer}>
        <View style={styles.typingBubble}>
          <View style={styles.typingDot} />
          <View style={styles.typingDot} />
          <View style={styles.typingDot} />
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcon name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>
            {userType === 'rider' ? 'Chat with Driver' : 'Chat with Rider'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {otherUser?.name || 'John Banda'}
            {connectionStatus === 'connected' ? ' • Online' : ' • Offline'}
          </Text>
        </View>
        
        <TouchableOpacity 
          style={styles.callButton}
          onPress={() => {
            // Handle call
            Alert.alert('Call', 'Would you like to call?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Call', onPress: () => console.log('Call initiated') },
            ]);
          }}
        >
          <MaterialIcon name="call" size={24} color="#22C55E" />
        </TouchableOpacity>
      </View>

      {/* Chat Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <MaterialIcon name="chat" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptySubtitle}>
              Send a message to start the conversation
            </Text>
          </View>
        }
      />

      {/* Typing Indicator */}
      {renderTypingIndicator()}

      {/* Message Input */}
      <View style={styles.inputContainer}>
        <TouchableOpacity style={styles.attachmentButton}>
          <MaterialIcon name="attach-file" size={24} color="#666" />
        </TouchableOpacity>
        
        <TextInput
          style={styles.messageInput}
          placeholder="Type a message..."
          value={newMessage}
          onChangeText={(text) => {
            setNewMessage(text);
            handleTyping(text.length > 0);
          }}
          multiline
          maxLength={500}
        />
        
        <TouchableOpacity 
          style={[
            styles.sendButton,
            !newMessage.trim() && styles.sendButtonDisabled
          ]}
          onPress={handleSendMessage}
          disabled={!newMessage.trim()}
        >
          <MaterialIcon 
            name="send" 
            size={24} 
            color={newMessage.trim() ? "#FFFFFF" : "#666"} 
          />
        </TouchableOpacity>
      </View>

      {/* Quick Messages */}
      <View style={styles.quickMessages}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity 
            style={styles.quickMessage}
            onPress={() => setNewMessage("I'm here")}
          >
            <Text style={styles.quickMessageText}>I'm here</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.quickMessage}
            onPress={() => setNewMessage("What's your ETA?")}
          >
            <Text style={styles.quickMessageText}>What's your ETA?</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.quickMessage}
            onPress={() => setNewMessage("I'll be right there")}
          >
            <Text style={styles.quickMessageText}>I'll be right there</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.quickMessage}
            onPress={() => setNewMessage("Thank you!")}
          >
            <Text style={styles.quickMessageText}>Thank you!</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

// Add missing ScrollView import
import { ScrollView } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
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
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  messageContainer: {
    marginBottom: 16,
    maxWidth: '80%',
  },
  senderMessage: {
    alignSelf: 'flex-end',
  },
  receiverMessage: {
    alignSelf: 'flex-start',
  },
  messageHeader: {
    marginBottom: 4,
  },
  senderName: {
    fontSize: 12,
    color: '#666',
    marginLeft: 12,
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderTopLeftRadius: 4,
  },
  senderBubble: {
    backgroundColor: '#22C55E',
    borderTopRightRadius: 4,
    borderTopLeftRadius: 20,
  },
  receiverBubble: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  senderText: {
    color: '#FFFFFF',
  },
  receiverText: {
    color: '#000000',
  },
  messageTime: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
    marginHorizontal: 4,
    textAlign: 'right',
  },
  typingContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  typingBubble: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#666',
    opacity: 0.6,
  },
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginTop: 24,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  attachmentButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxHeight: 100,
    fontSize: 16,
    color: '#000000',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#F3F4F6',
  },
  quickMessages: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  quickMessage: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
  },
  quickMessageText: {
    fontSize: 14,
    color: '#666',
  },
});