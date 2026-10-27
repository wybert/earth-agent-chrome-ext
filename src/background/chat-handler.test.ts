/** @jest-environment node */
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogle } from '@ai-sdk/google';
import { handleChatRequest } from './chat-handler';
import { createAITools } from '../lib/tools/ai-tools';
import type { BuiltInProvider, Message } from '../types/extension';

jest.mock('@ai-sdk/openai', () => ({ createOpenAI: jest.fn() }));
jest.mock('@ai-sdk/anthropic', () => ({ createAnthropic: jest.fn() }));
jest.mock('@ai-sdk/google', () => ({ createGoogle: jest.fn() }));

type Model = ReturnType<ReturnType<typeof createOpenAI>>;
type Chunk =
  Awaited<ReturnType<Model['doStream']>>['stream'] extends ReadableStream<infer T> ? T : never;

const finish = (reason: 'stop' | 'tool-calls'): Chunk => ({
  type: 'finish',
  finishReason: { unified: reason, raw: reason },
  usage: {
    inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
    outputTokens: { total: 5, text: 5, reasoning: 0 },
  },
});
const textChunks: Chunk[] = [
  { type: 'stream-start', warnings: [] },
  { type: 'text-start', id: 'text' },
  { type: 'text-delta', id: 'text', delta: 'Hello from SDK 7' },
  { type: 'text-end', id: 'text' },
  finish('stop'),
];

function installModel(steps: Chunk[][]) {
  const doStream = jest.fn(async (_options: Parameters<Model['doStream']>[0]) => ({
    stream: new ReadableStream<Chunk>({
      start(controller) {
        for (const chunk of steps.shift() || []) controller.enqueue(chunk);
        controller.close();
      },
    }),
  }));
  const model = {
    specificationVersion: 'v4',
    provider: 'test',
    modelId: 'test-model',
    supportedUrls: {},
    doGenerate: jest.fn(),
    doStream,
  };
  for (const factory of [createOpenAI, createAnthropic, createGoogle]) {
    (factory as jest.Mock).mockReturnValue(Object.assign(() => model, { chat: () => model }));
  }
  return doStream;
}

const messages: Message[] = [{ id: 'user', role: 'user', content: 'Hello' }];

beforeEach(() => {
  (chrome.storage.sync.get as jest.Mock).mockResolvedValue({});
});

it.each<BuiltInProvider>(['openai', 'anthropic', 'google', 'z-ai'])(
  'streams text and usage through the real SDK for %s',
  async (provider) => {
    const doStream = installModel([textChunks]);
    const apiKey = provider === 'google' ? 'AIza' + 'x'.repeat(35) : 'sk-test-key';
    const response = await handleChatRequest(messages, apiKey, provider);
    const body = await response.text();
    expect(response.status).toBe(200);
    expect(body).toContain('Hello from SDK 7');
    expect(body).toContain('"promptTokens":10,"completionTokens":5,"totalTokens":15');
    expect(body).not.toContain('error:');
    const prompt = doStream.mock.calls[0][0].prompt;
    expect(prompt[0].role).toBe('system');
    if (provider === 'anthropic') {
      expect(prompt[0].providerOptions?.anthropic).toEqual({
        cacheControl: { type: 'ephemeral', ttl: '1h' },
      });
    }
  }
);

it('accepts existing system messages and image attachments', async () => {
  const doStream = installModel([textChunks]);
  const response = await handleChatRequest(
    [
      { id: 'system', role: 'system', content: 'Saved instructions' },
      {
        id: 'image',
        role: 'user',
        parts: [
          { type: 'text', text: 'Describe this' },
          { type: 'file', mimeType: 'image/png', data: 'aGVsbG8=' },
        ],
      },
    ],
    'sk-test-key',
    'openai'
  );
  expect(await response.text()).toContain('Hello from SDK 7');
  const prompt = doStream.mock.calls[0][0].prompt;
  expect(prompt).toContainEqual({ role: 'system', content: 'Saved instructions' });
  expect(prompt).toContainEqual(
    expect.objectContaining({
      role: 'user',
      content: expect.arrayContaining([
        expect.objectContaining({ type: 'file', mediaType: 'image/png' }),
      ]),
    })
  );
});

it.each([
  ['openai', 'gpt-6-astra'],
  ['anthropic', 'claude-fable-5-1'],
  ['anthropic', 'claude-fable-5'],
  ['anthropic', 'claude-opus-5'],
  ['anthropic', 'claude-sonnet-5'],
  ['anthropic', 'claude-opus-4-8'],
] as const)('omits unsupported temperature for %s/%s', async (provider, model) => {
  const doStream = installModel([textChunks]);
  const response = await handleChatRequest(messages, 'sk-test-key', provider, model);
  expect(await response.text()).toContain('Hello from SDK 7');
  expect(doStream.mock.calls[0][0].temperature).toBeUndefined();
});

