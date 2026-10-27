import { z } from 'zod';
import { validateGeometry, validatePosition, type Geometry, type Position } from './spatial';

// Homogeneous JSON Schema arrays are supported by more model providers than tuple items.
const position = z
  .array(z.number())
  .length(2)
  .transform((value, ctx): Position => {
    try {
      validatePosition(value);
    } catch (error) {
      ctx.addIssue({ code: 'custom', message: (error as Error).message });
    }
    return value as Position;
  })
  .describe('WGS84 [longitude, latitude], longitude -180..180, latitude -90..90');
export const geometrySchema = z
  .discriminatedUnion('type', [
    z.object({ type: z.literal('Point'), coordinates: position }),
    z.object({ type: z.literal('LineString'), coordinates: z.array(position).min(2).max(2000) }),
    z.object({
      type: z.literal('Polygon'),
      coordinates: z.array(z.array(position).min(4).max(2000)).min(1).max(100),
    }),
  ])
  .superRefine((value, ctx) => {
    try {
      validateGeometry(value);
    } catch (error) {
      ctx.addIssue({ code: 'custom', message: (error as Error).message });
    }
  });
const mapId = z.string().max(200).optional();
const id = z.string().min(1).max(200);
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const mapSchemas = {
  mapInspect: z.object({
    mapId,
    action: z.enum([
      'maps',
      'context',
      'annotations',
      'interaction',
      'native_list',
      'native_get',
      'runtime_probe',
    ]),
    id: id.optional(),
  }),
  mapConvert: z.object({
    mapId,
    direction: z.enum(['pixel_to_geo', 'geo_to_pixel']),
    revision: z.string().min(1),
    coordinate: position.optional(),
    pixel: z.object({ x: z.number(), y: z.number() }).optional(),
    space: z.enum(['map', 'viewport', 'screenshot']).default('map'),
    frame: z
      .object({
        mapId: id,
        revision: z.string(),
        width: z.number().positive(),
        height: z.number().positive(),
        viewportWidth: z.number().positive(),
        viewportHeight: z.number().positive(),
      })
      .optional(),
  }),
  mapAnnotate: z.object({
    mapId,
    action: z.enum(['upsert', 'remove', 'clear']),
    id: id.optional(),
    geometry: geometrySchema.optional(),
    kind: z.enum(['shape', 'arrow', 'label']).default('shape'),
    label: z.string().max(300).default(''),
    color: color.default('#e53935'),
  }),
  mapInteract: z
    .object({
      mapId,
      action: z.enum(['request', 'cancel']),
      shape: z.enum(['Point', 'LineString', 'Polygon', 'Rectangle']).default('Point'),
      message: z.string().max(300).default('Choose a location or draw a shape, then Confirm.'),
      layerId: id.optional(),
      interactionId: id.optional(),
    })
    .strict(),
  mapGeometry: z.object({
    mapId,
    action: z.enum(['create', 'update', 'delete']),
    id: id.optional(),
    geometry: geometrySchema.optional(),
    name: z.string().max(100).default('Geometry'),
    color: color.default('#e53935'),
  }),
  mapScreenshot: z.object({ mapId }),
};
export type MapToolName = keyof typeof mapSchemas;
export const mapDescriptions: Record<MapToolName, string> = {
  mapInspect:
    'Read connected GEE map context (WGS84 bounds, center, zoom, CSS-pixel rect and revision), Agent annotations, interaction status, or Agent-owned native drawing layers. Use maps to discover map IDs when multiple maps are connected. interaction/native_get require id. runtime_probe is a read-only diagnostic of page object capabilities without requiring the setup bridge; it does not prove a working integration. If MAP_BRIDGE_REQUIRED, ask the user to connect in Settings; never replace or run their code automatically.',
  mapConvert:
    'Convert WGS84 [longitude,latitude] and map/viewport/screenshot pixels. Requires current context revision; screenshot pixels require the frame returned by mapScreenshot. Refresh after pan/zoom/resize; never assume screenshot pixels equal CSS pixels.',
  mapAnnotate:
    'Create/update an extension-owned geographic overlay (point, line, polygon/rectangle, text label or arrow), or remove/clear Agent overlays only. upsert requires ea-prefixed id and GeoJSON geometry. Not a native GEE analytical geometry.',
  mapInteract:
    'Ask the user to draw with GEE native drawing tools. Optional layerId edits an existing Agent-owned native layer using a temporary draft. Returns pending interaction id; check mapInspect interaction after user confirms/cancels. Confirmed result includes GeoJSON and layerId of the already-saved native layer; do not create a duplicate. Cancel discards only the draft and requires interactionId. Never claim completion while pending.',
  mapGeometry:
    'Create/update/delete a real GEE drawingTools geometry. Only Agent-owned layers can be changed. create/update require GeoJSON; update/delete require layer id. Does not modify source code or remove user layers. After timeout inspect native_list/native_get before retrying.',
  mapScreenshot:
    'Capture the active GEE viewport with its map context and exact screenshot-to-CSS frame. Fails if tab/view changes during capture. Use frame for pixel conversion, not generic screenshot coordinates.',
};
export const requireGeometry = (value: Geometry | undefined): Geometry => {
  if (!value) throw new Error('geometry is required for this action.');
  validateGeometry(value);
  return value;
};
export const requireId = (value?: string): string => {
  if (!value) throw new Error('id is required for this action.');
  return value;
};
