# Earth Agent Chrome Extension

Cursor like AI-agent for Google Earth Engine right in your browser as a Chrome extension. It helps you do anything related to Google Earth Engine automatically through chatting. Hatched from [sundai.club](https://www.sundai.club/projects/ad38a4e9-5cd5-4a90-b66c-c3f811cc5e8a).


## Features

- Chat interface for Earth Engine assistance
- Knows Earth Engine Data Catalog as well as community dataset
- Help you write code, and run the code
- Help debug the code
- Help you explian the map
- Planning and reasoning

## Installation

Current only support install from local

1. Clone the repository
2. Install dependencies with `npm install`
3. Build the extension with `npm run build`
4. Load the unpacked extension from the `dist` directory in Chrome

## Development

You need nodejs and npm,

1. Clone the repository
2. Install dependencies with `npm install`
3. Build the extension with `npm run build`
4. Load the unpacked extension from the `dist` directory in Chrome
5. Create branches and make changes
6. Build the project and refresh the chrome extension to see updates
7. push changes if all works good


## CORS Handling

The extension handles Cross-Origin Resource Sharing (CORS) issues by proxying API requests through the background script. This setup works because:

1. Chrome extension background scripts have permission to make cross-origin requests if the URL is included in the `host_permissions` in `manifest.json`
2. Content scripts and the sidepanel are subject to CORS restrictions
3. The tools are designed to automatically detect the current environment and:
   - Make direct API calls when running in the background script or Node.js
   - Proxy requests via the background script when running in a content script or sidepanel

If you encounter CORS issues:
- Check that `https://context7.com/*` is included in the `host_permissions` in `manifest.json`
- Verify that the background script is properly handling the message types
- Check the background script console for detailed error messages

## License

MIT

## Thanks

- [Sundai Club](https://www.sundai.club/)
- React
- Vercel AI SDK

## Troubleshooting

### API Compatibility Issues

If you encounter empty responses or streaming issues:

1. **Provider/Model Matching**: Make sure you're using:
   - OpenAI API key with OpenAI models (gpt-4o, gpt-4-turbo, etc.)
   - Anthropic API key with Anthropic models (claude-3-7-sonnet-20250219, etc.)

2. **API Keys**: 
   - OpenAI keys start with `sk-`
   - Anthropic keys start with `sk-ant-`

3. **Anthropic API Headers**:
   - Anthropic requires the special header `anthropic-dangerous-direct-browser-access: true` for browser requests
   - Anthropic uses `x-api-key` instead of the Authorization header
   - Anthropic requires the `anthropic-version: 2023-06-01` header

4. **Supported Models**:
   - Verify that the model name is exactly correct, including version numbers
   - Current supported Anthropic models: 
     - `claude-3-7-sonnet-20250219` (latest flagship model)
     - `claude-3-5-sonnet-20241022` (v2 model)
     - `claude-3-5-haiku-20241022` (latest fast model)
   - Incorrect model names will result in 404 "Not Found" errors

5. **Debugging Steps**:
   - Check the browser console for errors starting with `[chat-handler]`
   - Verify your API key format and validity
   - Ensure all required headers are included in requests
   - Check for CORS or network-related errors

### API Key Issues

If you're experiencing issues with chat responses or empty responses:

1. **Verify API Keys**: Make sure you've entered valid API keys in the extension settings:
   - The extension supports both OpenAI and Anthropic API keys
   - When using OpenAI, ensure your key starts with "sk-"
   - When using Anthropic, ensure your key starts with "sk-ant-"

2. **Test API Connection**: You can test your API connection directly in the extension:
   - Click the "Test API" button (checkmark icon) in the chat interface
   - This will verify if your API key is valid and if the background script can connect to the API

3. **Run API Test Tool**: Use the included API validation tool to check your keys:
   ```bash
   node scripts/test-api.js --anthropic YOUR_API_KEY
   # or
   node scripts/test-api.js --openai YOUR_API_KEY
   ```

### CORS Issues

If you're seeing CORS errors in the console like:
```
Access to fetch at 'https://api.anthropic.com/v1/messages' has been blocked by CORS policy
```

1. **Check Extension Permissions**: Make sure you have the latest version of the extension which includes the necessary host permissions in the manifest:
   ```json
   "host_permissions": [
     "https://code.earthengine.google.com/*",
     "https://context7.com/*",
     "https://api.anthropic.com/*",
     "https://api.openai.com/*"
   ]
   ```

2. **Anthropic Special Header Requirement**: Anthropic specifically requires a header called `anthropic-dangerous-direct-browser-access` when making requests from a browser context. Our extension adds this header automatically, but if you're developing your own tools, you'll need to include:
   ```javascript
   headers: {
     // other headers...
     'anthropic-dangerous-direct-browser-access': 'true'
   }
   ```

3. **Rebuild Extension**: If you've modified the manifest, rebuild the extension:
   ```bash
   npm run build
   ```

4. **Reload Extension**: Go to chrome://extensions, enable "Developer mode", and click "Reload" on the Earth Engine AI Assistant extension.

5. **Check Debug Logs**: Open the extension's background page by clicking "inspect" on the extension's card in chrome://extensions to see detailed error logs.

6. **Alternative Testing**: Use the command-line test script to verify your API keys independently of the extension:
   ```bash
   node scripts/test-api.js --anthropic YOUR_API_KEY
   ```

### Empty Responses

If you get a successful connection (status 200) but empty text stream:

1. **Check API Key Validity**: Test your API key with the test-api.js script to verify it's working
2. **Verify Model Availability**: Ensure the model you're trying to use (e.g., claude-3-7-sonnet-20250219) is available with your API key
3. **Check Console Logs**: Look for specific errors in the Chrome extension's background page console
4. **Inspect Stream Chunks**: The logs should show stream chunks with text; if there are 0 chunks, the API connection is failing
5. **Check Model/Provider Compatibility**: Make sure you're using:
   - OpenAI models (like `gpt-4o`) with the OpenAI provider
   - Claude models (like `claude-3-7-sonnet-20250219`) with the Anthropic provider
   - Using a mismatched model/provider (e.g., Claude model with OpenAI provider) will result in empty responses

### Extension Authentication Issues

1. **API Keys Storage**: The extension stores API keys in Chrome's sync storage. To clear them:
   - Open the extension and go to settings
   - Delete the API key and save
   - Re-enter your API key

2. **Chrome Storage Issues**: If settings aren't saving:
   - Go to chrome://extensions
   - Toggle off Developer mode, then toggle it back on
   - Reload the extension

For further assistance, please open an issue in the repository.
