import React, { useState } from 'react';
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
import { useAuth } from '../context/AuthContext';

export default function ProfileScreen() {
  const { driver, logout } = useAuth();
  const [showQr, setShowQr] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Driver Credentials & Permits</Text>
          <Text style={styles.headerSubtitle}>
            Commercial mountain transit documents & checkpoint verification
          </Text>
        </View>

        {/* Driver Identity Card */}
        <MobileCard variant="elevated">
          <View style={styles.driverRow}>
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
            <View style={styles.driverInfo}>
              <Text style={styles.driverName}>{driver?.name || 'Authorized Driver'}</Text>
              <Text style={styles.driverOrg}>{driver?.organizationName}</Text>
              <Text style={styles.driverPhone}>{driver?.phone}</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statVal}>{driver?.safetyScore || 98}</Text>
              <Text style={styles.statLabel}>SAFETY SCORE</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statVal}>{driver?.totalKmDriven?.toLocaleString() || '14,280'}</Text>
              <Text style={styles.statLabel}>NER KM DRIVEN</Text>
            </View>
          </View>
        </MobileCard>

        {/* Checkpoint Digital QR Pass */}
        <MobileCard>
          <View style={styles.qrHeader}>
            <Text style={styles.qrTitle}>Mountain Checkpoint Digital Pass</Text>
            <MobileBadge label="Encrypted" variant="safe" />
          </View>
          <Text style={styles.qrBody}>
            Present this verifiable pass at military checkposts, BRO transit gates, and disaster relief cordons.
          </Text>

          {showQr ? (
            <View style={styles.qrPlaceholderBox}>
              <Text style={styles.qrCodeIcon}>🏁</Text>
              <Text style={styles.qrMonospace}>AUTH:NER-PASS-{driver?.id?.toUpperCase()}</Text>
              <MobileButton
                title="Hide Checkpoint Pass"
                onPress={() => setShowQr(false)}
                variant="ghost"
                style={{ marginTop: 8 }}
              />
            </View>
          ) : (
            <MobileButton
              title="Display Checkpoint Pass"
              onPress={() => setShowQr(true)}
              variant="secondary"
              style={{ marginTop: 10 }}
            />
          )}
        </MobileCard>

        {/* Transport Permits */}
        <Text style={styles.sectionLabel}>Commercial Compliance</Text>
        <MobileCard>
          <View style={styles.docRow}>
            <View>
              <Text style={styles.docTitle}>Commercial Heavy Driving License</Text>
              <Text style={styles.docSub}>{driver?.licenseNumber || 'NL-01-2021-008924'}</Text>
            </View>
            <MobileBadge label="Valid" variant="safe" />
          </View>

          <View style={styles.docDivider} />

          <View style={styles.docRow}>
            <View>
              <Text style={styles.docTitle}>Himalayan Mountain Road Permit</Text>
              <Text style={styles.docSub}>Class H-4 (Gradients &gt; 15%)</Text>
            </View>
            <MobileBadge label="Certified" variant="safe" />
          </View>
        </MobileCard>

        {/* Sign Out / End Shift */}
        <MobileButton
          title="End Shift & Sign Out"
          onPress={logout}
          variant="danger"
          size="driving"
          style={{ marginTop: 16 }}
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
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.mistDim,
    marginTop: 2,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.forest100,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  driverOrg: {
    fontSize: 12,
    color: COLORS.mistDim,
    marginTop: 2,
  },
  driverPhone: {
    fontSize: 12,
    color: COLORS.mistMuted,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  statItem: {
    alignItems: 'center',
  },
  statVal: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.mistMuted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  qrHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  qrTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  qrBody: {
    fontSize: 12,
    color: COLORS.mistDim,
    lineHeight: 16,
    marginBottom: 8,
  },
  qrPlaceholderBox: {
    backgroundColor: COLORS.forest300,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: SPACING.lg,
    alignItems: 'center',
    marginVertical: 10,
  },
  qrCodeIcon: {
    fontSize: 40,
    marginBottom: 6,
  },
  qrMonospace: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: COLORS.mist,
    fontWeight: '700',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.mistMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 10,
  },
  docRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  docTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  docSub: {
    fontSize: 11,
    color: COLORS.mistMuted,
    marginTop: 2,
    fontFamily: 'monospace',
  },
  docDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 10,
  },
});
