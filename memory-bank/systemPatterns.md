# System Patterns: Google Earth Engine Agent (Updated May 23, 2025)

## Architecture Overview

The Google Earth Engine (GEE) Agent is built as a Chrome extension with a multi-layered architecture:

```mermaid
graph TD
    UI[Side Panel UI] --> BG[Background Script]
    UI --> Lib[Tool Library @ /src/lib]
    BG --> Lib
    BG --> AI[AI Services / chat-handler.ts]
    BG --> CS[Content Script]
    Lib -.-> BG_Listener[Background Listener]
    AI -.-> BG_CS_Comm[Background -> CS Communication]
    BG_Listener -.-> BG_CS_Comm
    BG_CS_Comm --> CS
    CS --> GEE[Google Earth Engine]
```

### Key Components & Flow

1.  **Side Panel UI (`src/components/`)**: Primary user interface (React). Can directly call functions from the Tool Library for actions like UI-driven tests.
2.  **Tool Library (`src/lib/tools/`)**: Contains reusable functions (`editScript`, `runCode`, etc.) designed for GEE interaction. These functions detect their execution context and use `chrome.runtime.sendMessage` when called from the UI or content script.
3.  **Background Script (`src/background/`)**: Core orchestration layer.
    *   **`index.ts` (Main Listener):** Listens for `chrome.runtime.onMessage` events from the UI or Tool Library functions. Uses a helper (`sendMessageToEarthEngineTab`) to find the EE tab, validate the content script, and relay the message to the content script using `chrome.tabs.sendMessage`.
    *   **`chat-handler.ts` (AI Handler):** Handles AI interactions using Vercel AI SDK. Defines AI tools (`earthEngineScriptTool`, etc.). The `execute` block for these tools *must* implement the logic to find the EE tab, validate/inject the content script, and send messages *directly* to the content script using `chrome.tabs.sendMessage`. It **does not** call the Tool Library functions to avoid `window is not defined` errors in the background context.
4.  **Content Script (`src/content/`)**: Injected into the GEE page. Listens for messages from the background script (`chrome.tabs.onMessage`) and performs actual DOM interactions (e.g., editing CodeMirror, clicking Run).
5.  **AI Services**: External LLMs (Claude, GPT) accessed via Vercel AI SDK in `chat-handler.ts`.

## Agent Architecture

### Client-Side Agent (Current Implementation)

Utilizes the Vercel AI SDK within `chat-handler.ts` for agent capabilities:
- Sequential tool execution (e.g., `earthEngineDataset` -> `earthEngineScript` -> `earthEngineRunCode`).
- In-context reasoning between steps.
- Streaming responses.
- **Tool Execution Pattern (Background -> Content Script):** AI tool definitions in `chat-handler.ts` handle the direct `chrome.tabs.sendMessage` to the content script for page interactions.

### Server-Side Agent (Future Consideration)

Leveraging Mastra or Langchain could provide persistent memory and more complex orchestration but adds server-side infrastructure requirements.

## Message Flow Patterns

### User Query Processing (AI)

```mermaid
sequenceDiagram
    participant User
    participant UI as Side Panel UI
    participant BG_Chat as chat-handler.ts
    participant AI as Vercel AI SDK
    participant BG_Tool as Tool Execute Block
    participant CS as Content Script
    participant GEE as Google Earth Engine

    User->>UI: Submit Query
    UI->>BG_Chat: Send CHAT_MESSAGE
    BG_Chat->>AI: Process messages (streamText)
    AI->>AI: Reasoning / Tool Selection
    opt Tool Required (e.g., editScript)
        AI->>BG_Tool: Call earthEngineScriptTool.execute
        BG_Tool->>CS: Find Tab, Check/Inject CS, Send EDIT_SCRIPT (tabs.sendMessage)
        CS->>GEE: Interact with Editor DOM
        CS-->>BG_Tool: Return Tool Result
        BG_Tool-->>AI: Forward Result
        AI->>AI: Process Tool Result
    end
    AI-->>BG_Chat: Stream Final Response
    BG_Chat-->>UI: Stream Response Chunks
    UI-->>User: Display Response
```

### Direct UI Tool Call (e.g., Test Button)

