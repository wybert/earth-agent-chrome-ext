/**
 * AI SDK Tool Definitions for Earth Agent
 *
 * This file contains all tool definitions used by the AI agent.
 * Tools are organized by category: demo, dataset, earth-engine, browser.
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getDocumentation } from './context7';
import { snapshot as browserSnapshot, SnapshotResponse } from './browser/snapshot';
import {
  selectBestEarthEngineTab,
  validateChromeAPIs
} from '../utils';
import * as WeatherService from './services/weather-service';
import * as TimeService from './services/time-service';
import * as EditorService from './services/editor-service';
import * as GeeService from './services/gee-service';
import * as BrowserService from './services/browser-service';
import * as DocsService from './services/docs-service';
import { shadowWorkspaceSingleton } from '@/background/shadow-workspace';
import { getEditorContent, setEditorContent } from '@/background/editor-helpers';
import { Provider } from '@/types/extension';

// Tool event callback type (used by chat-handler)
export type ToolEventCallback = (event: {
  type: 'tool_start' | 'tool_finish';
  toolName?: string;
  args?: any;
  result?: any;
  timestamp: number;
}) => void;

// Options for createAITools
export interface CreateAIToolsOptions {
  provider?: Provider;
  customProviderSupportsImages?: boolean; // For custom providers: whether they support multimodal
}

// Providers that do NOT support multimodal (image) inputs
const NON_MULTIMODAL_PROVIDERS: string[] = ['z-ai'];

/**
 * Helper to get the active Earth Engine tab ID
 */
async function getActiveEarthEngineTabId(): Promise<number | null> {
  if (typeof chrome === 'undefined' || !chrome.tabs) return null;
  const tabs = await new Promise<chrome.tabs.Tab[]>((resolve) => {
    chrome.tabs.query({ url: "*://code.earthengine.google.com/*" }, (tabs) => resolve(tabs || []));
  });
  const bestTab = selectBestEarthEngineTab(tabs);
  return bestTab?.id || null;
}

/**
 * Create all tools with the given event callback
 * This factory function allows tools to emit events for tracking
 * @param onToolEvent - Callback for tool lifecycle events
 * @param options - Options including provider for capability detection
 */
