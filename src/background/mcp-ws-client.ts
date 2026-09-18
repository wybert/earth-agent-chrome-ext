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

import { MCPConnection } from './mcp-connection';

interface MCPToolRequest {
  id: string;
  type: 'tool';
  name: string;
  args: Record<string, unknown>;
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


const connection = new MCPConnection(handleMCPTool);
export const initMCPFromStorage = () => connection.init();
export const connectToMCPServer = () => connection.connect();
