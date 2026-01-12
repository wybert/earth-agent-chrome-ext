#!/usr/bin/env node

/**
 * Earth Agent MCP Server
 *
 * This MCP server exposes Google Earth Engine tools to AI assistants like
 * Claude Code, Zed Editor, and Cursor. It communicates with the Earth Agent
 * Chrome extension via WebSocket.
 *
 * Architecture:
 * Claude Code/Zed --[MCP stdio]--> MCP Server --[WebSocket]--> Chrome Extension --> Earth Engine
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { WebSocketServer, WebSocket } from 'ws';
import { execSync } from 'node:child_process';
import net from 'node:net';
import { tools, type ToolName } from './tools.js';

// Configuration
const WS_PORT = parseInt(process.env.EARTH_AGENT_WS_PORT || '3847', 10);
const REQUEST_TIMEOUT = 120000; // 2 minutes timeout for tool calls

// ============================================================================
// Port Management Utilities
// ============================================================================

/**
 * Check if a port is currently in use
 */
async function isPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(true)); // Port is in use
    server.once('listening', () => {
      server.close(() => resolve(false)); // Port is free
    });
    server.listen(port);
  });
}

/**
 * Kill any process using the specified port
 */
function killProcessOnPort(port: number): void {
  try {
    if (process.platform === 'win32') {
      execSync(`FOR /F "tokens=5" %a in ('netstat -ano ^| findstr :${port}') do taskkill /F /PID %a`, {
        stdio: 'ignore',
      });
    } else {
      execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`, {
        stdio: 'ignore',
      });
    }
    console.error(`[MCP] Killed existing process on port ${port}`);
  } catch {
    // No process to kill, that's fine
  }
}

/**
 * Wait for a specified number of milliseconds
 */
function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Ensure the port is free before starting the server
 */
async function ensurePortFree(port: number): Promise<void> {
  // First, try to kill any existing process
  killProcessOnPort(port);

  // Wait until the port is actually free
  let attempts = 0;
  const maxAttempts = 50; // 5 seconds max
  while (await isPortInUse(port)) {
    if (attempts++ >= maxAttempts) {
      throw new Error(`Port ${port} is still in use after ${maxAttempts * 100}ms`);
    }
    await wait(100);
  }
}

// WebSocket connection state
let extensionSocket: WebSocket | null = null;
const pendingRequests = new Map<
  string,
  {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }
>();

// Generate unique request IDs
let requestIdCounter = 0;
function generateRequestId(): string {
  return `req_${Date.now()}_${++requestIdCounter}`;
}

/**
 * Send a request to the Chrome extension via WebSocket and wait for response
 */
async function sendToExtension(name: string, args: Record<string, unknown>): Promise<unknown> {
  if (!extensionSocket || extensionSocket.readyState !== WebSocket.OPEN) {
    throw new Error(
      'Chrome extension not connected. Please ensure the Earth Agent extension is running and connected.'
    );
  }

  const requestId = generateRequestId();

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingRequests.delete(requestId);
      reject(new Error(`Request timeout after ${REQUEST_TIMEOUT / 1000} seconds`));
    }, REQUEST_TIMEOUT);

    pendingRequests.set(requestId, { resolve, reject, timeout });

    const message = JSON.stringify({
      id: requestId,
      type: 'tool',
      name,
      args,
    });

    extensionSocket!.send(message);
  });
}

/**
 * Handle incoming WebSocket messages from the Chrome extension
 */
function handleExtensionMessage(data: string): void {
  try {
    const message = JSON.parse(data);

    if (!message.id) {
      console.error('[MCP] Received message without ID:', message);
      return;
    }

    const pending = pendingRequests.get(message.id);
    if (!pending) {
      console.error('[MCP] Received response for unknown request:', message.id);
      return;
    }

    clearTimeout(pending.timeout);
    pendingRequests.delete(message.id);

    if (message.success) {
      pending.resolve(message.result);
    } else {
      pending.reject(new Error(message.error || 'Unknown error from extension'));
    }
  } catch (error) {
    console.error('[MCP] Error parsing extension message:', error);
  }
}

/**
 * Create and configure the MCP server
 */
function createMCPServer(): Server {
  const server = new Server(
    {
      name: 'earth-agent',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Handle list tools request
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const mcpTools: Tool[] = Object.entries(tools).map(([name, def]) => ({
      name,
      description: def.description,
      inputSchema: def.inputSchema,
    }));

    return { tools: mcpTools };
  });

  // Handle tool call requests
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    console.error(`[MCP] Tool call: ${name}`, args);

    try {
      // Verify tool exists
      const toolDef = tools[name as ToolName];
      if (!toolDef) {
        throw new Error(`Unknown tool: ${name}`);
      }

      const result = await sendToExtension(name, args || {});

      // Format result based on tool type
      if (name === 'gee_screenshot') {
        // Screenshot returns base64 image
        const imageData = result as { data?: string; mimeType?: string };
        if (imageData.data) {
          return {
            content: [
              {
                type: 'image' as const,
                data: imageData.data,
                mimeType: imageData.mimeType || 'image/jpeg',
              },
            ],
          };
        }
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[MCP] Tool error: ${name}`, errorMessage);

      return {
        content: [
          {
            type: 'text' as const,
            text: `Error: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

/**
 * Start the WebSocket server for Chrome extension connection
 */
async function startWebSocketServer(): Promise<WebSocketServer> {
  // Ensure port is free before starting (aggressive port management)
  await ensurePortFree(WS_PORT);

  const wss = new WebSocketServer({ port: WS_PORT });

  console.error(`[MCP] WebSocket server listening on port ${WS_PORT}`);

  wss.on('connection', (ws) => {
    console.error('[MCP] Chrome extension connected');

    // "Latest Connection Wins" - close any existing connection immediately
    if (extensionSocket && extensionSocket.readyState === WebSocket.OPEN) {
      console.error('[MCP] Closing previous connection (new connection takes over)');
      extensionSocket.close();
    }

    extensionSocket = ws;

    ws.on('message', (data) => {
      handleExtensionMessage(data.toString());
    });

    ws.on('close', () => {
      console.error('[MCP] Chrome extension disconnected');
      if (extensionSocket === ws) {
        extensionSocket = null;
      }
    });

    ws.on('error', (error) => {
      console.error('[MCP] WebSocket error:', error.message);
    });

    // Send a ping to confirm connection
    ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
  });

  wss.on('error', (error) => {
    console.error('[MCP] WebSocket server error:', error.message);
  });

  return wss;
}

/**
 * Process Exit Watchdog
 * Monitor stdin - when it closes, the parent process has terminated
 * This prevents "zombie" servers blocking ports for future sessions
 */
function setupExitWatchdog(server: Server, wss: WebSocketServer): void {
  process.stdin.on('close', async () => {
    console.error('[MCP] Parent process closed stdin, shutting down...');

    // Force exit if graceful shutdown takes too long (15s)
    const forceExitTimeout = setTimeout(() => {
      console.error('[MCP] Force exit after timeout');
      process.exit(0);
    }, 15000);

    try {
      // Close WebSocket server
      wss.close();

      // Close MCP server
      await server.close();
    } catch (error) {
      console.error('[MCP] Error during shutdown:', error);
    }

    clearTimeout(forceExitTimeout);
    process.exit(0);
  });
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  console.error('[MCP] Starting Earth Agent MCP Server...');

  // Start WebSocket server for extension connection (with port management)
  const wss = await startWebSocketServer();

  // Create and start MCP server
  const server = createMCPServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);

  // Setup exit watchdog to clean up when parent process closes
  setupExitWatchdog(server, wss);

  console.error('[MCP] MCP Server running. Waiting for connections...');

  // Handle shutdown gracefully
  process.on('SIGINT', () => {
    console.error('[MCP] Shutting down (SIGINT)...');
    wss.close();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.error('[MCP] Shutting down (SIGTERM)...');
    wss.close();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('[MCP] Fatal error:', error);
  process.exit(1);
});
