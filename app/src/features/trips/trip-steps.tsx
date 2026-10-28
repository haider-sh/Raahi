import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { Text } from '@/components/text';
import { legColor, Radius, Spacing, useColors } from '@/constants/theme';
import { useFormat } from '@/i18n/use-format';
import type { LocalizedText, RideLeg, Stop, TripOption, WalkLeg } from '@/services/api/types';

import { openWalkingDirections } from './links';
import { RouteChip } from './route-chip';

export type Step =
  | { kind: 'walk'; legIndex: number; leg: WalkLeg; to: LocalizedText | null }
  | { kind: 'board'; legIndex: number; leg: RideLeg; rideIndex: number }
  | { kind: 'ride'; legIndex: number; leg: RideLeg; rideIndex: number }
  | { kind: 'alight'; legIndex: number; leg: RideLeg; rideIndex: number; before: Stop | null };

/** Turns legs into the steps a rider follows: walk, board, ride, get off, ... */
export function buildSteps(trip: TripOption): Step[] {
  const steps: Step[] = [];
  let rideIndex = 0;
  trip.legs.forEach((leg, legIndex) => {
    if (leg.type === 'walk') {
      const next = trip.legs.slice(legIndex + 1).find((l): l is RideLeg => l.type === 'ride');
      const to = leg.toStopId && next?.boardStop.id === leg.toStopId ? next.boardStop.name : null;
      steps.push({ kind: 'walk', legIndex, leg, to });
      return;
    }
    steps.push({ kind: 'board', legIndex, leg, rideIndex });
    steps.push({ kind: 'ride', legIndex, leg, rideIndex });
    // The stop before yours, so you know when to get ready. Skip it when that's where you boarded.
    const before = leg.stops.length >= 3 ? leg.stops[leg.stops.length - 2] : null;
    steps.push({ kind: 'alight', legIndex, leg, rideIndex, before });
    rideIndex++;
  });
  return steps;
}

type Props = {
  trip: TripOption;
  onStepPress?: (legIndex: number) => void;
  onRoutePress?: (routeId: string, variantId: string) => void;
};

export function TripSteps({ trip, onStepPress, onRoutePress }: Props) {
  const steps = buildSteps(trip);
  return (
    <View accessibilityRole="list">
      {steps.map((step, i) => (
        <StepRow
          key={`${step.kind}-${step.legIndex}`}
          step={step}
          last={i === steps.length - 1}
          onPress={() => onStepPress?.(step.legIndex)}
          onRoutePress={onRoutePress}
        />
      ))}
    </View>
  );
}

function StepRow({
  step,
  last,
  onPress,
  onRoutePress,
}: {
  step: Step;
  last: boolean;
  onPress: () => void;
  onRoutePress?: Props['onRoutePress'];
}) {
  const colors = useColors();
  const { t, name, distance, minutes, stops } = useFormat();
  const [expanded, setExpanded] = useState(false);
  const rail = step.kind === 'walk' ? colors.walk : legColor(step.rideIndex);

  let icon: Parameters<typeof Icon>[0]['name'];
  let body: ReactNode;
  switch (step.kind) {
    case 'walk':
      icon = 'directions-walk';
      body = (
        <>
          <Text bold>
            {step.to
              ? t('trip.walkTo', { distance: distance(step.leg.distanceM), stop: name(step.to) })
              : t('trip.walkToDestination', { distance: distance(step.leg.distanceM) })}
          </Text>
          <Text variant="caption" color="textSecondary">
            {minutes(step.leg.durationMin)}
          </Text>
          <Button
            variant="ghost"
            icon="open-in-new"
            label={t('trip.openWalking')}
            onPress={() => openWalkingDirections(step.leg.to)}
            style={styles.inlineButton}
          />
        </>
      );
      break;
    case 'board':
      icon = 'directions-bus';
      body = (
        <>
          <View style={styles.boardLine}>
            <Text bold>{t('trip.board')}</Text>
            <RouteChip
              route={step.leg.route}
              color={legColor(step.rideIndex)}
              size="lg"
              onPress={onRoutePress ? () => onRoutePress(step.leg.route.id, step.leg.variantId) : undefined}
            />
            <Text bold>{t('trip.towards', { place: name(step.leg.towards) })}</Text>
          </View>
          <Text color="textSecondary">{name(step.leg.boardStop.name)}</Text>
          <Text variant="caption" color="textSecondary">
            {t('trip.askConductor', { place: name(step.leg.towards) })}
          </Text>
          <Text variant="caption" color="textSecondary">
            {t('trip.sameName')}
          </Text>
        </>
      );
      break;
    case 'ride': {
      icon = 'more-vert';
      const count = step.leg.stops.length - 1;
      body = (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            onPress={() => setExpanded((e) => !e)}
            style={styles.rideToggle}>
            <Text>
              {t('trip.ride', { stops: stops(count) })} · {minutes(step.leg.durationMin)}
            </Text>
            <Text variant="caption" color="primary" bold>
              {expanded ? t('trip.hideStops') : t('trip.showStops')}
            </Text>
          </Pressable>
          {expanded && (
            <View testID="ride-stops" style={styles.stopList}>
              {step.leg.stops.map((s) => (
                <Text key={s.id} variant="caption">
                  • {name(s.name)}
                </Text>
              ))}
            </View>
          )}
        </>
      );
      break;
    }
    case 'alight':
      icon = 'flag';
      body = (
        <View
          testID="get-off-highlight"
          style={[styles.highlight, { backgroundColor: colors.highlight, borderColor: colors.highlightBorder }]}>
          <Text bold variant="heading">
            {t('trip.getOff', { stop: name(step.leg.alightStop.name) })}
          </Text>
          {step.before && (
            <Text variant="caption">{t('trip.getReady', { stop: name(step.before.name) })}</Text>
          )}
        </View>
      );
      break;
  }

  return (
    <Pressable
      testID={`step-${step.kind}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surface }]}>
      <View style={styles.gutter}>
        <View style={[styles.dot, { borderColor: rail }]}>
          <Icon name={icon} size={18} rawColor={rail} />
        </View>
        {!last && (
          <View
            style={[
              styles.rail,
              { backgroundColor: rail },
              step.kind === 'walk' && styles.railDashed,
              step.kind === 'walk' && { borderColor: rail },
            ]}
          />
        )}
      </View>
      <View style={styles.body}>{body}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: Spacing.md },
  gutter: { width: 32, alignItems: 'center' },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  rail: { flex: 1, width: 4, marginVertical: 2, borderRadius: 2 },
  railDashed: { backgroundColor: 'transparent', borderWidth: 2, borderStyle: 'dashed', width: 0 },
  body: { flex: 1, paddingVertical: Spacing.sm, gap: Spacing.xs, paddingBottom: Spacing.md },
  boardLine: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.sm },
  rideToggle: { minHeight: 48, justifyContent: 'center' },
  stopList: { gap: 2, paddingStart: Spacing.sm },
  highlight: { borderWidth: 2, borderRadius: Radius.md, padding: Spacing.md, gap: Spacing.xs },
  inlineButton: { alignSelf: 'flex-start', paddingHorizontal: 0 },
});
