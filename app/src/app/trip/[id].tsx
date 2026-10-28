import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Button } from '@/components/button';
import { Message } from '@/components/message';
import { Text } from '@/components/text';
import { Spacing, useColors } from '@/constants/theme';
import { TripMap } from '@/features/map/trip-map';
import { pointName } from '@/features/planner/actions';
import { usePlanner, useStart } from '@/features/planner/store';
import { saveTrip, tripBookmarkId, useSavedStore } from '@/features/saved/store';
import { openFeedback } from '@/features/trips/links';
import { ridesOf } from '@/features/trips/trip-option-card';
import { TripSteps } from '@/features/trips/trip-steps';
import { useFormat } from '@/i18n/use-format';

export default function TripScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { height } = useWindowDimensions();
  const { t, name, date } = useFormat();
  const [focusLeg, setFocusLeg] = useState<number | null>(null);

  const selected = usePlanner((s) => s.selectedTrip);
  const start = useStart();
  const to = usePlanner((s) => s.to);
  const bookmark = useSavedStore((s) =>
    s.bookmarks.find((b) => b.kind === 'trip' && b.id === tripBookmarkId(id ?? '')),
  );
  // A bookmarked trip opens with no network: it's stored whole.
  const trip = selected?.id === id ? selected : bookmark?.kind === 'trip' ? bookmark.trip : null;

  if (!trip) {
    return (
      <View style={[styles.missing, { backgroundColor: colors.background }]}>
        <Message icon="error-outline" title={t('trip.notFound')}>
          <Button label={t('common.close')} onPress={() => router.back()} />
        </Message>
      </View>
    );
  }

  const fromName = bookmark?.kind === 'trip' ? bookmark.fromName : pointName(start);
  const toName = bookmark?.kind === 'trip' ? bookmark.toName : pointName(to);
  const summary = `${ridesOf(trip)
    .map((r) => `${r.route.code} (${r.boardStop.name.en} → ${r.alightStop.name.en})`)
    .join(' + ')}; ${fromName.en} → ${toName.en}; trip ${trip.id}`;

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <View style={{ height: height * 0.4 }}>
        <TripMap trip={trip} focusLegIndex={focusLeg} />
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        <View style={styles.header}>
          <Text variant="caption" color="textSecondary">
            {name(fromName)} → {name(toName)}
          </Text>
          {bookmark && (
            <Text variant="caption" color="textSecondary">
              {t('trip.savedOn', { date: date(bookmark.savedAt) })}
            </Text>
          )}
        </View>
        <TripSteps
          trip={trip}
          onStepPress={setFocusLeg}
          onRoutePress={(routeId, variantId) =>
            router.push({ pathname: '/route/[id]', params: { id: routeId, variant: variantId } })
          }
        />
        <View style={styles.actions}>
          <Button
            icon={bookmark ? 'bookmark' : 'bookmark-border'}
            label={bookmark ? t('trip.savedTrip') : t('trip.saveTrip')}
            variant={bookmark ? 'secondary' : 'primary'}
            disabled={!!bookmark}
            onPress={() => saveTrip(trip, fromName, toName)}
          />
          <Button
            variant="ghost"
            icon="report-problem"
            label={t('trip.wrongInfo')}
            onPress={() => openFeedback(t('feedback.subject'), t('feedback.body', { summary }))}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  missing: { flex: 1, padding: Spacing.md, justifyContent: 'center' },
  list: { paddingVertical: Spacing.md },
  header: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, gap: Spacing.xs },
  actions: { padding: Spacing.md, gap: Spacing.sm },
});