```mermaid
sequenceDiagram
    participant User
    participant UI as Side Panel UI
    participant LibFunc as editScript() @ /src/lib
    participant BG_Listener as index.ts Listener
    participant BG_Helper as sendMessageToEE()
    participant CS as Content Script
    participant GEE as Google Earth Engine

    User->>UI: Click Test Button
    UI->>LibFunc: Call editScript("id", "code")
    LibFunc->>LibFunc: detectEnvironment() -> useBackgroundProxy=true
    LibFunc->>BG_Listener: Send EDIT_SCRIPT (runtime.sendMessage)
    BG_Listener->>BG_Helper: Call sendMessageToEarthEngineTab()
    BG_Helper->>CS: Find Tab, Check/Inject CS, Send EDIT_SCRIPT (tabs.sendMessage)
    CS->>GEE: Interact with Editor DOM
    CS-->>BG_Helper: Return Result
    BG_Helper-->>BG_Listener: Forward Result
    BG_Listener-->>LibFunc: Send Response
    LibFunc-->>UI: Return Result
    UI-->>User: Display Result/Status
```

## Component Patterns

### Side Panel UI
(Remains largely the same - standard React component structure)

### Tools Implementation
- **Reusable Functions (`src/lib/tools/`)**: Contain core logic, environment detection, and `runtime.sendMessage` for delegation.
- **AI Tool Definitions (`src/background/chat-handler.ts`)**: Define schema for AI, contain `execute` block with background-safe logic using `tabs.sendMessage` for page interactions.
- **Content Script Handlers (`src/content/index.ts`)**: Implement the actual DOM manipulation logic triggered by messages from the background.

## Data Flow Patterns

### Context Gathering

```mermaid
flowchart TD
    Start[Context Requested] --> CS[Content Script Activated]
    CS --> C1{Check Editor}
    C1 --> CE[Capture Editor Content]
    CS --> C2{Check Console}
    C2 --> CC[Capture Console Output]
    CS --> C3{Check Map}
    C3 --> CM[Capture Map State]
    CS --> C4{Check Panels}
    C4 --> CP[Capture Panel State]
    CE & CC & CM & CP --> Combine[Combine Context]
    Combine --> Format[Format for AI]
    Format --> Return[Return to Background]
```

### User Interface State Management

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Sending: User Submits
    Sending --> Streaming: AI Responds
    Streaming --> ToolExecution: Tool Use
    ToolExecution --> Streaming: Tool Completes
    Streaming --> Complete: Response Done
    Complete --> Idle: New Interaction
```

## Agent System Patterns

The agent system follows these patterns:

### Decision Making Flow

```mermaid
flowchart TD
    Start[User Request] --> Analyze[Analyze Request]
    Analyze --> D1{Needs Tools?}
    D1 -- Yes --> TS[Select Appropriate Tool]
    D1 -- No --> DR[Generate Direct Response]
    TS --> TE[Execute Tool]
    TE --> D2{Need Additional Tools?}
    D2 -- Yes --> TS
    D2 -- No --> FR[Generate Final Response]
    DR --> End[Return to User]
    FR --> End
```

### Multi-Step Tool Execution Pattern

```mermaid
flowchart TD
    Start[User Request] --> Plan[Plan Execution Steps]
    Plan --> T1[Step 1: Generate Earth Engine Code]
    T1 --> D1{Code Generated Successfully?}
    D1 -- Yes --> T2[Step 2: Insert Code to Editor]
    D1 -- No --> Error1[Handle Generation Error]
    T2 --> D2{Code Inserted Successfully?}
    D2 -- Yes --> T3[Step 3: Run Code]
    D2 -- No --> Error2[Handle Insertion Error]
    T3 --> D3{Code Ran Successfully?}
    D3 -- Yes --> Result[Present Results to User]
    D3 -- No --> Error3[Analyze Run Error]
    Error1 --> Recover1[Retry or Adjust Generation]
    Error2 --> Recover2[Retry Insertion]
    Error3 --> Recover3[Debug Code or Explain Error]
    Recover1 --> T1
    Recover2 --> T2
    Recover3 --> Result
```

### Agent Implementation with Vercel AI SDK

```mermaid
flowchart TD
    StartAgent[Initialize Agent] --> DP[Define Tools & Prompts]
    DP --> MH[Message Handler Setup]
    MH --> PM[Process Message]
    PM --> D1{Tool Selection}
    D1 -- Direct Response --> GR[Generate Response]
    D1 -- Use Tool --> TE[Execute Tool]
    TE --> PR[Process Result]
    PR --> D2{Complete Task?}
    D2 -- No --> D1
    D2 -- Yes --> GFR[Generate Final Response]
    GR --> Return[Return to User]
    GFR --> Return
