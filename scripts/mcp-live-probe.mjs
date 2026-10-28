// Interactive live verification using the configured local Codex MCP connector.
// Never prints pairing credentials. Tool mutations must be requested explicitly.
import { execFileSync } from 'node:child_process';
import { createInterface } from 'node:readline';
import { Client } from '../mcp-server/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js';
import { StdioClientTransport } from '../mcp-server/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js';

const configuration = JSON.parse(
  execFileSync('codex', ['mcp', 'get', 'earth-agent', '--json'], { encoding: 'utf8' })
);
const connection = configuration.transport;
if (connection.type !== 'stdio')
  throw new Error('Expected the locally configured stdio connector.');
const client = new Client({ name: 'earth-agent-live-verification', version: '1.0.0' });
const transport = new StdioClientTransport({
  command: connection.command,
  args: connection.args,
  env: { ...process.env, ...connection.env },
  stderr: 'pipe',
});
// Support legacy local configurations without requiring or printing their token.
const legacySecrets = [connection.env.EARTH_AGENT_TOKEN].filter(
  (value) => typeof value === 'string' && value.length > 0
);
const redactLegacySecrets = (value) =>
  legacySecrets.reduce((text, secret) => text.split(secret).join('[REDACTED]'), String(value));
transport.stderr?.on('data', (chunk) => process.stderr.write(redactLegacySecrets(chunk)));
await client.connect(transport);
const listed = await client.listTools();
console.log(JSON.stringify({ ready: true, tools: listed.tools.map((tool) => tool.name) }));
const input = createInterface({ input: process.stdin });
let idle;
const resetIdle = () => {
  clearTimeout(idle);
  idle = setTimeout(() => {
    console.log('Idle timeout; closing test connector.');
    input.close();
  }, 600000);
};
resetIdle();
try {
  for await (const line of input) {
    resetIdle();
    if (line.trim() === 'exit') break;
    try {
      const request = JSON.parse(line);
      if (!listed.tools.some((tool) => tool.name === request.name))
        throw new Error('Unknown tool.');
      const result = await client.callTool(
        { name: request.name, arguments: request.arguments || {} },
        undefined,
        { timeout: 130000 }
      );
      const safe = {
        ...result,
        content: result.content.map((part) =>
          part.type === 'image'
            ? { type: 'image', mimeType: part.mimeType, encodedBytes: part.data.length }
            : part
        ),
      };
      console.log(redactLegacySecrets(JSON.stringify(safe)));
    } catch (error) {
      console.log(
        JSON.stringify({
          error: redactLegacySecrets(error),
        })
      );
    }
  }
} finally {
  clearTimeout(idle);
  input.close();
  await client.close();
}
