import type { ToolDefinition } from './tools.js';

const mapId = {
  type: 'string',
  description: 'Connected map ID; required when multiple maps are connected.',
};
const id = { type: 'string' };
const position = {
  type: 'array',
  items: { type: 'number' },
  minItems: 2,
  maxItems: 2,
  description: 'WGS84 [longitude, latitude]',
};
const geometry = {
  oneOf: [
    {
      type: 'object',
      properties: { type: { const: 'Point' }, coordinates: position },
      required: ['type', 'coordinates'],
    },
    {
      type: 'object',
      properties: {
        type: { const: 'LineString' },
        coordinates: { type: 'array', items: position, minItems: 2, maxItems: 2000 },
      },
      required: ['type', 'coordinates'],
    },
    {
      type: 'object',
      properties: {
        type: { const: 'Polygon' },
        coordinates: {
          type: 'array',
          items: { type: 'array', items: position, minItems: 4 },
          minItems: 1,
        },
      },
      required: ['type', 'coordinates'],
    },
  ],
};
const color = { type: 'string', pattern: '^#[0-9a-fA-F]{6}$', default: '#e53935' };
export const mapTools: Record<string, ToolDefinition> = {
  map_inspect: {
    description:
      'Read connected GEE map context (geographic bounds, center, zoom, CSS rect, revision), Agent annotations, interaction status or Agent-owned native layers. Use maps to discover IDs when multiple maps are connected. interaction/native_get require id. runtime_probe performs bounded, read-only MAIN-world capability discovery without requiring the setup bridge; candidates are not verified working APIs. If MAP_BRIDGE_REQUIRED ask user to connect via extension Settings; never replace or run their code automatically.',
    inputSchema: {
      type: 'object',
      properties: {
        mapId,
        action: {
          enum: [
            'maps',
            'context',
            'annotations',
            'interaction',
            'native_list',
            'native_get',
            'runtime_probe',
          ],
          type: 'string',
        },
        id,
      },
      required: ['action'],
    },
  },
  map_convert: {
    description:
      'Convert map/viewport/screenshot pixels and WGS84 coordinates. Requires current map revision. Screenshot conversion requires the frame from map_screenshot; never guess DPR. Refresh after map pan/zoom/resize. Pixel-to-geo requires pixel; geo-to-pixel requires coordinate.',
    inputSchema: {
      type: 'object',
      properties: {
        mapId,
        direction: { type: 'string', enum: ['pixel_to_geo', 'geo_to_pixel'] },
        revision: id,
        coordinate: position,
        pixel: {
          type: 'object',
          properties: { x: { type: 'number' }, y: { type: 'number' } },
          required: ['x', 'y'],
        },
        space: { type: 'string', enum: ['map', 'viewport', 'screenshot'], default: 'map' },
        frame: {
          type: 'object',
          properties: {
            mapId: id,
            revision: id,
            width: { type: 'number' },
            height: { type: 'number' },
            viewportWidth: { type: 'number' },
            viewportHeight: { type: 'number' },
          },
          required: ['mapId', 'revision', 'width', 'height', 'viewportWidth', 'viewportHeight'],
        },
      },
      required: ['direction', 'revision'],
    },
  },
  map_annotate: {
    description:
      'Manage extension-owned map overlays, not native GEE geometries. upsert requires ea-prefixed id and GeoJSON geometry; remove requires id; clear removes only Agent overlays. Supports shape, text label and line arrow. Rectangle is a closed Polygon.',
    inputSchema: {
      type: 'object',
      properties: {
        mapId,
        action: { type: 'string', enum: ['upsert', 'remove', 'clear'] },
        id,
        geometry,
        color,
        kind: { type: 'string', enum: ['shape', 'arrow', 'label'], default: 'shape' },
        label: { type: 'string', maxLength: 300, default: '' },
      },
      required: ['action'],
    },
  },
  map_interact: {
    description:
      'Request drawing with GEE native tools. Optional layerId edits an Agent-owned native layer through a temporary draft. Returns pending interaction id. Check map_inspect interaction after user confirms/cancels. Confirmed GeoJSON and layerId refer to the already-saved native layer; do not create a duplicate. Cancel discards only the draft and requires interactionId. Never claim pending work is complete.',
    inputSchema: {
      type: 'object',
      properties: {
        mapId,
        action: { type: 'string', enum: ['request', 'cancel'] },
        shape: {
          type: 'string',
          enum: ['Point', 'LineString', 'Polygon', 'Rectangle'],
          default: 'Point',
        },
        message: { type: 'string', maxLength: 300 },
        layerId: id,
        interactionId: id,
      },
      required: ['action'],
    },
  },
  map_geometry: {
    description:
      'Create/update/delete real GEE drawingTools geometries. Only Agent-owned layers can be changed; user layers and source code are preserved. create/update require GeoJSON; update/delete require id. On timeout inspect native_list/native_get before retrying because a mutation may have executed.',
    inputSchema: {
      type: 'object',
      properties: {
        mapId,
        action: { type: 'string', enum: ['create', 'update', 'delete'] },
        id,
        geometry,
        name: { type: 'string', maxLength: 100, default: 'Geometry' },
        color,
      },
      required: ['action'],
    },
  },
  map_screenshot: {
    description:
      'Capture active GEE viewport with connected map context and exact screenshot coordinate frame. Fails if tab/map changes during capture. Use returned frame for screenshot-to-geography conversion.',
    inputSchema: { type: 'object', properties: { mapId } },
  },
};