```

The implementation uses the Vercel AI SDK's agent capabilities following this pattern:
- Tool definitions with JSON Schema
- Agent prompt with tool instructions
- FunctionCallingHandler for tool execution  
- Tool callbacks for content script operations
- Stream handling for progressive responses

## Error Handling Patterns

```mermaid
flowchart TD
    Error[Error Detected] --> Classify[Classify Error]
    Classify --> E1{Error Type}
    E1 -- Tool Execution --> TE[Tool Error Handler]
    E1 -- API --> AE[API Error Handler]
    E1 -- Context --> CE[Context Error Handler]
    E1 -- DOM --> DE[DOM Error Handler]
    TE & AE & CE & DE --> Format[Format Error]
    Format --> D1{Recoverable?}
    D1 -- Yes --> Retry[Retry Operation]
    D1 -- No --> Report[Report to User]
```

## Security Patterns

```mermaid
flowchart TD
    Security[Security Measures] --> SK[API Key Security]
    Security --> DP[Data Privacy]
    Security --> HC[Host Communication]
    
    SK --> SSK[Secure Storage]
    SK --> LAK[Limited Access]
    SK --> EK[Encryption]
    
    DP --> MT[Minimize Transfer]
    DP --> PL[Permission Limits]
    DP --> UC[User Control]
    
    HC --> VH[Validated Hosts]
    HC --> SP[Secure Protocols]
    HC --> CM[Content Security]
```

## Memory and State Management

```mermaid
flowchart TD
    State[State Management] --> CS[Client-Side Storage]
    State --> SS[Session State]
    State --> FS[Future Server State]
    
    CS --> CLS[Chrome Local Storage]
    CS --> CSS[Chrome Sync Storage]
    CS --> CES[Chrome Extension Storage]
    
    SS --> MH[Message History]
    SS --> UI[UI State]
    SS --> TC[Tool Context]
    
    FS --> PSM[Persistent Session Memory]
    FS --> UM[User Model]
    FS --> KG[Knowledge Graph]
```

## Testing Patterns

```mermaid
flowchart TD
    Testing[Testing Strategy] --> UT[Unit Tests]
    Testing --> IT[Integration Tests]
    Testing --> MT[Manual Tests]
    
    UT --> TC[Tool Components]
    UT --> MC[Message Components]
    UT --> UC[UI Components]
    
    IT --> TI[Tool Integration]
    IT --> AI[AI Integration]
    IT --> MI[Message Integration]
    
    MT --> TP[Tool Panel]
    MT --> EI[Extension Installation]
    MT --> UJ[User Journeys]
```

## Extension Integration Points

```mermaid
flowchart TD
    Integration[Integration Points] --> GEE[GEE Integration]
    Integration --> AI[AI Integration]
    Integration --> Browser[Browser Integration]
    
    GEE --> Code[Code Editor]
    GEE --> Console[Console Output]
    GEE --> Map[Map Visualization]
    GEE --> Tasks[Task Management]
    
    AI --> Claude[Claude API]
    AI --> GPT[GPT API]
    AI --> C7[Context7]
    
    Browser --> SP[Side Panel]
    Browser --> CS[Content Script]
    Browser --> BG[Background Worker]
```

## Development Workflow

```mermaid
flowchart TD
    Dev[Development Process] --> Local[Local Development]
    Dev --> Test[Testing]
    Dev --> Build[Building]
    
    Local --> Code[Code Changes]
    Local --> WP[Webpack Dev]
    Local --> LR[Load Unpacked]
    
    Test --> Unit[Unit Tests]
    Test --> Manual[Manual Tests]
    Test --> DevTools[DevTools Debug]
    
    Build --> Webpack[Webpack Production]
    Build --> Pack[Package Extension]
    Build --> Deploy[Upload to Chrome Store]
```

## Performance Optimization

```mermaid
flowchart TD
    Perf[Performance] --> MP[Message Passing]
    Perf --> DOM[DOM Operations]
    Perf --> AI[AI Requests]
    
    MP --> Batch[Batch Messages]
    MP --> Compress[Compress Data]
    MP --> TypedArrays[Use Typed Arrays]
    
    DOM --> Virtual[Virtual DOM]
    DOM --> Throttle[Throttle Operations]
    DOM --> Selective[Selective Updates]
    
    AI --> Stream[Streaming Responses]
    AI --> ContextLimit[Context Management]
    AI --> Cache[Response Caching]
