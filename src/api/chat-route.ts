import { Message } from 'ai';
import { streamText } from 'ai';
import { getApiConfig, streamOpenAIResponse, streamAnthropicResponse } from './api-bridge';

// Creates a streamText compatible object from a raw stream
function createStreamTextCompatibleObject(stream: ReadableStream) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  
  // Convert the raw stream into a textStream object that can be used with toDataStreamResponse
  const textStream = new TransformStream({
    async transform(chunk, controller) {
      try {
        const text = decoder.decode(chunk);
        
        // Parse SSE responses or direct text content depending on the format
        if (text.includes('data:')) {
          // Handle Server-Sent Events format (from OpenAI or Anthropic)
          const lines = text.split('\n').filter(line => line.trim() !== '');
          for (const line of lines) {
            if (line.startsWith('data:') && !line.includes('[DONE]')) {
              try {
                const data = line.slice(5).trim();
                // Skip empty data lines
                if (!data) continue;
                
                // Parse JSON if possible, otherwise use raw text
                try {
                  const json = JSON.parse(data);
                  // Handle OpenAI format
                  if (json.choices?.[0]?.delta?.content) {
                    controller.enqueue(encoder.encode(json.choices[0].delta.content));
                  }
                  // Handle Anthropic format
                  else if (json.type === 'content_block_delta' && json.delta?.text) {
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
      }
    }
  });

  // Create the stream
  const readableStream = stream.pipeThrough(textStream);
  
  // Create a mock streamText result that has the toDataStreamResponse method
  return {
    textStream: readableStream,
    toDataStreamResponse: function() {
      return new Response(this.textStream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'no-store',
        }
      });
    }
  };
}

export async function POST(req: Request) {
  try {
    // Get API key and provider from Chrome storage
    const { apiKey, provider } = await getApiConfig();
    
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get messages from request
    const { messages }: { messages: Message[] } = await req.json();
    
    if (!messages || messages.length === 0) {
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

    // Create a streamText-compatible object and return a data stream response
    const streamTextCompatible = createStreamTextCompatibleObject(responseStream);
    return streamTextCompatible.toDataStreamResponse();
  } catch (error: any) {
    console.error('Chat API error:', error);
    return new Response(JSON.stringify({ error: error.message || 'An error occurred' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}