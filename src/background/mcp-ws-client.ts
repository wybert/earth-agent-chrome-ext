/**
 * WebSocket Client for MCP Server Communication
 *
 * This module connects the Chrome extension to the local MCP server via WebSocket,
 * enabling external AI tools (Claude Code, Zed, Cursor) to invoke Earth Agent's tools.
 *
 * Architecture:
 * MCP Server (localhost:3847) <--WebSocket--> This Client <--> Extension Tools
 */

import { selectBestEarthEngineTab } from '../lib/utils';
import * as WeatherService from '../lib/tools/services/weather-service';
import * as TimeService from '../lib/tools/services/time-service';
import * as EditorService from '../lib/tools/services/editor-service';
import * as GeeService from '../lib/tools/services/gee-service';
import * as BrowserService from '../lib/tools/services/browser-service';
import * as DocsService from '../lib/tools/services/docs-service';

// Configuration
const WS_PORT = 3847;
const WS_URL = `ws://localhost:${WS_PORT}`;
const RECONNECT_INTERVAL = 1000; // 1 second - aggressive reconnection
const MAX_RECONNECT_ATTEMPTS = 30; // More attempts since we're faster
const KEEP_ALIVE_INTERVAL = 20000; // 20 seconds - less than Chrome's 30s timeout
const PING_TIMEOUT = 10000; // 10 seconds

// Storage key for MCP enabled setting
export const MCP_ENABLED_STORAGE_KEY = 'earth_agent_mcp_enabled';

// WebSocket state
let ws: WebSocket | null = null;
let reconnectAttempts = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let isConnecting = false;
let mcpEnabled = false; // Track if MCP is enabled

// Keep-alive state
let keepAliveTimer: ReturnType<typeof setInterval> | null = null;
let pingTimer: ReturnType<typeof setTimeout> | null = null;
let lastPongTime = Date.now();
let storageKeepAliveTimer: ReturnType<typeof setInterval> | null = null;

// Constants for keep-alive
const KEEP_ALIVE_ALARM_NAME = 'mcp-keep-alive';
const STORAGE_KEEP_ALIVE_INTERVAL = 15000; // 15 seconds - storage access keeps SW alive

/**
 * Request/Response types for MCP communication
 */
interface MCPToolRequest {
  id: string;
  type: 'tool';
  name: string;
  args: Record<string, unknown>;
}

interface MCPPingMessage {
  type: 'ping';
  timestamp: number;
}

type MCPRequest = MCPToolRequest | MCPPingMessage;

interface MCPResponse {
  id: string;
  success: boolean;
  result?: unknown;
  error?: string;
}

/**
 * Send response back to MCP server
 */
function sendResponse(response: MCPResponse): void {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(response));
  }
}

/**
 * Start keep-alive mechanism to prevent service worker termination
 * Uses multiple strategies:
 * 1. WebSocket pings (keep connection active)
 * 2. chrome.alarms (survives service worker restart)
 * 3. chrome.storage access (keeps service worker alive)
 */
function startKeepAlive(): void {
  // Stop any existing keep-alive
  stopKeepAlive();

  // Strategy 1: WebSocket pings
  keepAliveTimer = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      // Send a ping to keep the connection active
      ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
      console.log('[MCP-WS] Sent keep-alive ping');

      // Check if we received a pong recently
      const timeSinceLastPong = Date.now() - lastPongTime;
      if (timeSinceLastPong > PING_TIMEOUT * 2) {
        console.warn('[MCP-WS] No pong received recently, connection may be stale');
        // Trigger reconnection
        if (ws) {
          ws.close();
        }
      }
    }
  }, KEEP_ALIVE_INTERVAL);

  // Strategy 2: Storage keep-alive (accessing chrome.storage keeps SW alive)
  storageKeepAliveTimer = setInterval(() => {
    // Read from storage to keep service worker alive
    chrome.storage.local.get([MCP_ENABLED_STORAGE_KEY], () => {
      // Silent read - just to keep SW active
    });
  }, STORAGE_KEEP_ALIVE_INTERVAL);

  // Strategy 3: Set up chrome.alarms (persists across SW restarts)
  if (typeof chrome !== 'undefined' && chrome.alarms) {
    chrome.alarms.create(KEEP_ALIVE_ALARM_NAME, {
      periodInMinutes: 1, // Check every minute
    });

    // Set up alarm listener
    if (!chrome.alarms.onAlarm.hasListeners()) {
      chrome.alarms.onAlarm.addListener((alarm) => {
        if (alarm.name === KEEP_ALIVE_ALARM_NAME) {
          console.log('[MCP-WS] Keep-alive alarm triggered');
          // Ensure connection is still alive
          if (!ws || ws.readyState !== WebSocket.OPEN) {
            console.log('[MCP-WS] Connection lost, attempting to reconnect...');
            connectToMCPServer();
          }
        }
      });
    }
  }

  console.log('[MCP-WS] Started keep-alive mechanism (WebSocket + Storage + Alarms)');
}

