#!/usr/bin/env node

/**
 * Direct WebSocket client test for MCP Server
 * This tests if the MCP server can communicate with the Chrome extension
 */

import WebSocket from 'ws';

const WS_URL = 'ws://localhost:3847';
const REQUEST_TIMEOUT = 10000; // 10 seconds

let requestIdCounter = 0;

function generateRequestId() {
  return `test_${Date.now()}_${++requestIdCounter}`;
}

async function testMCPTool(ws, toolName, args) {
  return new Promise((resolve, reject) => {
    const requestId = generateRequestId();
    const timeout = setTimeout(() => {
      reject(new Error(`Request timeout: ${toolName}`));
    }, REQUEST_TIMEOUT);

    // Store the resolver to be called when response arrives
    ws.pendingRequests = ws.pendingRequests || {};
    ws.pendingRequests[requestId] = { resolve, reject, timeout };

    const message = JSON.stringify({
      id: requestId,
      type: 'tool',
      name: toolName,
      args: args
    });

    console.log(`[TEST] Sending: ${toolName}`, args);
    ws.send(message);
  });
}

function runTests() {
  console.log('[TEST] Connecting to MCP server at', WS_URL);

  const ws = new WebSocket(WS_URL);

  ws.on('open', () => {
    console.log('[TEST] Connected to MCP server');

    // Wait a moment for extension to be connected
    setTimeout(async () => {
      try {
        console.log('[TEST] Starting tool tests...\n');

        // Test 1: Get date_time (doesn't require GEE tab)
        console.log('[TEST] Test 1: date_time');
        const result1 = await testMCPTool(ws, 'date_time', {});
        console.log('[TEST] Result 1:', result1);
        console.log('');

        // Test 2: Get map position (requires GEE tab)
        console.log('[TEST] Test 2: gee_map_position');
        const result2 = await testMCPTool(ws, 'gee_map_position', {});
        console.log('[TEST] Result 2:', result2);
        console.log('');

        // Test 3: Read GEE code
        console.log('[TEST] Test 3: read_gee_code');
        const result3 = await testMCPTool(ws, 'read_gee_code', {});
        console.log('[TEST] Result 3:', result3);
        console.log('');

        console.log('[TEST] All tests completed successfully!');
        ws.close();
        process.exit(0);
      } catch (error) {
        console.error('[TEST] Test failed:', error.message);
        ws.close();
        process.exit(1);
      }
    }, 1000);
  });

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());

      if (!message.id) {
        console.log('[TEST] Received message without ID:', message);
        return;
      }

      const pending = ws.pendingRequests && ws.pendingRequests[message.id];
      if (pending) {
        clearTimeout(pending.timeout);
        delete ws.pendingRequests[message.id];

        if (message.success) {
          pending.resolve(message.result);
        } else {
          pending.reject(new Error(message.error || 'Unknown error'));
        }
      } else {
        console.log('[TEST] Received message for unknown request:', message.id);
      }
    } catch (error) {
      console.error('[TEST] Error parsing message:', error);
    }
  });

  ws.on('error', (error) => {
    console.error('[TEST] WebSocket error:', error.message);
    process.exit(1);
  });

  ws.on('close', () => {
    console.log('[TEST] Connection closed');
  });
}

// Run the tests
runTests();
