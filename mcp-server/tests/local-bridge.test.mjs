import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { once } from 'node:events';
import { WebSocket } from 'ws';
import { LocalBridge } from '../dist/local-bridge.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { fileURLToPath } from 'node:url';

const token = 'a'.repeat(64);
const extensionId = 'a'.repeat(32);
const origin = `chrome-extension://${extensionId}`;
async function freePort() {
  const server = net.createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}
async function connect(port, key = token) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}`, { origin });
  await once(ws, 'open');
  ws.send(JSON.stringify({ type: 'authenticate', token: key }));
  return ws;
}

test('validates required pairing configuration', () => {
  assert.throws(() => new LocalBridge(3847, '', extensionId), /TOKEN/);
  assert.throws(() => new LocalBridge(80, token, extensionId), /PORT/);
  assert.throws(() => new LocalBridge(3847, token, '*'), /EXTENSION_ID/);
});

test(
  'authenticates, keeps alive, rejects takeover and fails pending calls on disconnect',
  { timeout: 10000 },
  async (t) => {
    const port = await freePort();
    const bridge = new LocalBridge(port, token, extensionId);
    await bridge.start();
    t.after(() => bridge.close());
    await assert.rejects(bridge.send('read_gee_code', {}), /not connected/);
    const bad = await connect(port, 'b'.repeat(64));
    assert.equal((await once(bad, 'close'))[0], 4001);
    assert.equal(bridge.connected, false);
    const ws = await connect(port);
    assert.equal(JSON.parse((await once(ws, 'message'))[0]).type, 'authenticated');
    assert.equal(bridge.connected, true);
    ws.send(JSON.stringify({ type: 'ping' }));
    assert.equal(JSON.parse((await once(ws, 'message'))[0]).type, 'pong');
    const second = await connect(port);
    assert.equal((await once(second, 'close'))[0], 4009);
    assert.equal(bridge.connected, true);
    const received = once(ws, 'message');
    const result = bridge.send('read_gee_code', {});
    const request = JSON.parse((await received)[0]);
    ws.send(JSON.stringify({ id: request.id, success: true, result: { code: 'Map.clear();' } }));
    assert.deepEqual(await result, { code: 'Map.clear();' });
    const pending = bridge.send('read_gee_code', {});
    const rejected = assert.rejects(pending, /disconnected/);
    ws.close();
    await rejected;
  }
);

test(
  'rejects website origins and leaves occupied ports/processes alone',
  { timeout: 10000 },
  async (t) => {
    const port = await freePort();
    const bridge = new LocalBridge(port, token, extensionId);
    await bridge.start();
    t.after(() => bridge.close());
    const ws = new WebSocket(`ws://127.0.0.1:${port}`, { origin: 'https://evil.example' });
    const [error] = await once(ws, 'error');
    assert.match(error.message, /403/);
    const competing = new LocalBridge(port, token, extensionId);
    await assert.rejects(competing.start(), /No processes were stopped/);
    await competing.close();
    const good = await connect(port);
    assert.equal(JSON.parse((await once(good, 'message'))[0]).type, 'authenticated');
    good.close();
  }
);

test(
  'real stdio MCP initialization, tool discovery and paired browser roundtrip',
  { timeout: 15000 },
  async (t) => {
    const port = await freePort();
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [fileURLToPath(new URL('../dist/index.js', import.meta.url))],
      env: {
        ...process.env,
        EARTH_AGENT_WS_PORT: String(port),
        EARTH_AGENT_TOKEN: token,
        EARTH_AGENT_EXTENSION_ID: extensionId,
      },
      stderr: 'pipe',
    });
    const client = new Client({ name: 'integration-test', version: '1.0.0' });
    t.after(() => client.close());
    await client.connect(transport);
    const listed = await client.listTools();
    assert.equal(listed.tools.length, 17);
    const offline = await client.callTool({ name: 'read_gee_code', arguments: {} });
    assert.equal(offline.isError, true);
    const ws = await connect(port);
    await once(ws, 'message');
    t.after(() => ws.terminate());
    ws.on('message', (raw) => {
      const request = JSON.parse(raw);
      if (request.type === 'tool')
        ws.send(JSON.stringify({ id: request.id, success: true, result: { code: 'print(1)' } }));
    });
    const result = await client.callTool({ name: 'read_gee_code', arguments: {} });
    assert.notEqual(result.isError, true);
    assert.match(result.content[0].text, /print\(1\)/);
    const unknown = await client.callTool({ name: 'unknown_tool', arguments: {} });
    assert.equal(unknown.isError, true);
  }
);
