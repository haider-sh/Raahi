import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';

import { Icon, type IconName } from '@/components/icon';
import type { LatLng } from '@/services/api/types';

import { toCoord } from './map-utils';

type Props = {
  location: LatLng;
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

/**
 * `tracksViewChanges={false}`: re-rendering custom markers is the most common cause of map jank
 * on Android. Markers never change after mount; give them a new `key` to redraw.
 */
export const StopMarker = memo(function StopMarker({ location, title, color, variant = 'dot', onPress }: Props) {
  return (
    <Marker
      coordinate={toCoord(location)}
      title={title}
      onPress={onPress}
      onCalloutPress={onPress}
      tracksViewChanges={false}
      anchor={{ x: 0.5, y: 0.5 }}>
      {variant === 'dot' ? (
        <View style={[styles.dot, { borderColor: color }]} />
      ) : (
        <View style={[styles.badge, { backgroundColor: color }]}>
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
