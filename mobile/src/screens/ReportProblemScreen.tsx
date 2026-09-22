import React, { useState } from 'react';
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
import type { HazardType, HazardSeverity } from '../types/mobile';
import { useOfflineSync } from '../context/OfflineSyncContext';

const HAZARD_OPTIONS: Array<{ type: HazardType; label: string; icon: string }> = [
  { type: 'LANDSLIDE', label: 'Landslide', icon: '🪨' },
  { type: 'MUDSLIP', label: 'Mudslip / Debris', icon: '🌧️' },
  { type: 'FLASH_FLOOD', label: 'Flash Flood', icon: '🌊' },
  { type: 'BRIDGE_COLLAPSE', label: 'Bridge / Culvert', icon: '🌉' },
  { type: 'ROAD_BLOCK', label: 'Police / Blockage', icon: '🚧' },
  { type: 'ACCIDENT', label: 'Vehicle Crash', icon: '💥' },
  { type: 'FALLEN_TREE', label: 'Fallen Tree', icon: '🌲' },
];

const SEVERITIES: Array<{ key: HazardSeverity; label: string }> = [
  { key: 'PASSABLE_CAUTION', label: 'Passable (Caution)' },
  { key: 'SINGLE_LANE_ONLY', label: 'Single Lane Only' },
  { key: 'COMPLETELY_BLOCKED', label: 'Completely Blocked' },
];

interface ReportProblemScreenProps {
  navigation: {
    goBack: () => void;
  };
}

export default function ReportProblemScreen({ navigation }: ReportProblemScreenProps) {
  const { enqueue } = useOfflineSync();
  const [selectedType, setSelectedType] = useState<HazardType>('LANDSLIDE');
  const [selectedSeverity, setSelectedSeverity] = useState<HazardSeverity>('COMPLETELY_BLOCKED');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    enqueue('HAZARD_REPORT', {
      type: selectedType,
      severity: selectedSeverity,
      timestamp: new Date().toISOString(),
      locationPlaceholder: 'NH-29 Zubza Sector (Pending Telemetry)',
    });
    setSubmitted(true);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Report Roadside Hazard</Text>
          <Text style={styles.headerSubtitle}>
            Instant field warning ingested directly into Smart Route AI
          </Text>
        </View>

        {submitted ? (
          <MobileCard variant="safe" style={styles.confirmationCard}>
            <Text style={styles.confirmIcon}>📢</Text>
            <Text style={styles.confirmTitle}>Hazard Reported & Broadcast</Text>
            <Text style={styles.confirmBody}>
              Your incident report has been queued for broadcast to all regional transport units and the State Emergency Operation Center.
            </Text>
            <MobileButton
              title="Return to Dashboard"
              onPress={() => navigation.goBack()}
              variant="primary"
              style={{ marginTop: 16 }}
            />
          </MobileCard>
        ) : (
          <View>
            {/* Hazard Category Grid */}
            <Text style={styles.sectionLabel}>Select Hazard Category</Text>
            <View style={styles.hazardGrid}>
              {HAZARD_OPTIONS.map((item) => {
                const isSelected = selectedType === item.type;
                return (
                  <TouchableOpacity
                    key={item.type}
                    activeOpacity={0.8}
                    onPress={() => setSelectedType(item.type)}
                    style={[
                      styles.hazardTile,
                      isSelected && styles.hazardTileSelected,
                    ]}
                  >
                    <Text style={styles.hazardIcon}>{item.icon}</Text>
                    <Text
                      style={[
                        styles.hazardLabel,
                        isSelected && styles.hazardLabelSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Severity Level */}
            <Text style={styles.sectionLabel}>Passability / Severity</Text>
            <View style={styles.severityContainer}>
              {SEVERITIES.map((s) => {
                const isSelected = selectedSeverity === s.key;
                return (
                  <TouchableOpacity
                    key={s.key}
                    activeOpacity={0.8}
                    onPress={() => setSelectedSeverity(s.key)}
                    style={[
                      styles.severityBtn,
                      isSelected && styles.severityBtnSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.severityText,
                        isSelected && styles.severityTextSelected,
                      ]}
                    >
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* In-Cab Quick Submission */}
            <MobileButton
              title="Transmit Hazard Bulletin"
              onPress={handleSubmit}
              variant="danger"
              size="driving"
              style={{ marginTop: 18 }}
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
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.mistMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 6,
  },
  hazardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: SPACING.lg,
  },
  hazardTile: {
    width: '31%',
    backgroundColor: COLORS.forest200,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hazardTileSelected: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: COLORS.danger,
  },
  hazardIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  hazardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.mistDim,
    textAlign: 'center',
  },
  hazardLabelSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  severityContainer: {
    gap: 8,
    marginBottom: SPACING.lg,
  },
  severityBtn: {
    backgroundColor: COLORS.forest200,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  severityBtnSelected: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderColor: COLORS.amber,
  },
  severityText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.mist,
  },
  severityTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  confirmationCard: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  confirmIcon: {
    fontSize: 36,
    marginBottom: 10,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  confirmBody: {
    fontSize: 13,
    color: COLORS.mistDim,
    textAlign: 'center',
    lineHeight: 18,
  },
});
