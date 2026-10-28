import { Pressable, StyleSheet, View } from 'react-native';

import { Text, type TextVariant } from '@/components/text';
import { Radius, Spacing } from '@/constants/theme';
import type { RouteSummary } from '@/services/api/types';

type Props = {
  route: RouteSummary;
  /** The app-assigned leg colour, to match the line on the map. */
  color: string;
  size?: 'sm' | 'lg';
  onPress?: () => void;
};

/** The route name, big: it's the only way people identify a bus (D16). */
export function RouteChip({ route, color, size = 'sm', onPress }: Props) {
  const variant: TextVariant = size === 'lg' ? 'title' : 'heading';
  const chip = (
    <View style={[styles.chip, size === 'lg' && styles.lg, { backgroundColor: color }]}>
      <Text latin bold variant={variant} style={styles.code}>
        {route.code}
      </Text>
    </View>
  );
  if (!onPress) return chip;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={route.code} onPress={onPress} hitSlop={6}>
      {chip}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    alignSelf: 'flex-start',
    minWidth: 44,
    alignItems: 'center',
  },
  lg: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs },
  code: { color: '#FFFFFF' },
});
