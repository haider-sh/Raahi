import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Message } from '@/components/message';
import { SectionHeader } from '@/components/section-header';
import { Text } from '@/components/text';
import { Spacing } from '@/constants/theme';
import { useFormat } from '@/i18n/use-format';
import { isApiError } from '@/services/api/errors';
import type { NearestStop } from '@/services/api/types';

type Props = {
  error: unknown;
  /** Nearest stops at each end, for the honest "we don't know a bus" state. */
  nearFrom?: NearestStop[];
  nearTo?: NearestStop[];
  onMovePin: (end: 'from' | 'to') => void;
  onRetry: () => void;
};

export function PlanError({ error, nearFrom, nearTo, onMovePin, onRetry }: Props) {
  const { t, name, distance } = useFormat();

  if (isApiError(error, 'NO_STOPS_NEARBY')) {
    // The mock and the API say which end in the message; the nearest-stop lists say it for sure.
    const end = nearFrom && nearFrom.length > 0 ? 'to' : 'from';
    return (
      <Message
        icon="wrong-location"
        title={end === 'from' ? t('options.errors.noStopsFrom') : t('options.errors.noStopsTo')}>
        <Button label={t('options.errors.movePin')} icon="place" onPress={() => onMovePin(end)} />
      </Message>
    );
  }

  if (isApiError(error, 'NO_ROUTE')) {
    const list = (title: string, stops?: NearestStop[]) =>
      stops && stops.length > 0 ? (
        <View>
          <SectionHeader title={title} />
          {stops.map((s) => (
            <Text key={s.stop.id} style={styles.stop}>
              {name(s.stop.name)} · {distance(s.distanceM)}
              {s.routes.length > 0 ? ` · ${s.routes.map((r) => r.code).join(', ')}` : ''}
            </Text>
          ))}
        </View>
      ) : null;
    return (
      <View style={styles.gap}>
        <Message icon="help-outline" title={t('options.errors.noRoute')} />
        {list(t('options.errors.nearStart'), nearFrom)}
        {list(t('options.errors.nearDestination'), nearTo)}
      </View>
    );
  }

  if (isApiError(error, 'NETWORK')) {
    return (
      <Message icon="cloud-off" title={t('options.errors.offline')}>
        <Button variant="secondary" label={t('common.retry')} onPress={onRetry} />
      </Message>
    );
  }

  return (
    <Message icon="error-outline" title={t('options.errors.generic')}>
      <Button variant="secondary" label={t('common.retry')} onPress={onRetry} />
    </Message>
  );
}

const styles = StyleSheet.create({
  gap: { gap: Spacing.sm },
  stop: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs },
});
