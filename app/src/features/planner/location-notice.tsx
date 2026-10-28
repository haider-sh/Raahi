import { Linking, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Message } from '@/components/message';
import { Text } from '@/components/text';
import { Spacing } from '@/constants/theme';
import { useFormat } from '@/i18n/use-format';

import type { useUserLocation } from './use-user-location';

type Props = { location: ReturnType<typeof useUserLocation> };

/** Explains location before the system prompt, and offers the map-pick fallback. No dead ends. */
export function LocationNotice({ location }: Props) {
  const { t } = useFormat();
  switch (location.status) {
    case 'explain':
      return (
        <Message icon="my-location" title={t('plan.permission.title')} body={t('plan.permission.body')}>
          <View style={styles.row}>
            <Button label={t('plan.permission.allow')} onPress={location.request} style={styles.flex} />
            <Button variant="ghost" label={t('plan.permission.notNow')} onPress={location.dismissExplanation} />
          </View>
        </Message>
      );
    case 'denied':
      return (
        <Message icon="touch-app" title={t('plan.denied.title')} body={t('plan.denied.body')}>
          {location.canAskAgain ? (
            <Button variant="secondary" label={t('plan.permission.allow')} onPress={location.request} />
          ) : (
            <Button variant="secondary" label={t('plan.denied.settings')} onPress={() => Linking.openSettings()} />
          )}
        </Message>
      );
    case 'servicesOff':
      return (
        <Message icon="location-disabled" tone="warning" title={t('plan.gpsOff.title')} body={t('plan.gpsOff.body')}>
          <Button variant="secondary" label={t('common.retry')} onPress={location.retry} />
        </Message>
      );
    case 'checking':
    case 'locating':
      return <Text color="textSecondary">{t('plan.locating')}</Text>;
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  flex: { flex: 1 },
});