export function createAITools(onToolEvent?: ToolEventCallback, options?: CreateAIToolsOptions) {
  // Determine if the current provider supports multimodal inputs
  const supportsMultimodal = (() => {
    const provider = options?.provider || '';
    // Built-in non-multimodal providers
    if (NON_MULTIMODAL_PROVIDERS.includes(provider)) {
      return false;
    }
    // Custom providers: check the supportsImages flag
    if (provider.startsWith('custom:')) {
      return options?.customProviderSupportsImages ?? false;
    }
    // Built-in multimodal providers (openai, anthropic, google)
    return true;
  })();
  const currentProvider = options?.provider || 'unknown';


  const weatherTool = tool({
    description: 'Get the current weather for a location (uses Open-Meteo, no API key required)',
    inputSchema: z.object({
      location: z.string().describe('City or place name to get the weather for'),
    }),
    execute: async ({ location }) => {
      const toolName = 'weather';
      onToolEvent?.({ type: 'tool_start', toolName, args: { location }, timestamp: Date.now() });

      const result = await WeatherService.getWeather(location);
      if ('error' in result) {
        return { error: result.error };
      }
      return result;
    },
  });

  const dateTimeTool = tool({
    description: 'Get the current date and time, optionally for a specific IANA time zone. Returns the current time formatted in the requested timezone.',
    inputSchema: z.object({
      timeZone: z.string().optional().describe('IANA time zone, e.g., "Asia/Shanghai" for Beijing, "America/New_York", or "UTC". If not specified, uses system timezone.'),
    }),
    execute: async ({ timeZone }) => {
      const toolName = 'dateTime';
      onToolEvent?.({ type: 'tool_start', toolName, args: { timeZone }, timestamp: Date.now() });

      return TimeService.getCurrentTime(timeZone);
    },
  });

  // Wait tool for handling long-running operations
  const waitTool = tool({
    description: `Wait for a specified number of seconds. Use this to:
- Wait for Earth Engine code execution to complete
- Wait for map layers to finish loading
- Give time for async operations to complete

After waiting, use getConsoleOutput or screenshot to check if execution is done.
- Console shows "Computing" or spinning gear icon = still running
- Map shows gray progress bar in Layers button = still loading`,
    inputSchema: z.object({
      seconds: z.number().min(0.5).max(60)
        .describe('Number of seconds to wait (0.5 to 60)'),
    }),
    execute: async ({ seconds }) => {
      onToolEvent?.({
        type: 'tool_start',
        toolName: 'wait',
        args: { seconds },
        timestamp: Date.now()
      });

      const result = await TimeService.waitSeconds(seconds);

      return {
        success: true,
        message: result.message,
        suggestion: 'Use getConsoleOutput or screenshot to check execution status'
      };
    },
  });

  const getActiveEarthEngineTabId = async (): Promise<number | null> => {
    if (typeof chrome === 'undefined' || !chrome.tabs) return null;
    const tabs = await new Promise<chrome.tabs.Tab[]>((resolve) =>
      chrome.tabs.query({ url: '*://code.earthengine.google.com/*' }, (t) => resolve(t || []))
    );
    const selected = selectBestEarthEngineTab(tabs);
    return selected?.id ?? null;
  };

  const ensureShadowSyncedFromEditor = async (tabId: number, scriptId: string): Promise<boolean> => {
    const state = shadowWorkspaceSingleton.getOrCreate(tabId, scriptId);
    // If we already have content, trust the existing sync mechanism.
    if (state.content && state.content.trim().length > 0) return true;

    try {
      const response: any = await new Promise((resolve) => {
        const timeout = setTimeout(() => resolve({ success: false, error: 'GET_SCRIPT timeout' }), 1500);
        chrome.tabs.sendMessage(tabId, { type: 'GET_SCRIPT' }, (res) => {
          clearTimeout(timeout);
          if (chrome.runtime.lastError) resolve({ success: false, error: chrome.runtime.lastError.message });
          else resolve(res || { success: false, error: 'No response from content script' });
        });
      });
      if (!response?.success || typeof response.content !== 'string') return false;

      const next = shadowWorkspaceSingleton.setFromEditor(tabId, scriptId, response.content, 'auto refresh from editor');
      shadowWorkspaceSingleton.markSynced(tabId, next.scriptId);
      return true;
    } catch {
      return false;
    }
  };

  // ============================================================================
  // SIMPLIFIED CODE EDITING TOOLS (Claude Code-style)
  // These 3 tools wrap the shadow workspace internally, hiding complexity from LLM
  // ============================================================================

  /**
   * readCode - Read current code from the Earth Engine editor
   * Internally syncs from editor and returns content
   */
  const readCodeTool = tool({
    description: `Read the current code from the Google Earth Engine editor.

Use this tool FIRST before making any edits to see the current state of the code.
Returns the full code content with line count.`,
    inputSchema: z.object({}),
    execute: async () => {
      // Send tool_start event
      onToolEvent?.({ type: 'tool_start', toolName: 'readCode', args: {}, timestamp: Date.now() });

      const tabId = await getActiveEarthEngineTabId();
      if (!tabId) return { success: false, error: 'No Earth Engine tab found. Please open Google Earth Engine Code Editor.' };

      return await EditorService.readCode(tabId);
    },
  });

  /**
   * editCode - Edit code using old_string/new_string pattern (Claude Code-style)
   * Internally: sync from editor → apply edit → generate diff → sync to editor
   */
  const editCodeTool = tool({
    description: `Edit code by finding old_string and REPLACING it with new_string.

HOW IT WORKS: old_string is completely REPLACED by new_string.
The new_string should contain the FINAL result you want, NOT a duplicate.

RULES:
1. old_string must match EXACTLY (including whitespace)
2. old_string must be UNIQUE in the code
3. new_string is what you want the code to become

EXAMPLE - Add comment at top of "print('hello')":
  old_string: "print('hello')"
  new_string: "// Comment\\nprint('hello')"
  Result: "// Comment\\nprint('hello')"

EXAMPLE - Add line after existing code:
  old_string: "var x = 1;"
  new_string: "var x = 1;\\nvar y = 2;"

EXAMPLE - Modify code:
  old_string: "Map.addLayer(img);"
  new_string: "Map.addLayer(img, {max: 0.3}, 'Layer');"

EXAMPLE - Clear ALL code (start fresh):
  1. First use readCode() to get the entire current content
  2. Then: old_string: <entire content from readCode>
          new_string: ""
  This replaces everything with empty string, clearing the editor.

WRONG - Don't duplicate:
  old_string: "print('hello')"
  new_string: "print('hello')// Comment\\nprint('hello')"  ← WRONG! Creates duplicate`,
    inputSchema: z.object({
      old_string: z.string().describe('The exact text to find. Will be REPLACED by new_string.'),
      new_string: z.string().describe('The replacement text. This is the FINAL result, not an addition.'),
      replace_all: z.boolean().optional().describe('If true, replace ALL occurrences. Default: false'),
    }),
    execute: async ({ old_string, new_string, replace_all }) => {
      // Send tool_start event
      onToolEvent?.({ type: 'tool_start', toolName: 'editCode', args: { old_string: old_string.substring(0, 50) + '...', new_string: new_string.substring(0, 50) + '...' }, timestamp: Date.now() });

      const tabId = await getActiveEarthEngineTabId();
      if (!tabId) return { success: false, error: 'No Earth Engine tab found. Please open Google Earth Engine Code Editor.' };

      const scriptId = 'current_editor';

      // Step 1: Sync from editor to get latest content (using MAIN world)
      const fetchResponse = await getEditorContent(tabId);

      if (!fetchResponse.success || fetchResponse.content === undefined) {
        return { success: false, error: `Failed to read code from editor: ${fetchResponse?.error || 'Unknown error'}. Make sure the Earth Engine Code Editor is open.` };
      }

      // Update shadow with current editor content
      const syncedState = shadowWorkspaceSingleton.setFromEditor(tabId, scriptId, fetchResponse.content, 'pre-edit sync');
      shadowWorkspaceSingleton.markSynced(tabId, syncedState.scriptId);

      // Step 2: Apply the edit to shadow
      const editResult = shadowWorkspaceSingleton.edit(
        tabId,
        scriptId,
        old_string,
        new_string,
        replace_all ?? false,
        'editCode'
      );

      if (!editResult.success) {
        if (editResult.error === 'not_found') {
          return {
            success: false,
            error: 'old_string not found in the code',
            suggestion: 'Use readCode to see the current code and copy the exact text you want to replace.',
            currentCode: syncedState.content.length > 2000
              ? syncedState.content.substring(0, 2000) + '\n... (truncated)'
              : syncedState.content
          };
        }
        if (editResult.error === 'not_unique') {
          return {
            success: false,
            error: `old_string appears ${editResult.count} times in the code`,
            count: editResult.count,
            suggestion: 'Include more surrounding context in old_string to make it unique, or set replace_all: true'
          };
        }
        if (editResult.error === 'no_change') {
          return {
            success: false,
            error: 'old_string and new_string are identical - no change needed'
          };
        }
        return { success: false, error: editResult.error };
      }

      // Step 3: Generate diff for response
      const diff = shadowWorkspaceSingleton.diffSinceSynced(tabId, scriptId);

      // Step 4: Sync to editor immediately (using MAIN world)
      const newContent = editResult.state?.content || '';
      const syncResult = await setEditorContent(newContent, tabId);

      if (!syncResult.success) {
        // Rollback shadow
        shadowWorkspaceSingleton.undo(tabId, scriptId);
        return {
          success: false,
          error: `Edit was prepared but failed to apply to editor: ${syncResult.error}`,
          suggestion: 'The editor may not be ready. Try again.'
        };
      }

      // Mark as synced
      shadowWorkspaceSingleton.markSynced(tabId, scriptId);

      return {
        success: true,
        replacements: editResult.count,
        diff: {
          summary: {
            added: diff.summary.added,
            removed: diff.summary.removed,
            hunks: diff.hunks.length
          },
          hunks: diff.hunks  // Full hunks for UI rendering
        },
        message: `Successfully edited code: +${diff.summary.added} -${diff.summary.removed} lines`,
        hint: 'Use earthEngineRunCode to execute the updated code'
      };
    },
  });

  /**
   * writeCode - Overwrite entire editor content (Claude Code Write-style)
   * Use when starting fresh or when editor is empty
   */
  const writeCodeTool = tool({
    description: `Overwrite the entire editor content with new code.

Use this tool when:
- Starting fresh with completely new code
- The editor is empty and you need to write initial code
- You want to replace ALL code (not just modify parts)

For partial edits (modifying specific lines), use editCode instead.`,
    inputSchema: z.object({
      content: z.string().describe('The complete code to write to the editor. This will REPLACE all existing code.'),
    }),
    execute: async ({ content }) => {
      // Send tool_start event
      onToolEvent?.({ type: 'tool_start', toolName: 'writeCode', args: { contentLength: content.length }, timestamp: Date.now() });

      const tabId = await getActiveEarthEngineTabId();
      if (!tabId) return { success: false, error: 'No Earth Engine tab found. Please open Google Earth Engine Code Editor.' };

      const scriptId = 'current_editor';

      // Get current content for diff calculation
      const fetchResponse = await getEditorContent(tabId);
      const previousContent = fetchResponse.success ? fetchResponse.content || '' : '';
      const previousLineCount = previousContent.split('\n').length;

      // Set the new content in shadow workspace
      const state = shadowWorkspaceSingleton.setFromEditor(tabId, scriptId, content, 'writeCode');

      // Sync to editor (using MAIN world)
      const syncResult = await setEditorContent(content, tabId);

      if (!syncResult.success) {
        return {
          success: false,
          error: `Failed to write to editor: ${syncResult.error}`,
          suggestion: 'The editor may not be ready. Try again.'
        };
      }

      // Mark as synced
      shadowWorkspaceSingleton.markSynced(tabId, scriptId);

      const newLineCount = content.split('\n').length;

      return {
        success: true,
        lineCount: newLineCount,
        previousLineCount: previousLineCount,
        message: `Wrote ${newLineCount} lines to editor (replaced ${previousLineCount} lines)`,
        hint: 'Use runCurrentCode to execute the code'
      };
    },
  });

  /**
   * undoEdit - Undo the last code edit
   * Reverts to previous version and syncs to editor
   */
  const undoEditTool = tool({
    description: 'Undo the last code edit. Reverts the code to the previous version.',
    inputSchema: z.object({}),
    execute: async () => {
      // Send tool_start event
      onToolEvent?.({ type: 'tool_start', toolName: 'undoEdit', args: {}, timestamp: Date.now() });

      const tabId = await getActiveEarthEngineTabId();
      if (!tabId) return { success: false, error: 'No Earth Engine tab found. Please open Google Earth Engine Code Editor.' };

      const scriptId = 'current_editor';
      const beforeState = shadowWorkspaceSingleton.getOrCreate(tabId, scriptId);

      if (beforeState.head <= 0) {
        return { success: false, error: 'Nothing to undo - already at initial state' };
      }

      // Undo in shadow
      const afterState = shadowWorkspaceSingleton.undo(tabId, scriptId);

      // Sync to editor (using MAIN world)
      const syncResult = await setEditorContent(afterState.content, tabId);

      if (!syncResult.success) {
        // Redo to restore state
        shadowWorkspaceSingleton.redo(tabId, scriptId);
        return { success: false, error: `Undo prepared but failed to apply to editor: ${syncResult.error}` };
      }

      shadowWorkspaceSingleton.markSynced(tabId, scriptId);

      return {
        success: true,
        message: 'Undo successful - reverted to previous version',
        version: afterState.version,
        lineCount: afterState.content.split('\n').length
      };
    },
  });

  /**
   * insertAtLine - Insert text at a specific line number
   * Simpler than editCode when you know the exact line number
   */
  const insertAtLineTool = tool({
    description: `Insert text at a specific line number. Use this when you know WHERE to insert but don't need to match existing text.

PARAMETERS:
- line: Line number to insert BEFORE (1-based). Use 1 or 0 to insert at the very beginning.
- text: The text to insert (can be multiple lines with \\n). Do NOT add trailing \\n unless you want an empty line.

EXAMPLES:
- Insert comment at the very top (before line 1):
  line: 1, text: "// This is a comment"

- Insert after line 5 (before line 6):
  line: 6, text: "var newVar = 123;"

- Insert with an empty line after it:
  line: 1, text: "// Section header\\n"

- Append at the end (use a large line number):
  line: 9999, text: "// End of file"

WHEN TO USE:
- Use insertAtLine when you want to ADD new code at a specific position
- Use editCode when you want to MODIFY or REPLACE existing code

After inserting, the code is automatically applied to the editor.`,
    inputSchema: z.object({
      line: z.number().int().describe('Line number to insert BEFORE (1-based). Use 1 to insert at the beginning.'),
      text: z.string().describe('The text to insert. Use \\n for multiple lines.'),
    }),
    execute: async ({ line, text }) => {
      // Send tool_start event
      onToolEvent?.({ type: 'tool_start', toolName: 'insertAtLine', args: { line, text: text.substring(0, 50) + '...' }, timestamp: Date.now() });

      const tabId = await getActiveEarthEngineTabId();
      if (!tabId) return { success: false, error: 'No Earth Engine tab found. Please open Google Earth Engine Code Editor.' };

      const scriptId = 'current_editor';

      // Step 1: Sync from editor to get latest content (using MAIN world)
      const fetchResponse = await getEditorContent(tabId);

      if (!fetchResponse.success || fetchResponse.content === undefined) {
        return { success: false, error: `Failed to read code from editor: ${fetchResponse?.error || 'Unknown error'}. Make sure the Earth Engine Code Editor is open.` };
      }

      // Update shadow with current editor content
      const syncedState = shadowWorkspaceSingleton.setFromEditor(tabId, scriptId, fetchResponse.content, 'pre-insert sync');
      shadowWorkspaceSingleton.markSynced(tabId, syncedState.scriptId);

      // Step 2: Insert at line
      const insertResult = shadowWorkspaceSingleton.insertAtLine(
        tabId,
        scriptId,
        line,
        text,
        `insert at line ${line}`
      );

      if (!insertResult.success) {
        return { success: false, error: 'Failed to insert text' };
      }

      // Step 3: Generate diff for response
      const diff = shadowWorkspaceSingleton.diffSinceSynced(tabId, scriptId);

      // Step 4: Sync to editor immediately (using MAIN world)
      const newContent = insertResult.state?.content || '';
      const syncResult = await setEditorContent(newContent, tabId);

      if (!syncResult.success) {
        // Rollback shadow
        shadowWorkspaceSingleton.undo(tabId, scriptId);
        return {
          success: false,
          error: `Insert was prepared but failed to apply to editor: ${syncResult.error}`,
          suggestion: 'The editor may not be ready. Try again.'
        };
      }

      // Mark as synced
      shadowWorkspaceSingleton.markSynced(tabId, scriptId);

      return {
        success: true,
        line: line,
        insertedText: text,
        lineCount: insertResult.lineCount,
        diff: {
          summary: {
            added: diff.summary.added,
            removed: diff.summary.removed,
            hunks: diff.hunks.length
          },
          hunks: diff.hunks
        },
        message: `Inserted text at line ${line}: +${diff.summary.added} lines`
      };
    },
  });

  // ============================================================================
  // LEGACY SHADOW TOOLS (kept for internal use, not exposed to LLM)
  // ============================================================================

  const shadowGetTool = tool({
    description: 'Read the agent shadow copy of the current Earth Engine script.',
    inputSchema: z.object({
      scriptId: z.string().optional().describe('Script identifier; defaults to current_editor'),
    }),
    execute: async ({ scriptId }) => {
      const tabId = await getActiveEarthEngineTabId();
      if (!tabId) return { success: false, error: 'No Earth Engine tab found' };
      const resolvedScriptId = scriptId || 'current_editor';
      await ensureShadowSyncedFromEditor(tabId, resolvedScriptId);
      const state = shadowWorkspaceSingleton.getOrCreate(tabId, resolvedScriptId);
      return {
        success: true,
        tabId,
        scriptId: state.scriptId,
        version: state.version,
        lastSyncedVersion: state.lastSyncedVersion,
        content: state.content,
      };
    },
  });

  const shadowSearchTool = tool({
    description: 'Search within the agent shadow script and return match locations.',
    inputSchema: z.object({
      query: z.string().describe('Substring to search for'),
      maxResults: z.number().int().min(1).max(100).optional().describe('Max matches to return'),
      scriptId: z.string().optional(),
    }),
    execute: async ({ query, maxResults, scriptId }) => {
      const tabId = await getActiveEarthEngineTabId();
      if (!tabId) return { success: false, error: 'No Earth Engine tab found' };
      const resolvedScriptId = scriptId || 'current_editor';
      await ensureShadowSyncedFromEditor(tabId, resolvedScriptId);
      const matches = shadowWorkspaceSingleton.search(tabId, resolvedScriptId, query, maxResults || 20);
      return { success: true, matches };
    },
  });

  const shadowPatchTool = tool({
    description: 'Apply a range-based patch to the agent shadow script (line/col) without directly modifying the editor.',
    inputSchema: z.object({
      scriptId: z.string().optional(),
      startLine: z.number().int().min(1),
      startCol: z.number().int().min(1),
      endLine: z.number().int().min(1),
      endCol: z.number().int().min(1),
      replacement: z.string(),
      message: z.string().optional().describe('Commit message for history'),
    }),
    execute: async ({ scriptId, startLine, startCol, endLine, endCol, replacement, message }) => {
      const tabId = await getActiveEarthEngineTabId();
      if (!tabId) return { success: false, error: 'No Earth Engine tab found' };
      const resolvedScriptId = scriptId || 'current_editor';
      await ensureShadowSyncedFromEditor(tabId, resolvedScriptId);
      const next = shadowWorkspaceSingleton.applyRangePatch(
        tabId,
        resolvedScriptId,
        { start: { line: startLine, col: startCol }, end: { line: endLine, col: endCol } },
        replacement,
        message || 'shadow patch'
      );
      return { success: true, version: next.version };
    },
  });

  const shadowReplaceAllTool = tool({
    description: 'Replace all occurrences of a string within the agent shadow script.',
    inputSchema: z.object({
      scriptId: z.string().optional(),
      query: z.string().describe('Substring to replace (non-empty)'),
      replacement: z.string().describe('Replacement text'),
      message: z.string().optional().describe('Commit message for history'),
    }),
    execute: async ({ scriptId, query, replacement, message }) => {
      const tabId = await getActiveEarthEngineTabId();
      if (!tabId) return { success: false, error: 'No Earth Engine tab found' };
      const resolvedScriptId = scriptId || 'current_editor';
      await ensureShadowSyncedFromEditor(tabId, resolvedScriptId);
      const next = shadowWorkspaceSingleton.replaceAll(
        tabId,
        resolvedScriptId,
        query,
        replacement,
        message || 'shadow replace all'
      );
      return { success: true, version: next.version };
    },
  });

  const shadowPatchByMatchIndexTool = tool({
    description: 'Replace only the Nth occurrence (1-based) of a string within the agent shadow script.',
    inputSchema: z.object({
      scriptId: z.string().optional(),
      query: z.string().describe('Substring to match (non-empty)'),
      matchIndex: z.number().int().min(1).describe('Which match to replace (1-based)'),
      replacement: z.string().describe('Replacement text'),
      message: z.string().optional().describe('Commit message for history'),
    }),
    execute: async ({ scriptId, query, matchIndex, replacement, message }) => {
      const tabId = await getActiveEarthEngineTabId();
      if (!tabId) return { success: false, error: 'No Earth Engine tab found' };
      const resolvedScriptId = scriptId || 'current_editor';
      await ensureShadowSyncedFromEditor(tabId, resolvedScriptId);

      const before = shadowWorkspaceSingleton.getOrCreate(tabId, resolvedScriptId).content;
      const next = shadowWorkspaceSingleton.patchByMatchIndex(
        tabId,
        resolvedScriptId,
        query,
        matchIndex,
        replacement,
        message || `shadow patch match ${matchIndex}`
      );
      const after = next.content;
      const changed = before !== after;
      return { success: true, changed, version: next.version };
    },
  });

  const shadowEditTool = tool({
    description: `Edit code by replacing a unique text snippet with new text. This is the PREFERRED way to edit code.

IMPORTANT RULES:
1. The old_string must be UNIQUE in the file (appears exactly once) unless replace_all is true
2. Include enough surrounding context in old_string to make it unique
3. The old_string must match EXACTLY (including whitespace and indentation)

WORKFLOW:
1. First use shadowGet or shadowSyncFromEditor to see the current code
2. Find the exact text you want to change
3. Use shadowEdit with old_string containing enough context to be unique
4. Use shadowDiffSinceSynced to review changes
5. Use shadowSyncToEditor to apply changes to the editor

EXAMPLE - Adding a new line after existing code:
old_string: "var image = ee.Image('LANDSAT/LC08/C02/T1_TOA');"
new_string: "var image = ee.Image('LANDSAT/LC08/C02/T1_TOA');\\nvar ndvi = image.normalizedDifference(['B5', 'B4']);"

EXAMPLE - Modifying existing code:
old_string: "Map.addLayer(image, {}, 'Original');"
new_string: "Map.addLayer(image, {bands: ['B4', 'B3', 'B2'], max: 0.3}, 'True Color');"`,
    inputSchema: z.object({
      old_string: z.string().describe('The exact text to find and replace. Must be unique in the file unless replace_all is true. Include surrounding context if needed.'),
      new_string: z.string().describe('The replacement text. Can be empty to delete the old_string.'),
      replace_all: z.boolean().optional().describe('If true, replace ALL occurrences. Default is false (requires unique match).'),
      scriptId: z.string().optional().describe('Script ID, defaults to current_editor'),
    }),
    execute: async ({ old_string, new_string, replace_all, scriptId }) => {
      const tabId = await getActiveEarthEngineTabId();
      if (!tabId) return { success: false, error: 'No Earth Engine tab found' };

      const resolvedScriptId = scriptId || 'current_editor';
      await ensureShadowSyncedFromEditor(tabId, resolvedScriptId);

      const result = shadowWorkspaceSingleton.edit(
        tabId,
        resolvedScriptId,
        old_string,
        new_string,
        replace_all ?? false,
        'shadowEdit'
      );

      if (!result.success) {
        if (result.error === 'not_found') {
          return {
            success: false,
            error: 'old_string not found in the code',
            suggestion: 'Use shadowGet to see the current code and find the exact text to match.'
          };
        }
        if (result.error === 'not_unique') {
          return {
            success: false,
            error: `old_string appears ${result.count} times. Include more context to make it unique, or set replace_all: true.`,
            count: result.count,
            suggestion: 'Add surrounding lines or context to old_string to make it unique.'
          };
        }
        if (result.error === 'no_change') {
          return {
            success: false,
            error: 'old_string and new_string are identical',
            suggestion: 'Provide different text for new_string.'
          };
        }
        return { success: false, error: result.error };
      }

      return {
        success: true,
        version: result.state?.version,
        replacements: result.count,
        message: `Successfully replaced ${result.count} occurrence(s). Use shadowDiffSinceSynced to review, then shadowSyncToEditor to apply.`
      };
    },
  });

  const shadowDiffSinceSyncedTool = tool({
    description: 'Show a line-based diff of changes in the shadow script since the last sync to the editor.',
    inputSchema: z.object({
      scriptId: z.string().optional(),
    }),
    execute: async ({ scriptId }) => {
      const tabId = await getActiveEarthEngineTabId();
      if (!tabId) return { success: false, error: 'No Earth Engine tab found' };
      const resolvedScriptId = scriptId || 'current_editor';
      await ensureShadowSyncedFromEditor(tabId, resolvedScriptId);
      const diff = shadowWorkspaceSingleton.diffSinceSynced(tabId, resolvedScriptId);
      return { success: true, ...diff };
    },
  });

  const shadowUndoTool = tool({
    description: 'Undo the last change in the agent shadow script.',
    inputSchema: z.object({ scriptId: z.string().optional() }),
    execute: async ({ scriptId }) => {
      const tabId = await getActiveEarthEngineTabId();
      if (!tabId) return { success: false, error: 'No Earth Engine tab found' };
      const next = shadowWorkspaceSingleton.undo(tabId, scriptId || 'current_editor');
      return { success: true, version: next.version };
    },
  });

  const shadowRedoTool = tool({
    description: 'Redo the last undone change in the agent shadow script.',
    inputSchema: z.object({ scriptId: z.string().optional() }),
    execute: async ({ scriptId }) => {
      const tabId = await getActiveEarthEngineTabId();
      if (!tabId) return { success: false, error: 'No Earth Engine tab found' };
      const next = shadowWorkspaceSingleton.redo(tabId, scriptId || 'current_editor');
      return { success: true, version: next.version };
    },
  });

  const shadowSyncToEditorTool = tool({
    description: 'Write the current shadow script content back into the Earth Engine editor.',
    inputSchema: z.object({ scriptId: z.string().optional() }),
    execute: async ({ scriptId }) => {
      const tabId = await getActiveEarthEngineTabId();
      if (!tabId) return { success: false, error: 'No Earth Engine tab found' };

      const state = shadowWorkspaceSingleton.getOrCreate(tabId, scriptId || 'current_editor');
      const result: any = await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve({ success: false, error: 'Content script timed out while syncing to editor.' });
        }, 10000); // 10 second timeout

        chrome.tabs.sendMessage(tabId, { type: 'EDIT_SCRIPT', scriptId: state.scriptId, content: state.content }, (response) => {
          clearTimeout(timeout);
          if (chrome.runtime.lastError) resolve({ success: false, error: chrome.runtime.lastError.message });
          else resolve(response || { success: false, error: 'No response from content script' });
        });
      });
      if (result?.success) shadowWorkspaceSingleton.markSynced(tabId, state.scriptId);
      return { ...result, shadowVersion: state.version };
    },
  });

  const shadowSyncFromEditorTool = tool({
    description: 'Refresh the shadow script content from the Earth Engine editor.',
    inputSchema: z.object({ scriptId: z.string().optional() }),
    execute: async ({ scriptId }) => {
      const tabId = await getActiveEarthEngineTabId();
      if (!tabId) return { success: false, error: 'No Earth Engine tab found' };
      const response: any = await new Promise((resolve) => {
        chrome.tabs.sendMessage(tabId, { type: 'GET_SCRIPT' }, (res) => {
          if (chrome.runtime.lastError) resolve({ success: false, error: chrome.runtime.lastError.message });
          else resolve(res || { success: false, error: 'No response from content script' });
        });
      });
      if (!response?.success) return response;
      const next = shadowWorkspaceSingleton.setFromEditor(tabId, scriptId || 'current_editor', response.content || '', 'refresh from editor');
      shadowWorkspaceSingleton.markSynced(tabId, next.scriptId);
      return { success: true, version: next.version, contentLength: next.content.length };
    },
  });

  // Define GEE documentation search tool (supports multiple sources)
  const geeDocsTool = tool({
    description: `Search Google Earth Engine documentation and datasets using semantic search.

**Query Tips:** Ask like you're asking a person - use natural language questions for best results:
- Good: "How to load and visualize LANDSAT 8 surface reflectance imagery?"
- Good: "What nighttime light datasets are available for urban analysis?"
- Bad: "LANDSAT" (too vague, use descriptive sentences instead)

Sources:
- geeDatasets: Official GEE dataset catalog (dataset IDs, bands, code examples)
- communityDatasets: Awesome GEE community datasets contributed by users
- apiDocs: GEE API documentation (functions, usage, best practices)`,
    inputSchema: z.object({
      query: z.string().describe('Natural language question describing what you need (e.g., "How to calculate NDVI from Sentinel-2?", "What datasets have global building footprints?")'),
      source: z.enum(['geeDatasets', 'communityDatasets', 'apiDocs'])
        .describe('geeDatasets: Official catalog | communityDatasets: User datasets | apiDocs: API docs')
    }),
    execute: async ({ query, source }) => {
      // Manually send tool_start event since onStepStart is not reliable
      if (onToolEvent) {
        onToolEvent({
          type: 'tool_start',
          toolName: 'geeDocs',
          args: { query, source },
          timestamp: Date.now()
        });
      }

      // Map source to library ID
      const libraryMap: Record<string, string> = {
        geeDatasets: 'wybert/earthengine-dataset-catalog-md',
        communityDatasets: 'samapriya/awesome-gee-community-datasets',
        apiDocs: 'wybert/earthengine-doc-md'
      };
      const libraryId = libraryMap[source];

      try {
        console.log(`🌍 [GeeDocsTool] Tool called with query: "${query}", source: "${source}"`);
        console.log(`🌍 [GeeDocsTool] Using library: ${libraryId}`);
        console.time('GeeDocsTool execution');

        const result = await getDocumentation(
          libraryId,
          query,
          { tokens: 15000 }
        );

        console.timeEnd('GeeDocsTool execution');

        if (!result.success || !result.content) {
          console.warn(`❌ [GeeDocsTool] No results found for "${query}" in ${source}. Error: ${result.message}`);
          return {
            found: false,
            source,
            message: result.message || `Could not find documentation for "${query}" in ${source}`,
            suggestion: "Try a different search term or check another source."
          };
        }

        console.log(`✅ [GeeDocsTool] Found documentation for "${query}" in ${source}. Content length: ${result.content.length} chars`);

        return {
          found: true,
          query,
          source,
          documentation: result.content,
          message: `Documentation found for "${query}" in ${source}`
        };
      } catch (error) {
        console.error(`❌ [GeeDocsTool] Error fetching documentation:`, error);
        return {
          found: false,
          source,
          message: `Error retrieving documentation: ${error instanceof Error ? error.message : String(error)}`,
          suggestion: "Try again with a different query or source."
        };
      }
    },
  });

  // Define Earth Engine script editor tool
  const earthEngineScriptTool = tool({
    description: 'Insert JavaScript code into the Google Earth Engine code editor. WORKFLOW TIP: After editing code, ALWAYS use earthEngineRunCode to execute it, then check getConsoleOutput for errors.',
    inputSchema: z.object({
      scriptId: z.string().describe('The ID of the script to edit (use "current" for the currently open script)'),
      code: z.string().describe('The Google Earth Engine JavaScript code to insert into the editor')
    }),
    execute: async ({ scriptId, code }) => {
      const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log(`🔧 [EarthEngineScriptTool][${executionId}] ========== TOOL EXECUTION START ==========`);
      console.log(`🔧 [EarthEngineScriptTool][${executionId}] scriptId: "${scriptId}"`);
      console.log(`🔧 [EarthEngineScriptTool][${executionId}] code length: ${code.length} characters`);
      console.log(`🔧 [EarthEngineScriptTool][${executionId}] code preview: ${code.substring(0, 150)}...`);
      console.log(`🔧 [EarthEngineScriptTool][${executionId}] timestamp: ${new Date().toISOString()}`);

      // Manually send tool_start event
      if (onToolEvent) {
        console.log(`🔧 [EarthEngineScriptTool][${executionId}] Sending tool_start event`);
        onToolEvent({
          type: 'tool_start',
          toolName: 'earthEngineScript',
          args: { scriptId, code: code.substring(0, 100) + '...' },
          timestamp: Date.now()
        });
      } else {
        console.log(`⚠️ [EarthEngineScriptTool][${executionId}] No onToolEvent callback provided`);
      }

      try {
        console.log(`🔧 [EarthEngineScriptTool][${executionId}] Starting execution...`);
        console.time(`EarthEngineScriptTool-${executionId}`);

        const targetScriptId = scriptId === 'current' ? 'current_editor' : scriptId;

        // Check if Chrome tabs API is available
        if (typeof chrome === 'undefined' || !chrome.tabs) {
          console.warn('❌ [EarthEngineScriptTool] Chrome tabs API not available');
          return {
            success: false,
            error: 'Cannot edit Earth Engine scripts: Extension context not available',
            suggestion: "This operation requires running in a Chrome extension environment"
          };
        }

        // Find the Earth Engine tab
        const earthEngineTabs = await new Promise<chrome.tabs.Tab[]>((resolve) => {
          chrome.tabs.query({ url: "*://code.earthengine.google.com/*" }, (tabs) => {
            resolve(tabs || []);
          });
        });

        if (earthEngineTabs.length === 0) {
          console.warn('❌ [EarthEngineScriptTool] No Earth Engine tab found');
          return {
            success: false,
            error: 'No Earth Engine tab found',
            suggestion: "Please open Google Earth Engine in a browser tab first"
          };
        }

        // Smart tab selection: prefer active or recently used tab
        const selectedTab = selectBestEarthEngineTab(earthEngineTabs);
        const tabId = selectedTab?.id;
        if (!tabId) {
          console.warn('❌ [EarthEngineScriptTool] Invalid Earth Engine tab');
          return {
            success: false,
            error: 'Invalid Earth Engine tab',
            suggestion: "Please reload your Earth Engine tab and try again"
          };
        }

        console.log(`🔧 [EarthEngineScriptTool] Found Earth Engine tab: ${tabId}`);

        // Check/inject content script
        try {
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Content script ping timed out')), 300);
            chrome.tabs.sendMessage(tabId, { type: 'PING' }, (response) => {
              clearTimeout(timeout);
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message || 'Error pinging content script'));
              } else {
                resolve();
              }
            });
          });
          console.log(`🔧 [EarthEngineScriptTool] Content script ready`);
        } catch (pingError: unknown) {
          const errorMessage = pingError instanceof Error ? pingError.message : String(pingError);
          console.log(`🔧 [EarthEngineScriptTool] Content script not ready: ${errorMessage}, injecting...`);
          try {
            await new Promise<void>((resolve, reject) => {
              chrome.scripting.executeScript({
                target: { tabId },
                files: ['content.js']
              }, (results) => {
                if (chrome.runtime.lastError) {
                  reject(new Error(chrome.runtime.lastError.message || 'Failed to inject content script'));
                } else {
                  setTimeout(resolve, 500); // Wait for script init
                }
              });
            });
            console.log(`🔧 [EarthEngineScriptTool] Content script injected successfully`);
          } catch (injectError: unknown) {
            const injectErrorMessage = injectError instanceof Error ? injectError.message : String(injectError);
            console.warn(`❌ [EarthEngineScriptTool] Failed to inject content script: ${injectErrorMessage}`);
            return {
              success: false,
              error: `Content script not available: ${injectErrorMessage}`,
              suggestion: "Try refreshing the Earth Engine tab and ensure the extension has permission"
            };
          }
        }

        // Send message to content script with timeout to prevent hanging
        const result: any = await new Promise((resolve) => {
          const timeout = setTimeout(() => {
            console.warn(`⚠️ [EarthEngineScriptTool][${executionId}] EDIT_SCRIPT message timed out after 10s`);
            resolve({ success: false, error: 'Content script timed out while editing code. The tab may be unresponsive.' });
          }, 10000); // 10 second timeout

          chrome.tabs.sendMessage(tabId, { type: 'EDIT_SCRIPT', scriptId: targetScriptId, content: code }, (response) => {
            clearTimeout(timeout);
            if (chrome.runtime.lastError) {
              resolve({ success: false, error: chrome.runtime.lastError.message || 'Error communicating with content script' });
            } else {
              resolve(response || { success: false, error: 'No response from content script' });
            }
          });
        });

        console.timeEnd(`EarthEngineScriptTool-${executionId}`);

        if (!result.success) {
          console.warn(`❌ [EarthEngineScriptTool][${executionId}] Failed to edit script via content script: ${result.error}`);
          console.log(`❌ [EarthEngineScriptTool][${executionId}] ========== TOOL EXECUTION FAILED ==========`);
          return {
            success: false,
            error: result.error || 'Unknown error editing script',
            suggestion: "Check content script logs or ensure EE tab is active.",
            executionId
          };
        }

        console.log(`✅ [EarthEngineScriptTool][${executionId}] Successfully edited script "${targetScriptId}"`);
        console.log(`✅ [EarthEngineScriptTool][${executionId}] Result:`, JSON.stringify(result, null, 2));
        console.log(`✅ [EarthEngineScriptTool][${executionId}] ========== TOOL EXECUTION SUCCESS ==========`);
        return {
          success: true,
          scriptId: targetScriptId,
          message: result.message || `Successfully inserted code into Earth Engine script "${targetScriptId}"`,
          nextSteps: "You can now run the script in Earth Engine by clicking the 'Run' button",
          executionId
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ [EarthEngineScriptTool][${executionId}] Unexpected error:`, error);
        console.log(`❌ [EarthEngineScriptTool][${executionId}] ========== TOOL EXECUTION ERROR ==========`);
        return {
          success: false,
          error: `Unexpected error in EarthEngineScriptTool: ${errorMessage}`,
          suggestion: "Check background script logs for more details",
          executionId
        };
      }
    },
  });

  // Define Run Current Code tool (just clicks Run button, no code parameter)
  const runCurrentCodeTool = tool({
    description: `Run the current code in the Google Earth Engine editor. This tool just clicks the Run button - it does NOT set any code.

USE THIS TOOL when you have already edited code using editCode or insertAtLine and want to execute it.

WORKFLOW:
1. Use editCode or insertAtLine to modify code (shows diff)
2. Use runCurrentCode to execute the modified code
3. Use getConsoleOutput to check for errors`,
    inputSchema: z.object({}) as any, // No parameters - cast to any for SDK 6 compatibility
    execute: async () => {
      const executionId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log(`▶️ [RunCurrentCodeTool][${executionId}] ========== TOOL EXECUTION START ==========`);

      // Manually send tool_start event
      if (onToolEvent) {
        onToolEvent({
          type: 'tool_start',
          toolName: 'runCurrentCode',
          args: {},
          timestamp: Date.now()
        });
      }

      try {
        const tabId = await getActiveEarthEngineTabId();
        if (!tabId) {
          return {
            success: false,
            error: 'No Earth Engine tab found',
            suggestion: "Please open Google Earth Engine in a browser tab first"
          };
        }

        const result = await GeeService.runCode(tabId);
        if (result.success) {
          console.log(`✅ [RunCurrentCodeTool][${executionId}] Code executed successfully`);
          return {
            success: true,
            result: 'Code executed successfully',
            message: 'Clicked Run button - Earth Engine code is now executing',
            nextSteps: "Use getConsoleOutput to check for errors or output"
          };
        }
        return {
          success: false,
          error: result.error,
          suggestion: "Please click Run manually or refresh the Earth Engine tab"
        };

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ [RunCurrentCodeTool][${executionId}] Unexpected error:`, error);
        return {
          success: false,
          error: `Unexpected error: ${errorMessage}`,
          suggestion: "Check background script logs for more details"
        };
      }
    },
  });

  // Define Screenshot tool
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const screenshotTool = tool({
    description: 'Capture a screenshot of the current active browser tab. Useful for seeing map visualizations, console errors, or task status in Google Earth Engine.',
    inputSchema: z.object({}) as any, // No parameters needed - cast to any for SDK 6 compatibility
    execute: async () => {
      // Manually send tool_start event
      if (onToolEvent) {
        onToolEvent({
          type: 'tool_start',
          toolName: 'screenshot',
          args: {},
          timestamp: Date.now()
        });
      }

      try {
        console.log(`📸 [ScreenshotTool] Tool called`);
        console.time('ScreenshotTool execution');

        if (typeof chrome === 'undefined' || !chrome.tabs) {
          return { success: false, error: 'Extension context not available' };
        }

        // Get active tab
        const tabs = await new Promise<chrome.tabs.Tab[]>((resolve) => {
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            resolve(tabs || []);
          });
        });

        if (!tabs || tabs.length === 0 || !tabs[0].id || !tabs[0].windowId) {
          return { success: false, error: 'No active tab found' };
        }

        const tabId = tabs[0].id;
        const windowId = tabs[0].windowId;

        // Use BrowserService
        const result = await BrowserService.captureScreenshot(tabId, windowId);

        console.timeEnd('ScreenshotTool execution');

        if (result.success && result.data?.screenshotDataUrl) {
          return {
            success: true,
            message: 'Screenshot captured successfully.',
            screenshotDataUrl: result.data.screenshotDataUrl
          };
        }

        return { success: false, error: result.error || 'Failed to capture screenshot' };

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ [ScreenshotTool] Error capturing screenshot:`, error);
        console.timeEnd('ScreenshotTool execution');
        return {
          success: false,
          error: `Error taking screenshot: ${errorMessage}`,
        };
      }
    },

    toModelOutput: (
      {
        output
      }
    ) => {
      console.log('📸 [ScreenshotTool] Converting result to model output');

      if (!output.success) {
        // Return error as text
        return {
          type: 'content',
          value: [{ type: 'text', text: `Error taking screenshot: ${output.error || 'Unknown error'}` }]
        };
      }

      // Check if provider supports multimodal inputs
      if (!supportsMultimodal) {
        console.log(`📸 [ScreenshotTool] Provider ${currentProvider} does not support multimodal - returning text-only response`);
        return {
          type: 'content',
          value: [{
            type: 'text',
            text: `Screenshot captured successfully, but the current model (${currentProvider}) does not support image analysis. The screenshot shows the current browser state but cannot be analyzed visually. To use screenshot analysis, please switch to a multimodal-capable provider (OpenAI, Anthropic, or Google).`
          }]
        };
      }

      // Extract the base64 content from the data URL
      let base64Data = output.screenshotDataUrl || '';
      // Remove the data URL prefix if it exists (e.g., "data:image/jpeg;base64,")
      if (base64Data && base64Data.includes(';base64,')) {
        base64Data = base64Data.split(';base64,')[1] || base64Data;
        console.log('📸 [ScreenshotTool] Extracted base64 data from data URL');
      }

      // Return both text and media for successful screenshots (multimodal providers)
      return {
        type: 'content',
        value: [
          { type: 'text', text: 'Here is the screenshot of the current browser tab:' },
          { type: 'media', mediaType: 'image/jpeg', data: base64Data }
        ]
      };
    },
  });

  // Define Browser Snapshot tool
  const snapshotTool = tool({
    description: 'Capture an accessibility snapshot of the current active browser tab. Provides DOM structure and element references.',
    inputSchema: z.object({}), // No parameters needed
    execute: async () => {
      // Manually send tool_start event
      if (onToolEvent) {
        onToolEvent({
          type: 'tool_start',
          toolName: 'snapshot',
          args: {},
          timestamp: Date.now()
        });
      }

      try {
        console.log('🔎 [SnapshotTool] Tool called in background');
        console.time('SnapshotTool execution - background part');

        if (typeof chrome === 'undefined' || !chrome.tabs) {
          return { success: false, error: 'Chrome API not available' };
        }

        // Get the active tab
        const tabs = await new Promise<chrome.tabs.Tab[]>((resolve) => {
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            resolve(tabs || []);
          });
        });

        if (!tabs || tabs.length === 0 || !tabs[0].id) {
          return { success: false, error: 'No active tab found' };
        }
        const tabId = tabs[0].id;

        const result = await BrowserService.captureSnapshot(tabId);
        console.timeEnd('SnapshotTool execution - background part');

        if (result.success && result.data?.snapshot) {
          return { success: true, snapshot: result.data.snapshot };
        }
        return { success: false, error: result.error || 'Failed to capture snapshot' };

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ [SnapshotTool] Error in execute block:`, error);
        console.timeEnd('SnapshotTool execution - background part');
        return {
          success: false,
          error: `Error taking snapshot: ${errorMessage}`,
        };
      }
    },
    toModelOutput: (
      {
        output
      }
    ) => {
      console.log('🔎 [SnapshotTool] Converting result to model output');

      if (!output.success) {
        console.error('❌ [SnapshotTool] Error in toModelOutput - result not successful:', output.error);
        return {
          type: 'content',
          value: [{ type: 'text', text: `Error taking snapshot: ${output.error || 'Unknown error'}` }]
        };
      }

      if (output.snapshot) {
        console.log('🔎 [SnapshotTool] Full snapshot data for model output (copy from here):');
        console.log(output.snapshot);
      } else {
        console.warn('⚠️ [SnapshotTool] No snapshot data found in result for model output, though success was true.');
        return {
          type: 'content',
          value: [{ type: 'text', text: 'Snapshot tool succeeded but no snapshot data was returned.' }]
        };
      }

      // Return the snapshot data as text
      return {
        type: 'content',
        value: [
          { type: 'text', text: 'Here is the accessibility snapshot of the current browser tab:\n' + output.snapshot }
        ]
      };
    },
  });

  // Define Click by Reference ID tool
  const clickByRefIdTool = tool({
    description: 'Clicks an element on the page identified by its aria-ref ID.',
    inputSchema: z.object({
      refId: z.string().describe('The aria-ref ID of the element to click.'),
    }),
    execute: async ({ refId }) => {
      // Manually send tool_start event
      if (onToolEvent) {
        onToolEvent({
          type: 'tool_start',
          toolName: 'clickByRefId',
          args: { refId },
          timestamp: Date.now()
        });
      }

      try {
        console.log(`🖱️ [ClickByRefIdTool] Tool called for refId: ${refId}`);

        if (typeof chrome === 'undefined' || !chrome.tabs) {
          return { success: false, error: 'Chrome API not available' };
        }

        const tabs = await new Promise<chrome.tabs.Tab[]>((resolve) => {
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => resolve(tabs || []));
        });

        if (!tabs || tabs.length === 0 || !tabs[0].id) {
          return { success: false, error: 'No active tab' };
        }
        const tabId = tabs[0].id;

        const result = await BrowserService.clickByRefId(tabId, refId);
        return result;

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ [ClickByRefIdTool] Error:`, error);
        return { success: false, error: `Error clicking by refId: ${errorMessage}` };
      }
    },
    toModelOutput: (
      {
        output
      }
    ) => {
      return {
        type: 'content',
        value: [{ type: 'text', text: output.success ? (output.message || 'Successfully clicked element.') : `Error clicking element: ${output.error}` }]
      };
    },
  });

  // Define Clear Map, Inspector, and Console tool
  const clearMapInspectorAndConsoleTool = tool({
    description: 'Clear the Google Earth Engine map, inspector, and console to return to a clean environment. Use this to start fresh before writing new code.',
    inputSchema: z.object({}), // No parameters needed
    execute: async () => {
      // Manually send tool_start event
      if (onToolEvent) {
        onToolEvent({
          type: 'tool_start',
          toolName: 'clearMapInspectorAndConsole',
          args: {},
          timestamp: Date.now()
        });
      }

      try {
        console.log(`🔄 [ResetMapInspectorConsoleTool] Tool called to reset GEE environment`);
        console.time('ResetMapInspectorConsoleTool execution');

        const tabId = await getActiveEarthEngineTabId();
        if (!tabId) {
          return {
            success: false,
            error: 'No Google Earth Engine tab found',
            suggestion: "Please open Google Earth Engine (https://code.earthengine.google.com) in a browser tab first"
          };
        }

        const result = await GeeService.clearAll(tabId);
        console.timeEnd('ResetMapInspectorConsoleTool execution');

        if (result.success) {
          return {
            success: true,
            message: 'Google Earth Engine map, inspector, and console have been reset successfully. The environment is now in a clean state.',
            action: 'reset_completed'
          };
        }

        return {
          success: false,
          error: result.error || 'Failed to clear',
          suggestion: 'Try refreshing the Google Earth Engine page and running the tool again'
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ [ResetMapInspectorConsoleTool] Error:`, error);
        console.timeEnd('ResetMapInspectorConsoleTool execution');
        return {
          success: false,
          error: `Error resetting GEE environment: ${errorMessage}`,
          suggestion: 'Try refreshing the Google Earth Engine page and running the tool again'
        };
      }
    },
    toModelOutput: (
      {
        output
      }
    ) => {
      return {
        type: 'content',
        value: [{
          type: 'text',
          text: output.success
            ? '✅ Google Earth Engine environment has been reset successfully. The map, inspector, and console are now cleared.'
            : `❌ Failed to reset GEE environment: ${output.error}${output.suggestion ? ' Suggestion: ' + output.suggestion : ''}`
        }]
      };
    },
  });
  // Define Click at Screen Position tool
  const clickAtScreenPositionTool = tool({
    description: 'Clicks at the specified screen (x, y) pixel position. Use getMapScreenPosition to get map coordinates first.',
    inputSchema: z.object({
      x: z.number().describe('The x screen pixel position to click.'),
      y: z.number().describe('The y screen pixel position to click.'),
    }),
    execute: async ({ x, y }) => {
      // Manually send tool_start event
      if (onToolEvent) {
        onToolEvent({
          type: 'tool_start',
          toolName: 'clickAtScreenPosition',
          args: { x, y },
          timestamp: Date.now()
        });
      }

      try {
        console.log(`🖱️ [ClickByCoordinatesTool] Tool called for coordinates: (${x}, ${y})`);
        console.time('ClickByCoordinatesTool execution - background part');

        if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.scripting) {
          console.warn('❌ [ClickByCoordinatesTool] Chrome API not available.');
          return { success: false, error: 'Chrome API not available for click tool' };
        }

        const tabs = await new Promise<chrome.tabs.Tab[]>((resolve) => {
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => resolve(tabs || []));
        });

        if (!tabs || tabs.length === 0 || !tabs[0].id) {
          console.warn('❌ [ClickByCoordinatesTool] No active tab found or tab has no ID.');
          return { success: false, error: 'No active tab found or tab has no ID' };
        }
        const tabId = tabs[0].id;

        // Ensure content script is ready (simplified check for brevity)
        try {
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Content script ping timed out for ClickByCoordinatesTool')), 500);
            chrome.tabs.sendMessage(tabId, { type: 'PING' }, (response) => {
              clearTimeout(timeout);
              if (chrome.runtime.lastError || !(response && response.type === 'PONG')) {
                chrome.scripting.executeScript(
                  { target: { tabId }, files: ['content.js'] },
                  () => chrome.runtime.lastError ? reject(new Error(`Injection failed: ${chrome.runtime.lastError.message}`)) : setTimeout(resolve, 500)
                );
              } else {
                resolve();
              }
            });
          });
        } catch (err) {
          console.error('❌ [ClickByCoordinatesTool] Content script check/injection failed:', err);
          return { success: false, error: err instanceof Error ? err.message : 'Content script not available' };
        }

        const resultFromContentScript: { success: boolean; message?: string; error?: string } = await new Promise((resolve) => {
          chrome.tabs.sendMessage(tabId, { type: 'CLICK_BY_COORDINATES', payload: { x, y } }, (response) => {
            resolve(response || { success: false, error: 'No response from content script for click by coordinates' });
          });
        });

        console.timeEnd('ClickByCoordinatesTool execution - background part');
        console.log(`✅ [ClickByCoordinatesTool] Result for coords (${x},${y}): ${JSON.stringify(resultFromContentScript)}`);
        return resultFromContentScript;

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ [ClickByCoordinatesTool] Error:`, error);
        console.timeEnd('ClickByCoordinatesTool execution - background part');
        return { success: false, error: `Error clicking by coordinates: ${errorMessage}` };
      }
    },
    toModelOutput: (
      {
        output
      }
    ) => {
      return {
        type: 'content',
        value: [{ type: 'text', text: output.success ? (output.message || 'Successfully clicked at coordinates.') : `Error clicking by coordinates: ${output.error}` }]
      };
    },
  });

// Define Get Console Output tool
const getConsoleOutputTool = tool({
    description: 'Read all output from the Google Earth Engine console, including print() statements, data, and error messages. WORKFLOW TIP: Use this immediately after earthEngineRunCode to check for errors.',
    inputSchema: z.object({}), // No parameters needed
    execute: async () => {
        // Manually send tool_start event
        if (onToolEvent) {
            onToolEvent({
                type: 'tool_start',
                toolName: 'getConsoleOutput',
                args: {},
                timestamp: Date.now()
            });
        }

        try {
            console.log(`📋 [GetConsoleOutputTool] Tool called to read GEE console`);
            console.time('GetConsoleOutputTool execution');

            const tabId = await getActiveEarthEngineTabId();
            if (!tabId) {
                return { success: false, error: 'No Earth Engine tab found' };
            }

            const result = await GeeService.getConsoleOutput(tabId);
            console.timeEnd('GetConsoleOutputTool execution');

            if (!result.success) {
                console.warn(`❌ [GetConsoleOutputTool] Failed to get console output:`, result.error);
                return {
                    success: false,
                    error: result.error || 'Failed to read console output',
                    suggestion: 'Make sure the Earth Engine editor is loaded and you have run some code'
                };
            }

            console.log(`✅ [GetConsoleOutputTool] Successfully read ${result.data?.count || 0} console entries`);
            return {
                success: true,
                outputs: result.data?.outputs || [],
                count: result.data?.count || 0,
                message: result.message || `Read ${result.data?.count || 0} console entries`
            };

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`❌ [GetConsoleOutputTool] Error:`, error);
            console.timeEnd('GetConsoleOutputTool execution');
            return {
                success: false,
                error: `Error reading GEE console: ${errorMessage}`,
                suggestion: 'Try refreshing the Google Earth Engine page and running the tool again'
            };
        }
    },
    toModelOutput: ({ output }) => {
        if (!output.success) {
            return {
                type: 'content',
                value: [{
                    type: 'text',
                    text: `❌ Failed to read console: ${output.error}${output.suggestion ? '\n\nSuggestion: ' + output.suggestion : ''}`
                }]
            };
        }

        if (output.count === 0) {
            return {
                type: 'content',
                value: [{
                    type: 'text',
                    text: '📋 Console is empty. No output to display. Run some code first (e.g., print("Hello World")).'
                }]
            };
        }

        // Format console outputs with chart detection
        const formattedOutputs = output.outputs.map((output: any, i: number) => {
            let icon = 'ℹ️';
            if (output.type === 'error') {
                icon = '❌';
            } else if (output.type === 'warning') {
                icon = '⚠️';
            } else if (output.type === 'chart') {
                icon = '📊';
            }

            let formattedLine = `${i + 1}. ${icon} ${output.message}`;

            // Add extra info for charts
            if (output.hasVisualContent) {
                if (output.visualElementType) {
                    formattedLine += `\n   Type: ${output.visualElementType}`;
                }
                if (output.chartDescription) {
                    formattedLine += `\n   Description: ${output.chartDescription}`;
                }
            }

            return formattedLine;
        }).join('\n');

        // Check if any charts were detected
        const chartCount = output.outputs.filter((o: any) => o.type === 'chart').length;
        const chartNote = chartCount > 0
            ? `\n\n💡 Tip: ${chartCount} chart(s) detected. Use the screenshot tool to capture and view the visualizations.`
            : '';

        return {
            type: 'content',
            value: [{
                type: 'text',
                text: `📋 Console Output (${output.count} entries):\n\n${formattedOutputs}${chartNote}`
            }]
        };
    },
});

// Define Get Script tool
const getScriptTool = tool({
    description: 'Read the current JavaScript code from the Google Earth Engine code editor. WORKFLOW TIP: Use this before earthEngineScript when debugging or modifying existing code.',
    inputSchema: z.object({}), // No parameters needed
    execute: async () => {
        // Manually send tool_start event
        if (onToolEvent) {
            onToolEvent({
                type: 'tool_start',
                toolName: 'getScript',
                args: {},
                timestamp: Date.now()
            });
        }

        try {
            console.log(`📖 [GetScriptTool] Tool called to read GEE code editor`);
            const tabId = await getActiveEarthEngineTabId();
            if (!tabId) {
                return {
                    success: false,
                    error: 'No Earth Engine tab found',
                    suggestion: "Please open Google Earth Engine (https://code.earthengine.google.com) in a browser tab first"
                };
            }

            // Use EditorService
            const result = await EditorService.readCode(tabId);

            if (!result.success || result.content === undefined) {
                console.warn(`❌ [GetScriptTool] Failed to get script:`, result.error);
                return {
                    success: false,
                    error: result.error || 'Failed to read script from editor',
                    suggestion: 'Make sure the Earth Engine editor is loaded and the code editor is visible'
                };
            }

            console.log(`✅ [GetScriptTool] Successfully read script: ${result.lineCount} lines`);
            return {
                success: true,
                content: result.content,
                lineCount: result.lineCount,
                message: result.message || `Successfully read ${result.lineCount} lines of code from the Earth Engine editor`
            };

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`❌ [GetScriptTool] Error:`, error);
            return {
                success: false,
                error: `Error reading GEE code editor: ${errorMessage}`,
                suggestion: 'Try refreshing the Google Earth Engine page and running the tool again'
            };
        }
    },
    toModelOutput: ({ output }) => {
        return {
            type: 'content',
            value: [{
                type: 'text',
                text: output.success
                    ? `✅ Current script content (${output.lineCount} lines):\n\n\`\`\`javascript\n${output.content}\n\`\`\``
                    : `❌ Failed to read script: ${output.error}${output.suggestion ? '\n\nSuggestion: ' + output.suggestion : ''}`
            }]
        };
    },
});

