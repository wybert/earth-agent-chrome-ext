# Earth Agent Developer Guide

Detailed technical documentation for developers working on Earth Agent.

## Messaging Architecture

**IMPORTANT**: The extension uses a specific messaging pattern to avoid `window is not defined` errors:

- **UI → Background**: Use `chrome.runtime.sendMessage()` from UI components
- **Background → Content**: For Earth Engine tools, the AI tool's `execute` block must:
  1. Find the Earth Engine tab using `chrome.tabs.query()`
  2. Verify content script is ready by sending `PING` via `chrome.tabs.sendMessage()`
  3. Inject content script if needed using `chrome.scripting.executeScript()`
  4. Send the tool-specific message directly via `chrome.tabs.sendMessage()`

**Never call library functions from `src/lib/tools/` directly within AI tool `execute` blocks** - this causes browser API errors in the background service worker context.

## Tool Implementation Pattern

The project uses a **Service Layer Architecture** to unify tool logic between the Chrome Extension and MCP Server.

### Shared Service Layer (`src/lib/tools/services/`)

| Service | Purpose |
|---------|---------|
| `weather-service.ts` | Open-Meteo integration |
| `time-service.ts` | Date/time and wait logic |
| `editor-service.ts` | Earth Engine code editor manipulation |
| `gee-service.ts` | GEE execution, console, inspector |
| `browser-service.ts` | Screenshots, snapshots, clicks |
| `docs-service.ts` | Documentation search |

### Tool Consumers

- **Agent Tools** (`ai-tools.ts`): Vercel AI SDK tools, delegates to services
- **MCP Client** (`mcp-ws-client.ts`): JSON-RPC requests from external editors

## CORS Handling

The extension handles CORS for Anthropic API by:
1. Including `https://api.anthropic.com/*` in `host_permissions`
2. Using `corsProxyFetch` in `chat-handler.ts` that:
   - Adds required headers (`anthropic-version`, `anthropic-dangerous-direct-browser-access`)
   - Fixes API path to include `/v1/` if missing

## Host Permissions

```json
"host_permissions": [
  "https://code.earthengine.google.com/*",
  "https://code.earthengine.google.co.in/*",
  "https://earthengine.google.com/*",
  "https://context7.com/*",
  "https://api.anthropic.com/*",
  "https://www.googleapis.com/upload/drive/v3/*",
  "http://localhost:*/*",
  "http://127.0.0.1:*/*"
]
```

**Notes:**
- No `<all_urls>` for Chrome Web Store compliance
- Screenshots only work on tabs matching host_permissions
- Localhost permissions removed for store builds

## Storage Keys

Settings persisted to `chrome.storage.local`:
- `earth_engine_openai_api_key`
- `earth_engine_anthropic_api_key`
- `earth_engine_google_api_key`
- `earth_engine_llm_provider`
- `earth_engine_llm_model`
- `earth_engine_chat_sessions`
- `earth_engine_active_session_id`

## Adding a New AI Provider

1. Add provider package to `package.json`
2. Update `Provider` type in `src/types/extension.ts`
3. Add `create*()` function in `chat-handler.ts`
4. Add API key storage constant and handling
5. Update Settings UI to include provider option
6. Add default model to `DEFAULT_MODELS` in `src/constants/models.ts`

## Updating Model Options

Models defined in `src/constants/models.ts`:

1. Update `AVAILABLE_MODELS` - Add/remove model IDs
2. Update `MODEL_DISPLAY_NAMES` - Human-readable names
3. Update `DEFAULT_MODELS` - Change defaults if needed
4. Build and test: `npm run build`

## Adding a New Tool

1. Create implementation in `src/lib/tools/services/`
2. Add AI tool definition in `src/lib/tools/ai-tools.ts`:
   - Use Vercel AI SDK's `tool()` function
   - Define Zod schema for parameters
   - Implement execute block
3. Add to appropriate tools array in `chat-handler.ts`

## Debugging Tool Execution

- Background script console: Right-click extension icon → "Inspect service worker"
- Content script console: DevTools on Earth Engine tab
- For `window is not defined` errors: Tool called from wrong context

## Helper Functions (`src/lib/utils.ts`)

| Function | Purpose |
|----------|---------|
| `selectBestEarthEngineTab(tabs)` | Smart tab selection with priority |
| `ensureContentScript(tabId)` | Content script readiness check |
| `validateChromeAPIs()` | Chrome API availability check |
| `createResilientFetch(options)` | Network retry with exponential backoff |

## TypeScript Configuration

- Path aliases: `@/*` maps to `src/*`
- Use absolute imports: `import { tool } from '@/lib/tools'`

## UI Component System

- [shadcn/ui](https://ui.shadcn.com/) components
- Tailwind CSS styling
- Radix UI primitives
- Dark mode support via `next-themes`
- Components in `src/components/ui/`

## Important Constraints

- **No Server**: Extension runs entirely client-side
- **Manifest V3**: Must use service workers, not persistent background pages
- **Chrome APIs**: Only available in specific contexts
- **CORS**: Some APIs require special headers (handled automatically)

## MCP Server

### Architecture

```
AI Editor (Claude Code/Cursor/Zed)
    ↓ stdio (MCP Protocol)
MCP Server (earth-agent-mcp)
    ↓ WebSocket (port 3847)
Chrome Extension (Background Script)
    ↓ Chrome APIs
Google Earth Engine Code Editor
```

### Configuration

**Claude Code** (`~/.claude/settings.json`):
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

**Cursor** (`~/.cursor/mcp.json`):
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

### Troubleshooting: "Chrome extension not connected"

```bash
# Kill all instances
pkill -f "earth-agent.*index.js"

# Verify port is free
lsof -i :3847

# Restart your editor
```

See `mcp-server/README.md` for detailed troubleshooting.
