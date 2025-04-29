import { Message } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';

// Chrome storage keys
const API_KEY_STORAGE_KEY = 'earth_engine_llm_api_key';
const API_PROVIDER_STORAGE_KEY = 'earth_engine_llm_provider';
const DEFAULT_MODEL_STORAGE_KEY = 'earth_engine_llm_model';

// Available providers
export type Provider = 'openai' | 'anthropic';

// Default models configuration
export const DEFAULT_MODELS: Record<Provider, string> = {
  openai: 'gpt-4o',
  anthropic: 'claude-3-haiku-20240307'
};

// API versions
export const API_VERSIONS: Record<Provider, string> = {
  openai: '2023-01-01', // Added this for consistency though it's not currently used
  anthropic: '2023-06-01'
};

// Custom StreamingTextResponse implementation
class StreamingTextResponse extends Response {
  constructor(stream: ReadableStream) {
    super(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-store',
      },
    });
  }
}

// Earth Engine system prompt with domain expertise
export const GEE_SYSTEM_PROMPT = `You are Earth Engine Assistant, an AI specialized in Google Earth Engine (GEE) geospatial analysis.

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

/**
 * Get API configuration from Chrome storage with fallback
 * @returns Promise with API key, provider and model information
 */
async function getApiConfig() {
  return new Promise<{apiKey: string, provider: Provider, model: string}>((resolve, reject) => {
    try {
      chrome.storage.sync.get(
        [API_KEY_STORAGE_KEY, API_PROVIDER_STORAGE_KEY, DEFAULT_MODEL_STORAGE_KEY], 
        (result) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          const provider = (result[API_PROVIDER_STORAGE_KEY] || 'openai') as Provider;
          
          resolve({
            apiKey: result[API_KEY_STORAGE_KEY] || '',
            provider: provider,
            model: result[DEFAULT_MODEL_STORAGE_KEY] || DEFAULT_MODELS[provider]
          });
        }
      );
    } catch (error) {
      // Handle case where chrome is not available (during development/testing)
      console.warn('Chrome storage API not available, using environment variables');
      const provider = (process.env.LLM_PROVIDER || 'openai') as Provider;
      
      resolve({
        apiKey: (provider === 'openai' ? 
          process.env.OPENAI_API_KEY : 
          process.env.ANTHROPIC_API_KEY) || '',
        provider: provider,
        model: DEFAULT_MODELS[provider]
      });
    }
  });
}

/**
 * Main POST handler for the chat API
 */
export async function POST(req: Request) {
  try {
    // Get API configuration
    let apiConfig;
    try {
      apiConfig = await getApiConfig();
    } catch (error) {
      console.error('Error getting API config:', error);
      return new Response(JSON.stringify({ 
        error: 'Could not access API configuration', 
        details: error instanceof Error ? error.message : undefined 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { apiKey, provider, model } = apiConfig;
    
    if (!apiKey) {
      return new Response(JSON.stringify({ 
        error: 'API key not configured',
        message: 'Please set your API key in the extension settings' 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get messages from request
    let userMessages: Message[];
    try {
      const body = await req.json();
      userMessages = body.messages;
      
      if (!userMessages || userMessages.length === 0) {
        return new Response(JSON.stringify({ error: 'No messages provided' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } catch (error) {
      return new Response(JSON.stringify({ 
        error: 'Invalid request format',
        message: 'Request must include a messages array' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Process the request based on provider using AI SDK
    try {
      return await processWithAiSdk(provider, apiKey, model, userMessages);
    } catch (error) {
      // If AI SDK fails, fall back to direct API call
      console.warn('AI SDK failed, falling back to direct API call', error);
      try {
        return await processWithDirectApi(provider, apiKey, model, userMessages);
      } catch (fallbackError) {
        console.error('Both API approaches failed:', fallbackError);
        return new Response(JSON.stringify({ 
          error: 'AI processing failed',
          message: fallbackError instanceof Error ? fallbackError.message : 'Unknown error occurred' 
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
  } catch (error: any) {
    console.error('Unhandled chat API error:', error);
    return new Response(JSON.stringify({ 
      error: 'Unhandled exception',
      message: error instanceof Error ? error.message : 'An unknown error occurred' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Process the chat request using the AI SDK
 */
async function processWithAiSdk(
  provider: Provider, 
  apiKey: string, 
  modelName: string, 
  userMessages: Message[]
): Promise<Response> {
  // Format messages for the AI SDK
  const messages = userMessages.map(msg => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content
  }));

  // Common configuration for both providers
  const config = {
    temperature: 0.2,
    maxTokens: 4000,
    system: GEE_SYSTEM_PROMPT,
    messages,
  };

  let result;
  
  if (provider === 'openai') {
    // Configure OpenAI with API key
    process.env.OPENAI_API_KEY = apiKey;
    result = await streamText({
      model: openai(modelName || DEFAULT_MODELS.openai),
      ...config
    });
  } else if (provider === 'anthropic') {
    // Configure Anthropic with API key
    process.env.ANTHROPIC_API_KEY = apiKey;
    result = await streamText({
      model: anthropic(modelName || DEFAULT_MODELS.anthropic),
      ...config
    });
  } else {
    throw new Error(`Unsupported API provider: ${provider}`);
  }

  // Return a streaming response
  return new StreamingTextResponse(result.textStream);
}

/**
 * Process the chat request using direct API calls (fallback)
 */
async function processWithDirectApi(
  provider: Provider, 
  apiKey: string, 
  modelName: string, 
  userMessages: Message[]
): Promise<Response> {
  let responseStream: ReadableStream;
  
  if (provider === 'openai') {
    responseStream = await streamOpenAIResponse(apiKey, modelName, userMessages);
  } else if (provider === 'anthropic') {
    responseStream = await streamAnthropicResponse(apiKey, modelName, userMessages);
  } else {
    throw new Error(`Unsupported API provider: ${provider}`);
  }

  // Process the stream to handle different formats
  const processedStream = createProcessedStream(responseStream, provider);
  
  // Return a streaming response
  return new StreamingTextResponse(processedStream);
}

/**
 * Stream API for OpenAI (direct API call)
 */
async function streamOpenAIResponse(
  apiKey: string, 
  model: string, 
  messages: Message[]
): Promise<ReadableStream> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model || DEFAULT_MODELS.openai,
      messages: [
        { role: 'system', content: GEE_SYSTEM_PROMPT },
        ...messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      ],
      temperature: 0.2,
      stream: true,
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `OpenAI API error: ${response.status} ${response.statusText}`);
  }

  return response.body as ReadableStream;
}

/**
 * Stream API for Anthropic (direct API call)
 */
async function streamAnthropicResponse(
  apiKey: string, 
  model: string, 
  messages: Message[]
): Promise<ReadableStream> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': API_VERSIONS.anthropic,
      'Accept': 'text/event-stream' 
    },
    body: JSON.stringify({
      model: model || DEFAULT_MODELS.anthropic,
      max_tokens: 4000,
      system: GEE_SYSTEM_PROMPT,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      temperature: 0.2,
      stream: true,
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Anthropic API error: ${response.status} ${response.statusText}`);
  }

  return response.body as ReadableStream;
}

