/**
 * Model context window limits (in tokens)
 * These values represent the maximum context length for each model
 */

export const MODEL_CONTEXT_LIMITS: Record<string, number> = {
  // OpenAI Models
  'gpt-4.1': 128000,
  'gpt-4o': 128000,
  'gpt-5': 128000,
  'gpt-5.1': 128000,
  'gpt-5.1-codex': 128000,
  'gpt-5.1-chat-latest': 128000,

  // Anthropic Models
  'claude-sonnet-4-5-20250929': 200000,
  'claude-haiku-4-5-20251001': 200000,
  'claude-opus-4-1-20250805': 200000,
  'claude-opus-4-20250514': 200000,
  'claude-sonnet-4-20250514': 200000,
  'claude-3-7-sonnet-20250219': 200000,
  'claude-3-5-haiku-20241022': 200000,

  // Google Models
  'gemini-2.5-pro': 2000000,      // 2M context window
  'gemini-2.5-flash': 1000000,    // 1M context window
  'gemini-3-pro-preview': 2000000, // 2M context window

  // Qwen Models
  'qwen-max-latest': 32768,
  'qwen-max': 32768,
  'qwen-plus-latest': 32768,
  'qwen-plus': 32768,
  'qwen-turbo-latest': 8192,
  'qwen-turbo': 8192,
  'qwen-vl-max': 32768,
  'qwen2.5-72b-instruct': 32768,
  'qwen2.5-14b-instruct-1m': 1000000,  // 1M context window
  'qwen2.5-vl-72b-instruct': 32768,

  // Ollama Models (typical local model limits)
  'phi3': 4096,
  'llama3.3:70b': 128000,
  'llama3.3': 128000,
  'llama3.2:90b': 128000,
  'llama3.2:70b': 128000,
  'llama3.2': 128000,
  'llama3.1:70b': 128000,
  'llama3.1': 128000,
  'mistral': 32768,
  'codellama': 16384,
  'deepseek-coder-v2': 128000,
  'qwen2.5': 32768,
  'gemma2': 8192,
  'llava': 4096,
  'llava-llama3': 8192,
  'llava-phi3': 4096,
  'moondream': 2048,
};

/**
 * Get the maximum context window for a given model
 * @param model - The model identifier
 * @returns Maximum context tokens, defaults to 128000 if model not found
 */
export function getModelContextLimit(model: string): number {
  // Try exact match first
  if (MODEL_CONTEXT_LIMITS[model]) {
    return MODEL_CONTEXT_LIMITS[model];
  }

  // For custom/unknown models, use a conservative default
  console.warn(`⚠️ Unknown model "${model}", using default context limit of 128k tokens`);
  return 128000;
}

/**
 * Get the model context limit from provider and model
 * Useful when you have the provider information available
 */
export function getModelContextLimitByProvider(provider: string, model: string): number {
  // For custom providers, we can't reliably determine the limit
  // Return a conservative default
  const limit = getModelContextLimit(model);
  console.log(`📊 Context limit for ${provider}/${model}: ${limit.toLocaleString()} tokens`);
  return limit;
}
