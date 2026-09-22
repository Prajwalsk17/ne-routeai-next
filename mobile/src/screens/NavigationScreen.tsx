import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { COLORS, SPACING, TOUCH_TARGETS } from '../theme/tokens';
import MobileButton from '../components/MobileButton';
import MobileBadge from '../components/MobileBadge';
import {
  startTripTracking,
  stopTripTracking,
  requestLocationPermissions,
  subscribeToPosition,
  subscribeToSignalQuality,
  getGpsSignalQuality,
  getLastKnownPosition,
  getOfflineQueueCount,
  MobileGpsPosition,
  GpsSignalQuality,
} from '../services/gps.service';

interface NavigationScreenProps {
  navigation: {
    goBack: () => void;
    navigate: (screen: string) => void;
  };
}

export default function NavigationScreen({ navigation }: NavigationScreenProps) {
  const [isTracking, setIsTracking] = useState(false);
  const [signalQuality, setSignalQuality] = useState<GpsSignalQuality>(getGpsSignalQuality());
  const [position, setPosition] = useState<MobileGpsPosition | null>(getLastKnownPosition());
  const [queueCount, setQueueCount] = useState<number>(getOfflineQueueCount());

  useEffect(() => {
    // Request location permissions on mount
    requestLocationPermissions();

    const unsubPos = subscribeToPosition((newPos) => {
      setPosition(newPos);
      setQueueCount(getOfflineQueueCount());
    });

    const unsubSignal = subscribeToSignalQuality((quality) => {
      setSignalQuality(quality);
    });

    return () => {
      unsubPos();
      unsubSignal();
    };
  }, []);

  const handleToggleTracking = () => {
    if (isTracking) {
      stopTripTracking();
      setIsTracking(false);
    } else {
      startTripTracking({
        vehicleId: 'c0000000-0000-0000-0000-000000000001',
        tripId: 'trp-active-demo',
        pingIntervalMs: 5000,
      });
      setIsTracking(true);
    }
  };

  const getBadgeConfig = (): { label: string; variant: 'teal' | 'amber' | 'danger' | 'orchid' } => {
    if (!isTracking) {
      return { label: 'GPS Stream: Inactive', variant: 'amber' };
    }
    switch (signalQuality) {
      case 'EXCELLENT':
        return {
          label: `GPS: High Accuracy (±${Math.round(position?.accuracyMeters || 3)}m)`,
          variant: 'teal',
        };
      case 'GOOD':
        return {
          label: `GPS: Good (±${Math.round(position?.accuracyMeters || 8)}m)`,
          variant: 'teal',
        };
      case 'DEGRADED':
        return {
          label: `GPS: Degraded (±${Math.round(position?.accuracyMeters || 35)}m)`,
          variant: 'amber',
        };
      case 'LOST':
        return { label: 'GPS: Signal Lost', variant: 'danger' };
      default:
        return { label: 'GPS: Standby', variant: 'amber' };
    }
  };

  const badge = getBadgeConfig();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Maneuver Guidance Banner */}
        <View style={styles.maneuverBanner}>
          <View style={styles.maneuverIconBox}>
            <Text style={styles.maneuverIcon}>⬆️</Text>
          </View>
          <View style={styles.maneuverContent}>
            <Text style={styles.maneuverInstruction}>
              {isTracking ? 'Active Trip Guidance: NH-29' : 'Awaiting Route Assignment'}
            </Text>
            <Text style={styles.maneuverSubtext}>
              {isTracking
                ? 'High-precision mountain tracking active'
                : 'Turn guidance activates automatically upon dispatch'}
            </Text>
          </View>
        </View>

        {/* Mountain Warning / Terrain Pill */}
        <View style={styles.warningContainer}>
          <View style={styles.warningPill}>
            <Text style={styles.warningIcon}>⛰️</Text>
            <Text style={styles.warningText}>
              Himalayan Terrain Safety Radar: {isTracking ? 'Streaming Active' : 'Standby'}
            </Text>
          </View>
        </View>

        {/* Map Viewport Shell (Real-Time GPS HUD) */}
        <View style={styles.mapViewport} testID="navigation-map-shell">
          <View style={styles.radarSweepCircle}>
            <Text style={styles.radarCenterIcon}>📍</Text>
          </View>

          {isTracking && position ? (
            <View style={styles.liveCoordCard}>
              <Text style={styles.liveCoordTitle}>LIVE GPS FIX</Text>
              <Text style={styles.liveCoordText}>
                {position.latitude.toFixed(5)}°N, {position.longitude.toFixed(5)}°E
              </Text>
              {position.altitudeMeters && (
                <Text style={styles.liveAltText}>
                  Elevation: {Math.round(position.altitudeMeters)} m ASL · Heading: {Math.round(position.headingDegrees)}°
                </Text>
              )}
            </View>
          ) : (
            <>
              <Text style={styles.standbyTitle}>Navigation Engine Standby</Text>
              <Text style={styles.standbyBody}>
                No active route coordinates detected. Vector tile rendering and real-time mountain guidance will initialize when tracking begins.
              </Text>
            </>
          )}

          <View style={styles.badgeRow}>
            <MobileBadge label={badge.label} variant={badge.variant} dot />
            {queueCount > 0 && (
              <MobileBadge
                label={`Offline Queue: ${queueCount}`}
                variant="orchid"
                dot
              />
            )}
          </View>

          <TouchableOpacity
            style={[styles.toggleBtn, isTracking ? styles.toggleBtnStop : styles.toggleBtnStart]}
            onPress={handleToggleTracking}
          >
            <Text style={styles.toggleBtnText}>
              {isTracking ? '⏹ Pause GPS Tracking' : '▶ Activate In-Cab GPS'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Operational Telemetry Bar */}
        <View style={styles.bottomBar}>
          <View style={styles.telemetryStrip}>
            <View style={styles.telemetryItem}>
              <Text style={styles.telemetryVal}>
                {position ? Math.round(position.speedKmh) : 0}
              </Text>
              <Text style={styles.telemetryUnit}>KM/H</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.telemetryItem}>
              <Text style={styles.telemetryVal}>
                {position?.altitudeMeters ? Math.round(position.altitudeMeters) : '--'}
              </Text>
              <Text style={styles.telemetryUnit}>ELEV (M)</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.telemetryItem}>
              <Text style={styles.telemetryVal}>
                {position ? `${Math.round(position.headingDegrees)}°` : '--'}
              </Text>
              <Text style={styles.telemetryUnit}>BEARING</Text>
            </View>
          </View>

          <MobileButton
            title="End Navigation Session"
            onPress={() => {
              if (isTracking) stopTripTracking();
              navigation.goBack();
            }}
            variant="secondary"
            size="driving"
            style={styles.endBtn}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.forest500,
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  maneuverBanner: {
    backgroundColor: COLORS.forest200,
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  maneuverIconBox: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: COLORS.forest100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  maneuverIcon: {
    fontSize: 24,
  },
  maneuverContent: {
    flex: 1,
  },
  maneuverInstruction: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  maneuverSubtext: {
    color: COLORS.mist,
    fontSize: 12,
    opacity: 0.8,
    marginTop: 2,
  },
  warningContainer: {
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.sm,
  },
  warningPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  warningIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  warningText: {
    color: COLORS.amber,
    fontSize: 12,
    fontWeight: '600',
  },
  mapViewport: {
    flex: 1,
    margin: SPACING.md,
    backgroundColor: COLORS.forest300,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  radarSweepCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(168, 85, 247, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  radarCenterIcon: {
    fontSize: 32,
  },
  standbyTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  standbyBody: {
    color: COLORS.mist,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    opacity: 0.7,
    marginBottom: SPACING.md,
  },
  liveCoordCard: {
    backgroundColor: 'rgba(13, 148, 136, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.35)',
    borderRadius: 12,
    padding: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.md,
    width: '100%',
  },
  liveCoordTitle: {
    color: COLORS.teal,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  liveCoordText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  liveAltText: {
    color: COLORS.mist,
    fontSize: 12,
    marginTop: 4,
    opacity: 0.85,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  toggleBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
  },
  toggleBtnStart: {
    backgroundColor: 'rgba(13, 148, 136, 0.2)',
    borderColor: COLORS.teal,
  },
  toggleBtnStop: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: COLORS.danger,
  },
  toggleBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  bottomBar: {
    backgroundColor: COLORS.forest400,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    padding: SPACING.md,
  },
  telemetryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: SPACING.md,
  },
  telemetryItem: {
    alignItems: 'center',
  },
  telemetryVal: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  telemetryUnit: {
    color: COLORS.mist,
    fontSize: 10,
    fontWeight: '600',
    opacity: 0.7,
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  endBtn: {
    width: '100%',
  },
});
