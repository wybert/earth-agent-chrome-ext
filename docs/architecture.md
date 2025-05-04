# Earth Agent Chrome Extension Architecture

## Overview

The Earth Agent extension follows a standard Chrome extension architecture with a clear separation of responsibilities:

1. **Background Script**: The central hub that coordinates all extension functionality
2. **Content Script**: Runs in the context of web pages to interact with Google Earth Engine
3. **Side Panel UI**: The user interface for the extension, implemented with React components

## Key Components

### Background Script (`src/background/`)

The background script is the heart of the extension, running persistently and handling:

- Message routing between components
- API requests to external services (Context7)
- Connection management to Earth Engine tabs
- Chat processing and AI interactions

Key files:
- `index.ts`: Main background script entry point and message handler
- `chat-handler.ts`: Processes chat requests using the AI SDK

### Side Panel UI (`src/components/`)

The UI components run in the extension's side panel and provide:

- Chat interface with message history
- Settings management
- Tools testing interface

Key files:
- `Chat.tsx`: The main chat interface component
- `Settings.tsx`: Configuration UI for API keys and settings
- `ui/Chat.tsx`: UI components for chat rendering

### Message Flow for Chat

1. User enters a message in the UI
2. `Chat.tsx` sends message to background via port connection:
   ```typescript
   port.postMessage({
     type: 'CHAT_MESSAGE',
     message: userMessageContent,
     messages: messagesForApi
   });
   ```

3. Background script receives message:
   ```typescript
   case 'CHAT_MESSAGE':
     handleChatMessage(message, port);
     break;
   ```

4. Background script retrieves API keys from storage:
   ```typescript
   const apiConfig = await new Promise<{apiKey: string, provider: string, model: string}>(
     (resolve, reject) => {
       chrome.storage.sync.get([...]);
     }
   );
   ```

5. Background script calls the AI handler with messages:
   ```typescript
   const response = await handleChatRequest(
     conversationMessages,
     apiConfig.apiKey,
     apiConfig.provider as any,
     apiConfig.model
   );
   ```

6. Background script streams response chunks back to UI:
   ```typescript
   port.postMessage({ 
     type: 'CHAT_STREAM_CHUNK',
     requestId,
     chunk: chunk
   });
   ```

7. UI receives and renders chunks progressively

### Earth Engine Integration

The extension integrates with Google Earth Engine via:

- Content scripts that inject into Earth Engine pages
- Browser automation tools for interacting with Earth Engine UI
- API functions for running code and inspecting results

### Data Storage

- **Chrome Sync Storage**: Stores API keys and provider preferences
- **Chrome Local Storage**: Stores conversation history

## Extension vs. API Architecture

Unlike a traditional web app with separate frontend and API server, this extension:

1. Keeps all logic within the extension context
2. Handles API keys and configuration storage securely
3. Uses the background script as a service layer instead of external API endpoints

This architecture provides better security and offline capability while maintaining separation of concerns. 