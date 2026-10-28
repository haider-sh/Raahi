// Planner state (D7): where from, where to, the chosen trip, and map pick mode.

import { useMemo } from 'react';
import { create } from 'zustand';

import type { LatLng, LocalizedText, TripOption } from '@/services/api/types';

/**
 * `gps` = the user's live location; `place` = a searched stop or landmark; `pin` = a point picked
 * on the map, named after the nearest stop when we know it.
 */
export type PlanPoint = {
  kind: 'gps' | 'place' | 'pin';
  location: LatLng;
  name: LocalizedText | null;
  placeId?: string;
};

export type PickField = 'from' | 'to' | 'home' | 'work';

type PlannerState = {
  /** null = start from my location. */
  from: PlanPoint | null;
  to: PlanPoint | null;
  gps: LatLng | null;
  selectedTrip: TripOption | null;
  pickMode: PickField | null;
};

export const usePlanner = create<PlannerState>(() => ({
  from: null,
  to: null,
  gps: null,
  selectedTrip: null,
  pickMode: null,
}));

export const setFrom = (from: PlanPoint | null) => usePlanner.setState({ from });
export const setTo = (to: PlanPoint | null) => usePlanner.setState({ to });
export const setGps = (gps: LatLng) => usePlanner.setState({ gps });
export const selectTrip = (selectedTrip: TripOption | null) => usePlanner.setState({ selectedTrip });
export const setPickMode = (pickMode: PickField | null) => usePlanner.setState({ pickMode });

export function swapFromTo() {
  const { from, to, gps } = usePlanner.getState();
  const start: PlanPoint | null = from ?? (gps ? { kind: 'gps', location: gps, name: null } : null);
  usePlanner.setState({ from: to?.kind === 'gps' ? null : to, to: start });
}

/** The effective start: the chosen point, or my location if I have one. */
export function resolveStart(s: Pick<PlannerState, 'from' | 'gps'>): PlanPoint | null {
  return s.from ?? (s.gps ? { kind: 'gps', location: s.gps, name: null } : null);
}

export function useStart(): PlanPoint | null {
  const from = usePlanner((s) => s.from);
  const gps = usePlanner((s) => s.gps);
  return useMemo(() => resolveStart({ from, gps }), [from, gps]);
}
