# No-code map connection: feasibility investigation

## Scope

Determine whether the extension can access the current GEE map and native drawing tools without inserting setup code into the user's analysis script. Do not execute or replace editor code, alter layers, disconnect the user's existing bridge, or restart their browser to obtain debugging access.

## Evidence collected on 2026-09-20

- The authenticated local MCP connection works. `gee_map_position` returned a map rectangle of `(0, 559, 1534, 401)` and viewport `(1534, 960)`. Source inspection confirms this tool reads DOM layout only: it does **not** obtain geographic bounds, map center, or native drawing objects.
- `map_inspect` with `action: maps` found an existing setup bridge with `ready: false`. This is not proof of a no-code connection. No setup or user script was executed during the investigation.
- The existing MCP toolset cannot inspect page JavaScript objects. There is no configured Chrome remote-debugging endpoint for this browser session. A read-only diagnostic was added to the extension instead of restarting Chrome or modifying user scripts.
- The first live `runtime_probe` request was rejected by the running extension's old action enum. This confirms that the new handler is not loaded yet; it says nothing about whether a no-code map API exists.
- Google's [Code Editor release notes](https://developers.google.com/earth-engine/docs/code-editor/release-notes#may_12_2021) state that the Code Editor switched its script sandbox to JS-Interpreter. Page MAIN-world access must therefore be tested independently; it must not be equated with access to script-local `Map/ui` objects.

## Read-only runtime probe

After rebuilding and reloading the extension, call:

```json
{ "name": "map_inspect", "arguments": { "action": "runtime_probe" } }
```

The background service executes a self-contained diagnostic in the GEE tab's MAIN world. It does not require the setup bridge or a content-script refresh. It returns:

- Relevant global names and types, map container dimensions and attached property names.
- Structurally matching map/drawing-tool candidates, with paths and method names only.
- Traversal counts and an explicit truncation/limitations field.

The diagnostic does not invoke discovered functions or getters, read editor contents or credential values, send page data to another service, or mutate DOM/map objects. Traversal is bounded and cycles are deduplicated. Prototype/constructor matches are not live map instances; no matches do not prove that integration is impossible. Private/minified object paths are not supported public APIs.

## Remaining live checks

1. Reload the unpacked extension so the new diagnostic handler is active; leave the current GEE page and script unchanged.
2. Run the probe and distinguish live map instances from constructors/prototypes, DOM layout and the existing bridge.
3. If a viable candidate exists, implement a narrow read-only check of its geographic state and compare against independent map evidence. Do not add a general-purpose evaluation tool.
4. Only after a usable integration is established, separately test temporary Agent-owned native geometry creation/readback/deletion and lifetime across ordinary user-driven script runs. Do not infer write capability or stability from structural discovery.

Validation of the diagnostic: type-check, extension build, all 100 root tests and four MCP integration tests passed. Fixtures verify discovery without a bridge, non-invocation of getters/methods, no object-value disclosure, unchanged DOM, bounded cyclic traversal and standalone serialization.

Current conclusion: **live capability discovery is pending extension reload; no-code feasibility has not yet been established or ruled out.**
