// src/store/sagas/chatSaga.js
import { call, put, takeLatest, takeEvery, all, fork } from 'redux-saga/effects';
import { Alert } from 'react-native';

// Mock services
const ChatService = {
  sendMessage: async (message) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, message });
      }, 500);
    });
  },
  
  loadConversations: async () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([]);
      }, 1000);
    });
  },
};

// Worker sagas
function* sendMessageWorker(action) {
  try {
    const message = action.payload;
    const response = yield call(ChatService.sendMessage, message);
    yield put({ type: 'chat/messageSent', payload: response });
  } catch (error) {
    Alert.alert('Error', 'Failed to send message');
  }
}

// Watcher sagas
function* watchSendMessage() {
  yield takeLatest('chat/sendMessageRequest', sendMessageWorker);
}

// Root saga
export default function* chatSaga() {
  yield all([
    fork(watchSendMessage),
  ]);
}