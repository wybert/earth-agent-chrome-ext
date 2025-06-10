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

## How to Use the Extension

### Getting Started

1. **Open Google Earth Engine Code Editor** in a Chrome tab: https://code.earthengine.google.com/
2. **Click the Earth Agent extension icon** in your Chrome toolbar
3. **Start chatting!** The agent can see your Earth Engine environment and help with any GEE-related tasks

### Basic Usage Flow

The Earth Agent works as your intelligent assistant for Google Earth Engine development:

- **Ask questions** about Earth Engine concepts, datasets, or code
- **Request code generation** for specific Earth Engine tasks
- **Get help debugging** existing code in your editor
- **Analyze and explain** maps, data, and results
- **Manage your workspace** with automatic cleanup tools

## Example Prompts to Try

### 🌍 **Getting Started with Earth Engine**
```
"Help me create a simple map showing NDVI for California using Landsat data"

"Show me how to filter satellite imagery by date and cloud cover"

"What datasets are available for precipitation data?"

"Create a time series chart of vegetation indices for a specific location"
```

### 🛰️ **Satellite Data Analysis**
```
"Find and display the latest Sentinel-2 image over New York City with less than 10% cloud cover"

"Calculate NDVI for cropland areas in Iowa and create a visualization"

"Compare deforestation between 2010 and 2020 in the Amazon rainforest"

"Detect urban expansion using night lights data over the past 5 years"
```

### 📊 **Data Processing and Analysis**
```
"Create a reducer to calculate mean temperature by administrative boundaries"

"Help me export this image to Google Drive with specific projection and scale"

"Set up a batch processing workflow for multiple images"

"Calculate zonal statistics for land use categories within protected areas"
```

### 🗺️ **Visualization and Mapping**
```
"Add a legend to this map showing the color scale for elevation data"

"Create an interactive map with multiple layers that users can toggle"

"Style this land cover classification with appropriate colors"

"Add geometry drawing tools and export the drawn polygons"
```

### 🔧 **Debugging and Optimization**
```
"This code is running slowly, can you optimize it?"

"I'm getting a memory error, help me fix this computation"

"Explain what this error message means and how to fix it"

"Check my code for best practices and suggest improvements"
```

### 🧹 **Workspace Management**
```
"Clear my console and reset the map view"

"Remove all code from the editor so I can start fresh"

"Reset my workspace to a clean state"

"Take a screenshot of my current results"
```

## Available Tools & Functions

The Earth Agent includes powerful tools that enable it to interact directly with your Google Earth Engine environment:

### 🌍 **Earth Engine Integration Tools**

#### **Code Editor Integration**
- **Insert Code**: Automatically write code directly into your GEE Code Editor
- **Execute Code**: Run the code in your editor and monitor execution
- **Code Analysis**: Analyze existing code and suggest improvements
- **Error Debugging**: Identify and fix errors in your Earth Engine scripts

#### **Dataset Discovery**
- **Dataset Search**: Find relevant Earth Engine datasets based on your needs
- **Dataset Documentation**: Get detailed information about specific datasets
- **Data Catalog Access**: Browse and explore the complete Earth Engine Data Catalog
- **Community Datasets**: Access community-contributed datasets and collections

#### **Map and Visualization Tools**
- **Map Inspection**: Analyze what's currently displayed on your map
- **Layer Management**: Add, remove, and modify map layers
- **Visualization Parameters**: Automatically configure visualization settings
- **Legend Creation**: Generate appropriate legends for your data

#### **Environment Management**
- **Reset Map/Inspector/Console**: Clean up your workspace with a single command
- **Clear Script**: Remove all code from the editor to start fresh
- **Screenshot Capture**: Take snapshots of your work for documentation
- **Console Monitoring**: Check console output and error messages

### 🌐 **Browser Automation Tools**

#### **Web Page Interaction**
- **Element Clicking**: Click buttons, links, and interface elements
- **Text Input**: Fill forms and input fields automatically
- **Page Navigation**: Navigate through web interfaces
- **Element Inspection**: Analyze web page structure and content

