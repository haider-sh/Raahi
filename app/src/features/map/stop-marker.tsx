import { Marker } from '@maplibre/maplibre-react-native';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import type { LatLng } from '@/services/api/types';

import { toLngLat } from './map-utils';

type Props = {
  location: LatLng;
  /** Read by screen readers. MapLibre markers have no built-in callout. */
  title?: string;
  color: string;
  /** `dot` for ordinary stops; the others mark the board, get-off and transfer stops. */
  variant?: 'dot' | 'board' | 'alight' | 'transfer';
  onPress?: () => void;
};

const ICONS: Record<Exclude<Props['variant'], 'dot' | undefined>, IconName> = {
  board: 'directions-bus',
  alight: 'flag',
  transfer: 'swap-horiz',
};

/** A React view pinned to the map. Memoised: markers never change after mount; give them a new `key` to redraw. */
export const StopMarker = memo(function StopMarker({ location, title, color, variant = 'dot', onPress }: Props) {
  return (
    <Marker lngLat={toLngLat(location)} anchor="center" onPress={onPress}>
      {variant === 'dot' ? (
        <View accessible accessibilityLabel={title} style={[styles.dot, { borderColor: color }]} />
      ) : (
        <View accessible accessibilityLabel={title} style={[styles.badge, { backgroundColor: color }]}>
          <Icon name={ICONS[variant]} size={16} rawColor="#FFFFFF" />
        </View>
      )}
    </Marker>
  );
});

const styles = StyleSheet.create({
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 3, backgroundColor: '#FFFFFF' },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
