import { createResilientFetch, selectBestEarthEngineTab, ensureContentScript, validateChromeAPIs } from './utils';

const createTab = (overrides: Partial<chrome.tabs.Tab>): chrome.tabs.Tab =>
  ({ id: Math.floor(Math.random() * 1000), active: false, windowId: 1, ...overrides } as chrome.tabs.Tab);

describe('selectBestEarthEngineTab', () => {
  it('returns null when no tabs', () => {
    expect(selectBestEarthEngineTab([])).toBeNull();
  });

  it('returns the only tab when one exists', () => {
    const onlyTab = createTab({ id: 1 });
    expect(selectBestEarthEngineTab([onlyTab])).toBe(onlyTab);
  });

  it('prefers an active tab', () => {
    const inactive = createTab({ id: 1, active: false, lastAccessed: 10 });
    const active = createTab({ id: 2, active: true, lastAccessed: 0 });
    expect(selectBestEarthEngineTab([inactive, active])).toBe(active);
  });

  it('falls back to most recently accessed when none are active', () => {
    const older = createTab({ id: 1, active: false, lastAccessed: 100 });
    const newer = createTab({ id: 2, active: false, lastAccessed: 200 });
    expect(selectBestEarthEngineTab([older, newer])).toBe(newer);
  });
});

describe('createResilientFetch', () => {
  it('retries on network errors and succeeds', async () => {
    const fetchImpl = jest
      .fn()
      .mockRejectedValueOnce(new TypeError('network down'))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));

    const resilientFetch = createResilientFetch({
      maxAttempts: 3,
      baseDelayMs: 0,
      fetchImpl,
      label: 'test-fetch',
    });

    const response = await resilientFetch('http://example.com');
    expect(response.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('retries on retryable HTTP status and then returns success', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(new Response('server error', { status: 500 }))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));

    const resilientFetch = createResilientFetch({
      maxAttempts: 3,
      baseDelayMs: 0,
      fetchImpl,
      label: 'test-fetch',
    });

    const response = await resilientFetch('http://example.com');
    expect(response.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('does not retry on non-retryable HTTP status', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(new Response('bad request', { status: 400 }));

    const resilientFetch = createResilientFetch({
      maxAttempts: 3,
      baseDelayMs: 0,
      fetchImpl,
      label: 'test-fetch',
    });

    const response = await resilientFetch('http://example.com');
    expect(response.status).toBe(400);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('throws after exhausting retries', async () => {
    const error = new TypeError('network still down');
    const fetchImpl = jest.fn().mockRejectedValue(error);

    const resilientFetch = createResilientFetch({
      maxAttempts: 2,
      baseDelayMs: 0,
      fetchImpl,
      label: 'test-fetch',
    });

    await expect(resilientFetch('http://example.com')).rejects.toBe(error);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});

describe('ensureContentScript', () => {
  beforeEach(() => {
    jest.useFakeTimers({ advanceTimers: true });
    (chrome.runtime.lastError as any) = null;
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.resetAllMocks();
    (chrome.runtime.lastError as any) = null;
  });

  it('returns success when content script already loaded', async () => {
    const sendMessageMock = chrome.tabs.sendMessage as jest.Mock;
    sendMessageMock.mockImplementation((_tabId, _msg, cb) => cb && cb({ pong: true }));

    const resultPromise = ensureContentScript(1);
    await Promise.resolve();
    const result = await resultPromise;

    expect(sendMessageMock).toHaveBeenCalledWith(
      1,
      { type: 'PING' },
      expect.any(Function)
    );
    expect(result).toEqual({ success: true });
  });

  it('injects script when ping fails, then succeeds', async () => {
    const sendMessageMock = chrome.tabs.sendMessage as jest.Mock;
    const executeScriptMock = chrome.scripting.executeScript as jest.Mock;

    // First attempt: simulate runtime error to force injection branch
    sendMessageMock.mockImplementationOnce((_tabId, _msg, cb) => {
      (chrome.runtime as any).lastError = new Error('no listener');
      cb && cb();
    });
    // After injection, ping would not happen again; we just ensure injection flow resolves.
    executeScriptMock.mockResolvedValue(undefined);

    const resultPromise = ensureContentScript(2);
    // Let any pending promises run and timers advance
    jest.runAllTimers();
    const result = await resultPromise;

    expect(sendMessageMock).toHaveBeenCalledTimes(1);
    expect(executeScriptMock).toHaveBeenCalledWith({
      target: { tabId: 2 },
      files: ['content.js'],
    });
    expect(result).toEqual({ success: true });
  });

  it('returns error when injection fails', async () => {
    const sendMessageMock = chrome.tabs.sendMessage as jest.Mock;
    const executeScriptMock = chrome.scripting.executeScript as jest.Mock;

    sendMessageMock.mockImplementationOnce((_tabId, _msg, cb) => {
      (chrome.runtime as any).lastError = new Error('no listener');
      cb && cb();
    });
    executeScriptMock.mockRejectedValue(new Error('inject failed'));

    const resultPromise = ensureContentScript(3);
    jest.runAllTimers();
    const result = await resultPromise;

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/inject failed/);
  });
});

describe('validateChromeAPIs', () => {
  const originalChrome = global.chrome;

  afterEach(() => {
    // Restore the original mock
    (global as any).chrome = originalChrome;
  });

  it('returns success when tabs and scripting are available', () => {
    const result = validateChromeAPIs();
    expect(result).toEqual({ success: true });
  });

  it('fails when tabs API missing', () => {
    (global as any).chrome = { ...originalChrome, tabs: undefined };
    const result = validateChromeAPIs();
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/tabs/);
  });

  it('fails when scripting API missing', () => {
    (global as any).chrome = { ...originalChrome, scripting: undefined };
    const result = validateChromeAPIs();
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/scripting/);
  });
});
