# Earth Agent Local MCP Connector

A local stdio MCP server connecting your Agent to the Earth Agent Chrome extension. No Earth Agent backend, account or extension AI API key is required.

## Setup (1.3.1)

Requires Node.js 22+, Chrome 116+, extension 1.3.1, and an Agent that supports local stdio MCP servers.

1. In extension **Settings → Local MCP**, click **Enable MCP and allow local access**.
2. Click **Save & copy MCP configuration**. Merge its `earth-agent` entry with the other servers in your client's MCP settings; do not overwrite unrelated configuration.
3. Restart the connector in your Agent. The client launches it; no separate terminal needs to stay open.
4. Open `https://code.earthengine.google.com/` and sign in.
5. Check Settings says the paired connector is connected, then ask your Agent to read the editor.

The generated configuration uses this shape (copy real values from Settings):

```json
{
  "mcpServers": {
    "earth-agent": {
      "command": "npx",
      "args": ["-y", "earth-agent-mcp@1.3.1"],
      "env": {
        "EARTH_AGENT_TOKEN": "<64-character pairing key from Settings>",
        "EARTH_AGENT_EXTENSION_ID": "<extension ID from Settings>",
        "EARTH_AGENT_WS_PORT": "3847"
      }
    }
  }
}
```

Clients have different configuration formats. Use their local stdio MCP setup UI, carrying over `command`, `args` and `env`. The copied JSON is an `mcpServers` template, not a universal file to paste into every client. If `npx` is not found, use its absolute executable path available to the client.

The configuration contains a secret. Do not commit it, post screenshots of it, or share it. Enabling MCP grants the paired client access to read, edit and execute GEE code and request browser screenshots.

## Local development / before npm publication

The 1.3.1 package and matching extension must be published separately before the generated npx setup works for public users. This source change does not publish either one.

Run `npm ci` and `npm run build` in `mcp-server/`. In the copied configuration, keep `env` unchanged and replace:

- `command`: absolute path to your Node.js executable.
- `args`: a one-element array containing the absolute path to `mcp-server/dist/index.js`.

Build the root extension with `npm run build` and load `dist/` for local verification. Its unpacked extension ID may differ from the store ID; copy the configuration from that installed extension.

## Connection and security

```text
Agent → MCP stdio → local connector → authenticated WebSocket → extension → GEE
```

- Listens only on `127.0.0.1`, not the LAN.
- Checks the Chrome extension Origin and a cryptographically random pairing key before accepting browser results or sending tool requests.
- MCP is off by default. Existing enabled settings without a key require explicit setup.
- Optional local permissions are preserved in store packaging, requested by a user click. Store approval is not guaranteed by packaging.
- Heartbeat messages run every 20 seconds. Transient failures retry with backoff; a Chrome alarm provides recovery after worker suspension. Authentication rejection requires configuration correction and a manual retry.
- Browser tool operations are serialized. Queued operations from a disconnected session are discarded. Already running GEE operations cannot be rolled back by disconnecting.
- One connector per port and one paired browser per connector. A second browser cannot take over an active connection. Port conflicts produce an error and never kill other processes.
- Multiple independent Agents require separate Chrome profiles with different matching ports/keys, or stopping the first connector before switching. Shared multi-client multiplexing is not implemented.
- Results remain between the extension and local connector until passed to the external Agent, which may forward them to its AI provider. Weather/documentation tools retain their existing external service calls.

## Diagnostics

| Symptom | Action |
| --- | --- |
| Permission required | Enable MCP from Settings and approve local access. |
| Pairing required/rejected | Copy current configuration, restart the connector, then Retry connection. Old 1.3.0 connectors are incompatible. |
| Waiting for connector | Check Node.js 22+, the Agent's MCP logs, package availability and matching port. |
| Port in use | Stop the known other connector in its owning Agent, or change the port in Settings and copy the new configuration. |
| Another browser connected | Use the intended browser profile, or separate ports/profiles. |
| No GEE tab | Open Earth Engine and sign in. Multiple GEE tabs use the extension's existing best-tab selection. |
| Browser sleeps/restarts | Reopen Chrome; recovery is automatic while enabled. Use Retry if needed. |
| Tool times out/disconnects | Inspect GEE before retrying; the original operation may already have executed. |

