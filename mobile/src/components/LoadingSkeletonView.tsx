import React from 'react';
import { View, StyleSheet, ViewStyle, DimensionValue } from 'react-native';
import { COLORS } from '../theme/tokens';

export interface SkeletonBoxProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function SkeletonBox({
  width = '100%',
  height = 20,
  borderRadius = 6,
  style,
}: SkeletonBoxProps) {
  return (
    <View
      style={[
        styles.box,
        { width, height, borderRadius },
        style,
      ]}
      testID="skeleton-box"
    />
  );
}

export function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <View style={styles.card} testID="skeleton-card">
      <View style={styles.cardHeader}>
        <SkeletonBox width="45%" height={18} />
        <SkeletonBox width="20%" height={16} borderRadius={10} />
      </View>
      <View style={styles.cardBody}>
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonBox
            key={i}
            width={`${85 - i * 15}%`}
            height={14}
            style={styles.rowSpacing}
          />
        ))}
      </View>
    </View>
  );
}

export function SkeletonList({ items = 3 }: { items?: number }) {
  return (
    <View style={styles.list} testID="skeleton-list">
      {Array.from({ length: items }).map((_, i) => (
        <View key={i} style={styles.listItem}>
          <SkeletonBox width={40} height={40} borderRadius={8} />
          <View style={styles.listContent}>
            <SkeletonBox width="60%" height={14} style={styles.subRowSpacing} />
            <SkeletonBox width="40%" height={12} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: COLORS.forest100,
    opacity: 0.7,
  },
  card: {
    backgroundColor: COLORS.forest200,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.06)',
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardBody: {
    gap: 8,
  },
  rowSpacing: {
    marginBottom: 6,
  },
  subRowSpacing: {
    marginBottom: 6,
  },
  list: {
    gap: 10,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.forest200,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.05)',
  },
  listContent: {
    flex: 1,
    marginLeft: 12,
  },
});