// Define Get Map Screen Position tool
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getMapScreenPositionTool = tool({
    description: 'Get the screen position and bounds of the Google Earth Engine map element. Returns pixel coordinates for use with clickAtScreenPosition.',
    inputSchema: z.object({}) as any, // Cast to any for SDK 6 toModelOutput compatibility
    execute: async () => {
        // Manually send tool_start event
        if (onToolEvent) {
            onToolEvent({
                type: 'tool_start',
                toolName: 'getMapScreenPosition',
                args: {},
                timestamp: Date.now()
            });
        }

        try {
            console.log(`🗺️ [GetMapInfoTool] Getting map information...`);
            console.time('GetMapInfoTool execution');

            const tabId = await getActiveEarthEngineTabId();
            if (!tabId) {
                return { success: false, error: 'No Earth Engine tab found' };
            }

            const result = await GeeService.getMapInfo(tabId);
            console.timeEnd('GetMapInfoTool execution');

            if (!result.success) {
                console.warn(`❌ [GetMapInfoTool] Failed:`, result.error);
                return result;
            }

            console.log(`✅ [GetMapInfoTool] Map center: (${result.data.centerPoint.x}, ${result.data.centerPoint.y}), size: ${result.data.mapBounds.width}x${result.data.mapBounds.height}`);
            return result;

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`❌ [GetMapInfoTool] Error:`, error);
            console.timeEnd('GetMapInfoTool execution');
            return {
                success: false,
                error: `Error getting map info: ${errorMessage}`
            };
        }
    },
    toModelOutput: ({ output }) => {
        if (!output.success) {
            return {
                type: 'content',
                value: [{
                    type: 'text',
                    text: `❌ Failed to get map info: ${output.error}`
                }]
            };
        }

        const data = output.data;
        const outputText = `✅ Map Information:

**Map Bounds:**
- Position: (${data.mapBounds.x}, ${data.mapBounds.y})
- Size: ${data.mapBounds.width}px × ${data.mapBounds.height}px

**Center Point:**
- X: ${data.centerPoint.x}px
- Y: ${data.centerPoint.y}px

**Viewport:**
- Width: ${data.viewport.width}px
- Height: ${data.viewport.height}px

To click on the map center, use: clickByCoordinates(${data.centerPoint.x}, ${data.centerPoint.y})`;

        return {
            type: 'content',
            value: [{ type: 'text', text: outputText }]
        };
    },
});

