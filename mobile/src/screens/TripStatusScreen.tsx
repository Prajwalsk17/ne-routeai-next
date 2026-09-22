import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { COLORS, SPACING } from '../theme/tokens';
import MobileButton from '../components/MobileButton';
import MobileCard from '../components/MobileCard';
import MobileBadge from '../components/MobileBadge';
import { useOfflineSync } from '../context/OfflineSyncContext';

interface TripStatusScreenProps {
  navigation: {
    goBack: () => void;
  };
}

export default function TripStatusScreen({ navigation }: TripStatusScreenProps) {
  const { enqueue } = useOfflineSync();
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [sealsIntact, setSealsIntact] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmitPod = () => {
    enqueue('PROOF_OF_DELIVERY', {
      recipientName,
      recipientPhone,
      sealsIntact,
      timestamp: new Date().toISOString(),
    });
    setSubmitted(true);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Trip Status & Electronic POD</Text>
          <Text style={styles.headerSubtitle}>
            Milestone transitions & recipient delivery verification
          </Text>
        </View>

        {/* Milestone Progression Buttons */}
        <Text style={styles.sectionHeader}>Transit Milestones</Text>
        <View style={styles.milestoneGrid}>
          <MobileButton
            title="🏁 1. Depart Depot"
            onPress={() => {}}
            variant="secondary"
            size="driving"
            style={styles.milestoneBtn}
          />
          <MobileButton
            title="🛡️ 2. Clear Mountain Checkpoint"
            onPress={() => {}}
            variant="secondary"
            size="driving"
            style={styles.milestoneBtn}
          />
          <MobileButton
            title="📍 3. Arrived at Destination"
            onPress={() => {}}
            variant="secondary"
            size="driving"
            style={styles.milestoneBtn}
          />
        </View>

        {/* Electronic Proof of Delivery Form */}
        <Text style={styles.sectionHeader}>Electronic Proof of Delivery (e-POD)</Text>
        <MobileCard variant="elevated">
          {submitted ? (
            <View style={styles.successBox}>
              <Text style={styles.successIcon}>✅</Text>
              <Text style={styles.successTitle}>POD Queued Successfully</Text>
              <Text style={styles.successBody}>
                Delivery sign-off has been recorded in the local outbox and will automatically synchronize with dispatch.
              </Text>
              <MobileButton
                title="Back to Active Trip"
                onPress={() => navigation.goBack()}
                variant="primary"
                style={{ marginTop: 14 }}
              />
            </View>
          ) : (
            <View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Recipient Representative Name</Text>
                <TextInput
                  value={recipientName}
                  onChangeText={setRecipientName}
                  placeholder="e.g. Dr. A. Lyngdoh"
                  placeholderTextColor={COLORS.mistMuted}
                  style={styles.input}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Recipient Mobile Contact</Text>
                <TextInput
                  value={recipientPhone}
                  onChangeText={setRecipientPhone}
                  keyboardType="phone-pad"
                  placeholder="e.g. 9862098765"
                  placeholderTextColor={COLORS.mistMuted}
                  style={styles.input}
                />
              </View>

              {/* Digital Signature Pad Placeholder */}
              <View style={styles.signatureBox}>
                <Text style={styles.signatureLabel}>Recipient Digital Signature</Text>
                <View style={styles.signaturePad}>
                  <Text style={styles.padPrompt}>✍️ Touch screen to record signature</Text>
                </View>
              </View>

              {/* Integrity Checklist */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setSealsIntact(!sealsIntact)}
                style={styles.checkboxRow}
              >
                <View style={[styles.checkbox, sealsIntact && styles.checkboxChecked]}>
                  {sealsIntact && <Text style={styles.checkMark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>
                  Cold-chain seals & tamper-evident packaging verified intact
                </Text>
              </TouchableOpacity>

              <MobileButton
                title="Submit & Sign Off Delivery"
                onPress={handleSubmitPod}
                variant="primary"
                size="driving"
                style={{ marginTop: 12 }}
              />
            </View>
          )}
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
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.mistMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 6,
  },
  milestoneGrid: {
    gap: 10,
    marginBottom: SPACING.lg,
  },
  milestoneBtn: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.mist,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.forest300,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 14,
  },
  signatureBox: {
    marginBottom: 14,
  },
  signatureLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.mist,
    marginBottom: 6,
  },
  signaturePad: {
    height: 100,
    backgroundColor: COLORS.forest300,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 8,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  padPrompt: {
    fontSize: 12,
    color: COLORS.mistMuted,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: COLORS.forest300,
  },
  checkboxChecked: {
    backgroundColor: COLORS.safe,
    borderColor: COLORS.safe,
  },
  checkMark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 12,
    color: COLORS.mist,
    lineHeight: 16,
  },
  successBox: {
    alignItems: 'center',
    padding: SPACING.md,
  },
  successIcon: {
    fontSize: 36,
    marginBottom: 10,
  },
  successTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  successBody: {
    fontSize: 13,
    color: COLORS.mistDim,
    textAlign: 'center',
    lineHeight: 18,
  },
});
