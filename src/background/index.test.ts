/**
 * Tests for background helpers (sendMessageToEarthEngineTab).
 * We rely on the global chrome mock provided by tests/setupTests.js.
 */
import { jest } from '@jest/globals';
jest.mock('./chat-handler', () => ({
  handleChatRequest: jest.fn(),
}));

// Utility to dynamically import module with fresh state (contentScriptTabs map).
const loadBackground = async () => {
  jest.resetModules();
  return import('./index');
};

describe('sendMessageToEarthEngineTab', () => {
  const queryMock = chrome.tabs.query as unknown as jest.Mock;
  const sendMessageMock = chrome.tabs.sendMessage as unknown as jest.Mock;
  const reloadMock = chrome.tabs.reload as unknown as jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers({ advanceTimers: true });
    jest.resetAllMocks();
    (chrome.runtime.lastError as any) = null;
  });

  afterEach(() => {
    jest.useRealTimers();
    (chrome.runtime.lastError as any) = null;
  });

  it('returns error when no Earth Engine tab found', async () => {
    (queryMock as any).mockResolvedValue([]);
    const { sendMessageToEarthEngineTab } = await loadBackground();
    const result = await sendMessageToEarthEngineTab({ type: 'TEST' });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/No Earth Engine tab/);
  });

  it('pings content script then sends message successfully', async () => {
    (queryMock as any).mockResolvedValue([{ id: 1 }]);

    sendMessageMock.mockImplementation((_tabId, msg: any, cb: any) => {
      if (msg && (msg as any).type === 'PING') {
        (chrome.runtime as any).lastError = null;
        cb && cb({ success: true });
      } else {
        (chrome.runtime as any).lastError = null;
        cb && cb({ success: true, echoed: msg });
      }
    });

    const { sendMessageToEarthEngineTab } = await loadBackground();
    const resultPromise = sendMessageToEarthEngineTab({ type: 'PAYLOAD', data: 42 });
    await Promise.resolve();
    const result = await resultPromise;

    expect(sendMessageMock).toHaveBeenCalledTimes(2); // ping + message
    expect(result).toEqual({ success: true, echoed: { type: 'PAYLOAD', data: 42 } });
  });

  it('retries ping and fails after max retries', async () => {
    (queryMock as any).mockResolvedValue([{ id: 2 }]);

    // Force ping failure via lastError
    sendMessageMock.mockImplementation((_tabId, _msg, cb: any) => {
      (chrome.runtime as any).lastError = new Error('no listener');
      cb && cb();
    });
    (reloadMock as any).mockResolvedValue(undefined);

    const { sendMessageToEarthEngineTab } = await loadBackground();
    const promise = sendMessageToEarthEngineTab({ type: 'PAYLOAD' }, { retries: 1, timeout: 5 });

    // Allow timers for reload wait (2000ms) and retry delay (1000ms) to advance
    jest.runAllTimers();
    const result = await promise;

    expect(reloadMock).toHaveBeenCalled();
    expect(sendMessageMock).toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/did not respond after 1 attempts/);
  });
});

describe('onMessage handler (CHAT_MESSAGE & API_REQUEST)', () => {
  const getMock = chrome.storage?.sync?.get as unknown as jest.Mock;
  const tabsSendMessageMock = chrome.tabs.sendMessage as unknown as jest.Mock;

  const loadHandler = async () => {
    jest.resetModules();
    await import('./index');
    const handler = (chrome.runtime.onMessage.addListener as unknown as jest.Mock).mock.calls.at(-1)?.[0] as any;
    if (typeof handler !== 'function') throw new Error('onMessage handler not registered');
    return handler as any;
  };

  beforeEach(() => {
    jest.resetAllMocks();
    (chrome.runtime.lastError as any) = null;
  });

  it('handles API_REQUEST success and returns data', async () => {
    (getMock as any).mockImplementation((keys: string[], cb: (result: any) => void) => {
      cb({
        earth_engine_openai_api_key: 'sk-123',
        earth_engine_llm_provider: 'openai',
        earth_engine_llm_model: 'gpt',
      });
    });

    const handler = await loadHandler();
    const chatMock = (jest.requireMock('./chat-handler') as any).handleChatRequest as jest.Mock;
    (chatMock as any).mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }) as Response
    );

    const sendResponse = jest.fn();

    const shouldReturnTrue = (handler as any)(
      { type: 'API_REQUEST', payload: { endpoint: '/api/chat', body: { messages: [] } } } as any,
      {} as any,
      sendResponse
    );

    expect(shouldReturnTrue).toBe(true);
    await new Promise(setImmediate);

    expect(chatMock).toHaveBeenCalled();
    expect(sendResponse).toHaveBeenCalledWith({ success: true, data: { ok: true } });
  });

  it('handles API_REQUEST missing api key and returns error', async () => {
    (getMock as any).mockImplementation((keys: string[], cb: (result: any) => void) => {
      cb({});
    });
    const handler = await loadHandler();
    const sendResponse = jest.fn();

    const ret = handler(
      { type: 'API_REQUEST', payload: { endpoint: '/api/chat', body: { messages: [] } } } as any,
      {} as any,
      sendResponse
    );

    expect(ret).toBe(true);
    await new Promise(setImmediate);

    expect(sendResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.stringMatching(/API key not found/i),
      })
    );
  });

  it('streams CHAT_MESSAGE chunks to the sender tab', async () => {
    (getMock as any).mockImplementation((keys: string[], cb: (result: any) => void) => {
      cb({
        earth_engine_openai_api_key: 'sk-123',
        earth_engine_llm_provider: 'openai',
      });
    });

    let readCount = 0;
    const fakeReader = {
      read: jest.fn(async () => {
        if (readCount === 0) {
          readCount += 1;
          return { done: false, value: new TextEncoder().encode('hello') };
        }
        return { done: true, value: undefined };
      }),
      releaseLock: jest.fn(),
      cancel: jest.fn(),
      closed: Promise.resolve(),
    };

    const handler = await loadHandler();
    const chatMock = (jest.requireMock('./chat-handler') as any).handleChatRequest as jest.Mock;
    (chatMock as any).mockResolvedValue({
      body: { getReader: () => fakeReader as any },
    } as unknown as Response);

    const sendResponse = jest.fn();

    const ret = (handler as any)(
      { type: 'CHAT_MESSAGE', messages: [{ role: 'user', content: 'hi' }] } as any,
      { tab: { id: 7 } } as any,
      sendResponse
    );

    expect(ret).toBe(true);
    await new Promise(setImmediate);

    expect(chatMock).toHaveBeenCalled();
    expect(tabsSendMessageMock).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ type: 'CHAT_STREAM_CHUNK', chunk: 'hello' })
    );
    expect(tabsSendMessageMock).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ type: 'CHAT_STREAM_END', fullText: 'hello' })
    );
    expect(sendResponse).not.toHaveBeenCalled(); // streaming path does not use sendResponse on success
  });

  it('fails CHAT_MESSAGE when api key missing', async () => {
    (getMock as any).mockImplementation((keys: string[], cb: (result: any) => void) => {
      cb({});
    });
    const handler = await loadHandler();
    const sendResponse = jest.fn();

    const ret = (handler as any)({ type: 'CHAT_MESSAGE', messages: [] } as any, {} as any, sendResponse);
    expect(ret).toBe(true);

    await new Promise(setImmediate);

    expect(sendResponse).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'ERROR', error: expect.stringMatching(/API key not configured/i) })
    );
  });
});
