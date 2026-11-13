import { Camera, type CameraRef, type MapRef, UserLocation } from '@maplibre/maplibre-react-native';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import { Text } from '@/components/text';
import { Radius, Spacing, useColors } from '@/constants/theme';
import { BaseMap } from '@/features/map/base-map';
import {
  fromLngLat,
  inBounds,
  KARACHI_CAMERA,
  type MapCamera,
  toLngLat,
  toViewport,
  viewRadiusM,
  type Viewport,
  Zoom,
} from '@/features/map/map-utils';
import { PinMarker } from '@/features/map/pin-marker';
import { StopMarker } from '@/features/map/stop-marker';
import { droppedPinName, nameForPoint } from '@/features/planner/actions';
import { LocationNotice } from '@/features/planner/location-notice';
import { NearestStopCard } from '@/features/planner/nearest-stop-card';
import { PlanHeader } from '@/features/planner/plan-header';
import { useNearestStops } from '@/features/planner/queries';
import { setFrom, setPickMode, setTo, usePlanner, useStart, type PlanPoint } from '@/features/planner/store';
import { useUserLocation } from '@/features/planner/use-user-location';
import { setSavedPlace } from '@/features/saved/store';
import { useFormat } from '@/i18n/use-format';
import { storage } from '@/lib/storage';
import type { LatLng, Stop } from '@/services/api/types';

