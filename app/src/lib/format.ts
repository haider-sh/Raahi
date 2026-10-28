import type { LocalizedText } from '@/services/api/types';

export type Lang = 'en' | 'ur';

export const pick = (text: LocalizedText, lang: string): string => (lang === 'ur' ? text.ur : text.en);

/** Rounded for display: 10 m steps under 1 km, then 0.1 km. */
export function distanceParts(m: number): { unit: 'm' | 'km'; value: string } {
  if (m < 1000) return { unit: 'm', value: String(Math.max(10, Math.round(m / 10) * 10)) };
  return { unit: 'km', value: (m / 1000).toFixed(1) };
}
