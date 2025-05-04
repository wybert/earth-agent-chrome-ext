import { Message, tool,streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

// Chrome storage keys
const OPENAI_API_KEY_STORAGE_KEY = 'earth_engine_openai_api_key';
const ANTHROPIC_API_KEY_STORAGE_KEY = 'earth_engine_anthropic_api_key';
const GOOGLE_API_KEY_STORAGE_KEY = 'earth_engine_google_api_key';
const API_PROVIDER_STORAGE_KEY = 'earth_engine_llm_provider';
const DEFAULT_MODEL_STORAGE_KEY = 'earth_engine_llm_model';

// Available providers
export type Provider = 'openai' | 'anthropic' | 'google';

// Models configuration by provider
export const PROVIDER_MODELS = {
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o (Flagship)' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
    { id: 'gpt-4.1', name: 'GPT-4.1' },
    { id: 'gpt-4', name: 'GPT-4' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
    { id: 'o3', name: 'O3 (Reasoning-focused)' },
    { id: 'o4-mini', name: 'O4 Mini (Reasoning-focused)' }
  ],
  anthropic: [
    { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet (Latest)' },
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
    { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet' },
    { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' }
  ],
  google: [
    { id: 'gemini-2.5-pro-preview-03-25', name: 'Gemini 2.5 Pro Preview' },
    { id: 'gemini-2.5-flash-preview-04-17', name: 'Gemini 2.5 Flash Preview' },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
    { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
    { id: 'gemini-1.5-flash-8b', name: 'Gemini 1.5 Flash 8B' }
  ]
};

// Default models configuration
export const DEFAULT_MODELS: Record<Provider, string> = {
  openai: 'gpt-4o',
  anthropic: 'claude-3-7-sonnet-20250219',
  google: 'gemini-2.5-pro-preview-03-25'
};

// API versions
export const API_VERSIONS: Record<Provider, string> = {
  openai: '2023-01-01',
  anthropic: '2023-06-01',
  google: 'v1'  // Google Gemini API version
};

// Google API endpoint
export const GOOGLE_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1';

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
- You can use tools to get the weather in a location

Instructions:
- Always provide code within backticks: \`code\`
- Format Earth Engine code with proper JavaScript/Python syntax
- When suggesting large code blocks, include comments explaining key steps
- Cite specific Earth Engine functions and methods when relevant
- For complex topics, break down explanations step-by-step
- If you're unsure about something, acknowledge limitations rather than providing incorrect information
- When asked about weather, use the weather tool to get real-time information and format it nicely

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
        [
          OPENAI_API_KEY_STORAGE_KEY,
          ANTHROPIC_API_KEY_STORAGE_KEY,
          GOOGLE_API_KEY_STORAGE_KEY,
          API_PROVIDER_STORAGE_KEY, 
          DEFAULT_MODEL_STORAGE_KEY
        ], 
        (result) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          const provider = (result[API_PROVIDER_STORAGE_KEY] || 'openai') as Provider;
          
          // Get the provider-specific API key
          let apiKey = '';
          switch (provider) {
            case 'openai':
              apiKey = result[OPENAI_API_KEY_STORAGE_KEY] || '';
              break;
            case 'anthropic':
              apiKey = result[ANTHROPIC_API_KEY_STORAGE_KEY] || '';
              break;
            case 'google':
              apiKey = result[GOOGLE_API_KEY_STORAGE_KEY] || '';
              break;
          }
          
          resolve({
            apiKey,
            provider,
            model: result[DEFAULT_MODEL_STORAGE_KEY] || DEFAULT_MODELS[provider]
          });
        }
      );
    } catch (error) {
      // Handle case where chrome is not available (during development/testing)
      console.warn('Chrome storage API not available, using environment variables');
      const provider = (process.env.LLM_PROVIDER || 'openai') as Provider;
      
      resolve({
        apiKey: getApiKeyForProvider(provider),
        provider: provider,
        model: DEFAULT_MODELS[provider]
      });
    }
  });
}

/**
 * Helper to get API key based on provider
 */
function getApiKeyForProvider(provider: Provider): string {
  switch (provider) {
    case 'openai':
      return process.env.OPENAI_API_KEY || '';
    case 'anthropic':
      return process.env.ANTHROPIC_API_KEY || '';
    case 'google':
      return process.env.GOOGLE_API_KEY || '';
    default:
      return '';
  }
}

/**
 * Main POST handler for the chat API
 */
export async function POST(req: Request) {
  try {
    console.log('%c📨 Chat request initiated', 'color: #2563EB; font-weight: bold;');
    
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
      
      // Log message count and latest user message for debugging
      const latestUserMessage = userMessages.filter(msg => msg.role === 'user').pop();
      if (latestUserMessage) {
        console.log(
          `%c📝 Processing ${userMessages.length} messages | Latest user query: %c${latestUserMessage.content.substring(0, 50)}${latestUserMessage.content.length > 50 ? '...' : ''}`,
          'color: #2563EB;',
          'color: #374151; font-style: italic;'
        );
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

    // Process the request using only AI SDK (no fallback)
    try {
      return await processWithAiSdk(provider, apiKey, model, userMessages);
    } catch (error) {
      console.error('AI SDK processing failed:', error);
      return new Response(JSON.stringify({ 
        error: 'AI processing failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
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
  // Log which model is being used
  const actualModelName = modelName || DEFAULT_MODELS[provider];
  
  // Get the friendly model name for logging
  let modelDisplayName = actualModelName;
  const modelConfig = PROVIDER_MODELS[provider].find(m => m.id === actualModelName);
  if (modelConfig) {
    modelDisplayName = modelConfig.name;
  }
  
  // Print model information with styling
  console.log(
    `%c🤖 Using ${provider.toUpperCase()} model: %c${modelDisplayName} %c(${actualModelName})`,
    'color: #2563EB; font-weight: bold;',
    'color: #059669; font-weight: bold;',
    'color: #6B7280; font-style: italic;'
  );
  
  // Format messages for the AI SDK
  const messages = userMessages.map(msg => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content
  }));

  // Define the weather tool
  const weatherTool = tool({
    description: 'Get the weather in a location',
    parameters: z.object({
      location: z.string().describe('The location to get the weather for'),
    }),
    execute: async ({ location }) => {
      // Simulate weather data
      const temperature = 72 + Math.floor(Math.random() * 21) - 10;
      return {
        location,
        temperature,
        description: temperature > 75 ? 'Sunny and warm' : 'Partly cloudy',
        humidity: Math.floor(Math.random() * 30) + 50, // Random humidity between 50-80%
      };
    },
  });

  // Common configuration for both providers
  const config = {
    temperature: 0.2,
    maxTokens: 4000,
    system: GEE_SYSTEM_PROMPT,
    messages,
    tools: {
      weather: weatherTool,
    },
    maxSteps: 5, // allow up to 5 steps
  };

  let result;
  
  if (provider === 'openai') {
    // Configure OpenAI with API key
    process.env.OPENAI_API_KEY = apiKey;
    result = await streamText({
      model: openai(actualModelName),
      ...config
    });
  } else if (provider === 'anthropic') {
    // Configure Anthropic with API key
    process.env.ANTHROPIC_API_KEY = apiKey;
    result = await streamText({
      model: anthropic(actualModelName),
      ...config
    });
  } else if (provider === 'google') {
    // For Google Gemini, use direct API call since AI SDK doesn't support it yet
    // This is a placeholder for now as we'd need to implement Gemini API integration
    // For a proper implementation, we would use Vertex AI or Google's Generative Language API directly
    // or import a Google AI SDK once available
    try {
      const responseStream = new ReadableStream({
        async start(controller) {
          try {
            // Get the model ID (without models/ prefix in new format)
            
            // This would be replaced with actual Gemini API call
            controller.enqueue(`I am using the Google Gemini model (${actualModelName}) to respond to your query.\n\n`);
            controller.enqueue('To fully implement this, we would need to use the Gemini API directly.\n\n');
            controller.enqueue('This is a placeholder for the actual Gemini integration, which would require:\n');
            controller.enqueue('1. Using the Generative Language API\n');
            controller.enqueue('2. Formatting requests according to Gemini specifications\n');
            controller.enqueue('3. Parsing and streaming the responses\n\n');
            controller.enqueue('For a complete implementation, consider using the official Google AI SDK or direct API calls.');
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        }
      });
      return new StreamingTextResponse(responseStream);
    } catch (error) {
      console.error('Google Gemini API error:', error);
      throw error;
    }
  } else {
    throw new Error(`Unsupported API provider: ${provider}`);
  }

  // Return a streaming response with the textStream property from the result
  return new StreamingTextResponse(result.textStream);
}