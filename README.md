# Earth Agent Chrome Extension

<div align="center">
  <img src="src/assets/mydesign/Robot-earth-transparent-cut-edge.png" alt="Earth Agent Robot" width="200"/>
</div>

**Earth Agent** is a Cursor/Claude Code like AI-agent for Google Earth Engine. It can be used right in your browser as a Chrome extension or through MCP server support. It helps you do anything related to Google Earth Engine automatically through chatting (write code, run analysis, debug errors, explain maps, and manage your environment). Hatched from [sundai.club](https://www.sundai.club/projects/ad38a4e9-5cd5-4a90-b66c-c3f811cc5e8a).

> [!TIP]
> **Quick Start**: Install from [Chrome Web Store](https://chromewebstore.google.com/detail/earth-agent/hmpjiipbhhnppfdahieaafhdgdmhaple), set up your API key (OpenAI/Anthropic/Google), and say "Help me map NDVI for California".

[![Watch the Demo](https://img.youtube.com/vi/RkSconBroyY/0.jpg)](https://youtu.be/RkSconBroyY?si=otXuZP6L8sp48K_1)

## Table of Contents
- [Features](#features)
- [MCP Server Support](#mcp-server-support-new)
- [Installation](#installation)
- [Configuration](#configuration)
- [Customization](#customization)
- [Usage Examples & Prompts](#usage-examples--prompts)
- [Available Tools](#available-tools--functions)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## Features

- Chat interface for Earth Engine assistance
- Knows Earth Engine Data Catalog as well as community dataset
- Knows Earth Engine APIs
- Help you write code, and run the code
- Help debug the code
- Help you explain the map
- Planning and reasoning
- Environment management tools (reset map/console, clear code)
- Comprehensive agent testing framework with automated testing capabilities
- **Custom Instructions**: Tailor the AI's behavior and responses to your specific needs. Work like AGENTS.MD.
- **Agent Profiles**: Create and switch between different agent configurations for different tasks
- **MCP Server Support**: Use Earth Agent tools directly from [Claude Code](https://claude.ai/code), [Cursor](https://cursor.sh), or [Zed](https://zed.dev) via the Model Context Protocol.

## MCP Server Support (New!)

[![npm version](https://badge.fury.io/js/earth-agent-mcp.svg)](https://www.npmjs.com/package/earth-agent-mcp)

Earth Agent now includes an **MCP Server** that lets you use all its Earth Engine tools directly from your favorite AI code editor.

- **Seamless Integration**: Connects Claude Code, Cursor, or Zed to your browser session.
- **Full Tool Access**: Read/write code, inspect maps, take screenshots, and search docs from your terminal or editor.
- **No Extra Config**: works automatically with the Chrome extension.

### Quick Setup (No Build Required!)

Just add the configuration to your editor:

<details open>
<summary><b>Claude Code</b> (~/.claude/settings.json)</summary>

```json
{
  "mcpServers": {
    "earth-agent": {
      "command": "npx",
      "args": ["-y", "earth-agent-mcp"]
    }
  }
}
```
</details>

<details>
<summary><b>Cursor</b> (~/.cursor/mcp.json)</summary>

```json
{
  "mcpServers": {
    "earth-agent": {
      "command": "npx",
      "args": ["-y", "earth-agent-mcp"]
    }
  }
}
```
</details>

<details>
<summary><b>Zed</b> (~/.config/zed/settings.json)</summary>

```json
{
  "context_servers": {
    "earth-agent": {
      "command": {
        "path": "npx",
        "args": ["-y", "earth-agent-mcp"]
      }
    }
  }
}
```
</details>

Then:
1. **Open Chrome** with Earth Agent extension
2. **Navigate to** [code.earthengine.google.com](https://code.earthengine.google.com)
3. **Restart your editor** - the MCP tools will be available automatically!

👉 **[Full MCP Server Documentation](./mcp-server/README.md)** (troubleshooting, all 17 tools, usage examples)

## Extension Installation

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
   - **OpenAI**: Add your OpenAI API key (supports GPT-5.2, GPT-5.2 Pro, GPT-5.1)
   - **Anthropic**: Add your Anthropic API key (supports Claude Opus 4.5, Sonnet 4.5, Haiku 4.5)
   - **Google**: Add your Google API key (supports Gemini 2.5 Pro, Gemini 3 Flash Preview)
   - **Z.AI**: Add your Z.AI API key (supports GLM-4.7)
   - **Custom OpenAI-Compatible Providers**: Add your custom OpenAI-compatible API key
4. Select your preferred model
5. Start chatting with Earth Engine!


## Customization

### 🎭 Agent Profiles
Profiles allow you to save different agent configurations for specific workflows. Each profile can have its own:
- **Custom System Prompt**: Define exactly how the agent should behave
- **Tool Access**: Enable or disable specific tools for focused tasks

**Example Profiles:**
- **"Strict Coder"**: Focused purely on writing optimized code, with no chit-chat.
- **"Tutor"**: Explains every step in detail for learning.
- **"Analyst"**: Specialized in statistical analysis and visualization.

### 📝 Custom Instructions
You can provide global custom instructions that apply to all interactions. This is useful for:
- Enforcing specific coding styles (e.g., "Always use `var` instead of `const`")
- Setting preferred output formats (e.g., "Always add comments to every line")
- Defining role-playing behaviors

**To configure:**
1. Open Extension Settings
2. Scroll to **Profiles** to create new agent personas
3. Use **Custom Instructions** to set global preferences

## AI Model Tool Support

The extension provides powerful Earth Engine integration tools. All built-in providers support tool calling:

| Provider | Tool Support | Multimodal (Screenshot) |
|----------|-------------|------------------------|
| OpenAI | ✅ Full | ✅ Supported |
| Anthropic | ✅ Full | ✅ Supported |
| Google | ✅ Full | ✅ Supported |
| Z.AI | ✅ Full | ❌ Not supported |

**Note**: Z.AI currently does not support multimodal inputs, so screenshot analysis features are unavailable when using Z.AI models.

**Tip**: For the best Earth Engine integration experience with visual analysis capabilities, use OpenAI, Anthropic, or Google providers.

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

### Ask Mode vs Do Mode

The agent operates in two modes that you can switch between:

#### **Ask Mode (Read-Only)** 🔍
Analysis and guidance mode - the agent can observe but not modify:
- ✅ Read current code from the editor
- ✅ Search documentation (geeDocs)
- ✅ Take screenshots and inspect the page
- ✅ Read console output and map state
- ❌ Cannot insert or modify code
- ❌ Cannot execute code
- ❌ Cannot clear or reset the environment

**Best for**: Learning, understanding code, exploring datasets, getting explanations

#### **Do Mode (Full Access)** ⚡
Full execution mode - the agent can take action:
- ✅ All Ask Mode capabilities
- ✅ Write and edit code in the editor
- ✅ Execute code and monitor results
- ✅ Clear map, console, and inspector
- ✅ Complete end-to-end workflows

**Best for**: Building scripts, debugging, automated analysis, multi-step tasks

**Tip**: Start in Ask Mode when exploring new concepts, switch to Do Mode when ready to implement

## Usage Examples & Prompts

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

## 🚀 Advanced Workflows

### Complex Analysis
```
"I want to analyze deforestation in the Brazilian Amazon from 2000 to 2023. 
Please create a complete workflow that:
1. Loads appropriate satellite imagery
2. Calculates forest loss over time
3. Creates visualizations showing the changes
4. Generates statistics by state/region
5. Exports the results for further analysis"
```

### Data Science Integration
```
"Help me create a climate change impact study that:
1. Uses ERA5 temperature and precipitation data
2. Calculates 30-year climate normals
3. Identifies significant trends and anomalies
4. Creates publication-ready visualizations
5. Exports data in formats suitable for statistical analysis"
```

### Automated Processing
```
"I have a list of 50 protected areas. Please create a batch processing workflow that:
1. Processes each area separately
2. Calculates vegetation indices for each season
3. Detects any significant changes or disturbances
4. Creates standardized reports for each area
5. Compiles results into a summary dashboard"
```

## Available Tools & Functions

The Earth Agent includes powerful tools that enable it to interact directly with your Google Earth Engine environment:

### 🌍 **Earth Engine Integration Tools**

#### **Code Editor Integration**
- **readCode**: Read current code from the Earth Engine editor
- **writeCode**: Write new code to the editor (replaces all content)
- **editCode**: Modify specific parts of existing code
- **runCurrentCode**: Execute the code in your editor and monitor execution
- **undoEdit**: Revert the last code edit

#### **Dataset Discovery (geeDocs Tool)**
The `geeDocs` tool uses semantic search to find relevant documentation. **Ask like you're asking a person** - use natural language questions for best results:
- **geeDatasets**: Official Earth Engine dataset catalog (dataset IDs, bands, code examples)
- **communityDatasets**: Awesome GEE community datasets contributed by users
- **apiDocs**: Earth Engine API documentation (functions, usage, best practices)

Example queries:
- "What nighttime light datasets are available for urban analysis?"
- "How to load and visualize LANDSAT 8 surface reflectance imagery?"
- "Are there any global building footprint datasets?"

#### **Map and Visualization Tools**
- **Map Inspection**: Analyze what's currently displayed on your map
- **Layer Management**: Add, remove, and modify map layers
- **Visualization Parameters**: Automatically configure visualization settings
- **Legend Creation**: Generate appropriate legends for your data

#### **Environment Management**
- **clearMapInspectorAndConsole**: Clean up your workspace with a single command
- **getConsoleOutput**: Check console output and error messages
- **getMapScreenPosition**: Get map screen coordinates for inspection
- **getInspectorOutput**: Read Inspector panel data after clicking on map
- **screenshot**: Take snapshots of your work for documentation
- **snapshot**: Get DOM structure for page inspection

### 🌐 **Browser Automation Tools**

#### **Web Page Interaction**
- **clickByRefId**: Click elements by reference ID
- **clickAtScreenPosition**: Click at specific screen pixel coordinates
- **wait**: Wait for specified seconds (useful for page loading)

#### **Visual Analysis**
- **screenshot**: Capture the current browser state as an image
- **snapshot**: Get DOM structure snapshot for inspection

### 🔍 **Information and Research Tools**

#### **Weather Integration**
- **Current Weather**: Get real-time weather information for any location
- **Weather Data**: Access meteorological data for analysis
- **Climate Information**: Historical and current climate data

#### **Documentation Access (geeDocs)**
- **Semantic Search**: Natural language queries across all Earth Engine documentation
- **Three Sources**: Official datasets, community datasets, and API documentation
- **Code Examples**: Access curated code examples and tutorials
- **Best Practices**: Learn recommended approaches and patterns

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
**OpenAI, Anthropic, Google, Z.AI**: All tools and functions available
- Complete Earth Engine integration
- Full browser automation
- Advanced multi-step workflows
- Error recovery and debugging

### ⚠️ **Multimodal Limitation**
**Z.AI (GLM-4.7)**: Does not support multimodal inputs
- All text-based tools work fully
- Screenshot analysis features unavailable
- Use OpenAI, Anthropic, or Google for visual analysis tasks

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

- **Multi-Provider Support**: Test with OpenAI GPT models, Anthropic Claude models, Google Gemini, Z.AI models, or custom providers
- **Batch Testing**: Run multiple prompts automatically with configurable intervals
- **Environment Controls**: Configure reset and clear functions, including optional GEE editor reload
- **Results Analysis**: Export detailed test results with screenshots and metadata
- **Screenshot Storage**: Multiple storage options (local, downloads folder, Google Drive)
- **Tool Compatibility**: Automatically adapts testing based on model tool support capabilities

Access the testing panel by clicking the flask icon (🧪) in the main chat interface.



## Troubleshooting

### Common Issues and Solutions

#### **🔧 Extension Not Working**
- **Refresh the Earth Engine tab** and try again
- **Check your API keys** in the extension settings
- **Verify internet connection** for cloud-based providers

#### **🚫 Tools Not Working**
- **Check model compatibility**: All built-in providers (OpenAI, Anthropic, Google, Z.AI) support tools
- **Try a different model**: Some newer models may have better tool support
- **Refresh the extension**: Close and reopen the side panel

#### **📷 Screenshot Analysis Not Working**
- **Z.AI limitation**: Z.AI does not support multimodal inputs
- **Switch to another provider**: Use OpenAI, Anthropic, or Google for screenshot analysis
- **Text-based tools still work**: All other tools function normally with Z.AI

#### **⚡ Performance Issues**
- **Use more specific prompts** to reduce processing time
- **Break complex tasks** into smaller steps
- **Check Earth Engine quotas** if operations fail

#### **🐛 Code Errors**
- **Ask the agent to debug**: "This code has an error, please fix it"
- **Check console output**: "What errors are showing in the console?"
- **Reset workspace**: "Clear everything and start fresh"

#### **📡 Connectivity Issues**
- **Verify API keys** are correctly entered
- **Check provider status** (OpenAI, Anthropic, Google status pages)

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



## Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details on how to set up your development environment, build the project, and submit pull requests.


## License

MIT

## Thanks

- [Sundai Club](https://www.sundai.club/)
- React
- Vercel AI SDK
