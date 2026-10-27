/** Coordinates are WGS84 [longitude, latitude]. Pixels are CSS pixels unless stated. */
export type Position = [number, number];
export type Pixel = { x: number; y: number };
export type Geometry =
  | { type: 'Point'; coordinates: Position }
  | { type: 'LineString'; coordinates: Position[] }
  | { type: 'Polygon'; coordinates: Position[][] };

export interface MapView {
  mapId: string;
  revision: string;
  capturedAt: number;
  rect: { x: number; y: number; width: number; height: number };
  viewport: { width: number; height: number; devicePixelRatio: number };
  center: Position;
  zoom: number;
  bounds: { west: number; south: number; east: number; north: number };
  projection: 'EPSG:3857';
  heading: number;
  tilt: number;
}

export interface ScreenshotFrame {
  mapId: string;
  revision: string;
  width: number;
  height: number;
  /** Browser viewport captured; not the map container and not device pixels. */
  viewportWidth: number;
  viewportHeight: number;
}

const MAX_LAT = 85.0511287798066;
export const wrapLongitude = (lng: number) => ((((lng + 180) % 360) + 360) % 360) - 180;

export function validatePosition(value: unknown): asserts value is Position {
  if (
    !Array.isArray(value) ||
    value.length !== 2 ||
    !value.every(Number.isFinite) ||
    value[0] < -180 ||
    value[0] > 180 ||
    value[1] < -90 ||
    value[1] > 90
  ) {
    throw new Error('Expected WGS84 [longitude, latitude] within [-180,180] and [-90,90].');
  }
}

export function validateGeometry(value: unknown): asserts value is Geometry {
  const geometry = value as Geometry;
  if (!geometry || typeof geometry !== 'object') throw new Error('Expected a GeoJSON geometry.');
  let count = 0;
  const point = (p: unknown) => {
    validatePosition(p);
    if (++count > 2000) throw new Error('Geometry exceeds 2000 vertices.');
  };
  if (geometry.type === 'Point') point(geometry.coordinates);
  else if (geometry.type === 'LineString') {
    if (!Array.isArray(geometry.coordinates) || geometry.coordinates.length < 2)
      throw new Error('A line requires at least two vertices.');
    geometry.coordinates.forEach(point);
  } else if (geometry.type === 'Polygon') {
    if (!Array.isArray(geometry.coordinates) || !geometry.coordinates.length)
      throw new Error('A polygon requires a ring.');
    geometry.coordinates.forEach((ring) => {
      if (!Array.isArray(ring) || ring.length < 4)
        throw new Error('A polygon ring requires three vertices and closure.');
      ring.forEach(point);
      if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])
        throw new Error('Polygon rings must be closed.');
      if (new Set(ring.map((p) => p.join(','))).size < 3)
        throw new Error('A polygon requires three distinct vertices.');
      let area = 0;
      let longitude = ring[0][0];
      for (let i = 1; i < ring.length; i++) {
        const next = longitude + wrapLongitude(ring[i][0] - ring[i - 1][0]);
        area += longitude * ring[i][1] - next * ring[i - 1][1];
        longitude = next;
      }
      if (Math.abs(area) < 1e-12) throw new Error('A polygon ring must enclose a non-zero area.');
    });
  } else throw new Error('Only Point, LineString and Polygon geometries are supported.');
}

function mercatorY(lat: number): number {
  if (Math.abs(lat) > MAX_LAT) throw new Error('Latitude is outside the Web Mercator map range.');
  const sin = Math.sin((lat * Math.PI) / 180);
  return (1 - Math.log((1 + sin) / (1 - sin)) / (2 * Math.PI)) / 2;
}

