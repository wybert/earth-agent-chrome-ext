/**
 * WebSocket Client for MCP Server Communication
 *
 * This module connects the Chrome extension to the local MCP server via WebSocket,
 * enabling external AI tools (Claude Code, Zed, Cursor) to invoke Earth Agent's tools.
 *
 * Architecture:
 * MCP Server (localhost:3847) <--WebSocket--> This Client <--> Extension Tools
 */

import { selectBestEarthEngineTab, ensureContentScript } from '../lib/utils';
import { getEditorContent, setEditorContent } from './editor-helpers';
import { shadowWorkspaceSingleton } from './shadow-workspace';

// Configuration
const WS_PORT = 3847;
const WS_URL = `ws://localhost:${WS_PORT}`;
const RECONNECT_INTERVAL = 5000; // 5 seconds
const MAX_RECONNECT_ATTEMPTS = 10;

// Storage key for MCP enabled setting
export const MCP_ENABLED_STORAGE_KEY = 'earth_agent_mcp_enabled';

// WebSocket state
let ws: WebSocket | null = null;
let reconnectAttempts = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let isConnecting = false;
let mcpEnabled = false; // Track if MCP is enabled

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
 * Get the best Earth Engine tab
 */
async function getEarthEngineTab(): Promise<chrome.tabs.Tab> {
  const tabs = await chrome.tabs.query({ url: 'https://code.earthengine.google.com/*' });
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
 * Execute a message in the content script
 */
async function executeInContentScript(tabId: number, message: Record<string, unknown>): Promise<unknown> {
  // Ensure content script is loaded
  const contentReady = await ensureContentScript(tabId);
  if (!contentReady.success) {
    throw new Error(contentReady.error || 'Content script not ready');
  }

  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
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
      // Use Open-Meteo geocoding API to get coordinates
      const geoResponse = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`
      );
      const geoData = await geoResponse.json();
      if (!geoData.results || geoData.results.length === 0) {
        throw new Error(`Location not found: ${location}`);
      }
      const { latitude, longitude, name: locationName, country } = geoData.results[0];

      // Get weather data
      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m`
      );
      const weatherData = await weatherResponse.json();
      const current = weatherData.current;

      return {
        location: `${locationName}, ${country}`,
        coordinates: { latitude, longitude },
        temperature: `${current.temperature_2m}°C`,
        humidity: `${current.relative_humidity_2m}%`,
        windSpeed: `${current.wind_speed_10m} km/h`,
        weatherCode: current.weather_code,
      };
    }

    case 'date_time': {
      const { timezone } = args as { timezone?: string };
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        timeZone: timezone || 'UTC',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      };
      return {
        datetime: now.toLocaleString('en-US', options),
        timezone: timezone || 'UTC',
        timestamp: now.toISOString(),
        unix: Math.floor(now.getTime() / 1000),
      };
    }

    case 'wait': {
      const { seconds } = args as { seconds: number };
      const waitTime = Math.max(0.5, Math.min(60, seconds)); // Clamp between 0.5 and 60
      await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
      return { waited: waitTime, message: `Waited ${waitTime} seconds` };
    }
  }

  // Tools that require GEE tab
  const tab = await getEarthEngineTab();
  const tabId = tab.id!;
  const scriptId = 'current_editor';

  switch (name) {
    case 'read_gee_code': {
      const result = await getEditorContent(tabId);
      if (!result.success || result.content === undefined) {
        throw new Error(result.error || 'Failed to read editor content');
      }
      return { code: result.content };
    }

    case 'edit_gee_code': {
      const { old_string, new_string } = args as { old_string: string; new_string: string };

      // Get current code from editor
      const result = await getEditorContent(tabId);
      if (!result.success || result.content === undefined) {
        throw new Error(result.error || 'Failed to read editor content');
      }
      const currentCode = result.content;

      // Check if old_string exists
      if (!currentCode.includes(old_string)) {
        throw new Error(`Could not find the text to replace. Make sure old_string exactly matches the code in the editor.`);
      }

      // Perform the replacement
      const newCode = currentCode.replace(old_string, new_string);

      // Sync to shadow workspace and write back to editor
      shadowWorkspaceSingleton.setFromEditor(tabId, scriptId, currentCode, 'sync before edit');
      shadowWorkspaceSingleton.commit(tabId, scriptId, newCode, 'MCP edit', 'agent');
      await setEditorContent(newCode, tabId);

      return { success: true, message: 'Code edited successfully' };
    }

    case 'write_gee_code': {
      const { code } = args as { code: string };
      shadowWorkspaceSingleton.setFromEditor(tabId, scriptId, code, 'MCP write');
      await setEditorContent(code, tabId);
      return { success: true, message: 'Code written successfully' };
    }

    case 'undo_gee_edit': {
      const state = shadowWorkspaceSingleton.undo(tabId, scriptId);
      if (state.head > 0) {
        await setEditorContent(state.content, tabId);
        return { success: true, message: 'Edit undone' };
      }
      return { success: false, message: 'Nothing to undo' };
    }

    case 'run_gee_code': {
      const response = await executeInContentScript(tabId, { type: 'RUN_CODE' });
      return response;
    }

    case 'gee_screenshot': {
      // Capture visible tab
      const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId!, { format: 'jpeg', quality: 80 });
      // Extract base64 data
      const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
      return { data: base64Data, mimeType: 'image/jpeg' };
    }

    case 'gee_snapshot': {
      const response = await executeInContentScript(tabId, { type: 'SNAPSHOT' });
      return response;
    }

    case 'gee_console': {
      const response = await executeInContentScript(tabId, { type: 'GET_CONSOLE_OUTPUT' });
      return response;
    }

    case 'gee_map_position': {
      const response = await executeInContentScript(tabId, { type: 'GET_MAP_POSITION' });
      return response;
    }

    case 'gee_inspector': {
      const response = await executeInContentScript(tabId, { type: 'GET_INSPECTOR_OUTPUT' });
      return response;
    }

    case 'clear_gee': {
      const response = await executeInContentScript(tabId, { type: 'RESET_MAP_CONSOLE' });
      return response;
    }

    case 'gee_docs': {
      const { query, type = 'datasets' } = args as { query: string; type?: string };
      // Import and use context7 tools
      const { resolveLibraryId, getDocumentation } = await import('../lib/tools/context7');

      // Resolve library ID for GEE
      const resolveResult = await resolveLibraryId('google-earth-engine');
      if (!resolveResult.success || !resolveResult.libraryId) {
        throw new Error('Could not resolve GEE documentation library');
      }

      const docs = await getDocumentation(resolveResult.libraryId, query);
      return { documentation: docs };
    }

    case 'click_element': {
      const { ref_id } = args as { ref_id: string };
      const response = await executeInContentScript(tabId, { type: 'CLICK_BY_REF_ID', refId: ref_id });
      return response;
    }

    case 'click_position': {
      const { x, y } = args as { x: number; y: number };
      const response = await executeInContentScript(tabId, { type: 'CLICK_AT_POSITION', x, y });
      return response;
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

  // Handle ping messages
  if (request.type === 'ping') {
    console.log('[MCP-WS] Received ping from MCP server');
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

      // Send identification message
      ws?.send(JSON.stringify({
        type: 'extension_connected',
        timestamp: Date.now(),
      }));

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
  const delay = RECONNECT_INTERVAL * Math.min(reconnectAttempts, 3); // Cap backoff at 3x

  console.log(`[MCP-WS] Scheduling reconnect in ${delay / 1000}s (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);

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
  statusListeners.forEach(listener => {
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
    mcpEnabled = result[MCP_ENABLED_STORAGE_KEY] === true;
    console.log(`[MCP-WS] Initialized from storage: enabled=${mcpEnabled}`);

    if (mcpEnabled) {
      connectToMCPServer();
    }
  } catch (error) {
    console.error('[MCP-WS] Failed to initialize from storage:', error);
  }
}