#### **Visual Analysis**
- **Screenshot Capture**: Take full-page or selective screenshots
- **Element Detection**: Find and identify specific page elements
- **Content Extraction**: Extract text and data from web pages
- **Accessibility Analysis**: Generate accessibility reports for web content

### 🔍 **Information and Research Tools**

#### **Weather Integration**
- **Current Weather**: Get real-time weather information for any location
- **Weather Data**: Access meteorological data for analysis
- **Climate Information**: Historical and current climate data

#### **Documentation Access**
- **Context7 Integration**: Access comprehensive Earth Engine documentation
- **API Reference**: Get detailed API documentation and examples
- **Best Practices**: Learn recommended approaches and patterns
- **Code Examples**: Access curated code examples and tutorials

### 🤖 **AI Agent Capabilities**

#### **Multi-Step Workflows**
- **Plan and Execute**: Break down complex tasks into manageable steps
- **Error Recovery**: Automatically retry and fix failed operations
- **Progress Tracking**: Monitor long-running processes and operations
- **Adaptive Learning**: Adjust approach based on results and feedback

#### **Code Generation**
- **Custom Scripts**: Generate Earth Engine scripts for specific tasks
- **Function Creation**: Create reusable functions and modules
- **Workflow Automation**: Build complete analysis pipelines
- **Batch Processing**: Set up automated processing for multiple datasets

#### **Analysis and Insights**
- **Data Interpretation**: Explain results and findings from your analysis
- **Trend Detection**: Identify patterns and trends in your data
- **Anomaly Detection**: Find unusual patterns or outliers
- **Comparative Analysis**: Compare different datasets or time periods

## Tool Compatibility by Provider

### ✅ **Full Tool Support**
**OpenAI, Anthropic, Google, Qwen**: All tools and functions available
- Complete Earth Engine integration
- Full browser automation
- Advanced multi-step workflows
- Error recovery and debugging

