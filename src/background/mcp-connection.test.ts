import { MCPConnection } from './mcp-connection';
import { MCP_ENABLED_STORAGE_KEY, MCP_TOKEN_STORAGE_KEY } from '../constants/mcp';

class FakeSocket {
  static OPEN = 1;
  static instances: FakeSocket[] = [];
  readyState = 1;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;
  onerror: (() => void) | null = null;
  send = jest.fn();
  close = jest.fn();
  constructor(public url: string) {
    FakeSocket.instances.push(this);
  }
  message(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }
}
const flush = async () => {
  for (let i = 0; i < 15; i++) await Promise.resolve();
};
let settings: Record<string, unknown>;
let connection: MCPConnection;
let execute: jest.Mock;
beforeEach(() => {
  jest.useFakeTimers();
  FakeSocket.instances = [];
  (globalThis as any).WebSocket = FakeSocket;
  settings = { [MCP_ENABLED_STORAGE_KEY]: true, [MCP_TOKEN_STORAGE_KEY]: 'a'.repeat(64) };
  (chrome.storage as any).onChanged = { addListener: jest.fn(), removeListener: jest.fn() };
  (chrome.storage.local.get as jest.Mock).mockImplementation(async () => settings);
  (chrome as any).permissions = {
    contains: jest.fn(async () => true),
    onRemoved: { addListener: jest.fn() },
  };
  (chrome as any).alarms = {
    create: jest.fn(async () => {}),
    clear: jest.fn(async () => true),
    onAlarm: { addListener: jest.fn() },
  };
  execute = jest.fn(async () => ({ code: 'hello' }));
  connection = new MCPConnection(execute);
});
afterEach(() => {
  connection.stop();
  jest.useRealTimers();
});

it('defaults off; requires pairing and local permission', async () => {
  settings = {};
  await connection.connect();
  expect(connection.status.state).toBe('disabled');
  settings[MCP_ENABLED_STORAGE_KEY] = true;
  await connection.connect();
  expect(connection.status.state).toBe('pairing-required');
  settings[MCP_TOKEN_STORAGE_KEY] = 'a'.repeat(64);
  (chrome.permissions.contains as jest.Mock).mockResolvedValue(false);
  await connection.connect();
  expect(connection.status.state).toBe('permission-required');
  expect(FakeSocket.instances).toHaveLength(0);
});

it('registers wakeup and settings listeners and only answers trusted extension pages', async () => {
  (chrome.runtime.onMessage.addListener as jest.Mock).mockClear();
  (chrome.runtime as any).getURL = (path: string) => `chrome-extension://${chrome.runtime.id}/${path}`;
  (chrome.tabs.query as jest.Mock).mockResolvedValue([]);
  await connection.init();
  expect(chrome.alarms.onAlarm.addListener).toHaveBeenCalled();
  const listener = (chrome.runtime.onMessage.addListener as jest.Mock).mock.calls[0][0];
  const respond = jest.fn();
  listener({ type: 'GET_LOCAL_MCP_STATUS' }, { id: chrome.runtime.id, tab: { id: 1 }, url: 'https://code.earthengine.google.com/' }, respond);
  await flush();
  expect(respond).not.toHaveBeenCalled();
  expect(listener({ type: 'GET_LOCAL_MCP_STATUS' }, { id: chrome.runtime.id, url: chrome.runtime.getURL('sidepanel.html') }, respond)).toBe(true);
  await flush();
  expect(respond).toHaveBeenCalledWith(expect.objectContaining({ geeTabs: 0 }));
  settings[MCP_ENABLED_STORAGE_KEY] = false;
  const changed = (chrome.storage.onChanged.addListener as jest.Mock).mock.calls[0][0];
  changed({ [MCP_ENABLED_STORAGE_KEY]: { newValue: false } }, 'local');
  await flush();
  expect(connection.status.state).toBe('disabled');
  expect(chrome.alarms.clear).toHaveBeenCalled();
});

it('ignores unpaired tool requests, authenticates and serializes operations', async () => {
  await connection.connect();
  const socket = FakeSocket.instances[0];
  socket.onopen?.();
  expect(socket.send).toHaveBeenCalledWith(
    JSON.stringify({ type: 'authenticate', token: 'a'.repeat(64) })
  );
  const request = { type: 'tool', id: '1', name: 'read_gee_code', args: {} };
  socket.message(request);
  await flush();
  expect(execute).not.toHaveBeenCalled();
  socket.message({ type: 'authenticated' });
  let release!: () => void;
  execute.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        release = resolve;
      })
  );
  socket.message(request);
  socket.message({ ...request, id: '2' });
  await flush();
  expect(execute).toHaveBeenCalledTimes(1);
  release();
  await flush();
  expect(execute).toHaveBeenCalledTimes(2);
  expect(connection.status.connected).toBe(true);
  jest.advanceTimersByTime(20000);
  expect(socket.send).toHaveBeenCalledWith(JSON.stringify({ type: 'ping' }));
  socket.message({ type: 'pong' });
  jest.advanceTimersByTime(20000);
  expect(socket.close).not.toHaveBeenCalled();
});

it('retries refused connections but stops on rejected pairing', async () => {
  await connection.connect();
  FakeSocket.instances[0].onclose?.({ code: 1006 });
  expect(connection.status.state).toBe('waiting');
  jest.advanceTimersByTime(1000);
  await flush();
  expect(FakeSocket.instances).toHaveLength(2);
  FakeSocket.instances[1].onclose?.({ code: 4001 });
  expect(connection.status.state).toBe('rejected');
  jest.advanceTimersByTime(60000);
  await flush();
  expect(FakeSocket.instances).toHaveLength(2);
});

it('does not reconnect or execute queued work after disabling', async () => {
  await connection.connect();
  const socket = FakeSocket.instances[0];
  socket.message({ type: 'authenticated' });
  socket.message({ type: 'tool', id: '1', name: 'run_gee_code', args: {} });
  settings[MCP_ENABLED_STORAGE_KEY] = false;
  await connection.reset();
  await flush();
  expect(execute).not.toHaveBeenCalled();
  expect(socket.onclose).toBeNull();
  expect(connection.status.state).toBe('disabled');
  jest.advanceTimersByTime(60000);
  await flush();
  expect(FakeSocket.instances).toHaveLength(1);
});

it('does not resurrect a connection after async permission check races with disabling', async () => {
  let release!: (value: boolean) => void;
  (chrome.permissions.contains as jest.Mock).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        release = resolve;
      })
  );
  const pending = connection.connect();
  await flush();
  settings[MCP_ENABLED_STORAGE_KEY] = false;
  await connection.reset();
  release(true);
  await pending;
  expect(FakeSocket.instances).toHaveLength(0);
});
