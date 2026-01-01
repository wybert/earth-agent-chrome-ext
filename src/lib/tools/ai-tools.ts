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
  ensureContentScript,
  validateChromeAPIs,
  createResilientFetch
} from '../utils';
import { shadowWorkspaceSingleton } from '@/background/shadow-workspace';
import { getEditorContent, setEditorContent } from '@/background/editor-helpers';

// Tool event callback type (used by chat-handler)
export type ToolEventCallback = (event: {
  type: 'tool_start' | 'tool_finish';
  toolName?: string;
  args?: any;
  result?: any;
  timestamp: number;
}) => void;

/**
 * Create all tools with the given event callback
 * This factory function allows tools to emit events for tracking
 */
export function createAITools(onToolEvent?: ToolEventCallback) {
    const weatherFetch = createResilientFetch({
      label: 'WeatherTool',
      maxAttempts: 3,
      baseDelayMs: 400,
    });

    const weatherTool = tool({
      description: 'Get the current weather for a location (uses Open-Meteo, no API key required)',
      inputSchema: z.object({
        location: z.string().describe('City or place name to get the weather for'),
      }),
      execute: async ({ location }) => {
        // Send tool_start event manually for reliable timing
        const toolName = 'weather';
        onToolEvent?.({ type: 'tool_start', toolName, args: { location }, timestamp: Date.now() });

        try {
          const geoRes = await weatherFetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`
          );
          if (!geoRes.ok) {
            const err = `Geocoding failed with status ${geoRes.status}`;
            return { error: err };
          }
          const geoData = await geoRes.json();
          if (!geoData?.results?.length) {
            const err = `Could not find location: "${location}"`;
            return { error: err };
          }

          const place = geoData.results[0];
          const { latitude, longitude, name, country_code } = place;
          const resolvedName = [name, country_code].filter(Boolean).join(', ');

          const weatherRes = await weatherFetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`
          );
          if (!weatherRes.ok) {
            const err = `Weather lookup failed with status ${weatherRes.status}`;
            return { error: err };
          }
          const weatherData = await weatherRes.json();
          const current = weatherData?.current_weather;
          if (!current) {
            const err = 'Weather data unavailable for this location';
            return { error: err };
          }

          const payload = {
            location: resolvedName || location,
            latitude,
            longitude,
            country: country_code,
            current: {
              temperatureC: current.temperature,
              temperatureF: Math.round((current.temperature * 9) / 5 + 32),
              windSpeed: current.windspeed,
              windDirection: current.winddirection,
              weatherCode: current.weathercode,
              isDay: current.is_day === 1,
              time: current.time,
            },
            source: 'open-meteo',
          };

          // Note: tool_finish event is automatically sent by onStepFinish callback
          return payload;
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          return { error: `Weather lookup failed: ${errMsg}` };
        }
      },
    });

    const dateTimeTool = tool({
      description: 'Get the current date and time, optionally for a specific IANA time zone. Returns the current time formatted in the requested timezone.',
      inputSchema: z.object({
        timeZone: z.string().optional().describe('IANA time zone, e.g., "Asia/Shanghai" for Beijing, "America/New_York", or "UTC". If not specified, uses system timezone.'),
      }),
      execute: async ({ timeZone }) => {
        // Send tool_start event manually for reliable timing
        const toolName = 'dateTime';
        onToolEvent?.({ type: 'tool_start', toolName, args: { timeZone }, timestamp: Date.now() });

        const now = new Date();
        const resolvedTz = timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

        // Format the current time in the requested timezone
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: resolvedTz,
          hour12: false,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          weekday: 'long',
        });

        const humanReadable = formatter.format(now);

        // Get date parts for structured output
        const parts = formatter.formatToParts(now).reduce<Record<string, string>>((acc, p) => {
          if (p.type !== 'literal') acc[p.type] = p.value;
          return acc;
        }, {});

        const result = {
          timeZone: resolvedTz,
          dateTime: humanReadable,
          year: parts.year,
          month: parts.month,
          day: parts.day,
          weekday: parts.weekday,
          hour: parts.hour,
          minute: parts.minute,
          second: parts.second,
          isoString: now.toISOString(),
          unixTimestamp: now.getTime(),
        };

        // Note: tool_finish event is automatically sent by onStepFinish callback
        return result;
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
        const tabId = await getActiveEarthEngineTabId();
        if (!tabId) return { success: false, error: 'No Earth Engine tab found. Please open Google Earth Engine Code Editor.' };

        // Use editor-helpers which uses chrome.scripting with world: 'MAIN' to bypass CSP
        const response = await getEditorContent(tabId);

        if (!response.success || response.content === undefined) {
          return { success: false, error: `Failed to read from editor: ${response?.error || 'Unknown error'}` };
        }

        const content = response.content;
        const lineCount = content.split('\n').length;

        // Update shadow workspace
        const state = shadowWorkspaceSingleton.setFromEditor(tabId, 'current_editor', content, 'readCode sync');
        shadowWorkspaceSingleton.markSynced(tabId, state.scriptId);

        return {
          success: true,
          content,
          lineCount,
          message: `Read ${lineCount} lines from editor`
        };
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

WRONG - Don't duplicate:
  old_string: "print('hello')"
  new_string: "print('hello')// Comment\\nprint('hello')"  ← WRONG! Creates duplicate`,
      inputSchema: z.object({
        old_string: z.string().describe('The exact text to find. Will be REPLACED by new_string.'),
        new_string: z.string().describe('The replacement text. This is the FINAL result, not an addition.'),
        replace_all: z.boolean().optional().describe('If true, replace ALL occurrences. Default: false'),
      }),
      execute: async ({ old_string, new_string, replace_all }) => {
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
     * undoEdit - Undo the last code edit
     * Reverts to previous version and syncs to editor
     */
    const undoEditTool = tool({
      description: 'Undo the last code edit. Reverts the code to the previous version.',
      inputSchema: z.object({}),
      execute: async () => {
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
          chrome.tabs.sendMessage(tabId, { type: 'EDIT_SCRIPT', scriptId: state.scriptId, content: state.content }, (response) => {
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

    // Define Earth Engine dataset documentation tool
    const earthEngineDatasetTool = tool({
      description: 'Get information about Earth Engine datasets including documentation and code examples. WORKFLOW TIP: After finding a dataset, use earthEngineScript to write code with the correct dataset ID and band names.',
      inputSchema: z.object({
        datasetQuery: z.string().describe('The Earth Engine dataset or topic to search for (e.g., "LANDSAT", "elevation", "MODIS")')
      }),
      execute: async ({ datasetQuery }) => {
        // Manually send tool_start event since onStepStart is not reliable
        if (onToolEvent) {
          onToolEvent({
            type: 'tool_start',
            toolName: 'earthEngineDataset',
            args: { datasetQuery },
            timestamp: Date.now()
          });
        }

        try {
          console.log(`🌍 [EarthEngineDatasetTool] Tool called with query: "${datasetQuery}"`);
          console.time('EarthEngineDatasetTool execution');
          
          // Use the Context7 getDocumentation function to fetch dataset information
          // The Earth Engine dataset catalog is stored in wybert/earthengine-dataset-catalog-md
          const result = await getDocumentation(
            'wybert/earthengine-dataset-catalog-md',
            datasetQuery,
            { tokens: 15000 } // Get a good amount of content
          );
          
          console.timeEnd('EarthEngineDatasetTool execution');
          
          if (!result.success || !result.content) {
            console.warn(`❌ [EarthEngineDatasetTool] No results found for "${datasetQuery}". Error: ${result.message}`);
            return {
              found: false,
              message: result.message || `Could not find documentation for "${datasetQuery}"`,
              suggestion: "Try a more general search term or check the spelling of the dataset name."
            };
          }
          
          console.log(`✅ [EarthEngineDatasetTool] Found documentation for "${datasetQuery}". Content length: ${result.content.length} chars`);
          
          return {
            found: true,
            query: datasetQuery,
            documentation: result.content,
            message: `Documentation found for Earth Engine dataset related to "${datasetQuery}"`
          };
        } catch (error) {
          console.error(`❌ [EarthEngineDatasetTool] Error fetching Earth Engine dataset info:`, error);
          return {
            found: false,
            message: `Error retrieving Earth Engine dataset information: ${error instanceof Error ? error.message : String(error)}`,
            suggestion: "Try again with a different dataset name or more specific query."
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
          
          // Send message to content script
          const result: any = await new Promise((resolve) => {
            chrome.tabs.sendMessage(tabId, { type: 'EDIT_SCRIPT', scriptId: targetScriptId, content: code }, (response) => {
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

    // Define Earth Engine code runner tool
    const earthEngineRunCodeTool = tool({
      description: 'Run JavaScript code in the Google Earth Engine code editor. WORKFLOW TIP: After running, ALWAYS check getConsoleOutput for errors and getMapInfo to verify visualizations were created.',
      inputSchema: z.object({
        code: z.string().describe('The Google Earth Engine JavaScript code to run in the editor')
      }),
      execute: async ({ code }) => {
        const executionId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log(`🏃 [EarthEngineRunCodeTool][${executionId}] ========== TOOL EXECUTION START ==========`);
        console.log(`🏃 [EarthEngineRunCodeTool][${executionId}] code length: ${code.length} characters`);
        console.log(`🏃 [EarthEngineRunCodeTool][${executionId}] code preview: ${code.substring(0, 150)}...`);
        console.log(`🏃 [EarthEngineRunCodeTool][${executionId}] timestamp: ${new Date().toISOString()}`);

        // Manually send tool_start event
        if (onToolEvent) {
          console.log(`🏃 [EarthEngineRunCodeTool][${executionId}] Sending tool_start event`);
          onToolEvent({
            type: 'tool_start',
            toolName: 'earthEngineRunCode',
            args: { code: code.substring(0, 100) + '...' },
            timestamp: Date.now()
          });
        } else {
          console.log(`⚠️ [EarthEngineRunCodeTool][${executionId}] No onToolEvent callback provided`);
        }

        try {
          console.log(`🏃 [EarthEngineRunCodeTool][${executionId}] Starting execution...`);
          console.time(`EarthEngineRunCodeTool-${executionId}`);
          
          // Check if Chrome tabs API is available
          if (typeof chrome === 'undefined' || !chrome.tabs) {
            console.warn('❌ [EarthEngineRunCodeTool] Chrome tabs API not available');
            return {
              success: false,
              error: 'Cannot run Earth Engine code: Extension context not available',
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
            console.warn('❌ [EarthEngineRunCodeTool] No Earth Engine tab found');
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
            console.warn('❌ [EarthEngineRunCodeTool] Invalid Earth Engine tab');
            return {
              success: false,
              error: 'Invalid Earth Engine tab',
              suggestion: "Please reload your Earth Engine tab and try again"
            };
          }
          
          console.log(`🏃 [EarthEngineRunCodeTool] Found Earth Engine tab: ${tabId}`);
          
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
            console.log(`🏃 [EarthEngineRunCodeTool] Content script ready`);
          } catch (pingError: unknown) {
            const errorMessage = pingError instanceof Error ? pingError.message : String(pingError);
            console.log(`🏃 [EarthEngineRunCodeTool] Content script not ready: ${errorMessage}, injecting...`);
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
              console.log(`🏃 [EarthEngineRunCodeTool] Content script injected successfully`);
            } catch (injectError: unknown) {
              const injectErrorMessage = injectError instanceof Error ? injectError.message : String(injectError);
              console.warn(`❌ [EarthEngineRunCodeTool] Failed to inject content script: ${injectErrorMessage}`);
              return {
                success: false,
                error: `Content script not available: ${injectErrorMessage}`,
                suggestion: "Try refreshing the Earth Engine tab and ensure the extension has permission"
              };
            }
          }
          
          // Send message to content script
          const result: any = await new Promise((resolve) => {
            chrome.tabs.sendMessage(tabId, { type: 'RUN_CODE', code }, (response) => {
              if (chrome.runtime.lastError) {
                resolve({ success: false, error: chrome.runtime.lastError.message || 'Error communicating with content script' });
              } else {
                resolve(response || { success: false, error: 'No response from content script' });
              }
            });
          });

          console.timeEnd(`EarthEngineRunCodeTool-${executionId}`);

          if (!result.success) {
            console.warn(`❌ [EarthEngineRunCodeTool][${executionId}] Failed to run code via content script: ${result.error}`);
            console.log(`❌ [EarthEngineRunCodeTool][${executionId}] ========== TOOL EXECUTION FAILED ==========`);
            return {
              success: false,
              error: result.error || 'Unknown error running code',
              suggestion: "Check content script logs or ensure EE tab is active.",
              executionId
            };
          }

          console.log(`✅ [EarthEngineRunCodeTool][${executionId}] Successfully ran code with result: ${result.result || 'No result returned'}`);
          console.log(`✅ [EarthEngineRunCodeTool][${executionId}] Result:`, JSON.stringify(result, null, 2));
          console.log(`✅ [EarthEngineRunCodeTool][${executionId}] ========== TOOL EXECUTION SUCCESS ==========`);
          return {
            success: true,
            result: result.result || 'Code executed successfully',
            message: 'Earth Engine code executed successfully',
            nextSteps: "Check the Earth Engine console for any output or results",
            executionId
          };
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`❌ [EarthEngineRunCodeTool][${executionId}] Unexpected error:`, error);
          console.log(`❌ [EarthEngineRunCodeTool][${executionId}] ========== TOOL EXECUTION ERROR ==========`);
          return {
            success: false,
            error: `Unexpected error in EarthEngineRunCodeTool: ${errorMessage}`,
            suggestion: "Check background script logs for more details",
            executionId
          };
        }
      },
    });

    // Define Screenshot tool
    const screenshotTool = tool({
      description: 'Capture a screenshot of the current active browser tab. Useful for seeing map visualizations, console errors, or task status in Google Earth Engine.',
      inputSchema: z.object({}), // No parameters needed
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

          // Check if Chrome tabs API is available
          if (typeof chrome === 'undefined' || !chrome.tabs) {
            console.warn('❌ [ScreenshotTool] Chrome tabs API not available');
            return {
              success: false,
              error: 'Cannot take screenshots: Extension context not available',
            };
          }

          // Get the active tab in the current window
          const tabs = await new Promise<chrome.tabs.Tab[]>((resolve) => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              resolve(tabs || []);
            });
          });

          if (!tabs || tabs.length === 0) {
            console.warn('❌ [ScreenshotTool] No active tab found');
            return {
              success: false,
              error: 'No active tab found',
            };
          }

          const activeTab = tabs[0];
          if (!activeTab.id || !activeTab.windowId) {
             console.warn('❌ [ScreenshotTool] Invalid active tab information');
            return {
              success: false,
              error: 'Could not get active tab information',
            };
          }
          
          console.log(`📸 [ScreenshotTool] Capturing visible area of tab ${activeTab.id}`);

          // Capture the visible tab area with reduced quality
          const dataUrl = await new Promise<string>((resolve, reject) => {
             chrome.tabs.captureVisibleTab(activeTab.windowId, { format: 'jpeg', quality: 50 }, (dataUrl) => {
               if (chrome.runtime.lastError) {
                 reject(new Error(chrome.runtime.lastError.message || 'Unknown error capturing tab'));
               } else if (!dataUrl) {
                  reject(new Error('captureVisibleTab returned empty data URL'));
               } else {
                 resolve(dataUrl);
               }
             });
          });

          // Resize the image in the active tab's content script
          let resizedDataUrl = dataUrl;
          try {
            if (activeTab.id) {
              // Inject and execute the resizing script in the active tab
              const results = await chrome.scripting.executeScript({
                target: { tabId: activeTab.id },
                func: (imgSrc: string, maxWidth: number) => {
                  return new Promise<string>((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => {
                      const canvas = document.createElement('canvas');
                      let width = img.width;
                      let height = img.height;
                      
                      // Calculate new dimensions while maintaining aspect ratio
                      if (width > maxWidth) {
                        const ratio = maxWidth / width;
                        width = maxWidth;
                        height = Math.floor(height * ratio);
                      }
                      
                      canvas.width = width;
                      canvas.height = height;
                      
                      const ctx = canvas.getContext('2d');
                      if (!ctx) {
                        reject('Could not get canvas context');
                        return;
                      }
                      
                      // Draw and compress
                      ctx.drawImage(img, 0, 0, width, height);
                      
                      // Return as JPEG with reduced quality
                      const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.5);
                      resolve(resizedDataUrl);
                    };
                    
                    img.onerror = () => reject('Error loading image for resizing');
                    img.src = imgSrc;
                  });
                },
                args: [dataUrl, 640] // Limit width to 640px max
              });
              
              if (results && results[0] && results[0].result) {
                resizedDataUrl = results[0].result as string;
                console.log(`📸 [ScreenshotTool] Successfully resized image: ${resizedDataUrl.length} bytes`);
              }
            }
          } catch (resizeError) {
            console.warn(`📸 [ScreenshotTool] Error resizing image:`, resizeError);
            // Continue with original image if resize fails
          }
          
          console.timeEnd('ScreenshotTool execution');
          console.log(`✅ [ScreenshotTool] Screenshot captured (data URL length: ${resizedDataUrl.length})`);
          
          // Log the full screenshot data URL for viewing in a new tab
          console.log('🖼️ [ScreenshotTool] SCREENSHOT DATA URL FOR VIEWING:');
          console.log(resizedDataUrl);
          console.log('🖼️ [ScreenshotTool] END OF SCREENSHOT DATA URL');

          // Return result with screenshot data
          return {
            success: true,
            message: 'Screenshot captured successfully.',
            screenshotDataUrl: resizedDataUrl
          };

        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`❌ [ScreenshotTool] Error capturing screenshot:`, error);
          console.timeEnd('ScreenshotTool execution'); // Ensure timeEnd is called on error
          return {
            success: false,
            error: `Error taking screenshot: ${errorMessage}`,
          };
        }
      },
      // toModelOutput converts the execute result into content for the AI model
      toModelOutput: (result: any) => {
        console.log('📸 [ScreenshotTool] Converting result to model output');

        if (!result.success) {
          // Return error as text
          return {
            type: 'content',
            value: [{ type: 'text', text: `Error taking screenshot: ${result.error || 'Unknown error'}` }]
          };
        }

        // Extract the base64 content from the data URL
        let base64Data = result.screenshotDataUrl;
        // Remove the data URL prefix if it exists (e.g., "data:image/jpeg;base64,")
        if (base64Data.includes(';base64,')) {
          base64Data = base64Data.split(';base64,')[1];
          console.log('📸 [ScreenshotTool] Extracted base64 data from data URL');
        }

        // Return both text and media for successful screenshots
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

          if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.scripting) {
            console.warn('❌ [SnapshotTool] Chrome API not available in this context');
            return {
              success: false,
              error: 'Chrome API not available for snapshot tool',
            };
          }

          // Get the active tab
          const tabs = await new Promise<chrome.tabs.Tab[]>((resolve) => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              resolve(tabs || []);
            });
          });

          if (!tabs || tabs.length === 0) {
            console.warn('❌ [SnapshotTool] No active tab found');
            return { success: false, error: 'No active tab found' };
          }
          const activeTab = tabs[0];
          if (!activeTab.id) {
            console.warn('❌ [SnapshotTool] Active tab has no ID');
            return { success: false, error: 'Active tab has no ID' };
          }
          const tabId = activeTab.id;

          // Check/inject content script (simplified, assumes content script is generally available or injected by other means)
          // A more robust implementation would ping/inject like earthEngineScriptTool
          try {
            await new Promise<void>((resolve, reject) => {
              const timeout = setTimeout(() => reject(new Error('Content script ping timed out for SnapshotTool')), 500);
              chrome.tabs.sendMessage(tabId, { type: 'PING' }, (response) => {
                clearTimeout(timeout);
                if (chrome.runtime.lastError) {
                  console.warn(`[SnapshotTool] Ping failed: ${chrome.runtime.lastError.message}, attempting to inject.`);
                  // Attempt to inject if ping fails
                  chrome.scripting.executeScript({
                    target: { tabId },
                    files: ['content.js'],
                  }, (injectionResults) => {
                    if (chrome.runtime.lastError) {
                      reject(new Error(`Failed to inject content script: ${chrome.runtime.lastError.message}`));
                    } else {
                      console.log('[SnapshotTool] Content script injected, assuming ready.');
                      setTimeout(resolve, 500); // Give script time to load
                    }
                  });
                } else if (response && response.type === 'PONG') {
                  console.log('[SnapshotTool] Content script responded to PING.');
                  resolve();
                } else {
                  // Ping successful but no PONG, or unexpected response, try injecting
                  console.warn('[SnapshotTool] Ping response not as expected, attempting to inject.');
                   chrome.scripting.executeScript({
                    target: { tabId },
                    files: ['content.js'],
                  }, (injectionResults) => {
                    if (chrome.runtime.lastError) {
                      reject(new Error(`Failed to inject content script: ${chrome.runtime.lastError.message}`));
                    } else {
                      console.log('[SnapshotTool] Content script injected after failed ping logic, assuming ready.');
                      setTimeout(resolve, 500); // Give script time to load
                    }
                  });
                }
              });
            });
          } catch (err) {
            console.error('❌ [SnapshotTool] Content script check/injection failed:', err);
            return { success: false, error: err instanceof Error ? err.message : 'Content script not available' };
          }

          // Send message to content script to perform the snapshot
          const resultFromContentScript: SnapshotResponse = await new Promise((resolve) => {
            chrome.tabs.sendMessage(tabId, { type: 'TAKE_ACCESSIBILITY_SNAPSHOT' }, (response) => {
              if (chrome.runtime.lastError) {
                resolve({ success: false, error: chrome.runtime.lastError.message || 'Error communicating with content script for snapshot' });
              } else {
                resolve(response || { success: false, error: 'No response from content script for snapshot' });
              }
            });
          });

          console.timeEnd('SnapshotTool execution - background part');
          console.log(`✅ [SnapshotTool] Snapshot result from content script. Success: ${resultFromContentScript.success}`);
          if (resultFromContentScript.success && resultFromContentScript.snapshot) {
            console.log('🔎 [SnapshotTool] Full snapshot data in execute (copy from here):');
            console.log(resultFromContentScript.snapshot);
          } else if (!resultFromContentScript.success) {
            console.error('❌ [SnapshotTool] Snapshot failed in content script:', resultFromContentScript.error);
          }
          
          return resultFromContentScript; // This should be SnapshotResponse { success: boolean, snapshot?: string, error?: string }

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
      toModelOutput: (result: any) => {
        console.log('🔎 [SnapshotTool] Converting result to model output');

        if (!result.success) {
          console.error('❌ [SnapshotTool] Error in toModelOutput - result not successful:', result.error);
          return {
            type: 'content',
            value: [{ type: 'text', text: `Error taking snapshot: ${result.error || 'Unknown error'}` }]
          };
        }

        if (result.snapshot) {
          console.log('🔎 [SnapshotTool] Full snapshot data for model output (copy from here):');
          console.log(result.snapshot);
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
            { type: 'text', text: 'Here is the accessibility snapshot of the current browser tab:\n' + result.snapshot }
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
          console.time('ClickByRefIdTool execution - background part');

          if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.scripting) {
            console.warn('❌ [ClickByRefIdTool] Chrome API not available.');
            return { success: false, error: 'Chrome API not available for click tool' };
          }

          const tabs = await new Promise<chrome.tabs.Tab[]>((resolve) => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => resolve(tabs || []));
          });

          if (!tabs || tabs.length === 0 || !tabs[0].id) {
            console.warn('❌ [ClickByRefIdTool] No active tab found or tab has no ID.');
            return { success: false, error: 'No active tab found or tab has no ID' };
          }
          const tabId = tabs[0].id;

          // Ensure content script is ready (simplified check for brevity)
          try {
            await new Promise<void>((resolve, reject) => {
              const timeout = setTimeout(() => reject(new Error('Content script ping timed out for ClickByRefIdTool')), 500);
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
            console.error('❌ [ClickByRefIdTool] Content script check/injection failed:', err);
            return { success: false, error: err instanceof Error ? err.message : 'Content script not available' };
          }

          const resultFromContentScript: { success: boolean; message?: string; error?: string } = await new Promise((resolve) => {
            chrome.tabs.sendMessage(tabId, { type: 'CLICK_BY_REF_ID', payload: { refId } }, (response) => {
              resolve(response || { success: false, error: 'No response from content script for click by refId' });
            });
          });

          console.timeEnd('ClickByRefIdTool execution - background part');
          console.log(`✅ [ClickByRefIdTool] Result for refId ${refId}: ${JSON.stringify(resultFromContentScript)}`);
          return resultFromContentScript;

        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`❌ [ClickByRefIdTool] Error:`, error);
          console.timeEnd('ClickByRefIdTool execution - background part');
          return { success: false, error: `Error clicking by refId: ${errorMessage}` };
        }
      },
      toModelOutput: (result: any) => {
        return {
          type: 'content',
          value: [{ type: 'text', text: result.success ? (result.message || `Successfully clicked element with refId ${result.refId}.`) : `Error clicking element: ${result.error}` }]
        };
      },
    });

    // Define Reset Map/Inspector/Console tool
    const resetMapInspectorConsoleTool = tool({
      description: 'Reset the Google Earth Engine map, inspector, and console to clear the current state and return to a clean environment. WORKFLOW TIP: Follow this with clearScript to start completely fresh, then use earthEngineScript to write new code.',
      inputSchema: z.object({}), // No parameters needed
      execute: async () => {
        // Manually send tool_start event
        if (onToolEvent) {
          onToolEvent({
            type: 'tool_start',
            toolName: 'resetMapInspectorConsole',
            args: {},
            timestamp: Date.now()
          });
        }

        try {
          console.log(`🔄 [ResetMapInspectorConsoleTool] Tool called to reset GEE environment`);
          console.time('ResetMapInspectorConsoleTool execution');

          if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.scripting) {
            console.warn('❌ [ResetMapInspectorConsoleTool] Chrome API not available.');
            return { 
              success: false, 
              error: 'Chrome API not available for reset tool',
              suggestion: 'This tool requires running in a Chrome extension environment'
            };
          }

          // Find the Earth Engine tab
          const earthEngineTabs = await new Promise<chrome.tabs.Tab[]>((resolve) => {
            chrome.tabs.query({ url: "*://code.earthengine.google.com/*" }, (tabs) => {
              resolve(tabs || []);
            });
          });

          if (earthEngineTabs.length === 0) {
            console.warn('❌ [ResetMapInspectorConsoleTool] No Earth Engine tab found');
            return {
              success: false,
              error: 'No Google Earth Engine tab found',
              suggestion: "Please open Google Earth Engine (https://code.earthengine.google.com) in a browser tab first"
            };
          }

          // Smart tab selection: prefer active or recently used tab
          const selectedTab = selectBestEarthEngineTab(earthEngineTabs);
          const tabId = selectedTab?.id;
          if (!tabId) {
            console.warn('❌ [ResetMapInspectorConsoleTool] Invalid Earth Engine tab');
            return {
              success: false,
              error: 'Invalid Earth Engine tab',
              suggestion: "Please reload your Earth Engine tab and try again"
            };
          }

          // Ensure content script is ready
          try {
            await new Promise<void>((resolve, reject) => {
              const timeout = setTimeout(() => reject(new Error('Content script ping timed out for ResetMapInspectorConsoleTool')), 500);
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
            console.error('❌ [ResetMapInspectorConsoleTool] Content script check/injection failed:', err);
            return { success: false, error: err instanceof Error ? err.message : 'Content script not available' };
          }

          // Click the reset button
          const resultFromContentScript: { success: boolean; message?: string; error?: string } = await new Promise((resolve) => {
            chrome.tabs.sendMessage(tabId, { 
              type: 'CLICK_BY_SELECTOR', 
              payload: { 
                selector: 'button.goog-button.reset-button[title="Clear map, inspector, and console"]',
                elementDescription: 'Reset button to clear map, inspector, and console'
              } 
            }, (response) => {
              resolve(response || { success: false, error: 'No response from content script for reset' });
            });
          });

          console.timeEnd('ResetMapInspectorConsoleTool execution');
          
          if (resultFromContentScript.success) {
            console.log(`✅ [ResetMapInspectorConsoleTool] Successfully reset GEE environment`);
            return {
              success: true,
              message: 'Google Earth Engine map, inspector, and console have been reset successfully. The environment is now in a clean state.',
              action: 'reset_completed'
            };
          } else {
            console.warn(`❌ [ResetMapInspectorConsoleTool] Failed to reset: ${resultFromContentScript.error}`);
            return {
              success: false,
              error: resultFromContentScript.error || 'Failed to click reset button',
              suggestion: 'Make sure you are on the Google Earth Engine code editor page and the reset button is visible'
            };
          }

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
      toModelOutput: (result: any) => {
        return {
          type: 'content',
          value: [{
            type: 'text',
            text: result.success
              ? '✅ Google Earth Engine environment has been reset successfully. The map, inspector, and console are now cleared.'
              : `❌ Failed to reset GEE environment: ${result.error}${result.suggestion ? ' Suggestion: ' + result.suggestion : ''}`
          }]
        };
      },
    });

    // Define Clear Script tool
    const clearScriptTool = tool({
      description: 'Clear all code from the Google Earth Engine code editor, removing all scripts and returning to a blank editor state. WORKFLOW TIP: After clearing, use earthEngineScript to write new code. WARNING: Do NOT use earthEngineRunCode immediately after this without writing code first.',
      inputSchema: z.object({}), // No parameters needed
      execute: async () => {
        // Manually send tool_start event
        if (onToolEvent) {
          onToolEvent({
            type: 'tool_start',
            toolName: 'clearScript',
            args: {},
            timestamp: Date.now()
          });
        }

        try {
          console.log(`🧹 [ClearScriptTool] Tool called to clear GEE code editor`);
          console.time('ClearScriptTool execution');

          if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.scripting) {
            console.warn('❌ [ClearScriptTool] Chrome API not available.');
            return { 
              success: false, 
              error: 'Chrome API not available for clear script tool',
              suggestion: 'This tool requires running in a Chrome extension environment'
            };
          }

          // Find the Earth Engine tab
          const earthEngineTabs = await new Promise<chrome.tabs.Tab[]>((resolve) => {
            chrome.tabs.query({ url: "*://code.earthengine.google.com/*" }, (tabs) => {
              resolve(tabs || []);
            });
          });

          if (earthEngineTabs.length === 0) {
            console.warn('❌ [ClearScriptTool] No Earth Engine tab found');
            return {
              success: false,
              error: 'No Google Earth Engine tab found',
              suggestion: "Please open Google Earth Engine (https://code.earthengine.google.com) in a browser tab first"
            };
          }

          // Smart tab selection: prefer active or recently used tab
          const selectedTab = selectBestEarthEngineTab(earthEngineTabs);
          const tabId = selectedTab?.id;
          if (!tabId) {
            console.warn('❌ [ClearScriptTool] Invalid Earth Engine tab');
            return {
              success: false,
              error: 'Invalid Earth Engine tab',
              suggestion: "Please reload your Earth Engine tab and try again"
            };
          }

          // Ensure content script is ready
          try {
            await new Promise<void>((resolve, reject) => {
              const timeout = setTimeout(() => reject(new Error('Content script ping timed out for ClearScriptTool')), 500);
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
            console.error('❌ [ClearScriptTool] Content script check/injection failed:', err);
            return { success: false, error: err instanceof Error ? err.message : 'Content script not available' };
          }

          // First try clicking the clear script directly (menu might already be accessible)
          console.log('🧹 [ClearScriptTool] Attempting direct clear script click...');
          let clearResult: { success: boolean; message?: string; error?: string } = await new Promise((resolve) => {
            chrome.tabs.sendMessage(tabId, { 
              type: 'CLICK_BY_SELECTOR', 
              payload: { 
                selector: 'div.goog-menuitem-content',
                elementDescription: 'Clear script menu option (direct)'
              } 
            }, (response) => {
              resolve(response || { success: false, error: 'No response from content script for direct clear' });
            });
          });

          if (clearResult.success) {
            console.log('✅ [ClearScriptTool] Direct clear script successful');
            console.timeEnd('ClearScriptTool execution');
            return {
              success: true,
              message: 'Google Earth Engine code editor has been cleared successfully. All scripts have been removed.',
              action: 'clear_completed'
            };
          }

          console.log('🧹 [ClearScriptTool] Direct click failed, trying dropdown approach...');
          
          // Step 1: Click the Reset dropdown arrow to open the menu using improved selector
          const dropdownSelectors = [
            'button.goog-button.reset-button + div.goog-inline-block.goog-flat-menu-button[role="button"]',
            'button[title="Clear map, inspector, and console"] + div.goog-inline-block.goog-flat-menu-button[role="button"]',
            '.goog-toolbar-menu-button'
          ];
          
          let dropdownResult: any = null;
          for (const selector of dropdownSelectors) {
            console.log(`🧹 [ClearScriptTool] Trying dropdown selector: ${selector}`);
            dropdownResult = await new Promise((resolve) => {
              chrome.tabs.sendMessage(tabId, { 
                type: 'CLICK_BY_SELECTOR', 
                payload: { 
                  selector: selector,
                  elementDescription: `Reset dropdown arrow (${selector})`
                } 
              }, (response) => {
                resolve(response || { success: false, error: `No response for selector: ${selector}` });
              });
            });
            
            if (dropdownResult.success) {
              console.log(`✅ [ClearScriptTool] Dropdown opened with selector: ${selector}`);
              break;
            } else {
              console.log(`❌ [ClearScriptTool] Selector failed: ${selector} - ${dropdownResult.error}`);
            }
          }
          
          if (dropdownResult && dropdownResult.success) {
            console.log('🧹 [ClearScriptTool] Reset dropdown opened successfully, waiting for menu...');
            // Wait for menu to appear
            await new Promise(resolve => setTimeout(resolve, 800));
            
            // Step 2: Click "Clear script" option in the dropdown menu
            console.log('🧹 [ClearScriptTool] Clicking Clear script option...');
            clearResult = await new Promise((resolve) => {
              chrome.tabs.sendMessage(tabId, { 
                type: 'CLICK_BY_SELECTOR', 
                payload: { 
                  selector: 'div.goog-menuitem-content',
                  elementDescription: 'Clear script menu option'
                } 
              }, (response) => {
                resolve(response || { success: false, error: 'No response from content script for clear menu option' });
              });
            });
            
            if (clearResult.success) {
              console.log('✅ [ClearScriptTool] Code cleared successfully');
              console.timeEnd('ClearScriptTool execution');
              return {
                success: true,
                message: 'Google Earth Engine code editor has been cleared successfully. All scripts have been removed.',
                action: 'clear_completed'
              };
            } else {
              console.warn('❌ [ClearScriptTool] Failed to click clear script option:', clearResult.error);
              console.timeEnd('ClearScriptTool execution');
              return {
                success: false,
                error: clearResult.error || 'Failed to click clear script option',
                suggestion: 'Make sure the dropdown menu is visible and the clear script option is available'
              };
            }
          } else {
            console.warn('❌ [ClearScriptTool] Failed to open reset dropdown with any selector');
            console.timeEnd('ClearScriptTool execution');
            return {
              success: false,
              error: 'Failed to open reset dropdown menu',
              suggestion: 'Make sure you are on the Google Earth Engine code editor page and the reset dropdown is visible'
            };
          }

        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`❌ [ClearScriptTool] Error:`, error);
          console.timeEnd('ClearScriptTool execution');
          return { 
            success: false, 
            error: `Error clearing GEE code editor: ${errorMessage}`,
            suggestion: 'Try refreshing the Google Earth Engine page and running the tool again'
          };
        }
      },
      toModelOutput: (result: any) => {
        return {
          type: 'content',
          value: [{
            type: 'text',
            text: result.success
              ? '✅ Google Earth Engine code editor has been cleared successfully. All scripts have been removed and you now have a blank editor.'
              : `❌ Failed to clear GEE code editor: ${result.error}${result.suggestion ? ' Suggestion: ' + result.suggestion : ''}`
          }]
        };
      },
    });

    // Define Click by Coordinates tool
    const clickByCoordinatesTool = tool({
      description: 'Clicks an element on the page at the specified (x, y) coordinates.',
      inputSchema: z.object({
        x: z.number().describe('The x-coordinate to click.'),
        y: z.number().describe('The y-coordinate to click.'),
      }),
      execute: async ({ x, y }) => {
        // Manually send tool_start event
        if (onToolEvent) {
          onToolEvent({
            type: 'tool_start',
            toolName: 'clickByCoordinates',
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
      toModelOutput: (result: any) => {
        return {
          type: 'content',
          value: [{ type: 'text', text: result.success ? (result.message || `Successfully clicked at coordinates (${result.x}, ${result.y}).`) : `Error clicking by coordinates: ${result.error}` }]
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

          // Validate Chrome APIs
          const apiValidation = validateChromeAPIs();
          if (!apiValidation.success) {
            console.warn(`❌ [GetConsoleOutputTool] ${apiValidation.error}`);
            return {
              success: false,
              error: apiValidation.error,
              suggestion: 'This tool requires running in a Chrome extension background script context'
            };
          }

          // Find the Earth Engine tab
          const earthEngineTabs = await new Promise<chrome.tabs.Tab[]>((resolve) => {
            chrome.tabs.query({ url: "*://code.earthengine.google.com/*" }, (tabs) => {
              resolve(tabs || []);
            });
          });

          if (earthEngineTabs.length === 0) {
            console.warn('❌ [GetConsoleOutputTool] No Earth Engine tab found');
            return {
              success: false,
              error: 'No Google Earth Engine tab found',
              suggestion: "Please open Google Earth Engine (https://code.earthengine.google.com) in a browser tab first"
            };
          }

          // Smart tab selection: prefer active or recently used tab
          const selectedTab = selectBestEarthEngineTab(earthEngineTabs);
          const tabId = selectedTab?.id;
          if (!tabId) {
            console.warn('❌ [GetConsoleOutputTool] Invalid Earth Engine tab');
            return {
              success: false,
              error: 'Invalid Earth Engine tab',
              suggestion: "Please reload your Earth Engine tab and try again"
            };
          }

          // Ensure content script is ready
          const scriptReady = await ensureContentScript(tabId);
          if (!scriptReady.success) {
            console.error('❌ [GetConsoleOutputTool] Content script not available:', scriptReady.error);
            return {
              success: false,
              error: scriptReady.error || 'Content script not available',
              suggestion: 'Try refreshing the Earth Engine tab'
            };
          }

          // Send message to content script to get console output
          console.log('📋 [GetConsoleOutputTool] Requesting console output from content script...');
          const result: any = await new Promise((resolve) => {
            chrome.tabs.sendMessage(tabId, { type: 'GET_CONSOLE_OUTPUT' }, (response) => {
              if (chrome.runtime.lastError) {
                resolve({
                  success: false,
                  error: chrome.runtime.lastError.message || 'Error communicating with content script'
                });
              } else {
                resolve(response || { success: false, error: 'No response from content script' });
              }
            });
          });

          console.timeEnd('GetConsoleOutputTool execution');

          if (!result.success) {
            console.warn(`❌ [GetConsoleOutputTool] Failed to get console output:`, result.error);
            return {
              success: false,
              error: result.error || 'Failed to read console output',
              suggestion: 'Make sure the Earth Engine editor is loaded and you have run some code'
            };
          }

          console.log(`✅ [GetConsoleOutputTool] Successfully read ${result.count} console entries`);
          return {
            success: true,
            outputs: result.outputs || [],
            count: result.count || 0,
            message: result.message || `Read ${result.count} console entries`
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
      toModelOutput: (result: any) => {
        if (!result.success) {
          return {
            type: 'content',
            value: [{
              type: 'text',
              text: `❌ Failed to read console: ${result.error}${result.suggestion ? '\n\nSuggestion: ' + result.suggestion : ''}`
            }]
          };
        }

        if (result.count === 0) {
          return {
            type: 'content',
            value: [{
              type: 'text',
              text: '📋 Console is empty. No output to display. Run some code first (e.g., print("Hello World")).'
            }]
          };
        }

        // Format console outputs with chart detection
        const formattedOutputs = result.outputs.map((output: any, i: number) => {
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
        const chartCount = result.outputs.filter((o: any) => o.type === 'chart').length;
        const chartNote = chartCount > 0
          ? `\n\n💡 Tip: ${chartCount} chart(s) detected. Use the screenshot tool to capture and view the visualizations.`
          : '';

        return {
          type: 'content',
          value: [{
            type: 'text',
            text: `📋 Console Output (${result.count} entries):\n\n${formattedOutputs}${chartNote}`
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
          console.time('GetScriptTool execution');

          // Validate Chrome APIs
          const apiValidation = validateChromeAPIs();
          if (!apiValidation.success) {
            console.warn(`❌ [GetScriptTool] ${apiValidation.error}`);
            return {
              success: false,
              error: apiValidation.error,
              suggestion: 'This tool requires running in a Chrome extension background script context'
            };
          }

          // Find the Earth Engine tab
          const earthEngineTabs = await new Promise<chrome.tabs.Tab[]>((resolve) => {
            chrome.tabs.query({ url: "*://code.earthengine.google.com/*" }, (tabs) => {
              resolve(tabs || []);
            });
          });

          if (earthEngineTabs.length === 0) {
            console.warn('❌ [GetScriptTool] No Earth Engine tab found');
            return {
              success: false,
              error: 'No Google Earth Engine tab found',
              suggestion: "Please open Google Earth Engine (https://code.earthengine.google.com) in a browser tab first"
            };
          }

          // Smart tab selection: prefer active or recently used tab
          const selectedTab = selectBestEarthEngineTab(earthEngineTabs);
          const tabId = selectedTab?.id;
          if (!tabId) {
            console.warn('❌ [GetScriptTool] Invalid Earth Engine tab');
            return {
              success: false,
              error: 'Invalid Earth Engine tab',
              suggestion: "Please reload your Earth Engine tab and try again"
            };
          }

          // Ensure content script is ready
          const scriptReady = await ensureContentScript(tabId);
          if (!scriptReady.success) {
            console.error('❌ [GetScriptTool] Content script not available:', scriptReady.error);
            return {
              success: false,
              error: scriptReady.error || 'Content script not available',
              suggestion: 'Try refreshing the Earth Engine tab'
            };
          }

          // Send message to content script to get the script
          console.log('📖 [GetScriptTool] Requesting script content from content script...');
          const result: any = await new Promise((resolve) => {
            chrome.tabs.sendMessage(tabId, { type: 'GET_SCRIPT' }, (response) => {
              if (chrome.runtime.lastError) {
                resolve({
                  success: false,
                  error: chrome.runtime.lastError.message || 'Error communicating with content script'
                });
              } else {
                resolve(response || { success: false, error: 'No response from content script' });
              }
            });
          });

          console.timeEnd('GetScriptTool execution');

          if (!result.success) {
            console.warn(`❌ [GetScriptTool] Failed to get script:`, result.error);
            return {
              success: false,
              error: result.error || 'Failed to read script from editor',
              suggestion: 'Make sure the Earth Engine editor is loaded and the code editor is visible'
            };
          }

          console.log(`✅ [GetScriptTool] Successfully read script: ${result.lineCount} lines, ${result.content?.length || 0} characters`);
          return {
            success: true,
            content: result.content || '',
            lineCount: result.lineCount || 0,
            method: result.method,
            message: `Successfully read ${result.lineCount} lines of code from the Earth Engine editor`
          };

        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`❌ [GetScriptTool] Error:`, error);
          console.timeEnd('GetScriptTool execution');
          return {
            success: false,
            error: `Error reading GEE code editor: ${errorMessage}`,
            suggestion: 'Try refreshing the Google Earth Engine page and running the tool again'
          };
        }
      },
      toModelOutput: (result: any) => {
        return {
          type: 'content',
          value: [{
            type: 'text',
            text: result.success
              ? `✅ Current script content (${result.lineCount} lines):\n\n\`\`\`javascript\n${result.content}\n\`\`\``
              : `❌ Failed to read script: ${result.error}${result.suggestion ? '\n\nSuggestion: ' + result.suggestion : ''}`
          }]
        };
      },
    });

  // Define Inspect Map tool
  // Define Get Map Info tool
  const getMapInfoTool = tool({
    description: 'Get information about the Google Earth Engine map including current layers, bounds, center coordinates, and viewport dimensions. WORKFLOW TIP: Use this after earthEngineRunCode to verify visualization layers were created.',
    inputSchema: z.object({}),
    execute: async () => {
      // Manually send tool_start event
      if (onToolEvent) {
        onToolEvent({
          type: 'tool_start',
          toolName: 'getMapInfo',
          args: {},
          timestamp: Date.now()
        });
      }

      try {
        console.log(`🗺️ [GetMapInfoTool] Getting map information...`);
        console.time('GetMapInfoTool execution');

        // Validate Chrome APIs
        const apiValidation = validateChromeAPIs();
        if (!apiValidation.success) {
          console.warn(`❌ [GetMapInfoTool] ${apiValidation.error}`);
          return {
            success: false,
            error: apiValidation.error
          };
        }

        // Find the Earth Engine tab
        const earthEngineTabs = await new Promise<chrome.tabs.Tab[]>((resolve) => {
          chrome.tabs.query({ url: "*://code.earthengine.google.com/*" }, (tabs) => {
            resolve(tabs || []);
          });
        });

        if (earthEngineTabs.length === 0) {
          console.warn('❌ [GetMapInfoTool] No Earth Engine tab found');
          return {
            success: false,
            error: 'No Google Earth Engine tab found'
          };
        }

        const selectedTab = selectBestEarthEngineTab(earthEngineTabs);
        const tabId = selectedTab?.id;
        if (!tabId) {
          console.warn('❌ [GetMapInfoTool] Invalid Earth Engine tab');
          return {
            success: false,
            error: 'Invalid Earth Engine tab'
          };
        }

        // Ensure content script is loaded
        const contentScriptReady = await ensureContentScript(tabId);
        if (!contentScriptReady.success) {
          console.warn(`❌ [GetMapInfoTool] ${contentScriptReady.error}`);
          return {
            success: false,
            error: contentScriptReady.error
          };
        }

        // Send message to content script to get map info
        const result: any = await new Promise((resolve) => {
          chrome.tabs.sendMessage(tabId, { type: 'GET_MAP_INFO' }, (response) => {
            if (chrome.runtime.lastError) {
              resolve({ success: false, error: chrome.runtime.lastError.message || 'Error communicating with content script' });
            } else {
              resolve(response || { success: false, error: 'No response from content script' });
            }
          });
        });

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
    toModelOutput: (result: any) => {
      if (!result.success) {
        return {
          type: 'content',
          value: [{
            type: 'text',
            text: `❌ Failed to get map info: ${result.error}`
          }]
        };
      }

      const data = result.data;
      const output = `✅ Map Information:

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
        value: [{ type: 'text', text: output }]
      };
    },
  });

  // Define Get Inspector Output tool (renamed from inspectMapTool for consistency)
  const getInspectorOutputTool = tool({
    description: `Get complete information from the Google Earth Engine Inspector panel including Point data, Pixel values, and Object metadata (CRS/EPSG, transform, dimensions, etc.).

WORKFLOW TIP: Use clickByCoordinates BEFORE this tool to activate the Inspector at specific coordinates.

IMPORTANT REQUIREMENTS:
1. User must manually click on the map OR you must use clickByCoordinates tool to populate the Inspector panel
2. User must manually expand the Objects section in the Inspector panel (click on "Objects" to expand it)
3. Once expanded, this tool will extract all visible data including EPSG, CRS transform, data type, dimensions, origin, and properties

The Objects section uses on-demand rendering and will NOT appear unless manually expanded by the user. If you need CRS/EPSG information, explicitly ask the user to expand the Objects section before calling this tool.`,
    inputSchema: z.object({
      coordinates: z.object({
        lat: z.number().describe('Latitude of the location to inspect'),
        lng: z.number().describe('Longitude of the location to inspect')
      }).optional().describe('Optional coordinates to verify against Inspector data. If provided, tool will check that Inspector shows data for these coordinates (within ~10km tolerance).')
    }),
    execute: async ({ coordinates }) => {
      // Manually send tool_start event
      if (onToolEvent) {
        onToolEvent({
          type: 'tool_start',
          toolName: 'getInspectorOutput',
          args: { coordinates },
          timestamp: Date.now()
        });
      }

      try {
        console.log(`🔍 [InspectMapTool] Tool called${coordinates ? ` with coordinates: lat=${coordinates.lat}, lng=${coordinates.lng}` : ' without coordinates'}`);
        console.time('InspectMapTool execution');

        // Validate Chrome APIs
        const apiValidation = validateChromeAPIs();
        if (!apiValidation.success) {
          console.warn(`❌ [InspectMapTool] ${apiValidation.error}`);
          return {
            success: false,
            error: apiValidation.error,
            suggestion: 'This tool requires running in a Chrome extension background script context'
          };
        }

        // Find the Earth Engine tab
        const earthEngineTabs = await new Promise<chrome.tabs.Tab[]>((resolve) => {
          chrome.tabs.query({ url: "*://code.earthengine.google.com/*" }, (tabs) => {
            resolve(tabs || []);
          });
        });

        if (earthEngineTabs.length === 0) {
          console.warn('❌ [InspectMapTool] No Earth Engine tab found');
          return {
            success: false,
            error: 'No Google Earth Engine tab found',
            suggestion: "Please open Google Earth Engine (https://code.earthengine.google.com) in a browser tab first"
          };
        }

        // Smart tab selection: prefer active or recently used tab
        const selectedTab = selectBestEarthEngineTab(earthEngineTabs);
        const tabId = selectedTab?.id;
        if (!tabId) {
          console.warn('❌ [InspectMapTool] Invalid Earth Engine tab');
          return {
            success: false,
            error: 'Invalid Earth Engine tab',
            suggestion: "Please reload your Earth Engine tab and try again"
          };
        }

        console.log(`🔍 [InspectMapTool] Found Earth Engine tab: ${tabId}`);

        // Ensure content script is loaded
        const contentScriptReady = await ensureContentScript(tabId);
        if (!contentScriptReady.success) {
          console.warn(`❌ [InspectMapTool] ${contentScriptReady.error}`);
          return {
            success: false,
            error: contentScriptReady.error,
            suggestion: 'Try refreshing the Earth Engine tab and ensure the extension has permission'
          };
        }

        // Send message to content script to read Inspector data
        const result: any = await new Promise((resolve) => {
          chrome.tabs.sendMessage(tabId, { type: 'INSPECT_MAP', coordinates }, (response) => {
            if (chrome.runtime.lastError) {
              resolve({ success: false, error: chrome.runtime.lastError.message || 'Error communicating with content script' });
            } else {
              resolve(response || { success: false, error: 'No response from content script' });
            }
          });
        });

        console.timeEnd('InspectMapTool execution');

        if (!result.success) {
          console.warn(`❌ [InspectMapTool] Failed to inspect map:`, result.error);
          return {
            success: false,
            error: result.error || 'Failed to read Inspector data',
            suggestion: result.error?.includes('Inspector is empty')
              ? 'Make sure to manually click on the map at the desired location first, then try again'
              : result.error?.includes('different from requested')
              ? 'Click on the map at the correct location first'
              : 'Ensure the Inspector tab is activated and you have clicked on the map',
            data: result.data
          };
        }

        console.log(`✅ [InspectMapTool] Successfully read Inspector data: ${result.data?.layerCount || 0} layers at (${result.data?.inspectedCoordinates?.lng}, ${result.data?.inspectedCoordinates?.lat})`);
        return {
          success: true,
          data: result.data,
          message: `Successfully read ${result.data?.layerCount || 0} layers from Inspector at coordinates (${result.data?.inspectedCoordinates?.lng}, ${result.data?.inspectedCoordinates?.lat})`
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
    toModelOutput: (result: any) => {
      if (!result.success) {
        return {
          type: 'content',
          value: [{
            type: 'text',
            text: `❌ Failed to inspect map: ${result.error}${result.suggestion ? '\n\nSuggestion: ' + result.suggestion : ''}`
          }]
        };
      }

      const data = result.data;
      let output = `✅ Inspector Data at (${data.inspectedCoordinates.lng}, ${data.inspectedCoordinates.lat}):\n\n`;

      // Include Point information
      if (data.point) {
        output += `**Point Information:**\n`;
        Object.entries(data.point).forEach(([key, value]) => {
          output += `  - ${key}: ${value}\n`;
        });
        output += '\n';
      }

      // Include Pixels section
      if (data.pixels && data.pixels.length > 0) {
        output += `**Pixel Values:**\n`;
        data.pixels.forEach((pixel: any, i: number) => {
          output += `  Layer ${i + 1}: ${pixel.layerName}\n`;
          if (pixel.data !== null && pixel.data !== undefined) {
            if (typeof pixel.data === 'object') {
              output += `    ${JSON.stringify(pixel.data, null, 2).split('\n').join('\n    ')}\n`;
            } else {
              output += `    Value: ${pixel.data}\n`;
            }
          }
        });
        output += '\n';
      }

      // Include Objects section (with EPSG data)
      if (data.objects && data.objects.length > 0) {
        output += `**Object Metadata (includes CRS/EPSG):**\n`;
        data.objects.forEach((obj: any, i: number) => {
          output += `  Layer ${i + 1}: ${obj.layerName}\n`;
          if (obj.data) {
            const jsonStr = JSON.stringify(obj.data, null, 2);
            output += `    ${jsonStr.split('\n').join('\n    ')}\n`;
          }
        });
        output += '\n';
      }

      // Add suggestion if Objects section is empty
      if (result.suggestion) {
        output += `\n⚠️ **Note:** ${result.suggestion}\n`;
      }

      return {
        type: 'content',
        value: [{ type: 'text', text: output }]
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

    // Simplified code editing tools (Claude Code-style) - PRIMARY
    readCodeTool,
    editCodeTool,
    insertAtLineTool,
    undoEditTool,

    // Earth Engine tools
    earthEngineDatasetTool,
    earthEngineScriptTool,  // Legacy: full replacement (kept for backwards compatibility)
    earthEngineRunCodeTool,

    // Browser interaction tools
    screenshotTool,
    snapshotTool,
    clickByRefIdTool,
    clickByCoordinatesTool,

    // Earth Engine state tools
    resetMapInspectorConsoleTool,
    clearScriptTool,
    getConsoleOutputTool,
    getScriptTool,
    getMapInfoTool,
    getInspectorOutputTool
  };
}
