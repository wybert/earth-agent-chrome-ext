# Technical Context: Google Earth Engine Agent

## Core Technologies

### Chrome Extension Framework
- **Manifest V3** compliant extension architecture
- Chrome Side Panel API for persistent interface
- Content scripts for page interaction
- Background service worker for coordination
- Modern Chrome APIs (chrome.scripting) for execution

### Browser Automation Tools
- Click functionality with coordinate support
- Type functionality for input elements
- Snapshot tool with configurable depth
- Element inspection and interaction
- Robust error handling and reporting

### TypeScript Implementation
- Strong type safety throughout
- Interface definitions for messages
- Type checking for API responses
- Error type handling
- Chrome API type definitions

### Message Passing System
- Type-safe message definitions
- Robust error handling
- Response formatting standards
- Support for async operations
- State management

## Technical Requirements

### Browser Tool Requirements
1. **Click Tool**
   - Support for CSS selector targeting
   - Coordinate-based clicking
   - Element verification
   - Click event simulation
   - Error handling for missing elements

2. **Type Tool**
   - Support for various input types
   - Content replacement functionality
   - Event simulation
   - Error handling for invalid elements
   - Response formatting

3. **Snapshot Tool**
   - Configurable depth traversal
   - Accessibility tree construction
   - DOM structure capture
   - Serialization handling
   - Error management

4. **Element Tool**
   - Element property extraction
   - Position information
   - State detection
   - Attribute collection
   - Error reporting

### Chrome API Requirements
1. **Scripting API**
   - Proper function serialization
   - Argument handling
   - Response processing
   - Error catching
   - Context management

2. **Message Passing**
   - Type safety
   - Error propagation
   - Response formatting
   - State tracking
   - Timeout handling

## Implementation Details

### Browser Tool Implementation
```typescript
// Click Tool Interface
interface ClickParams {
  selector?: string;
  position?: {
    x: number;
    y: number;
  };
}

// Type Tool Interface
interface TypeParams {
  selector: string;
  text: string;
}

// Snapshot Tool Interface
interface SnapshotParams {
  maxDepth?: number;
}

// Element Tool Interface
interface GetElementParams {
  selector: string;
  limit?: number;
}
```

### Message Handling
```typescript
// Message Type Definitions
type MessageType = 
  | 'CLICK'
  | 'TYPE'
  | 'SNAPSHOT'
  | 'GET_ELEMENT';

interface Message {
  type: MessageType;
  payload?: any;
}

interface Response {
  success: boolean;
  error?: string;
  data?: any;
}
```

### Error Handling
```typescript
// Error Types
type ErrorType =
  | 'ELEMENT_NOT_FOUND'
  | 'INVALID_SELECTOR'
  | 'EXECUTION_ERROR'
  | 'TIMEOUT'
  | 'SERIALIZATION_ERROR';

interface ToolError {
  type: ErrorType;
  message: string;
  details?: any;
}
```

## Technical Challenges

### Current Challenges
1. **Chrome API Migration**
   - Serialization of function arguments
   - Handling of undefined/null values
   - Context preservation
   - Error propagation

2. **Tool Implementation**
   - Cross-browser compatibility
   - Event simulation accuracy
   - DOM traversal efficiency
   - Error recovery strategies

3. **Performance Optimization**
   - Message passing overhead
   - DOM operation efficiency
   - Memory usage in snapshots
   - Response time optimization

### Resolved Challenges
1. **Click Implementation**
   - Added coordinate support
   - Improved element finding
   - Enhanced error handling
   - Standardized responses

2. **Type Implementation**
   - Removed append complexity
   - Improved input handling
   - Enhanced error messages
   - Added event simulation

3. **Snapshot Implementation**
   - Added depth configuration
   - Improved serialization
   - Enhanced tree building
   - Optimized memory usage

## Technical Roadmap

### Short-term Goals
1. **Tool Enhancement**
   - Add more browser automation features
   - Improve error handling
   - Enhance performance
   - Add new capabilities

2. **API Migration**
   - Complete Manifest V3 updates
   - Improve security
   - Enhance reliability
   - Standardize patterns

### Long-term Goals
1. **Advanced Features**
   - Complex automation sequences
   - State management
   - Performance optimization
   - Enhanced error recovery

2. **Integration**
   - Tool coordination
   - State persistence
   - Cross-tool operations
   - Enhanced reliability

## Technical Dependencies

### Chrome APIs
- chrome.scripting
- chrome.runtime
- chrome.tabs
- chrome.sidePanel

### Development Tools
- TypeScript
- Webpack
- ESLint
- Jest

### Testing Framework
- Jest for unit tests
- Playwright for E2E tests
- Chrome Extension testing tools

## Technical Documentation

### API Documentation
- Tool interfaces
- Message formats
- Error types
- Response structures

### Implementation Guides
- Tool usage examples
- Error handling patterns
- Testing approaches
- Development workflows

### Best Practices
- Error handling
- Message passing
- Tool implementation
- Performance optimization

## Technologies Used

### Core Technologies

| Technology | Purpose | Version |
|------------|---------|---------|
| TypeScript | Type-safe language for development | 5.3.3 |
| Chrome Extension API | Browser extension platform | Manifest V3 |
| Google Earth Engine API | Earth data processing platform | Latest |
| Vercel AI SDK | Agent framework for AI functionality | Latest |
| Anthropic Claude API | Large language model provider | Latest |
| OpenAI API | Large language model provider | Latest |

### Frontend Technologies

| Technology | Purpose | Version |
|------------|---------|---------|
| HTML/CSS | UI structure and styling | HTML5/CSS3 |
| Tailwind CSS | Utility-first CSS framework | 3.4.1 |
| React | UI component library | 19.1.0 |
| React DOM | DOM manipulation for React | 19.1.0 |
| Radix UI | Accessible UI component primitives | Various |
| PostCSS | CSS processing tool | 8.4.35 |
| Lucide React | Icon library | 0.503.0 |

