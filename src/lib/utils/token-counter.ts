/**
 * Simple token estimation utility
 * Uses rough approximation: 1 token ≈ 4 characters for English text
 * This is a conservative estimate and should be close enough for UI purposes
 */

export interface TokenEstimate {
  promptTokens: number;
  systemTokens: number;
  toolTokens: number;
  messageTokens: number;
  totalTokens: number;
}

/**
 * Estimate tokens for a string using character count
 * Rule of thumb: 1 token ≈ 4 characters (conservative)
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  // Average: 1 token per 4 characters
  // This is conservative and works well for English text
  return Math.ceil(text.length / 4);
}

/**
 * Estimate tokens for a message object
 */
export function estimateMessageTokens(message: any): number {
  let tokens = 0;

  // Count content
  if (message.content) {
    tokens += estimateTokens(message.content);
  }

  // Count parts (for multimodal messages)
  if (message.parts && Array.isArray(message.parts)) {
    message.parts.forEach((part: any) => {
      if (part.type === 'text' && part.text) {
        tokens += estimateTokens(part.text);
      }
      // Images are roughly 85-170 tokens each depending on size
      // We'll use a conservative estimate
      if (part.type === 'file' || part.type === 'image') {
        tokens += 170; // Conservative estimate for image
      }
    });
  }

  // Add overhead for message structure (role, metadata, etc.)
  tokens += 4;

  return tokens;
}

/**
 * Estimate tokens for system prompt
 * Returns the estimated token count
 */
export function estimateSystemPromptTokens(systemPrompt: string): number {
  return estimateTokens(systemPrompt);
}

/**
 * Estimate tokens for tool definitions
 * Tool schemas typically add significant overhead
 */
export function estimateToolTokens(toolCount: number): number {
  // Conservative estimate: each tool definition is ~200-500 tokens
  // This includes the schema, description, and parameters
  // We'll use 300 as a middle ground
  return toolCount * 300;
}

/**
 * Estimate total prompt tokens before API call
 */
export function estimatePromptTokens(
  systemPrompt: string,
  messages: any[],
  toolCount: number = 0
): TokenEstimate {
  const systemTokens = estimateSystemPromptTokens(systemPrompt);
  const toolTokens = estimateToolTokens(toolCount);
  const messageTokens = messages.reduce((sum, msg) => sum + estimateMessageTokens(msg), 0);

  const totalTokens = systemTokens + toolTokens + messageTokens;

  return {
    promptTokens: totalTokens,
    systemTokens,
    toolTokens,
    messageTokens,
    totalTokens
  };
}

/**
 * Format token count with commas
 */
export function formatTokenCount(count: number): string {
  return count.toLocaleString();
}

/**
 * Calculate percentage of max tokens
 */
export function calculateTokenPercentage(used: number, max: number): number {
  return (used / max) * 100;
}
