import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Button } from '@/components/button';
import { Message } from '@/components/message';
import { Text } from '@/components/text';
import { legColor, Spacing, useColors } from '@/constants/theme';
import { RouteMap } from '@/features/map/route-map';
import { RouteDetailBody } from '@/features/routes/route-detail-body';
import { useRoute } from '@/features/routes/queries';
import { routeBookmarkId, saveRoute, useSavedStore } from '@/features/saved/store';
import { useFormat } from '@/i18n/use-format';

export default function RouteScreen() {
  const { id, variant } = useLocalSearchParams<{ id: string; variant?: string }>();
  const colors = useColors();
  const { height } = useWindowDimensions();
  const { t, name } = useFormat();
  const { data, isPending, isError, isPlaceholderData } = useRoute(id);
  const bookmarked = useSavedStore((s) => s.bookmarks.some((b) => b.id === routeBookmarkId(id ?? '')));

  const initialIndex = Math.max(0, data?.variants.findIndex((v) => v.id === variant) ?? 0);
  const [chosen, setChosen] = useState<number | null>(null);
  const variantIndex = chosen ?? initialIndex;

  if (!data) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        {isPending && !isError ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Message icon="error-outline" title={t('route.notFound')} />
        )}
      </View>
    );
  }

  const current = data.variants[variantIndex] ?? data.variants[0];
  const color = legColor(0);

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: t('route.title', { code: data.route.code }) }} />
      <View style={{ height: height * 0.4 }}>
        <RouteMap
          id={current.id}
          polyline={current.polyline}
          stops={current.stops}
          color={color}
          onStopPress={(s) => router.push({ pathname: '/stop/[id]', params: { id: s.id } })}
        />
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        <View style={styles.header}>
          <Text variant="title" bold latin>
            {data.route.code}
          </Text>
          <Text color="textSecondary">{name(data.route.name)}</Text>
          {isPlaceholderData && isError && (
            <Text variant="caption" color="textSecondary">
              {t('route.offlineCopy')}
            </Text>
          )}
          <Button
            icon={bookmarked ? 'bookmark' : 'bookmark-border'}
            label={bookmarked ? t('route.bookmarked') : t('route.bookmark')}
            variant={bookmarked ? 'secondary' : 'primary'}
            disabled={bookmarked}
            onPress={() => saveRoute(data)}
            style={styles.bookmark}
          />
        </View>
        <RouteDetailBody
          detail={data}
          variantIndex={variantIndex}
          onVariantChange={setChosen}
          onStopPress={(s) => router.push({ pathname: '/stop/[id]', params: { id: s.id } })}
          color={color}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, padding: Spacing.md, justifyContent: 'center', alignItems: 'center' },
  list: { paddingBottom: Spacing.xl },
  header: { padding: Spacing.md, gap: Spacing.xs },
  bookmark: { alignSelf: 'flex-start', marginTop: Spacing.sm },
});
