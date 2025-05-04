import { Message, CoreMessage, streamText, tool } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

// Available providers
export type Provider = 'openai' | 'anthropic';

// Default models configuration
export const DEFAULT_MODELS: Record<Provider, string> = {
  openai: 'gpt-4o',
  anthropic: 'claude-3-haiku-20240307'
};

// API versions
export const API_VERSIONS: Record<Provider, string> = {
  openai: '2023-01-01',
  anthropic: '2023-06-01'
};

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
 * Handle chat messages from the UI
 */
export async function handleChatRequest(messages: Message[], apiKey: string, provider: Provider, model?: string): Promise<Response> {
  try {
    if (!apiKey) {
      return new Response(JSON.stringify({ 
        error: 'API key not configured',
        message: 'Please set your API key in the extension settings' 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'No messages provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Setup LLM provider
    let llmProvider: ReturnType<typeof createOpenAI> | ReturnType<typeof createAnthropic>;
    let effectiveModel: string;
    
    if (provider === 'openai') {
      llmProvider = createOpenAI({ apiKey });
      effectiveModel = model || DEFAULT_MODELS.openai;
    } else if (provider === 'anthropic') {
      llmProvider = createAnthropic({ apiKey });
      effectiveModel = model || DEFAULT_MODELS.anthropic;
    } else {
      return new Response(JSON.stringify({ error: 'Unsupported API provider' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Simplified message mapping for basic CoreMessage structure
    const formattedMessages: CoreMessage[] = messages
      .map((msg): CoreMessage | null => {
        // Only include user, assistant, and system roles with simple string content
        if ((msg.role === 'user' || msg.role === 'assistant' || msg.role === 'system') && 
            typeof msg.content === 'string') {
          return { role: msg.role, content: msg.content };
        }
        console.warn('Filtering out message with incompatible role/content:', msg);
        return null; 
      })
      .filter((msg): msg is CoreMessage => msg !== null);

    // Define the weather tool using the AI SDK tool format
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

    // Use streamText for AI generation with tools
    const result = await streamText({
      model: llmProvider(effectiveModel), 
      system: GEE_SYSTEM_PROMPT,
      messages: formattedMessages,
      tools: {
        weather: weatherTool
      },
      maxSteps: 5, // Allow up to 5 steps
      temperature: 0.2
    });
    
    // Convert to text stream response
    return result.toTextStreamResponse();
  } catch (error: any) {
    console.error('Chat handler error:', error);
    return new Response(JSON.stringify({ 
      error: 'Chat processing failed',
      message: error instanceof Error ? error.message : 'Unknown error occurred' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 