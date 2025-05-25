# Active Context: Google Earth Engine Agent

## Current Work Focus (Updated May 23, 2025)

Building the Google Earth Engine Agent Chrome Extension. The primary focus areas recently have been:

1.  **Implementing and Refining Browser Tools:**
    *   Added `getElementByRefId` to `getElement.ts` and `ToolsTestPanel.tsx`, including logic to traverse open shadow DOMs.
    *   Implemented `clickByCoordinates` in `click.ts`, ensuring correct message routing from `ToolsTestPanel.tsx` through the background script to the content script.
2.  **Ensuring Robust Message Handling:**
    *   Corrected message handling in the background script (`src/background/index.ts`) for new browser tool types like `GET_ELEMENT_BY_REF_ID` and `CLICK_BY_COORDINATES`.
    *   Addressed and fixed the "Extension context invalidated" error in `src/content/index.ts` by adding runtime error checks.
3.  **UI Test Panel Enhancements:** Updated `ToolsTestPanel.tsx` to accurately test new and existing browser tool functionalities, including `getElementByRefId` and the different click methods.
4.  **Cross-Script Communication:** Refined communication pathways for browser tools, ensuring proper delegation from UI components to library functions, then to the background script, and finally to the content script for DOM interaction.

## Recent Changes

### Completed
- **Browser Tools Added/Enhanced:**
  - Implemented `getElementByRefId` in `getElement.ts`, `index.ts` (browser tools), `ToolsTestPanel.tsx`, and corresponding message handling in background/content scripts. Includes recursive search for elements within open shadow DOMs.
  - Implemented `clickByCoordinates` in `click.ts`, `index.ts` (browser tools), `ToolsTestPanel.tsx`, and corresponding message handling in background/content scripts.
  - Corrected `ToolsTestPanel.tsx` to use `clickByCoordinates` when the "coordinates" click method is selected, resolving incorrect `click` (by ref) calls.
  - Updated `hover.ts` to correctly export `HoverParams` and `HoverResponse` types, and updated `index.ts` (browser tools) accordingly.
  - Ensured `type.ts` default export is correctly aliased and used in `index.ts` (browser tools).
- **Background Script Enhancements:**
  - Added specific message handling cases in `src/background/index.ts` for `GET_ELEMENT_BY_REF_ID` and `CLICK_BY_COORDINATES`, ensuring they are forwarded to the content script via `sendMessageToEarthEngineTab`.
- **Content Script Fixes:**
  - Implemented a fix in `src/content/index.ts` for the "Extension context invalidated" error by checking `chrome.runtime.lastError` in message responses and heartbeat checks.
  - Added `handleExecuteClickByCoordinates` in `src/content/index.ts` to perform clicks using `document.elementFromPoint`.
  - Updated `handleGetElementByRefId` in `src/content/index.ts` to recursively search shadow DOMs.
- **Architectural Clarification:**
  - Reinforced the pattern of UI components calling library functions (`src/lib/tools/browser/`), which then message the background script, which in turn messages the content script for DOM manipulations.

### In Progress
- Thoroughly testing all browser tools, especially edge cases with shadow DOM and various GEE interface states.
- Monitoring for any unintended page refreshes or side effects from DOM traversal tools like `getElementByRefId`.
- Implementing handlers for remaining Earth Engine tools (`GET_MAP_LAYERS`, `INSPECT_MAP`, `CHECK_CONSOLE`, `GET_TASKS`) in the background script listener (`index.ts`) and as AI tools (`chat-handler.ts`).
- Further refining error handling and user feedback for tool execution across all tool types.

## Current Challenges

- Ensuring DOM manipulation tools (`click`, `getElementByRefId`) are consistently non-disruptive to complex web applications like Google Earth Engine, especially concerning page refreshes.
- Providing clear and actionable error messages to the user when tool execution fails, distinguishing between tool errors and application-specific errors.
- Handling potential timing issues between script injection and message sending, though current ping/heartbeat mechanisms mitigate this.

## Next Steps

### Immediate (Next 1-2 Days)
1.  Conduct extensive testing of `getElementByRefId` and `clickByCoordinates` on the live Google Earth Engine site to check for stability and unintended side-effects.
2.  Implement the background listener cases and AI tool definitions for `GET_MAP_LAYERS` and `INSPECT_MAP`.
3.  Review and update the system prompt (`GEE_SYSTEM_PROMPT`) to reflect the capabilities of the new/updated browser tools if relevant for AI interaction.

### Short-term (Next Week)
1.  Implement the remaining Earth Engine tools (`CHECK_CONSOLE`, `GET_TASKS`).
2.  Add more comprehensive logging throughout the message passing flow for browser tools.
3.  Refine the UI of `ToolsTestPanel.tsx` if further testing reveals usability issues.

## Open Questions

- What is the most robust way to identify and interact with elements in dynamic, complex web applications like GEE, balancing specificity with resilience to UI changes? (Ongoing)
- How to best differentiate between an element *not found* versus an error during the *search process* for tools like `getElementByRefId`?
- Could a more targeted shadow DOM query be implemented for `getElementByRefId` if `querySelectorAll('*')` proves too performance-intensive or disruptive on GEE?

## Recent Learnings

- DOM traversal for `getElementByRefId` using `querySelectorAll('*')` and recursive shadow DOM search is effective but can be intensive on complex pages like GEE, potentially triggering side effects.
- Correctly routing messages for new tools (`CLICK_BY_COORDINATES`, `GET_ELEMENT_BY_REF_ID`) requires updates at multiple levels: UI (`ToolsTestPanel.tsx`), browser tool library (`click.ts`, `getElement.ts`), browser tool index (`index.ts`), background script listener (`background/index.ts`), and content script handler (`content/index.ts`).
- The "Extension context invalidated" error can often be mitigated by checking `chrome.runtime.lastError` in asynchronous callbacks within content scripts, particularly for `sendMessage` responses.
- `document.elementFromPoint(x, y)` is the standard way to get the topmost element at specific coordinates, which is then used for programmatic clicks.

## Decision Log

- **Shadow DOM Traversal for `getElementByRefId`** (2025-05-23)
  - **Decision:** Implement recursive search through open shadow DOMs using `querySelectorAll('*')` in `src/content/index.ts` for `handleGetElementByRefId`.
  - **Rationale:** Necessary to locate elements with `aria-ref` that might be nested within shadow boundaries.
  - **Trade-offs:** Potentially performance-intensive on very complex DOMs; risk of unintended side-effects on the target page (e.g., GEE refresh). Monitor and optimize if issues persist.

- **`clickByCoordinates` Implementation** (2025-05-23)
  - **Decision:** Add a new `clickByCoordinates` tool, distinct from the ref-based `click` tool. Implement full message flow from UI to content script.
  - **Rationale:** Provides a necessary way to interact with the page when element selectors or refs are not available or practical. Fixes previous incorrect usage of ref-based click for coordinate actions in `ToolsTestPanel.tsx`.
  - **Implementation:** UI calls `clickByCoordinates` lib function -> sends `CLICK_BY_COORDINATES` message to background -> background forwards to content script -> content script uses `document.elementFromPoint` and dispatches mouse events.

- **Fix for "Extension context invalidated"** (2025-05-23)
  - **Decision:** Add `chrome.runtime.lastError` checks in `src/content/index.ts` within `sendMessage` callbacks and heartbeat logic.
  - **Rationale:** Prevents the extension from crashing or behaving erratically when the communication channel to the background script is lost (e.g., after an extension reload or crash).
  - **Action:** Cease further operations or self-checks if context is invalidated.
