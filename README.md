# Earth Agent Chrome Extension

<div align="center">
  <img src="src/assets/mydesign/Robot-earth-transparent-cut-edge.png" alt="Earth Agent Robot" width="200"/>
</div>

**Earth Agent** is a Cursor-like AI agent for Google Earth Engine. It can be used right in your browser as a Chrome extension or through MCP server support. It helps you do anything related to Google Earth Engine automatically through chatting (write code, run analysis, debug errors, explain maps, and manage your environment). Hatched from [sundai.club](https://www.sundai.club/projects/ad38a4e9-5cd5-4a90-b66c-c3f811cc5e8a).

[![Watch the Demo](https://img.youtube.com/vi/RkSconBroyY/0.jpg)](https://youtu.be/RkSconBroyY?si=otXuZP6L8sp48K_1)

> [!TIP]
> **Quick Start**: Install from [Chrome Web Store](https://chromewebstore.google.com/detail/earth-agent/hmpjiipbhhnppfdahieaafhdgdmhaple), set up your API key (OpenAI/Anthropic/Google) or MCP server with Claude Code/Cursor/Zed/OpenCode, and say "Help me map NDVI for California".

<details>
<summary><b>Table of Contents</b></summary>

- [Features](#features)
- [Installation](#installation)
- [MCP Server Support](#mcp-server-support-new)
- [Configuration](#configuration)
- [How to Use the Extension](#how-to-use-the-extension)
- [Usage Examples & Prompts](#usage-examples--prompts)
- [Available Tools & Functions](#available-tools--functions)
- [Usage Tips](#usage-tips)
- [Troubleshooting & Help](docs/TROUBLESHOOTING.md)
- [Privacy and Security](#privacy-and-security)
- [Roadmap](roadmap.md)
- [Changelog](CHANGELOG.md)
- [Contributing](#contributing)

</details>

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

**Best for**: Standard users who want to use OpenAI, Anthropic, or Google Gemini.

1.  Visit the [Earth Agent page on the Chrome Web Store](https://chromewebstore.google.com/detail/earth-agent/hmpjiipbhhnppfdahieaafhdgdmhaple).
2.  Click "Add to Chrome".
3.  The extension will be added to your browser and will appear in your Chrome toolbar.

> [!NOTE]
> The Web Store version does **not** support local connections (MCP Server or Ollama) due to store policies. For those features, use **Option 2**.

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



## Configuration

> [!TIP]
> You do not have to do this if you only want to use Earth Agent as MCP server. If you want to use it directly in your browser without external agents tools, you need to do this.

### API Keys

1. Click the Earth Agent extension icon in Chrome
2. Go to Settings
3. Configure your AI providers keys. we support OpenAI, Anthropic, Google, Z.AI, and Custom OpenAI-Compatible Providers. You need input at least one of them to use Earth Agent.
4. Go back to the chat page, select your preferred model
5. Start chatting with Earth Engine!

<details>
<summary><b>Custom Instructions (AGENTS.md)</b></summary>

Just as software developers use files like `CLAUDE.md`, `GEMINI.md` or `AGENTS.md` to define project-specific rules for their AI coding assistants, Earth Agent allows you to set **Custom Instructions** to align the AI with your scientific or policy goals. Think of it as giving the agent a "Standard Operating Procedure" for your research. This is powerful for:

- **Scientific Rigor**: e.g., "Always use the 'Cloud Score+' dataset for cloud masking in Sentinel-2 images."
- **Policy & Communication**: e.g., "Draft all explanations as policy briefs suitable for decision-makers, avoiding jargon."
- **Methodology Standardization**: e.g., "Always use median compositing instead of mean for annual composites."
- **Coding Conventions**: e.g., "Use functional programming styles in GEE (e.g., `map()`) over client-side loops."

**To configure:**

1. Open Extension Settings
2. Use **Custom Instructions** to set global preferences

</details>

<details>
<summary><b>Agent Profiles (Custom Agents)</b></summary>

This allows you to create your own agent with specific system prompts and tool access for specific workflows or use cases. Each agent profile can have its own:

- **Custom System Prompt**: Define exactly how the agent should behave
- **Tool Access**: Enable or disable specific tools for focused tasks

**Example Profiles:**

- **"Strict Coder"**: Focused purely on writing optimized code, with no chit-chat.
- **"Tutor"**: Explains every step in detail for learning.
- **"Analyst"**: Specialized in statistical analysis and visualization.

**To configure:**

1. Open Extension Settings
2. Scroll to **Profiles** to create new agent personas

</details>

## How to Use the Extension

You can use this extension in two ways: through the MCP Server or inside the Earth Agent side panel. MCP servers expose the [same tools](##available-tools--functions) as the Earth Agent assistant. Check [MCP Server Support](#mcp-server-support-new) for details on using it as an MCP server. The following section will show you how to use it inside the Earth Agent side panel.

### Getting Started

After configuration:

1. **Open Google Earth Engine Code Editor** in a Chrome tab: https://code.earthengine.google.com/
2. **Click the Earth Agent extension icon** in your Chrome toolbar
3. **Start chatting!** The agent can see your Earth Engine environment and help with any GEE-related tasks

> [!NOTE]
> The agent can only see the code in temp/new scripts in the Google Earth Engine Code Editor for now. You should save it once you think the script is ready.

<details>
<summary><b>Ask Mode vs Do Mode</b></summary>

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

</details>

## Developer & Advanced Usage

### 🚀 MCP Server Support (Developer Version Only)

[![npm version](https://badge.fury.io/js/earth-agent-mcp.svg)](https://www.npmjs.com/package/earth-agent-mcp)

**Earth Agent** can work as a local [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server, allowing you to control Google Earth Engine directly from **Claude Code**, **Cursor**, **Zed**, or other AI editors.

> [!WARNING]
> **Availability Note**: The **Chrome Web Store version** of Earth Agent supports **Cloud AI only** (OpenAI, Anthropic, Google) due to browser security restrictions on `localhost` connections.
>
> To use the **MCP Server** (or local Ollama models), you must install the **Developer Version** from GitHub.

#### How to Enable MCP Support

1.  **Install the Developer Version**:
    *   Download `earth-agent-extension.zip` from [GitHub Releases](https://github.com/wybert/earth-agent-chrome-ext/releases).
    *   Unzip and install via `chrome://extensions/` > "Load unpacked".
2.  **Enable in Settings**:
    *   Open Earth Agent settings.
    *   Find "External Integrations" and enable "MCP Server".
3.  **Configure your Editor**:
    *   Add the following to your MCP configuration (e.g., `~/.claude/settings.json`):

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

👉 **[Full MCP Server Documentation](./mcp-server/README.md)**

## Usage Examples & Prompts

🌍 Getting Started

```
Help me create a simple map showing NDVI for California using Landsat data
```

🛰️ Satellite Data Analysis

```
Find and display the latest Sentinel-2 image over New York City with less than 10% cloud cover
```

📊 Data Processing (⚡ Requires Do Mode)

```
Calculate zonal statistics for land use categories within protected areas and export the results to Drive
```

🚀 Complex Workflow (⚡ Requires Do Mode)

```
I want to analyze deforestation in the Brazilian Amazon from 2000 to 2023.
Please create a complete workflow that:
1. Loads appropriate satellite imagery
2. Calculates forest loss over time
3. Creates visualizations showing the changes
4. Generates statistics by state/region
5. Exports the results for further analysis
```

🔧 Debugging

```
This code is running slowly, check my code for best practices and suggest improvements
```

## Available Tools & Functions

Earth Agent provides a comprehensive set of tools available both in the Chrome Extension and via MCP.

| Category         | Agent Tool Name               | MCP Tool Name      | Description                      |
| ---------------- | ----------------------------- | ------------------ | -------------------------------- |
| **Code Editing** | `readCode`                    | `read_gee_code`    | Read current code from editor    |
|                  | `editCode`                    | `edit_gee_code`    | Edit code using search & replace |
|                  | `writeCode`                   | `write_gee_code`   | Overwrite entire editor content  |
|                  | `undoEdit`                    | `undo_gee_edit`    | Revert last edit                 |
|                  | `insertAtLine`                | N/A                | Insert text at specific line     |
| **Execution**    | `runCurrentCode`              | `run_gee_code`     | Run the script in editor         |
|                  | `wait`                        | `wait`             | Wait for execution/loading       |
| **Analysis**     | `getConsoleOutput`            | `gee_console`      | Read console logs & errors       |
|                  | `getMapScreenPosition`        | `gee_map_position` | Get map bounds & zoom            |
|                  | `getInspectorOutput`          | `gee_inspector`    | Read inspector panel data        |
|                  | `screenshot`                  | `gee_screenshot`   | Take screenshot of interface     |
|                  | `snapshot`                    | `gee_snapshot`     | Get accessibility DOM tree       |
| **Knowledge**    | `geeDocs`                     | `gee_docs`         | Search datasets & API docs       |
|                  | `weather`                     | `weather`          | Get weather data                 |
|                  | `dateTime`                    | `date_time`        | Get current date/time            |
| **Control**      | `clearMapInspectorAndConsole` | `clear_gee`        | Reset workspace                  |
|                  | `clickByRefId`                | `click_element`    | Click element by ID              |
|                  | `clickAtScreenPosition`       | `click_position`   | Click at coordinates             |

> [!NOTE]
> Z.AI currently does not support multimodal inputs yet, so screenshot analysis features are unavailable when using Z.AI models. For the best Earth Engine integration experience with visual analysis capabilities, use OpenAI, Anthropic, or Google providers.

## Usage Tips

### **For Maximum Productivity**

1. **Use tool-compatible models** when you need automated code execution
2. **Be specific** in your requests for better results
3. **Ask for explanations** to learn Earth Engine concepts
4. **Use workspace management** tools to keep your environment clean
5. **Take screenshots** to document your work and results

### **Common Workflows**

1. **Exploratory Analysis**: Ask questions → Get code → Run and iterate
2. **Data Processing**: Define requirements → Generate pipeline → Execute and export
3. **Visualization**: Create map → Style layers → Add legends → Capture results
4. **Debugging**: Describe problem → Analyze code → Apply fixes → Test solution

## Troubleshooting & Help

See **[Troubleshooting Guide](docs/TROUBLESHOOTING.md)** for solutions to common issues (API keys, connectivity, tools, screenshots) and help resources.

## Privacy and Security

We take your privacy seriously. Your API keys are stored securely in your browser using Chrome Sync and never share to our serever (even if we have one). Chat history and code remain local, it will sent to the LLM provider you choose. For full details on data handling and security practices, please read our [Privacy Policy](PRIVACY_POLICY.md).


## Roadmap

See [roadmap.md](roadmap.md) for our planned features and future development.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a detailed history of changes.

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details on how to set up your development environment, build the project, and submit pull requests.

## License

[MIT](LICENSE)

## Thanks

- [Sundai Club](https://www.sundai.club/)
- React
- Vercel AI SDK
