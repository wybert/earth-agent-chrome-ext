import {
  MapView,
  geoToMapPixel,
  mapPixelToGeo,
  pixelToGeo,
  projectPath,
  rectangleGeometry,
  validateGeometry,
} from './spatial';

const view: MapView = {
  mapId: 'map-1',
  revision: 'r1',
  capturedAt: 0,
  rect: { x: 100, y: 200, width: 800, height: 500 },
  viewport: { width: 1200, height: 900, devicePixelRatio: 2 },
  center: [179, 45],
  zoom: 4,
  bounds: { west: 0, south: 0, east: 0, north: 0 },
  projection: 'EPSG:3857',
  tilt: 0,
  heading: 0,
};
it.each([
  [179, 45],
  [-179, 46],
  [175, 48],
])('round trips real geographic positions %s,%s across the date line', (lng, lat) => {
  const result = mapPixelToGeo(view, geoToMapPixel(view, [lng, lat]));
  expect(result[0]).toBeCloseTo(lng, 9);
  expect(result[1]).toBeCloseTo(lat, 9);
});
it('maps resized screenshot pixels through viewport and map offsets, independent of DPR', () => {
  expect(
    pixelToGeo(view, { x: 250, y: 225 }, 'screenshot', 'r1', {
      mapId: 'map-1',
      revision: 'r1',
      width: 600,
      height: 450,
      viewportWidth: 1200,
      viewportHeight: 900,
    })
  ).toEqual([179, 45]);
});
it('rejects stale frames, pixels outside the map, unsupported views and polar coordinates', () => {
  expect(() => pixelToGeo(view, { x: 0, y: 0 }, 'map', 'old')).toThrow('STALE');
  expect(() => mapPixelToGeo(view, { x: -1, y: 0 })).toThrow('outside');
  expect(() => geoToMapPixel({ ...view, tilt: 45 }, [179, 45])).toThrow('untilted');
  expect(() => geoToMapPixel(view, [179, 90])).toThrow('Mercator');
});
it('validates geometry bounds, closure and cardinality', () => {
  expect(() => validateGeometry(rectangleGeometry([1, 1], [2, 2]))).not.toThrow();
  expect(() => validateGeometry({ type: 'Point', coordinates: [190, 1] })).toThrow('WGS84');
  expect(() =>
    validateGeometry({
      type: 'Polygon',
      coordinates: [
        [
          [1, 1],
          [2, 1],
          [2, 2],
          [1, 2],
        ],
      ],
    })
  ).toThrow('closed');
  expect(() => rectangleGeometry([1, 1], [1, 1])).toThrow('distinct');
});
it('keeps antimeridian paths short and rejects collinear polygons', () => {
  const pixels = projectPath({ ...view, center: [0, 0] }, [
    [179, 0],
    [-179, 0],
  ]);
  expect(Math.abs(pixels[1].x - pixels[0].x)).toBeLessThan(30);
  expect(() =>
    validateGeometry({
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [1, 1],
          [2, 2],
          [0, 0],
        ],
      ],
    })
  ).toThrow('area');
});
