import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import { Text } from '@/components/text';
import { Radius, Spacing, useColors } from '@/constants/theme';
import { fromCoord, inRegion, KARACHI_REGION, STOP_MARKER_MAX_DELTA, toCoord } from '@/features/map/map-utils';
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
import { haversineM } from '@/lib/geo';
import { storage } from '@/lib/storage';
import type { LatLng, Stop } from '@/services/api/types';

export default function PlanScreen() {
  const colors = useColors();
  const { t, name } = useFormat();
  const map = useRef<MapView>(null);
  const location = useUserLocation();
  const start = useStart();
  const from = usePlanner((s) => s.from);
  const to = usePlanner((s) => s.to);
  const gps = usePlanner((s) => s.gps);
  const pickMode = usePlanner((s) => s.pickMode);

  const [initialRegion, setInitialRegion] = useState<Region | null>(null);
  const [region, setRegion] = useState<Region>(KARACHI_REGION);

  useEffect(() => {
    storage.get('map.lastRegion').then((saved) => {
      const r = saved ?? KARACHI_REGION;
      setInitialRegion(r);
      setRegion(r);
    });
  }, []);

  // Centre on the user the first time we get a fix, unless they've picked a start point.
  const centredOnGps = useRef(false);
  useEffect(() => {
    if (!gps || centredOnGps.current || from) return;
    centredOnGps.current = true;
    map.current?.animateToRegion({ ...toCoord(gps), latitudeDelta: 0.02, longitudeDelta: 0.02 }, 500);
  }, [gps, from]);

  // Stop markers: only when zoomed in, and only those in view.
  const zoomedIn = region.latitudeDelta <= STOP_MARKER_MAX_DELTA;
  const center = useMemo(() => fromCoord(region), [region]);
  const radiusM = Math.round(
    haversineM(center, { lat: region.latitude + region.latitudeDelta / 2, lng: region.longitude + region.longitudeDelta / 2 }),
  );
  const { data: visible } = useNearestStops(center, 60, radiusM, zoomedIn);
  const markers = useMemo(
    () => (zoomedIn ? (visible?.stops ?? []).filter((s) => inRegion(s.stop.location, region)) : []),
    [visible, zoomedIn, region],
  );

  const saveRegionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onRegionChangeComplete = (r: Region) => {
    setRegion(r);
    if (saveRegionTimer.current) clearTimeout(saveRegionTimer.current);
    saveRegionTimer.current = setTimeout(() => storage.set('map.lastRegion', r), 1000);
  };

  const dropPin = async (p: LatLng) => {
    const pin: PlanPoint = { kind: 'pin', location: p, name: null };
    setFrom(pin);
    const label = await nameForPoint(p);
    // Only name it if the user hasn't moved the pin again meanwhile.
    if (label && usePlanner.getState().from === pin) setFrom({ ...pin, name: label });
  };

  const focusStop = (stop: Stop) =>
    map.current?.animateToRegion({ ...toCoord(stop.location), latitudeDelta: 0.01, longitudeDelta: 0.01 }, 400);

  const recenter = () => {
    if (gps) map.current?.animateToRegion({ ...toCoord(gps), latitudeDelta: 0.02, longitudeDelta: 0.02 }, 400);
    else location.retry();
  };

  const confirmPick = async () => {
    const field = pickMode;
    if (!field) return;
    const p = fromCoord(region);
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

  if (!initialRegion) return null;

  return (
    <View style={styles.flex}>
      <MapView
        ref={map}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE}
        initialRegion={initialRegion}
        onRegionChangeComplete={onRegionChangeComplete}
        onLongPress={(e) => !pickMode && dropPin(fromCoord(e.nativeEvent.coordinate))}
        showsUserLocation={location.status === 'ready' || location.status === 'locating'}
        showsMyLocationButton={false}
        toolbarEnabled={false}>
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
          <Marker
            coordinate={toCoord(from.location)}
            draggable
            pinColor="green"
            onDragEnd={(e) => dropPin(fromCoord(e.nativeEvent.coordinate))}
          />
        )}
        {to && <Marker coordinate={toCoord(to.location)} pinColor="red" />}
      </MapView>

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
        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
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
