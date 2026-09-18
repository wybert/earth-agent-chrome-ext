import {
  MCP_ENABLED_STORAGE_KEY,
  MCP_TOKEN_STORAGE_KEY,
  MCP_PORT_STORAGE_KEY,
  MCP_DEFAULT_PORT,
  MCP_ORIGIN,
  validMCPPort,
} from '../constants/mcp';

export interface MCPStatus {
  enabled: boolean;
  connected: boolean;
  connecting: boolean;
  state:
    | 'disabled'
    | 'permission-required'
    | 'pairing-required'
    | 'connecting'
    | 'connected'
    | 'waiting'
    | 'rejected';
  message: string;
  port: number;
}

const ALARM = 'earth-agent-mcp-reconnect';

/** Local bridge lifecycle. Never execute requests until the token handshake succeeds. */
export class MCPConnection {
  private socket: WebSocket | null = null;
  private generation = 0;
  private retry: ReturnType<typeof setTimeout> | undefined;
  private heartbeat: ReturnType<typeof setInterval> | undefined;
  private handshake: ReturnType<typeof setTimeout> | undefined;
  private attempts = 0;
  private lastPong = 0;
  private initialized = false;
  status: MCPStatus = {
    enabled: false,
    connected: false,
    connecting: false,
    state: 'disabled',
    message: 'MCP is off.',
    port: MCP_DEFAULT_PORT,
  };

  constructor(
    private execute: (request: {
      id: string;
      type: 'tool';
      name: string;
      args: Record<string, unknown>;
    }) => Promise<unknown>
  ) {}

  private update(state: MCPStatus['state'], message: string) {
    this.status = {
      ...this.status,
      state,
      message,
      connected: state === 'connected',
      connecting: state === 'connecting',
    };
  }

  stop() {
    this.generation++;
    clearTimeout(this.retry);
    clearTimeout(this.handshake);
    clearInterval(this.heartbeat);
    this.retry = this.handshake = undefined;
    this.heartbeat = undefined;
    const socket = this.socket;
    this.socket = null;
    if (socket) {
      socket.onclose = socket.onmessage = socket.onopen = socket.onerror = null;
      socket.close();
    }
    this.update('disabled', 'MCP is off.');
  }

