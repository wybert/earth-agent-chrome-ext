import { Message, CoreMessage } from 'ai';
import { DEFAULT_MODELS, API_VERSIONS, GEE_SYSTEM_PROMPT } from '../api/chat';
import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';

// Import the function to send messages to the content script
import { sendMessageToEarthEngineTab } from './index';

// --- Route Handler --- 
export async function handleChatRoute(request: Request): Promise<Response> {
  try {
    const { messages: inputMessages, apiKey, provider, model } = await request.json() as { 
      messages: Message[],
      apiKey: string,
      provider: 'openai' | 'anthropic',
      model?: string
    };
    
    if (!apiKey) {
      return new Response(JSON.stringify({ 
        error: 'API key not configured',
        message: 'Please set your API key in the extension settings'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!inputMessages || !Array.isArray(inputMessages) || inputMessages.length === 0) {
      return new Response(JSON.stringify({ error: 'No messages provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // --- Vercel AI SDK Integration ---
    let llmProvider: ReturnType<typeof createOpenAI> | ReturnType<typeof createAnthropic>;
    let effectiveModel: string;
    
    if (provider === 'openai') {
      llmProvider = createOpenAI({ apiKey: apiKey });
      effectiveModel = model || DEFAULT_MODELS.openai;
    } else if (provider === 'anthropic') {
      llmProvider = createAnthropic({ apiKey: apiKey });
       effectiveModel = model || DEFAULT_MODELS.anthropic;
    } else {
      return new Response(JSON.stringify({ error: 'Unsupported API provider' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Simplified message mapping for basic CoreMessage structure
    const formattedMessages: CoreMessage[] = inputMessages
      .map((msg): CoreMessage | null => {
          // Only include user, assistant, and system roles with simple string content
          if ((msg.role === 'user' || msg.role === 'assistant' || msg.role === 'system') && typeof msg.content === 'string') {
            return { role: msg.role, content: msg.content };
          }
          console.warn('Filtering out message with incompatible role/content:', msg);
          return null; 
      })
      .filter((msg): msg is CoreMessage => msg !== null);

    // Use streamText for basic LLM text generation
    const result = await streamText({
      model: llmProvider(effectiveModel), 
      system: GEE_SYSTEM_PROMPT,
      messages: formattedMessages,
    });
    
    // --- Convert AIStream to plain text stream Response --- 
    return result.toTextStreamResponse();

  } catch (error: any) {
    console.error('Chat API error:', error);
    return new Response(JSON.stringify({ 
      error: 'Chat API error',
      message: error.message || 'An unknown error occurred'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// --- Removed old direct streaming functions --- 