// The checks from docs/05-data-strategy.md § Tooling, run over the app's network (built by
// data/karachi/pipeline) and over the hand-made sample network the unit tests use.
import { decodePolyline, haversineM, sliceShape } from '../../../../lib/geo';
import appNetwork from '../fixtures/network.json';
import type { NetworkFile } from '../network';
import sampleNetwork from './fixtures/sample-network.json';

describe.each([
  ['app network', appNetwork as NetworkFile],
  ['sample network', sampleNetwork as NetworkFile],
])('%s', (_name, net) => {
  const stopById = new Map(net.stops.map((s) => [s.id, s]));

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

  it('has valid variants', () => {
    const routeIds = new Set(net.routes.map((r) => r.id));
    for (const v of net.variants) {
      expect(v.stopIds.length).toBeGreaterThanOrEqual(2);
      for (const s of v.stopIds) expect(stopById.has(s)).toBe(true);
      expect(routeIds.has(v.routeId)).toBe(true);
      // towards = last stop's name
      expect(v.towards).toEqual(stopById.get(v.stopIds[v.stopIds.length - 1])!.name);
      // every stop lies within 50 m of the shape
      const shape = decodePolyline(v.shape);
      for (const s of v.stopIds) {
        const loc = stopById.get(s)!.location;
        const [snapped] = sliceShape(shape, loc, loc);
        expect(haversineM(loc, snapped)).toBeLessThan(50);
      }
    }
  });

  it('has both directions of every route', () => {
    for (const r of net.routes) {
      expect(net.variants.filter((v) => v.routeId === r.id).length).toBeGreaterThanOrEqual(2);
    }
  });

  it('has a meta record for every variant', () => {
    const variantMeta = new Set(net.meta.filter((m) => m.entity === 'variant').map((m) => m.id));
    for (const v of net.variants) expect(variantMeta.has(v.id)).toBe(true);
  });
});
