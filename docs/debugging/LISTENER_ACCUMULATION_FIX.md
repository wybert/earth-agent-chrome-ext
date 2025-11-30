# Content Script Listener Accumulation Fix (v2 - Improved Singleton)

## Problem Summary

**Issue**: Agent was pasting and executing the same Google Earth Engine code multiple times (2-4 times) when asked to perform tasks like calculating NDVI for Singapore.

**Root Cause**: Multiple content script instances were accumulating during hot reloads, and the initial singleton mechanism (v1) failed to prevent duplicate instances from handling messages.

## Evidence from Diagnostic Logs

The diagnostic logs revealed the smoking gun:

```
VM1950 content.js:4077 Content script received message: RUN_CODE
VM1950 content.js:4270 Handling RUN_CODE message with code: ...
VM1950 content.js:4292 Code inserted successfully, waiting before running...
VM1950 content.js:4319 Clicking run button

VM1960 content.js:4077 Content script received message: RUN_CODE
VM1960 content.js:4270 Handling RUN_CODE message with code: ...
VM1960 content.js:4292 Code inserted successfully, waiting before running...
VM1960 content.js:4319 Clicking run button

content.js:4077 Content script received message: RUN_CODE
content.js:4270 Handling RUN_CODE message with code: ...
content.js:4292 Code inserted successfully, waiting before running...
content.js:4319 Clicking run button
```

**Three separate content script instances** (VM1950, VM1960, and base content.js) were all responding to the SAME `RUN_CODE` message, each inserting code and clicking the run button.

## User Discovery

The user discovered that **reloading the extension fixed the issue**. This was the critical clue that pointed to state accumulation rather than a logic error.

## Code Analysis

### Before Fix

The content script had **TWO separate message listeners**:

1. **`setupPingResponse()` function** (lines 144-161):
   - Added a dedicated listener for PING messages
   - Called on initialization

2. **Main message listener** (line 164):
   - Handled ALL messages including PING
   - Also registered on initialization

**Problem**: During hot reloads in development mode:
- Each time the content script was re-injected, BOTH listeners were added again
- Old listeners were NOT removed
- Result: Multiple listeners accumulated, each processing the same messages
- Example: After 3 hot reloads, there would be 6 listeners (2 per reload × 3 reloads)

### After Fix

**Solution implemented in** `src/content/index.ts`:

1. **Removed duplicate `setupPingResponse()` function** entirely
2. **Consolidated to a single message listener** that handles ALL message types including PING
3. **Added guard to prevent duplicate listener registration**:

```typescript
// Track if message listener has been added to prevent duplicates
let messageListenerAdded = false;

// Single message listener to handle ALL messages (including PING)
// This prevents duplicate listener registration during hot reloads
if (!messageListenerAdded) {
  console.log(`🔧 [Content Script][${INSTANCE_TIMESTAMP}] Adding message listener (single instance)`);
  messageListenerAdded = true;

  chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
    // Handle all messages here
    switch (message.type) {
      case 'PING':
        // Consolidated PING handling here
        console.log('Received PING from background script, responding...');
        sendResponse({
          success: true,
          message: 'Content script is active',
          timestamp: Date.now(),
          url: window.location.href
        });
        pingAttempts = 0;
        backgroundConnectionVerified = true;
        return true;

      case 'RUN_CODE':
        // Handle code execution
        // ...

      // All other message types
    }
  });
} // End of messageListenerAdded check
```

## Why This Fix Works (v2)

### Version 1 Issues (Discovered After Initial Fix)

After the first fix, we discovered that:
- The singleton pattern detected duplicate instances ✅
- Each instance only registered one listener ✅
- **BUT**: Both instances continued to handle messages ❌

**Why v1 Failed**:
```typescript
// v1 approach
if (INSTANCE_TIMESTAMP <= existingTimestamp) {
  throw new Error('Exiting duplicate instance');
}
```

`throw new Error()` doesn't stop JavaScript execution - the listener was still registered after the error was thrown!

### Version 2 Improvements

1. **`shouldExecute` Flag**: Added a boolean flag that controls whether this instance should operate
2. **Runtime Deactivation Check**: Listener checks `shouldExecute` on EVERY message
3. **Global Deactivation Signal**: Newer instances can signal older instances to stop via `window[CONTENT_SCRIPT_ID + '_shouldExecute']`
4. **Conditional Registration**: Listeners, initialization, and periodic checks only run if `shouldExecute === true`

