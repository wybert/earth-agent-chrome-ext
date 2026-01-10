# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) and other coding agents like gemini, cursor, codex, opencode, etc when working with code in this repository.

## Project Overview

Earth Agent is a Chrome extension (Manifest V3) that provides an AI-powered assistant for Google Earth Engine. It can be used right in your browser as a Chrome extension or through MCP server support. It helps you do anything related to Google Earth Engine automatically through chatting (write code, run analysis, debug errors, explain maps, and manage your environment) by intergrating Google Earth Engine tools and AI providers (OpenAI, Anthropic, Google Gemini, Qwen, and Ollama). It can be used withClaude code, cursor or any other AI coding tools or just with extension itself through AI SDK.

## Build and Development Commands

### Building the Extension
```bash
npm run build              # Build extension to dist/ directory
npm run watch             # Build in watch mode for development
npm run dev               # Alias for watch mode
```

### Testing
```bash
npm test                   # Run Jest test suite
npm test:watch            # Run tests in watch mode
```

### Type Checking
```bash
npm run type-check        # Run TypeScript compiler without emitting files
```

### Loading in Chrome for Development
After building, load the extension from the `dist/` directory:
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist/` directory

## Architecture

### Chrome Extension Structure

The extension consists of three main components:

1. **Background Script** (`src/background/index.ts`): Service worker that handles:
   - AI API communication via Vercel AI SDK
   - Message routing between components
   - CORS proxy for Anthropic API
   - Background processing
   - **Service Layer**: Shared logic for tools (`src/lib/tools/services/`)

2. **Content Script** (`src/content/index.ts`): Injected into Earth Engine pages to:
   - Manipulate the Earth Engine Code Editor DOM
   - Execute code and inspect results
   - Listen for commands from the background script

3. **Side Panel UI** (`src/sidepanel/index.tsx`): React-based chat interface that:
   - Renders the chat UI with message history
   - Handles user input and file attachments
   - Displays tool execution results
   - Manages settings and testing panels

### Messaging Architecture

**IMPORTANT**: The extension uses a specific messaging pattern to avoid `window is not defined` errors:

- **UI → Background**: Use `chrome.runtime.sendMessage()` from UI components or library functions
- **Background → Content**: For Earth Engine tools, the AI tool's `execute` block in `chat-handler.ts` must:
  1. Find the Earth Engine tab using `chrome.tabs.query()`
  2. Verify content script is ready by sending `PING` via `chrome.tabs.sendMessage()`
  3. Inject content script if needed using `chrome.scripting.executeScript()`
  4. Send the tool-specific message (e.g., `EDIT_SCRIPT`, `RUN_CODE`) directly via `chrome.tabs.sendMessage()`

**Never call library functions from `src/lib/tools/` directly within AI tool `execute` blocks** - this causes browser API errors in the background service worker context.

### AI Provider Integration

All AI providers are integrated in `src/background/chat-handler.ts`:

```typescript
// Provider configuration
type Provider = 'openai' | 'anthropic' | 'google' | 'qwen' | 'ollama';

