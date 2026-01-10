# Proactive Screenshot Permission UX: Analysis & Plan

**Date:** January 10, 2026
**Context:** Chrome Extension Manifest V3, `activeTab` permission, Google Earth Engine

## 1. The Problem

When the Earth Agent extension is clicked, it often **programmatically opens** a new Google Earth Engine (GEE) tab if one isn't found.

- **Behavior:** The extension opens the tab and the Side Panel appears.
- **The Bug:** Tools like `writeCode` work immediately (due to `host_permissions`), but **`screenshot` fails** with a permission error.
- **Root Cause:**
  - Chrome grants `activeTab` permission **only** to the tab where the user clicked the icon.
  - If the extension opens a _new_ tab, that new tab **does not** inherit the `activeTab` permission.
  - `chrome.tabs.captureVisibleTab` requires strictly `<all_urls>` (which we don't have) or `activeTab`.
  - Result: We own the page script context, but not the pixel capture context.

**Current Workaround (v1.2.2):**
We catch the error and tell the user: _"Screenshot failed... Please click the Earth Agent extension icon..."_

## 2. Proposed Solution: Proactive "Tip Card"

Instead of failing reactively, we want to detect this "Un-Authorized" state and guide the user **proactively**.

### Logic Flow

1.  **State Tracking (`hasScreenshotAccess`)**
    - Maintain a state in the `Chat` component or `TabStatusIndicator`.
    - **Default:** `false` (Pessimistic).
    - **Set to TRUE:** Only when we are certain the user has interacted with the extension _on this specific tab_.

2.  **Detection Heuristics**
    - **Scenario A (Auto-Open):**
      - User clicks extension -> Background script checks tabs -> `chrome.tabs.create(GEE)`.
      - **Signal:** The extension knows it just performed a navigation/creation.
      - **State:** `hasScreenshotAccess = false`.
    - **Scenario B (Manual Navigation):**
      - User is on GEE tab -> Clicks extension icon.
      - **State:** `hasScreenshotAccess = true`.

3.  **UI Component: The "Permission Tip Card"**
    - **Position:** Below the chat header, above the message list.
    - **Content:** "📷 Screenshot access limited. Click the Earth Agent icon in the browser toolbar to enable."
    - **Behavior:**
      - Visible only when `isGEETab && !hasScreenshotAccess`.
      - **Dismissal:**
        - Manual "X" button.
        - **Auto-dismiss:** When the user clicks the extension icon again (re-triggering the Side Panel connection or a specific message).

### Implementation Plan

#### Phase 1: State Management

- Track `programmaticallyOpened` flag in `background/chat-handler.ts` or `background/index.ts`.
- Pass this flag to the UI via `onConnect` or `status` messages.

#### Phase 2: UI Component

- Create `components/ui/PermissionTip.tsx`.
- Style it as a subtle warning (yellow/blue), not an error.

#### Phase 3: The "Re-Click" Detector

- This is tricky. The Side Panel is already open. Clicking the extension icon again **does not** reload the Side Panel in recent Chrome versions (it just focuses it).
- **Workaround:** We might need to listen to `chrome.action.onClicked` in the background script and send a message to the Side Panel: `"ICON_CLICKED"`.
- If the Side Panel receives `"ICON_CLICKED"` while on the active tab, set `hasScreenshotAccess = true` and hide the card.

### Technical Challenges

- **Persistence:** `activeTab` is revoked on navigation. We must reset `hasScreenshotAccess` to `false` on `tabs.onUpdated`.
- **Side Panel Lifecycle:** Determining _exactly_ when `activeTab` is lost is hard without polling permissions (which we can't do easily).

### Recommendation

For the next iteration, start with a **reactive** approach that sets the "Tip Card" visible **after the first failed screenshot attempt**, rather than guessing. This avoids false positives where we annoy users who might actually have permission (e.g., scenarios we missed).
