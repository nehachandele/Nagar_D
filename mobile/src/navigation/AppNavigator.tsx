import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

import { HomeScreen } from '../screens/HomeScreen';
import { ReportIssueScreen } from '../screens/ReportIssueScreen';
import { TrackIssueScreen } from '../screens/TrackIssueScreen';
import { NearbyIssuesScreen } from '../screens/NearbyIssuesScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

interface MainTabsProps {
  user: any;
  onLogout: () => void;
}

export const MainTabs: React.FC<MainTabsProps> = ({ user, onLogout }) => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        headerStyle: { backgroundColor: COLORS.surface },
        headerTitleStyle: { fontWeight: '800', color: COLORS.dark },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'HomeTab') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Report') {
            iconName = focused ? 'camera' : 'camera-outline';
          } else if (route.name === 'Tracking') {
            iconName = focused ? 'time' : 'time-outline';
          } else if (route.name === 'Nearby') {
            iconName = focused ? 'navigate' : 'navigate-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size || 22} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="HomeTab"
        options={{ headerShown: false, tabBarLabel: 'Home' }}
      >
        {(props) => <HomeScreen {...props} user={user} />}
      </Tab.Screen>

      <Tab.Screen
        name="Report"
        component={ReportIssueScreen}
        options={{
          title: 'Report Civic Issue',
          tabBarLabel: 'Report',
          headerStyle: { backgroundColor: COLORS.surface },
        }}
      />

      <Tab.Screen
        name="Tracking"
        component={TrackIssueScreen}
        options={{
          title: 'Issue Status & Timeline',
          tabBarLabel: 'Track',
        }}
      />

      <Tab.Screen
        name="Nearby"
        component={NearbyIssuesScreen}
        options={{
          title: 'Nearby Civic Defects',
          tabBarLabel: 'Nearby',
        }}
      />

      <Tab.Screen
        name="Profile"
        options={{
          title: 'Citizen Profile',
          tabBarLabel: 'Profile',
        }}
      >
        {(props) => <ProfileScreen {...props} user={user} onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
};

interface AuthNavigatorProps {
  onAuthSuccess: (user: any) => void;
}

export const AuthNavigator: React.FC<AuthNavigatorProps> = ({ onAuthSuccess }) => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login">
        {(props) => <LoginScreen {...props} onLoginSuccess={onAuthSuccess} />}
      </Stack.Screen>
      <Stack.Screen name="Register">
        {(props) => <RegisterScreen {...props} onRegisterSuccess={onAuthSuccess} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
};
