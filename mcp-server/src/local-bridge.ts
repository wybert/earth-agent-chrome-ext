import { randomUUID } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';

export class LocalBridge {
  private server?: WebSocketServer;
  private extension?: WebSocket;
  private pending = new Map<
    string,
    {
      resolve: (value: unknown) => void;
      reject: (error: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();

  constructor(
    private port: number,
    private extensionId: string
  ) {
    if (!Number.isInteger(port) || port < 1024 || port > 65535)
      throw new Error('EARTH_AGENT_WS_PORT must be an integer from 1024 to 65535.');
    if (!/^[a-p]{32}$/.test(extensionId))
      throw new Error(
        'Missing/invalid EARTH_AGENT_EXTENSION_ID. Copy the configuration from Earth Agent Settings.'
      );
  }

  async start() {
    const server = new WebSocketServer({
      host: '127.0.0.1',
      port: this.port,
      maxPayload: 16 * 1024 * 1024,
      verifyClient: (
        { origin }: { origin: string },
        done: (allowed: boolean, code?: number) => void
      ) => {
        done(origin === `chrome-extension://${this.extensionId}`, 403);
      },
    });
    this.server = server;
    server.on('connection', (socket) => {
      let connected = false;
      const timeout = setTimeout(() => socket.close(4001, 'Pairing timed out'), 5000);
      socket.on('error', () => {});
      socket.on('message', (raw) => {
        let message: any;
        try {
          message = JSON.parse(raw.toString());
        } catch {
          socket.close(4001, 'Invalid message');
          return;
        }
        if (!message || typeof message !== 'object') {
          socket.close(4001, 'Invalid message');
          return;
        }
        if (!connected) {
          if (message.type !== 'connect') {
            socket.close(4001, 'Invalid connector handshake');
            return;
          }
          if (this.extension && this.extension.readyState !== WebSocket.CLOSED) {
            socket.close(4009, 'Another browser is connected');
            return;
          }
          clearTimeout(timeout);
          connected = true;
          this.extension = socket;
          socket.send(JSON.stringify({ type: 'connected' }));
          return;
        }
        if (message.type === 'ping') {
          socket.send(JSON.stringify({ type: 'pong' }));
          return;
        }
        if (typeof message.id !== 'string') return;
        const request = this.pending.get(message.id);
        if (!request) return;
        clearTimeout(request.timer);
        this.pending.delete(message.id);
        if (message.success === true) request.resolve(message.result);
        else
          request.reject(
            new Error(typeof message.error === 'string' ? message.error : 'Extension tool failed.')
          );
      });
      socket.on('close', () => {
        clearTimeout(timeout);
        if (this.extension === socket) {
          this.extension = undefined;
          this.rejectPending(
            'Browser disconnected. The operation may have started; inspect GEE before retrying.'
          );
        }
      });
    });
    await new Promise<void>((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', (error: NodeJS.ErrnoException) =>
        reject(
          new Error(
            error.code === 'EADDRINUSE'
              ? `Port ${this.port} is in use. Close the other MCP connector or choose a different port in both extension Settings and Agent configuration. No processes were stopped.`
              : error.message
          )
        )
      );
    });
    server.on('error', (error) => console.error('[MCP] Local listener error:', error.message));
  }

  get connected() {
    return this.extension?.readyState === WebSocket.OPEN;
  }

  async send(name: string, args: Record<string, unknown>): Promise<unknown> {
    const socket = this.extension;
    if (!socket || !this.connected)
      throw new Error(
        'Browser not connected. Enable Local MCP in Earth Agent Settings, allow local access, and start the connector with the matching extension ID and port. No extension AI API key is needed.'
      );
    if (this.pending.size >= 32)
      throw new Error('Too many pending browser operations. Wait for current work to complete.');
    const id = randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(
          new Error(
            'Browser operation timed out. It may still be running; inspect GEE before retrying.'
          )
        );
      }, 120000);
      this.pending.set(id, { resolve, reject, timer });
      socket.send(JSON.stringify({ type: 'tool', id, name, args }), (error) => {
        if (error) {
          clearTimeout(timer);
          this.pending.delete(id);
          reject(error);
        }
      });
    });
  }

  private rejectPending(reason: string) {
    for (const request of this.pending.values()) {
      clearTimeout(request.timer);
      request.reject(new Error(reason));
    }
    this.pending.clear();
  }

  async close() {
    this.rejectPending('MCP connector stopped.');
    for (const socket of this.server?.clients ?? []) socket.terminate();
    await new Promise<void>((resolve) =>
      this.server ? this.server.close(() => resolve()) : resolve()
    );
  }
}
