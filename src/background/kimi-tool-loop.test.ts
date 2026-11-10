/** @jest-environment node */
import { handleChatRequest } from './chat-handler';
import { KIMI_API_MODE_STORAGE_KEY } from '../constants/models';
import type { Message } from '../types/extension';

function sse(chunks: unknown[]): string {
  return chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join('') + 'data: [DONE]\n\n';
}

function completion(delta: unknown, finish: string | null = null) {
  return {
    id: 'chatcmpl-kimi',
    model: 'k3.1-pro',
    choices: [{ index: 0, delta, finish_reason: finish }],
  };
}

const toolStep = sse([
  completion({ role: 'assistant', reasoning_content: 'Read the editor before quoting it.' }),
  completion({
    tool_calls: [
      {
        index: 0,
        id: 'call_read_1',
        type: 'function',
        function: { name: 'dateTime', arguments: '{"timeZone":"UTC"}' },
      },
    ],
  }),
  completion({}, 'tool_calls'),
]);

const messages: Message[] = [
  {
    id: 'user',
    role: 'user',
    content: 'Read the current Earth Engine script and quote the first line exactly.',
  },
];

function installKimiFetch(reply: (body: any, call: number) => Response) {
  const requests: any[] = [];
  global.fetch = jest.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body));
    requests.push(body);
    return reply(body, requests.length);
  }) as typeof fetch;
  return requests;
}

describe('Kimi tool loop', () => {
  const fetchMock = require('jest-fetch-mock');

  beforeEach(() => {
    fetchMock.disableMocks();
    (chrome.storage.sync.get as jest.Mock).mockImplementation(async (keys: string | string[]) => {
      const list = Array.isArray(keys) ? keys : [keys];
      const result: Record<string, string> = {};
      if (list.includes(KIMI_API_MODE_STORAGE_KEY)) {
        result[KIMI_API_MODE_STORAGE_KEY] = 'coding-cn';
      }
      return result;
    });
  });

  async function chat() {
    const response = await handleChatRequest(
      messages,
      'sk-kimi-test',
      'kimi',
      'k3.1-pro',
      undefined,
      undefined,
      undefined,
      'ask'
    );
    return response.text();
  }

  it('echoes reasoning_content and streams the follow-up answer', async () => {
    const requests = installKimiFetch((body, call) => {
      if (call === 1)
        return new Response(toolStep, { headers: { 'Content-Type': 'text/event-stream' } });
      const assistant = body.messages.find(
        (message: any) => message.role === 'assistant' && message.tool_calls
      );
      expect(assistant.reasoning_content).toBe('Read the editor before quoting it.');
      expect(assistant.content).toBe('');
      expect(body.messages.find((message: any) => message.role === 'tool').tool_call_id).toBe(
        'call_read_1'
      );
      expect(body.max_tokens).toBe(16000);
      return new Response(
        sse([
          completion({ reasoning_content: 'The first line is ready. ' }),
          completion({ content: '// earth-agent e2e first line' }),
          completion({}, 'stop'),
        ]),
        { headers: { 'Content-Type': 'text/event-stream' } }
      );
    });

    const body = await chat();
    expect(requests).toHaveLength(2);
    expect(body).toContain('// earth-agent e2e first line');
    expect(body).toContain('Thinking');
    expect(body).not.toContain('error:');
  });

  it('shows reasoning text when Kimi ends the tool turn without content', async () => {
    installKimiFetch(
      (_body, call) =>
        new Response(
          call === 1
            ? toolStep
            : sse([
                completion({
                  reasoning_content: 'The first line is // earth-agent e2e first line.',
                }),
                completion({}, 'stop'),
              ]),
          { headers: { 'Content-Type': 'text/event-stream' } }
        )
    );
    const body = await chat();
    expect(body).toContain('The first line is // earth-agent e2e first line.');
    expect(body).not.toContain('error:');
  });

  it('reports a tool turn that ends with neither text nor reasoning', async () => {
    installKimiFetch(
      (_body, call) =>
        new Response(call === 1 ? toolStep : sse([completion({}, 'stop')]), {
          headers: { 'Content-Type': 'text/event-stream' },
        })
    );
    const body = await chat();
    expect(body).toContain('The model finished without a reply after the tool call.');
  });

  it('surfaces a provider error from the tool follow-up instead of ending silently', async () => {
    installKimiFetch((_body, call) => {
      if (call === 1) {
        return new Response(toolStep, { headers: { 'Content-Type': 'text/event-stream' } });
      }
      return new Response(
        JSON.stringify({
          error: {
            message:
              'thinking is enabled but reasoning_content is missing in assistant tool call message',
          },
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    });
    const body = await chat();
    expect(body).toContain(
      'error:{"error":"thinking is enabled but reasoning_content is missing in assistant tool call message"}'
    );
  });
});
