import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Spacing, TOUCH, useColors } from '@/constants/theme';

import { Icon, type IconName } from './icon';
import { Text } from './text';

type Props = {
  title: string;
  subtitle?: string;
  icon?: IconName;
  onPress?: () => void;
  onLongPress?: () => void;
  trailing?: ReactNode;
  chevron?: boolean;
  accessibilityHint?: string;
};

export function ListRow({ title, subtitle, icon, onPress, onLongPress, trailing, chevron, accessibilityHint }: Props) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityHint={accessibilityHint}
      disabled={!onPress && !onLongPress}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: colors.border },
        pressed && { backgroundColor: colors.surface },
      ]}>
      {icon && <Icon name={icon} color="textSecondary" />}
      <View style={styles.body}>
        <Text>{title}</Text>
        {subtitle ? (
          <Text variant="caption" color="textSecondary">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
      {chevron && <Icon name="chevron-right" color="textSecondary" />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: TOUCH + 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  body: { flex: 1 },
});
