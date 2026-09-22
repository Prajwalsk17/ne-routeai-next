import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { COLORS } from '../theme/tokens';
import { useAuth } from '../context/AuthContext';
import { useOfflineSync } from '../context/OfflineSyncContext';

// Screens
import AuthScreen from '../screens/AuthScreen';
import HomeScreen from '../screens/HomeScreen';
import MyTripScreen from '../screens/MyTripScreen';
import NavigationScreen from '../screens/NavigationScreen';
import TripStatusScreen from '../screens/TripStatusScreen';
import ReportProblemScreen from '../screens/ReportProblemScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import SosScreen from '../screens/SosScreen';
import ProfileScreen from '../screens/ProfileScreen';
import OfflineSyncScreen from '../screens/OfflineSyncScreen';

export type ActiveScreen =
  | 'Home'
  | 'MyTrip'
  | 'Navigation'
  | 'TripStatus'
  | 'ReportProblem'
  | 'Notifications'
  | 'EmergencySos'
  | 'Profile'
  | 'OfflineSync';

export default function RootNavigator() {
  const { isAuthenticated, hasDriverAccess } = useAuth();
  const { pendingCount } = useOfflineSync();
  const [currentScreen, setCurrentScreen] = useState<ActiveScreen>('Home');

  // If unauthenticated or no driver role, present authentication screen
  if (!isAuthenticated || !hasDriverAccess) {
    return <AuthScreen />;
  }

  const navigate = (screen: string) => {
    setCurrentScreen(screen as ActiveScreen);
  };

  const goBack = () => {
    setCurrentScreen('Home');
  };

  const navigationProp = {
    navigate,
    goBack,
  };

  // Render modal / secondary screens
  if (currentScreen === 'Navigation') {
    return <NavigationScreen navigation={navigationProp} />;
  }
  if (currentScreen === 'TripStatus') {
    return <TripStatusScreen navigation={navigationProp} />;
  }
  if (currentScreen === 'ReportProblem') {
    return <ReportProblemScreen navigation={navigationProp} />;
  }
  if (currentScreen === 'EmergencySos') {
    return <SosScreen navigation={navigationProp} />;
  }
  if (currentScreen === 'OfflineSync') {
    return <OfflineSyncScreen navigation={navigationProp} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Primary Tab Viewport */}
      <View style={styles.viewport}>
        {currentScreen === 'Home' && <HomeScreen navigation={navigationProp} />}
        {currentScreen === 'MyTrip' && <MyTripScreen navigation={navigationProp} />}
        {currentScreen === 'Notifications' && (
          <NotificationsScreen navigation={navigationProp} />
        )}
        {currentScreen === 'Profile' && <ProfileScreen />}
      </View>

      {/* Persistent Bottom Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setCurrentScreen('Home')}
          style={[styles.tabItem, currentScreen === 'Home' && styles.activeTab]}
        >
          <Text style={styles.tabIcon}>🏠</Text>
          <Text
            style={[
              styles.tabLabel,
              currentScreen === 'Home' && styles.activeTabLabel,
            ]}
          >
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setCurrentScreen('MyTrip')}
          style={[styles.tabItem, currentScreen === 'MyTrip' && styles.activeTab]}
        >
          <Text style={styles.tabIcon}>🚚</Text>
          <Text
            style={[
              styles.tabLabel,
              currentScreen === 'MyTrip' && styles.activeTabLabel,
            ]}
          >
            My Trip
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setCurrentScreen('Notifications')}
          style={[
            styles.tabItem,
            currentScreen === 'Notifications' && styles.activeTab,
          ]}
        >
          <Text style={styles.tabIcon}>🔔</Text>
          <Text
            style={[
              styles.tabLabel,
              currentScreen === 'Notifications' && styles.activeTabLabel,
            ]}
          >
            Alerts
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setCurrentScreen('Profile')}
          style={[
            styles.tabItem,
            currentScreen === 'Profile' && styles.activeTab,
          ]}
        >
          <Text style={styles.tabIcon}>👤</Text>
          <Text
            style={[
              styles.tabLabel,
              currentScreen === 'Profile' && styles.activeTabLabel,
            ]}
          >
            Profile
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.forest400,
  },
  viewport: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    height: 64,
    backgroundColor: COLORS.forest300,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  activeTab: {
    borderTopWidth: 2,
    borderTopColor: COLORS.orchid,
  },
  tabIcon: {
    fontSize: 18,
    marginBottom: 3,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.mistMuted,
  },
  activeTabLabel: {
    color: COLORS.orchidLight,
    fontWeight: '800',
  },
});
