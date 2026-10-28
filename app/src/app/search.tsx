import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconButton } from '@/components/icon-button';
import { ListRow } from '@/components/list-row';
import { Message } from '@/components/message';
import { SectionHeader } from '@/components/section-header';
import { Fonts, Radius, Spacing, TOUCH, useColors } from '@/constants/theme';
import { placeToPoint, placeToSaved } from '@/features/planner/actions';
import { setFrom, setPickMode, setTo, useStart, type PickField } from '@/features/planner/store';
import { usePlaceSearch } from '@/features/places/queries';
import { addRecentPlace, getRecentPlaces } from '@/features/places/recent';
import { setSavedPlace } from '@/features/saved/store';
import { useFormat } from '@/i18n/use-format';
import { haversineM } from '@/lib/geo';
import type { Place, RouteSummary } from '@/services/api/types';

const FIELDS: PickField[] = ['from', 'to', 'home', 'work'];

type Row =
  | { type: 'header'; key: string; title: string }
  | { type: 'action'; key: string; title: string; icon: 'map' | 'my-location'; onPress: () => void }
  | { type: 'place'; key: string; place: Place }
  | { type: 'route'; key: string; route: RouteSummary }
  | { type: 'empty'; key: string };

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

export default function SearchScreen() {
  const params = useLocalSearchParams<{ field?: string }>();
  const field: PickField = FIELDS.includes(params.field as PickField) ? (params.field as PickField) : 'to';
  const colors = useColors();
  const { t, lang, name, distance } = useFormat();
  const start = useStart();

  const [text, setText] = useState('');
  const query = useDebounced(text, 250);
  const { data, isFetching } = usePlaceSearch(query, start?.location);
  const [recent, setRecent] = useState<Place[]>([]);
  useEffect(() => {
    getRecentPlaces().then(setRecent);
  }, []);

  const choosePlace = async (place: Place) => {
    addRecentPlace(place);
    if (field === 'home' || field === 'work') {
      await setSavedPlace(field, placeToSaved(place));
      router.back();
      return;
    }
    if (field === 'from') {
      setFrom(placeToPoint(place));
      router.back();
      return;
    }
    setTo(placeToPoint(place));
    router.dismiss();
    router.push('/options');
  };

  const openRoute = (route: RouteSummary) => {
    router.dismiss();
    router.push({ pathname: '/route/[id]', params: { id: route.id } });
  };

  const chooseOnMap = () => {
    setPickMode(field);
    router.dismiss();
    router.navigate('/');
  };

  const actions: Row[] = [
    ...(field === 'from'
      ? [
          {
            type: 'action' as const,
            key: 'gps',
            title: t('search.useMyLocation'),
            icon: 'my-location' as const,
            onPress: () => {
              setFrom(null);
              router.back();
            },
          },
        ]
      : []),
    { type: 'action', key: 'map', title: t('search.chooseOnMap'), icon: 'map', onPress: chooseOnMap },
  ];

  const rows: Row[] = [...actions];
  if (!query.trim()) {
    if (recent.length > 0) {
      rows.push({ type: 'header', key: 'h-recent', title: t('search.recent') });
      recent.forEach((p) => rows.push({ type: 'place', key: `r-${p.id}`, place: p }));
    }
  } else if (data) {
    const routeRows: Row[] = data.routes.length
      ? [
          { type: 'header', key: 'h-buses', title: t('search.buses') },
          ...data.routes.map((r): Row => ({ type: 'route', key: r.id, route: r })),
        ]
      : [];
    const placeRows: Row[] = data.places.length
      ? [
          { type: 'header', key: 'h-places', title: t('search.places') },
          ...data.places.map((p): Row => ({ type: 'place', key: p.id, place: p })),
        ]
      : [];
    // Buses first when looking for a destination; places first when saving home/work.
    if (field === 'home' || field === 'work') rows.push(...placeRows, ...routeRows);
    else rows.push(...routeRows, ...placeRows);
    if (!routeRows.length && !placeRows.length && !isFetching) rows.push({ type: 'empty', key: 'empty' });
  }

  const renderRow = ({ item }: { item: Row }) => {
    switch (item.type) {
      case 'header':
        return <SectionHeader title={item.title} />;
      case 'action':
        return <ListRow icon={item.icon} title={item.title} onPress={item.onPress} />;
      case 'route':
        return (
          <ListRow
            icon="directions-bus"
            title={item.route.code}
            subtitle={name(item.route.name)}
            onPress={() => openRoute(item.route)}
            chevron
          />
        );
      case 'place': {
        const p = item.place;
        const other = lang === 'ur' ? p.name.en : p.name.ur;
        const parts = [other, p.subtitle ? name(p.subtitle) : null];
        if (start) parts.push(distance(haversineM(start.location, p.location)));
        return (
          <ListRow
            icon={p.kind === 'stop' ? 'directions-bus' : 'place'}
            title={name(p.name)}
            subtitle={parts.filter(Boolean).join(' · ')}
            onPress={() => choosePlace(p)}
          />
        );
      }
      case 'empty':
        return (
          <View style={styles.empty}>
            <Message icon="search-off" body={t('search.empty')} />
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={[styles.bar, { borderBottomColor: colors.border }]}>
        <IconButton icon="arrow-back" label={t('common.close')} onPress={() => router.back()} />
        <TextInput
          autoFocus
          value={text}
          onChangeText={setText}
          placeholder={t(`search.placeholder.${field}`)}
          placeholderTextColor={colors.textSecondary}
          returnKeyType="search"
          autoCorrect={false}
          accessibilityLabel={t(`search.placeholder.${field}`)}
          style={[
            styles.input,
            { backgroundColor: colors.surface, color: colors.text },
            lang === 'ur' && { fontFamily: Fonts.urdu },
          ]}
        />
        {text ? <IconButton icon="close" label={t('search.clear')} onPress={() => setText('')} /> : null}
      </View>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.key}
        renderItem={renderRow}
        keyboardShouldPersistTaps="handled"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  input: { flex: 1, minHeight: TOUCH, borderRadius: Radius.md, paddingHorizontal: Spacing.md, fontSize: 16 },
  empty: { padding: Spacing.md },
});
