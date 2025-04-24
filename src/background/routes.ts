import { Message } from 'ai';

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

// Route handler for /api/chat
export async function handleChatRoute(request: Request): Promise<Response> {
  try {
    const { messages, apiKey, provider } = await request.json();
    
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
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

    // Stream response based on the provider
    let responseStream: ReadableStream;
    
    if (provider === 'openai') {
      responseStream = await streamOpenAIResponse(apiKey, messages);
    } else if (provider === 'anthropic') {
      responseStream = await streamAnthropicResponse(apiKey, messages);
    } else {
      return new Response(JSON.stringify({ error: 'Unsupported API provider' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create a streamText-compatible response
    return new Response(responseStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-store',
      }
    });
  } catch (error: any) {
    console.error('Chat API error:', error);
    return new Response(JSON.stringify({ error: error.message || 'An error occurred' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Stream API for OpenAI
async function streamOpenAIResponse(apiKey: string, messages: Message[]): Promise<ReadableStream> {
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

  // Direct passthrough of the streaming response
  return response.body as ReadableStream;
}

// Stream API for Anthropic
async function streamAnthropicResponse(apiKey: string, messages: Message[]): Promise<ReadableStream> {
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

  // Direct passthrough of the streaming response
  return response.body as ReadableStream;
}