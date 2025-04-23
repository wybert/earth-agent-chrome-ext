# System Patterns: Google Earth Engine Agent

## System Architecture

The Google Earth Engine Agent is built as a Chrome extension that integrates directly with the Google Earth Engine web interface. This architecture was chosen to provide seamless integration without requiring changes to the Earth Engine platform itself. The system follows a client-side integration pattern with carefully designed components that work together to provide AI-assisted functionality.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ Chrome Browser                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Google Earth Engine Web Interface                           ││
│  │  ┌─────────────────────┐      ┌───────────────────────────┐ ││
│  │  │                     │      │ GEE Agent Extension       │ ││
│  │  │                     │      │  ┌─────────────────────┐  │ ││
│  │  │                     │      │  │ UI Components       │  │ ││
│  │  │ Earth Engine        │◄────►│  │  - Sidepanel        │  │ ││
│  │  │ Code Editor         │      │  │  - Tooltips         │  │ ││
│  │  │ & Interface         │      │  │  - Popup            │  │ ││
│  │  │                     │      │  ├─────────────────────┤  │ ││
│  │  │                     │      │  │ Content Scripts     │  │ ││
│  │  │                     │      │  ├─────────────────────┤  │ ││
│  │  │                     │      │  │ Background Service  │  │ ││
│  │  │                     │      │  └─────────────────────┘  │ ││
│  │  └─────────────────────┘      └───────────────────────────┘ ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
                     ┌───────────────────────┐
                     │  External AI Services │
                     │  (Claude/GPT-4/etc.)  │
                     └───────────────────────┘
```

## Key Technical Decisions

### 1. Chrome Extension Framework

**Decision**: Implement as a Chrome extension rather than a standalone web application.

**Rationale**:
- Direct integration with the Earth Engine interface without platform modifications
- Access to DOM elements for context extraction and UI enhancement
- Ability to inject custom UI components into the existing interface
- User data remains local to the browser, enhancing privacy
- No need for server-side infrastructure to proxy Earth Engine interactions

**Implications**:
- Limited to Chrome/Chromium browsers
- Must handle Earth Engine UI changes gracefully
- Requires careful content script design to avoid conflicts
- Extension permissions must be clearly justified to users

### 2. Component Structure

**Decision**: Modular architecture with separation between UI, context extraction, and AI interaction.

**Rationale**:
- Clear separation of concerns
- Easier to maintain and extend individual components
- Facilitates testing of isolated functionality
- Allows updating AI backend without changing UI components
- Enables progressive enhancement of capabilities

**Implications**:
- Requires well-defined interfaces between components
- State management becomes more complex
- Must handle asynchronous communication between modules

### 3. Context Collection Strategy

**Decision**: Use content scripts to extract contextual information from the Earth Engine interface.

**Rationale**:
- Provides real-time access to user's code and actions
- Can observe DOM changes to track user interactions
- Allows capture of error messages and console output
- Can integrate with Earth Engine's JavaScript API
- Enables understanding of the user's current workspace state

**Implications**:
- Must handle page structure changes in Earth Engine
- Needs careful design to avoid performance impacts
- Requires selective context extraction to avoid overwhelming the AI
- Must manage user privacy concerns

### 4. AI Interface Approach

**Decision**: Use a modern LLM (Claude/GPT-4) with custom instructions to understand Earth Engine concepts.

**Rationale**:
- Leverages advanced contextual understanding capabilities
- Can be fine-tuned with Earth Engine-specific knowledge
- Flexible enough to handle diverse user queries
- Can generate code and explanations in appropriate formats
- Improves over time with feedback and additional examples

**Implications**:
- Requires API keys and authentication management
- Service costs scale with usage
- Must handle API rate limits and service interruptions
- Needs prompt engineering to optimize responses
- Context window limitations may affect complex queries

## Design Patterns

### 1. Observer Pattern

Used to monitor changes in the Earth Engine interface and code editor without directly modifying them. Content scripts act as observers that:
- Watch for DOM changes
- Monitor code changes in the editor
- Track console output and errors
- Observe map state and visualization changes

This pattern enables the agent to maintain awareness of the user's current context without interfering with normal Earth Engine operation.

### 2. Adapter Pattern

Employed to transform Earth Engine interface elements and user code into structured context that the AI can understand. Adapters:
- Parse JavaScript/Python code into structured representations
- Extract relevant metadata from datasets and functions
- Convert error messages into actionable context
- Transform Earth Engine concepts into AI-friendly descriptions

This abstraction layer allows the AI to work with consistent inputs regardless of Earth Engine updates or interface changes.

### 3. Command Pattern

Used for AI-generated code suggestions and actions, allowing:
- Preview of changes before application
- Undo/redo capability for applied suggestions
- Consistent handling of different action types
- Tracking of action history for context

This pattern gives users confidence in applying AI suggestions by making actions explicit and reversible.

### 4. Strategy Pattern

Implemented for different types of assistance, enabling the agent to:
- Switch between code generation, explanation, debugging, and dataset discovery modes
- Apply different context extraction techniques based on the current task
- Adapt prompt strategies based on user expertise level
- Use different visualization approaches based on data type

This flexibility allows the agent to adapt its approach to different user needs and tasks.

### 5. Facade Pattern

The sidepanel interface provides a simplified facade over the complex interactions between:
- Context extraction
- AI communication
- Response formatting
- Earth Engine API integration

This unifies the user experience while hiding the complexity of the underlying components.

## Component Relationships

### 1. Core Components

#### Background Service
- Manages extension lifecycle
- Handles authentication and API keys
- Coordinates between content scripts and UI
- Maintains state across different contexts
- Manages communication with AI services

#### Content Scripts
- Extract context from Earth Engine interface
- Monitor code editor and console
- Capture error messages and warnings
- Track visualization state and layers
- Inject UI components into the interface

#### Sidepanel UI
- Provides main interaction point for users
- Displays AI responses and suggestions
- Enables conversation with the agent
- Shows context awareness indicators
- Offers configuration options

#### Popup Interface
- Provides quick access to common functions
- Shows current status and context summary
- Offers settings and preferences
- Displays recent interactions history
- Provides help and documentation

#### Tooltips
- Offer contextual help on hover
- Explain Earth Engine concepts inline
- Provide quick dataset information
- Show function parameter details
- Highlight potential issues

### 2. Interaction Flow

```
User Action in Earth Engine
        │
        ▼
