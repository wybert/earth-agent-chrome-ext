import { OpenAI } from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';

interface RequestBody {
  provider: 'openai' | 'anthropic';
  apiKey: string;
}

export async function POST(req: Request) {
  try {
    const body: RequestBody = await req.json();
    const { provider, apiKey } = body;

    if (!apiKey) {
      return new Response(JSON.stringify({ success: false, error: 'No API key provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let isValid = false;
    let modelName = '';

    // Test the connection based on the provider
    if (provider === 'openai') {
      const openai = new OpenAI({ apiKey });
      // Make a simple models list request to validate the key
      const models = await openai.models.list();
      isValid = !!models.data && models.data.length > 0;
      modelName = models.data[0]?.id || '';
    } else if (provider === 'anthropic') {
      const anthropic = new Anthropic({ apiKey });
      // Make a simple messages request with minimal tokens to validate the key
      const response = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hello' }]
      });
      isValid = !!response.id;
      modelName = 'claude-3-haiku-20240307';
    }

    return new Response(JSON.stringify({ 
      success: isValid,
      provider,
      modelName: isValid ? modelName : null
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    // Handle errors gracefully
    console.error('API connection test error:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || 'Unknown error',
      provider: (error as any)?.provider
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}