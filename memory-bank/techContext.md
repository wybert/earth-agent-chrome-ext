# Technical Context: Google Earth Engine Agent

## Technologies Used

### Core Technologies

| Technology | Purpose | Version |
|------------|---------|---------|
| TypeScript | Type-safe language for development | 5.0.4 |
| Chrome Extension API | Browser extension platform | Manifest V3 |
| Google Earth Engine API | Earth data processing platform | Latest |
| Vercel AI SDK | Agent framework for AI functionality | Latest |
| OpenAI API | Large language model provider | Latest |

### Frontend Technologies

| Technology | Purpose | Version |
|------------|---------|---------|
| HTML/CSS | UI structure and styling | HTML5/CSS3 |
| Tailwind CSS | Utility-first CSS framework | Latest |
| PostCSS | CSS processing tool | Latest |

### Build Tools

| Technology | Purpose | Version |
|------------|---------|---------|
| Webpack | Module bundler for assets | 5.85.0 |
| npm | Package manager | Latest |
| ts-loader | TypeScript loader for webpack | Latest |
| copy-webpack-plugin | Asset copying for builds | Latest |
| css-loader | CSS processing for webpack | Latest |
| postcss-loader | PostCSS integration for webpack | Latest |

### Development Tools

| Technology | Purpose | Version |
|------------|---------|---------|
| ESLint | Code linting | Latest |
| Prettier | Code formatting | Latest |
| Chrome DevTools | Extension debugging | Latest |
| Task Master AI | Task management | Latest |

## Development Setup

### Prerequisites

1. **Node.js and npm**: Required for development, package management, and building the extension
2. **Chrome Browser**: Required for testing the extension
3. **Google Earth Engine Account**: Required for testing with the Earth Engine platform
4. **OpenAI API Key**: Required for LLM functionality (development and production)

### Environment Setup

1. **Clone Repository**:
   ```bash
   git clone [repository-url]
   cd earth-agent-ai-sdk
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file with the following variables:
   ```
   OPENAI_API_KEY=your_api_key_here
   ```

4. **Development Build**:
   ```bash
   npm run dev
   ```

5. **Production Build**:
   ```bash
   npm run build
   ```

### Extension Installation (Development Mode)

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked" and select the `dist` directory from the project
4. The extension should now be installed and visible in Chrome

### Development Workflow

1. Make code changes in the `src` directory
2. Webpack will automatically rebuild on file changes when using `npm run dev`
3. Refresh the extension in Chrome's extension management page to apply changes
4. Use Chrome DevTools to debug:
   - Right-click the extension icon and select "Inspect pop-up" (for popup debugging)
   - Navigate to a GEE page and use the DevTools console (for content script debugging)
   - Use the background page DevTools via the extension management page (for background script debugging)

## Technical Constraints

### Chrome Extension Constraints

1. **Manifest V3 Limitations**:
   - Background scripts limited to service workers (no persistent background pages)
   - Content script execution context limitations
   - Cross-origin request restrictions
   - Limited access to certain Chrome APIs

2. **Side Panel Constraints**:
   - Limited width (cannot be resized beyond Chrome's constraints)
   - Only available in supporting browser versions
   - Cannot be automatically opened (must be user-initiated)

3. **Permissions Model**:
   - Host permissions required for GEE domain
   - API permissions must be declared in manifest
   - Users must explicitly grant permissions

### Google Earth Engine Constraints

1. **DOM Structure**:
   - No official API for DOM interaction
   - Page structure may change without notice
   - Need to maintain selectors for key elements

2. **Code Execution**:
   - No direct API for code execution
   - Must simulate user input for code insertion
   - Console output capture requires DOM monitoring

3. **Rate Limitations**:
   - GEE has API rate limits
   - Computation quotas per user
   - May restrict frequency of automated operations

### AI and LLM Constraints

1. **Token Limitations**:
   - Context window size limits
   - Need for efficient prompt engineering
   - Balance between context and cost

2. **API Key Management**:
   - Secure storage of API keys
   - User-provided vs. built-in keys
   - Usage tracking and limits

3. **Response Time**:
   - LLM response latency
   - Need for streaming responses
   - User experience considerations for longer operations

### Client-Side Only Architecture

1. **Storage Limitations**:
   - Chrome storage API size limits
   - No server-side database for persistence
   - Local storage constraints

2. **Computation Limits**:
   - Browser-based JavaScript performance constraints
   - Memory limitations
   - Background service worker lifecycle management

3. **Offline Functionality**:
   - Need to handle offline/online transitions
   - Graceful degradation when API services unavailable
   - Cache management for critical resources

## Dependencies

### Core Dependencies

- **@vercel/ai**: For AI agent capabilities
- **openai**: For LLM API interactions
- **tailwindcss**: For styling
- **postcss**: For CSS processing

### Development Dependencies

- **typescript**: TypeScript compiler
- **webpack** and related plugins: For bundling
- **@types/chrome**: Type definitions for Chrome API
- **eslint** and related plugins: For code quality
- **prettier**: For code formatting

## Development Environment Recommendations

1. **IDE**: Visual Studio Code with the following extensions:
   - ESLint
   - Prettier
   - Chrome Debugger
   - TypeScript Hero

2. **Browser**: Chrome with the following extensions:
   - React DevTools (if using React)
   - Redux DevTools (if using Redux)
   - Extension Reloader

3. **Terminal**: Integrated terminal or separate terminal for running npm scripts

4. **Version Control**: Git with conventional commit messages

## Browser Compatibility

| Browser | Support Status | Notes |
|---------|---------------|-------|
| Chrome | Fully Supported | Primary target platform |
| Edge | Probably Compatible | Uses Chromium engine |
| Firefox | Not Compatible | Manifest V3 differences |
| Safari | Not Compatible | No extensions support | 