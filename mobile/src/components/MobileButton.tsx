import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { COLORS, TOUCH_TARGETS } from '../theme/tokens';

export type MobileButtonVariant = 'primary' | 'secondary' | 'danger' | 'sos' | 'ghost';
export type MobileButtonSize = 'standard' | 'driving';

export interface MobileButtonProps {
  title: string;
  onPress: () => void;
  variant?: MobileButtonVariant;
  size?: MobileButtonSize;
  isLoading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function MobileButton({
  title,
  onPress,
  variant = 'primary',
  size = 'standard',
  isLoading = false,
  disabled = false,
  style,
  textStyle,
}: MobileButtonProps) {
  const isDisabled = disabled || isLoading;
  const minHeight = size === 'driving' ? TOUCH_TARGETS.driving : TOUCH_TARGETS.standard;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.base,
        { minHeight },
        styles[variant],
        size === 'driving' && styles.driving,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'secondary' || variant === 'ghost' ? COLORS.mist : '#FFFFFF'}
        />
      ) : (
        <Text
          style={[
            styles.text,
            styles[`${variant}Text` as keyof typeof styles],
            size === 'driving' && styles.drivingText,
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  driving: {
    borderRadius: 14,
    paddingVertical: 16,
  },
  primary: {
    backgroundColor: COLORS.orchid,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  secondary: {
    backgroundColor: COLORS.forest100,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  danger: {
    backgroundColor: COLORS.danger,
  },
  sos: {
    backgroundColor: COLORS.danger,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.4,
  },
  text: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  drivingText: {
    fontSize: 18,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  primaryText: {
    color: '#FFFFFF',
  },
  secondaryText: {
    color: COLORS.mist,
  },
  dangerText: {
    color: '#FFFFFF',
  },
  sosText: {
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  ghostText: {
    color: COLORS.mistDim,
  },
});
