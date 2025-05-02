import { Message, tool,streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

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