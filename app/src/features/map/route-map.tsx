import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

import { useFormat } from '@/i18n/use-format';
import { decodePolyline } from '@/lib/geo';
import type { Stop } from '@/services/api/types';

import { EDGE_PADDING, regionFor, toCoord } from './map-utils';
import { StopMarker } from './stop-marker';

type Props = {
  /** Variant id: markers redraw when it changes. */
  id: string;
  polyline: string;
  stops: Stop[];
  color: string;
  onStopPress?: (stop: Stop) => void;
};

export function RouteMap({ id, polyline, stops, color, onStopPress }: Props) {
  const { name } = useFormat();
  const map = useRef<MapView>(null);
  const points = useMemo(() => decodePolyline(polyline), [polyline]);

  // Re-fit when the direction changes.
  useEffect(() => {
    map.current?.fitToCoordinates(points.map(toCoord), { edgePadding: EDGE_PADDING, animated: true });
  }, [points]);

  return (
    <MapView
      ref={map}
      style={StyleSheet.absoluteFill}
      provider={PROVIDER_GOOGLE}
      initialRegion={regionFor(points)}
      onMapReady={() =>
        map.current?.fitToCoordinates(points.map(toCoord), { edgePadding: EDGE_PADDING, animated: false })
      }
      toolbarEnabled={false}>
      <Polyline coordinates={points.map(toCoord)} strokeColor={color} strokeWidth={6} />
      {stops.map((s, i) => (
        <StopMarker
          key={`${id}-${s.id}`}
          location={s.location}
          title={name(s.name)}
          color={color}
          variant={i === stops.length - 1 ? 'alight' : 'dot'}
          onPress={onStopPress ? () => onStopPress(s) : undefined}
        />
      ))}
    </MapView>
  );
}
