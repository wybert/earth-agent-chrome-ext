# Map coordinates, annotations and drawing (experimental)

This feature has two deliberately separate outputs:

- **Agent overlay**: extension-owned SVG points, lines, polygons/rectangles, labels and arrows. These are visual guidance, not Earth Engine analysis inputs. Geographic positions are reprojected when the map moves.
- **Native geometry**: an actual `ui.Map.DrawingTools` layer containing `ee.Geometry` objects. Both Agent drawing and user drawing/editing use GEE native tools. The Agent may change only layers created by its current map connection. Existing user layers are never cleared. SVG overlays never capture pointer input or implement drawing handles.

Both built-in chat and local MCP call the same extension map service. No additional hosted backend is required. The local MCP connector is still required for external desktop Agents.

## Connect a map

1. Build the extension (`npm run build`), load/reload `dist` in Chrome, and refresh the Earth Engine tab.
2. Open extension **Settings → Map coordinates & drawing**.
3. Review and copy the setup code. Append it **after** your map setup in the GEE editor; do not replace your existing script. For a custom `ui.Map`, replace the final `Map` argument with your map variable.
4. Run your script **only when ready**. This executes the entire script, not just the connection code. The extension does not run it automatically.
5. Confirm that **Earth Agent map connected** appears on the map, then click **Check map connection** in Settings.

The setup runs in GEE's supported `Map/ui/ee` environment. It adds a small panel with text controls that carry map state and structured commands. It never evaluates command strings. `Disconnect map link` removes that connection, not existing geometries. Disconnect an existing link before installing a second link on the same map. Reconnect after resetting/rerunning the map. For multiple maps, use `mapInspect({action:"maps"})` to discover IDs, then pass `mapId` explicitly.

This is an explicit setup step; installing the extension alone does **not** automatically expose GEE's script-local map objects.

When upgrading from the earlier SVG interaction prototype, replace only the old Earth Agent setup block with the new Settings code, then run when ready. Do not append a duplicate bridge. Old bridges reject native interactions with `MAP_BRIDGE_UPDATE_REQUIRED`; other existing tools continue to work.

## Tools

| Chat tool       | MCP tool         | Purpose                                                                           |
| --------------- | ---------------- | --------------------------------------------------------------------------------- |
| `mapInspect`    | `map_inspect`    | Map discovery/context, annotations, interaction status, native layer IDs/readback |
| `mapConvert`    | `map_convert`    | WGS84 ↔ map, viewport or screenshot pixels                                        |
| `mapScreenshot` | `map_screenshot` | Active GEE screenshot with map context and coordinate frame                       |
| `mapAnnotate`   | `map_annotate`   | Create/update/remove extension overlays                                           |
| `mapInteract`   | `map_interact`   | User drawing/editing, confirmation and cancellation                               |
| `mapGeometry`   | `map_geometry`   | Agent-owned native GEE geometry creation/update/deletion                          |

The first three are available in Ask mode; mutations require Do mode. Custom profile allowlists are respected, so enable the new tools in existing profiles explicitly. MCP clients receive all six tools and apply their own approval policy. Build and run this checkout's local connector (`npm run build --prefix mcp-server`); an older published connector will not advertise these new tools.

## Coordinate contract

- Positions are WGS84 **`[longitude, latitude]`**, not `[latitude, longitude]`.
- Map pixels are CSS pixels measured from the map's top-left. Viewport pixels are CSS pixels measured from the page viewport's top-left, not desktop screen coordinates.
- Screenshot pixels use the returned image's encoded dimensions. Pass the screenshot's `frame` back to `mapConvert`; do not multiply by DPR yourself or reuse a generic screenshot's pixels.
- Each context has a `revision` covering map state, map rectangle and viewport. Pixel conversions require that revision. Pan, zoom, resize or a new bridge can invalidate it; refresh after `STALE_MAP_VIEW`.
- Projection is flat, unrotated Web Mercator (EPSG:3857). Conversion rejects unsupported projection/tilt/heading and polar coordinates outside the Mercator range. Connected paths unwrap across the antimeridian instead of crossing the wrong hemisphere. Geographic-to-pixel returns the world copy nearest the map center; offscreen coordinates are possible.
- Native GEE geometry edges retain Earth Engine's geometry semantics. SVG guidance is a screen-space projected path, not a guarantee of identical geodesic edges over large distances.

