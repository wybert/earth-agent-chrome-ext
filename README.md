# Earth Agent Chrome Extension

<div align="center">
  <img src="src/assets/mydesign/Robot-earth-transparent-cut-edge.png" alt="Earth Agent Robot" width="200"/>
</div>

Cursor like AI-agent for Google Earth Engine right in your browser as a Chrome extension. It helps you do anything related to Google Earth Engine automatically through chatting. Hatched from [sundai.club](https://www.sundai.club/projects/ad38a4e9-5cd5-4a90-b66c-c3f811cc5e8a).

## Features

- Chat interface for Earth Engine assistance
- Knows Earth Engine Data Catalog as well as community dataset
- Help you write code, and run the code
- Help debug the code
- Help you explian the map
- Planning and reasoning

## Installation

### Option 1: Download from GitHub Releases (Recommended)

1. Go to the [Releases page](https://github.com/wybert/earth-agent-chrome-ext/releases)
2. Download the latest `earth-agent-extension.zip`
3. Extract the zip file to a folder on your computer
4. Open Chrome and navigate to `chrome://extensions/`
5. Enable "Developer mode" (toggle in the top right)
6. Click "Load unpacked" and select the extracted folder
7. The extension will appear in your Chrome toolbar

### Option 2: Install from Source

1. Clone the repository
2. Install dependencies with `npm install`
3. Build the extension with `npm run build`
4. Load the unpacked extension from the `dist` directory in Chrome

## Configuration

After installation, you'll need to configure your API keys:

1. Click the Earth Agent extension icon in Chrome
2. Go to Settings
3. Add your OpenAI or Anthropic API key
4. Select your preferred AI provider and model
5. Start chatting with Earth Engine!

## Creating a New Release

For developers who want to create releases:

```bash
# Create and push a version tag
git tag v1.0.0
git push origin v1.0.0

# GitHub Actions will automatically:
# - Build the extension
# - Run tests
# - Create a release with installation files
```

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
