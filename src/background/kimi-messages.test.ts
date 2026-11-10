import { withKimiToolReasoning } from './kimi-messages';

describe('withKimiToolReasoning', () => {
  it('adds the reasoning field Kimi Code requires on assistant tool calls', () => {
    const body = JSON.stringify({
      messages: [
        { role: 'user', content: 'Read the script' },
        {
          role: 'assistant',
          content: null,
          tool_calls: [
            {
              id: 'call_read_1',
              type: 'function',
              function: { name: 'readCode', arguments: '{}' },
            },
          ],
        },
      ],
    });
    const messages = JSON.parse(withKimiToolReasoning(body)).messages;
    expect(messages[1]).toMatchObject({
      role: 'assistant',
      content: '',
      reasoning_content: '',
    });
  });

  it('keeps reasoning the SDK already captured', () => {
    const body = JSON.stringify({
      messages: [
        {
          role: 'assistant',
          content: '',
          reasoning_content: 'Read the editor first.',
          tool_calls: [{ id: 'call_read_1' }],
        },
      ],
    });
    expect(withKimiToolReasoning(body)).toBe(body);
  });
});
