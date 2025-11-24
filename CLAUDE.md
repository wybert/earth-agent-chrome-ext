# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Earth Agent is a Chrome extension (Manifest V3) that provides an AI-powered assistant for Google Earth Engine. It integrates multiple AI providers (OpenAI, Anthropic, Google Gemini, Qwen, and Ollama) using the Vercel AI SDK to help users write, run, and debug Earth Engine code directly in the browser.

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
npm run test:context7     # Test Context7 tool integration
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

Tools are organized in three categories under `src/lib/tools/`:

1. **Earth Engine Tools** (`earth-engine/`):
   - `editScript.ts`: Insert/modify code in the EE editor
   - `runCode.ts`: Execute code and capture results
   - `checkConsole.ts`: Read console errors/output
   - `inspectMap.ts`: Inspect map at coordinates
   - `getMapLayers.ts`: Get current map layers
   - `getTasks.ts`: Check EE task status
   - `agentTools.ts`: Simplified wrappers for AI agents

2. **Browser Tools** (`browser/`):
   - `screenshot.ts`: Capture page screenshots
   - `snapshot.ts`: Get DOM structure snapshot
   - `click.ts`, `type.ts`, `hover.ts`: Basic interactions
   - `getElement.ts`: Query DOM elements

3. **Context7 Tools** (`context7/`):
   - `getDocumentation.ts`: Fetch Earth Engine docs
   - `resolveLibraryId.ts`: Resolve Context7 library IDs
   - `agentTools.ts`: AI-friendly wrappers

4. **AI Tools** (`ai-tools.ts`):
   - Centralized location for all Vercel AI SDK tool definitions
   - Uses factory pattern: `createAITools(onToolEvent)` returns all 10 AI tools
   - Includes tools for: weather, datasets, script editing, code execution, screenshots, snapshots, clicking, and environment reset
   - Leverages helper functions from `src/lib/utils.ts` for tab selection, content script injection, and API validation

Each tool typically has:
- A base implementation that works from UI/content contexts
- An AI tool wrapper defined in `src/lib/tools/ai-tools.ts` using Vercel AI SDK's `tool()` function
- Environment detection via `detectEnvironment()` to handle different execution contexts

## Project Structure

```
src/
├── background/         # Background service worker
│   ├── index.ts       # Main message listener and routing
│   └── chat-handler.ts # AI provider integration (806 lines, refactored)
├── content/           # Content script for Earth Engine pages
│   └── index.ts
├── sidepanel/         # React UI entry point
│   └── index.tsx
├── components/        # React components
│   ├── Chat.tsx       # Main chat component with Help button
│   ├── Settings.tsx   # Provider/model configuration
│   ├── EarthEngineAgent.tsx
│   └── ui/           # Reusable UI components (shadcn/ui based)
├── lib/
│   ├── prompts/
│   │   └── gee-prompts.ts  # All system prompts (Ask/Do modes)
│   ├── tools/
│   │   ├── ai-tools.ts     # All AI SDK tool definitions (1,256 lines)
│   │   ├── earth-engine/   # EE-specific tool implementations
│   │   ├── browser/        # Browser interaction tools
│   │   └── context7/       # Documentation query tools
│   ├── utils.ts      # Shared utilities (255 lines: detectEnvironment,
│   │                 # tab selection, content script injection, resilient fetch)
│   └── audio-utils.ts
├── hooks/            # React hooks
├── types/            # TypeScript type definitions
│   ├── extension.ts  # Extension-specific types
│   └── chrome.d.ts   # Chrome API type extensions
├── assets/           # Icons and images
└── manifest.json     # Chrome extension manifest
```

### Code Organization Philosophy

The project follows a **single-file pattern** for better maintainability:
- **One prompts file** (`gee-prompts.ts`): All system prompts in one place
- **One AI tools file** (`ai-tools.ts`): All Vercel AI SDK tool definitions together
- **One utils file** (`utils.ts`): All shared helper functions centralized

This approach reduces file fragmentation while maintaining clear separation of concerns.

## Key Implementation Details

### CORS Handling

The extension handles CORS for Anthropic API by:
1. Including `https://api.anthropic.com/*` in `host_permissions` in manifest.json
2. Using a custom fetch function (`corsProxyFetch`) in `chat-handler.ts` that:
   - Adds required headers (`anthropic-version`, `anthropic-dangerous-direct-browser-access`)
   - Fixes API path to include `/v1/` if missing
   - Handles errors gracefully

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

The extension includes two testing panels:

1. **Tools Test Panel** (🔧 icon): Manual testing of individual tools
2. **Agent Test Panel** (🧪 icon): Automated batch testing with:
   - Multi-prompt execution
   - Configurable delays between tests
   - Screenshot capture and storage options (local, downloads, Google Drive)
   - Environment reset controls (map/console clear, editor reload)

## Common Development Workflows

### Adding a New AI Provider

1. Add provider package to `package.json`
2. Update `Provider` type in `chat-handler.ts`
3. Add `create*()` function in `chat-handler.ts`
4. Add API key storage constant and handling
5. Update Settings UI to include provider option
6. Add default model to `DEFAULT_MODELS` constant

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

## Memory Bank

The `memory-bank/` directory contains project documentation:
- `techContext.md`: Technical implementation details
- `activeContext.md`: Current development status
- `progress.md`: Project milestones and progress
- `productContext.md`: Product requirements
- `systemPatterns.md`: Design patterns and conventions

These are useful references but may not always be up-to-date with the code.

## Release Process

Releases are automated via GitHub Actions:
```bash
git tag v1.0.0
git push origin v1.0.0
# GitHub Actions will build, test, and create release
```
- remeber to use chrome devtools mcp when you need interact with gee, and when you need run code in gee console