# Console Logging System

## Overview

The Earth Engine Agent includes a comprehensive console logging system to help with debugging, development, and monitoring of model usage. This documentation explains the logging implementation, its purpose, and how to interpret the logs.

## Implementation

The console logging system is implemented in `src/api/chat.ts` and provides real-time insight into:

1. Chat request initiation
2. Message processing
3. Model selection and usage

### Key Components

The system includes three main types of logs:

1. **Request Initialization**
   ```javascript
   console.log('%c📨 Chat request initiated', 'color: #2563EB; font-weight: bold;');
   ```

2. **Message Information**
   ```javascript
   console.log(
     `%c📝 Processing ${userMessages.length} messages | Latest user query: %c${latestUserMessage.content.substring(0, 50)}${latestUserMessage.content.length > 50 ? '...' : ''}`,
     'color: #2563EB;',
     'color: #374151; font-style: italic;'
   );
   ```

3. **Model Information**
   ```javascript
   console.log(
     `%c🤖 Using ${provider.toUpperCase()} model: %c${modelDisplayName} %c(${actualModelName})`,
     'color: #2563EB; font-weight: bold;',
     'color: #059669; font-weight: bold;',
     'color: #6B7280; font-style: italic;'
   );
   ```

## Styling

The logs use styled console output with:
- Emojis for visual distinction (📨, 📝, 🤖)
- Color coding for different components:
  - Blue (#2563EB) for main labels and categories
  - Green (#059669) for model names
  - Gray (#6B7280) for technical details
  - Dark gray (#374151) for message content
- Font styling (bold, italic) for emphasis and readability

## Usage

To view the logs:

1. Open Chrome DevTools (F12 or Right-click > Inspect)
2. Navigate to the Console tab
3. Interact with the extension by sending chat messages

The logs will provide the following information:

- When a chat request starts
- Number of messages being processed
- Preview of the latest user query (first 50 characters)
- Which provider is being used (OpenAI, Anthropic, or Google)
- The friendly name of the selected model (e.g., "GPT-4o (Flagship)")
- The technical model ID (e.g., "gpt-4o")

## Privacy Considerations

The logging system is designed with privacy in mind:
- No API keys are logged
- User messages are truncated to the first 50 characters
- Logs are only visible locally in the browser console
- No sensitive information is transmitted 

## Future Enhancements

Planned improvements to the logging system:

1. Additional log levels for more detailed debugging
2. Performance metrics (response time, token usage)
3. Error logging with detailed diagnostics
4. Log storage option for persistent debugging
5. Log filtering capabilities

## Code References

The logging implementation can be found in:
- `src/api/chat.ts` in the following functions:
  - `POST()`: Request initialization and message logging
  - `processWithAiSdk()`: Model selection and usage logging

## Example Log Output

```
📨 Chat request initiated
📝 Processing 3 messages | Latest user query: What is Earth Engine?
🤖 Using OPENAI model: GPT-4o (Flagship) (gpt-4o)
``` 