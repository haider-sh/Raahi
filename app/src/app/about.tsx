import { ScrollView, StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { Message } from '@/components/message';
import { Text } from '@/components/text';
import { Spacing, useColors } from '@/constants/theme';
import { openFeedback } from '@/features/trips/links';
import { useFormat } from '@/i18n/use-format';
import fixture from '@/services/api/mock/fixtures/network.json';
import type { NetworkFile } from '@/services/api/mock/network';

// Phase 1 reads the bundled fixture. Phase 2: GET /network/version (docs/03-api-contract.md § Later).
const networkFile = fixture as NetworkFile;
const verifiedDates = networkFile.meta.map((m) => m.verifiedAt).filter((d): d is string => !!d);
const lastVerified = verifiedDates.sort()[verifiedDates.length - 1] ?? null;
const isSample = networkFile.meta.some((m) => m.source === 'sample');

export default function AboutScreen() {
  const colors = useColors();
  const { t, date } = useFormat();
  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <Text variant="title" bold>
        Raahi · راہی
      </Text>
      <Text>{t('about.body')}</Text>
      {isSample && <Message tone="warning" icon="warning" title={t('about.sampleTitle')} body={t('about.sampleData')} />}
      <Text color="textSecondary">{t('about.dataVersion', { version: networkFile.version })}</Text>
      <Text color="textSecondary">
        {lastVerified ? t('about.verified', { date: date(lastVerified) }) : t('about.notVerified')}
      </Text>
      <Text color="textSecondary">{t('about.credits')}</Text>
      <Button
        variant="secondary"
        icon="mail-outline"
        label={t('about.feedback')}
        onPress={() => openFeedback(t('feedback.subject'), t('feedback.body', { summary: 'general' }))}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.md, gap: Spacing.md },
});
