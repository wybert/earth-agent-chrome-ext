import { Message } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';

// Custom StreamingTextResponse implementation since it's not exported from 'ai'
class StreamingTextResponse extends Response {
  constructor(stream: ReadableStream) {
    super(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }
}

// Chrome storage keys
const API_KEY_STORAGE_KEY = 'earth_engine_llm_api_key';
const API_PROVIDER_STORAGE_KEY = 'earth_engine_llm_provider';

// Get API key and provider from Chrome storage
async function getApiConfig() {
  return new Promise<{apiKey: string, provider: string}>((resolve, reject) => {
    try {
      chrome.storage.sync.get([API_KEY_STORAGE_KEY, API_PROVIDER_STORAGE_KEY], (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        resolve({
          apiKey: result[API_KEY_STORAGE_KEY] || '',
          provider: result[API_PROVIDER_STORAGE_KEY] || 'openai'
        });
      });
    } catch (error) {
      // Handle case where chrome is not available (during development/testing)
      console.warn('Chrome storage API not available, using mock data');
      resolve({
        apiKey: process.env.OPENAI_API_KEY || '',
        provider: 'openai'
      });
    }
  });
}

// Earth Engine system prompt with domain expertise
const GEE_SYSTEM_PROMPT = `You are Earth Engine Assistant, an AI specialized in Google Earth Engine (GEE) geospatial analysis.

Your capabilities:
- Provide code examples for GEE tasks like image processing, classification, and visualization
- Explain Earth Engine concepts, APIs, and best practices
- Help troubleshoot Earth Engine code issues
- Recommend appropriate datasets and methods for geospatial analysis

Instructions:
- Always provide code within backticks: \`code\`
- Format Earth Engine code with proper JavaScript/Python syntax
- When suggesting large code blocks, include comments explaining key steps
- Cite specific Earth Engine functions and methods when relevant
- For complex topics, break down explanations step-by-step
- If you're unsure about something, acknowledge limitations rather than providing incorrect information

Common Earth Engine patterns:
- Image and collection loading: ee.Image(), ee.ImageCollection()
- Filtering: .filterDate(), .filterBounds()
- Reducing: .reduce(), .mean(), .median()
- Visualization: Map.addLayer(), ui.Map(), ui.Chart()
- Classification: .classify(), ee.Classifier.randomForest()
- Exporting: Export.image.toDrive(), Export.table.toAsset()

Speak in a helpful, educational tone while providing practical guidance for Earth Engine tasks.`;

export async function POST(req: Request) {
  try {
    // First try to get the API config
    let apiConfig;
    try {
      apiConfig = await getApiConfig();
    } catch (error) {
      console.error('Error getting API config:', error);
      return new Response(JSON.stringify({ error: 'Could not access API configuration' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { apiKey, provider } = apiConfig;
    
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get messages from request
    const { messages: userMessages }: { messages: Message[] } = await req.json();
    
    if (!userMessages || userMessages.length === 0) {
      return new Response(JSON.stringify({ error: 'No messages provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create response based on the selected provider
    if (provider === 'openai') {
      return handleOpenAIChat(apiKey, userMessages);
    } else if (provider === 'anthropic') {
      return handleAnthropicChat(apiKey, userMessages);
    } else {
      return new Response(JSON.stringify({ error: 'Unsupported API provider' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error: any) {
    console.error('Chat API error:', error);
    return new Response(JSON.stringify({ error: error.message || 'An error occurred' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleOpenAIChat(apiKey: string, userMessages: Message[]) {
  try {
    // Format messages for the AI SDK format
    const messages = userMessages.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    }));

    // Configure OpenAI with API key
    process.env.OPENAI_API_KEY = apiKey;

    // Use the modern AI SDK approach for OpenAI with streaming
    const { textStream } = await streamText({
      model: openai('gpt-4o'),
      temperature: 0.2,
      maxTokens: 4000,
      system: GEE_SYSTEM_PROMPT,
      messages,
    });
    
    // Return a streaming response
    return new StreamingTextResponse(textStream);
  } catch (error) {
    console.error('OpenAI API error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error with OpenAI API'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleAnthropicChat(apiKey: string, userMessages: Message[]) {
  try {
    // Format messages for the AI SDK format
    const messages = userMessages.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    }));

    // Configure Anthropic with API key
    process.env.ANTHROPIC_API_KEY = apiKey;

    // Use the modern AI SDK approach for Anthropic with streaming
    const { textStream } = await streamText({
      model: anthropic('claude-3-haiku-20240307'),
      temperature: 0.2,
      maxTokens: 4000,
      system: GEE_SYSTEM_PROMPT,
      messages,
    });
    
    // Return a streaming response
    return new StreamingTextResponse(textStream);
  } catch (error) {
    console.error('Anthropic API error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error with Anthropic API'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}