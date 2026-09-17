import { createOpenAI } from '@ai-sdk/openai';

// Smoke-check the OpenAI provider used by the extension without making API requests.
export async function testAIImports() {
  try {
    const provider = createOpenAI({
      apiKey: 'sk-import-test',
    });
    provider('gpt-5.4');
    console.log('AI SDK OpenAI provider import successful');

    return { success: true };
  } catch (error) {
    console.error('Error testing OpenAI imports:', error);
    return { success: false, error };
  }
}
