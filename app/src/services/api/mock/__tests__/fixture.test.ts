// The checks from docs/05-data-strategy.md § Tooling, run over the fixture network.
import { decodePolyline, haversineM, sliceShape } from '../../../../lib/geo';
import networkFile from '../fixtures/network.json';
import type { NetworkFile } from '../network';

const net = networkFile as NetworkFile;
const stopById = new Map(net.stops.map((s) => [s.id, s]));

describe('fixture network', () => {
  it('has unique ids', () => {
    for (const list of [net.stops, net.landmarks, net.routes, net.variants]) {
      const ids = list.map((x) => x.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('has an en and ur name for every stop, landmark and route', () => {
    for (const x of [...net.stops, ...net.landmarks, ...net.routes]) {
      expect(x.name.en.trim()).not.toBe('');
      expect(x.name.ur.trim()).not.toBe('');
    }
  });

  it.each(net.variants.map((v) => [v.id, v] as const))('variant %s is valid', (_id, v) => {
    expect(v.stopIds.length).toBeGreaterThanOrEqual(2);
    for (const s of v.stopIds) expect(stopById.has(s)).toBe(true);
    expect(net.routes.some((r) => r.id === v.routeId)).toBe(true);
    // towards = last stop's name
    expect(v.towards).toEqual(stopById.get(v.stopIds[v.stopIds.length - 1])!.name);
    // every stop lies within 50 m of the shape
    const shape = decodePolyline(v.shape);
    for (const s of v.stopIds) {
      const loc = stopById.get(s)!.location;
      const [snapped] = sliceShape(shape, loc, loc);
      expect(haversineM(loc, snapped)).toBeLessThan(50);
    }
  });

  it('has both directions of every route', () => {
    for (const r of net.routes) {
      expect(net.variants.filter((v) => v.routeId === r.id).length).toBeGreaterThanOrEqual(2);
    }
  });
});
