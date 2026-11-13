import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Text } from '@/components/text';
import { legColor, Spacing, TOUCH, useColors } from '@/constants/theme';
import { RouteChip } from '@/features/trips/route-chip';
import { useFormat } from '@/i18n/use-format';
import type { StopRouteDirection } from '@/services/api/types';

type Props = {
  routes: StopRouteDirection[];
  onPress: (entry: StopRouteDirection) => void;
};

/** One row per route *and direction*: "W18 · towards Saddar". */
export function StopRoutesList({ routes, onPress }: Props) {
  const colors = useColors();
  const { t, name } = useFormat();
  if (routes.length === 0) {
    return (
      <Text color="textSecondary" style={styles.empty}>
        {t('stop.none')}
      </Text>
    );
  }
  // One colour per route, shared by both directions.
  const routeIds = [...new Set(routes.map((r) => r.route.id))];
  return (
    <View>
      {routes.map((entry) => (
        <Pressable
          key={entry.variantId}
          testID="stop-route-row"
          accessibilityRole="button"
          onPress={() => onPress(entry)}
          style={({ pressed }) => [
            styles.row,
            { borderBottomColor: colors.border },
            pressed && { backgroundColor: colors.surface },
          ]}>
          <RouteChip route={entry.route} color={legColor(routeIds.indexOf(entry.route.id))} />
          <Text style={styles.towards}>{t('trip.towards', { place: name(entry.towards) })}</Text>
          <Icon name="chevron-right" color="textSecondary" />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: TOUCH + 8,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  towards: { flex: 1 },
  empty: { padding: Spacing.md },
});
