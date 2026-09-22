import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { COLORS } from '../theme/tokens';

export interface MobileCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'danger' | 'safe';
}

export default function MobileCard({
  children,
  style,
  variant = 'default',
}: MobileCardProps) {
  return (
    <View style={[styles.card, styles[variant], style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.forest200,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.08)',
    padding: 16,
    marginBottom: 12,
  },
  default: {
    backgroundColor: COLORS.forest200,
  },
  elevated: {
    backgroundColor: COLORS.forest100,
    borderColor: 'rgba(226, 232, 240, 0.12)',
  },
  danger: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  safe: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.25)',
  },
});
