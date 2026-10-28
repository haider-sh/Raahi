import { View, type DimensionValue } from 'react-native';

import { Radius, useColors } from '@/constants/theme';

/** A static placeholder block. No shimmer animation: it costs frames on low-end phones. */
export function Skeleton({ height = 16, width = '100%' }: { height?: number; width?: DimensionValue }) {
  const colors = useColors();
  return <View style={{ height, width, borderRadius: Radius.sm, backgroundColor: colors.surfaceStrong }} />;
}
