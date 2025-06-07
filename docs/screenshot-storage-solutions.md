# Screenshot Storage Solutions for 1000+ Agent Tests

This document outlines the storage solutions implemented in the Earth Agent Chrome Extension's testing panel to handle large-scale testing scenarios with 1000+ screenshots.

## Problem Statement

**Chrome Extension Storage Limitations:**
- `chrome.storage.local`: ~5-10MB quota (varies by available disk space)
- Each screenshot (50% JPEG quality): ~200-500KB
- **1000+ screenshots = 200-500MB** - **WAY beyond chrome.storage limits!**

The original implementation storing base64 screenshots in `chrome.storage.local` would fail after ~20-50 screenshots due to quota limits.

## Storage Solutions Implemented

### 1. 🎯 **Downloads Folder (Recommended for 1000+ Tests)**

**How it works:**
- Uses Chrome's `downloads` API to save screenshots directly to filesystem
- Organizes files in `Downloads/earth-agent-screenshots/{sessionId}/` structure
- Generates descriptive filenames: `earth-agent-test-{testId}-{promptText}-{timestamp}.png`

**Benefits:**
- ✅ **Unlimited storage** (limited only by disk space)
- ✅ **No quota limits** or browser storage constraints
- ✅ **Persistent files** that survive browser restarts
- ✅ **User-accessible** files for manual inspection
- ✅ **Fast performance** - no network uploads during testing
- ✅ **Privacy-friendly** - data never leaves your machine

**Implementation:**
```typescript
const saveScreenshotDownloads = async (screenshotData: string, testId: string, promptText: string): Promise<string> => {
  // Convert data URL to blob
  const response = await fetch(screenshotData);
  const blob = await response.blob();
  
  // Create safe filename
  const safePromptText = promptText.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `earth-agent-test-${testId}-${safePromptText}-${timestamp}.png`;
  
  // Use Downloads API
  const downloadId = await new Promise<number>((resolve, reject) => {
    chrome.downloads.download({
      url: URL.createObjectURL(blob),
      filename: `earth-agent-screenshots/${config.sessionId}/${filename}`,
      saveAs: false
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(downloadId);
      }
    });
  });
  
  return `download-${downloadId}`;
};
```

**File Organization:**
```
Downloads/
└── earth-agent-screenshots/
    ├── session-2024-12-17-14-30-00/
    │   ├── earth-agent-test-001-weather-query-2024-12-17T14-30-15Z.png
    │   ├── earth-agent-test-002-map-search-2024-12-17T14-30-45Z.png
    │   └── earth-agent-test-003-satellite-view-2024-12-17T14-31-15Z.png
    └── session-2024-12-17-16-45-00/
        └── ...
```

### 2. ☁️ **Google Drive API Integration**

**How it works:**
- Direct upload to Google Drive using multipart upload API
- Optional folder organization with Drive Folder ID
- Returns shareable Google Drive file IDs

**Benefits:**
- ✅ **Cloud storage** with 15GB free (Google account)
- ✅ **Team collaboration** - shareable links
- ✅ **Cross-device access** from any device
- ✅ **Automatic backup** and synchronization
- ✅ **Searchable** via Google Drive search

**Requirements:**
- Google Cloud Console project with Drive API enabled
- API key with Drive scope permissions
- Optional: specific folder ID for organization

**Implementation:**
```typescript
const saveScreenshotGoogleDrive = async (screenshotData: string, testId: string, promptText: string): Promise<string> => {
  // Convert data URL to blob
  const response = await fetch(screenshotData);
  const blob = await response.blob();
  
  // Prepare metadata
  const metadata = {
    name: filename,
    parents: config.driveFolderId ? [config.driveFolderId] : undefined
  };
  
  // Create form data for multipart upload
  const formData = new FormData();
  formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  formData.append('file', blob);
  
  // Upload to Google Drive
  const uploadResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.driveApiKey}`
    },
    body: formData
  });
  
  const result = await uploadResponse.json();
  return `drive-${result.id}`;
};
```

**Setup Instructions:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new project or select existing
3. Enable Google Drive API
4. Create credentials (API key)
5. Configure OAuth consent screen if needed
6. Add API key to Agent Test Panel settings

### 3. 🔧 **Local Storage (Fallback for Small Tests)**

**How it works:**
- Original implementation using `chrome.storage.local`
- Stores base64-encoded screenshot data directly in browser storage

**Benefits:**
- ✅ **Simple implementation** - no external dependencies
- ✅ **Fast access** for UI previews
- ✅ **No setup required**

**Limitations:**
- ❌ **Limited to ~20 screenshots** due to 5-10MB quota
- ❌ **Data lost** when extension is uninstalled
- ❌ **Not suitable** for 1000+ test scenarios

## Configuration in UI

The Agent Test Panel provides easy configuration through the Setup tab:

```typescript
// Storage selection dropdown
<Select value={config.screenshotStorage} onValueChange={(value) => updateConfig({ screenshotStorage: value })}>
  <SelectItem value="local">Local Storage (Limited)</SelectItem>
  <SelectItem value="downloads">Downloads Folder (Recommended)</SelectItem>
  <SelectItem value="google-drive">Google Drive (Cloud)</SelectItem>
