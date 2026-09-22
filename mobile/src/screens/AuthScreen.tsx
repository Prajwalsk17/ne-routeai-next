import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { COLORS, SPACING } from '../theme/tokens';
import MobileButton from '../components/MobileButton';
import MobileCard from '../components/MobileCard';
import { useAuth } from '../context/AuthContext';

export default function AuthScreen() {
  const { loginWithPhone, quickUnlockBiometrics, isLoading, error } = useAuth();
  const [phone, setPhone] = useState('9862012345');
  const [otp, setOtp] = useState('763486');
  const [otpSent, setOtpSent] = useState(false);

  const handleSendOtp = () => {
    if (phone.replace(/\D/g, '').length >= 10) {
      setOtpSent(true);
    }
  };

  const handleVerify = async () => {
    await loginWithPhone(phone, otp);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Brand Header */}
          <View style={styles.brandContainer}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoIcon}>🏔️</Text>
            </View>
            <Text style={styles.brandTitle}>NER-RouteAI</Text>
            <Text style={styles.brandSubtitle}>Driver Mobile Operational Portal</Text>
            <Text style={styles.regionTag}>North Eastern Region • Mission Critical</Text>
          </View>

          {/* Auth Card */}
          <MobileCard style={styles.card}>
            <Text style={styles.cardTitle}>
              {otpSent ? 'Enter Verification Code' : 'Driver Mobile Sign-In'}
            </Text>
            <Text style={styles.cardSubtitle}>
              {otpSent
                ? `Enter the 6-digit OTP transmitted to +91 ${phone}`
                : 'Enter your registered mobile phone number to begin operational shift.'}
            </Text>

            {error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {!otpSent ? (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Mobile Phone Number</Text>
                <View style={styles.phoneInputRow}>
                  <View style={styles.countryCodeBox}>
                    <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
                  </View>
                  <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    maxLength={10}
                    placeholder="9862012345"
                    placeholderTextColor={COLORS.mistMuted}
                    style={styles.phoneInput}
                  />
                </View>

                <MobileButton
                  title="Request OTP Code"
                  onPress={handleSendOtp}
                  variant="primary"
                  size="driving"
                  style={styles.actionBtn}
                />
              </View>
            ) : (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>6-Digit SMS Code</Text>
                <TextInput
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholder="763486"
                  placeholderTextColor={COLORS.mistMuted}
                  style={styles.otpInput}
                />

                <MobileButton
                  title="Verify & Start Shift"
                  onPress={handleVerify}
                  variant="primary"
                  size="driving"
                  isLoading={isLoading}
                  style={styles.actionBtn}
                />

                <MobileButton
                  title="Change Mobile Number"
                  onPress={() => setOtpSent(false)}
                  variant="ghost"
                  style={styles.backBtn}
                />
              </View>
            )}

            {/* Quick Unlock Trigger */}
            <View style={styles.biometricDivider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR QUICK AUTHENTICATION</Text>
              <View style={styles.dividerLine} />
            </View>

            <MobileButton
              title="Touch ID / Quick Shift Access"
              onPress={quickUnlockBiometrics}
              variant="secondary"
              isLoading={isLoading}
              style={styles.biometricBtn}
            />
          </MobileCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.forest400,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    justifyContent: 'center',
    minHeight: '100%',
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.forest200,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoIcon: {
    fontSize: 28,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 14,
    color: COLORS.mistDim,
    marginTop: 2,
  },
  regionTag: {
    fontSize: 11,
    color: COLORS.safeLight,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 6,
  },
  card: {
    padding: SPACING.xl,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: COLORS.mistDim,
    marginBottom: 16,
    lineHeight: 18,
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.dangerLight,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.mist,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  phoneInputRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  countryCodeBox: {
    backgroundColor: COLORS.forest100,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    justifyContent: 'center',
    marginRight: 8,
  },
  countryCodeText: {
    color: COLORS.mist,
    fontSize: 14,
    fontWeight: '700',
  },
  phoneInput: {
    flex: 1,
    backgroundColor: COLORS.forest300,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  otpInput: {
    backgroundColor: COLORS.forest300,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 6,
    textAlign: 'center',
    marginBottom: 16,
  },
  actionBtn: {
    marginBottom: 8,
  },
  backBtn: {
    marginTop: 4,
  },
  biometricDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  dividerText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.mistMuted,
    marginHorizontal: 10,
    letterSpacing: 0.5,
  },
  biometricBtn: {
    width: '100%',
  },
});
