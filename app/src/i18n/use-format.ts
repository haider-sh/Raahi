import { useTranslation } from 'react-i18next';

import { distanceParts, pick } from '@/lib/format';
import type { LocalizedText } from '@/services/api/types';

/** Language-aware formatting for names, distances, durations and dates. */
export function useFormat() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'ur' ? 'ur' : 'en';
  return {
    t,
    lang,
    name: (text: LocalizedText) => pick(text, lang),
    distance: (m: number) => {
      const { unit, value } = distanceParts(m);
      return t(`units.${unit}`, { value });
    },
    minutes: (count: number) => t('units.minApprox', { count }),
    stops: (count: number) => t('units.stops', { count }),
    date: (iso: string) =>
      new Date(iso).toLocaleDateString(lang === 'ur' ? 'ur-PK' : 'en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
  };
}
