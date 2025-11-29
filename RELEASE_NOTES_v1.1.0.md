# Earth Agent v1.1.0 Release Notes

## 🎉 Major New Features

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
- **Comprehensive Agent Testing Panel**: Test multiple AI providers with batch prompts

## 🔧 Improvements

### Multi-Provider Support
- Added support for OpenAI-compatible providers
- Enhanced model selection UI for new installations
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

## 📦 Dependencies

- Fixed Zod v4 dependency conflicts with `--legacy-peer-deps`
- Updated AI SDK packages
- Added chrome-webstore-upload-cli for automation

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
3. Add your AI provider API key:
   - OpenAI API key
   - Anthropic API key
   - Google Gemini API key
   - Qwen API key
   - Ollama (local installation)
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