it('preserves temperature for Haiku 4.5', async () => {
  const doStream = installModel([textChunks]);
  const response = await handleChatRequest(
    messages,
    'sk-test-key',
    'anthropic',
    'claude-haiku-4-5-20251001'
  );
  await response.text();
  expect(doStream.mock.calls[0][0].temperature).toBe(0.7);
});

it('repairs malformed tool input, reports results, and totals usage across steps', async () => {
  const doStream = installModel([
    [
      { type: 'stream-start', warnings: [] },
      {
        type: 'tool-call',
        toolCallId: 'time-call',
        toolName: 'dateTime',
        input: '{"timeZone":"UTC", broken}',
      },
      finish('tool-calls'),
    ],
    textChunks,
  ]);
  const onToolEvent = jest.fn();
  const response = await handleChatRequest(
    messages,
    'sk-test-key',
    'openai',
    undefined,
    undefined,
    undefined,
    onToolEvent
  );
  const body = await response.text();
  expect(body).toContain('Hello from SDK 7');
  expect(body).toContain('"promptTokens":20,"completionTokens":10,"totalTokens":30');
  expect(doStream).toHaveBeenCalledTimes(2);
  expect(onToolEvent).toHaveBeenCalledWith(
    expect.objectContaining({
      type: 'tool_finish',
      toolCallId: 'time-call',
      toolName: 'dateTime',
      args: { timeZone: 'UTC' },
      result: expect.objectContaining({ timeZone: 'UTC' }),
      duration: expect.any(Number),
    })
  );
});

it('forwards SDK stream errors to the extension UI', async () => {
  installModel([[{ type: 'error', error: new Error('Provider unavailable') }]]);
  const response = await handleChatRequest(messages, 'sk-test-key', 'openai');
  expect(await response.text()).toContain('error:{"error":"Provider unavailable"}');
});

it('encodes screenshot tool results as SDK 7 file data', async () => {
  const { screenshotTool } = createAITools(undefined, { provider: 'openai' });
  const output = await screenshotTool.toModelOutput!({
    toolCallId: 'screenshot',
    input: {},
    output: {
      success: true,
      message: 'Captured',
      screenshotDataUrl: 'data:image/jpeg;base64,aGVsbG8=',
    },
  });
  expect(output).toEqual({
    type: 'content',
    value: expect.arrayContaining([
      { type: 'file-data', mediaType: 'image/jpeg', data: 'aGVsbG8=' },
    ]),
  });
});

it.each(['ask', 'do'] as const)('exposes map mutations only in do mode (%s)', async (mode) => {
  const doStream = installModel([textChunks]);
  const response = await handleChatRequest(
    messages,
    'sk-test-key',
    'openai',
    undefined,
    undefined,
    undefined,
    undefined,
    mode
  );
  await response.text();
  const names = doStream.mock.calls[0][0].tools!.map((t) => t.name);
  expect(names).toEqual(expect.arrayContaining(['mapInspect', 'mapConvert', 'mapScreenshot']));
  for (const name of ['mapAnnotate', 'mapInteract', 'mapGeometry'])
    expect(names.includes(name)).toBe(mode === 'do');
});

it('preserves custom profile allowlists for new map tools', async () => {
  const doStream = installModel([textChunks]);
  const response = await handleChatRequest(
    messages,
    'sk-test-key',
    'openai',
    undefined,
    undefined,
    undefined,
    undefined,
    'do',
    { tools: ['mapInspect'] }
  );
  await response.text();
  expect(doStream.mock.calls[0][0].tools!.map((t) => t.name)).toEqual(['mapInspect']);
});

it('sends map screenshot metadata with SDK image content, omitting images for text-only providers', async () => {
  const result = {
    success: true,
    data: {
      frame: { width: 2400 },
      context: { mapId: 'map' },
      screenshotDataUrl: 'data:image/png;base64,aGVsbG8=',
    },
  };
  const images = createAITools(undefined, { provider: 'openai' }).mapTools.mapScreenshot;
  const text = createAITools(undefined, { provider: 'z-ai' }).mapTools.mapScreenshot;
  expect(await images.toModelOutput!({ toolCallId: 'map', input: {}, output: result })).toEqual({
    type: 'content',
    value: [
      {
        type: 'text',
        text: JSON.stringify({ frame: result.data.frame, context: result.data.context }),
      },
      { type: 'file-data', mediaType: 'image/png', data: 'aGVsbG8=' },
    ],
  });
  expect(await text.toModelOutput!({ toolCallId: 'map', input: {}, output: result })).toMatchObject(
    { type: 'text' }
  );
});
