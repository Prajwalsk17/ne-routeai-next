import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { COLORS, SPACING } from '../theme/tokens';
import EmptyStateView from '../components/EmptyStateView';
import type { DriverNotification } from '../types/mobile';

interface NotificationsScreenProps {
  navigation: {
    navigate: (screen: string) => void;
  };
}

export default function NotificationsScreen({ navigation }: NotificationsScreenProps) {
  // Zero fabrication: Starts strictly empty unless real notifications are broadcast
  const notifications: DriverNotification[] = [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Operational Advisories</Text>
          <Text style={styles.headerSubtitle}>
            Dispatcher alerts, route recalculations & IMD mountain weather
          </Text>
        </View>

        {notifications.length === 0 ? (
          <EmptyStateView
            title="No Active Alerts or Advisories"
            description="There are currently no active safety advisories or route modifications for your sector. Corridors are clear."
            primaryAction={{
              label: 'Return to Dashboard',
              onPress: () => navigation.navigate('HomeTab'),
            }}
          />
        ) : (
          <View>
            {/* Populated Notifications Feed */}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.forest400,
  },
  container: {
    padding: SPACING.lg,
  },
  header: {
    marginBottom: SPACING.lg,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.mistDim,
    marginTop: 2,
  },
});
