# Screenshot Storage Solutions for Chrome Extension Testing

## Overview

When running 1000+ tests with screenshots, Chrome extension storage (5-10MB limit) can only handle ~20 screenshots. This document outlines three storage solutions implemented to handle large-scale testing needs.

## Storage Options

### 1. Downloads Folder (Recommended)
- **Storage Limit**: Unlimited (uses file system)
- **Location**: `Downloads/earth-agent-screenshots/[session-id]/`
- **Best For**: Large test suites (1000+ tests)
- **Setup**: No configuration required
- **API**: Chrome Downloads API

### 2. Google Drive (Cloud Storage)
- **Storage Limit**: Based on Google Drive quota
- **Location**: Google Drive (configurable folder)
- **Best For**: Team collaboration, cloud backup
- **Setup**: Requires OAuth2 configuration
- **API**: Google Drive API v3

### 3. Local Storage (Fallback)
- **Storage Limit**: ~5-10MB (~20 screenshots)
- **Location**: Chrome extension storage
- **Best For**: Small test suites only
- **Setup**: No configuration required
- **API**: Chrome Storage API

## Configuration Options

The Agent Testing Panel includes several options to optimize testing:

### Screenshot Settings
- **Enable Screenshots**: Toggle screenshot capture on/off
- **Storage Method**: Choose between local, downloads, or Google Drive
- **Clear Code Before Test**: Automatically clear the Earth Engine code editor before each test
- **Reset Map Before Test**: Automatically reset the map, inspector, and console before each test

### Reset Functionality
Both reset functions now use the reliable `clickBySelector` tool:

#### Reset Map/Inspector/Console:
- **Selector**: `button.goog-button.reset-button[title="Clear map, inspector, and console"]`
- **Action**: Single click to reset all three components
- **Timing**: 1-second delay after clicking

#### Clear Script (Smart Multi-Step Process):
1. **Direct Attempt**: First tries clicking `div.goog-menuitem-content` directly (in case menu is already open)
2. **Targeted Dropdown**: If direct fails, opens the specific dropdown next to Reset button:
   - Primary: `button.goog-button.reset-button + div.goog-inline-block.goog-flat-menu-button[role="button"]`
   - Fallback: `button[title="Clear map, inspector, and console"] + div.goog-inline-block.goog-flat-menu-button[role="button"]`
3. **Select Clear Script**: Click clear option using selector `div.goog-menuitem-content`
4. **Timing**: 800ms delay for menu to appear, 500ms delay after completion

This improved approach solves the issue where multiple dropdowns use identical selectors by specifically targeting the one adjacent to the Reset button.

Both operations:
- Continue test execution even if they fail (graceful degradation)
- Use the same `clickBySelector` infrastructure for consistency
- Provide detailed console logging for debugging

## Implementation Details

### File Naming Convention
Screenshots are saved with descriptive names:
```
earth-agent-test-{testId}-{promptText}-{timestamp}.png
```

### Google Drive Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create OAuth2 credentials for Chrome Extension
3. Enable Google Drive API
4. Update `manifest.json` with your `client_id`
5. The extension will prompt for authentication when first used

### Performance Considerations
- Downloads folder: Fastest, no API calls
- Google Drive: Slower due to upload time, requires authentication
- Local storage: Fast but very limited capacity

## Error Handling

All storage methods include comprehensive error handling:
- Failed screenshots don't abort tests
- Storage errors are logged but don't stop execution
- Reset/clear failures are logged but don't stop tests
- Fallback mechanisms ensure tests continue running

## Test Execution Flow

For each test, the system now performs these actions in sequence:

1. **Reset Map/Inspector/Console** (if enabled):
   - Click reset button: `button.goog-button.reset-button[title="Clear map, inspector, and console"]`
   - Wait 1 second for reset to complete

2. **Clear Script** (if enabled):
   - Try direct click: `div.goog-menuitem-content`
   - If that fails, click targeted dropdown: `button.goog-button.reset-button + div.goog-inline-block.goog-flat-menu-button[role="button"]`
   - Wait 800ms for menu to appear
   - Click clear script: `div.goog-menuitem-content`
   - Wait 500ms for clearing to complete

3. **Run Agent**: Send prompt and get AI response

4. **Wait**: 2-second delay for UI changes to complete

5. **Screenshot**: Capture the results showing the agent's work

6. **Save**: Store screenshot using selected method

This ensures each test starts with a completely clean Google Earth Engine environment and captures only the results from the current test, providing consistent and reliable testing results.

## Troubleshooting

### Reset/Clear Not Working:
- Check browser console for clickBySelector error messages
- Verify Google Earth Engine interface hasn't changed
- Ensure selectors still match the current UI elements
- Test selectors manually in browser console: `document.querySelector('selector')`

### Screenshots Not Saving:
- Check storage method configuration
- Verify permissions are granted
- Check browser console for storage errors

### Tests Timing Out:
- Increase test interval if using Google Drive storage
- Check network connectivity
- Verify API keys and authentication 