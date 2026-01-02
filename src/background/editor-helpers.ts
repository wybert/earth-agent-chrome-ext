/**
 * Helper functions to access Earth Engine Ace Editor by executing code in the MAIN world.
 *
 * Context: Content scripts run in an "isolated world" and can't access page JavaScript variables
 * like `element.env.editor`. Using `world: 'MAIN'` allows us to execute code in the page's context
 * and access the Ace Editor API directly.
 *
 * IMPORTANT: Functions passed to chrome.scripting.executeScript must be proper function
 * declarations (not dynamically created with new Function()) for reliable serialization.
 */

import { selectBestEarthEngineTab, validateChromeAPIs } from '@/lib/utils';

/**
 * Function to execute in MAIN world for getting editor content.
 * This is a proper function declaration that Chrome can serialize reliably.
 * MUST be self-contained with no external references.
 */
function getEditorContentInPage(): { success: boolean; content?: string; error?: string } {
  try {
    const el = document.querySelector('.ace_editor');
    if (!el) return { success: false, error: 'No .ace_editor found' };
    const editor = (el as any).env?.editor || (el as any).__ace_editor__;
    if (!editor) return { success: false, error: 'No editor instance found' };
    if (!editor.getValue) return { success: false, error: 'Editor does not have getValue' };
    const content = editor.getValue();
    return { success: true, content: content };
  } catch (e: any) {
    return { success: false, error: e.message || String(e) };
  }
}

/**
 * Function to execute in MAIN world for setting editor content.
 * This is a proper function declaration that Chrome can serialize reliably.
 * MUST be self-contained with no external references.
 */
function setEditorContentInPage(content: string): { success: boolean; error?: string } {
  try {
    const el = document.querySelector('.ace_editor');
    if (!el) return { success: false, error: 'No .ace_editor found' };
    const editor = (el as any).env?.editor || (el as any).__ace_editor__;
    if (!editor) return { success: false, error: 'No editor instance found' };
    if (!editor.setValue) return { success: false, error: 'Editor does not have setValue' };
    editor.setValue(content, -1);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || String(e) };
  }
}

export interface EditorContentResult {
  success: boolean;
  content?: string;
  error?: string;
}

export interface SetEditorContentResult {
  success: boolean;
  error?: string;
}

/**
 * Get the current Earth Engine editor content by executing in MAIN world
 */
export async function getEditorContent(tabId?: number): Promise<EditorContentResult> {
  // Validate Chrome APIs
  const apiCheck = validateChromeAPIs();
  if (!apiCheck.success) {
    return { success: false, error: apiCheck.error };
  }

  // Find Earth Engine tab
  const targetTab = tabId
    ? await chrome.tabs.get(tabId)
    : await selectBestEarthEngineTab(await chrome.tabs.query({}));

  if (!targetTab) {
    return { success: false, error: 'No Earth Engine tab found' };
  }

  try {
    // Execute script in MAIN world to access page JavaScript
    // Using a proper function declaration (not new Function()) for reliable serialization
    const results = await chrome.scripting.executeScript({
      target: { tabId: targetTab.id as number },
      world: 'MAIN', // Execute in page's main world, not isolated content script world
      func: getEditorContentInPage,
    });

    if (results && results[0] && results[0].result) {
      return results[0].result as EditorContentResult;
    }

    return { success: false, error: 'No result from script execution' };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Set the Earth Engine editor content by executing in MAIN world
 */
export async function setEditorContent(content: string, tabId?: number): Promise<SetEditorContentResult> {
  // Validate Chrome APIs
  const apiCheck = validateChromeAPIs();
  if (!apiCheck.success) {
    return { success: false, error: apiCheck.error };
  }

  // Find Earth Engine tab
  const targetTab = tabId
    ? await chrome.tabs.get(tabId)
    : await selectBestEarthEngineTab(await chrome.tabs.query({}));

  if (!targetTab) {
    return { success: false, error: 'No Earth Engine tab found' };
  }

  try {
    // Execute script in MAIN world to access page JavaScript
    // Using a proper function declaration (not new Function()) for reliable serialization
    const results = await chrome.scripting.executeScript({
      target: { tabId: targetTab.id as number },
      world: 'MAIN',
      func: setEditorContentInPage,
      args: [content],
    });

    if (results && results[0] && results[0].result) {
      return results[0].result as SetEditorContentResult;
    }

    return { success: false, error: 'No result from script execution' };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