export default function PlanScreen() {
  const colors = useColors();
  const { t, name } = useFormat();
  const map = useRef<MapRef>(null);
  const camera = useRef<CameraRef>(null);
  const location = useUserLocation();
  const start = useStart();
  const from = usePlanner((s) => s.from);
  const to = usePlanner((s) => s.to);
  const gps = usePlanner((s) => s.gps);
  const pickMode = usePlanner((s) => s.pickMode);

  const [initialCamera, setInitialCamera] = useState<MapCamera | null>(null);
  /** The live view; null until the map has loaded. */
  const [view, setView] = useState<Viewport | null>(null);
  /** Keeps the attribution button above the bottom sheet. */
  const [sheetHeight, setSheetHeight] = useState(0);

  useEffect(() => {
    storage.get('map.lastCamera').then((saved) => setInitialCamera(saved ?? KARACHI_CAMERA));
  }, []);

  // Centre on the user the first time we get a fix, unless they've picked a start point.
  const centredOnGps = useRef(false);
  useEffect(() => {
    if (!gps || centredOnGps.current || from) return;
    centredOnGps.current = true;
    camera.current?.easeTo({ center: toLngLat(gps), zoom: Zoom.neighbourhood, duration: 500 });
  }, [gps, from]);

  // Stop markers: only when zoomed in, and only those in view.
  const zoomedIn = view != null && view.zoom >= Zoom.stopMarkers;
  const center = view?.center ?? KARACHI_CAMERA.center;
  const radiusM = view ? viewRadiusM(view) : 0;
  const { data: visible } = useNearestStops(center, 60, radiusM, zoomedIn);
  const markers = useMemo(
    () => (zoomedIn ? (visible?.stops ?? []).filter((s) => inBounds(s.stop.location, view.bounds)) : []),
    [visible, zoomedIn, view],
  );

  const saveCameraTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onViewChange = (v: Viewport) => {
    setView(v);
    if (saveCameraTimer.current) clearTimeout(saveCameraTimer.current);
    saveCameraTimer.current = setTimeout(() => storage.set('map.lastCamera', { center: v.center, zoom: v.zoom }), 1000);
  };

  const dropPin = async (p: LatLng) => {
    const pin: PlanPoint = { kind: 'pin', location: p, name: null };
    setFrom(pin);
    const label = await nameForPoint(p);
    // Only name it if the user hasn't moved the pin again meanwhile.
    if (label && usePlanner.getState().from === pin) setFrom({ ...pin, name: label });
  };

  const focusStop = (stop: Stop) =>
    camera.current?.easeTo({ center: toLngLat(stop.location), zoom: Zoom.stop, duration: 400 });

  const recenter = () => {
    if (gps) camera.current?.easeTo({ center: toLngLat(gps), zoom: Zoom.neighbourhood, duration: 400 });
    else location.retry();
  };

  const confirmPick = async () => {
    const field = pickMode;
    if (!field || !view) return;
    const p = view.center;
    setPickMode(null);
    const label = await nameForPoint(p);
    if (field === 'home' || field === 'work') {
      await setSavedPlace(field, { name: label ?? droppedPinName(), location: p });
      router.navigate('/saved');
      return;
    }
    const point: PlanPoint = { kind: 'pin', location: p, name: label };
    if (field === 'from') setFrom(point);
    else {
      setTo(point);
      router.push('/options');
    }
  };

  if (!initialCamera) return null;

  return (
    <View style={styles.flex}>
      <BaseMap
        ref={map}
        attributionPosition={{ bottom: sheetHeight + Spacing.sm, left: Spacing.sm }}
        onDidFinishLoadingMap={() => map.current?.getViewState().then((v) => setView(toViewport(v)))}
        onRegionDidChange={(e) => onViewChange(toViewport(e.nativeEvent))}
        onLongPress={(e) => !pickMode && dropPin(fromLngLat(e.nativeEvent.lngLat))}>
        <Camera ref={camera} initialViewState={{ center: toLngLat(initialCamera.center), zoom: initialCamera.zoom }} />
        {(location.status === 'ready' || location.status === 'locating') && <UserLocation />}
        {markers.map(({ stop }) => (
          <StopMarker
            key={stop.id}
            location={stop.location}
            title={name(stop.name)}
            color={colors.primary}
            onPress={() => router.push({ pathname: '/stop/[id]', params: { id: stop.id } })}
          />
        ))}
        {from && from.kind === 'pin' && (
          <PinMarker location={from.location} color={colors.primary} onDragEnd={dropPin} />
        )}
        {to && <PinMarker location={to.location} color={colors.danger} />}
      </BaseMap>

      <SafeAreaView edges={['top']} pointerEvents="box-none" style={styles.top}>
        {pickMode ? (
          <View style={[styles.pickHint, { backgroundColor: colors.background }]}>
            <Text>{t('plan.pick.hint')}</Text>
          </View>
        ) : (
          <PlanHeader />
        )}
      </SafeAreaView>

      {pickMode && (
        <View pointerEvents="none" style={styles.crosshair}>
          <Icon name="place" size={44} color="danger" />
        </View>
      )}

      <View pointerEvents="box-none" style={styles.bottom}>
        <IconButton icon="my-location" label={t('plan.recenter')} onPress={recenter} filled style={styles.fab} />
        <View
          onLayout={(e) => setSheetHeight(e.nativeEvent.layout.height)}
          style={[styles.sheet, { backgroundColor: colors.background }]}>
          {pickMode ? (
            <View style={styles.pickRow}>
              <Button label={t(`plan.pick.${pickMode}`)} icon="check" onPress={confirmPick} style={styles.flex} />
              <Button variant="ghost" label={t('common.cancel')} onPress={() => setPickMode(null)} />
            </View>
          ) : (
            <>
              {location.status !== 'ready' && !from && <LocationNotice location={location} />}
              {start && <NearestStopCard start={start.location} onStopPress={focusStop} />}
              {start && start.kind === 'gps' && (
                <Text variant="caption" color="textSecondary">
                  {t('plan.longPressHint')}
                </Text>
              )}
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: { position: 'absolute', top: 0, start: 0, end: 0 },
  bottom: { position: 'absolute', bottom: 0, start: 0, end: 0 },
  fab: { alignSelf: 'flex-end', margin: Spacing.md },
  sheet: {
    borderTopStartRadius: Radius.lg,
    borderTopEndRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  pickHint: { margin: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md, elevation: 4 },
  pickRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  crosshair: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 44, // the pin's point sits on the map centre
  },
});
