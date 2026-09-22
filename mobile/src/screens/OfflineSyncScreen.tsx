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
import { useOfflineSync } from '../context/OfflineSyncContext';

interface OfflineSyncScreenProps {
  navigation: {
    goBack: () => void;
  };
}

export default function OfflineSyncScreen({ navigation }: OfflineSyncScreenProps) {
  const {
    outbox,
    isOnline,
    isSyncing,
    pendingCount,
    conflictCount,
    syncNow,
    retryItem,
    dismissItem,
    clearSynced,
    checkConnection,
  } = useOfflineSync();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Offline Sync & Outbox Queue</Text>
          <Text style={styles.headerSubtitle}>
            Local-first replay buffer for intermittent mountain connectivity
          </Text>
        </View>

        {/* Network State Banner */}
        <MobileCard
          variant={isOnline ? 'safe' : 'default'}
          style={styles.connectionCard}
        >
          <View style={styles.connectionRow}>
            <View style={styles.connectionInfo}>
              <View style={[styles.dot, isOnline ? styles.onlineDot : styles.offlineDot]} />
              <Text style={styles.connectionTitle}>
                {isOnline ? 'Cellular / Wi-Fi Active' : 'Offline (Mountain Shadow Zone)'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => checkConnection()}>
              <MobileBadge
                label={isOnline ? 'Connected' : 'Offline'}
                variant={isOnline ? 'safe' : 'amber'}
              />
            </TouchableOpacity>
          </View>
          <Text style={styles.connectionSub}>
            {isOnline
              ? 'Telemetry pings, incident bulletins, and delivery proofs sync automatically with dispatch.'
              : 'Mountain shadow zone detected. Operational actions are buffered locally with timestamps.'}
          </Text>
        </MobileCard>

        {/* Conflict Warning Banner */}
        {conflictCount > 0 && (
          <MobileCard variant="elevated" style={styles.conflictBanner}>
            <View style={styles.conflictHeader}>
              <Text style={styles.conflictIcon}>⚠️</Text>
              <Text style={styles.conflictTitle}>
                {conflictCount} Server Sync Conflict{conflictCount > 1 ? 's' : ''} Detected
              </Text>
            </View>
            <Text style={styles.conflictDesc}>
              Some offline actions conflicted with server dispatch status (e.g. consignments cancelled while offline). Server state was preserved to prevent corrupting manifests.
            </Text>
          </MobileCard>
        )}

        {/* Outbox Items Count & Sync Action */}
        <View style={styles.queueHeader}>
          <Text style={styles.sectionLabel}>
            Pending Outbox Actions ({pendingCount})
          </Text>
          {outbox.some((i) => i.status === 'SYNCED') && (
            <MobileButton
              title="Clear Synced"
              onPress={clearSynced}
              variant="ghost"
              style={{ paddingVertical: 4 }}
            />
          )}
        </View>

        {outbox.length === 0 ? (
          <EmptyStateView
            title="Outbox Clear — Fully Synchronized"
            description="All field telemetry, checkpoint records, incident bulletins, and proof-of-delivery items have been transmitted to dispatch."
            primaryAction={{
              label: 'Return to Dashboard',
              onPress: () => navigation.goBack(),
            }}
          />
        ) : (
          <View style={styles.list}>
            {outbox.map((item) => (
              <MobileCard key={item.id} style={styles.itemCard}>
                <View style={styles.itemRow}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.typeBadgeRow}>
                      <Text style={styles.itemType}>{item.type.replace(/_/g, ' ')}</Text>
                      <Text style={styles.entityTag}>ID: {item.entityId.slice(0, 14)}</Text>
                    </View>
                    <Text style={styles.itemTime}>
                      Queued: {new Date(item.clientTimestamp).toLocaleTimeString()}
                    </Text>
                  </View>
                  <MobileBadge
                    label={item.status}
                    variant={
                      item.status === 'SYNCED'
                        ? 'safe'
                        : item.status === 'CONFLICT'
                        ? 'amber'
                        : item.status === 'FAILED' || item.status === 'AUTH_REQUIRED'
                        ? 'danger'
                        : 'amber'
                    }
                  />
                </View>

                {/* Conflict Detail Section */}
                {item.status === 'CONFLICT' && item.conflict && (
                  <View style={styles.conflictDetailBox}>
                    <Text style={styles.conflictDetailTitle}>
                      Resolution: {item.conflict.resolution}
                    </Text>
                    <Text style={styles.conflictDetailReason}>
                      {item.conflict.resolutionReason}
                    </Text>
                    <TouchableOpacity
                      style={styles.dismissBtn}
                      onPress={() => dismissItem(item.id)}
                    >
                      <Text style={styles.dismissBtnText}>Acknowledge & Dismiss</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Error & Retry Section */}
                {item.status === 'FAILED' && (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>
                      Error: {item.error || 'Network transmission failed'} (Attempt {item.retryCount}/5)
                    </Text>
                    <TouchableOpacity
                      style={styles.retryBtn}
                      onPress={() => retryItem(item.id)}
                    >
                      <Text style={styles.retryBtnText}>Retry Now</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </MobileCard>
            ))}

            <MobileButton
              title={isSyncing ? 'Synchronizing Outbox...' : 'Force Sync Now'}
              onPress={syncNow}
              variant="primary"
              size="driving"
              isLoading={isSyncing}
              disabled={!isOnline || pendingCount === 0}
              style={{ marginTop: 14 }}
            />
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
    lineHeight: 18,
  },
  connectionCard: {
    marginBottom: SPACING.lg,
  },
  connectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  connectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  onlineDot: {
    backgroundColor: COLORS.safe,
  },
  offlineDot: {
    backgroundColor: COLORS.amber,
  },
  connectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  connectionSub: {
    fontSize: 12,
    color: COLORS.mist,
    opacity: 0.8,
    lineHeight: 16,
  },
  conflictBanner: {
    marginBottom: SPACING.lg,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  conflictHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  conflictIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  conflictTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.amber,
  },
  conflictDesc: {
    fontSize: 12,
    color: COLORS.mist,
    lineHeight: 16,
  },
  queueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  list: {
    gap: SPACING.md,
  },
  itemCard: {
    marginBottom: 0,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  typeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  itemType: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  entityTag: {
    fontSize: 11,
    color: COLORS.mistDim,
    fontFamily: 'monospace',
  },
  itemTime: {
    fontSize: 11,
    color: COLORS.mistDim,
  },
  conflictDetailBox: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(245, 158, 11, 0.2)',
  },
  conflictDetailTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.amber,
    marginBottom: 2,
  },
  conflictDetailReason: {
    fontSize: 12,
    color: COLORS.mist,
    lineHeight: 16,
    marginBottom: 8,
  },
  dismissBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  dismissBtnText: {
    fontSize: 11,
    color: COLORS.amber,
    fontWeight: '600',
  },
  errorBox: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(239, 68, 68, 0.2)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 11,
    color: COLORS.danger,
    flex: 1,
    marginRight: 8,
  },
  retryBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  retryBtnText: {
    fontSize: 11,
    color: COLORS.danger,
    fontWeight: '600',
  },
});
