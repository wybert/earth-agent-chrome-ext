import { dispatchMapAction, disposeMapRuntime } from './runtime';
import { installGeeMapBridge, getGeeMapBridgeSource } from '../../lib/map/gee-bridge-source';

/** Contract fixture, NOT a replacement for testing Google's real editor. */
function fixture() {
  const container = document.createElement('div');
  container.className = 'ui-map';
  container.getBoundingClientRect = () => ({
    x: 100,
    y: 100,
    width: 800,
    height: 500,
    left: 100,
    top: 100,
    right: 900,
    bottom: 600,
    toJSON() {},
  });
  document.body.append(container);
  const geometries: any[] = [{ userOwned: true }];
  let boundsListener = () => {};
  let center = [0, 0];
  let deferred = false;
  const evaluations: Array<() => void> = [];
  const ee = {
    Geometry: (geo: any) => ({
      evaluate: (callback: any) => {
        if (deferred) evaluations.push(() => callback(geo, null));
        else callback(geo, null);
      },
    }),
  };
  let selected: any = geometries[0];
  let shown = false;
  let shape = 'line';
  const listeners = new Map<string, { kind: string; cb: any }>();
  let sequence = 0;
  const listen = (kind: string, cb: any) => {
    const id = String(++sequence);
    listeners.set(id, { kind, cb });
    return id;
  };
  const emit = (kind: string, layer: any) => {
    for (const listener of listeners.values())
      if (listener.kind === kind) listener.cb(null, layer, tools);
  };
  const tools = {
    layers: () => ({
      length: () => geometries.length,
      get: (i: number) => geometries[i],
      remove: (layer: any) => {
        const index = geometries.indexOf(layer);
        if (index >= 0) geometries.splice(index, 1);
      },
    }),
    setShown: (value: boolean) => {
      shown = value;
    },
    getShown: () => shown,
    getShape: () => shape,
    setShape: jest.fn((value: string) => {
      shape = value;
    }),
    getSelected: () => selected,
    setSelected: (layer: any) => {
      selected = layer;
    },
    edit: jest.fn(),
    draw: jest.fn(),
    stop: jest.fn(),
    onDraw: (cb: any) => listen('draw', cb),
    onEdit: (cb: any) => listen('edit', cb),
    onErase: (cb: any) => listen('erase', cb),
    unlisten: (id: string) => listeners.delete(id),
    addLayer: (values: any[], name: string) => {
      // Real GEE rejects punctuation/spaces when drawing layers are linked to imports.
      if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(name))
        throw new Error('Names must be alphanumeric and start with a letter.');
      let objects = values;
      const layer = {
        getName: () => name,
        getEeObject: () => objects[0],
        geometries: () => ({
          length: () => objects.length,
          get: (i: number) => objects[i],
          reset: (next: any[]) => {
            objects = next;
          },
        }),
      };
      geometries.push(layer);
      return layer;
    },
  };
  const map = {
    add: (panel: any) => container.append(panel.element),
    remove: (panel: any) => panel.element.remove(),
    getBounds: () => [-35, -20, 35, 20],
    getZoom: () => 4,
    getCenter: () => ({
      evaluate: (callback: any) => callback({ type: 'Point', coordinates: center }, null),
    }),
    onChangeBounds: (callback: any) => {
      boundsListener = callback;
      return 'listener';
    },
    unlisten: jest.fn(),
    drawingTools: () => tools,
  };
  const ui = {
    Textbox: ({ placeholder, disabled }: any) => {
      const element = document.createElement('input');
      element.placeholder = placeholder;
      element.disabled = !!disabled;
      return {
        element,
        style: () => ({ set: () => {} }),
        setValue: (value: string) => {
          element.value = value;
        },
        onChange: (cb: any) => element.addEventListener('change', () => cb(element.value)),
      };
    },
    Panel: () => {
      const element = document.createElement('div');
      element.className = 'ui-panel';
      return {
        element,
        add: (widget: any) => element.append(widget.element),
        remove: (widget: any) => widget.element.remove(),
      };
    },
    Label: (text: string) => {
      const element = document.createElement('span');
      element.textContent = text;
      return {
        element,
        setValue: (value: string) => {
          element.textContent = value;
        },
      };
    },
    Button: (text: string, click: () => void) => {
      const element = document.createElement('button');
      element.textContent = text;
      element.onclick = click;
      return { element };
    },
  };
  installGeeMapBridge(map, ui, ee);
  return {
    container,
    geometries,
    tools,
    listeners,
    defer: () => {
      deferred = true;
    },
    flush: () => {
      deferred = false;
      evaluations.splice(0).forEach((cb) => cb());
    },
    change: (layer: any, geometry: any, kind = 'edit') => {
      layer.geometries().reset(geometry ? [ee.Geometry(geometry)] : []);
      emit(kind, layer);
    },
    pan: () => {
      center = [10, 5];
      boundsListener();
    },
  };
}

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  disposeMapRuntime();
  document.body.replaceChildren();
  jest.useRealTimers();
});
async function native(action: string, args: object = {}) {
  const promise = dispatchMapAction('mapGeometry', { action, ...args });
  await jest.advanceTimersByTimeAsync(35);
  return promise as Promise<any>;
}
function svg() {
  return document.querySelector('[data-earth-agent-map]')!.shadowRoot!.querySelector('svg')!;
}
function button(label: string) {
  return Array.from(document.querySelectorAll('button')).find((b) => b.textContent === label)!;
}
async function interact(args: object) {
  const promise = dispatchMapAction('mapInteract', args);
  await jest.advanceTimersByTimeAsync(35);
  return promise as Promise<any>;
}
async function inspect(action: string, id?: string) {
  const promise = dispatchMapAction('mapInspect', { action, id });
  await jest.advanceTimersByTimeAsync(35);
  return promise as Promise<any>;
}

