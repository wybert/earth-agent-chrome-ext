# Earth Agent AI SDK

Chrome extension for Earth Engine AI assistance.

## Features

- Chat interface for Earth Engine assistance
- Integration with Context7 for retrieving Earth Engine dataset documentation
- Tools test panel for verifying Context7 functionality

## Installation

1. Clone the repository
2. Install dependencies with `npm install`
3. Build the extension with `npm run build`
4. Load the unpacked extension from the `dist` directory in Chrome

## Development

- Run `npm run dev` to start the development server with watch mode
- Run `npm run test` to run the test suite
- Run `npm run test:context7` to test the Context7 tools from the command line

## Using the Tools Test Panel

The extension includes a tools test panel that allows you to test the Context7 tools directly from the UI:

1. Open the extension and click the wrench icon in the top right corner
2. Select the tool you want to test from the tabs
3. Fill in the required fields
4. Click "Run Test" to execute the tool and see the results

The tools test panel supports testing all Context7 tools:

- **Resolve Library ID**: Searches for Earth Engine dataset libraries
- **Get Documentation**: Retrieves documentation using a library ID
- **Search Datasets**: Searches specifically for Earth Engine datasets
- **Get EE Documentation**: Gets Earth Engine documentation
- **Get Dataset Info**: Combined search and retrieve function

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
