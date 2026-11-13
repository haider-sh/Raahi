import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import { Text } from '@/components/text';
import { Radius, Spacing, TOUCH, useColors } from '@/constants/theme';
import { useSavedStore } from '@/features/saved/store';
import { useFormat } from '@/i18n/use-format';

import { savedToPoint } from './actions';
import { setFrom, setTo, swapFromTo, usePlanner, type PlanPoint } from './store';

function usePointLabel() {
  const { t, name } = useFormat();
  return (p: PlanPoint | null) => {
    if (!p || p.kind === 'gps') return t('plan.myLocation');
    if (p.name) return name(p.name);
    return t('plan.droppedPin');
  };
}

/** Start chip, "Where to?" bar, swap, and one-tap Home/Work. */
export function PlanHeader() {
  const colors = useColors();
  const { t } = useFormat();
  const label = usePointLabel();
  const from = usePlanner((s) => s.from);
  const to = usePlanner((s) => s.to);
  const home = useSavedStore((s) => s.home);
  const work = useSavedStore((s) => s.work);

  const goTo = (point: PlanPoint) => {
    setTo(point);
    router.push('/options');
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.background }]}>
      <View style={styles.fields}>
        <View style={styles.fieldColumn}>
          <View style={styles.fieldRow}>
            <Icon name={from ? 'place' : 'my-location'} color="primary" size={20} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${t('plan.from')}: ${label(from)}`}
              onPress={() => router.push({ pathname: '/search', params: { field: 'from' } })}
              style={[styles.field, { backgroundColor: colors.surface }]}>
              <Text numberOfLines={1} color={from ? 'text' : 'textSecondary'}>
                {label(from)}
              </Text>
            </Pressable>
            {from && <IconButton icon="close" label={t('plan.useMyLocation')} onPress={() => setFrom(null)} />}
          </View>
          <View style={styles.fieldRow}>
            <Icon name="flag" color="danger" size={20} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={to ? label(to) : t('plan.whereTo')}
              onPress={() => router.push({ pathname: '/search', params: { field: 'to' } })}
              style={[styles.field, styles.whereTo, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
              <Text numberOfLines={1} bold={!to} color={to ? 'text' : 'textSecondary'}>
                {to ? label(to) : t('plan.whereTo')}
              </Text>
            </Pressable>
            {to && <IconButton icon="close" label={t('common.clear')} onPress={() => setTo(null)} />}
          </View>
        </View>
        <IconButton icon="swap-vert" label={t('plan.swap')} onPress={swapFromTo} />
      </View>

      {(home || work || to) && (
        <View style={styles.chips}>
          {home && (
            <Chip icon="home" label={t('plan.takeMeHome')} onPress={() => goTo(savedToPoint(home))} />
          )}
          {work && <Chip icon="work" label={t('plan.work')} onPress={() => goTo(savedToPoint(work))} />}
          {to && (
            <Chip icon="directions-bus" label={t('plan.findBuses')} primary onPress={() => router.push('/options')} />
          )}
        </View>
      )}
    </View>
  );
}

function Chip({
  icon,
  label,
  onPress,
  primary,
}: {
  icon: Parameters<typeof Icon>[0]['name'];
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: primary ? colors.primary : colors.surfaceStrong },
        pressed && { opacity: 0.7 },
      ]}>
      <Icon name={icon} size={18} rawColor={primary ? colors.onPrimary : colors.text} />
      <Text bold variant="caption" style={{ color: primary ? colors.onPrimary : colors.text }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: Spacing.sm,
    borderRadius: Radius.lg,
    padding: Spacing.sm,
    gap: Spacing.sm,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  fields: { flexDirection: 'row', alignItems: 'center' },
  fieldColumn: { flex: 1, gap: Spacing.xs },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingStart: Spacing.xs },
  field: {
    flex: 1,
    minHeight: TOUCH,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
  },
  whereTo: { borderWidth: 1.5 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    minHeight: 40,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
  },
});
