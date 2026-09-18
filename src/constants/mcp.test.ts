import { createMCPConfig, validMCPPort, MCP_CONNECTOR_VERSION } from './mcp';
const { prepareManifest } = require('../../scripts/prepare-manifest-for-store');

it('keeps connector, extension and generated configuration versions synchronized', () => {
  expect(require('../../mcp-server/package.json').version).toBe(MCP_CONNECTOR_VERSION);
  expect(require('../../package.json').version).toBe(MCP_CONNECTOR_VERSION);
  expect(require('../manifest.json').version).toBe(MCP_CONNECTOR_VERSION);
});

it('generates a pinned, paired stdio configuration with matching port', () => {
  const config = createMCPConfig('secret', 3848, 'extension-id').mcpServers['earth-agent'];
  expect(config.args).toEqual(['-y', 'earth-agent-mcp@1.3.1']);
  expect(config.env).toEqual({
    EARTH_AGENT_TOKEN: 'secret',
    EARTH_AGENT_EXTENSION_ID: 'extension-id',
    EARTH_AGENT_WS_PORT: '3848',
  });
  expect(validMCPPort(3848)).toBe(true);
  for (const port of [0, 80, 65536, 3.2, NaN]) expect(validMCPPort(port)).toBe(false);
});

it('store packaging preserves local integrations as optional permissions and is idempotent', () => {
  const manifest = prepareManifest({
    host_permissions: ['https://example.com/*', 'http://localhost:*/*', 'http://127.0.0.1:*/*'],
  });
  expect(manifest.host_permissions).toEqual(['https://example.com/*']);
  expect(manifest.optional_host_permissions).toEqual(
    expect.arrayContaining(['http://localhost/*', 'http://127.0.0.1/*'])
  );
  expect(prepareManifest(manifest)).toEqual(manifest);
});
