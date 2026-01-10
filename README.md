# Earth Agent Chrome Extension

<div align="center">
  <img src="src/assets/mydesign/Robot-earth-transparent-cut-edge.png" alt="Earth Agent Robot" width="200"/>
</div>

**Earth Agent** is a Cursor/Claude Code like AI-agent for Google Earth Engine. It can be used right in your browser as a Chrome extension or through MCP server support. It helps you do anything related to Google Earth Engine automatically through chatting (write code, run analysis, debug errors, explain maps, and manage your environment). Hatched from [sundai.club](https://www.sundai.club/projects/ad38a4e9-5cd5-4a90-b66c-c3f811cc5e8a).

[![Watch the Demo](https://img.youtube.com/vi/RkSconBroyY/0.jpg)](https://youtu.be/RkSconBroyY?si=otXuZP6L8sp48K_1)


> [!TIP]
> **Quick Start**: Install from [Chrome Web Store](https://chromewebstore.google.com/detail/earth-agent/hmpjiipbhhnppfdahieaafhdgdmhaple), set up your API key (OpenAI/Anthropic/Google) or MCP server with Claude Code/Cursor/Zed/OpenCode, and say "Help me map NDVI for California".

## Table of Contents
- [Features](#features)
- [Installation](#installation)
- [MCP Server Support](#mcp-server-support-new)
- [Configuration](#configuration)
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



## Installation

### Option 1: Install from Chrome Web Store (Easiest & Recommended)

1.  Visit the [Earth Agent page on the Chrome Web Store](https://chromewebstore.google.com/detail/earth-agent/hmpjiipbhhnppfdahieaafhdgdmhaple).
2.  Click "Add to Chrome".
3.  The extension will be added to your browser and will appear in your Chrome toolbar.

<details>
<summary><b>Option 2: Download from GitHub Releases</b></summary>

1. Go to the [Releases page](https://github.com/wybert/earth-agent-chrome-ext/releases)
2. Download the latest `earth-agent-extension.zip`
3. Extract the zip file to a folder on your computer
4. Open Chrome and navigate to `chrome://extensions/`
5. Enable "Developer mode" (toggle in the top right)
6. Click "Load unpacked" and select the extracted folder
7. The extension will appear in your Chrome toolbar

</details>

<details>
<summary><b>Option 3: Install from Source</b></summary>

1. Clone the repository
2. Install dependencies with `npm install`
3. Build the extension with `npm run build`
4. Load the unpacked extension from the `dist` directory in Chrome

</details>

## MCP Server Support (New!)

[![npm version](https://badge.fury.io/js/earth-agent-mcp.svg)](https://www.npmjs.com/package/earth-agent-mcp)

Earth Agent now includes an **MCP Server** that lets you use all its Earth Engine tools directly from your favorite AI code editor.

- **Seamless Integration**: Connects Claude Code, Cursor, OpenCode, or Zed to your browser session.
- **Full Tool Access**: Read/write code, inspect maps, take screenshots, and search docs from your terminal or editor.
- **No Extra Config**: works automatically with the Chrome extension.

### Quick Setup (No Build Required!)

> [!IMPORTANT]
> **Prerequisite**: You must install the [Chrome Extension](#installation) first! The MCP server relies on the extension to communicate with Earth Engine. After installing the Earth Agent Chrome extension, you need to go to settings and turn on the MCP server. It's better to keep the Earth Agent side panel open when you use the MCP server. Then add the configuration to your `Claude Code`, `Cursor`, or `Zed`:

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

## Configuration

> [!TIP]
> You do not have to do this if you only want to use Earth Agent MCP server. If you want to use it directly in your browser with external agents tools, you need to do this.

### API Keys

1. Click the Earth Agent extension icon in Chrome
2. Go to Settings
3. Configure your AI providers we support:
   - **OpenAI**: Add your OpenAI API key (supports GPT-5.2, GPT-5.2 Pro, GPT-5.1)
   - **Anthropic**: Add your Anthropic API key (supports Claude Opus 4.5, Sonnet 4.5, Haiku 4.5)
   - **Google**: Add your Google API key (supports Gemini 2.5 Pro, Gemini 3 Flash Preview)
   - **Z.AI**: Add your Z.AI API key (supports GLM-4.7)
   - **Custom OpenAI-Compatible Providers**: Add your custom OpenAI-compatible API key
4. Go back to the chat page, select your preferred model
5. Start chatting with Earth Engine!

### 📝 Custom Instructions

Just as software developers use files like `CLAUDE.md`, `GEMINI.md` or `AGENTS.md` to define project-specific rules for their AI coding assistants, Earth Agent allows you to set **Custom Instructions** to align the AI with your scientific or policy goals.

Think of it as giving the agent a "Standard Operating Procedure" for your research. This is powerful for:

- **Scientific Rigor**: e.g., "Always use the 'Cloud Score+' dataset for cloud masking in Sentinel-2 images."
- **Policy & Communication**: e.g., "Draft all explanations as policy briefs suitable for decision-makers, avoiding jargon."
- **Methodology Standardization**: e.g., "Always use median compositing instead of mean for annual composites."
- **Coding Conventions**: e.g., "Use functional programming styles in GEE (e.g., `map()`) over client-side loops."

**To configure:**
1. Open Extension Settings
2. Use **Custom Instructions** to set global preferences

### 🎭 Agent Profiles

This allow you to create your own agent with specific system prompt and tool access for specific workflows or use case. Each agent profile can have its own:
- **Custom System Prompt**: Define exactly how the agent should behave
- **Tool Access**: Enable or disable specific tools for focused tasks

**Example Profiles:**
- **"Strict Coder"**: Focused purely on writing optimized code, with no chit-chat.
- **"Tutor"**: Explains every step in detail for learning.
- **"Analyst"**: Specialized in statistical analysis and visualization.

**To configure:**
1. Open Extension Settings
2. Scroll to **Profiles** to create new agent personas



## How to Use the Extension

You can use this extension in two ways. Through MCP Server or use inside Earth Agent side panel. Mcp servers expose the same tools as the Earth Agent assistant. Check [MCP Server Support](#mcp-server-support-new) for more details for use it as MCP server. The following section will show you how to use it inside Earth Agent side panel.

### AI Agent Capabilities

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

### Getting Started

 After the configuration, 

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

### 🌍 Getting Started
```
Help me create a simple map showing NDVI for California using Landsat data
```

### 🛰️ Satellite Data Analysis
```
Find and display the latest Sentinel-2 image over New York City with less than 10% cloud cover
```

### 📊 Data Processing (⚡ Requires Do Mode)
```
Calculate zonal statistics for land use categories within protected areas and export the results to Drive
```

### � Complex Workflow (⚡ Requires Do Mode)
```
I want to analyze deforestation in the Brazilian Amazon from 2000 to 2023. 
Please create a complete workflow that:
1. Loads appropriate satellite imagery
2. Calculates forest loss over time
3. Creates visualizations showing the changes
4. Generates statistics by state/region
5. Exports the results for further analysis
```

### 🔧 Debugging
```
This code is running slowly, check my code for best practices and suggest improvements
```


## Available Tools & Functions

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


The extension provides powerful Earth Engine integration tools. All built-in providers support tool calling:

| Provider | Tool Support | Multimodal (Screenshot) |
|----------|-------------|------------------------|
| OpenAI | ✅ Full | ✅ Supported |
| Anthropic | ✅ Full | ✅ Supported |
| Google | ✅ Full | ✅ Supported |
| Z.AI | ✅ Full | ❌ Not supported |

**Note**: Z.AI currently does not support multimodal inputs, so screenshot analysis features are unavailable when using Z.AI models.

**Tip**: For the best Earth Engine integration experience with visual analysis capabilities, use OpenAI, Anthropic, or Google providers.




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
