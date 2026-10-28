import { Fragment } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Text } from '@/components/text';
import { legColor, Radius, Spacing, useColors } from '@/constants/theme';
import { useFormat } from '@/i18n/use-format';
import type { RideLeg, TripOption } from '@/services/api/types';

import { RouteChip } from './route-chip';

export const ridesOf = (trip: TripOption) => trip.legs.filter((l): l is RideLeg => l.type === 'ride');

export function TripOptionCard({ trip, onPress }: { trip: TripOption; onPress: () => void }) {
  const colors = useColors();
  const { t, name, distance, minutes, stops } = useFormat();
  const rides = ridesOf(trip);
  const stopCount = rides.reduce((sum, r) => sum + r.stops.length - 1, 0);
  const badge = trip.transfers === 0 ? t('options.direct') : t('options.change', { stop: name(rides[0].alightStop.name) });

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.background, borderColor: colors.border },
        pressed && { backgroundColor: colors.surface },
      ]}>
      <View style={styles.top}>
        <View style={styles.chips}>
          {rides.map((ride, i) => (
            <Fragment key={ride.variantId}>
              {i > 0 && <Icon name="arrow-forward" size={20} color="textSecondary" />}
              <RouteChip route={ride.route} color={legColor(i)} size="lg" />
            </Fragment>
          ))}
        </View>
        <Text variant="heading" bold>
          {minutes(trip.durationMin)}
        </Text>
      </View>
      <Text color="textSecondary">
        {t('trip.towards', { place: name(rides[0].towards) })}
        {' · '}
        {t('trip.board')} {name(rides[0].boardStop.name)}
      </Text>
      <View style={styles.meta}>
        <View style={[styles.badge, { backgroundColor: trip.transfers === 0 ? colors.primary : colors.surfaceStrong }]}>
          <Text variant="caption" bold style={{ color: trip.transfers === 0 ? colors.onPrimary : colors.text }}>
            {badge}
          </Text>
        </View>
        <Text variant="caption" color="textSecondary">
          {t('options.walk', { distance: distance(trip.walkM) })} · {stops(stopCount)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.sm },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  chips: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexShrink: 1, flexWrap: 'wrap' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.pill },
});
