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
- Environment management tools (reset map/console, clear code)
- Comprehensive agent testing framework with automated testing capabilities

## Installation

### Option 1: Install from Chrome Web Store (Easiest & Recommended)

1.  Visit the [Earth Agent page on the Chrome Web Store](https://chromewebstore.google.com/detail/earth-agent/hmpjiipbhhnppfdahieaafhdgdmhaple).
2.  Click "Add to Chrome".
3.  The extension will be added to your browser and will appear in your Chrome toolbar.

### Option 2: Download from GitHub Releases

1. Go to the [Releases page](https://github.com/wybert/earth-agent-chrome-ext/releases)
2. Download the latest `earth-agent-extension.zip`
3. Extract the zip file to a folder on your computer
4. Open Chrome and navigate to `chrome://extensions/`
5. Enable "Developer mode" (toggle in the top right)
6. Click "Load unpacked" and select the extracted folder
7. The extension will appear in your Chrome toolbar

### Option 3: Install from Source

1. Clone the repository
2. Install dependencies with `npm install`
3. Build the extension with `npm run build`
4. Load the unpacked extension from the `dist` directory in Chrome

## Configuration

After installation, you'll need to configure your AI provider:

1. Click the Earth Agent extension icon in Chrome
2. Go to Settings
3. Choose your AI provider:
   - **OpenAI**: Add your OpenAI API key (supports GPT-4o, GPT-4.1, GPT-o3, etc.)
   - **Anthropic**: Add your Anthropic API key (supports Claude models)
   - **Google**: Add your Google API key (supports Gemini models)
   - **Qwen**: Add your DashScope API key (supports Qwen models)
   - **Ollama**: Configure local Ollama server (requires local installation)
4. Select your preferred model
5. Start chatting with Earth Engine!

### Ollama Setup (Local AI Models)

For Ollama local models:

1. [Install Ollama](https://ollama.com/) on your machine
2. Pull your desired models: `ollama pull gemma3` or `ollama pull llama3`
3. **Important**: Start Ollama with CORS enabled: `OLLAMA_ORIGINS="*" ollama serve`
4. In the extension settings, select "Ollama" as provider
5. Enter your model name (e.g., "gemma3:1b", "llama3:latest")
6. **Tool Support**: Not all models support tools - check [Ollama model search](https://ollama.com/search) for models with "tools" tag for full Earth Engine integration

## Environment Management

The agent includes powerful environment management capabilities:

- **Reset Map/Inspector/Console**: Ask the agent to "reset the map" or "clear the console" to clean up your Google Earth Engine workspace
- **Clear Script**: Request "clear the code" or "start fresh" to remove all code from the Earth Engine editor
- **Natural Language Control**: Simply describe what you want to clean up, and the agent will handle it automatically

These tools help maintain a clean workspace during development and are particularly useful when switching between different Earth Engine tasks.

## AI Model Tool Support

The extension provides powerful Earth Engine integration tools, but tool support varies by AI provider and model:

- **✅ Full Tool Support**: OpenAI GPT models, Anthropic Claude models, Google Gemini models, Qwen models
- **⚠️ Variable Tool Support**: Ollama models - tool support depends on the specific model
  - **Tool-Compatible Ollama Models**: Check [Ollama model search](https://ollama.com/search) for models with "tools" tag
  - **Examples with tools**: `qwen3`, `llama3.1`, `mistral`, `codellama`, `firefunction-v2`
  - **Basic Chat Only**: Models without tool support can still provide Earth Engine guidance and code suggestions
- **📖 Documentation**: For other providers, refer to their respective documentation for tool/function calling capabilities

**Tip**: For the best Earth Engine integration experience with automated code execution, use tool-compatible models from any provider.

## Agent Testing Panel

The extension includes a comprehensive testing framework for evaluating AI agent performance:

- **Multi-Provider Support**: Test with OpenAI GPT models, Anthropic Claude models, Google Gemini, Qwen models, or Ollama local models
- **Batch Testing**: Run multiple prompts automatically with configurable intervals
- **Environment Controls**: Configure reset and clear functions, including optional GEE editor reload
- **Results Analysis**: Export detailed test results with screenshots and metadata
- **Screenshot Storage**: Multiple storage options (local, downloads folder, Google Drive)
- **Tool Compatibility**: Automatically adapts testing based on model tool support capabilities

Access the testing panel by clicking the flask icon (🧪) in the main chat interface.

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
