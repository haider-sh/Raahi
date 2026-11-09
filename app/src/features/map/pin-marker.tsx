import { ViewAnnotation } from '@maplibre/maplibre-react-native';
import { View } from 'react-native';

import { Icon } from '@/components/icon';
import type { LatLng } from '@/services/api/types';

import { fromLngLat, toLngLat } from './map-utils';

type Props = {
  location: LatLng;
  color: string;
  accessibilityLabel?: string;
  /** Makes the pin draggable; called with the point it was dropped on. */
  onDragEnd?: (p: LatLng) => void;
};

/** A map pin whose tip sits on `location`: the start or destination of a trip. */
export function PinMarker({ location, color, accessibilityLabel, onDragEnd }: Props) {
  return (
    <ViewAnnotation
      lngLat={toLngLat(location)}
      anchor="bottom"
      draggable={!!onDragEnd}
      onDragEnd={onDragEnd ? (e) => onDragEnd(fromLngLat(e.nativeEvent.lngLat)) : undefined}>
      <View accessible accessibilityLabel={accessibilityLabel}>
        <Icon name="place" size={40} rawColor={color} />
      </View>
    </ViewAnnotation>
  );
}
