import { createChatStreamParser, flushChatStreamParser, pushChatStreamChunk } from './chat-stream';

describe('chat stream parser', () => {
  it('keeps assistant text and a provider error when they arrive in one read', () => {
    const parser = createChatStreamParser();
    const chunk = [
      'data: {"type":"token_estimate","estimate":{"promptTokens":1}}\n',
      '\n',
      '// earth-agent e2e first line',
      '\n',
      'error:{"error":"thinking is enabled but reasoning_content is missing"}\n',
    ].join('');
    const events = pushChatStreamChunk(parser, chunk);
    expect(events).toEqual([
      { type: 'token_estimate', estimate: { promptTokens: 1 } },
      { type: 'text', text: '// earth-agent e2e first line\n' },
      { type: 'error', message: 'thinking is enabled but reasoning_content is missing' },
    ]);
  });

  it('streams text immediately and flushes a trailing partial line', () => {
    const parser = createChatStreamParser();
    expect(pushChatStreamChunk(parser, 'Hel')).toEqual([{ type: 'text', text: 'Hel' }]);
    expect(pushChatStreamChunk(parser, 'lo')).toEqual([{ type: 'text', text: 'lo' }]);
    expect(flushChatStreamParser(parser)).toEqual([]);
  });

  it('reports thinking status without treating it as assistant text', () => {
    const parser = createChatStreamParser();
    const events = pushChatStreamChunk(
      parser,
      'data: {"type":"assistant_status","text":"Thinking…"}\n\n'
    );
    expect(events).toEqual([{ type: 'status', text: 'Thinking…' }]);
  });
});
