import { Camera, type CameraRef } from '@maplibre/maplibre-react-native';
import { useEffect, useMemo, useRef } from 'react';

import { useFormat } from '@/i18n/use-format';
import { decodePolyline } from '@/lib/geo';
import type { Stop } from '@/services/api/types';

import { BaseMap } from './base-map';
import { MapLine } from './map-line';
import { boundsFor, EDGE_PADDING } from './map-utils';
import { StopMarker } from './stop-marker';

type Props = {
  /** Variant id: the line and markers redraw when it changes. */
  id: string;
  polyline: string;
  stops: Stop[];
  color: string;
  onStopPress?: (stop: Stop) => void;
};

export function RouteMap({ id, polyline, stops, color, onStopPress }: Props) {
  const { name } = useFormat();
  const camera = useRef<CameraRef>(null);
  const points = useMemo(() => decodePolyline(polyline), [polyline]);

  // Re-fit when the direction changes. The first fit comes from `initialViewState`.
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    camera.current?.fitBounds(boundsFor(points), { padding: EDGE_PADDING, duration: 500 });
  }, [points]);

  return (
    <BaseMap>
      <Camera ref={camera} initialViewState={{ bounds: boundsFor(points), padding: EDGE_PADDING }} />
      <MapLine key={id} id={`route-${id}`} points={points} color={color} width={5} />
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
    </BaseMap>
  );
}
