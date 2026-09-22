import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { COLORS } from '../theme/tokens';
import MobileButton from './MobileButton';

export interface EmptyStateViewProps {
  title: string;
  description: string;
  primaryAction?: {
    label: string;
    onPress: () => void;
  };
  secondaryAction?: {
    label: string;
    onPress: () => void;
  };
  style?: ViewStyle;
}

export default function EmptyStateView({
  title,
  description,
  primaryAction,
  secondaryAction,
  style,
}: EmptyStateViewProps) {
  return (
    <View style={[styles.container, style]} testID="empty-state-view">
      <View style={styles.iconCircle}>
        <Text style={styles.iconSymbol}>📦</Text>
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>

      {primaryAction && (
        <MobileButton
          title={primaryAction.label}
          onPress={primaryAction.onPress}
          variant="primary"
          style={styles.primaryBtn}
        />
      )}

      {secondaryAction && (
        <MobileButton
          title={secondaryAction.label}
          onPress={secondaryAction.onPress}
          variant="secondary"
          style={styles.secondaryBtn}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.forest200,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.08)',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.forest100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  iconSymbol: {
    fontSize: 24,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.mist,
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 13,
    color: COLORS.mistDim,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
    maxWidth: 280,
  },
  primaryBtn: {
    width: '100%',
    marginBottom: 8,
  },
  secondaryBtn: {
    width: '100%',
  },
});
