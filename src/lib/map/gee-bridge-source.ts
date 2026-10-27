/**
 * Runs in the GEE script environment, where Map/ui/ee are supported APIs.
 * Intentionally self-contained: the extension copies this function as setup code.
 * It never evaluates commands, alters existing layers, or executes editor code.
 */
export function installGeeMapBridge(map: any, ui: any, ee: any) {
  var mapId = 'ea-map-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  var revision = 0;
  var stopped = false;
  var owned: Record<string, any> = {};
  var interactions: Record<string, any> = {};
  var interactionIds: string[] = [];
  var active: any = null;
  var state = ui.Textbox({ placeholder: 'earth-agent-map-state-v1', disabled: true });
  var response = ui.Textbox({ placeholder: 'earth-agent-map-response-v1', disabled: true });
  var input = ui.Textbox({ placeholder: 'earth-agent-map-command-v1' });
  state.style().set('shown', false);
  response.style().set('shown', false);
  input.style().set('shown', false);
  var panel = ui.Panel({ style: { position: 'bottom-left', padding: '4px', width: '190px' } });
  panel.add(ui.Label('Earth Agent map connected'));
  panel.add(state);
  panel.add(response);
  panel.add(input);
  map.add(panel);

  function publishState() {
    if (stopped) return;
    var current = ++revision;
    var bounds = map.getBounds();
    var zoom = map.getZoom();
    state.setValue(JSON.stringify({ mapId: mapId, revision: current, ready: false }), false);
    map.getCenter().evaluate(function (center: any, error: any) {
      if (stopped || current !== revision) return;
      state.setValue(
        JSON.stringify({
          mapId: mapId,
          revision: current,
          ready: !error,
          nativeInteraction: 1,
          error: error || null,
          center: center && center.coordinates,
          bounds: bounds,
          zoom: zoom,
          projection: 'EPSG:3857',
          heading: 0,
          tilt: 0,
        }),
        false
      );
    });
  }
  var listener = map.onChangeBounds(publishState);
  publishState();
  panel.add(
    ui.Button('Disconnect map link', function () {
      if (active) finishInteraction(false);
      stopped = true;
      map.unlisten(listener);
      map.remove(panel);
    })
  );

  function activeLayer(id: string) {
    var layer = owned[id];
    if (!layer) throw new Error('Unknown Agent geometry ID.');
    var layers = map.drawingTools().layers();
    for (var i = 0; i < layers.length(); i++) if (layers.get(i) === layer) return layer;
    delete owned[id];
    throw new Error('Agent geometry was removed from the map.');
  }
  function readLayer(id: string, done: (value?: any, error?: any) => void) {
    var layer = activeLayer(id);
    layer.getEeObject().evaluate(function (geometry: any, error: any) {
      done({ id: id, name: layer.getName(), geometry: geometry }, error);
    });
  }
  function attached(layer: any) {
    var layers = map.drawingTools().layers();
    for (var i = 0; i < layers.length(); i++) if (layers.get(i) === layer) return true;
    return false;
  }
  function values(layer: any) {
    var list = layer.geometries();
    var result = [];
    for (var i = 0; i < list.length(); i++) result.push(list.get(i));
    return result;
  }
  function unchanged(layer: any, snapshot: any[]) {
    var current = values(layer);
    return (
      current.length === snapshot.length &&
      current.every(function (value, i) {
        return value === snapshot[i];
      })
    );
  }
  function feedback(session: any, error: any) {
    session.result.error = String(error);
    session.label.setValue(String(error));
  }
  function validateDrawing(geometry: any) {
    if (!geometry || ['Point', 'LineString', 'Polygon'].indexOf(geometry.type) === -1)
      throw new Error('Only a single Point, LineString or Polygon is supported.');
    var paths =
      geometry.type === 'Point'
        ? [[geometry.coordinates]]
        : geometry.type === 'LineString'
          ? [geometry.coordinates]
          : geometry.coordinates;
    if (!Array.isArray(paths) || !paths.length || paths.length > 100)
      throw new Error('Invalid geometry paths.');
    var count = 0;
    paths.forEach(function (path: any) {
      var minimum = geometry.type === 'Point' ? 1 : geometry.type === 'LineString' ? 2 : 4;
      if (!Array.isArray(path) || path.length < minimum) throw new Error('Incomplete geometry.');
      path.forEach(function (point: any) {
        if (
          !Array.isArray(point) ||
          point.length !== 2 ||
          typeof point[0] !== 'number' ||
          typeof point[1] !== 'number' ||
          !isFinite(point[0]) ||
          !isFinite(point[1]) ||
          Math.abs(point[0]) > 180 ||
          Math.abs(point[1]) > 90
        )
          throw new Error('Invalid WGS84 coordinates.');
        count++;
      });
      if (
        geometry.type === 'Polygon' &&
        JSON.stringify(path[0]) !== JSON.stringify(path[path.length - 1])
      )
        throw new Error('Polygon ring must be closed.');
    });
    if (count > 2000) throw new Error('Maximum 2000 vertices per drawing.');
  }
  function finishInteraction(confirmed: boolean, geometry?: any) {
    var session = active;
    if (!session) return;
    var tools = map.drawingTools();
    // Invalidate callbacks before removing layers or restoring the toolbar.
    active = null;
    session.listeners.forEach(function (id: string) {
      tools.unlisten(id);
    });
    var selected = tools.getSelected();
    if (selected === session.draft || !selected) {
      tools.stop();
      if (session.previousShape) tools.setShape(session.previousShape);
      tools.stop();
      tools.setSelected(attached(session.previousSelected) ? session.previousSelected : null);
      tools.setShown(session.previousShown);
    }
    if (!confirmed || session.target) {
      if (attached(session.draft)) tools.layers().remove(session.draft);
    } else owned[session.result.layerId] = session.draft;
    session.result.status = confirmed ? 'confirmed' : 'cancelled';
    delete session.result.error;
    if (confirmed) {
      session.result.geometry = geometry;
      if (session.target) session.result.shape = geometry.type;
    }
    panel.remove(session.controls);
  }
  function confirmInteraction() {
    var session = active;
    if (!session || session.evaluating) return;
    try {
      if (!attached(session.draft)) throw new Error('Draft was removed. Cancel and start again.');
      if (session.draft.geometries().length() !== 1)
        throw new Error('Finish exactly one native shape before confirming.');
      var snapshot = values(session.draft);
      var version = session.version;
      session.evaluating = true;
      session.label.setValue('Reading native geometry…');
      snapshot[0].evaluate(function (geometry: any, error: any) {
        if (stopped || active !== session) return;
        session.evaluating = false;
        try {
          if (error) throw new Error(String(error));
          if (
            !attached(session.draft) ||
            version !== session.version ||
            !unchanged(session.draft, snapshot)
          )
            throw new Error('Draft changed during readback. Confirm again.');
          validateDrawing(geometry);
          var expected = session.result.shape === 'Rectangle' ? 'Polygon' : session.result.shape;
          if (!session.target && geometry.type !== expected)
            throw new Error('Draw the requested ' + expected + ' shape.');
          if (session.target) {
            if (
              activeLayer(session.result.layerId) !== session.target ||
              session.conflict ||
              !unchanged(session.target, session.original)
            )
              throw new Error('Original geometry changed. Cancel and start a fresh edit.');
            session.target.geometries().reset(snapshot);
          }
          finishInteraction(true, geometry);
        } catch (e) {
          feedback(session, e);
        }
      });
    } catch (e) {
      session.evaluating = false;
      feedback(session, e);
    }
  }
  function requestInteraction(id: string, args: any) {
    if (active)
      throw new Error(
        'A native drawing interaction is already pending. Confirm or cancel it first.'
      );
    var tools = map.drawingTools();
    var target = args.layerId ? activeLayer(args.layerId) : null;
    var original = target ? values(target) : [];
    if (target && original.length !== 1)
      throw new Error('Editing requires a layer containing exactly one geometry.');
    var session: any = {
      result: {
        id: id,
        status: 'pending',
        mode: target ? 'edit' : 'draw',
        shape: target ? undefined : args.shape,
        message: args.message,
        layerId: args.layerId || 'ea-' + id,
      },
      target: target,
      original: original,
      version: 0,
      conflict: false,
      previousSelected: tools.getSelected(),
      previousShown: tools.getShown(),
      previousShape: tools.getShape(),
      listeners: [],
      controls: ui.Panel(),
      label: ui.Label(args.message),
    };
    active = session;
    try {
      session.draft = tools.addLayer(
        original,
        'EarthAgentDraft' + id.replace(/[^a-zA-Z0-9]/g, ''),
        '1976d2',
        true,
        false
      );
      session.controls.add(session.label);
      session.controls.add(
        ui.Label(
          'Use GEE drawing tools on the blue draft. Confirm saves; Cancel discards the draft.'
        )
      );
      session.controls.add(
        ui.Button('Confirm', function () {
          if (active === session) confirmInteraction();
        })
      );
      session.controls.add(
        ui.Button('Cancel', function () {
          if (active === session) finishInteraction(false);
        })
      );
      panel.add(session.controls);
      function changed(_geometry: any, layer: any) {
        if (active !== session) return;
        if (layer === session.target) session.conflict = true;
        if (layer !== session.draft) return;
        session.version++;
        delete session.result.error;
        session.label.setValue(
          session.result.message + ' Review the draft, then Confirm or Cancel.'
        );
      }
      session.listeners.push(
        tools.onDraw(function (geometry: any, layer: any) {
          changed(geometry, layer);
          if (active === session && layer === session.draft && tools.getSelected() === layer) {
            tools.stop();
            tools.edit();
          }
        })
      );
      session.listeners.push(tools.onEdit(changed));
      session.listeners.push(tools.onErase(changed));
      tools.setShown(true);
      tools.setSelected(session.draft);
      if (target) tools.edit();
      else {
        tools.setShape(
          (
            {
              Point: 'point',
              LineString: 'line',
              Polygon: 'polygon',
              Rectangle: 'rectangle',
            } as Record<string, string>
          )[args.shape]
        );
        tools.draw();
      }
      interactions[id] = session.result;
      interactionIds.push(id);
      if (interactionIds.length > 100) delete interactions[interactionIds.shift()!];
      return session.result;
    } catch (e) {
      finishInteraction(false);
      throw e;
    }
  }
  input.onChange(function (raw: string) {
    if (stopped) return;
    var request: any;
    function done(value?: any, error?: any) {
      if (!stopped)
        response.setValue(
          JSON.stringify({
            id: request.id,
            success: !error,
            result: value || null,
            error: error ? String(error) : null,
          }),
          false
        );
    }
    try {
      request = JSON.parse(raw);
      if (typeof request.id !== 'string' || request.mapId !== mapId) return;
      var args = request.args || {};
      var tools = map.drawingTools();
      if (request.action === 'interaction_request') {
        done(requestInteraction(request.id, args));
      } else if (request.action === 'interaction_get') {
        if (!interactions[args.id]) throw new Error('Unknown/expired interaction ID.');
        done(interactions[args.id]);
      } else if (request.action === 'interaction_cancel') {
        if (!active || active.result.id !== args.id)
          throw new Error('This interaction is not pending.');
        finishInteraction(false);
        done(interactions[args.id]);
      } else if (request.action === 'native_create') {
        if (!args.geometry || ['Point', 'LineString', 'Polygon'].indexOf(args.geometry.type) === -1)
          throw new Error('Unsupported GeoJSON geometry.');
        var id = 'ea-' + request.id;
        owned[id] = tools.addLayer(
          [ee.Geometry(args.geometry)],
          // Linked drawing layers need valid GEE identifiers, not free-form labels.
          'EarthAgent' +
            String(args.name || 'Geometry')
              .replace(/[^a-zA-Z0-9]/g, '')
              .slice(0, 40) +
            request.id.replace(/[^a-zA-Z0-9]/g, ''),
          args.color || 'e53935',
          true,
          false
        );
        tools.setShown(true);
        readLayer(id, done);
      } else if (request.action === 'native_get') {
        readLayer(args.id, done);
      } else if (request.action === 'native_update') {
        if (active && active.result.layerId === args.id)
          throw new Error('Finish or cancel the pending native edit first.');
        var layer = activeLayer(args.id);
        layer.geometries().reset([ee.Geometry(args.geometry)]);
        readLayer(args.id, done);
      } else if (request.action === 'native_delete') {
        if (active && active.result.layerId === args.id)
          throw new Error('Finish or cancel the pending native edit first.');
        tools.layers().remove(activeLayer(args.id));
        delete owned[args.id];
        done({ deleted: args.id });
      } else if (request.action === 'native_list') {
        var ids = Object.keys(owned).filter(function (id) {
          try {
            activeLayer(id);
            return true;
          } catch (_) {
            return false;
          }
        });
        done({ ids: ids });
      } else throw new Error('Unsupported map bridge command.');
    } catch (error) {
      if (request && typeof request.id === 'string') done(null, error);
    }
  });
}

export function getGeeMapBridgeSource(): string {
  return (
    '// Earth Agent: append after your map setup, then run only when ready.\n' +
    '// This adds a map control; it does not clear your existing layers or geometries.\n' +
    '(' +
    installGeeMapBridge.toString() +
    ')(Map, ui, ee);'
  );
}