**Reset pairing key** disables MCP and revokes the old key. Copy the new configuration and restart the connector before enabling again. **Disable MCP / Disconnect** immediately stops the connection and discards queued browser work.

## Verification and release

Run `npm test` here for real WebSocket authentication, origin rejection, port collision, heartbeat, disconnect and MCP stdio roundtrip tests. Root tests cover extension lifecycle and store-manifest transformation.

Release checklist:

1. Pass root type-check, tests and build, plus connector tests.
2. Verify the flow manually with the target desktop clients and Chrome (fresh install, permission denied/granted, sleep/restart, key reset, Windows/macOS/Linux paths).
3. Publish connector 1.3.1 to npm before distributing the extension that references it.
4. Submit the matching extension and updated privacy/permission descriptions to the Chrome Web Store.
5. Repeat the fresh-install flow against the published packages. No Node-free installer is included in this release.

## Available Tools (17 Total)

### Utility Tools (3)

| Tool        | Description                         | Parameters            |
| ----------- | ----------------------------------- | --------------------- |
| `weather`   | Get current weather for a location  | `location` (required) |
| `date_time` | Get current date/time               | `timezone` (optional) |
| `wait`      | Wait for specified seconds (0.5-60) | `seconds` (required)  |

### Code Manipulation Tools (5)

| Tool             | Description                       | Parameters                 |
| ---------------- | --------------------------------- | -------------------------- |
| `read_gee_code`  | Read current code from GEE editor | none                       |
| `edit_gee_code`  | Edit code using find/replace      | `old_string`, `new_string` |
| `write_gee_code` | Overwrite entire editor content   | `code`                     |
| `undo_gee_edit`  | Undo the last code edit           | none                       |
| `run_gee_code`   | Execute code (click Run button)   | none                       |

### Browser Interaction Tools (4)

| Tool             | Description                                   | Parameters |
| ---------------- | --------------------------------------------- | ---------- |
| `gee_screenshot` | Take screenshot of GEE interface              | none       |
| `gee_snapshot`   | Get accessibility tree (for finding elements) | none       |
| `click_element`  | Click element by reference ID                 | `ref_id`   |
| `click_position` | Click at screen coordinates                   | `x`, `y`   |

### Earth Engine State Tools (4)

| Tool               | Description                              | Parameters |
| ------------------ | ---------------------------------------- | ---------- |
| `gee_console`      | Read console output                      | none       |
| `gee_map_position` | Get map center, zoom, and bounds         | none       |
| `gee_inspector`    | Read inspector panel data                | none       |
| `clear_gee`        | Clear map layers, console, and inspector | none       |

### Documentation Tools (1)

| Tool       | Description                           | Parameters                                                    |
| ---------- | ------------------------------------- | ------------------------------------------------------------- |
| `gee_docs` | Search GEE documentation and datasets | `query` (required), `type` (optional: datasets/community/api) |

---

## Usage Examples

### Read and Edit Code

```
User: Read the current GEE code and add NDVI calculation

Claude Code: I'll read the current code first.
[Calls read_gee_code]

Result:
var image = ee.Image('LANDSAT/LC08/C02/T1_L2/LC08_044034_20231001');
Map.addLayer(image, {bands: ['SR_B4', 'SR_B3', 'SR_B2'], min: 7000, max: 12000}, 'Landsat');

Claude Code: Now I'll add NDVI calculation.
[Calls edit_gee_code with old_string and new_string]

Done! I've added NDVI calculation to your code.
```

### Search Documentation

```
User: Find information about Sentinel-2 imagery

Claude Code: [Calls gee_docs with query: "Sentinel-2"]

Here's the documentation for Sentinel-2 data in Google Earth Engine...
```

---
