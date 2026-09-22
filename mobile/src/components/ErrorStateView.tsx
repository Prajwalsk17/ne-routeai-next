import React, { useState } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { COLORS } from '../theme/tokens';
import MobileButton from './MobileButton';

export interface ErrorStateViewProps {
  title?: string;
  message?: string;
  correlationId?: string;
  onRetry?: () => Promise<void> | void;
  style?: ViewStyle;
}

export default function ErrorStateView({
  title = 'Operational Link Offline',
  message = 'Unable to establish secure telemetry connection with dispatch servers.',
  correlationId,
  onRetry,
  style,
}: ErrorStateViewProps) {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    if (!onRetry || retrying) return;
    try {
      setRetrying(true);
      await onRetry();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <View style={[styles.container, style]} testID="error-state-view">
      <View style={styles.iconCircle}>
        <Text style={styles.iconSymbol}>⚠️</Text>
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>

      {correlationId && (
        <View style={styles.correlationBadge}>
          <Text style={styles.correlationText}>ref: {correlationId}</Text>
        </View>
      )}

      {onRetry && (
        <MobileButton
          title={retrying ? 'Retrying...' : 'Retry Connection'}
          onPress={handleRetry}
          variant="secondary"
          isLoading={retrying}
          style={styles.retryBtn}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconSymbol: {
    fontSize: 22,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 6,
  },
  message: {
    fontSize: 13,
    color: COLORS.mistDim,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
  },
  correlationBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 16,
  },
  correlationText: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: COLORS.mistMuted,
  },
  retryBtn: {
    width: '100%',
  },
});