## Typical workflow

1. Inspect context or take a map screenshot.
2. Convert the desired screenshot pixel using that screenshot's `frame` and `revision`.
3. Add an annotation such as:

   ```json
   {
     "action": "upsert",
     "id": "ea-target",
     "kind": "label",
     "label": "Proposed sample",
     "geometry": { "type": "Point", "coordinates": [116.4, 39.9] }
   }
   ```

4. Request a user drawing with `mapInteract({action:"request",shape:"Polygon",message:"Outline the study area"})`. This returns immediately; **pending is not completion**. GEE selects a blue native draft and starts its drawing tools. After drawing, native vertex editing is enabled. Use the map connection panel's **Confirm** or **Cancel** buttons. Escape belongs to GEE and is not an Agent cancellation shortcut.
5. Read `mapInspect({action:"interaction",id:"<returned interaction ID>"})` after the user responds. Confirmed results include GeoJSON and `layerId` of the **already-saved native layer**. Do not create a duplicate with `mapGeometry`. Cancel removes only the temporary draft. Do not poll in a tight loop or claim pending work is finished.
6. To edit an existing Agent-owned native geometry, request `mapInteract({action:"request",layerId:"<native layer ID>"})`. The original remains unchanged until confirmation; editing uses a separate native draft. If the original changes or disappears meanwhile, confirmation fails instead of overwriting it. `annotationId` is no longer accepted. Agent-only drawing still uses `mapGeometry({action:"create",geometry:...,name:"Study area"})` directly. Read native layers with `native_get`, and update/delete only by returned ID.

Never retry a timed-out native mutation blindly: it may already have executed. Inspect `native_list` / `native_get` first. The adapter rejects overlapping native commands to avoid losing responses.

## Limits and persistence

- Point, LineString and Polygon (including closed rectangle polygons) are supported. Maximum 2,000 vertices per drawing and 100 Agent annotations per map; one pending user interaction at a time. Native confirmation requires exactly one geometry per draft. Editing a layer containing multiple geometries is rejected.
- Native `onDraw`, `onEdit` and `onErase` events are scoped to the draft/original. Cancellation and disconnect unregister session listeners and remove only the draft. Late evaluation callbacks cannot commit cancelled or stale edits. Direct Agent update/delete of a pending edit's original is blocked. Drafts are not included in `native_list` until confirmed. Previous toolbar selection/shape/visibility are restored when the draft still controls selection; an unrelated user selection is left alone. The previous drawing gesture is not resumed.
- Overlays, interaction records and layer ownership are session-local. The latest 100 interaction records are retained. Save returned GeoJSON or explicitly incorporate it into your script for persistence; the tools do not silently rewrite source code or export assets.
- Map screenshots require the target tab to be active. Tab switching or view changes during capture cause rejection. Encoded screenshots over 10 MB are rejected; reduce the window size and capture again.
- GEE UI markup may change. A missing bridge/container returns an explicit error; the extension does not fabricate geographic bounds or fall back to approximate latitude interpolation.

## Verification

Automated commands:

```sh
npm run type-check
npm test -- --runInBand --silent
npm run build
npm test --prefix mcp-server
npm run test:map-browser
```