```typescript
// v2 approach
let shouldExecute = true;

if ((window as any)[CONTENT_SCRIPT_ID]) {
  if (INSTANCE_TIMESTAMP > existingTimestamp) {
    // Newer instance - take over and signal old instance to stop
    (window as any)[CONTENT_SCRIPT_ID + '_shouldExecute'] = false;
  } else {
    // Older instance - don't execute
    shouldExecute = false;
    isContextInvalidated = true;
  }
}

// Only register listener if shouldExecute
if (shouldExecute && !messageListenerAdded) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Check on EVERY message
    if (!shouldExecute || (window as any)[CONTENT_SCRIPT_ID + '_shouldExecute'] === false) {
      return false; // Don't handle
    }
    // Process message...
  });
}
```

## Files Modified

- `src/content/index.ts`:
  - Removed `setupPingResponse()` function
  - Consolidated all message handling into single listener
  - Added `messageListenerAdded` guard
  - Updated PING case to include all functionality from setupPingResponse
  - Removed `setupPingResponse()` calls from initialization

## Testing Instructions

### Before Testing
1. Build the extension: `npm run build`
2. Reload the extension in Chrome
3. Open Google Earth Engine Code Editor
4. Open Chrome DevTools on the GEE page (Console tab)

### Test 1: Normal Operation
1. In the extension sidepanel, send a request:
   ```
   Please load the latest Sentinel-2 images and calculate NDVI for Singapore
   ```
2. Watch the GEE console for output
3. **Expected**: Code should be inserted and executed ONCE
4. **Verify**: Only ONE set of logs showing:
   - `Content script received message: RUN_CODE`
   - `Handling RUN_CODE message with code: ...`
   - `Code inserted successfully, waiting before running...`
   - `Clicking run button`

### Test 2: Hot Reload Stress Test
1. Reload the extension
2. Make a small change to `src/content/index.ts` to trigger hot reload
3. Repeat step 2 multiple times (5-10 times)
4. Send the same test request
5. **Expected**: Code should still be executed ONCE
6. **Verify**: DevTools console should show only ONE instance handling the message

### Test 3: Multiple Tabs
1. Open multiple GEE Code Editor tabs
2. Send a request
3. **Expected**: Only the active/selected tab should execute the code once

## Verification of Fix

Look for this log in the GEE page DevTools console:
```
🔧 [Content Script][1234567890123] Adding message listener (single instance)
```

You should see this message **only once** per content script instance, even after multiple hot reloads.

If you see this message multiple times with the SAME timestamp, the fix is not working correctly.

## Related Documentation

- `docs/debugging/RELOAD_FIXES_ISSUE_ANALYSIS.md` - Initial root cause analysis
- `docs/debugging/DIAGNOSTIC_LOGGING_GUIDE.md` - How diagnostic logging helped identify the issue
- `docs/debugging/DUPLICATE_CODE_EXECUTION_BUG.md` - Original bug report and analysis

## Prevention Going Forward

**Rule**: Only register `chrome.runtime.onMessage.addListener` **ONCE** per content script.

**Best Practice**: If you need specialized handling for specific message types, use a switch statement within a single listener rather than creating multiple listeners.

**Bad Pattern** ❌:
```typescript
// DON'T DO THIS - Multiple listeners
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'PING') { /* handle ping */ }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'RUN_CODE') { /* handle run code */ }
});
```

**Good Pattern** ✅:
```typescript
// DO THIS - Single listener with switch
let listenerAdded = false;
if (!listenerAdded) {
  listenerAdded = true;
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    switch (msg.type) {
      case 'PING': /* handle ping */ break;
      case 'RUN_CODE': /* handle run code */ break;
      // ... other cases
    }
  });
}
```

## Acknowledgments

This fix was made possible by:
1. **User's diagnostic observation**: Discovering that reloading the extension fixed the issue
2. **Comprehensive diagnostic logging**: Added execution IDs and detailed logging in ai-tools.ts and chat-handler.ts
3. **Detailed log analysis**: Identifying three separate content script instances all processing the same messages
