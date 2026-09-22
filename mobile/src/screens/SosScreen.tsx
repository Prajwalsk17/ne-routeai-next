import React, { useState, useEffect } from 'react';
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
import { useOfflineSync } from '../context/OfflineSyncContext';

interface SosScreenProps {
  navigation: {
    goBack: () => void;
  };
}

export default function SosScreen({ navigation }: SosScreenProps) {
  const { enqueue } = useOfflineSync();
  const [sosState, setSosState] = useState<'IDLE' | 'COUNTDOWN' | 'ACTIVE'>('IDLE');
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (sosState === 'COUNTDOWN' && countdown > 0) {
      timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    } else if (sosState === 'COUNTDOWN' && countdown === 0) {
      setSosState('ACTIVE');
      enqueue('SOS_TRIGGER', {
        distressType: 'CRITICAL_HIGHWAY_SOS',
        timestamp: new Date().toISOString(),
      });
    }
    return () => clearTimeout(timer);
  }, [sosState, countdown, enqueue]);

  const startSosCountdown = () => {
    setCountdown(5);
    setSosState('COUNTDOWN');
  };

  const cancelSos = () => {
    setSosState('IDLE');
    setCountdown(5);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Himalayan Emergency SOS</Text>
          <Text style={styles.headerSubtitle}>
            Driver distress, vehicle rollover or highway entrapment protocol
          </Text>
        </View>

        {sosState === 'IDLE' && (
          <View>
            <MobileCard variant="danger" style={styles.triggerCard}>
              <Text style={styles.beaconSymbol}>🚨</Text>
              <Text style={styles.dangerTitle}>Emergency Beacon Ready</Text>
              <Text style={styles.dangerBody}>
                Triggering SOS will broadcast a high-priority distress alarm with your vehicle identity and last known location to State Police (112), Disaster Control, and Dispatch Command.
              </Text>

              <MobileButton
                title="ACTIVATE EMERGENCY SOS"
                onPress={startSosCountdown}
                variant="sos"
                size="driving"
                style={styles.sosActionBtn}
              />
            </MobileCard>
          </View>
        )}

        {sosState === 'COUNTDOWN' && (
          <MobileCard variant="danger" style={styles.countdownCard}>
            <Text style={styles.countdownNumber}>{countdown}</Text>
            <Text style={styles.countdownPrompt}>
              Transmitting Emergency Distress Beacon in {countdown} seconds...
            </Text>

            <MobileButton
              title="CANCEL SOS (False Alarm)"
              onPress={cancelSos}
              variant="secondary"
              size="driving"
              style={styles.cancelBtn}
            />
          </MobileCard>
        )}

        {sosState === 'ACTIVE' && (
          <MobileCard variant="danger" style={styles.activeCard}>
            <View style={styles.pulsingRing}>
              <Text style={styles.activeSymbol}>📡</Text>
            </View>
            <Text style={styles.activeTitle}>EMERGENCY BEACON TRANSMITTING</Text>
            <Text style={styles.activeBody}>
              Continuous distress beacon active. Dispatch and State Rescue teams have been notified. Stay with your vehicle if safe.
            </Text>

            <MobileButton
              title="Deactivate SOS Beacon"
              onPress={cancelSos}
              variant="secondary"
              style={{ marginTop: 16 }}
            />
          </MobileCard>
        )}

        {/* Direct One-Touch Hotline Triggers */}
        <Text style={styles.sectionLabel}>Direct Emergency Contacts</Text>
        <View style={styles.hotlineGrid}>
          <MobileButton
            title="📞 Call Police (112)"
            onPress={() => {}}
            variant="secondary"
            size="driving"
            style={styles.hotlineBtn}
          />
          <MobileButton
            title="🚑 Call Medical Relief (108)"
            onPress={() => {}}
            variant="secondary"
            size="driving"
            style={styles.hotlineBtn}
          />
          <MobileButton
            title="🏢 Call Dispatch Control"
            onPress={() => {}}
            variant="secondary"
            size="driving"
            style={styles.hotlineBtn}
          />
        </View>

        <MobileButton
          title="Back to Dashboard"
          onPress={() => navigation.goBack()}
          variant="ghost"
          style={{ marginTop: 14 }}
        />
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
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.mistDim,
    marginTop: 2,
    lineHeight: 18,
  },
  triggerCard: {
    alignItems: 'center',
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  beaconSymbol: {
    fontSize: 44,
    marginBottom: 10,
  },
  dangerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  dangerBody: {
    fontSize: 13,
    color: COLORS.mist,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  sosActionBtn: {
    width: '100%',
  },
  countdownCard: {
    alignItems: 'center',
    padding: SPACING.xxl,
    marginBottom: SPACING.lg,
  },
  countdownNumber: {
    fontSize: 64,
    fontWeight: '900',
    color: COLORS.danger,
    marginBottom: 8,
  },
  countdownPrompt: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  cancelBtn: {
    width: '100%',
  },
  activeCard: {
    alignItems: 'center',
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  pulsingRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  activeSymbol: {
    fontSize: 32,
  },
  activeTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  activeBody: {
    fontSize: 13,
    color: COLORS.mist,
    textAlign: 'center',
    lineHeight: 18,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.mistMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  hotlineGrid: {
    gap: 10,
    marginBottom: SPACING.md,
  },
  hotlineBtn: {
    width: '100%',
  },
});
