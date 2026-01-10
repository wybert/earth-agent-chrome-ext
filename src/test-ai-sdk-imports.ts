import type { UIMessage } from '@ai-sdk/react';
import { useChat } from '@ai-sdk/react';

// Note: Attachment type was removed in AI SDK 5.0
// Use FileUIPart from UIMessage.parts instead

// Test function to verify AI SDK imports
export async function testAISDKImports() {
  try {
    // Verify type imports by creating type annotations
    // Note: UIMessage in AI SDK 5.0 no longer has 'content', only 'parts'
    const testMessage: UIMessage = {
      id: '1',
      role: 'user',
      parts: [
        {
          type: 'text',
          text: 'Hello',
        },
      ],
    };

    // Note: useChat is a React hook and can only be used within React components
    // We can only verify that it's imported, not execute it here
    console.log('AI SDK imports successful');
    console.log('useChat hook is available:', typeof useChat === 'function');

    return {
      success: true,
      imports: {
        hasUIMessageType: true,
        hasUseChat: typeof useChat === 'function',
      },
    };
  } catch (error) {
    console.error('Error testing AI SDK imports:', error);
    return {
      success: false,
      error,
      imports: {
        hasUIMessageType: false,
        hasUseChat: false,
      },
    };
  }
}
