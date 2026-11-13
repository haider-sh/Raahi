import { Camera, type CameraRef, UserLocation } from '@maplibre/maplibre-react-native';
import { useEffect, useMemo, useRef } from 'react';

import { legColor, useColors } from '@/constants/theme';
import { usePlanner } from '@/features/planner/store';
import { useFormat } from '@/i18n/use-format';
import { decodePolyline } from '@/lib/geo';
import type { TripOption } from '@/services/api/types';

import { BaseMap } from './base-map';
import { MapLine } from './map-line';
import { boundsFor, EDGE_PADDING } from './map-utils';
import { StopMarker } from './stop-marker';

type Props = {
  trip: TripOption;
  /** Fit the camera to this leg; null fits the whole trip. */
  focusLegIndex: number | null;
};

/** Walk legs: dashed grey straight lines. Ride legs: solid, in the leg colour from the step list. */
export function TripMap({ trip, focusLegIndex }: Props) {
  const colors = useColors();
  const { name } = useFormat();
  const camera = useRef<CameraRef>(null);
  // Only once we have a fix, i.e. location permission was granted.
  const hasGps = usePlanner((s) => s.gps != null);

  const legs = useMemo(() => {
    let rideIndex = 0;
    return trip.legs.map((leg) =>
      leg.type === 'walk'
        ? { leg, points: [leg.from, leg.to], color: colors.walk, rideIndex: -1 }
        : { leg, points: decodePolyline(leg.polyline), color: legColor(rideIndex), rideIndex: rideIndex++ },
    );
  }, [trip, colors.walk]);

  const allPoints = useMemo(() => legs.flatMap((l) => l.points), [legs]);

  useEffect(() => {
    if (focusLegIndex == null) return;
    const leg = legs[focusLegIndex];
    if (leg) camera.current?.fitBounds(boundsFor(leg.points), { padding: EDGE_PADDING, duration: 500 });
  }, [focusLegIndex, legs]);

  const rides = legs.filter((l) => l.leg.type === 'ride');
  // Line ids must be unique per map and change with the trip (see MapLine).
  const tripKey = trip.legs.map((l) => (l.type === 'ride' ? l.variantId : 'walk')).join('-');

  return (
    <BaseMap>
      <Camera ref={camera} initialViewState={{ bounds: boundsFor(allPoints), padding: EDGE_PADDING }} />
      {hasGps && <UserLocation />}
      {legs.map(({ leg, points, color }, i) => {
        const id = `trip-${tripKey}-${i}`;
        return leg.type === 'walk' ? (
          <MapLine key={id} id={id} points={points} color={color} width={3} dashed />
        ) : (
          <MapLine key={id} id={id} points={points} color={color} width={5} />
        );
      })}
      {rides.map(({ leg, color, rideIndex }) =>
        leg.type === 'ride' ? (
          <StopMarker
            key={`board-${leg.variantId}`}
            location={leg.boardStop.location}
            title={name(leg.boardStop.name)}
            color={color}
            variant={rideIndex === 0 ? 'board' : 'transfer'}
          />
        ) : null,
      )}
      {rides.map(({ leg, color, rideIndex }) =>
        leg.type === 'ride' && rideIndex === rides.length - 1 ? (
          <StopMarker
            key={`alight-${leg.variantId}`}
            location={leg.alightStop.location}
            title={name(leg.alightStop.name)}
            color={color}
            variant="alight"
          />
        ) : null,
      )}
    </BaseMap>
  );
}
