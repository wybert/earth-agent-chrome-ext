import { mapSchemas, MapToolName, requireGeometry, requireId } from '../../lib/map/contracts';
import { assertRevision, geoToMapPixel, pixelToGeo } from '../../lib/map/spatial';
import { GeeMapAdapter } from './gee-adapter';
import { MapOverlay } from './overlay';

const overlays = new Map<string, MapOverlay>();
const pendingNative = new Set<string>();
function prune() {
  for (const [id, overlay] of overlays)
    if (!overlay.adapter.connected) {
      overlay.dispose();
      overlays.delete(id);
    }
}
export function disposeMapRuntime() {
  for (const overlay of overlays.values()) overlay.dispose();
  overlays.clear();
}
window.addEventListener('pagehide', disposeMapRuntime);

export async function dispatchMapAction(name: MapToolName, input: unknown): Promise<unknown> {
  if (!Object.prototype.hasOwnProperty.call(mapSchemas, name)) throw new Error('Unknown map tool.');
  const args = mapSchemas[name].parse(input);
  prune();
  if (name === 'mapInspect' && 'action' in args && args.action === 'maps')
    return GeeMapAdapter.list();
  const adapter = GeeMapAdapter.discover(args.mapId);
  const view = adapter.readView();
  const overlay = () => {
    let instance = overlays.get(view.mapId);
    if (!instance) {
      instance = new MapOverlay(adapter);
      overlays.set(view.mapId, instance);
    }
    return instance;
  };
  const native = async (action: string, payload: unknown) => {
    if (pendingNative.has(view.mapId))
      throw new Error('A native map operation is in progress. Retry after it finishes.');
    pendingNative.add(view.mapId);
    try {
      return await adapter.native(action, payload);
    } finally {
      pendingNative.delete(view.mapId);
    }
  };
  switch (name) {
    case 'mapInspect': {
      const a = mapSchemas.mapInspect.parse(args);
      if (a.action === 'context') return view;
      if (a.action === 'annotations')
        return Array.from(overlays.get(view.mapId)?.annotations.values() || []);
      if (a.action === 'interaction') return native('interaction_get', { id: requireId(a.id) });
      return native(a.action, a.action === 'native_get' ? { id: requireId(a.id) } : {});
    }
    case 'mapConvert': {
      const a = mapSchemas.mapConvert.parse(args);
      assertRevision(view, a.revision);
      if (a.direction === 'pixel_to_geo') {
        if (!a.pixel) throw new Error('pixel is required.');
        return {
          coordinate: pixelToGeo(view, a.pixel, a.space, a.revision, a.frame),
          revision: view.revision,
        };
      }
      if (!a.coordinate) throw new Error('coordinate is required.');
      const pixel = geoToMapPixel(view, a.coordinate);
      if (a.space !== 'map') {
        pixel.x += view.rect.x;
        pixel.y += view.rect.y;
      }
      if (a.space === 'screenshot') {
        // Validate frame association and dimensions without requiring the requested point to be visible.
        pixelToGeo(view, { x: view.rect.width / 2, y: view.rect.height / 2 }, 'map', a.revision);
        const f = a.frame;
        if (
          !f ||
          f.mapId !== view.mapId ||
          f.revision !== view.revision ||
          f.viewportWidth !== view.viewport.width ||
          f.viewportHeight !== view.viewport.height
        )
          throw new Error('Screenshot frame does not match current map view.');
        pixel.x *= f.width / f.viewportWidth;
        pixel.y *= f.height / f.viewportHeight;
      }
      return { pixel, space: a.space, revision: view.revision };
    }
    case 'mapAnnotate': {
      const a = mapSchemas.mapAnnotate.parse(args);
      if (a.action === 'upsert')
        return overlay().upsert({
          id: requireId(a.id),
          geometry: requireGeometry(a.geometry),
          kind: a.kind,
          label: a.label,
          color: a.color,
        });
      overlay().remove(a.action === 'remove' ? requireId(a.id) : undefined);
      return { removed: a.action === 'clear' ? 'all Agent overlays' : a.id };
    }
    case 'mapInteract': {
      const a = mapSchemas.mapInteract.parse(args);
      if (a.action === 'request') return native('interaction_request', a);
      return native('interaction_cancel', { id: requireId(a.interactionId) });
    }
    case 'mapGeometry': {
      const a = mapSchemas.mapGeometry.parse(args);
      return native(`native_${a.action}`, {
        ...a,
        ...(a.action !== 'create' ? { id: requireId(a.id) } : {}),
        ...(a.action !== 'delete' ? { geometry: requireGeometry(a.geometry) } : {}),
      });
    }
    default:
      throw new Error('This map operation must run in the extension background.');
  }
}
