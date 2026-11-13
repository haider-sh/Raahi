import { Linking } from 'react-native';

import type { LatLng } from '@/services/api/types';

/** Placeholder until the team has a feedback inbox. */
export const FEEDBACK_EMAIL = 'feedback@raahi.pk';

/**
 * Free Google Maps URL (no key, not billed) that opens walking directions in the Maps app (D19).
 * Never call the Directions API instead.
 */
export function openWalkingDirections(to: LatLng) {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${to.lat},${to.lng}&travelmode=walking`;
  return Linking.openURL(url);
}

/** The cheapest feedback loop: a prefilled email to the team. */
export function openFeedback(subject: string, body: string) {
  return Linking.openURL(
    `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
  );
}
