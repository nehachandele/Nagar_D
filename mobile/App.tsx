import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { AuthNavigator, MainTabs } from './src/navigation/AppNavigator';

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);

  const handleAuthSuccess = (userData: any) => {
    setCurrentUser(userData);
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        {currentUser ? (
          <MainTabs user={currentUser} onLogout={handleLogout} />
        ) : (
          <AuthNavigator onAuthSuccess={handleAuthSuccess} />
        )}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
