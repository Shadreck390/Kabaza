// test-config.js - Place in root directory
import Config from 'react-native-config';

console.log('========== ENV DEBUG ==========');
console.log('All env keys:', Object.keys(Config));
console.log('GOOGLE_MAPS_API_KEY:', Config.GOOGLE_MAPS_API_KEY ? '✅ Found' : '❌ Missing');
console.log('GOOGLE_PLACES_API_KEY:', Config.GOOGLE_PLACES_API_KEY ? '✅ Found' : '❌ Missing');
console.log('API_BASE_URL:', Config.API_BASE_URL || '❌ Missing');
console.log('================================');