/**
 * Creates a processed stream that handles different provider formats
 */
function createProcessedStream(stream: ReadableStream, provider: Provider): ReadableStream {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  
  // Process the stream based on provider format
  const processedStream = new TransformStream({
    async transform(chunk, controller) {
      try {
        const text = decoder.decode(chunk);
        
        // Parse SSE responses or direct text content
        if (text.includes('data:')) {
          // Handle Server-Sent Events format
          const lines = text.split('\n').filter(line => line.trim() !== '');
          for (const line of lines) {
            if (line.startsWith('data:') && !line.includes('[DONE]')) {
              try {
                const data = line.slice(5).trim();
                if (!data) continue;
                
                try {
                  const json = JSON.parse(data);
                  // Handle OpenAI format
                  if (provider === 'openai' && json.choices?.[0]?.delta?.content) {
                    controller.enqueue(encoder.encode(json.choices[0].delta.content));
                  }
                  // Handle Anthropic format
                  else if (provider === 'anthropic' && json.type === 'content_block_delta' && json.delta?.text) {
                    controller.enqueue(encoder.encode(json.delta.text));
                  }
                } catch (e) {
                  // If not valid JSON, just pass through the text
                  controller.enqueue(encoder.encode(data));
                }
              } catch (error) {
                console.error('Error processing SSE line:', error);
              }
            }
          }
        } else {
          // If it's not SSE, use the raw text
          controller.enqueue(encoder.encode(text));
        }
      } catch (error) {
        console.error('Error processing stream chunk:', error);
        controller.error(error);
      }
    }
  });

  return stream.pipeThrough(processedStream);
}