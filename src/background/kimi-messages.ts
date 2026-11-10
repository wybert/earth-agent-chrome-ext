/**
 * Kimi Code rejects the next tool turn unless the assistant tool-call message
 * includes reasoning_content (thinking is always on for K3.1). The AI SDK omits
 * the field when the model sent no reasoning parts, and it sends content: null.
 * Kimi's documented tool message uses a string content field plus reasoning_content.
 */
export function withKimiToolReasoning(body: string): string {
  let parsed: { messages?: Array<Record<string, unknown>> };
  try {
    parsed = JSON.parse(body);
  } catch {
    return body;
  }
  if (!parsed || !Array.isArray(parsed.messages)) return body;

  let changed = false;
  const messages = parsed.messages.map((message) => {
    if (!message || message.role !== 'assistant' || !message.tool_calls) return message;
    const next = { ...message };
    if (next.content == null) {
      next.content = '';
      changed = true;
    }
    if (typeof next.reasoning_content !== 'string') {
      next.reasoning_content = '';
      changed = true;
    }
    return next;
  });
  return changed ? JSON.stringify({ ...parsed, messages }) : body;
}
