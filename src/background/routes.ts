import { Message } from 'ai';
import { DEFAULT_MODELS, API_VERSIONS, GEE_SYSTEM_PROMPT } from '../api/chat';

// Route handler for /api/chat
export async function handleChatRoute(request: Request): Promise<Response> {
  try {
    const { messages, apiKey, provider, model } = await request.json();
    
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

    // Stream response based on the provider
    let responseStream: ReadableStream;
    
    if (provider === 'openai') {
      responseStream = await streamOpenAIResponse(apiKey, model || DEFAULT_MODELS.openai, messages);
    } else if (provider === 'anthropic') {
      responseStream = await streamAnthropicResponse(apiKey, model || DEFAULT_MODELS.anthropic, messages);
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
    return new Response(JSON.stringify({ 
      error: 'Chat API error',
      message: error.message || 'An unknown error occurred'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Stream API for OpenAI
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
      model: model,
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

// Stream API for Anthropic
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
      model: model,
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