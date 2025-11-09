import { OpenAI } from '@langchain/openai';
import type { UIMessage } from '@ai-sdk/react';

// Simple test function to ensure imports are working
async function testImports() {
    // Test OpenAI import
    const model = new OpenAI({
        modelName: 'gpt-3.5-turbo',
        temperature: 0
    });

    // Test UIMessage type from AI SDK 5.0
    // Note: UIMessage no longer has 'content', only 'parts'
    const message: UIMessage = {
        id: '1',
        role: 'user',
        parts: [{
            type: 'text',
            text: 'Hello'
        }]
    };

    console.log('Basic imports working correctly!');
    return { success: true, message };
}

export { testImports }; 