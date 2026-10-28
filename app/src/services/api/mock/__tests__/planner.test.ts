import type { RideLeg, TripOption } from '../../types';
import networkFile from '../fixtures/network.json';
import { indexNetwork, type NetworkFile } from '../network';
import { plan } from '../planner';

const net = indexNetwork(networkFile as NetworkFile);
const at = (stopId: string) => net.stops.get(stopId)!.location;
const rides = (o: TripOption) => o.legs.filter((l): l is RideLeg => l.type === 'ride');

function options(fromStop: string, toStop: string, maxTransfers = 1) {
  const result = plan(net, at(fromStop), at(toStop), maxTransfers);
  if (!result.ok) throw new Error(`expected options, got ${result.code}`);
  return result.options;
}

describe('planner', () => {
  // The most important test in the project: a wrong-direction ride is what strands people.
  it('never returns a wrong-direction ride, for any pair of stops', () => {
    let checked = 0;
    for (const from of net.file.stops) {
      for (const to of net.file.stops) {
        if (from.id === to.id) continue;
        const result = plan(net, from.location, to.location, 1);
        if (!result.ok) continue;
        for (const option of result.options) {
          for (const leg of rides(option)) {
            const ids = net.variants.get(leg.variantId)!.stopIds;
            const board = ids.indexOf(leg.boardStop.id);
            const alight = ids.indexOf(leg.alightStop.id, board + 1);
            expect(board).toBeGreaterThanOrEqual(0);
            expect(alight).toBeGreaterThan(board);
            // the listed stops are exactly that slice of the variant, in travel order
            expect(leg.stops.map((s) => s.id)).toEqual(ids.slice(board, alight + 1));
            expect(leg.towards).toEqual(net.variants.get(leg.variantId)!.towards);
            checked++;
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(1000);
  });

  it('finds the direct W18 from Nagan Chowrangi to Saddar, towards Tower, and ranks it first', () => {
    const [best] = options('s_nagan', 's_saddar');
    expect(best.transfers).toBe(0);
    const [ride] = rides(best);
    expect(ride.route.code).toBe('W18');
    expect(ride.towards.en).toBe('Tower');
    expect(ride.boardStop.id).toBe('s_nagan');
    expect(ride.alightStop.id).toBe('s_saddar');
  });

  it('uses the other direction for the return trip', () => {
    const [best] = options('s_saddar', 's_nagan');
    const [ride] = rides(best);
    expect(ride.route.code).toBe('W18');
    expect(ride.towards.en).toBe('Power House Chowrangi');
  });

  it('finds a one-transfer trip from Sohrab Goth to Teen Talwar (Sheraz, then Masood)', () => {
    const all = options('s_sohrab_goth', 's_teen_talwar');
    expect(all.every((o) => o.transfers === 1)).toBe(true);
    const codes = all.map((o) => rides(o).map((r) => r.route.code).join('>'));
    expect(codes).toContain('Sheraz>Masood');
    const sheraz = all.find((o) => rides(o)[0].route.code === 'Sheraz')!;
    expect(rides(sheraz)[0].alightStop.id).toBe('s_gurumandir');
    expect(rides(sheraz)[1].boardStop.id).toBe('s_gurumandir');
  });

  it('ranks a faster direct trip above transfer options', () => {
    const all = options('s_malir_15', 's_saddar');
    expect(all[0].transfers).toBe(0);
    expect(rides(all[0])[0].route.code).toBe('G7');
    for (let i = 1; i < all.length; i++) expect(all[i].durationMin).toBeGreaterThanOrEqual(all[0].durationMin);
  });

  it('needs a transfer from Malir 15 to Nagan Chowrangi, and finds nothing with 0 transfers', () => {
    expect(options('s_malir_15', 's_nagan')[0].transfers).toBe(1);
    expect(plan(net, at('s_malir_15'), at('s_nagan'), 0)).toEqual({ ok: false, code: 'NO_ROUTE' });
  });

  it('returns NO_STOPS_NEARBY for a point outside the city', () => {
    const hyderabad = { lat: 25.396, lng: 68.3578 };
    expect(plan(net, hyderabad, at('s_saddar'))).toMatchObject({ ok: false, code: 'NO_STOPS_NEARBY', end: 'from' });
    expect(plan(net, at('s_saddar'), hyderabad)).toMatchObject({ ok: false, code: 'NO_STOPS_NEARBY', end: 'to' });
  });

  it('returns at most 5 options with consistent totals and unique ids', () => {
    for (const [a, b] of [
      ['s_orangi_5', 's_boat_basin'],
      ['s_safoora', 's_tower'],
      ['s_power_house', 's_kala_pul'],
    ]) {
      const all = options(a, b);
      expect(all.length).toBeGreaterThan(0);
      expect(all.length).toBeLessThanOrEqual(5);
      for (const o of all) {
        expect(o.transfers).toBe(rides(o).length - 1);
        expect(o.walkM).toBe(o.legs.reduce((s, l) => s + (l.type === 'walk' ? l.distanceM : 0), 0));
      }
      expect(new Set(all.map((o) => o.id)).size).toBe(all.length);
    }
  });

  it('starts and ends with walk legs from points off the stops', () => {
    const nearNagan = { lat: 24.968, lng: 67.07 };
    const nearSaddar = { lat: 24.862, lng: 67.033 };
    const result = plan(net, nearNagan, nearSaddar);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const legs = result.options[0].legs;
    expect(legs[0].type).toBe('walk');
    expect(legs[legs.length - 1].type).toBe('walk');
  });
});