// Each provider uses Vercel AI SDK's provider packages:
- createOpenAI() from '@ai-sdk/openai'
- createAnthropic() from '@ai-sdk/anthropic'
- createGoogleGenerativeAI() from '@ai-sdk/google'
- createQwen() from 'qwen-ai-provider'
- createOllama() from 'ollama-ai-provider'
```

The chat handler uses `streamText()` with tool definitions to enable the AI to:
- Edit and run Earth Engine code
- Capture screenshots
- Query Earth Engine documentation via Context7
- Inspect maps and console output

### AI Mode System

The extension supports two operational modes with different capabilities:

1. **Ask Mode (Read-Only)**: Analysis and guidance mode with limited tools
   - Can query documentation, check console, inspect map, take screenshots
   - Cannot modify or execute code
   - System prompt: `GEE_ASK_MODE_PROMPT` from `src/lib/prompts/gee-prompts.ts`

2. **Do Mode (Full Access)**: Full execution mode with all tools
   - All Ask mode capabilities plus code editing and execution
   - Can insert/modify code, run scripts, clear editor, reset environment
   - System prompt: `GEE_DO_MODE_PROMPT` from `src/lib/prompts/gee-prompts.ts`

Mode-specific prompts ensure the AI understands its current capabilities and limitations.

### Tool Implementation Pattern

The project uses a **Service Layer Architecture** to unify tool logic between the Chrome Extension (Agent) and the MCP Server.

1.  **Shared Service Layer** (`src/lib/tools/services/`):
    *   Contains the core business logic for all tools.
    *   **Modules**:
        *   `weather-service.ts`: Open-Meteo integration.
        *   `time-service.ts`: Date/time and wait logic.
        *   `editor-service.ts`: Earth Engine code editor manipulation (read, write, edit, undo).
        *   `gee-service.ts`: GEE execution, console, inspector, and clearing logic.
        *   `browser-service.ts`: Browser automation (screenshots, snapshots, clicks).
        *   `docs-service.ts`: Documentation search.

2.  **Tool Consumers**:
    *   **Agent Tools** (`src/lib/tools/ai-tools.ts`):
        *   Defines Vercel AI SDK tools.
        *   Delegates execution to the shared services.
    *   **MCP Client** (`src/background/mcp-ws-client.ts`):
        *   Handles JSON-RPC requests from external editors (Claude Code, Cursor).
        *   Delegates execution to the *same* shared services.

3.  **Legacy/Supporting Files** (`src/lib/tools/`):
    *   `earth-engine/`, `browser/`, `context7/`: Contain low-level implementation details used by the services.
    *   `ai-tools.ts`: The main entry point for the Agent's tool definitions.

Each service function typically:
- Accepts a `tabId` and necessary arguments.
- Orchestrates lower-level helpers (e.g., `executeInContentScript`, `editor-helpers`).
- Returns a standardized result object.

## Project Structure

```
earth-agent-ai-sdk/
├── src/                    # Source code
│   ├── background/         # Background service worker
│   │   ├── index.ts       # Main message listener and routing
│   │   ├── chat-handler.ts # AI provider integration (~1000 lines)
│   │   ├── mcp-ws-client.ts # WebSocket client for MCP server
│   │   └── shadow-workspace.ts # Shadow workspace management
│   ├── content/           # Content script for Earth Engine pages
│   │   ├── index.ts
│   │   └── dom-helpers.ts # DOM manipulation utilities
│   ├── sidepanel/         # React UI entry point
│   │   └── index.tsx
│   ├── components/        # React components
│   │   ├── Chat.tsx       # Main chat component
│   │   ├── Settings.tsx   # Provider/model configuration
│   │   ├── EarthEngineAgent.tsx
│   │   ├── Onboarding/   # User onboarding flow
│   │   └── ui/           # Reusable UI components (shadcn/ui based)
│   ├── lib/
│   │   ├── prompts/
│   │   │   └── gee-prompts.ts  # All system prompts (Ask/Do modes)
│   │   ├── tools/
│   │   │   ├── ai-tools.ts     # All AI SDK tool definitions (~2000 lines)
│   │   │   ├── services/       # Shared service layer
│   │   │   ├── earth-engine/   # EE-specific tool implementations
│   │   │   ├── browser/        # Browser interaction tools
│   │   │   └── context7/       # Documentation query tools
│   │   └── utils.ts      # Shared utilities
│   ├── hooks/            # React hooks
│   ├── constants/        # Model configs and limits
│   ├── types/            # TypeScript type definitions
│   ├── assets/           # Icons and images
│   └── manifest.json     # Chrome extension manifest
│
├── mcp-server/           # MCP server for external AI editors (npm: earth-agent-mcp)
│   ├── src/
│   │   ├── index.ts     # Main entry point, WebSocket server
│   │   └── tools.ts     # Tool definitions
│   └── package.json
│
├── scripts/               # Utility scripts
│   ├── version-sync.js   # Version synchronization
│   ├── prepare-manifest-for-store.js  # Chrome Web Store prep
│   └── debug/            # Debug and testing scripts
│
├── docs/                  # User-facing documentation
│   ├── index.md          # Documentation landing page
│   ├── TROUBLESHOOTING.md
│   └── RELEASE_NOTES_*.md
│
├── reference/             # Developer reference materials
│   ├── api-models/       # API model definitions (JSON)
│   ├── deploy/           # Deployment guides (Chrome Web Store, etc.)
│   ├── implementation/   # Architecture and design docs
│   ├── testing/          # Test documentation
│   └── samples/          # Sample prompts and test data
│
├── tests/                 # Test files
└── dist/                 # Build output (generated, not committed)
```

**Note:** `AGENT.md` and `GEMINI.md` are symlinks to `CLAUDE.md` for editor compatibility.

### Code Organization Philosophy

The project follows a **single-file pattern** for better maintainability:
- **One prompts file** (`gee-prompts.ts`): All system prompts in one place
- **One AI tools file** (`ai-tools.ts`): All Vercel AI SDK tool definitions together
- **One utils file** (`utils.ts`): All shared helper functions centralized

This approach reduces file fragmentation while maintaining clear separation of concerns.

## File Organization Guidelines

**IMPORTANT**: Keep the root directory clean and organized.

### Root Directory Contents
- Configuration: `package.json`, `tsconfig.json`, `webpack.config.js`, etc.
- Documentation: `README.md`, `CLAUDE.md`, `PRIVACY_POLICY.md`, `CONTRIBUTING.md`, `CHANGELOG.md`
- Project management: `roadmap.md`

### Where to Create New Files

| Type | Location |
|------|----------|
| User docs, release notes | `docs/` |
| Debug/test scripts | `scripts/debug/` |
| API model definitions | `reference/api-models/` |
| Deployment guides | `reference/deploy/` |
| Architecture/design docs | `reference/implementation/` |
| Test documentation | `reference/testing/` |
| Sample data | `reference/samples/` |
| Source code | `src/` subdirectories |

### Never Create in Root
- Debug scripts (`test-*.js`, `analyze-*.js`)
- Implementation notes (`*-ANALYSIS.md`)
- API reference files (`*_models.json`)

## Key Implementation Details

### CORS Handling

The extension handles CORS for Anthropic API by:
1. Including `https://api.anthropic.com/*` in `host_permissions` in manifest.json
2. Using a custom fetch function (`corsProxyFetch`) in `chat-handler.ts` that:
   - Adds required headers (`anthropic-version`, `anthropic-dangerous-direct-browser-access`)
   - Fixes API path to include `/v1/` if missing
   - Handles errors gracefully

