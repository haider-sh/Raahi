import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps } from 'react';
import { I18nManager } from 'react-native';

import { useColors, type Palette } from '@/constants/theme';

export type IconName = ComponentProps<typeof MaterialIcons>['name'];

/** Icons that point somewhere, and must mirror in right-to-left layouts. */
const DIRECTIONAL = new Set<IconName>([
  'arrow-forward',
  'arrow-back',
  'chevron-right',
  'chevron-left',
  'directions-walk',
]);

type Props = { name: IconName; size?: number; color?: keyof Palette; rawColor?: string };

export function Icon({ name, size = 24, color = 'text', rawColor }: Props) {
  const colors = useColors();
  return (
    <MaterialIcons
      name={name}
      size={size}
      color={rawColor ?? colors[color]}
      style={I18nManager.isRTL && DIRECTIONAL.has(name) ? { transform: [{ scaleX: -1 }] } : undefined}
    />
  );
}