```

## Future Architecture Considerations

### Potential Server-Side Components

```mermaid
graph TD
    Client[Chrome Extension] <--> Server[Server Components]
    Server --> Memory[Memory Bank]
    Server --> Agents[Agent Orchestration]
    Server --> KG[Knowledge Graph]
    Server --> Analytics[Usage Analytics]
    Memory --> Session[Session Persistence]
    Memory --> User[User Preferences]
    Memory --> History[Conversation History]
```

### Multi-Agent System

```mermaid
graph TD
    Coordinator[Agent Coordinator] --> CodeAgent[Code Generation Agent]
    Coordinator --> VisAgent[Visualization Agent]
    Coordinator --> DataAgent[Dataset Agent]
    Coordinator --> DebugAgent[Debug Agent]
    CodeAgent & VisAgent & DataAgent & DebugAgent --> Tools[Shared Tool Library]
```

### Progressive Enhancement

```mermaid
flowchart TD
    Phase1[Phase 1: Client-Only] --> Phase2[Phase 2: Client+Basic Server]
    Phase2 --> Phase3[Phase 3: Enhanced Server]
    Phase3 --> Phase4[Phase 4: Multi-Agent System]
    
    Phase1 --> P1F[Client-side AI SDK Agent]
    Phase1 --> P1T[Basic Tool Set]
    
    Phase2 --> P2M[Server Memory Persistence]
    Phase2 --> P2A[Enhanced Agent Capabilities]
    
    Phase3 --> P3K[Knowledge Integration]
    Phase3 --> P3C[Custom Training]
    
    Phase4 --> P4MA[Multiple Specialized Agents]
    Phase4 --> P4O[Orchestration Layer]
```

## Chrome Extension Architecture (Updated August 5, 2024)

The Earth Agent extension follows a standard Chrome extension architecture with clear separation of responsibilities:

1. **Background Script**: Central hub that coordinates all extension functionality
   - Located in `src/background/`
   - Runs persistently in the background
   - Handles message routing between components
   - Manages API requests and external services
   - Contains the AI agent logic in `chat-handler.ts`

2. **Content Script**: Runs in the context of Google Earth Engine web pages
   - Allows interaction with the page content
   - Communicates with the background script

3. **Side Panel UI**: User interface for interacting with the extension
   - Implemented with React components
   - Communicates with the background script via Chrome messaging

#### Key Components

- **Background Script (`src/background/`)**
  - `index.ts`: Main entry point handling message routing and tab connections
  - `chat-handler.ts`: Core AI logic for handling chat messages and tool execution

- **UI Components (`src/components/`)**
  - `Chat.tsx`: Main chat interface that passes messages to the background script
  - Supporting components for the UI experience

- **Content Script**
  - Interacts with Google Earth Engine pages
  - Extracts relevant information for the AI

- **Tools Library (`src/lib/tools/`)**
  - Context7 integration for documentation retrieval
  - Weather information tool
  - Earth Engine dataset documentation tool

### Background-centric Message Flow

1. User inputs a message in the UI (`Chat.tsx`)
2. Message is sent to the background script via Chrome messaging
3. Background script processes the message in `chat-handler.ts`
4. If tools are needed, they are called within the handler
5. Response is streamed back to the UI via the messaging port

### Agent Workflow Patterns

The Earth Engine assistant implements a sophisticated AI agent workflow based on the following patterns:

1. **Chaining Workflow for Dataset-Code Generation**:
   - When user asks about maps or visualizations, the agent follows a sequential process:
   - Step 1: Agent calls the earthEngineDataset tool to retrieve dataset information
   - Step 2: Agent processes the dataset information and metadata
   - Step 3: Agent generates code examples based on the retrieved dataset details
   
2. **Tool Integration Pattern**:
   - Tools are defined using Vercel AI SDK's tool interface
   - Each tool has a clear description, parameter schema, and execute function
   - Tools are made available to the AI model via the streamText configuration
   - The system prompt instructs the agent on when and how to use specific tools

3. **Error Resilience Pattern**:
   - Tools implement fallback mechanisms for communication failures
   - Context7 documentation retrieval first attempts Chrome messaging
   - Automatically falls back to direct API calls when primary method fails
   - Detailed logging captures tool execution performance and issues
``` 