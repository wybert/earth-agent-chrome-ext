# Browser Automation Tools

This module provides a collection of tools for browser automation that can be used in Chrome extensions. These tools allow for common browser interaction tasks like taking screenshots, capturing accessibility snapshots, clicking elements, typing text, and inspecting elements on a page.

**Note**: The click tool now uses element references from accessibility snapshots (matching playwright-mcp implementation) instead of CSS selectors for more reliable automation.

## Features

- Cross-environment compatibility (works in content scripts, background scripts, and sidepanels)
- Automatic message passing between extension contexts
- Error handling and timeout management
- Support for standard browser automation tasks
- Accessibility-based element targeting for reliable automation

## Tools

### Snapshot

Captures an accessibility snapshot of the current page, which is better than screenshot as it provides structured data about page elements and their references for automation.

```typescript
import { snapshot } from '@/lib/tools/browser';

const result = await snapshot();
if (result.success) {
  const snapshotData = result.snapshot; // YAML-formatted accessibility data
  // Use the snapshot data to identify elements for automation...
}
```

The snapshot returns structured YAML data containing:
- Page title and URL
- All interactive elements with their accessibility information
- Element references (`ref-1`, `ref-2`, etc.) for use with other tools
- Element roles, names, attributes, and bounding boxes

### Click

Clicks an element on the page using element reference from accessibility snapshot.

```typescript
import { click } from '@/lib/tools/browser';

const result = await click({ 
  element: 'Submit button', // Human-readable description
  ref: 'ref-15' // Element reference from snapshot
});
if (result.success) {
  console.log('Button clicked successfully');
}
```

**Important**: The click tool now requires:
- `element`: Human-readable description of the element
- `ref`: Exact element reference from the page snapshot (e.g., 'ref-15')

### Screenshot

Captures the current visible tab as a PNG image.

```typescript
import { screenshot } from '@/lib/tools/browser';

const result = await screenshot();
if (result.success) {
  const imageData = result.screenshotData; // Base64-encoded PNG
  // Use the image data...
}
```

### Type

Types text into an input, textarea, or contentEditable element.

```typescript
import { type } from '@/lib/tools/browser';

const result = await type({ 
  selector: 'input#search-box',
  text: 'Search query',
  append: false // Set to true to append to existing text
});
if (result.success) {
  console.log('Text typed successfully');
}
```

### Get Element

Retrieves information about elements on the page matching a CSS selector.

```typescript
import { getElement } from '@/lib/tools/browser';

const result = await getElement({ 
  selector: '.product-item',
  limit: 5 // Limit the number of results
});
if (result.success && result.elements) {
  console.log(`Found ${result.count} elements, showing first ${result.elements.length}`);
  for (const element of result.elements) {
    console.log(`Element: ${element.tagName}, Text: ${element.textContent}`);
  }
}
```

## Recommended Workflow

For reliable browser automation, follow this pattern:

1. **Take a snapshot** to get the current page structure and element references
2. **Identify target elements** from the snapshot data using their descriptions and references
3. **Perform actions** (click, type, etc.) using the element references from the snapshot

```typescript
// 1. Capture page snapshot
const snapshotResult = await snapshot();
if (snapshotResult.success) {
  console.log('Page snapshot:', snapshotResult.snapshot);
  
  // 2. Use element references from snapshot for actions
  const clickResult = await click({
    element: 'Login button',
    ref: 'ref-23' // Reference from snapshot
  });
}
```

## Implementation Details

These tools work by detecting the environment they're running in and choosing the appropriate implementation:

1. **Content Script Context**: Interacts directly with the page DOM
2. **Background Script Context**: Uses Chrome's tabs API to execute scripts in the active tab
3. **Sidepanel/Popup Context**: Sends messages to the background script to perform actions

The snapshot tool creates accessibility data by:
- Finding all interactive and meaningful elements on the page
- Assigning unique references (`aria-ref` attributes) to each element
- Collecting accessibility information (roles, names, bounds, attributes)
- Formatting the data as structured YAML for easy parsing

## Requirements

- Chrome extension with appropriate permissions:
  - `"activeTab"` - For interacting with the active tab
  - `"tabs"` - For querying and working with tabs
  - `"scripting"` - For executing scripts in tabs

## Error Handling

All tools return a response object with:
- `success`: Boolean indicating if the operation succeeded
- Error information when `success` is false (`error` field)
- Tool-specific result data when `success` is true