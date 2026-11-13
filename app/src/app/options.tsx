import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { Message } from '@/components/message';
import { Skeleton } from '@/components/skeleton';
import { Text } from '@/components/text';
import { Radius, Spacing, useColors } from '@/constants/theme';
import { useNearestStops, useTripPlan } from '@/features/planner/queries';
import { selectTrip, setPickMode, usePlanner, useStart, type PlanPoint } from '@/features/planner/store';
import { PlanError } from '@/features/trips/plan-error';
import { TripOptionCard } from '@/features/trips/trip-option-card';
import { isApiError } from '@/services/api/errors';
import { useFormat } from '@/i18n/use-format';

export default function OptionsScreen() {
  const colors = useColors();
  const { t, name } = useFormat();
  const start = useStart();
  const to = usePlanner((s) => s.to);
  const plan = useTripPlan(start?.location, to?.location);

  // For the honest error states: nearest stops at both ends.
  const showNearby = isApiError(plan.error, 'NO_ROUTE') || isApiError(plan.error, 'NO_STOPS_NEARBY');
  const nearFrom = useNearestStops(start?.location, 3, 1500, showNearby);
  const nearTo = useNearestStops(to?.location, 3, 1500, showNearby);

  const label = (p: PlanPoint | null) =>
    !p || p.kind === 'gps' ? t('plan.myLocation') : p.name ? name(p.name) : t('plan.droppedPin');

  const movePin = (end: 'from' | 'to') => {
    setPickMode(end);
    router.navigate('/');
  };

  return (
    <ScrollView contentContainerStyle={styles.content} style={{ backgroundColor: colors.background }}>
      <View style={[styles.summary, { backgroundColor: colors.surface }]}>
        <Icon name={start?.kind === 'gps' ? 'my-location' : 'place'} color="primary" size={18} />
        <Text numberOfLines={1} style={styles.flex}>
          {label(start)}
        </Text>
        <Icon name="arrow-forward" color="textSecondary" size={18} />
        <Icon name="flag" color="danger" size={18} />
        <Text numberOfLines={1} bold style={styles.flex}>
          {label(to)}
        </Text>
      </View>

      {!start ? (
        <Message icon="my-location" title={t('options.missingStart')}>
          <Button
            label={t('options.chooseStart')}
            onPress={() => router.push({ pathname: '/search', params: { field: 'from' } })}
          />
        </Message>
      ) : plan.isPending ? (
        [0, 1, 2].map((i) => (
          <View key={i} style={[styles.skeleton, { borderColor: colors.border }]}>
            <Skeleton height={28} width="50%" />
            <Skeleton />
            <Skeleton width="70%" />
          </View>
        ))
      ) : plan.isError ? (
        <PlanError
          error={plan.error}
          nearFrom={nearFrom.data?.stops}
          nearTo={nearTo.data?.stops}
          onMovePin={movePin}
          onRetry={() => plan.refetch()}
        />
      ) : (
        plan.data.options.map((option) => (
          <TripOptionCard
            key={option.id}
            trip={option}
            onPress={() => {
              selectTrip(option);
              router.push({ pathname: '/trip/[id]', params: { id: option.id } });
            }}
          />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, gap: Spacing.md },
  flex: { flex: 1 },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  skeleton: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.sm },
});
