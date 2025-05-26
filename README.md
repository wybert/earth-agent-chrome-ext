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