### Host Permissions

The extension uses specific host permissions (not `<all_urls>`) for Chrome Web Store compliance:

```json
"host_permissions": [
  "https://code.earthengine.google.com/*",    // Main GEE Code Editor
  "https://code.earthengine.google.co.in/*",  // India regional domain
  "https://earthengine.google.com/*",         // GEE main site
  "https://context7.com/*",                   // Documentation API
  "https://api.anthropic.com/*",              // Anthropic API (CORS)
  "https://www.googleapis.com/upload/drive/v3/*",  // Google Drive uploads
  "http://localhost:*/*",                     // Local Ollama (dev only)
  "http://127.0.0.1:*/*"                      // Local Ollama (dev only)
]
```

**Why specific domains instead of `<all_urls>`:**
- Chrome Web Store requires justification for broad permissions
- Screenshots only work on tabs matching host_permissions
- Localhost permissions are removed for Chrome Web Store builds (see `scripts/prepare-manifest-for-store.js`)

### Storage Keys

Settings are persisted to `chrome.storage.local` with these keys:
- `earth_engine_openai_api_key`
- `earth_engine_anthropic_api_key`
- `earth_engine_google_api_key`
- `earth_engine_qwen_api_key`
- `earth_engine_ollama_api_key`
- `earth_engine_llm_provider`
- `earth_engine_llm_model`
- `earth_engine_chat_sessions` (chat history)
- `earth_engine_active_session_id`

### Ollama-Specific Configuration

