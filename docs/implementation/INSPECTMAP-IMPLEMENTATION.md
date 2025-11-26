# inspectMap Tool Implementation

## Overview

The `inspectMap` tool reads pixel values from the Google Earth Engine Inspector panel. This tool has been successfully implemented with a **read-only approach** due to limitations in programmatically triggering the Inspector.

## Implementation Approach

### Initial Attempt: Click Simulation
We initially attempted to simulate clicks on the map to trigger the Inspector, but discovered that:
- ✅ Click simulation works when executed directly in the browser console
- ❌ Click simulation **fails** when triggered via Chrome extension message passing
- The GEE Inspector does not respond to programmatic click events from the extension context

### Final Solution: Read Existing Data
The tool now **reads existing Inspector data** rather than attempting to trigger new inspections.

## Usage Workflow

1. User opens Google Earth Engine (https://code.earthengine.google.com)
2. User activates the **Inspector tab** (right side panel)
3. User **manually clicks** on the map at the desired location
4. Extension calls `inspectMap` tool to read the Inspector data
5. Tool verifies coordinates match (within ~10km tolerance) and extracts all layer values

## Implementation Files

### Content Script (`src/content/index.ts`)
**Function**: `handleInspectMap` (lines 498-629)

Key features:
- Checks if Inspector panel exists
- Validates Inspector has data (not empty)
- Extracts coordinates from Inspector header
- Verifies requested coordinates match inspected coordinates (with tolerance)
- Extracts all layer data from `.inspect-view` elements
- Returns structured data with layers, values, and coordinates

### Library Function (`src/lib/tools/earth-engine/inspectMap.ts`)
**Export**: `inspectMap(coordinates?: Coordinates)`

Handles message routing:
- From sidepanel → background script → content script
- From background script → content script
- Includes timeouts and error handling

### AI Tool (`src/lib/tools/ai-tools.ts`)
**Tool**: `inspectMapTool` (lines 1548-1702)

Features:
- Clear description explaining manual click requirement
- Optional coordinate verification
- Smart error messages based on failure type
- Formatted output with all layer data

### Chat Handler (`src/background/chat-handler.ts`)
**Integration**: Added to `readOnlyTools` (available in both Ask and Do modes)

## Data Structure

### Request
```typescript
{
  type: 'INSPECT_MAP',
  coordinates?: { lat: number, lng: number }
}
```

### Response (Success)
```typescript
{
  success: true,
  data: {
    requestedCoordinates: { lat: number, lng: number },
    inspectedCoordinates: { lng: number, lat: number },
    layerCount: number,
    layers: [
      {
        name: string,          // e.g., "VIIRS Nighttime Lights 2020 (Boston):"
        type: string,          // e.g., "Image (1 band)"
        values: {
          [key: string]: number | string  // e.g., { "maximum": 97.165 }
        }
      }
    ]
  }
}
```

### Response (Failure)
```typescript
{
  success: false,
  error: string,
  data?: {
    requestedCoordinates?: { lat: number, lng: number },
    inspectedCoordinates?: { lng: number, lat: number }
  }
}
```

## Error Handling

### 1. Inspector Panel Not Found
```
Error: "Inspector panel not found. Please ensure the Inspector tab is activated in Earth Engine."
```
**Solution**: Activate Inspector tab in GEE

### 2. Inspector Is Empty
```
Error: "Inspector is empty. Please manually click on the map at the location you want to inspect, then try again."
```
**Solution**: Click on the map first, then run tool

### 3. Coordinate Mismatch
```
Error: "Inspector shows data for coordinates (X, Y), which is different from requested coordinates (A, B). Please click on the map at the desired location first."
```
**Solution**: Click on the correct location (tolerance: ~10km)

### 4. No Coordinates Extracted
```
Error: "Could not read coordinates from Inspector. Please click on the map first."
```
**Solution**: Ensure Inspector has valid data

## DOM Selectors Used

```css
.inspect-panel              /* Main Inspector panel */
.explorer .header           /* Coordinate header: "Point (lng, lat) at zoom" */
.inspect-view               /* Each layer view */
.inspect-view .header .label    /* Layer name */
.inspect-view .header .message  /* Layer type */
.trivial                    /* Pixel value container */
.trivial .label span        /* Value label */
```

## Coordinate Extraction Pattern

```javascript
const pointText = "Point (-71.118, 42.3713) at 306m/px";
const pointMatch = pointText.match(/Point\s*\(([-\d.]+),\s*([-\d.]+)\)/);
// Result: ["Point (-71.118, 42.3713)", "-71.118", "42.3713"]
const coords = {
  lng: parseFloat(pointMatch[1]),
  lat: parseFloat(pointMatch[2])
};
```

## Testing

### Test Script: `test-inspectMap-final.js`
Run in Extension Service Worker Console:
1. Right-click extension icon → Inspect
2. Go to Console tab
3. Paste and run the script

### Expected GEE Console Output (F12)
```
🔍 [InspectMap] Reading Inspector panel data
🔍 [InspectMap] Coordinates provided: lat=42.3844, lng=-71.0987
✅ [InspectMap] Inspector panel found
📄 [InspectMap] Panel text preview: "Point (-71.118, 42.3713)..."
📍 [InspectMap] Point header text: "Point (-71.118, 42.3713) at 306m/px"
📍 [InspectMap] Extracted coordinates: lng=-71.118, lat=42.3713
🎨 [InspectMap] Found 1 inspect views
🎨 [InspectMap] View 1: "VIIRS Nighttime Lights 2020 (Boston): " - Image (1 band)
  📊 [InspectMap] maximum: 97.16571807861328
✅ [InspectMap] Successfully extracted 1 layers
```

## Limitations

1. **Requires Manual Click**: Cannot programmatically trigger Inspector - user must click map first
2. **Coordinate Tolerance**: 0.1 degree tolerance (~10km) for coordinate verification
3. **Single Point**: Only reads data for one point at a time (the last clicked location)
4. **Inspector Must Be Active**: Inspector tab must be activated in GEE interface

## Future Enhancements (If Possible)

1. Investigate GEE's internal event system for programmatic Inspector triggering
2. Add support for batch inspection (multiple coordinates)
3. Add map layer filtering (inspect specific layers only)
4. Cache Inspector data to reduce re-reading

## Related Files

- `WATCH-IN-GEE-CONSOLE.txt` - Usage instructions
- `test-inspectMap-final.js` - Test script
- `RUN-IN-EXTENSION-CONSOLE.js` - Original test (outdated)
- `analyze-gee-inspector.js` - DOM exploration script
- `analyze-after-manual-click.js` - Inspector data analysis script
- `test-different-click-methods.js` - Click simulation research

## Implementation Status

✅ Content script handler implemented
✅ Library function implemented
✅ AI tool definition added
✅ Chat handler integration complete
✅ Build successful
✅ Documentation complete

**Status**: Ready for testing with manual click workflow
