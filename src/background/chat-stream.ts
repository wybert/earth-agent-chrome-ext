export type ChatStreamEvent =
  | { type: 'text'; text: string }
  | { type: 'error'; message: string }
  | { type: 'token_usage'; usage: unknown }
  | { type: 'token_estimate'; estimate: unknown }
  | { type: 'status'; text: string };

export interface ChatStreamParser {
  pending: string;
}

export function createChatStreamParser(): ChatStreamParser {
  return { pending: '' };
}

function parseProtocolLine(line: string): ChatStreamEvent | null {
  if (line.startsWith('error:')) {
    try {
      const payload = JSON.parse(line.slice('error:'.length));
      return { type: 'error', message: payload?.error || line };
    } catch {
      return { type: 'error', message: line.slice('error:'.length) || line };
    }
  }
  if (line.startsWith('data:')) {
    const json = line.slice('data:'.length).trim();
    if (!json || json === '[DONE]') return null;
    try {
      const data = JSON.parse(json);
      if (data?.type === 'token_usage' && data.usage)
        return { type: 'token_usage', usage: data.usage };
      if (data?.type === 'token_estimate' && data.estimate) {
        return { type: 'token_estimate', estimate: data.estimate };
      }
      if (data?.type === 'assistant_status')
        return { type: 'status', text: String(data.text || '') };
      return null;
    } catch {
      return { type: 'text', text: line };
    }
  }
  return null;
}

function isProtocolAt(input: string, index: number): boolean {
  return input.startsWith('data:', index) || input.startsWith('error:', index);
}

/**
 * Split a byte-stream chunk into text and protocol events.
 * Network reads can glue a token frame, assistant text, and an error line together.
 * A chunk that merely starts with `data:` must not hide a later `error:` line.
 */
export function pushChatStreamChunk(parser: ChatStreamParser, chunk: string): ChatStreamEvent[] {
  const input = parser.pending + chunk;
  parser.pending = '';
  const events: ChatStreamEvent[] = [];
  let index = 0;

  while (index < input.length) {
    if (isProtocolAt(input, index)) {
      const newline = input.indexOf('\n', index);
      if (newline === -1) {
        parser.pending = input.slice(index);
        break;
      }
      const line = input.slice(index, newline).trim();
      index = newline + 1;
      if (input[index] === '\n') index += 1;
      if (!line) continue;
      const event = parseProtocolLine(line);
      if (event) events.push(event);
      continue;
    }

    let next = index;
    while (next < input.length && !isProtocolAt(input, next)) next += 1;
    // A protocol marker is only meaningful at the start of a line. Walk back if we
    // landed in the middle of ordinary text that happens to contain those words.
    if (next < input.length && next > index && input[next - 1] !== '\n') {
      const lineStart = input.lastIndexOf('\n', next - 1) + 1;
      if (lineStart > index && isProtocolAt(input, lineStart)) next = lineStart;
      else {
        events.push({ type: 'text', text: input.slice(index) });
        break;
      }
    }
    const text = input.slice(index, next);
    if (text) events.push({ type: 'text', text });
    index = next;
  }

  return events;
}

export function flushChatStreamParser(parser: ChatStreamParser): ChatStreamEvent[] {
  if (!parser.pending) return [];
  const pending = parser.pending;
  parser.pending = '';
  if (isProtocolAt(pending, 0)) {
    const event = parseProtocolLine(pending.trim());
    return event ? [event] : [];
  }
  return [{ type: 'text', text: pending }];
}
