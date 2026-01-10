# Release Notes v1.2.0

**Release Date:** January 10, 2026

## 🚀 Major Features

### MCP Server Support
- Introduced the **Earth Agent MCP Server** (`mcp-server/`), allowing you to use Earth Agent's powerful tools directly from AI editors like **Claude Code**, **Cursor**, **Zed**, and **OpenCode**.
- Connects via WebSocket to the Chrome Extension to access your active Earth Engine session.

### Enhanced Agent Capabilities
- **Agent Profiles**: Create custom agent personas with specific system prompts and tool permissions (e.g., "Strict Coder", "Tutor").
- **Improved Code Editing**: 
  - New `undoEdit` tool to revert changes.
  - Visual **Diff View** cards to review code changes before applying them.
  - `insertAtLine` tool for precise code insertion.
- **Smart Execution**:
  - New `wait` tool helps the agent handle long-running Earth Engine tasks.
  - Upgraded to **Vercel AI SDK 6.0** for better stability and performance.
  - Enforced **Sequential Tool Execution** to prevent race conditions during complex tasks.

### Documentation & Developer Experience
- **Code Formatting**: Adopted **Prettier** for consistent code style across the project.
- **Documentation Overhaul**: Reorganized `docs/` and `reference/` for better navigation.
- Added `CODE_OF_CONDUCT.md` and updated `LICENSE`.

## 🛠️ Improvements & Fixes

- **Refactored Architecture**: Moved tool logic to a shared service layer (`src/lib/tools/services/`) to support both the extension and MCP server.
- **Settings**: 
  - Added support for **OpenAI Compatible** providers (e.g., Z.AI, GLM-4).
  - Added visual indicators for models that support multimodal inputs (images/screenshots).
- **Testing**: Added a comprehensive **Agent Testing Framework** within the extension.
- **UI Polish**: Improved the design of settings, chat interface, and tool output cards.
- **Bug Fixes**:
  - Fixed background script communication errors.
  - Resolved issues with parallel tool execution.
  - Fixed model selection state for custom providers.

## 📦 Installation & Upgrade

1. **Chrome Extension**: 
   - Load the unpacked extension from the `dist/` folder.
   - Or wait for the update on the Chrome Web Store.

2. **MCP Server**:
   ```bash
   npx -y earth-agent-mcp
   ```
