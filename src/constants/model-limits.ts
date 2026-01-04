/**
 * Model context window limits (in tokens)
 * These values represent the maximum context length for each model
 */

export const MODEL_CONTEXT_LIMITS: Record<string, number> = {
  // OpenAI Models
  'gpt-5.2': 128000,
  'gpt-5.2-pro': 128000,
  'gpt-5.2-chat-latest': 128000,
  'gpt-5.1': 128000,
  'gpt-5.1-codex': 128000,
  'gpt-5.1-chat-latest': 128000,
  'gpt-4o': 128000,
  'gpt-4o-mini': 128000,

  // Anthropic Models
  'claude-opus-4-5-20251101': 200000,
  'claude-sonnet-4-5-20250929': 200000,
  'claude-haiku-4-5-20251001': 200000,
  'claude-3-5-sonnet-20241022': 200000,
  'claude-3-5-haiku-20241022': 200000,

  // Google Models
  'gemini-3-pro-preview': 2000000, // 2M context window
  'gemini-3-flash-preview': 1000000,
  'gemini-2.5-pro': 2000000,      // 2M context window
  'gemini-2.5-flash': 1000000,    // 1M context window
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