### ⚠️ **Variable Tool Support**
**Ollama**: Tool availability depends on the specific model
- **With Tools**: Models tagged with "tools" on [Ollama search](https://ollama.com/search)
  - Examples: `qwen3`, `llama3.1`, `mistral`, `codellama`, `firefunction-v2`
  - Full Earth Engine integration available
  - Complete browser automation support
- **Chat Only**: Models without tool support
  - Provides expert guidance and code suggestions
  - Can explain concepts and help with debugging
  - Limited to conversational assistance (no direct code execution)

### 💡 **Usage Tips**

#### **For Maximum Productivity**
1. **Use tool-compatible models** when you need automated code execution
2. **Be specific** in your requests for better results
3. **Ask for explanations** to learn Earth Engine concepts
4. **Use workspace management** tools to keep your environment clean
5. **Take screenshots** to document your work and results

#### **Common Workflows**
1. **Exploratory Analysis**: Ask questions → Get code → Run and iterate
2. **Data Processing**: Define requirements → Generate pipeline → Execute and export
3. **Visualization**: Create map → Style layers → Add legends → Capture results
4. **Debugging**: Describe problem → Analyze code → Apply fixes → Test solution

## Agent Testing Panel

The extension includes a comprehensive testing framework for evaluating AI agent performance:

- **Multi-Provider Support**: Test with OpenAI GPT models, Anthropic Claude models, Google Gemini, Qwen models, or Ollama local models
- **Batch Testing**: Run multiple prompts automatically with configurable intervals
- **Environment Controls**: Configure reset and clear functions, including optional GEE editor reload
- **Results Analysis**: Export detailed test results with screenshots and metadata
- **Screenshot Storage**: Multiple storage options (local, downloads folder, Google Drive)
- **Tool Compatibility**: Automatically adapts testing based on model tool support capabilities

Access the testing panel by clicking the flask icon (🧪) in the main chat interface.

## Advanced Usage Examples

### 🚀 **Complex Multi-Step Workflows**

**Example: Creating a Complete Deforestation Analysis**
```
"I want to analyze deforestation in the Brazilian Amazon from 2000 to 2023. 
Please create a complete workflow that:
1. Loads appropriate satellite imagery
2. Calculates forest loss over time
3. Creates visualizations showing the changes
4. Generates statistics by state/region
5. Exports the results for further analysis"
```

**Example: Agricultural Monitoring Pipeline**
```
"Set up an agricultural monitoring system for corn fields in Iowa that:
- Uses Sentinel-2 and Landsat data
- Calculates NDVI, EVI, and SAVI indices
- Creates time series analysis for growing seasons
- Identifies areas of crop stress
- Generates automated reports with charts and maps"
```

### 📈 **Data Science Integration**

**Example: Climate Change Analysis**
```
"Help me create a climate change impact study that:
1. Uses ERA5 temperature and precipitation data
2. Calculates 30-year climate normals
3. Identifies significant trends and anomalies
4. Creates publication-ready visualizations
5. Exports data in formats suitable for statistical analysis"
```

**Example: Urban Heat Island Study**
```
"Design an urban heat island analysis for major cities that:
- Uses Landsat thermal bands and MODIS LST
- Compares urban vs rural temperatures
- Analyzes the relationship with land cover
- Creates before/after comparisons over 20 years
- Generates interactive maps for public outreach"
```

### 🔄 **Automated Processing**

**Example: Batch Processing Multiple Regions**
```
"I have a list of 50 protected areas. Please create a batch processing workflow that:
1. Processes each area separately
2. Calculates vegetation indices for each season
3. Detects any significant changes or disturbances
4. Creates standardized reports for each area
5. Compiles results into a summary dashboard"
```

## Troubleshooting

### Common Issues and Solutions

#### **🔧 Extension Not Working**
- **Refresh the Earth Engine tab** and try again
- **Check your API keys** in the extension settings
- **Verify internet connection** for cloud-based providers
- **For Ollama**: Ensure it's running with `OLLAMA_ORIGINS="*" ollama serve`

#### **🚫 Tools Not Working**
- **Check model compatibility**: Ensure your selected model supports tools
- **For Ollama**: Use models with "tools" tag from [Ollama search](https://ollama.com/search)
- **Try a different provider**: Switch to OpenAI, Anthropic, Google, or Qwen for guaranteed tool support

#### **⚡ Performance Issues**
- **Use more specific prompts** to reduce processing time
- **Break complex tasks** into smaller steps
- **Check Earth Engine quotas** if operations fail
- **For local models**: Ensure sufficient system resources

#### **🐛 Code Errors**
- **Ask the agent to debug**: "This code has an error, please fix it"
- **Check console output**: "What errors are showing in the console?"
- **Reset workspace**: "Clear everything and start fresh"

#### **📡 Connectivity Issues**
- **Verify API keys** are correctly entered
- **Check provider status** (OpenAI, Anthropic, Google, Qwen status pages)
- **For Ollama**: Confirm local server is accessible at `http://localhost:11434`

### Getting Help

1. **Use the agent itself**: Ask "How do I..." or "Help me troubleshoot..."
2. **Check the console**: Look for error messages in browser developer tools
3. **Try different models**: Some models may work better for specific tasks
4. **Reset your workspace**: Use environment management tools to start fresh

## Privacy and Security

### Data Handling
- **API Keys**: Stored securely in Chrome extension storage, never shared
- **Chat History**: Kept locally in your browser, not sent to external servers
- **Code and Data**: Only shared with your selected AI provider during active conversations
- **Screenshots**: Stored locally or in your chosen location (Downloads, Google Drive)

### Best Practices
- **Keep API keys secure**: Don't share your extension settings or API keys
- **Review generated code**: Always review code before running important analyses
- **Use appropriate models**: Choose models based on your data sensitivity requirements
- **Regular updates**: Keep the extension updated for latest security features

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
