import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

import { legColor, useColors } from '@/constants/theme';
import { useFormat } from '@/i18n/use-format';
import { decodePolyline } from '@/lib/geo';
import type { LatLng, TripOption } from '@/services/api/types';

import { EDGE_PADDING, regionFor, toCoord } from './map-utils';
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
  const map = useRef<MapView>(null);

  const legs = useMemo(() => {
    let rideIndex = 0;
    return trip.legs.map((leg) =>
      leg.type === 'walk'
        ? { leg, points: [leg.from, leg.to], color: colors.walk, rideIndex: -1 }
        : { leg, points: decodePolyline(leg.polyline), color: legColor(rideIndex), rideIndex: rideIndex++ },
    );
  }, [trip, colors.walk]);

  const allPoints = useMemo(() => legs.flatMap((l) => l.points), [legs]);

  const fit = (points: LatLng[]) =>
    map.current?.fitToCoordinates(points.map(toCoord), { edgePadding: EDGE_PADDING, animated: true });

  useEffect(() => {
    if (focusLegIndex == null) return;
    const leg = legs[focusLegIndex];
    if (leg) fit(leg.points);
  }, [focusLegIndex, legs]);

  const rides = legs.filter((l) => l.leg.type === 'ride');

  return (
    <MapView
      ref={map}
      style={StyleSheet.absoluteFill}
      provider={PROVIDER_GOOGLE}
      initialRegion={regionFor(allPoints)}
      onMapReady={() => fit(allPoints)}
      showsUserLocation
      showsMyLocationButton={false}
      toolbarEnabled={false}>
      {legs.map(({ leg, points, color }, i) => (
        <Polyline
          key={i}
          coordinates={points.map(toCoord)}
          strokeColor={color}
          strokeWidth={leg.type === 'walk' ? 4 : 6}
          lineDashPattern={leg.type === 'walk' ? [8, 8] : undefined}
        />
      ))}
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
    </MapView>
  );
}
