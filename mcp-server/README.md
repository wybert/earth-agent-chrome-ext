# Earth Agent MCP Server

MCP (Model Context Protocol) server that exposes Google Earth Engine tools to AI assistants like Claude Code, Zed Editor, and Cursor.

## Architecture

```
┌─────────────────────┐
│   Claude Code       │
│   Zed / Cursor      │
└─────────┬───────────┘
          │ MCP Protocol (stdio)
          │ Standard input/output
          ▼
┌─────────────────────┐
│   MCP Server        │  ← Node.js process
│   (this package)    │
│                     │
│   WebSocket Server  │
│   Port 3847         │
└─────────┬───────────┘
          │ WebSocket (ws://localhost:3847)
          │ Bidirectional communication
          ▼
┌─────────────────────┐
│  Chrome Extension   │  ← Connects automatically
│  (Background Script)│     No configuration needed
└─────────┬───────────┘
          │ Chrome APIs
          │ (tabs, scripting)
          ▼
┌─────────────────────┐
│  Google Earth Engine│  ← Browser tab
│  Code Editor        │
└─────────────────────┘
```

### How It Works

1. **MCP Server** starts and creates a WebSocket server on port 3847
2. **Chrome Extension** automatically connects to `ws://localhost:3847` when loaded
3. **Claude Code/Zed** connects to MCP Server via stdio (standard MCP protocol)
4. When a tool is called:
   - Claude Code → MCP Server (stdio)
   - MCP Server → Extension (WebSocket)
   - Extension → Earth Engine (Chrome APIs)
   - Results flow back the same path

### Chrome Extension Behavior

- **No configuration needed** in the extension
- Automatically attempts to connect when extension loads
- If MCP Server is not running, silently retries a few times then stops
- Normal extension functionality is not affected

---

## Setup

### 1. Build the MCP Server

```bash
cd mcp-server
npm install
npm run build
```

### 2. Configure Claude Code

Add to your Claude Code settings (`~/.claude/settings.json`):

```json
{
  "mcpServers": {
    "earth-agent": {
      "command": "node",
      "args": ["/path/to/earth-agent-ai-sdk/mcp-server/dist/index.js"]
    }
  }
}
```

Or for Claude Desktop (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "earth-agent": {
      "command": "node",
      "args": ["/path/to/earth-agent-ai-sdk/mcp-server/dist/index.js"]
    }
  }
}
```

### 3. Configure Zed Editor

Add to your Zed settings:

```json
{
  "language_models": {
    "mcp_servers": {
      "earth-agent": {
        "command": "node",
        "args": ["/path/to/earth-agent-ai-sdk/mcp-server/dist/index.js"]
      }
    }
  }
}
```

### 4. Load the Chrome Extension

Make sure the Earth Agent Chrome extension is loaded and active. **No additional configuration needed** - the extension will automatically connect to the MCP server.

### 5. Open Google Earth Engine

Open [code.earthengine.google.com](https://code.earthengine.google.com) in Chrome. This tab is needed for GEE-related tools to work.

---

## Available Tools (17 Total)

### Utility Tools (3)

| Tool | Description | Parameters |
|------|-------------|------------|
| `weather` | Get current weather for a location | `location` (required) |
| `date_time` | Get current date/time | `timezone` (optional) |
| `wait` | Wait for specified seconds (0.5-60) | `seconds` (required) |

### Code Manipulation Tools (5)

| Tool | Description | Parameters |
|------|-------------|------------|
| `read_gee_code` | Read current code from GEE editor | none |
| `edit_gee_code` | Edit code using find/replace | `old_string`, `new_string` |
| `write_gee_code` | Overwrite entire editor content | `code` |
| `undo_gee_edit` | Undo the last code edit | none |
| `run_gee_code` | Execute code (click Run button) | none |

### Browser Interaction Tools (4)

| Tool | Description | Parameters |
|------|-------------|------------|
| `gee_screenshot` | Take screenshot of GEE interface | none |
| `gee_snapshot` | Get accessibility tree (for finding elements) | none |
| `click_element` | Click element by reference ID | `ref_id` |
| `click_position` | Click at screen coordinates | `x`, `y` |

### Earth Engine State Tools (4)

| Tool | Description | Parameters |
|------|-------------|------------|
| `gee_console` | Read console output | none |
| `gee_map_position` | Get map center, zoom, and bounds | none |
| `gee_inspector` | Read inspector panel data | none |
| `clear_gee` | Clear map layers, console, and inspector | none |

### Documentation Tools (1)

| Tool | Description | Parameters |
|------|-------------|------------|
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

### Take Screenshot

```
User: Show me what the map looks like

Claude Code: [Calls gee_screenshot]

Here's a screenshot of your Earth Engine interface showing the current map view.
```

### Search Documentation

```
User: Find information about Sentinel-2 imagery

Claude Code: [Calls gee_docs with query: "Sentinel-2"]

Here's the documentation for Sentinel-2 data in Google Earth Engine...
```

### Check Weather for Study Area

```
User: What's the weather like in San Francisco?

Claude Code: [Calls weather with location: "San Francisco"]

Current weather in San Francisco:
- Temperature: 15°C
- Humidity: 72%
- Wind: 12 km/h
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `EARTH_AGENT_WS_PORT` | `3847` | WebSocket server port |

---

## Troubleshooting

### "Chrome extension not connected"

Make sure:
1. The Earth Agent Chrome extension is installed and enabled
2. You have refreshed/reloaded the extension after MCP server started
3. Check extension console for connection logs: `[MCP-WS] Connected to MCP server`

### "No Google Earth Engine tab found"

Open [code.earthengine.google.com](https://code.earthengine.google.com) in Chrome before using GEE-related tools.

### Connection issues

The MCP server and Chrome extension communicate via WebSocket on port 3847. Make sure:
- Port 3847 is not blocked or used by another process
- If you changed the port via `EARTH_AGENT_WS_PORT`, the extension still uses 3847 (hardcoded)

### Extension not connecting

Check the extension's background script console:
1. Go to `chrome://extensions/`
2. Find Earth Agent and click "Service Worker" link
3. Look for `[MCP-WS]` log messages

---

## Chrome Web Store Compatibility

This MCP integration **does not affect** Chrome Web Store submission:
- WebSocket connections to `localhost` are standard browser functionality
- No special permissions required
- If MCP Server is not running, extension works normally
- Connection attempts are silent and non-blocking

---

## Development

### Build MCP Server

```bash
cd mcp-server
npm install
npm run build
```

### Watch Mode

```bash
npm run dev  # Rebuilds on file changes
```

### Testing

Start the MCP server manually to test:

```bash
node dist/index.js
```

Then check that the extension connects (look for WebSocket logs in extension console).