function validateView(view: MapView) {
  validatePosition(view.center);
  if (view.projection !== 'EPSG:3857' || view.heading !== 0 || view.tilt !== 0)
    throw new Error('Only an unrotated, untilted Web Mercator map is supported.');
  if (
    ![view.rect.x, view.rect.y, view.rect.width, view.rect.height, view.zoom].every(
      Number.isFinite
    ) ||
    view.rect.width <= 0 ||
    view.rect.height <= 0 ||
    view.zoom < 0 ||
    view.zoom > 30
  )
    throw new Error('Map view is unavailable or invalid.');
}

export function assertRevision(view: MapView, revision: string) {
  if (revision !== view.revision)
    throw new Error(
      'STALE_MAP_VIEW: refresh map context/screenshot before using pixel coordinates.'
    );
}

/** Uses Google's 256 CSS-pixel world at zoom 0; never linear-interpolates latitude. */
export function geoToMapPixel(view: MapView, coordinate: Position): Pixel {
  validateView(view);
  validatePosition(coordinate);
  const world = 256 * 2 ** view.zoom;
  return {
    x: view.rect.width / 2 + (wrapLongitude(coordinate[0] - view.center[0]) / 360) * world,
    y: view.rect.height / 2 + (mercatorY(coordinate[1]) - mercatorY(view.center[1])) * world,
  };
}

export function mapPixelToGeo(view: MapView, pixel: Pixel): Position {
  validateView(view);
  if (![pixel.x, pixel.y].every(Number.isFinite))
    throw new Error('Pixel coordinates must be finite.');
  if (pixel.x < 0 || pixel.x > view.rect.width || pixel.y < 0 || pixel.y > view.rect.height)
    throw new Error('Pixel is outside the map container.');
  const world = 256 * 2 ** view.zoom;
  const y = mercatorY(view.center[1]) + (pixel.y - view.rect.height / 2) / world;
  if (y < 0 || y > 1) throw new Error('Pixel is outside the projected world.');
  return [
    wrapLongitude(view.center[0] + ((pixel.x - view.rect.width / 2) / world) * 360),
    (Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180) / Math.PI,
  ];
}

/** Keep connected vertices in the same world copy when crossing the antimeridian. */
export function projectPath(view: MapView, coordinates: Position[]): Pixel[] {
  const world = 256 * 2 ** view.zoom;
  const pixels: Pixel[] = [];
  for (const coordinate of coordinates) {
    const pixel = geoToMapPixel(view, coordinate);
    const previous = pixels[pixels.length - 1];
    if (previous) pixel.x += Math.round((previous.x - pixel.x) / world) * world;
    pixels.push(pixel);
  }
  return pixels;
}

export function pixelToGeo(
  view: MapView,
  pixel: Pixel,
  space: 'map' | 'viewport' | 'screenshot',
  revision: string,
  frame?: ScreenshotFrame
): Position {
  assertRevision(view, revision);
  let p = { ...pixel };
  if (space === 'screenshot') {
    if (!frame || frame.mapId !== view.mapId || frame.revision !== view.revision)
      throw new Error('Screenshot does not belong to the current map view.');
    if (
      ![frame.width, frame.height, frame.viewportWidth, frame.viewportHeight].every(
        (n) => Number.isFinite(n) && n > 0
      ) ||
      frame.viewportWidth !== view.viewport.width ||
      frame.viewportHeight !== view.viewport.height
    )
      throw new Error('Screenshot dimensions do not match the current viewport.');
    p = {
      x: (p.x * frame.viewportWidth) / frame.width,
      y: (p.y * frame.viewportHeight) / frame.height,
    };
  }
  if (space !== 'map') p = { x: p.x - view.rect.x, y: p.y - view.rect.y };
  return mapPixelToGeo(view, p);
}

export function rectangleGeometry(a: Position, b: Position): Geometry {
  validatePosition(a);
  validatePosition(b);
  const geometry: Geometry = {
    type: 'Polygon',
    coordinates: [[a, [b[0], a[1]], b, [a[0], b[1]], a]],
  };
  validateGeometry(geometry);
  return geometry;
}
