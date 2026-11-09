import { GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';
import { useMemo } from 'react';

import type { LatLng } from '@/services/api/types';

import { toLngLat } from './map-utils';

type Props = {
  /**
   * Unique on this map. MapLibre freezes source and layer ids at mount, so render this with
   * `key={id}`: a new id then means a new line instead of a silently ignored change.
   */
  id: string;
  points: LatLng[];
  color: string;
  /** Width in dp. */
  width: number;
  dashed?: boolean;
};

/** A polyline: one GeoJSON line source plus one line layer. */
export function MapLine({ id, points, color, width, dashed = false }: Props) {
  const data = useMemo<GeoJSON.Feature<GeoJSON.LineString>>(
    () => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: points.map(toLngLat) } }),
    [points],
  );
  return (
    <GeoJSONSource id={`${id}-source`} data={data}>
      <Layer
        type="line"
        id={`${id}-line`}
        layout={{ 'line-cap': dashed ? 'butt' : 'round', 'line-join': 'round' }}
        paint={{ 'line-color': color, 'line-width': width, ...(dashed ? { 'line-dasharray': [2, 2] } : {}) }}
      />
    </GeoJSONSource>
  );
}
