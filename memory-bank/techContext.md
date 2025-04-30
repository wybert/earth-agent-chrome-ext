# Technical Context: Google Earth Engine Agent

## Development Environment

### Core Technologies
- **TypeScript**: Primary programming language
- **React**: UI component framework
- **Tailwind CSS**: Utility-first CSS framework
- **Chrome Extension Manifest V3**: Extension architecture
- **Vercel AI SDK**: Framework for AI interactions, streaming responses, and agent capabilities
- **AI Models**: Anthropic Claude, OpenAI models

### Development Tools
- **Vite**: Build tool
- **Node.js**: JavaScript runtime
- **npm**: Package manager
- **Git**: Version control
- **ESLint/Prettier**: Code linting and formatting
- **Jest**: Testing framework

### Browser APIs
- **Chrome Extension APIs**
  - `chrome.runtime`: Message passing, background script management
  - `chrome.scripting`: Content script execution
  - `chrome.storage`: Data persistence
  - `chrome.sidePanel`: Side panel integration
  - `chrome.tabs`: Tab management

## Architecture

### Chrome Extension Structure
- **manifest.json**: Extension configuration
- **Background Script**: Service worker for persistence and API communication
- **Content Script**: Page interaction and DOM manipulation
- **Side Panel**: Primary UI surface
- **Extension Storage**: Configuration and state persistence

### Component Architecture
- **React Component Hierarchy**
  - `App`: Main container
  - `Chat`: Conversation interface
  - `EarthEngineAgent`: Earth Engine specific components
  - `Settings`: Configuration interface
  - UI components (buttons, inputs, etc.)

### State Management
- **React State**: Local component state
- **Chrome Storage**: Persistent application state
- **Context API**: Shared application state

### Messaging System
- **Background-Content Communication**: Chrome runtime messaging
- **Content-Side Panel Communication**: Chrome runtime messaging
- **Message Types**: Typed message definitions for type safety

### AI Integration
- **Vercel AI SDK**
  - Primary method for AI interactions
  - Streaming response handling
  - Tool invocation framework
  - Agent capabilities for multi-step reasoning

- **Direct API Integration (Fallback)**
  - Anthropic API
  - OpenAI API

- **Agent System Options**
  - **Client-side approach**: Using Vercel AI SDK agents
  - **Server-side options**: Mastra or Langchain (potential future implementation)

## Tools & Implementations

### Browser Tools
1. **Click Tool**
   - Function: `click(selector, options)`
   - Implementation: Uses `chrome.scripting.executeScript` to find elements and simulate clicks
   - Options: Coordinates, verification, timeout

2. **Type Tool**
   - Function: `type(selector, text, options)`
   - Implementation: Uses `chrome.scripting.executeScript` to find input elements and set values
   - Options: Focus simulation, event triggering

3. **Snapshot Tool**
   - Function: `snapshot(options)`
   - Implementation: Uses `chrome.scripting.executeScript` to capture DOM structure
   - Options: Depth, property selection, filtering

4. **Element Tool**
   - Function: `getElement(selector, options)`
   - Implementation: Uses `chrome.scripting.executeScript` to find and return element properties
   - Options: Property selection, multiple elements

### Earth Engine Tools
1. **Run Code Tool**
   - Function: `runCode()`
   - Implementation: Simulates clicking the run button in the GEE editor
   - Status: Basic implementation complete

2. **Edit Script Tool**
   - Function: `editScript(code)`
   - Implementation: Finds the code editor element and sets its content
   - Status: Basic implementation in progress

3. **Get Map Layers Tool**
   - Function: `getMapLayers()`
   - Implementation: Extracts layer information from the map interface
   - Status: Basic implementation in progress

4. **Inspect Map Tool**
   - Function: `inspectMap()`
   - Implementation: Captures current map state and visualization parameters
   - Status: Basic implementation in progress

5. **Check Console Tool**
   - Function: `checkConsole()`
   - Implementation: Captures output from the GEE console
   - Status: Basic implementation in progress

6. **Get Tasks Tool**
   - Function: `getTasks()`
   - Implementation: Retrieves current GEE task status information
   - Status: Basic implementation in progress

### Context Tools
1. **Context7 Integration**
   - Function: Various knowledge retrieval functions
   - Implementation: API calls to Context7 service for Earth Engine documentation
   - Status: Planning phase

## Multi-Step Tool Execution
1. **Agent Framework**
   - Implementation: Using Vercel AI SDK's agent capabilities
   - Status: Planning phase
   - Core Flow: Generate code → Insert code → Run code

2. **Future Server-Side Options**
   - **Mastra**: Server-side agent framework with memory persistence
   - **Langchain**: Tool integration and agent orchestration framework
   - Status: Under evaluation for later phases

## API Integration

### Anthropic API
- **Endpoints**: `/v1/messages`
- **Models**: `claude-3-opus`, `claude-3-sonnet`, `claude-3-haiku`
- **Features**: Streaming responses, tool use, system prompts
- **Implementation**: Direct API calls and Vercel AI SDK

