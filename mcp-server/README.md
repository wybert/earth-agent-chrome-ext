# Earth Agent MCP Server

[![npm version](https://badge.fury.io/js/earth-agent-mcp.svg)](https://www.npmjs.com/package/earth-agent-mcp)

MCP (Model Context Protocol) server that exposes Google Earth Engine tools to AI assistants like Claude Code, Zed Editor, and Cursor.

## Installation

```bash
# No installation needed! Just use npx in your editor config.
# Or install globally:
npm install -g earth-agent-mcp
```

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

### Configuration

- **Enabled by Default**: The MCP connection is enabled automatically when you install the extension.
- **Settings Toggle**: You can turn the MCP server connection on/off in the extension Settings > External Integrations.
- **Keep Side Panel Open**: For the most reliable connection, we recommend keeping the Earth Agent side panel open while using MCP tools. This prevents Chrome from putting the background connection to sleep.

---

## Running the Server

### Option 1: Using npx (Easiest - No Build Required)

Just add the configuration to your editor - no cloning or building needed!

<details>
<summary><b>Claude Code</b> (~/.claude/settings.json)</summary>

```json
{
  "mcpServers": {
    "earth-agent": {
      "command": "npx",
      "args": ["-y", "earth-agent-mcp"]
    }
  }
}
```

</details>

<details>
<summary><b>Cursor</b> (~/.cursor/mcp.json)</summary>

```json
{
  "mcpServers": {
    "earth-agent": {
      "command": "npx",
      "args": ["-y", "earth-agent-mcp"]
    }
  }
}
```

</details>

<details>
<summary><b>Zed</b> (~/.config/zed/settings.json)</summary>

```json
{
  "context_servers": {
    "earth-agent": {
      "command": {
        "path": "npx",
        "args": ["-y", "earth-agent-mcp"]
      }
    }
  }
}
```

</details>

Then restart your editor and you're ready to go!

---

### Option 2: Using Antigravity

1.  **Ensure Config Exists**: The `antigravity.json` file in the root directory contains the configuration.
2.  **Load Configuration**:
    ```bash
    # Load configuration into Antigravity
    antigravity load-config ./antigravity.json
    ```

---

### Option 3: Build from Source

If you want to modify the server or run a local version:

1.  **Build the Server**:

    ```bash
    cd mcp-server
    npm install
    npm run build
    ```

2.  **Configure your editor** (example for Claude Code):

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

    _Note: Replace `/path/to/...` with your actual absolute path._

3.  **Restart your editor**: The server will start automatically.

---

### Option 4: Manual Run (For Testing/Debugging)

1.  **Start the Server**:

    ```bash
    cd mcp-server
    npm start
    # OR
    npx earth-agent-mcp
    ```

    You should see:

    ```
    [MCP] Starting Earth Agent MCP Server...
    [MCP] WebSocket server listening on port 3847
    [MCP] MCP Server running. Waiting for connections...
    ```

---

### Option 5: Development Mode

For trying out changes to the MCP server code:

1.  **Watch Mode**:

    ```bash
    cd mcp-server
    npm run dev
    ```

    This recompiles automatically on file changes.

2.  **Run Server**:
    In a separate terminal:
    ```bash
    npm start
    ```

---

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

## Troubleshooting

### Server Fails to Start

- Ensure `npm run build` has been run.
- Check Node.js version (18+ required).
- Check if port 3847 is in use: `lsof -i :3847`.

### "Chrome extension not connected" (Most Common Issue)

This error occurs when the MCP server can't communicate with the Chrome extension. The most common cause is **multiple MCP server instances** competing for the same WebSocket port.

#### What Happens

When you have multiple Claude Code sessions (or Cursor/Zed instances), each may spawn its own MCP server process. However, **only one can bind to port 3847**:

```
┌─────────────────┐     stdio      ┌─────────────────┐
│  Claude Code    │◄──────────────►│  MCP Server A   │ ← Claude Code talks to this
└─────────────────┘                │  (no WS port!)  │   but it failed to bind 3847
                                   └─────────────────┘

┌─────────────────┐                ┌─────────────────┐
│ Chrome Extension│◄──────────────►│  MCP Server B   │ ← Extension connects here
└─────────────────┘   WebSocket    │  (port 3847)    │   but Claude Code isn't using it
                                   └─────────────────┘
```

#### Solution: Kill All Instances and Restart

1. **Find and kill all MCP server processes**:

   ```bash
   # Find processes
   ps aux | grep "earth-agent.*index.js" | grep -v grep

   # Kill all instances
   pkill -f "earth-agent.*index.js"
   ```

2. **Verify port 3847 is free**:

   ```bash
   lsof -i :3847
   # Should return nothing
   ```

3. **Restart your AI assistant** (Claude Code, Cursor, or Zed) - it will spawn a fresh MCP server that can properly bind to port 3847.

4. **Reload the Chrome extension** (optional but recommended):
   - Go to `chrome://extensions/`
   - Click the refresh icon on Earth Agent
   - Or toggle the extension off and on

5. **Verify connection**:
   ```bash
   # Check that the server is listening AND has a connection
   lsof -i :3847
   # Should show both LISTEN and ESTABLISHED connections
   ```

#### Additional Checks

1. Ensure the Earth Agent extension is **installed and enabled**.
2. **Keep the Earth Agent side panel open** - Chrome may put background connections to sleep.
3. Check extension background console (right-click extension > "Service Worker") for `[MCP-WS] Connected`.

### "No Google Earth Engine tab found"

You must have [code.earthengine.google.com](https://code.earthengine.google.com) open in a tab for GEE tools to function.

## Environment Variables

| Variable              | Default | Description           |
| --------------------- | ------- | --------------------- |
| `EARTH_AGENT_WS_PORT` | `3847`  | WebSocket server port |
