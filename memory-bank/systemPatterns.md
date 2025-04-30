# System Patterns: Google Earth Engine Agent

## Architecture Overview

The Google Earth Engine (GEE) Agent is built as a Chrome extension with a multi-layered architecture:

```mermaid
graph TD
    UI[Side Panel UI] <--> BG[Background Service Worker]
    BG <--> CS[Content Script]
    BG <--> AI[AI Services]
    CS <--> GEE[Google Earth Engine]
    AI --> MOD{AI Models}
    MOD --> C[Claude]
    MOD --> G[GPT]
```

### Key Components

1. **Side Panel UI**: Primary user interface housed in Chrome's side panel
2. **Background Service Worker**: Core orchestration layer handling API requests and message routing
3. **Content Script**: DOM interaction layer injected into GEE page
4. **AI Service Layer**: Communication with language models and tool execution

## Agent Architecture

The agent architecture is designed to support intelligent, multi-step interactions using tools. There are two primary approaches under consideration:

### Client-Side Agent (Current Implementation)

```mermaid
graph TD
    User[User Query] --> SP[Side Panel]
    SP --> BG[Background Script]
    BG --> AI[Vercel AI SDK Agent]
    AI -- Tool Selection --> T1[Tool 1: Generate Code]
    AI -- Tool Selection --> T2[Tool 2: Insert Code]
    AI -- Tool Selection --> T3[Tool 3: Run Code]
    AI -- Tool Selection --> TN[Tool N: Other Tools]
    T1 --> BG2[Background Script]
    T2 --> BG2
    T3 --> BG2
    TN --> BG2
    BG2 --> CS[Content Script]
    CS --> GEE[Google Earth Engine]
    GEE --> CS2[Content Script]
    CS2 --> BG3[Background Script]
    BG3 --> AI2[AI Agent]
    AI2 --> SP2[Side Panel]
    SP2 --> User2[User]
```

This architecture uses the **Vercel AI SDK** for agent capabilities, allowing:
- Sequential tool execution (generate → insert → run)
- In-context reasoning between steps
- Streaming responses during multi-step operations
- Client-side context management

### Server-Side Agent (Future Consideration)

```mermaid
graph TD
    User[User Query] --> SP[Side Panel]
    SP --> BG[Background Script]
    BG --> Server[Server: Mastra/Langchain]
    Server -- Tool Selection --> T1[Tool 1: Generate Code]
    Server -- Tool Selection --> T2[Tool 2: Insert Code]
    Server -- Tool Selection --> T3[Tool 3: Run Code]
    Server -- Tool Selection --> TN[Tool N: Other Tools]
    T1 --> BG2[Background Script]
    T2 --> BG2
    T3 --> BG2
    TN --> BG2
    BG2 --> CS[Content Script]
    CS --> GEE[Google Earth Engine]
    GEE --> CS2[Content Script]
    CS2 --> BG3[Background Script]
    BG3 --> Server2[Server]
    Server2 --> SP2[Side Panel]
    SP2 --> User2[User]
```

This approach would leverage server-side frameworks like **Mastra** or **Langchain** for:
- Persistent memory across sessions
- More complex multi-agent coordination
- Reduced client-side complexity
- Advanced tool orchestration

## Message Flow Patterns

### User Query Processing

```mermaid
sequenceDiagram
    participant User
    participant UI as Side Panel UI
    participant BG as Background Script
    participant CS as Content Script
    participant AI as AI Service
    participant GEE as Google Earth Engine

    User->>UI: Submit Query
    UI->>BG: Send Query
    BG->>CS: Request Context
    CS-->>GEE: Extract State
    CS->>BG: Return Context
    BG->>AI: Query + Context
    AI-->>BG: Stream Response
    BG-->>UI: Stream Response
    UI-->>User: Display Response
```

### Tool Execution Flow

```mermaid
sequenceDiagram
    participant AI as AI Service
    participant BG as Background Script
    participant CS as Content Script
    participant GEE as Google Earth Engine
    
    AI->>BG: Tool Request
    BG->>CS: Execute Tool
    CS->>GEE: DOM Operation
    GEE-->>CS: Operation Result
    CS-->>BG: Tool Result
    BG-->>AI: Result
    AI->>AI: Process Result
```

### Multi-Step Tool Execution Flow

```mermaid
sequenceDiagram
    participant User
    participant AI as AI Agent
    participant T1 as Tool 1: Generate Code
    participant T2 as Tool 2: Insert Code
    participant T3 as Tool 3: Run Code
    participant GEE as Google Earth Engine
    
    User->>AI: Query ("Show Landsat imagery for NYC")
    AI->>AI: Initial Reasoning
    AI->>T1: Generate Earth Engine Code
    T1-->>AI: Return Generated Code
    AI->>AI: Analyze Code
    AI->>T2: Insert Code to Editor
    T2-->>AI: Return Insertion Result
    AI->>T3: Run Code in GEE
    T3->>GEE: Execute Code
    GEE-->>T3: Execution Result/Error
    T3-->>AI: Return Run Result
    AI->>AI: Generate Final Response
    AI-->>User: Complete Answer with Results
```

## Component Patterns

### Side Panel UI

The Side Panel is built as a React application with:

```mermaid
graph TD
    App[App] --> Chat[Chat Component]
    App --> Setting[Settings Component]
    Chat --> Messages[Messages Container]
    Chat --> Input[Input Component]
    Messages --> UserMsg[User Message]
    Messages --> AIMsg[AI Message]
    AIMsg --> Stream[Streaming Text]
    AIMsg --> Tools[Tool Responses]
```

### Tools Implementation

Each tool follows a consistent pattern:

```mermaid
graph TD
    Tool[Tool Implementation] --> Schema[Tool Schema]
    Tool --> Handler[Tool Handler]
    Tool --> Executor[Tool Executor]
    Handler --> BG[Background Handler]
    Executor --> CS[Content Script Executor]
    Schema --> Valid[Input Validation]
    Schema --> Docs[Documentation]
```

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