// Define Get Inspector Output tool
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getInspectorOutputTool = tool({
    description: `Read data from the Google Earth Engine Inspector panel.

Returns Point coordinates, Pixel values, and Object metadata (CRS/EPSG, transform, dimensions, etc.) from whatever location was last clicked on the map.

WORKFLOW:
1. User clicks on the map to populate the Inspector panel
2. Wait 1-3 seconds for data to load (use the wait tool if needed)
3. Call this tool to read the Inspector data
4. If data is still loading, wait another 1-2 seconds and try again

NOTE: For Object details (CRS/EPSG), user may need to expand the Objects section manually.

Returns the coordinates of the inspected location along with all available data.`,
    inputSchema: z.object({}) as any, // No parameters - just reads current Inspector state
    execute: async () => {
        // Manually send tool_start event
        if (onToolEvent) {
            onToolEvent({
                type: 'tool_start',
                toolName: 'getInspectorOutput',
                args: {},
                timestamp: Date.now()
            });
        }

        try {
            console.log(`🔍 [InspectMapTool] Reading Inspector panel data`);
            console.time('InspectMapTool execution');

            const tabId = await getActiveEarthEngineTabId();
            if (!tabId) {
                return { success: false, error: 'No Earth Engine tab found' };
            }

            const result = await GeeService.getInspectorOutput(tabId);
            console.timeEnd('InspectMapTool execution');

            if (!result.success) {
                console.warn(`❌ [InspectMapTool] Failed to inspect map:`, result.error);
                return {
                    success: false,
                    error: result.error || 'Failed to read Inspector data',
                    suggestion: result.error?.includes('Inspector is empty')
                        ? 'Click on the map first to populate the Inspector panel'
                        : 'Ensure the Inspector tab is open and you have clicked on the map',
                    data: result.data
                };
            }

            console.log(`✅ [InspectMapTool] Successfully read Inspector data: ${result.data?.layerCount || 0} layers`);
            return {
                success: true,
                data: result.data,
                message: `Successfully read ${result.data?.layerCount || 0} layers from Inspector`
            };

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`❌ [InspectMapTool] Error:`, error);
            console.timeEnd('InspectMapTool execution');
            return {
                success: false,
                error: `Error reading Inspector: ${errorMessage}`,
                suggestion: 'Try clicking on the map manually and running the tool again'
            };
        }
    },
    toModelOutput: ({ output }) => {
        if (!output.success) {
            return {
                type: 'content',
                value: [{
                    type: 'text',
                    text: `❌ Failed to inspect map: ${output.error}${output.suggestion ? '\n\nSuggestion: ' + output.suggestion : ''}`
                }]
            };
        }

        const data = output.data;
        let outputText = `✅ Inspector Data at (${data.inspectedCoordinates.lng}, ${data.inspectedCoordinates.lat}):\n\n`;

        // Include Point information
        if (data.point) {
            outputText += `**Point Information:**\n`;
            Object.entries(data.point).forEach(([key, value]) => {
                outputText += `  - ${key}: ${value}\n`;
            });
            outputText += '\n';
        }

        // Include Pixels section
        if (data.pixels && data.pixels.length > 0) {
            outputText += `**Pixel Values:**\n`;
            data.pixels.forEach((pixel: any, i: number) => {
                outputText += `  Layer ${i + 1}: ${pixel.layerName}\n`;
                if (pixel.data !== null && pixel.data !== undefined) {
                    if (typeof pixel.data === 'object') {
                        outputText += `    ${JSON.stringify(pixel.data, null, 2).split('\n').join('\n    ')}\n`;
                    } else {
                        outputText += `    Value: ${pixel.data}\n`;
                    }
                }
            });
            outputText += '\n';
        }

        // Include Objects section (with EPSG data)
        if (data.objects && data.objects.length > 0) {
            outputText += `**Object Metadata (includes CRS/EPSG):**\n`;
            data.objects.forEach((obj: any, i: number) => {
                outputText += `  Layer ${i + 1}: ${obj.layerName}\n`;
                if (obj.data) {
                    const jsonStr = JSON.stringify(obj.data, null, 2);
                    outputText += `    ${jsonStr.split('\n').join('\n    ')}\n`;
                }
            });
            outputText += '\n';
        }

        // Add suggestion if available
        if (output.suggestion) {
            outputText += `\n⚠️ **Note:** ${output.suggestion}\n`;
        }

        return {
            type: 'content',
            value: [{ type: 'text', text: outputText }]
        };
    },
});

// Return all tools
// Note: Shadow tools are kept internally but NOT exposed to LLM
// The simplified readCode/editCode/undoEdit tools wrap the shadow workspace
return {
  // Utility tools
  weatherTool,
  dateTimeTool,
  waitTool,

  // Simplified code editing tools (Claude Code-style) - PRIMARY
  readCodeTool,
  editCodeTool,
  writeCodeTool,
  undoEditTool,

  // Earth Engine tools
  geeDocsTool,
  runCurrentCodeTool,

  // Browser interaction tools
  screenshotTool,
  snapshotTool,
  clickByRefIdTool,
  clickAtScreenPositionTool,

  // Earth Engine state tools
  clearMapInspectorAndConsoleTool,
  getConsoleOutputTool,
  getMapScreenPositionTool,
  getInspectorOutputTool
};
}
