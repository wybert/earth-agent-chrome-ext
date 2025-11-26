# Debug Agent Test Panel - No Response & No Screenshots

## 🔍 **Step-by-Step Debugging**

### **Step 1: Check API Keys are Configured**

1. Open your extension settings (click extension icon → settings)
2. Verify you have API keys configured for your chosen provider:
   - **OpenAI**: Need OpenAI API key for GPT models
   - **Anthropic**: Need Anthropic API key for Claude models

### **Step 2: Open Browser Console for Debugging**

1. Open the testing panel (🧪 icon)
2. Press `F12` to open Developer Tools
3. Go to **Console** tab
4. Clear console and try running a single test
5. Look for error messages or missing responses

### **Step 3: Test Basic Functionality**

**Test 1: Single Prompt Test**
1. Go to **Prompts** tab
2. Clear all existing prompts
3. Add a simple prompt: `"Hello, can you help me?"`
4. Go to **Run Tests** tab
5. Click **"Start Tests"**
6. Watch console for messages

**Expected Console Output:**
```
runTests called
Current config: {provider: "openai", model: "gpt-4o", ...}
Prompts length: 1
Starting tests...
Running test 1/1
executeTest called for prompt: {id: "...", text: "Hello, can you help me?"}
Taking screenshot...
Screenshot saved with ID: ...
Creating test promise...
Sending chat message: {...}
Connecting to background script...
Received port message: {type: "CHAT_STREAM_CHUNK", chunk: "Hello..."}
Chat stream ended, full response: ...
Test completed successfully, duration: ...
```

### **Step 4: Check for Common Issues**

**Issue A: No API Key Configured**
- **Symptom**: Error "API key not configured"
- **Fix**: Configure API key in extension settings

**Issue B: Wrong Provider/Model**
- **Symptom**: Tests timeout or get errors
- **Fix**: Check provider/model in Setup tab matches your API key

**Issue C: Screenshot Capture Fails**
- **Symptom**: No screenshots, console errors
- **Fix**: Ensure you're on Google Earth Engine tab

**Issue D: Background Script Not Responding**
- **Symptom**: "Connection disconnected before response received"
- **Fix**: Reload extension

### **Step 5: Test Screenshot Capture Separately**

Open browser console and test screenshot function:

```javascript
// Test screenshot capture
(async () => {
  try {
    console.log('Testing screenshot...');
    
    // Import screenshot function (adjust path if needed)
    const { screenshot } = await import(chrome.runtime.getURL('lib/tools/browser/screenshot.js'));
    
    const result = await screenshot();
    console.log('Screenshot result:', result);
    
    if (result.success) {
      console.log('✅ Screenshot captured successfully');
      console.log('Data length:', result.screenshotData?.length || 0);
    } else {
      console.log('❌ Screenshot failed:', result.error);
    }
  } catch (error) {
    console.log('❌ Screenshot test failed:', error);
  }
})();
```

### **Step 6: Test Storage Functions**

Test each storage method:

```javascript
// Test local storage
chrome.storage.local.set({test: 'data'}, () => {
  console.log('✅ Local storage works');
});

// Test downloads (if selected)
try {
  chrome.downloads.download({
    url: 'data:text/plain,test',
    filename: 'test.txt',
    saveAs: false
  }, (downloadId) => {
    if (chrome.runtime.lastError) {
      console.log('❌ Downloads failed:', chrome.runtime.lastError);
    } else {
      console.log('✅ Downloads works:', downloadId);
    }
  });
} catch (error) {
  console.log('❌ Downloads not available:', error);
}

// Test Google Drive authentication (if selected)
if (typeof chrome.identity !== 'undefined') {
  chrome.identity.getAuthToken({
    interactive: false,
    scopes: ['https://www.googleapis.com/auth/drive.file']
  }, (token) => {
    if (chrome.runtime.lastError) {
      console.log('❌ Google Drive auth failed:', chrome.runtime.lastError);
    } else if (token) {
      console.log('✅ Google Drive authenticated');
    } else {
      console.log('⚠️ Google Drive not authenticated (interactive required)');
    }
  });
} else {
  console.log('❌ Google Drive identity API not available');
}
```

### **Step 7: Manual Port Communication Test**

Test background script communication:

```javascript
// Test background script communication
const port = chrome.runtime.connect({ name: 'agent-test' });

port.onMessage.addListener((message) => {
  console.log('Received:', message);
});

port.onDisconnect.addListener(() => {
  console.log('Port disconnected');
});

// Send test message
port.postMessage({
  type: 'CHAT_MESSAGE',
  message: 'Hello test',
  messages: [{ role: 'user', content: 'Hello test' }],
  provider: 'openai',
  model: 'gpt-4o',
  sessionId: 'test-session'
});
```

### **Step 8: Check Extension Status**

1. Go to `chrome://extensions/`
2. Find "Earth Agent AI SDK"
3. Check:
   - ✅ Extension is **enabled**
   - ✅ No error messages shown
   - ✅ "Developer mode" is on
4. If there are errors, click **"Reload"**

### **Step 9: Common Fixes**

**Fix 1: Reload Extension**
```bash
# In terminal
npm run build
```
Then reload extension in `chrome://extensions/`

**Fix 2: Clear Storage**
```javascript
// Clear all extension storage
chrome.storage.local.clear();
chrome.storage.sync.clear();
```

**Fix 3: Reset Test Configuration**
In test panel → Setup tab → "Clear Stored Settings"

**Fix 4: Check Permissions**
In `chrome://extensions/` → Extension details → "Site access" should be enabled

### **Step 10: Expected Working Flow**

**When everything works correctly:**

1. **Test starts**: Console shows "Starting tests..."
2. **Screenshot taken**: "Screenshot saved with ID: ..."
3. **Message sent**: "Connecting to background script..."
4. **Response streams**: Multiple "CHAT_STREAM_CHUNK" messages
5. **Test completes**: "Test completed successfully"
6. **Results appear**: In Results tab with response text
7. **Screenshots accessible**: Download/view buttons work

## 🚨 **If Still Not Working**

**Report these details:**

1. **Console errors** (copy full error messages)
2. **Extension version** from `chrome://extensions/`
3. **Provider/model** you're trying to use
4. **Storage method** selected
5. **Browser version** and OS

**Quick Reset:**
1. Disable extension
2. Run `npm run build`
3. Re-enable extension
4. Clear test panel settings
5. Re-configure with simple settings
6. Test with single prompt 