### OpenAI API
- **Endpoints**: `/v1/chat/completions`
- **Models**: `gpt-4`, `gpt-3.5-turbo`
- **Features**: Streaming responses, function calling, system prompts
- **Implementation**: Direct API calls and Vercel AI SDK

### Context7 API
- **Endpoints**: Documentation retrieval
- **Features**: Earth Engine documentation access
- **Implementation**: Planned for future integration

## Security

### API Key Management
- **Storage**: Chrome extension secure storage with encryption
- **Access Control**: Background-script-only access to API keys
- **User Control**: User-provided API keys with option to store

### Permissions
- **Required Permissions**: 
  - `"sidePanel"`: For side panel integration
  - `"storage"`: For persistent storage
  - `"activeTab"`: For current tab interaction
  - `"tabs"`: For tab management
  - `"scripting"`: For content script execution
- **Host Permissions**:
  - `"https://code.earthengine.google.com/*"`: Earth Engine code editor
  - `"https://context7.com/*"`: Documentation service

## Data Flow

### User Request Processing
1. User submits query via side panel UI
2. Query is sent to background script
3. Background script gathers context from content script
4. Combined query + context sent to AI provider
5. Response streamed back through background script
6. Side panel UI renders streaming response
7. Tool invocations processed by background script and passed to content script

### Tool Execution Flow
1. AI decides to use a tool
2. Tool request sent to background script
3. Background script delegates to content script if needed
4. Content script executes DOM operations
5. Results returned to background script
6. Results sent back to AI for continued processing
7. Final response streamed to UI

### Multi-Step Tool Execution
1. AI makes initial reasoning step
2. First tool (e.g., code generation) is executed
3. Results are passed back to AI for evaluation
4. Second tool (e.g., code insertion) is executed based on first tool's output
5. Results passed back to AI for evaluation
6. Third tool (e.g., code execution) is executed based on previous steps
7. Final results displayed to user with explanation

## Performance Considerations

### Message Passing
- **Chunking**: Large payloads split into manageable chunks
- **Serialization**: Careful handling of non-serializable objects
- **Error Handling**: Robust timeout and retry mechanisms

### DOM Operations
- **Throttling**: Rate limiting for DOM operations
- **Batching**: Combining operations where possible
- **Async Processing**: Non-blocking implementations

### Storage
- **Limits**: Working within Chrome storage limits
- **Caching**: Strategic caching of frequently accessed data
- **Cleanup**: Regular pruning of unnecessary data

## Earth Engine Integration

### Earth Engine Code Editor
- **Structure**: Monaco-based editor with custom extensions
- **Integration Points**: Edit area, console output, map display, task panel
- **Challenges**: Dynamic DOM structure, iframe isolation

### Earth Engine API
- **JavaScript API**: Main interaction method
- **Documentation**: Available via Context7 and official docs
- **Common Patterns**: Dataset access, image processing, visualization

### Testing Environment
- **Sandbox**: Dev-mode extension for testing without publishing
- **Mock Data**: Simulated Earth Engine responses for unit testing
- **Isolated Testing**: Component-level tests without Earth Engine dependencies

## Deployment

### Distribution
- **Chrome Web Store**: Primary distribution channel
- **Enterprise Deployment**: Self-hosted option for organizations
- **Updates**: Automatic through Chrome Web Store

### Versioning
- **Semantic Versioning**: Major.Minor.Patch format
- **Release Cycle**: Regular updates with feature grouping
- **Changelog**: Maintained in GitHub and release notes

### Monitoring
- **Error Tracking**: Integration with error tracking service
- **Usage Analytics**: Basic anonymous usage statistics
- **Feedback Loop**: In-extension feedback mechanism

## Development Workflow

### Code Organization
- **Feature-based Structure**: Code organized by feature area
- **Component Isolation**: Each component has its own directory
- **Shared Utilities**: Common functions in shared libraries

### Documentation
- **JSDoc Comments**: Function and type documentation
- **README files**: Component and module documentation
- **Architecture Diagrams**: Visual representation of system structure

### Quality Assurance
- **Unit Tests**: Component and utility tests
- **Integration Tests**: Cross-component functionality tests
- **Manual Testing**: Interactive testing protocol
- **Code Reviews**: Required for all feature branches

## Open Technical Questions

1. **DOM Interaction Reliability**
   - How to best handle Earth Engine's dynamic DOM structure?
   - What selectors are most reliable for long-term compatibility?

2. **Performance Optimization**
   - What are the bottlenecks in the messaging system?
   - How to optimize DOM operations for better performance?

3. **Security Enhancements**
   - What additional measures are needed for API key protection?
   - How to implement proper content security policies?

4. **Advanced Tool Integration**
   - How to best implement multi-step tool executions?
   - What's the optimal agent architecture for Earth Engine interactions?

5. **Memory Management**
   - What's the best strategy for conversation history persistence?
   - How to implement efficient context window management?

6. **Server-side vs. Client-side Agents**
   - What are the trade-offs between client-only and server-assisted approaches?
   - How to implement memory persistence with reasonable complexity?
   - When is it appropriate to transition to a server-side solution? 