┌─────────────────┐    ┌─────────────────┐
│  Content Script  │───►│ Context Extractor│
└─────────────────┘    └─────────────────┘
        │                      │
        ▼                      ▼
┌─────────────────┐    ┌─────────────────┐
│ Background Service│◄──►│  Context Store  │
└─────────────────┘    └─────────────────┘
        │                      ▲
        ▼                      │
┌─────────────────┐    ┌─────────────────┐
│   AI Service    │───►│ Response Formatter│
└─────────────────┘    └─────────────────┘
        │                      │
        ▼                      ▼
┌─────────────────┐    ┌─────────────────┐
│   UI Components  │◄──►│  Action Handler │
└─────────────────┘    └─────────────────┘
        │
        ▼
  User Interface
```

## Security & Privacy Considerations

### 1. Data Handling

- User code and context are processed locally when possible
- Only necessary context is sent to external AI services
- No permanent storage of user code or Earth Engine data
- API keys are stored securely using Chrome's storage API
- Clear data lifecycle with automatic expiration

### 2. Permission Model

- Minimal required permissions in the extension manifest
- Explicit user consent for context extraction
- Transparency about what information is collected
- Option to disable features that require more sensitive permissions
- Regular security audits and updates

### 3. Integration Boundaries

- Content scripts operate in isolated worlds to prevent conflicts
- Communication with Earth Engine interface uses message passing
- Extension components cannot modify Earth Engine functionality
- Security sandbox ensures the extension cannot interfere with critical Earth Engine operations
- Clear error handling for integration boundary issues

## Performance Considerations

### 1. Context Optimization

- Selective capture of relevant context only
- Incremental context updates rather than full snapshots
- Throttling of rapid UI changes to prevent performance impact
- Background processing of complex context extraction
- Efficient serialization for AI service communication

### 2. Response Management

- Progressive loading of long AI responses
- Client-side caching of common queries and responses
- Preemptive suggestions based on user patterns
- Lazy loading of resource-intensive components
- Background prefetching for likely next queries

### 3. Resource Usage

- Event delegation to reduce listener overhead
- Worker threads for expensive operations
- Efficient DOM operations to avoid layout thrashing
- Careful management of memory usage
- Suspension of inactive features when not in use

## Extensibility Points

### 1. AI Provider Abstraction

The system includes an abstraction layer for AI services, allowing:
- Switching between different AI providers
- Supporting multiple models for different tasks
- Implementing local models for sensitive operations
- Custom model deployment for specialized functions
- Graceful fallback options if primary service is unavailable

### 2. Feature Modules

The extension supports dynamic loading of feature modules:
- Dataset-specific assistants
- Specialized analysis tools
- Custom visualization helpers
- Domain-specific knowledge packs
- User-created workflow templates

### 3. Context Providers

The context extraction system allows for custom providers:
- Integration with additional Earth Engine tools
- Support for common GIS file formats
- Connection to external data sources
- Custom metadata extractors
- User-defined context augmentation

## Testing Approach

### 1. Unit Testing

- Component isolation for predictable testing
- Mocked Earth Engine environment
- Simulated user interactions
- Test coverage for core utilities
- Regression testing for critical functions

### 2. Integration Testing

- End-to-end workflows with simulated Earth Engine
- Cross-component communication verification
- Browser compatibility testing
- Extension lifecycle testing
- API interaction testing with mocked responses

### 3. User Testing

- Task completion metrics
- Interface usability studies
- Performance benchmarking
- Error recovery scenarios
- Satisfaction and utility assessment 