/**
 * Stop keep-alive mechanism
 */
function stopKeepAlive(): void {
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
    keepAliveTimer = null;
    console.log('[MCP-WS] Stopped WebSocket keep-alive');
  }

  if (storageKeepAliveTimer) {
    clearInterval(storageKeepAliveTimer);
    storageKeepAliveTimer = null;
  }

  if (pingTimer) {
    clearTimeout(pingTimer);
    pingTimer = null;
  }

  // Clear the alarm (guard against chrome.alarms being undefined)
  if (typeof chrome !== 'undefined' && chrome.alarms) {
    chrome.alarms.clear(KEEP_ALIVE_ALARM_NAME);
  }
}

/**
 * Get the best Earth Engine tab
 */
async function getEarthEngineTab(): Promise<chrome.tabs.Tab> {
  const tabs = await chrome.tabs.query({ url: '*://code.earthengine.google.com/*' });
  if (tabs.length === 0) {
    throw new Error('No Google Earth Engine tab found. Please open code.earthengine.google.com');
  }
  const bestTab = selectBestEarthEngineTab(tabs);
  if (!bestTab) {
    throw new Error('Could not select an Earth Engine tab');
  }
  return bestTab;
}

/**
 * Handle tool request from MCP server
 */
async function handleMCPTool(request: MCPToolRequest): Promise<unknown> {
  const { name, args } = request;

  // Utility tools that don't require GEE tab
  switch (name) {
    case 'weather': {
      const { location } = args as { location: string };
      const result = await WeatherService.getWeather(location);
      if ('error' in result) {
        throw new Error(result.error);
      }
      return result;
    }

    case 'date_time': {
      const { timezone } = args as { timezone?: string };
      return TimeService.getCurrentTime(timezone);
    }
  }

  // Tools that require GEE tab
  const tab = await getEarthEngineTab();
  const tabId = tab.id!;
  const scriptId = 'current_editor';

  switch (name) {
    case 'wait': {
      // Send wait to content script to avoid service worker suspension
      const { seconds } = args as { seconds: number };
      const result = await new Promise<{ success: boolean; data?: any; error?: string }>(
        (resolve) => {
          chrome.tabs.sendMessage(
            tabId,
            { type: 'WAIT', payload: { seconds } },
            (response) => {
              if (chrome.runtime.lastError) {
                resolve({ success: false, error: chrome.runtime.lastError.message });
              } else {
                resolve(response || { success: false, error: 'No response from content script' });
              }
            }
          );
        }
      );
      if (!result.success) {
        throw new Error(result.error || 'Failed to wait');
      }
      return result.data;
    }
    case 'read_gee_code': {
      const result = await EditorService.readCode(tabId);
      if (!result.success || result.content === undefined) {
        throw new Error(result.error || 'Failed to read editor content');
      }
      return { code: result.content };
    }

    case 'edit_gee_code': {
      const { old_string, new_string } = args as { old_string: string; new_string: string };

      const result = await EditorService.editCode(tabId, old_string, new_string, false);
      if (!result.success) {
        throw new Error(result.error || 'Failed to edit code');
      }

      return {
        success: true,
        message: 'Code edited successfully',
        replacements: result.replacements,
      };
    }

    case 'write_gee_code': {
      const { code } = args as { code: string };
      const result = await EditorService.writeCode(tabId, code);
      if (!result.success) {
        throw new Error(result.error || 'Failed to write code');
      }
      return { success: true, message: 'Code written successfully', lineCount: result.lineCount };
    }

    case 'undo_gee_edit': {
      const result = await EditorService.undoEdit(tabId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to undo edit');
      }
      return { success: true, message: 'Edit undone' };
    }

    case 'run_gee_code': {
      const result = await GeeService.runCode(tabId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to run code');
      }
      return { success: true, message: 'Code execution started' };
    }

    case 'gee_screenshot': {
      // Use BrowserService for screenshot
      if (!tab.windowId) throw new Error('Tab has no window ID');
      const result = await BrowserService.captureScreenshot(tabId, tab.windowId);
      if (!result.success || !result.data?.screenshotDataUrl) {
        throw new Error(result.error || 'Failed to capture screenshot');
      }

      // Extract base64 (remove prefix)
      const base64Data = result.data.screenshotDataUrl.replace(/^data:image\/\w+;base64,/, '');
      return { data: base64Data, mimeType: 'image/jpeg' };
    }

    case 'gee_snapshot': {
      const result = await BrowserService.captureSnapshot(tabId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to capture snapshot');
      }
      return { snapshot: result.data?.snapshot };
    }

    case 'gee_console': {
      const result = await GeeService.getConsoleOutput(tabId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to get console output');
      }
      return result.data; // Return full data object (outputs, count)
    }

    case 'gee_map_position': {
      const result = await GeeService.getMapInfo(tabId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to get map info');
      }
      return result.data;
    }

    case 'gee_inspector': {
      const result = await GeeService.getInspectorOutput(tabId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to get inspector output');
      }
      return result.data;
    }

    case 'clear_gee': {
      const result = await GeeService.clearAll(tabId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to clear environment');
      }
      return { success: true, message: 'Environment cleared' };
    }

    case 'gee_docs': {
      const { query, type = 'datasets' } = args as { query: string; type?: 'datasets' | 'api' };

      // Map 'type' to valid source for DocsService
      let source: 'geeDatasets' | 'apiDocs' = 'geeDatasets';
      if (type === 'api') source = 'apiDocs';

      const result = await DocsService.getDocumentation(query, source);

      if (!result.success) {
        throw new Error(result.message || 'Failed to find documentation');
      }

      return { documentation: result.documentation };
    }

    case 'click_element': {
      const { ref_id } = args as { ref_id: string };
      const result = await BrowserService.clickByRefId(tabId, ref_id);
      if (!result.success) {
        throw new Error(result.error || 'Failed to click element');
      }
      return { success: true, message: 'Element clicked' };
    }

    case 'click_position': {
      const { x, y } = args as { x: number; y: number };
      const result = await BrowserService.clickAtPosition(tabId, x, y);
      if (!result.success) {
        throw new Error(result.error || 'Failed to click position');
      }
      return { success: true, message: 'Position clicked' };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

/**
 * Handle incoming WebSocket message
 */
async function handleMessage(data: string): Promise<void> {
  let request: MCPRequest;

  try {
    request = JSON.parse(data);
  } catch (error) {
    console.error('[MCP-WS] Failed to parse message:', error);
    return;
  }

  // Handle ping/pong messages
  if (request.type === 'ping') {
    console.log('[MCP-WS] Received ping from MCP server');
    lastPongTime = Date.now(); // Update last pong time
    return;
  }

  // Must have an ID for tool/chat requests
  if (!('id' in request)) {
    console.error('[MCP-WS] Message missing ID');
    return;
  }

  console.log(`[MCP-WS] Handling tool request: ${request.name}`);

  try {
    const result = await handleMCPTool(request);

    sendResponse({
      id: request.id,
      success: true,
      result,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[MCP-WS] Error handling request:`, errorMessage);

    sendResponse({
      id: request.id,
      success: false,
      error: errorMessage,
    });
  }
}

/**
 * Connect to MCP server WebSocket (only if MCP is enabled)
 */
export function connectToMCPServer(): void {
  if (!mcpEnabled) {
    console.log('[MCP-WS] MCP is disabled, not connecting');
    return;
  }

  if (isConnecting || (ws && ws.readyState === WebSocket.OPEN)) {
    return;
  }

  isConnecting = true;

  try {
    console.log(`[MCP-WS] Connecting to ${WS_URL}...`);
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log('[MCP-WS] Connected to MCP server');
      isConnecting = false;
      reconnectAttempts = 0;
      lastPongTime = Date.now(); // Reset pong time

      // Send identification message
      ws?.send(
        JSON.stringify({
          type: 'extension_connected',
          timestamp: Date.now(),
        })
      );

      // Start keep-alive mechanism
      startKeepAlive();

      // Notify listeners of connection status change
      notifyStatusChange();
    };

    ws.onmessage = (event) => {
      handleMessage(event.data);
    };

    ws.onclose = () => {
      console.log('[MCP-WS] Disconnected from MCP server');
      isConnecting = false;
      ws = null;

      // Stop keep-alive mechanism
      stopKeepAlive();

      notifyStatusChange();

      // Only reconnect if MCP is still enabled
      if (mcpEnabled) {
        scheduleReconnect();
      }
    };

    ws.onerror = () => {
      // WebSocket errors are usually followed by close, so we just log
      console.log('[MCP-WS] WebSocket error (MCP server may not be running)');
      isConnecting = false;
    };
  } catch (error) {
    console.error('[MCP-WS] Failed to create WebSocket:', error);
    isConnecting = false;
    if (mcpEnabled) {
      scheduleReconnect();
    }
  }
}

/**
 * Schedule reconnection attempt
 */
function scheduleReconnect(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
  }

  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.log('[MCP-WS] Max reconnect attempts reached, stopping');
    return;
  }

  reconnectAttempts++;
  // Aggressive reconnection: start at 1s, cap at 5s (instead of 15s)
  const delay = RECONNECT_INTERVAL * Math.min(reconnectAttempts, 5);

  // Only log every 5th attempt to reduce spam
  if (reconnectAttempts <= 3 || reconnectAttempts % 5 === 0) {
    console.log(
      `[MCP-WS] Scheduling reconnect in ${delay / 1000}s (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`
    );
  }

  reconnectTimer = setTimeout(() => {
    connectToMCPServer();
  }, delay);
}

/**
 * Disconnect from MCP server
 */
export function disconnectFromMCPServer(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  // Stop keep-alive mechanism
  stopKeepAlive();

  if (ws) {
    ws.close();
    ws = null;
  }

  reconnectAttempts = MAX_RECONNECT_ATTEMPTS; // Prevent auto-reconnect
}

/**
 * Check if connected to MCP server
 */
export function isMCPConnected(): boolean {
  return ws !== null && ws.readyState === WebSocket.OPEN;
}

/**
 * Reset reconnection attempts (call this when user wants to reconnect)
 */
export function resetMCPConnection(): void {
  reconnectAttempts = 0;
  disconnectFromMCPServer();
  reconnectAttempts = 0; // Reset after disconnect sets it to max
  connectToMCPServer();
}

// Status change listeners
type StatusListener = (status: MCPStatus) => void;
const statusListeners: StatusListener[] = [];

export interface MCPStatus {
  enabled: boolean;
  connected: boolean;
  connecting: boolean;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
}

/**
 * Get current MCP connection status
 */
export function getMCPStatus(): MCPStatus {
  return {
    enabled: mcpEnabled,
    connected: ws !== null && ws.readyState === WebSocket.OPEN,
    connecting: isConnecting,
    reconnectAttempts,
    maxReconnectAttempts: MAX_RECONNECT_ATTEMPTS,
  };
}

/**
 * Notify all listeners of status change
 */
function notifyStatusChange(): void {
  const status = getMCPStatus();
  statusListeners.forEach((listener) => {
    try {
      listener(status);
    } catch (e) {
      console.error('[MCP-WS] Status listener error:', e);
    }
  });
}

/**
 * Add a status change listener
 */
export function addMCPStatusListener(listener: StatusListener): () => void {
  statusListeners.push(listener);
  // Return unsubscribe function
  return () => {
    const index = statusListeners.indexOf(listener);
    if (index > -1) {
      statusListeners.splice(index, 1);
    }
  };
}

/**
 * Enable MCP server connection
 */
export async function enableMCP(): Promise<void> {
  mcpEnabled = true;
  await chrome.storage.local.set({ [MCP_ENABLED_STORAGE_KEY]: true });
  console.log('[MCP-WS] MCP enabled');
  notifyStatusChange();
  connectToMCPServer();
}

/**
 * Disable MCP server connection
 */
export async function disableMCP(): Promise<void> {
  mcpEnabled = false;
  await chrome.storage.local.set({ [MCP_ENABLED_STORAGE_KEY]: false });
  console.log('[MCP-WS] MCP disabled');
  disconnectFromMCPServer();
  reconnectAttempts = 0; // Reset reconnect attempts
  notifyStatusChange();
}

/**
 * Initialize MCP connection state from storage
 * Call this on extension startup
 */
export async function initMCPFromStorage(): Promise<void> {
  try {
    const result = await chrome.storage.local.get([MCP_ENABLED_STORAGE_KEY]);
    // Default to true if not set
    mcpEnabled = result[MCP_ENABLED_STORAGE_KEY] !== false;
    console.log(`[MCP-WS] Initialized from storage: enabled=${mcpEnabled}`);

    if (mcpEnabled) {
      connectToMCPServer();
    }

    // Listen for storage changes to toggle MCP at runtime
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local' && changes[MCP_ENABLED_STORAGE_KEY]) {
        const newValue = changes[MCP_ENABLED_STORAGE_KEY].newValue;
        console.log(`[MCP-WS] Storage changed: mcpEnabled from ${mcpEnabled} to ${newValue}`);

        mcpEnabled = newValue === true;

        if (mcpEnabled) {
          connectToMCPServer();
        } else {
          disconnectFromMCPServer();
          notifyStatusChange();
        }
      }
    });
  } catch (error) {
    console.error('[MCP-WS] Failed to initialize from storage:', error);
  }
}
