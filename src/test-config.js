import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import AppConfig from '../react-native-config';

export default function ConfigTest() {
  useEffect(() => {
    console.log('=== CONFIG TEST START ===');
    console.log('Facebook App ID:', AppConfig.facebookAppId);
    console.log('Facebook App ID length:', AppConfig.facebookAppId.length);
    console.log('Google Maps Key:', AppConfig.googleMapsApiKey ? 'Set' : 'Missing');
    console.log('Firebase API Key:', AppConfig.firebaseApiKey ? 'Set' : 'Missing');
    console.log('Environment:', AppConfig.environment);
    console.log('Config Valid:', AppConfig.isConfigValid());
    console.log('=== CONFIG TEST END ===');
  }, []);

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
        Configuration Test
      </Text>
      <Text>Facebook App ID: {AppConfig.facebookAppId ? '✅ Loaded' : '❌ Missing'}</Text>
      <Text>Length: {AppConfig.facebookAppId.length} characters</Text>
      <Text>Google Maps: {AppConfig.googleMapsApiKey ? '✅ Loaded' : '❌ Missing'}</Text>
      <Text>Firebase API: {AppConfig.firebaseApiKey ? '✅ Loaded' : '❌ Missing'}</Text>
      <Text>Environment: {AppConfig.environment}</Text>
      <Text>Config Valid: {AppConfig.isConfigValid() ? '✅ Yes' : '❌ No'}</Text>
    </View>
  );
}