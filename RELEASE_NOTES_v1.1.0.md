# Earth Agent v1.1.0 Release Notes

## ⚠️ Important Changes

### Chrome Web Store Compliance
- **Removed localhost permissions** for Chrome Web Store compliance
- **Ollama support unavailable** in Web Store version
  - Web Store version supports: OpenAI, Anthropic, Google Gemini, Qwen
  - For Ollama users: Download from [GitHub Releases](https://github.com/wybert/earth-agent-chrome-ext/releases) and install manually

### AI SDK 5.0 Upgrade
- **Migrated from AI SDK 4.x to 5.0** for better performance and reliability
- Improved streaming capabilities and error handling
- Enhanced type safety and developer experience

## 🎉 Major New Features

### Latest AI Model Support
- **GPT-5.1** 🚀 - OpenAI's newest flagship model (Recommended)
- **GPT-5.1 Codex** - Specialized for code generation and analysis
- **Claude Sonnet 4.5** - Anthropic's latest and most capable (default)
- **Claude Haiku 4.5** - Ultra-fast responses with excellent quality
- **Claude Sonnet 3.7** - Enhanced reasoning capabilities
- **Gemini 3 Pro Preview** 🔥 - Google's experimental next-generation model
- **Gemini 2.5 Pro** - Massive 2M token context window
- Support for **30+ cutting-edge AI models** across 5 major providers

### Automatic Chrome Web Store Publishing
- **GitHub Actions Integration**: Automatically publish new versions to Chrome Web Store when pushing version tags
- **Streamlined Release Process**: Build, package, and submit for review with a single git tag push
- **Comprehensive Documentation**: Added detailed guides for setup and configuration

### Onboarding Tour
- New user onboarding experience to help users get started quickly
- Interactive tour highlighting key features and functionality

### Enhanced Testing Tools
- **Weather Tool**: Get real-time weather information
- **DateTime Tool**: Access current date and time information
- **Comprehensive Agent Testing Panel**:
  - Test multiple AI providers with batch prompts
  - **Helicone Integration**: AI observability and analytics
  - Real-time progress tracking with success rate calculation
  - Screenshot capture and CSV export
  - Support for JSON/CSV/TXT prompt files

## 🔧 Improvements

### Multi-Provider Support & Latest AI Models

**OpenAI (6 models)**
- GPT-5.1 (Recommended), GPT-5.1 Codex, GPT-5.1 Chat
- GPT-5, GPT-4.1, GPT-4o

**Anthropic (7 models)**
- Claude Sonnet 4.5, Claude Haiku 4.5 (Fast)
- Claude Opus 4.1, Claude Opus 4, Claude Sonnet 4
- Claude Sonnet 3.7, Claude Haiku 3.5

**Google Gemini (3 models)**
- Gemini 3 Pro Preview 🔥
- Gemini 2.5 Pro (2M context), Gemini 2.5 Flash

**Qwen (10 models)**
- Qwen Max/Plus/Turbo (Latest & Stable versions)
- Qwen VL Max (Vision-Language)
- Qwen 2.5 72B, Qwen 2.5 14B (1M context), Qwen 2.5 VL 72B

**Ollama (16+ local models)**
- Llama 3.3 70B, Llama 3.2 90B/70B, Llama 3.1 70B
- DeepSeek Coder V2, Mistral, Code Llama
- LLaVA (Vision models), Phi-3, Gemma 2, Moondream
- ⚠️ Note: Only available in manual installation from GitHub

**Additional Features**
- Support for OpenAI-compatible API providers
- Enhanced model selection UI
- Improved provider switching and configuration

### UI/UX Enhancements
- New context indicator for better status visibility
- Enhanced click indicators for better user feedback
- Improved hover pane styling for status information
- Redesigned message input box layout
- More responsive and mobile-friendly design
- Better session management interface

### Developer Tools
- Enhanced Inspector output tool
- Improved Console output capture
- Better Map information retrieval
- New GetScript tool for code inspection

### Code Quality
- Separated prompts from chat handler for better maintainability
- Consolidated utilities into single file
- Improved error handling across the application
- Better TypeScript type definitions

## 🐛 Bug Fixes

- Fixed `--legacy-peer-deps` dependency resolution in CI/CD
- Resolved model selection UI issues in new installations
- Fixed Inspector output tool accuracy
- Corrected click tool behavior with Gemini
- Fixed regenerate mode functionality
- Resolved port connection issues
- Fixed screenshot preview and attachment handling
- Corrected streaming cancel functionality
- Fixed code block wrapping and display issues

## 📚 Documentation

- Added comprehensive Chrome Web Store publishing guides (English & Chinese)
- Created quick reference guide for auto-publishing setup
- Added refresh token generation instructions
- Updated privacy policy documentation
- Enhanced README with detailed setup instructions
- Improved memory bank documentation

## 🔒 Security & Privacy

- Added detailed privacy descriptions
- Enhanced secure credential handling
- Improved API key management
- Better secret handling in CI/CD pipeline

## 🏗️ Technical Improvements

- Implemented resilient fetch with retry mechanism
- Added session number limitations
- Performance optimizations for Chat.tsx message streaming
- Better file upload handling with size limitations
- Enhanced port listening and connection management

## 📦 Dependencies & Technical Stack

### Major Updates
- **AI SDK 5.0**: Upgraded from 4.x for improved streaming and error handling
- **AI SDK React**: Updated to latest version with new hooks and utilities
- **Provider Packages**: Updated @ai-sdk/openai, @ai-sdk/anthropic, @ai-sdk/google

### Other Updates
- Fixed Zod v4 dependency conflicts with `--legacy-peer-deps`
- Added chrome-webstore-upload-cli for automation
- Updated various UI dependencies for better performance

## 🌐 Localization & Accessibility

- Better responsive design for different screen sizes
- Improved mobile layout
- Enhanced accessibility features
- Better color contrast and theme support

---

## 🚀 Installation

### Chrome Web Store (Recommended)
The extension is automatically submitted to Chrome Web Store and pending review (1-3 business days).

### Manual Installation
1. Download `earth-agent-extension.zip` from the [release assets](https://github.com/wybert/earth-agent-chrome-ext/releases/tag/v1.1.0)
2. Extract the zip file
3. Open Chrome and navigate to `chrome://extensions/`
4. Enable "Developer mode" (toggle in top right)
5. Click "Load unpacked" and select the extracted folder

## ⚙️ Configuration

After installation:
1. Click the Earth Agent extension icon
2. Go to Settings
3. Add your AI provider API key and choose from:

   - **OpenAI** (6 models)
     - GPT-5.1 🚀, GPT-5.1 Codex, GPT-5.1 Chat
     - GPT-5, GPT-4.1, GPT-4o

   - **Anthropic** (7 models)
     - Claude Sonnet 4.5, Claude Haiku 4.5, Claude Opus 4.1
     - Claude Opus 4, Claude Sonnet 4, Claude Sonnet 3.7, Claude Haiku 3.5

   - **Google Gemini** (3 models)
     - Gemini 3 Pro Preview 🔥, Gemini 2.5 Pro (2M), Gemini 2.5 Flash

   - **Qwen** (10 models)
     - Qwen Max/Plus/Turbo, Qwen VL Max, Qwen 2.5 series

   - **Ollama** (16+ local models)
     - ⚠️ Not available in Web Store version
     - Download from GitHub for Llama 3.3, DeepSeek, Mistral, LLaVA, etc.

4. Select your preferred provider and model
5. Start chatting with Earth Engine!

## 🔗 Resources

- [GitHub Repository](https://github.com/wybert/earth-agent-chrome-ext)
- [Privacy Policy](https://github.com/wybert/earth-agent-chrome-ext/blob/main/PRIVACY_POLICY.md)
- [Setup Guide](https://github.com/wybert/earth-agent-chrome-ext/blob/main/README.md)
- [Chrome Web Store Auto-Publishing Guide](https://github.com/wybert/earth-agent-chrome-ext/blob/main/docs/development/CHROME_WEB_STORE_PUBLISHING_EN.md)

## 💬 Feedback & Support

If you encounter any issues or have suggestions:
- [Report an Issue](https://github.com/wybert/earth-agent-chrome-ext/issues)
- [Discussions](https://github.com/wybert/earth-agent-chrome-ext/discussions)

---

**Full Changelog**: https://github.com/wybert/earth-agent-chrome-ext/compare/v1.0.4...v1.1.0

🤖 This release was automatically built and published using GitHub Actions.
