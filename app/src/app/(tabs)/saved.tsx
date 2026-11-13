import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { IconButton } from '@/components/icon-button';
import { ListRow } from '@/components/list-row';
import { Message } from '@/components/message';
import { SectionHeader } from '@/components/section-header';
import { Text } from '@/components/text';
import { Spacing, useColors } from '@/constants/theme';
import { useSession } from '@/features/account/session';
import { savedToPoint } from '@/features/planner/actions';
import { setTo } from '@/features/planner/store';
import { removeBookmark, useSavedStore } from '@/features/saved/store';
import { ridesOf } from '@/features/trips/trip-option-card';
import { useFormat } from '@/i18n/use-format';
import { storage } from '@/lib/storage';
import type { Bookmark, SavedPlace } from '@/services/api/types';

export default function SavedScreen() {
  const colors = useColors();
  const { t, name, date } = useFormat();
  const { home, work, bookmarks, routeCache } = useSavedStore();
  const status = useSession((s) => s.status);
  const [hintDismissed, setHintDismissed] = useState(true);

  useEffect(() => {
    storage.get('saved.hintDismissed').then((v) => setHintDismissed(!!v));
  }, []);

  const dismissHint = () => {
    setHintDismissed(true);
    storage.set('saved.hintDismissed', true);
  };

  const confirmDelete = (b: Bookmark) =>
    Alert.alert(t('saved.deleteConfirm'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => removeBookmark(b.id) },
    ]);

  const placeRow = (which: 'home' | 'work', place: SavedPlace | null) =>
    place ? (
      <ListRow
        key={which}
        icon={which === 'home' ? 'home' : 'work'}
        title={t(`saved.${which}`)}
        subtitle={name(place.name)}
        onPress={() => {
          setTo(savedToPoint(place));
          router.push('/options');
        }}
        trailing={
          <IconButton
            icon="edit"
            label={t('common.edit')}
            onPress={() => router.push({ pathname: '/search', params: { field: which } })}
          />
        }
      />
    ) : (
      <ListRow
        key={which}
        icon={which === 'home' ? 'add-home' : 'add-business'}
        title={t(which === 'home' ? 'saved.setHome' : 'saved.setWork')}
        onPress={() => router.push({ pathname: '/search', params: { field: which } })}
        chevron
      />
    );

  const routes = bookmarks.filter((b) => b.kind === 'route');
  const trips = bookmarks.filter((b) => b.kind === 'trip');

  return (
    <SafeAreaView edges={['top']} style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="title" bold style={styles.title}>
          {t('tabs.saved')}
        </Text>

        {status === 'signedOut' && !hintDismissed && (
          <View style={styles.hint}>
            <Message icon="cloud-upload" body={t('saved.signInHint')}>
              <View style={styles.row}>
                <Button label={t('saved.signIn')} onPress={() => router.push('/sign-in')} style={styles.flex} />
                <Button variant="ghost" label={t('saved.dismiss')} onPress={dismissHint} />
              </View>
            </Message>
          </View>
        )}

        <SectionHeader title={t('saved.homeWork')} />
        {placeRow('home', home)}
        {placeRow('work', work)}

        <SectionHeader title={t('saved.buses')} />
        {routes.length === 0 ? (
          <Text color="textSecondary" style={styles.empty}>
            {t('saved.emptyBuses')}
          </Text>
        ) : (
          routes.map((b) => {
            if (b.kind !== 'route') return null;
            const detail = routeCache[b.routeId];
            return (
              <ListRow
                key={b.id}
                icon="directions-bus"
                title={detail?.route.code ?? b.routeId}
                subtitle={[detail ? name(detail.route.name) : null, t('saved.savedOn', { date: date(b.savedAt) })]
                  .filter(Boolean)
                  .join(' · ')}
                onPress={() => router.push({ pathname: '/route/[id]', params: { id: b.routeId } })}
                onLongPress={() => confirmDelete(b)}
                accessibilityHint={t('saved.deleteHint')}
                chevron
              />
            );
          })
        )}

        <SectionHeader title={t('saved.trips')} />
        {trips.length === 0 ? (
          <Text color="textSecondary" style={styles.empty}>
            {t('saved.emptyTrips')}
          </Text>
        ) : (
          trips.map((b) =>
            b.kind === 'trip' ? (
              <ListRow
                key={b.id}
                icon="route"
                title={`${name(b.fromName)} → ${name(b.toName)}`}
                subtitle={`${ridesOf(b.trip)
                  .map((r) => r.route.code)
                  .join(' → ')} · ${t('saved.savedOn', { date: date(b.savedAt) })}`}
                onPress={() => router.push({ pathname: '/trip/[id]', params: { id: b.trip.id } })}
                onLongPress={() => confirmDelete(b)}
                accessibilityHint={t('saved.deleteHint')}
                chevron
              />
            ) : null,
          )
        )}
        {bookmarks.length > 0 && (
          <Text variant="caption" color="textSecondary" style={styles.empty}>
            {t('saved.deleteHint')}
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingBottom: Spacing.xl },
  title: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
  hint: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
  row: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  empty: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
});
