# Active Context: Google Earth Engine Agent

## Current Work Focus (Updated August 6, 2024)

Building the Google Earth Engine Agent Chrome Extension. The primary focus areas recently have been:

1.  **Implementing Core Earth Engine Tools:** Adding capabilities for the AI to interact with the Earth Engine Code Editor (inserting and running code).
2.  **Resolving Background Script Execution Issues:** Fixing the `window is not defined` error that occurred when AI tools tried to perform DOM actions from the background script.
3.  **Refining Extension Architecture:** Clarifying the communication patterns between the background script, content script, and UI, especially regarding how AI tools vs. direct UI actions invoke Earth Engine functions.
4.  **Optimizing Background Script:** Streamlining the main message listener in `src/background/index.ts` to handle direct tool calls from the UI/content script efficiently.

## Recent Changes

### Completed
- **Earth Engine AI Tools Added:**
  - Implemented `earthEngineScriptTool` in `chat-handler.ts` for inserting code into the EE editor.
  - Implemented `earthEngineRunCodeTool` in `chat-handler.ts` for executing code directly in the EE environment.
- **`window is not defined` Error Fixed:**
  - Refactored the `execute` blocks within `earthEngineScriptTool` and `earthEngineRunCodeTool` in `chat-handler.ts`.
  - These blocks now correctly handle finding the EE tab, checking/injecting the content script, and sending messages (`EDIT_SCRIPT`, `RUN_CODE`) directly to the content script using `chrome.tabs.sendMessage`.
  - This avoids calling the `editScript()` / `runCode()` library functions directly from the background context, which was causing the error.
- **Background Script Listener Optimized:**
  - Refactored the main `chrome.runtime.onMessage` listener in `src/background/index.ts`.
  - Added specific cases for `EDIT_SCRIPT`, `RUN_CODE`, `GET_MAP_LAYERS`, etc., routing them to the `sendMessageToEarthEngineTab` helper function.
  - Included handlers for `CONTENT_SCRIPT_LOADED` and `CONTENT_SCRIPT_HEARTBEAT` for better content script readiness tracking.
  - Removed redundant logic previously duplicated in the listener.
- **Architectural Clarification:**
  - Confirmed `src/lib/tools/earth-engine/` as the correct location for reusable tool functions (like `editScript.ts`, `runCode.ts`).
  - Distinguished the role of these library functions (called by UI, use `runtime.sendMessage`) from the AI tool definitions in `chat-handler.ts` (handle AI invocation, use `tabs.sendMessage`).

### In Progress
- Testing the newly implemented `earthEngineScriptTool` and `earthEngineRunCodeTool`.
- Implementing handlers for remaining Earth Engine tools (`GET_MAP_LAYERS`, `INSPECT_MAP`, `CHECK_CONSOLE`, `GET_TASKS`) in the background script listener (`index.ts`) and as AI tools (`chat-handler.ts`).
- Further refining error handling and user feedback for tool execution.

## Current Challenges

- Ensuring robust communication between background and content scripts, especially after tab reloads or extension updates.
- Providing clear and actionable error messages to the user when tool execution fails.
- Handling potential timing issues between script injection and message sending.

## Next Steps

### Immediate (Next 1-2 Days)
1. Thoroughly test the `earthEngineScriptTool` and `earthEngineRunCodeTool` via AI interaction.
2. Implement the background listener cases and AI tool definitions for `GET_MAP_LAYERS` and `INSPECT_MAP`.
3. Update the system prompt (`GEE_SYSTEM_PROMPT`) to include instructions for any newly added tools.

### Short-term (Next Week)
1. Implement the remaining Earth Engine tools (`CHECK_CONSOLE`, `GET_TASKS`).
2. Add more comprehensive logging throughout the message passing flow.
3. Refine the UI to provide better feedback during tool execution (e.g., loading indicators, success/error messages).

## Open Questions