</Select>

// Google Drive specific settings (shown when selected)
{config.screenshotStorage === 'google-drive' && (
  <>
    <Input // API Key
      type="password"
      placeholder="Enter Google Drive API key..."
    />
    <Input // Folder ID (optional)
      placeholder="e.g., 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
    />
  </>
)}
```

## Permissions Required

### Manifest.json Updates:
```json
{
  "permissions": [
    "downloads"  // For Downloads API
  ],
  "host_permissions": [
    "https://www.googleapis.com/upload/drive/v3/*"  // For Google Drive API
  ]
}
```

## Performance Considerations

### Downloads API (Recommended):
- **No upload delay** during testing
- **Instant save** to filesystem
- **No network dependency** 
- **Minimal memory usage**

### Google Drive API:
- **Upload delay** during testing (~1-3 seconds per screenshot)
- **Network dependency** required
- **Rate limits** may apply for high-volume uploads
- **Memory usage** for upload queue

### Local Storage:
- **Instant save** but limited capacity
- **Memory bloat** with large numbers of screenshots
- **Quota errors** kill testing

## Recommendations

### For 1000+ Tests:
1. **Primary Choice:** Downloads Folder
   - Unlimited storage
   - No network delays
   - User-friendly file access

2. **Secondary Choice:** Google Drive (if cloud storage needed)
   - Set reasonable test intervals (10+ seconds) to handle upload delays
   - Monitor API quotas
   - Consider uploading in background after test completion

### For Small-Scale Testing (<20 tests):
- Local Storage is fine and provides UI previews

### Hybrid Approach:
```typescript
// Store last few screenshots locally for preview
// Save all screenshots to downloads/drive for persistence
if (testIndex < 5) {
  // Also save to local for preview
  chrome.storage.local.set({[`screenshot_${screenshotId}`]: screenshotData});
}
```

## Error Handling

The implementation includes comprehensive error handling:

```typescript
try {
  screenshotId = await saveScreenshot(screenshotResult.screenshotData, prompt.id, prompt.text);
  screenshotSuccess = true;
} catch (error) {
  console.error('Screenshot failed:', error);
  // Test continues even if screenshot fails
}
```

## File Naming Convention

All storage methods use consistent, descriptive filenames:
- **Format:** `earth-agent-test-{testId}-{promptText}-{timestamp}.png`
- **Example:** `earth-agent-test-001-weather-query-2024-12-17T14-30-15Z.png`
- **Benefits:** Easy identification, chronological sorting, search-friendly

## Future Enhancements

### Potential Improvements:
1. **Background upload queue** for Google Drive
2. **Compression options** for storage optimization
3. **AWS S3 integration** as alternative cloud storage
4. **Local HTTP server** option for development workflows
5. **Batch ZIP export** for easy sharing
6. **Screenshot diff comparison** between test runs

## Troubleshooting

### Downloads Not Working:
- Check Chrome downloads permission
- Verify file system write permissions
- Check if Downloads folder exists

### Google Drive Upload Fails:
- Verify API key is correct and active
- Check Drive API is enabled in Google Cloud Console
- Ensure proper OAuth scopes (drive.file)
- Monitor API quota limits

### Storage Quota Exceeded:
- Switch from Local Storage to Downloads
- Clear browser storage: `chrome.storage.local.clear()`

This multi-storage approach ensures the Earth Agent testing panel can handle any scale of testing, from small proof-of-concepts to large-scale validation runs with 1000+ test cases. 