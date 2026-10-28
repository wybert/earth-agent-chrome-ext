export const MCP_ENABLED_STORAGE_KEY = 'earth_agent_mcp_enabled';
export const MCP_LEGACY_TOKEN_STORAGE_KEY = 'earth_agent_mcp_token';
export const MCP_PORT_STORAGE_KEY = 'earth_agent_mcp_port';
export const MCP_ORIGIN = 'http://127.0.0.1/*';
export const MCP_DEFAULT_PORT = 3847;
export const MCP_CONNECTOR_VERSION = '1.3.2';

export function validMCPPort(port: number): boolean {
  return Number.isInteger(port) && port >= 1024 && port <= 65535;
}

export function createMCPConfig(port: number, extensionId: string) {
  return {
    mcpServers: {
      'earth-agent': {
        command: 'npx',
        args: ['-y', `earth-agent-mcp@${MCP_CONNECTOR_VERSION}`],
        env: {
          EARTH_AGENT_EXTENSION_ID: extensionId,
          EARTH_AGENT_WS_PORT: String(port),
        },
      },
    },
  };
}
