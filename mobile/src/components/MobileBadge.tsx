import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { COLORS } from '../theme/tokens';

export type BadgeVariant =
  | 'safe'
  | 'amber'
  | 'danger'
  | 'teal'
  | 'orchid'
  | 'info'
  | 'default';

export interface MobileBadgeProps {
  label: string;
  variant?: BadgeVariant;
  dot?: boolean;
  style?: ViewStyle;
}

const BADGE_STYLES: Record<BadgeVariant, ViewStyle> = {
  default: {
    backgroundColor: 'rgba(226, 232, 240, 0.08)',
    borderColor: 'rgba(226, 232, 240, 0.15)',
  },
  safe: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderColor: 'rgba(34, 197, 94, 0.35)',
  },
  amber: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  danger: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  teal: {
    backgroundColor: 'rgba(13, 148, 136, 0.15)',
    borderColor: 'rgba(13, 148, 136, 0.35)',
  },
  orchid: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderColor: 'rgba(168, 85, 247, 0.35)',
  },
  info: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: 'rgba(59, 130, 246, 0.35)',
  },
};

const DOT_STYLES: Record<BadgeVariant, ViewStyle> = {
  default: { backgroundColor: COLORS.mist },
  safe: { backgroundColor: COLORS.safe },
  amber: { backgroundColor: COLORS.amber },
  danger: { backgroundColor: COLORS.danger },
  teal: { backgroundColor: COLORS.teal },
  orchid: { backgroundColor: COLORS.orchid },
  info: { backgroundColor: COLORS.info },
};

const TEXT_STYLES: Record<BadgeVariant, TextStyle> = {
  default: { color: COLORS.mist },
  safe: { color: COLORS.safeLight },
  amber: { color: COLORS.amberLight },
  danger: { color: COLORS.dangerLight },
  teal: { color: COLORS.tealLight },
  orchid: { color: COLORS.orchidLight },
  info: { color: COLORS.infoLight },
};

export default function MobileBadge({
  label,
  variant = 'default',
  dot = false,
  style,
}: MobileBadgeProps) {
  return (
    <View style={[styles.badge, BADGE_STYLES[variant], style]}>
      {dot && <View style={[styles.dot, DOT_STYLES[variant]]} />}
      <Text style={[styles.text, TEXT_STYLES[variant]]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
