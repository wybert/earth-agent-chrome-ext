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
import { LocalBridge } from './local-bridge.js';
import { tools, type ToolName } from './tools.js';

/**
 * Create and configure the MCP server
 */
function createMCPServer(bridge: LocalBridge): Server {
  const server = new Server(
    {
      name: 'earth-agent',
      version: '1.3.1',
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

    console.error(`[MCP] Tool call: ${name}`);

    try {
      // Verify tool exists
      const toolDef = tools[name as ToolName];
      if (!toolDef) {
        throw new Error(`Unknown tool: ${name}`);
      }

      const result = await bridge.send(name, args || {});

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


async function main(): Promise<void> {
  const bridge = new LocalBridge(
    Number(process.env.EARTH_AGENT_WS_PORT || '3847'),
    process.env.EARTH_AGENT_TOKEN || '',
    process.env.EARTH_AGENT_EXTENSION_ID || '',
  );
  await bridge.start();
  const server = createMCPServer(bridge);
  let closing = false;
  const shutdown = async () => {
    if (closing) return;
    closing = true;
    const timeout = setTimeout(() => process.exit(1), 3000);
    timeout.unref();
    await bridge.close();
    await server.close();
    clearTimeout(timeout);
  };
  process.stdin.on('end', () => { void shutdown(); });
  process.stdin.on('close', () => { void shutdown(); });
  process.on('SIGINT', () => { void shutdown(); });
  process.on('SIGTERM', () => { void shutdown(); });
  await server.connect(new StdioServerTransport());
  console.error('[MCP] Ready. Waiting for the paired Chrome extension.');
}

main().catch(error => {
  console.error('[MCP]', error instanceof Error ? error.message : 'Startup failed');
  process.exit(1);
});