  async connect() {
    if (this.socket || this.status.connecting) return;
    const generation = this.generation;
    const settings = await chrome.storage.local.get([
      MCP_ENABLED_STORAGE_KEY,
      MCP_TOKEN_STORAGE_KEY,
      MCP_PORT_STORAGE_KEY,
    ]);
    if (generation !== this.generation) return;
    this.status.enabled = settings[MCP_ENABLED_STORAGE_KEY] === true;
    if (!this.status.enabled) {
      this.update('disabled', 'MCP is off.');
      await chrome.alarms.clear(ALARM);
      return;
    }
    const port = Number(settings[MCP_PORT_STORAGE_KEY] ?? MCP_DEFAULT_PORT);
    const token = settings[MCP_TOKEN_STORAGE_KEY];
    if (!validMCPPort(port) || typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
      this.update('pairing-required', 'Generate a connection configuration in Settings.');
      return;
    }
    this.status.port = port;
    const allowed = await chrome.permissions.contains({ origins: [MCP_ORIGIN] });
    if (generation !== this.generation || this.socket) return;
    if (!allowed) {
      this.update('permission-required', 'Allow local access in Settings to connect.');
      return;
    }
    await chrome.alarms.create(ALARM, { periodInMinutes: 1 });
    if (generation !== this.generation || this.socket) return;
    this.update('connecting', 'Connecting to the local MCP connector…');
    const socket = new WebSocket(`ws://127.0.0.1:${port}`);
    this.socket = socket;
    let authenticated = false;
    let queue = Promise.resolve();
    const current = () => this.socket === socket && generation === this.generation;
    this.handshake = setTimeout(() => {
      if (current()) socket.close();
    }, 10000);
    socket.onopen = () => {
      if (current()) socket.send(JSON.stringify({ type: 'authenticate', token }));
    };
    socket.onmessage = (event) => {
      if (!current()) return;
      let message: any;
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }
      if (!message || typeof message !== 'object') return;
      if (!authenticated) {
        if (message.type !== 'authenticated') return;
        authenticated = true;
        clearTimeout(this.handshake);
        this.attempts = 0;
        this.lastPong = Date.now();
        this.update('connected', 'Paired local connector connected.');
        this.heartbeat = setInterval(() => {
          if (!current()) return;
          if (Date.now() - this.lastPong > 45000) {
            socket.close();
            return;
          }
          socket.send(JSON.stringify({ type: 'ping' }));
        }, 20000);
        return;
      }
      if (message.type === 'pong') {
        this.lastPong = Date.now();
        return;
      }
      if (
        message.type !== 'tool' ||
        typeof message.id !== 'string' ||
        typeof message.name !== 'string' ||
        !message.args ||
        typeof message.args !== 'object' ||
        Array.isArray(message.args)
      )
        return;
      // Serialize browser operations. Discard queued work from a revoked/old connection.
      queue = queue
        .then(async () => {
          if (!current()) return;
          let response;
          try {
            response = { id: message.id, success: true, result: await this.execute(message) };
          } catch (error) {
            response = {
              id: message.id,
              success: false,
              error: error instanceof Error ? error.message : String(error),
            };
          }
          if (current() && socket.readyState === WebSocket.OPEN)
            socket.send(JSON.stringify(response));
        })
        .catch(() => {});
    };
    socket.onerror = () => {}; // onclose supplies a useful status; never log credentials.
    socket.onclose = (event) => {
      if (!current()) return;
      this.socket = null;
      clearTimeout(this.handshake);
      clearInterval(this.heartbeat);
      if (event.code === 4001 || event.code === 4009) {
        this.update(
          'rejected',
          event.code === 4001
            ? 'Pairing rejected. Copy the current configuration and restart the Agent connector.'
            : 'Connector already paired to another browser. Use a different port.'
        );
        void chrome.alarms.clear(ALARM);
        return;
      }
      this.update(
        'waiting',
        'Waiting for your Agent to start the connector. Check Node.js, configuration and port.'
      );
      const delay = Math.min(30000, 1000 * 2 ** Math.min(this.attempts++, 5));
      this.retry = setTimeout(() => {
        void this.connect().catch(() =>
          this.update('waiting', 'Connection failed. Retry from Settings.')
        );
      }, delay);
    };
  }

  async reset() {
    this.stop();
    this.attempts = 0;
    await this.connect();
  }

  async init() {
    if (this.initialized) return;
    this.initialized = true;
    // Register listeners before the first await so service-worker wakeups are handled.
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === ALARM && this.status.state !== 'rejected')
        void this.connect().catch(() => {});
    });
    chrome.storage.onChanged.addListener((changes, area) => {
      if (
        area === 'local' &&
        [MCP_ENABLED_STORAGE_KEY, MCP_TOKEN_STORAGE_KEY, MCP_PORT_STORAGE_KEY].some(
          (key) => key in changes
        )
      )
        void this.reset().catch(() => {});
    });
    chrome.permissions.onRemoved.addListener(() => {
      void this.reset().catch(() => {});
    });
    chrome.runtime.onMessage.addListener((message, sender, respond) => {
      if (!['GET_LOCAL_MCP_STATUS', 'RECONNECT_LOCAL_MCP'].includes(message?.type)) return;
      if (
        sender.id !== chrome.runtime.id ||
        sender.tab ||
        !sender.url?.startsWith(chrome.runtime.getURL(''))
      )
        return;
      void (async () => {
        if (message.type === 'RECONNECT_LOCAL_MCP') await this.reset();
        const tabs = await chrome.tabs.query({ url: 'https://code.earthengine.google.com/*' });
        respond({ ...this.status, geeTabs: tabs.length });
      })().catch(() =>
        respond({ ...this.status, message: 'Unable to check connection. Reopen Settings.' })
      );
      return true;
    });
    await this.connect();
  }
}
