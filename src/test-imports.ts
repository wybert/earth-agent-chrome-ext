import { OpenAI } from '@langchain/openai';
import type { Message } from 'ai/react';

// Simple test function to ensure imports are working
async function testImports() {
    // Test OpenAI import
    const model = new OpenAI({
        modelName: 'gpt-3.5-turbo',
        temperature: 0
    });
    
    // Test Message type from AI SDK
    const message: Message = {
        id: '1',
        role: 'user',
        content: 'Hello'
    };
    
    console.log('Basic imports working correctly!');
    return { success: true, message };
}

export { testImports }; 