import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Skeleton } from '@/components/skeleton';
import { Text } from '@/components/text';
import { legColor, Spacing } from '@/constants/theme';
import { RouteChip } from '@/features/trips/route-chip';
import { useFormat } from '@/i18n/use-format';
import { walkMinutes } from '@/lib/geo';
import type { LatLng, Stop } from '@/services/api/types';

import { useNearestStops } from './queries';

type Props = { start: LatLng; onStopPress: (stop: Stop) => void };

export function NearestStopCard({ start, onStopPress }: Props) {
  const { t, name, distance } = useFormat();
  const { data, isPending, isError } = useNearestStops(start, 1);
  const nearest = data?.stops[0];

  if (isPending) {
    return (
      <View style={styles.gap}>
        <Skeleton width="40%" />
        <Skeleton height={24} />
      </View>
    );
  }
  if (isError) return <Text color="textSecondary">{t('options.errors.generic')}</Text>;
  if (!nearest) {
    return (
      <View style={styles.gap}>
        <Text bold>{t('plan.noStopNearby')}</Text>
        <Text color="textSecondary">{t('plan.longPressHint')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.gap}>
      <Text variant="caption" color="textSecondary">
        {t('plan.nearestStop')}
      </Text>
      <Pressable accessibilityRole="button" onPress={() => onStopPress(nearest.stop)}>
        <Text variant="heading" bold>
          {name(nearest.stop.name)}
        </Text>
      </Pressable>
      <Text color="textSecondary">
        {t('plan.walkAway', { distance: distance(nearest.distanceM), minutes: walkMinutes(nearest.distanceM) })}
      </Text>
      <View style={styles.row}>
        <View style={styles.chips}>
          {nearest.routes.map((r, i) => (
            <RouteChip
              key={r.id}
              route={r}
              color={legColor(i)}
              onPress={() => router.push({ pathname: '/route/[id]', params: { id: r.id } })}
            />
          ))}
        </View>
        <Button
          variant="ghost"
          label={t('plan.busesHere')}
          icon="chevron-right"
          onPress={() => router.push({ pathname: '/stop/[id]', params: { id: nearest.stop.id } })}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: Spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, flexShrink: 1 },
});
