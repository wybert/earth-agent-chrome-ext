# Browser Automation Tools

This module provides a collection of tools for browser automation that can be used in Chrome extensions. These tools allow for common browser interaction tasks like taking screenshots, clicking elements, typing text, and inspecting elements on a page.

## Features

- Cross-environment compatibility (works in content scripts, background scripts, and sidepanels)
- Automatic message passing between extension contexts
- Error handling and timeout management
- Support for standard browser automation tasks

## Tools

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

### Click

Clicks an element on the page based on a CSS selector.

```typescript
import { click } from '@/lib/tools/browser';

const result = await click({ 
  selector: 'button.submit-button' 
});
if (result.success) {
  console.log('Button clicked successfully');
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

## Implementation Details

These tools work by detecting the environment they're running in and choosing the appropriate implementation:

1. **Content Script Context**: Interacts directly with the page DOM
2. **Background Script Context**: Uses Chrome's tabs API to execute scripts in the active tab
3. **Sidepanel/Popup Context**: Sends messages to the background script to perform actions

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