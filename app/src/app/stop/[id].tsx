import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';

import { Button } from '@/components/button';
import { Message } from '@/components/message';
import { SectionHeader } from '@/components/section-header';
import { Text } from '@/components/text';
import { Spacing, useColors } from '@/constants/theme';
import { toCoord } from '@/features/map/map-utils';
import { StopMarker } from '@/features/map/stop-marker';
import { setFrom, setTo, type PlanPoint } from '@/features/planner/store';
import { useStop } from '@/features/routes/queries';
import { StopRoutesList } from '@/features/routes/stop-routes-list';
import { useFormat } from '@/i18n/use-format';

export default function StopScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { t, lang, name } = useFormat();
  const { data, isPending } = useStop(id);

  if (!data) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        {isPending ? <ActivityIndicator color={colors.primary} /> : <Message icon="error-outline" title={t('stop.notFound')} />}
      </View>
    );
  }

  const { stop, routes } = data;
  const point: PlanPoint = { kind: 'place', location: stop.location, name: stop.name, placeId: stop.id };

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: name(stop.name) }} />
      <View style={styles.header}>
        <Text variant="title" bold>
          {name(stop.name)}
        </Text>
        <Text color="textSecondary">{lang === 'ur' ? stop.name.en : stop.name.ur}</Text>
      </View>
      <View style={styles.map}>
        <MapView
          style={StyleSheet.absoluteFill}
          provider={PROVIDER_GOOGLE}
          initialRegion={{ ...toCoord(stop.location), latitudeDelta: 0.01, longitudeDelta: 0.01 }}
          scrollEnabled={false}
          zoomEnabled={false}
          toolbarEnabled={false}>
          <StopMarker location={stop.location} color={colors.primary} variant="board" />
        </MapView>
      </View>
      <View style={styles.actions}>
        <Button
          icon="my-location"
          variant="secondary"
          label={t('stop.planFrom')}
          style={styles.flex}
          onPress={() => {
            setFrom(point);
            router.navigate('/');
          }}
        />
        <Button
          icon="flag"
          label={t('stop.planTo')}
          style={styles.flex}
          onPress={() => {
            setTo(point);
            router.push('/options');
          }}
        />
      </View>
      <SectionHeader title={t('stop.busesHere')} />
      <StopRoutesList
        routes={routes}
        onPress={(r) => router.push({ pathname: '/route/[id]', params: { id: r.route.id, variant: r.variantId } })}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, padding: Spacing.md, justifyContent: 'center', alignItems: 'center' },
  content: { paddingBottom: Spacing.xl },
  header: { padding: Spacing.md, gap: Spacing.xs },
  map: { height: 160, marginHorizontal: Spacing.md, borderRadius: 12, overflow: 'hidden' },
  actions: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md },
});