`test:map-browser` launches an isolated temporary Chrome profile (override executable with `MAP_TEST_CHROME`). It tests actual browser layout, overlay pointer passthrough, DPR2 screenshot conversion, geographic anchoring and standalone minified setup on a **synthetic map fixture**. It never uses the user's profile, login or existing browser. Jest covers native drawing/edit/confirm/cancel contracts, stale callbacks, conflicts, ownership, coordinate math, screenshot frames, mode/profile filtering and tool output. MCP integration tests cover discovery and transport; their browser responses are fixtures.

### Real GEE acceptance checklist — still required

After the native-interaction change, type-check, extension build, 96 root tests, four MCP integration tests and the isolated Chrome smoke test passed. Native interaction tests use contract fixtures, not the authenticated GEE page.

Live checks on 2026-09-19, using the authenticated browser through the local MCP connector:

The following records predate the switch from SVG interaction to native user drawing. They verify native CRUD and the earlier prototype, **not** the new native interactive workflow. That workflow requires replacing the browser's setup block and completing new manual checks.

- Map discovery and context succeeded. Center and upper-left pixel conversion matched GEE's geographic center and bounds.
- Text/point and arrow overlays were created and read back successfully; both temporary annotations were then removed by their exact IDs.
- A real PNG screenshot returned matching image/viewport dimensions and a view revision. After the viewport resized, a conversion using the old revision was correctly rejected.
- Native layer creation exposed a real GEE naming restriction: the old `Earth Agent: ` prefix was rejected. The bridge now generates unique alphanumeric identifiers starting with `EarthAgent`, with a regression fixture enforcing this restriction. After the user reran the updated bridge, real GEE polygon creation, readback, coordinate update, subsequent readback and deletion all succeeded; the Agent-owned layer list was empty after cleanup.
- The user completed the interactive polygon request. The tool returned `confirmed` with a closed GeoJSON ring, which was then used to create and read back a real native GEE polygon. GEE normalized its winding order; the vertices were preserved. The same temporary native layer was successfully updated to LineString, then Point, before deletion.
- Editing the confirmed annotation was requested and cancelled through the tool. Readback proved the original polygon was unchanged. The preview was removed by its exact ID; both Agent annotation and native layer lists were empty after cleanup.
- The post-fix root regression run passed all 87 tests. Actual user vertex-drag details, GEE native manual editing/analysis, and the broader matrix below are not inferred from a successful confirmation alone.

These checks establish the main MCP drawing roundtrip, but do not yet establish the entire release checklist below (including visual anchoring across every view change, manual native editing/analysis, and built-in-chat live-provider runs).

- [ ] In an authenticated GEE Code Editor, connect the default map and verify the Settings status.
- [ ] Compare returned center/bounds/zoom with known coordinates. Repeat after pan/zoom, browser zoom, resizing and a high-DPI screenshot; confirm stale screenshots are rejected.
- [ ] Draw points, lines, polygons, arrows and labels; confirm geographic anchoring after pan/zoom.
- [ ] Request native point/line/polygon/rectangle drawings, edit vertices with GEE, confirm and cancel. Check GeoJSON and retained native layer IDs. Cancel native edits and verify originals remain unchanged; disconnect with a pending draft and verify cleanup.
- [ ] With an existing user geometry and imagery layer present, create/update/read/delete an Agent native layer. Confirm it is editable using GEE drawing tools, works as an analysis geometry, and user layers/code are unchanged.
- [ ] Disconnect/rerun the script; old overlays must disappear and old ownership must not authorize edits to unrelated geometries.
- [ ] Repeat tool workflows through built-in chat and a real desktop MCP client using the locally built connector.

Do not treat synthetic tests or a successful build as completion of this checklist, Chrome Store publication, or a production release sign-off.

API basis: [DrawingTools.addLayer](https://developers.google.com/earth-engine/apidocs/ui-map-drawingtools-addlayer), [Map.getBounds](https://developers.google.com/earth-engine/apidocs/ui-map-getbounds), [GeometryLayer.geometries](https://developers.google.com/earth-engine/apidocs/ui-map-geometrylayer-geometries).