Ollama requires:
- Local installation (`ollama serve`)
- CORS enabled: `OLLAMA_ORIGINS="*" ollama serve`
- Base URL defaults to `http://localhost:11434/api`
- Tool support varies by model - check [ollama.com/search](https://ollama.com/search) for "tools" tag

### Testing Framework

The extension has a **Agent Test Panel** (🧪 icon): Automated batch testing with:
   - Multi-prompt execution
   - Configurable delays between tests
   - Screenshot capture and storage options
   - Environment reset controls (map/console clear, editor reload)

## Common Development Workflows

### Adding a New AI Provider

1. Add provider package to `package.json`
2. Update `Provider` type in `chat-handler.ts`
3. Add `create*()` function in `chat-handler.ts`
4. Add API key storage constant and handling
5. Update Settings UI to include provider option
6. Add default model to `DEFAULT_MODELS` constant

### Updating Model Options

Model options are defined in `src/constants/models.ts`. To update available models:

1. **Fetch latest models from API** (optional, to see what's available):
   ```bash
   # OpenAI
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer $OPENAI_API_KEY" | jq '.data[].id' | grep -E "gpt|o[0-9]"

   # Anthropic
   curl https://api.anthropic.com/v1/models \
     --header "x-api-key: $ANTHROPIC_API_KEY" \
     --header "anthropic-version: 2023-06-01" | jq '.data[].id'

   # Google Gemini
   curl "https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI_API_KEY" \
     | jq '.models[].name' | grep -i gemini
   ```

2. **Update `AVAILABLE_MODELS`** - Add/remove model IDs for each provider:
   ```typescript
   export const AVAILABLE_MODELS: Record<ApiProvider, string[]> = {
     openai: ['gpt-5.2', 'gpt-5.2-mini', ...],
     anthropic: ['claude-opus-4-5-20251101', 'claude-sonnet-4-5-20250929', ...],
     google: ['gemini-2.5-pro', 'gemini-3-flash', ...],
     // ...
   };
   ```

3. **Update `MODEL_DISPLAY_NAMES`** - Add human-readable names for new models:
   ```typescript
   export const MODEL_DISPLAY_NAMES: Record<string, string> = {
     'gpt-5.2': 'GPT-5.2 (Latest)',
     'claude-opus-4-5-20251101': 'Claude Opus 4.5 (Best)',
     // ...
   };
   ```

4. **Update `DEFAULT_MODELS`** - Change default if needed:
   ```typescript
   export const DEFAULT_MODELS: Record<ApiProvider, string> = {
     openai: 'gpt-5.2',
     anthropic: 'claude-sonnet-4-5-20250929',
     // ...
   };
   ```

5. **Build and test**: `npm run build`

### Adding a New Tool

1. Create tool implementation in appropriate `src/lib/tools/` subdirectory
2. Export from corresponding `index.ts`
3. Add AI tool definition in `src/lib/tools/ai-tools.ts`:
   - Add new tool using Vercel AI SDK's `tool()` function
   - Define Zod schema for parameters
   - Write clear description for the AI
   - Implement execute block (use helper functions from `utils.ts` if needed)
   - Add tool to the return object of `createAITools()`
4. Import and use the tool in `chat-handler.ts`:
   - Destructure the new tool from `createAITools(onToolEvent)`
   - Add to appropriate tools array (askModeTools or all tools)

### Debugging Tool Execution

- Check background script console: Right-click extension icon → "Inspect service worker"
- Check content script console: Open DevTools on Earth Engine tab
- Use `console.log()` statements - they appear in respective consoles
- For `window is not defined` errors: Tool is being called from wrong context (see Messaging Architecture)

### Helper Functions in utils.ts

The `src/lib/utils.ts` file provides essential helper functions used across the extension:

1. **`selectBestEarthEngineTab(tabs)`**: Smart tab selection with priority order
   - Active tab in current window → Any active tab → Most recently accessed → First tab
   - Used by AI tools to choose the correct Earth Engine tab when multiple are open

2. **`ensureContentScript(tabId)`**: Content script readiness check
   - Pings content script, injects if not loaded
   - Returns `{success: boolean, error?: string}`
   - Used before sending messages to Earth Engine tabs

3. **`validateChromeAPIs()`**: Chrome API availability check
   - Validates `chrome.tabs` and `chrome.scripting` APIs
   - Returns `{success: boolean, error?: string}`
   - Used by tools to fail gracefully in wrong execution contexts

4. **`createResilientFetch(options)`**: Network retry mechanism
   - Exponential backoff for failed requests
   - Configurable retry logic for errors and HTTP responses
   - Used for Anthropic API calls and other external requests

## TypeScript Configuration

Path aliases are configured in `tsconfig.json` and `webpack.config.js`:
- `@/*` maps to `src/*`
- Use absolute imports: `import { tool } from '@/lib/tools'`

## UI Component System

The UI uses [shadcn/ui](https://ui.shadcn.com/) components with:
- Tailwind CSS for styling
- Radix UI primitives
- Dark mode support via `next-themes`
- Components in `src/components/ui/`

## Important Constraints

- **No Server**: Extension runs entirely client-side
- **Manifest V3**: Must use service workers, not persistent background pages
- **Chrome APIs**: Only available in specific contexts (background vs. content vs. sidepanel)
- **Tool Support**: Ollama tool support varies by model; other providers fully support all tools
- **CORS**: Some APIs require proxy or special headers (handled automatically)

## Version Management

### Version Files

Version is synchronized across three files:
- `package.json` - **Source of truth**
- `src/manifest.json` - Chrome extension manifest
- `mcp-server/package.json` - MCP npm package

The Settings UI displays the version dynamically via `chrome.runtime.getManifest().version`.

### Version Sync Script

The `scripts/version-sync.js` script keeps all version files synchronized:

```bash
# Sync from package.json (default)
node scripts/version-sync.js

# Set specific version across all files
node scripts/version-sync.js 1.2.3
```

### Releasing a New Version

```bash
# 1. Bump version (automatically syncs all files via npm hook)
npm version patch   # 1.1.0 → 1.1.1 (bug fixes)
npm version minor   # 1.1.0 → 1.2.0 (new features)
npm version major   # 1.1.0 → 2.0.0 (breaking changes)

# 2. Push commit and tag
git push origin main --follow-tags

# 3. GitHub Actions automatically:
#    - Builds the extension
#    - Verifies version consistency
#    - Creates GitHub release
#    - Uploads to Chrome Web Store

# 4. Publish MCP server to npm (manual step)
cd mcp-server && npm publish
```

### How It Works

1. `npm version` updates `package.json`
2. The `version` npm hook runs `scripts/version-sync.js`
3. Script updates `src/manifest.json` and `mcp-server/package.json`
4. Script stages changed files with `git add`
5. npm creates the version commit and git tag
6. GitHub Actions verifies all versions match the tag before releasing

## MCP Server

The project includes an MCP (Model Context Protocol) server that exposes Earth Engine tools to external AI assistants like Claude Code, Cursor, and Zed.

### npm Package

The MCP server is published to npm as [`earth-agent-mcp`](https://www.npmjs.com/package/earth-agent-mcp).

### Configuration

Users can configure their editors to use the MCP server with npx (no build required):

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

**Zed** (`~/.config/zed/settings.json`):
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

### MCP Server Architecture

```
AI Editor (Claude Code/Cursor/Zed)
    ↓ stdio (MCP Protocol)
MCP Server (earth-agent-mcp)
    ↓ WebSocket (port 3847)
Chrome Extension (Background Script)
    ↓ Chrome APIs
Google Earth Engine Code Editor
```

### MCP Server Files

- `mcp-server/src/index.ts`: Main entry point, WebSocket server, MCP protocol handler
- `mcp-server/src/tools.ts`: Tool definitions (17 tools)
- `mcp-server/package.json`: npm package configuration

### Publishing Updates to npm

After releasing a new version (see Version Management section above):
```bash
cd mcp-server
npm publish
```

Note: The version is automatically synced when you run `npm version` in the root directory.

### Troubleshooting: "Chrome extension not connected"

This error occurs when multiple MCP server instances compete for port 3847. Solution:

```bash
# Kill all instances
pkill -f "earth-agent.*index.js"

# Verify port is free
lsof -i :3847

# Restart your editor - it will spawn a fresh MCP server
```

See `mcp-server/README.md` for detailed troubleshooting guide.

- remeber to use chrome devtools mcp when you need interact with gee, and when you need run code in gee console
- you don't do any git commit and any other git commands that change could change the git history
