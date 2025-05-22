# Active Context: Google Earth Engine Agent

## Current Work Focus (Updated May 22, 2025)

Building the Google Earth Engine Agent Chrome Extension. The primary focus areas recently have been:

1.  **Implementing Core Earth Engine Tools:** Adding capabilities for the AI to interact with the Earth Engine Code Editor (inserting and running code).
2.  **Resolving Background Script Execution Issues:** Fixing the `window is not defined` error that occurred when AI tools tried to perform DOM actions from the background script.
3.  **Refining Extension Architecture:** Clarifying the communication patterns between the background script, content script, and UI, especially regarding how AI tools vs. direct UI actions invoke Earth Engine functions.
4.  **Optimizing Background Script:** Streamlining the main message listener in `src/background/index.ts` to handle direct tool calls from the UI/content script efficiently.
5.  **Adding Multi-Modal Capabilities:** Implementing tools that can return images and other rich content directly in the AI response.

## Recent Changes

### Completed
- **Earth Engine AI Tools Added:**
  - Implemented `earthEngineScriptTool` in `chat-handler.ts` for inserting code into the EE editor.
  - Implemented `earthEngineRunCodeTool` in `chat-handler.ts` for executing code directly in the EE environment.
  - Implemented `screenshotTool` with multi-modal response support to capture and display the current browser tab.
- **Multi-Modal Response Support:**
  - Added proper `experimental_toToolResultContent` implementation for Anthropic models to support image responses.
  - Fixed data URL handling to extract proper base64 content for the Anthropic API.
  - Ensured correct image MIME type specifications for multi-modal responses.
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
- Testing the newly implemented `earthEngineScriptTool`, `earthEngineRunCodeTool`, and `screenshotTool`.
- Implementing handlers for remaining Earth Engine tools (`GET_MAP_LAYERS`, `INSPECT_MAP`, `CHECK_CONSOLE`, `GET_TASKS`) in the background script listener (`index.ts`) and as AI tools (`chat-handler.ts`).
- Further refining error handling and user feedback for tool execution.
- Exploring additional multi-modal capabilities for rich visualization of Earth Engine data.

## Current Challenges

- Ensuring robust communication between background and content scripts, especially after tab reloads or extension updates.
- Providing clear and actionable error messages to the user when tool execution fails.
- Handling potential timing issues between script injection and message sending.
- Optimizing image capture and resizing for multi-modal responses to balance quality and performance.

## Next Steps

### Immediate (Next 1-2 Days)
1. Thoroughly test the `earthEngineScriptTool`, `earthEngineRunCodeTool`, and `screenshotTool` via AI interaction.
2. Implement the background listener cases and AI tool definitions for `GET_MAP_LAYERS` and `INSPECT_MAP`.
3. Update the system prompt (`GEE_SYSTEM_PROMPT`) to include instructions for the screenshot tool and better guidance on visual outputs.

### Short-term (Next Week)
1. Implement the remaining Earth Engine tools (`CHECK_CONSOLE`, `GET_TASKS`).
2. Add more comprehensive logging throughout the message passing flow.
3. Refine the UI to provide better feedback during tool execution (e.g., loading indicators, success/error messages).
4. Optimize screenshot capture quality, size, and performance.

## Open Questions

- What is the most user-friendly way to present tool execution results (success/failure/data) in the chat UI?
- How should errors originating from the Earth Engine environment itself (e.g., script runtime errors) be captured and reported back through the tools?
- What additional multi-modal capabilities would be most valuable for Earth Engine users (e.g., map layer previews, spectral signature charts)?
- How to best balance image quality and performance when capturing screenshots of Earth Engine visualizations?

## Recent Learnings

- Background scripts (service workers) cannot directly access `window` or `document` objects.
- Actions requiring page interaction *must* be delegated to a content script via message passing (`chrome.tabs.sendMessage`).
- AI tool definitions (`tool({...})` in `chat-handler.ts`) execute *within the background script context* and must adhere to its limitations.
- Reusable library functions (like those in `src/lib/`) can be designed for cross-context use, but their direct invocation from the background script might still fail if they internally attempt DOM access without proper delegation via messaging.
- Centralizing tab finding and content script communication logic (like in `sendMessageToEarthEngineTab`) reduces code duplication in the main background listener.
- When implementing multi-modal responses with the Anthropic API:
  - The API expects raw base64 data without the data URL prefix (e.g., "data:image/jpeg;base64,").
  - Use `experimental_toToolResultContent` to properly format tool responses with images.
  - The image data must be formatted as `{ type: 'image', data: base64Data, mimeType: 'image/jpeg' }`.

## Decision Log

- **Multi-Modal Tool Implementation** (2025-05-22)
  - **Decision:** Implement `screenshotTool` with proper multi-modal response support using `experimental_toToolResultContent`.
  - **Rationale:** Enables rich visual feedback in AI responses, especially for troubleshooting Earth Engine visualizations.
  - **Implementation:** Extract base64 data from data URLs and format with proper MIME type for Anthropic API.

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
