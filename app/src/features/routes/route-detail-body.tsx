import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { SectionHeader } from '@/components/section-header';
import { Text } from '@/components/text';
import { Radius, Spacing, TOUCH, useColors } from '@/constants/theme';
import { useFormat } from '@/i18n/use-format';
import type { RouteDetail, Stop } from '@/services/api/types';

type Props = {
  detail: RouteDetail;
  variantIndex: number;
  onVariantChange: (index: number) => void;
  onStopPress: (stop: Stop) => void;
  color: string;
};

/** Direction toggle ("towards Saddar" / "towards Orangi") plus every stop, terminus to terminus. */
export function RouteDetailBody({ detail, variantIndex, onVariantChange, onStopPress, color }: Props) {
  const colors = useColors();
  const { t, name, stops } = useFormat();
  const variant = detail.variants[variantIndex] ?? detail.variants[0];

  return (
    <View>
      <View style={styles.toggle} accessibilityRole="tablist">
        {detail.variants.map((v, i) => {
          const selected = i === variantIndex;
          return (
            <Pressable
              key={v.id}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => onVariantChange(i)}
              style={[
                styles.tab,
                { borderColor: selected ? colors.primary : colors.border },
                selected && { backgroundColor: colors.primary },
              ]}>
              <Text bold={selected} style={{ color: selected ? colors.onPrimary : colors.text }} numberOfLines={2}>
                {t('trip.towards', { place: name(v.towards) })}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <SectionHeader title={`${t('route.stops')} · ${stops(variant.stops.length)}`} />
      <View testID="route-stops">
        {variant.stops.map((s, i) => (
          <Pressable
            key={s.id}
            accessibilityRole="button"
            onPress={() => onStopPress(s)}
            style={({ pressed }) => [styles.stop, pressed && { backgroundColor: colors.surface }]}>
            <View style={styles.rail}>
              <View style={[styles.line, { backgroundColor: i === 0 ? 'transparent' : color }]} />
              <View style={[styles.dot, { borderColor: color }]} />
              <View
                style={[styles.line, { backgroundColor: i === variant.stops.length - 1 ? 'transparent' : color }]}
              />
            </View>
            <Text testID="route-stop-name" style={styles.stopName} bold={i === 0 || i === variant.stops.length - 1}>
              {name(s.name)}
            </Text>
            <Icon name="chevron-right" color="textSecondary" />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  toggle: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
  tab: {
    flex: 1,
    minHeight: TOUCH,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stop: { flexDirection: 'row', alignItems: 'center', minHeight: TOUCH, paddingHorizontal: Spacing.md, gap: Spacing.md },
  rail: { width: 16, alignItems: 'center', alignSelf: 'stretch' },
  line: { flex: 1, width: 4 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 3, backgroundColor: '#FFFFFF' },
  stopName: { flex: 1 },
});