it('reports missing and ambiguous map connections without guessing', async () => {
  await expect(dispatchMapAction('mapInspect', { action: 'context' })).rejects.toThrow(
    'MAP_BRIDGE_REQUIRED'
  );
  fixture();
  fixture();
  await expect(dispatchMapAction('mapInspect', { action: 'context' })).rejects.toThrow('AMBIGUOUS');
  const maps = (await dispatchMapAction('mapInspect', { action: 'maps' })) as Array<{
    mapId: string;
  }>;
  expect(maps).toHaveLength(2);
  expect(
    await dispatchMapAction('mapInspect', { action: 'context', mapId: maps[0].mapId })
  ).toMatchObject({ mapId: maps[0].mapId });
});
it('shares map context/conversion and rejects stale revisions after pan', async () => {
  const f = fixture();
  const view: any = await dispatchMapAction('mapInspect', { action: 'context' });
  expect(
    await dispatchMapAction('mapConvert', {
      direction: 'pixel_to_geo',
      revision: view.revision,
      space: 'viewport',
      pixel: { x: 500, y: 350 },
    })
  ).toMatchObject({ coordinate: [0, 0] });
  f.pan();
  await expect(
    dispatchMapAction('mapConvert', {
      direction: 'geo_to_pixel',
      revision: view.revision,
      coordinate: [0, 0],
    })
  ).rejects.toThrow('STALE');
});
it('draws with native tools, retains the confirmed layer, and preserves user layers', async () => {
  const f = fixture();
  const request: any = await interact({
    action: 'request',
    shape: 'Polygon',
  });
  expect(f.tools.setShape).toHaveBeenLastCalledWith('polygon');
  expect(document.querySelector('[data-earth-agent-map]')).toBeNull();
  const polygon = {
    type: 'Polygon',
    coordinates: [
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 0],
      ],
    ],
  };
  f.change(f.tools.getSelected(), polygon, 'draw');
  expect(f.tools.edit).toHaveBeenCalled();
  button('Confirm').click();
  const result = await inspect('interaction', request.id);
  expect(result.status).toBe('confirmed');
  expect(result.geometry.coordinates[0]).toHaveLength(4);
  expect((await inspect('native_get', result.layerId)).geometry).toEqual(polygon);
  expect(f.geometries).toHaveLength(2);
  expect(f.tools.getSelected()).toEqual({ userOwned: true });
  expect(f.listeners.size).toBe(0);
  const updated = await native('update', {
    id: result.layerId,
    geometry: { type: 'Point', coordinates: [1, 2] },
  });
  expect(updated.geometry.coordinates).toEqual([1, 2]);
  await native('delete', { id: result.layerId });
  expect(f.geometries).toEqual([{ userOwned: true }]);
});
it('rejects missing geometry, nonexistent ids and concurrent native calls', async () => {
  fixture();
  await expect(dispatchMapAction('mapGeometry', { action: 'create' })).rejects.toThrow('geometry');
  const invalid = native('delete', { id: 'user-layer' });
  const invalidCheck = expect(invalid).rejects.toThrow('Unknown Agent');
  await invalidCheck;
  const first = dispatchMapAction('mapGeometry', {
    action: 'create',
    geometry: { type: 'Point', coordinates: [1, 2] },
  });
  await expect(dispatchMapAction('mapInspect', { action: 'native_list' })).rejects.toThrow(
    'in progress'
  );
  await jest.advanceTimersByTimeAsync(35);
  await first;
});
it('empty drafts stay pending, Cancel removes only the draft, and labels are not HTML', async () => {
  const f = fixture();
  await expect(
    dispatchMapAction('mapAnnotate', {
      action: 'upsert',
      id: 'ea-pole',
      geometry: { type: 'Point', coordinates: [0, 90] },
    })
  ).rejects.toThrow('Mercator');
  const result: any = await interact({
    action: 'request',
    shape: 'Polygon',
  });
  button('Confirm').click();
  expect((await inspect('interaction', result.id)).status).toBe('pending');
  button('Cancel').click();
  expect((await inspect('interaction', result.id)).status).toBe('cancelled');
  expect(f.geometries).toEqual([{ userOwned: true }]);
  await dispatchMapAction('mapAnnotate', {
    action: 'upsert',
    id: 'ea-label',
    geometry: { type: 'Point', coordinates: [0, 0] },
    label: '<img onerror="alert(1)">',
  });
  expect(svg().querySelector('img')).toBeNull();
  expect(svg().querySelector('text')!.textContent).toContain('<img');
  await dispatchMapAction('mapAnnotate', { action: 'clear' });
  expect(await dispatchMapAction('mapInspect', { action: 'annotations' })).toEqual([]);
});
it('generates valid standalone JavaScript without TypeScript or module dependencies', () => {
  const code = getGeeMapBridgeSource();
  expect(() => new Function('Map', 'ui', 'ee', code)).not.toThrow();
  expect(code).not.toMatch(/require\(|__webpack|import\s/);
});
it.each([
  ['Point', 'point', { type: 'Point', coordinates: [0, 0] }],
  [
    'LineString',
    'line',
    {
      type: 'LineString',
      coordinates: [
        [0, 0],
        [1, 1],
      ],
    },
  ],
  [
    'Polygon',
    'polygon',
    {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 0],
        ],
      ],
    },
  ],
  [
    'Rectangle',
    'rectangle',
    {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
          [0, 0],
        ],
      ],
    },
  ],
])(
  'confirms %s as a native layer without an overlay or duplicate',
  async (shape, nativeShape, geometry) => {
    const f = fixture();
    const request = await interact({ action: 'request', shape });
    expect(f.tools.setShape).toHaveBeenLastCalledWith(nativeShape);
    expect(f.tools.draw).toHaveBeenCalledTimes(1);
    expect((await inspect('native_list')).ids).toEqual([]);
    f.change(f.tools.getSelected(), geometry, 'draw');
    button('Confirm').click();
    expect(await inspect('interaction', request.id)).toMatchObject({
      status: 'confirmed',
      geometry,
    });
    expect((await inspect('native_list')).ids).toEqual([request.layerId]);
    expect(f.geometries).toHaveLength(2);
    expect(document.querySelector('[data-earth-agent-map]')).toBeNull();
  }
);
it('ignores late evaluation after cancellation and cleans listeners on disconnect', async () => {
  const f = fixture();
  const request = await interact({ action: 'request', shape: 'Point' });
  f.change(f.tools.getSelected(), { type: 'Point', coordinates: [0, 0] }, 'draw');
  f.defer();
  button('Confirm').click();
  await interact({ action: 'cancel', interactionId: request.id });
  f.flush();
  expect((await inspect('interaction', request.id)).status).toBe('cancelled');
  expect(f.geometries).toEqual([{ userOwned: true }]);
  await interact({ action: 'request', shape: 'Rectangle' });
  expect(f.tools.setShape).toHaveBeenLastCalledWith('rectangle');
  button('Disconnect map link').click();
  expect(f.listeners.size).toBe(0);
  expect(f.geometries).toEqual([{ userOwned: true }]);
});
it('rejects stale draft readback and original-layer conflicts without overwriting', async () => {
  const f = fixture();
  const created = await native('create', { geometry: { type: 'Point', coordinates: [0, 0] } });
  const original = f.geometries[1];
  const edit = await interact({ action: 'request', layerId: created.id });
  const draft = f.tools.getSelected();
  f.defer();
  button('Confirm').click();
  f.change(draft, { type: 'Point', coordinates: [1, 2] });
  f.flush();
  expect(await inspect('interaction', edit.id)).toMatchObject({
    status: 'pending',
    error: expect.stringContaining('changed during readback'),
  });
  f.change(original, { type: 'Point', coordinates: [5, 6] });
  button('Confirm').click();
  expect(await inspect('interaction', edit.id)).toMatchObject({
    status: 'pending',
    error: expect.stringContaining('Original geometry changed'),
  });
  await interact({ action: 'cancel', interactionId: edit.id });
  expect((await inspect('native_get', created.id)).geometry.coordinates).toEqual([5, 6]);
});
it('does not intercept another selected layer and ignores its drawing events', async () => {
  const f = fixture();
  const edit = await interact({ action: 'request', shape: 'Point' });
  const draft = f.tools.getSelected();
  f.tools.setSelected(f.geometries[0]);
  f.change(draft, { type: 'Point', coordinates: [1, 2] }, 'draw');
  expect(f.tools.edit).not.toHaveBeenCalled();
  const stopCount = f.tools.stop.mock.calls.length;
  await interact({ action: 'cancel', interactionId: edit.id });
  expect(f.tools.getSelected()).toBe(f.geometries[0]);
  expect(f.tools.stop).toHaveBeenCalledTimes(stopCount);
  expect(f.geometries).toEqual([{ userOwned: true }]);
});
it('blocks concurrent interactions, locked native mutations and unsupported legacy editing arguments', async () => {
  const f = fixture();
  const created = await native('create', { geometry: { type: 'Point', coordinates: [0, 0] } });
  const edit = await interact({ action: 'request', layerId: created.id });
  for (const operation of [
    () => interact({ action: 'request' }),
    () => native('delete', { id: created.id }),
    () => native('update', { id: created.id, geometry: { type: 'Point', coordinates: [2, 3] } }),
  ]) {
    const promise = operation();
    await expect(promise).rejects.toThrow(/pending/);
  }
  await expect(
    dispatchMapAction('mapInteract', { action: 'request', annotationId: 'ea-legacy' })
  ).rejects.toThrow();
  await interact({ action: 'cancel', interactionId: edit.id });
  const state = f.container.querySelector('input')!;
  const data = JSON.parse(state.value);
  delete data.nativeInteraction;
  state.value = JSON.stringify(data);
  await expect(dispatchMapAction('mapInteract', { action: 'request' })).rejects.toThrow(
    'MAP_BRIDGE_UPDATE_REQUIRED'
  );
});
it('rejects removed drafts and invalid native coordinates before commit', async () => {
  const f = fixture();
  const request = await interact({ action: 'request', shape: 'Point' });
  const draft = f.tools.getSelected();
  f.change(draft, { type: 'Point', coordinates: [0, 100] });
  button('Confirm').click();
  expect((await inspect('interaction', request.id)).error).toContain('WGS84');
  f.tools.layers().remove(draft);
  button('Confirm').click();
  expect((await inspect('interaction', request.id)).error).toContain('removed');
  await interact({ action: 'cancel', interactionId: request.id });
  expect((await inspect('native_list')).ids).toEqual([]);
});
it('edits a native draft, preserves originals on cancellation, and commits only on confirmation', async () => {
  const f = fixture();
  const created = await native('create', {
    geometry: { type: 'Point', coordinates: [0, 0] },
    name: '123 Test: study area / 中文',
  });
  expect(created.name).toMatch(/^EarthAgent123Teststudyarea[a-zA-Z0-9]+$/);
  await interact({ action: 'request', layerId: created.id });
  f.change(f.tools.getSelected(), { type: 'Point', coordinates: [1, 2] });
  expect((await inspect('native_get', created.id)).geometry.coordinates).toEqual([0, 0]);
  button('Cancel').click();
  expect((await inspect('native_get', created.id)).geometry.coordinates).toEqual([0, 0]);
  const edit = await interact({ action: 'request', layerId: created.id });
  f.change(f.tools.getSelected(), { type: 'Point', coordinates: [2, 3] });
  button('Confirm').click();
  expect(await inspect('interaction', edit.id)).toMatchObject({
    status: 'confirmed',
    layerId: created.id,
  });
  expect((await inspect('native_get', created.id)).geometry.coordinates).toEqual([2, 3]);
  expect(f.geometries).toHaveLength(2);
  await dispatchMapAction('mapAnnotate', {
    action: 'upsert',
    id: 'ea-label',
    geometry: { type: 'Point', coordinates: [0, 0] },
  });
  f.container.querySelector('input')!.remove();
  await jest.advanceTimersByTimeAsync(250);
  expect(document.querySelector('[data-earth-agent-map]')).toBeNull();
});
