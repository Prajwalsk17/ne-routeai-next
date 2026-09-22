import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { COLORS, SPACING } from '../theme/tokens';
import MobileButton from '../components/MobileButton';
import MobileCard from '../components/MobileCard';
import MobileBadge from '../components/MobileBadge';
import EmptyStateView from '../components/EmptyStateView';
import { useAuth } from '../context/AuthContext';
import { useOfflineSync } from '../context/OfflineSyncContext';

interface HomeScreenProps {
  navigation: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  };
}

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const { driver, dutyStatus, toggleDutyStatus } = useAuth();
  const { pendingCount, isOnline } = useOfflineSync();

  // Zero fabrication: Initially activeTrip is null unless assigned by dispatch
  const activeTrip = null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Driver Header & Shift Status */}
        <View style={styles.header}>
          <View style={styles.driverMeta}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {driver?.name
                  ? driver.name
                      .split(' ')
                      .map((w) => w[0])
                      .join('')
                      .toUpperCase()
                  : 'DR'}
              </Text>
            </View>
            <View>
              <Text style={styles.driverName}>{driver?.name || 'Authorized Driver'}</Text>
              <Text style={styles.vehicleText}>
                {driver?.assignedVehiclePlate || 'No Vehicle Linked'} • {driver?.organizationName}
              </Text>
            </View>
          </View>

          {/* Duty Status Toggle */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={toggleDutyStatus}
            style={[
              styles.dutyPill,
              dutyStatus === 'ON_DUTY' ? styles.dutyOn : styles.dutyOff,
            ]}
          >
            <View
              style={[
                styles.dutyDot,
                dutyStatus === 'ON_DUTY' ? styles.dotOn : styles.dotOff,
              ]}
            />
            <Text style={styles.dutyText}>
              {dutyStatus === 'ON_DUTY' ? 'ON DUTY' : 'OFF DUTY'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Connectivity & Offline Queue Bar */}
        <View style={styles.statusBar}>
          <View style={styles.statusItem}>
            <View style={[styles.statusIndicator, isOnline ? styles.onlineDot : styles.offlineDot]} />
            <Text style={styles.statusText}>
              {isOnline ? 'Online (Connected)' : 'Working Offline'}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate('OfflineSync')}
            style={styles.queueChip}
          >
            <Text style={styles.queueText}>
              Outbox: {pendingCount} queued
            </Text>
          </TouchableOpacity>
        </View>

        {/* Active Trip Overview (Strict Zero-Fabrication) */}
        <Text style={styles.sectionHeader}>Active Shift Assignment</Text>
        {activeTrip === null ? (
          <EmptyStateView
            title="No Active Trip Assigned"
            description="You currently have no dispatched trips in queue. When dispatch plans an assignment for your vehicle, route guidance will appear here."
            primaryAction={{
              label: 'Check for Assigned Trips',
              onPress: () => {},
            }}
            secondaryAction={{
              label: 'View Trip Itinerary',
              onPress: () => navigation.navigate('MyTripTab'),
            }}
          />
        ) : (
          <MobileCard variant="elevated">
            {/* Populated Trip View when assigned in future phases */}
            <Text style={styles.tripTitle}>Active Trip</Text>
          </MobileCard>
        )}

        {/* In-Cab Critical Operational Actions */}
        <Text style={styles.sectionHeader}>In-Cab Actions</Text>
        <View style={styles.actionGrid}>
          <MobileButton
            title="🗺️ Navigation Console"
            onPress={() => navigation.navigate('Navigation')}
            variant="primary"
            size="driving"
            style={styles.gridBtn}
          />
          <MobileButton
            title="📋 Trip Status & e-POD"
            onPress={() => navigation.navigate('TripStatus')}
            variant="secondary"
            size="driving"
            style={styles.gridBtn}
          />
          <MobileButton
            title="⚠️ Report Road Hazard"
            onPress={() => navigation.navigate('ReportProblem')}
            variant="secondary"
            size="driving"
            style={styles.gridBtn}
          />
          <MobileButton
            title="🚨 EMERGENCY SOS"
            onPress={() => navigation.navigate('EmergencySos')}
            variant="sos"
            size="driving"
            style={styles.gridBtn}
          />
        </View>

        {/* Safety Advisories Summary */}
        <MobileCard style={styles.safetyCard}>
          <View style={styles.safetyHeader}>
            <Text style={styles.safetyTitle}>Himalayan Terrain Safety Mode</Text>
            <MobileBadge label="Active" variant="safe" dot />
          </View>
          <Text style={styles.safetyBody}>
            Automatic proximity alerting for active landslide corridors, hairpin gradient throttling, and safe haven checkpoints active.
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  driverMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.forest100,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  driverName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  vehicleText: {
    fontSize: 11,
    color: COLORS.mistMuted,
    marginTop: 1,
  },
  dutyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  dutyOn: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderColor: 'rgba(34, 197, 94, 0.4)',
  },
  dutyOff: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  dutyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  dotOn: {
    backgroundColor: COLORS.safe,
  },
  dotOff: {
    backgroundColor: COLORS.danger,
  },
  dutyText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.forest300,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  onlineDot: {
    backgroundColor: COLORS.safe,
  },
  offlineDot: {
    backgroundColor: COLORS.amber,
  },
  statusText: {
    fontSize: 12,
    color: COLORS.mist,
    fontWeight: '600',
  },
  queueChip: {
    backgroundColor: COLORS.forest100,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  queueText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.mistDim,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.mistMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  tripTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionGrid: {
    gap: 12,
    marginBottom: SPACING.xl,
  },
  gridBtn: {
    width: '100%',
  },
  safetyCard: {
    marginTop: SPACING.sm,
  },
  safetyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  safetyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  safetyBody: {
    fontSize: 12,
    color: COLORS.mistDim,
    lineHeight: 18,
  },
});
