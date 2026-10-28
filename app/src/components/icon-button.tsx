import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { Radius, TOUCH, useColors, type Palette } from '@/constants/theme';

import { Icon, type IconName } from './icon';

type Props = {
  icon: IconName;
  label: string;
  onPress: () => void;
  color?: keyof Palette;
  filled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** A 48 dp icon-only button. `label` is read by screen readers. */
export function IconButton({ icon, label, onPress, color = 'text', filled, style }: Props) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        filled && { backgroundColor: colors.background, elevation: 3 },
        pressed && { opacity: 0.6 },
        style,
      ]}>
      <Icon name={icon} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { width: TOUCH, height: TOUCH, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
});
