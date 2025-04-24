import { Message } from 'ai';

// Chrome storage keys
const API_KEY_STORAGE_KEY = 'earth_engine_llm_api_key';
const API_PROVIDER_STORAGE_KEY = 'earth_engine_llm_provider';

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

// Get API key and provider from Chrome storage
export async function getApiConfig() {
  return new Promise<{apiKey: string, provider: string}>((resolve, reject) => {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
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
      } else {
        // Handle case where chrome is not available (during development/testing)
        console.warn('Chrome storage API not available, using mock data');
        resolve({
          apiKey: process.env.OPENAI_API_KEY || '',
          provider: 'openai'
        });
      }
    } catch (error) {
      console.error('Error accessing Chrome storage:', error);
      reject(error);
    }
  });
}

// Stream API for OpenAI
export async function streamOpenAIResponse(apiKey: string, messages: Message[]): Promise<ReadableStream> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o',
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
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'Error calling OpenAI API');
  }

  return response.body as ReadableStream;
}

// Stream API for Anthropic
export async function streamAnthropicResponse(apiKey: string, messages: Message[]): Promise<ReadableStream> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Accept': 'text/event-stream' 
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
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
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'Error calling Anthropic API');
  }

  return response.body as ReadableStream;
}