- What is the most user-friendly way to present tool execution results (success/failure/data) in the chat UI?
- How should errors originating from the Earth Engine environment itself (e.g., script runtime errors) be captured and reported back through the tools?

## Recent Learnings

- Background scripts (service workers) cannot directly access `window` or `document` objects.
- Actions requiring page interaction *must* be delegated to a content script via message passing (`chrome.tabs.sendMessage`).
- AI tool definitions (`tool({...})` in `chat-handler.ts`) execute *within the background script context* and must adhere to its limitations.
- Reusable library functions (like those in `src/lib/`) can be designed for cross-context use, but their direct invocation from the background script might still fail if they internally attempt DOM access without proper delegation via messaging.
- Centralizing tab finding and content script communication logic (like in `sendMessageToEarthEngineTab`) reduces code duplication in the main background listener.

## Decision Log

- **AI Tool Implementation Pattern (Fix)** (2024-08-06)
  - **Decision:** AI tools in `chat-handler.ts` requiring page interaction must implement tab finding, content script validation, and use `chrome.tabs.sendMessage` directly within their `execute` block.
  - **Rationale:** Avoids `window is not defined` error caused by calling library functions with incompatible environment detection/actions from the background script.
  - **Trade-offs:** Some duplication of communication logic between tool definitions, but necessary for correct execution context handling.

- **Background Listener Optimization** (2024-08-06)
  - **Decision:** Route direct tool calls (from UI/CS) in `src/background/index.ts` through the centralized `sendMessageToEarthEngineTab` helper.
  - **Rationale:** Reduces redundancy, improves maintainability.

- **Tool Function Location** (2024-08-06)
  - **Decision:** Keep core tool logic (like `editScript`, `runCode`) in `src/lib/tools/earth-engine/`.
  - **Rationale:** Logical separation, allows direct import/use by UI components.

## Current Focus (Updated August 5, 2024)

We are building a Google Earth Engine Agent Chrome Extension that helps users work with Earth Engine for geospatial analysis.

### Recently Completed Changes

1. **Architectural Consolidation**: Removed hybrid Next.js/Chrome Extension structure in favor of a pure extension architecture:
   - Moved API logic from `src/api/chat.ts` to a dedicated `src/background/chat-handler.ts` handler
   - Simplified the chat component to only communicate with the background script
   - Removed API key references from UI component message payloads
   - Added architecture documentation
   - Deleted obsolete files (`src/app/api/chat/route.ts`, `src/hooks/useExtensionChat.ts`, `src/api/chat.ts`, `src/background/routes.ts`)

2. **Tool Implementation Improvements**:
   - Added comprehensive Earth Engine dataset documentation tool in `chat-handler.ts`
   - Configured the tool to use Context7 for retrieving dataset information
   - Built in a fallback mechanism that automatically switches to direct API calls when Chrome messaging fails
   - Added detailed logging to track tool usage and performance

3. **Agent Workflow Enhancement**:
   - Updated system prompt with a structured workflow for handling map-related questions
   - Implemented a chaining workflow pattern where the agent first retrieves dataset information before generating code
   - Added specific instructions for dataset-driven code examples
   - Improved tool usage instructions for the AI agent

### Current Status

The extension now has:
- A streamlined architecture with the background script as the central hub
- An AI assistant with specialized knowledge of Earth Engine
- Tools for retrieving weather information and Earth Engine dataset documentation
- A well-defined workflow for generating code examples based on dataset information

### Next Steps

1. **Testing and Refinement**:
   - Test the Earth Engine dataset tool with various queries
   - Evaluate the quality of generated code examples
   - Monitor and optimize tool performance

2. **Extension Functionality**:
   - Consider adding more specialized tools for Earth Engine tasks
   - Explore opportunities for interactive visualizations
   - Evaluate user experience and refine UI components as needed

3. **Documentation**:
   - Enhance user documentation with examples of dataset-related queries
   - Update developer documentation with the new architecture details
   - Create examples of effective prompts for interacting with the AI assistant 