import type { Attachment, UIMessage } from 'ai';
import { useChat } from 'ai/react';

// Test function to verify AI SDK imports
export async function testAISDKImports() {
    try {
        // Verify type imports by creating type annotations
        const testMessage: UIMessage = {
            id: '1',
            content: 'Hello',
            role: 'user',
            parts: [{
                type: 'text',
                text: 'Hello'
            }]
        };

        const testAttachment: Attachment = {
            name: 'test.txt',
            url: 'https://example.com/test.txt'
        };

        // Note: useChat is a React hook and can only be used within React components
        // We can only verify that it's imported, not execute it here
        console.log('AI SDK imports successful');
        console.log('useChat hook is available:', typeof useChat === 'function');

        return { 
            success: true,
            imports: {
                hasUIMessageType: true,
                hasAttachmentType: true,
                hasUseChat: typeof useChat === 'function'
            }
        };
    } catch (error) {
        console.error('Error testing AI SDK imports:', error);
        return { 
            success: false, 
            error,
            imports: {
                hasUIMessageType: false,
                hasAttachmentType: false,
                hasUseChat: false
            }
        };
    }
} 