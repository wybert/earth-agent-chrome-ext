# Changelog

## [v1.2.1] - 2026-01-10

### 🔧 Hotfixes & Polishes

- **Onboarding Fix**: Prioritized onboarding tour over auto-opening settings for new users.
- **Screenshot Stability**: Added retry logic and improved error handling for tab capture.
- **Settings UX**: Implemented auto-save on blur and added inline visual feedback icons for API keys.
- **Bug Fixes**: Removed TypeScript syntax from debug scripts and improved tab validation.

## [v1.2.0] - 2026-01-10

### 🚀 Major Features

- **MCP Server Support**: Use Earth Agent tools from Claude Code, Cursor, and Zed.
- **Agent Profiles**: Customizable personas with specific tools and prompts.
- **Enhanced Code Editing**: Undo support, diff views, and `insertAtLine` tool.
- **Prettier Formatting**: Standardized code style across the project.
- **Agent Testing Framework**: Built-in panel for automated agent testing.

### 🛠️ Improvements

- **Architecture**: Shared service layer for Extension and MCP server.
- **AI SDK 6.0**: Upgraded core AI libraries for better performance.
- **Settings**: Added OpenAI Compatible provider support (Z.AI/GLM).
- **Tooling**: Added `wait` tool and enforced sequential execution.
- **Documentation**: Reorganized `docs/` and `reference/` folders.

### 🐛 Bug Fixes

- Fixed parallel tool execution race conditions.
- Fixed background communication stability.
- Fixed custom provider model selection.

## [v1.1.0] - 2026-01-10

### ⚠️ Important Changes

- **Removed localhost permissions** for Chrome Web Store compliance
- **Ollama support unavailable** in Web Store version (manual install required)
- **Migrated from AI SDK 4.x to 5.0**

### 🎉 Major New Features

- **Support for GPT-5.1, Claude Sonnet 4.5, Gemini 3 Pro Preview**
- **Automatic Chrome Web Store Publishing** via GitHub Actions
- **New Onboarding Tour** for first-time users
- **Enhanced Testing Tools**:
  - Weather and DateTime tools
  - Comprehensive Agent Testing Panel with batch prompts and success tracking

### 🔧 Improvements

- **Multi-Provider Support**: 30+ models across OpenAI, Anthropic, Google, Qwen, and Ollama
- **UI/UX Enhancements**: Better context indicators, hover panes, and mobile design
- **Developer Tools**: Improved Inspector, Console, and Map info retrieval
- **Code Quality**: Refactored chat handler and utilities

### 🐛 Bug Fixes

- Fixed `--legacy-peer-deps` issues in CI/CD
- Fixed model selection UI bugs
- Fixed Inspector output accuracy and click tool behavior
- Resolved port connection and screenshot preview issues

### 📚 Documentation

- Added Chrome Web Store publishing guides
- Enhanced README and Privacy Policy
- Created auto-publishing quick reference

### 🔒 Security & Privacy

- Enhanced API key management and secret handling

### 🏗️ Technical Improvements

- Implemented resilient fetch with retry
- Added session limits and file upload improvements
