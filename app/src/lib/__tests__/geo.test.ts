import { decodePolyline, encodePolyline, haversineM, sliceShape } from '../geo';

describe('polyline', () => {
  it('matches the reference example from the Google docs', () => {
    const points = [
      { lat: 38.5, lng: -120.2 },
      { lat: 40.7, lng: -120.95 },
      { lat: 43.252, lng: -126.453 },
    ];
    expect(encodePolyline(points)).toBe('_p~iF~ps|U_ulLnnqC_mqNvxq`@');
  });

  it('round-trips', () => {
    const points = [
      { lat: 24.8605, lng: 67.03 },
      { lat: 24.881, lng: 67.038 },
      { lat: 24.9653, lng: 67.0668 },
    ];
    expect(decodePolyline(encodePolyline(points))).toEqual(points);
  });
});

describe('haversineM', () => {
  it('is about 111 km per degree of latitude', () => {
    expect(haversineM({ lat: 24, lng: 67 }, { lat: 25, lng: 67 })).toBeCloseTo(111_195, -2);
  });
});

describe('sliceShape', () => {
  const line = [
    { lat: 24.0, lng: 67.0 },
    { lat: 24.01, lng: 67.0 },
    { lat: 24.02, lng: 67.0 },
    { lat: 24.03, lng: 67.0 },
  ];

  it('starts and ends near the given stops', () => {
    const from = { lat: 24.005, lng: 67.0001 };
    const to = { lat: 24.025, lng: 66.9999 };
    const slice = sliceShape(line, from, to);
    expect(haversineM(slice[0], from)).toBeLessThan(20);
    expect(haversineM(slice[slice.length - 1], to)).toBeLessThan(20);
    // keeps the vertices in between, and only those
    expect(slice).toContainEqual(line[1]);
    expect(slice).toContainEqual(line[2]);
    expect(slice).not.toContainEqual(line[0]);
    expect(slice).not.toContainEqual(line[3]);
  });

  it('slices in travel order on a shape that doubles back', () => {
    const outAndBack = [...line, ...[...line].reverse().slice(1)];
    // Board at the far end, get off near the start on the way back.
    const slice = sliceShape(outAndBack, line[3], { lat: 24.012, lng: 67.0 });
    expect(slice[0]).toEqual(line[3]);
    expect(slice[slice.length - 1].lat).toBeCloseTo(24.012, 5);
  });
});
