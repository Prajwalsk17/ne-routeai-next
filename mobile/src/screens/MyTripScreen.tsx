import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { COLORS, SPACING } from '../theme/tokens';
import MobileButton from '../components/MobileButton';
import MobileCard from '../components/MobileCard';
import MobileBadge from '../components/MobileBadge';
import EmptyStateView from '../components/EmptyStateView';
import type { ActiveTrip } from '../types/mobile';

interface MyTripScreenProps {
  navigation: {
    navigate: (screen: string) => void;
  };
}

export default function MyTripScreen({ navigation }: MyTripScreenProps) {
  // Zero fabrication: Initially activeTrip is null unless assigned
  const activeTrip: ActiveTrip | null = null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Trip Itinerary & Manifest</Text>
          <Text style={styles.headerSubtitle}>
            Waypoint sequence, cargo specifications & cold-chain thresholds
          </Text>
        </View>

        {activeTrip === null ? (
          <EmptyStateView
            title="No Active Trip Manifest"
            description="Your vehicle has not been dispatched on an active route yet. Once assigned, your multi-stop itinerary and handling rules will display here."
            primaryAction={{
              label: 'Return to Dashboard',
              onPress: () => navigation.navigate('HomeTab'),
            }}
          />
        ) : (
          <View>
            <MobileCard variant="elevated">
              <Text style={styles.manifestTitle}>Manifest Details</Text>
            </MobileCard>
          </View>
        )}

        {/* Safe Havens & Military Checkpoint Protocols */}
        <MobileCard style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Text style={styles.infoTitle}>Mountain Checkpoint Protocols</Text>
            <MobileBadge label="Mandatory" variant="amber" />
          </View>
          <Text style={styles.infoBody}>
            Drivers must present the encrypted checkpoint QR code at all Assam Rifles, BRO, and State Police mountain border transit posts.
          </Text>
        </MobileCard>
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
    lineHeight: 18,
  },
  manifestTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  infoCard: {
    marginTop: SPACING.md,
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  infoBody: {
    fontSize: 12,
    color: COLORS.mistDim,
    lineHeight: 18,
  },
});