### AI & LLM Libraries

| Technology | Purpose | Version |
|------------|---------|---------|
| @ai-sdk/anthropic | Anthropic Claude integration via AI SDK | 1.2.10 |
| @ai-sdk/openai | OpenAI integration via AI SDK | 1.3.17 |
| @anthropic-ai/sdk | Direct Anthropic SDK | 0.39.0 |
| ai | Base Vercel AI SDK | 4.3.9 |
| @langchain/core | LangChain core functionality | 0.3.46 |
| @langchain/openai | LangChain OpenAI integration | 0.0.14 |
| @langchain/community | LangChain community models | 0.3.41 |

### UI Component Libraries

| Technology | Purpose | Version |
|------------|---------|---------|
| @radix-ui/react-dialog | Dialog component | 1.1.11 |
| @radix-ui/react-scroll-area | Scrollable areas | 1.2.6 |
| @radix-ui/react-slot | Slot component | 1.2.0 |
| class-variance-authority | Component variant management | 0.7.1 |
| clsx | CSS class string utility | 2.1.1 |
| tailwind-merge | Tailwind class merging utility | 3.2.0 |
| tailwindcss-animate | Animation utilities for Tailwind | 1.0.7 |

### Build Tools

| Technology | Purpose | Version |
|------------|---------|---------|
| Webpack | Module bundler for assets | 5.90.3 |
| npm | Package manager | Latest |
| ts-loader | TypeScript loader for webpack | 9.5.1 |
| copy-webpack-plugin | Asset copying for builds | 12.0.2 |
| css-loader | CSS processing for webpack | 6.10.0 |
| postcss-loader | PostCSS integration for webpack | 8.1.1 |
| html-webpack-plugin | HTML file generation | 5.6.0 |
| rimraf | Directory cleanup utility | 5.0.5 |
| sharp | Image processing | 0.34.1 |

### Development Tools

| Technology | Purpose | Version |
|------------|---------|---------|
| ESLint | Code linting | Latest |
| Prettier | Code formatting | Latest |
| Chrome DevTools | Extension debugging | Latest |
| Task Master AI | Task management | Latest |
| ts-node | TypeScript execution | 10.9.2 |

## Development Setup

### Prerequisites

1. **Node.js and npm**: Required for development, package management, and building the extension
2. **Chrome Browser**: Required for testing the extension
3. **Google Earth Engine Account**: Required for testing with the Earth Engine platform
4. **AI API Keys**:
   - **Anthropic API Key**: Required for Claude functionality
   - **OpenAI API Key**: Required for GPT functionality

### Environment Setup

1. **Clone Repository**:
   ```bash
   git clone https://github.com/kang/earth-agent-ai-sdk.git
   cd earth-agent-ai-sdk
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file with the following variables:
   ```
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   OPENAI_API_KEY=your_openai_api_key_here
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

## Project Structure

### Key Directories

| Directory | Purpose |
|-----------|---------|
| `/src` | Main source code |
| `/src/background` | Background service worker |
| `/src/content` | Content scripts for GEE interface |
| `/src/sidepanel` | Side panel UI components |
| `/src/components` | Reusable UI components |
| `/src/lib/tools` | Tool implementations |
| `/src/hooks` | React hooks |
| `/src/api` | API client functions |
| `/src/types` | TypeScript type definitions |
| `/dist` | Built extension files |
| `/docs` | Documentation |
| `/memory-bank` | Project memory and context |

### Important Files

| File | Purpose |
|------|---------|
| `manifest.json` | Chrome extension manifest |
| `webpack.config.js` | Webpack configuration |
| `tsconfig.json` | TypeScript configuration |
| `package.json` | Dependencies and scripts |
| `tailwind.config.js` | Tailwind CSS configuration |
| `.env` | Environment variables (local) |

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

4. **Provider Differences**:
   - Different capabilities between Claude and GPT models
   - Varying context window sizes
   - Different tool calling implementations
   - Output format variations
   - Pricing differences

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

- **react**, **react-dom**: For UI components and rendering
- **@vercel/ai**, **ai**: For AI agent capabilities
- **@anthropic-ai/sdk**, **@ai-sdk/anthropic**: For Anthropic Claude integration
- **openai**, **@ai-sdk/openai**: For OpenAI integration
- **@langchain/core**, **@langchain/openai**, **@langchain/community**: For advanced LLM capabilities
- **tailwindcss**, **class-variance-authority**, **tailwind-merge**: For styling
- **@radix-ui/***: For accessible UI components
- **lucide-react**: For icons
- **clsx**: For conditional classnames

### Development Dependencies

- **typescript**: TypeScript compiler
- **webpack** and related plugins: For bundling
- **@types/chrome**, **chrome-types**: Type definitions for Chrome API
- **ts-node**: For TypeScript execution in scripts
- **rimraf**: For clean build directory removal

## Development Environment Recommendations

1. **IDE**: Visual Studio Code with the following extensions:
   - ESLint
   - Prettier
   - Chrome Debugger
   - TypeScript Hero
   - Tailwind CSS IntelliSense

2. **Browser**: Chrome with the following extensions:
   - React DevTools
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

## GEE API Integration

The extension integrates with Google Earth Engine through:

1. **DOM Interaction**: For code editor and UI elements
2. **JavaScript API**: For dataset access and computation
3. **Console Monitoring**: For execution results and errors
4. **Map Interaction**: For visualization and inspection

No official extension points are provided by Earth Engine, so the integration relies on carefully crafted DOM selectors and interaction patterns that must be maintained as the GEE interface evolves. 