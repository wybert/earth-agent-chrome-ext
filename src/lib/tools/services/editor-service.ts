import { shadowWorkspaceSingleton } from '../../../background/shadow-workspace';
import { getEditorContent, setEditorContent } from '../../../background/editor-helpers';

export interface EditorResult {
  success: boolean;
  message?: string;
  error?: string;
  content?: string;
  lineCount?: number;
  diff?: any;
  replacements?: number;
  suggestion?: string;
}

export async function readCode(tabId: number): Promise<EditorResult> {
  const result = await getEditorContent(tabId);
  if (!result.success || result.content === undefined) {
    return { success: false, error: result.error || 'Failed to read editor content' };
  }

  const content = result.content;
  const lineCount = content.split('\n').length;

  // Update shadow workspace
  const state = shadowWorkspaceSingleton.setFromEditor(
    tabId,
    'current_editor',
    content,
    'readCode sync'
  );
  shadowWorkspaceSingleton.markSynced(tabId, state.scriptId);

  return {
    success: true,
    content,
    lineCount,
    message: `Read ${lineCount} lines from editor`,
  };
}

export async function writeCode(tabId: number, content: string): Promise<EditorResult> {
  const scriptId = 'current_editor';

  // Set the new content in shadow workspace
  shadowWorkspaceSingleton.setFromEditor(tabId, scriptId, content, 'writeCode');

  // Sync to editor
  const syncResult = await setEditorContent(content, tabId);
  if (!syncResult.success) {
    return { success: false, error: syncResult.error };
  }

  shadowWorkspaceSingleton.markSynced(tabId, scriptId);
  const newLineCount = content.split('\n').length;

  return {
    success: true,
    message: `Wrote ${newLineCount} lines to editor`,
  };
}

export async function editCode(
  tabId: number,
  oldString: string,
  newString: string,
  replaceAll: boolean = false
): Promise<EditorResult> {
  const scriptId = 'current_editor';

  // 1. Sync from editor
  const fetchResult = await getEditorContent(tabId);
  if (!fetchResult.success || fetchResult.content === undefined) {
    return { success: false, error: 'Failed to read code from editor' };
  }

  const syncedState = shadowWorkspaceSingleton.setFromEditor(
    tabId,
    scriptId,
    fetchResult.content,
    'pre-edit sync'
  );
  shadowWorkspaceSingleton.markSynced(tabId, syncedState.scriptId);

  // 2. Apply edit to shadow
  const editResult = shadowWorkspaceSingleton.edit(
    tabId,
    scriptId,
    oldString,
    newString,
    replaceAll,
    'editCode'
  );

  if (!editResult.success) {
    if (editResult.error === 'not_found') {
      return {
        success: false,
        error: 'old_string not found',
        suggestion: 'Use readCode to see current content',
      };
    }
    if (editResult.error === 'not_unique') {
      return {
        success: false,
        error: `old_string appears ${editResult.count} times`,
        suggestion: 'Include more context or set replace_all: true',
      };
    }
    return { success: false, error: editResult.error };
  }

  // 3. Generate diff
  const diff = shadowWorkspaceSingleton.diffSinceSynced(tabId, scriptId);

  // 4. Sync to editor
  const newContent = editResult.state?.content || '';
  const syncResult = await setEditorContent(newContent, tabId);

  if (!syncResult.success) {
    shadowWorkspaceSingleton.undo(tabId, scriptId);
    return { success: false, error: syncResult.error };
  }

  shadowWorkspaceSingleton.markSynced(tabId, scriptId);

  return {
    success: true,
    replacements: editResult.count,
    diff: {
      summary: {
        added: diff.summary.added,
        removed: diff.summary.removed,
        hunks: diff.hunks.length,
      },
      hunks: diff.hunks,
    },
    message: `Successfully edited code: +${diff.summary.added} -${diff.summary.removed} lines`,
  };
}

export async function undoEdit(tabId: number): Promise<EditorResult> {
  const scriptId = 'current_editor';
  const beforeState = shadowWorkspaceSingleton.getOrCreate(tabId, scriptId);

  if (beforeState.head <= 0) {
    return { success: false, error: 'Nothing to undo' };
  }

  const afterState = shadowWorkspaceSingleton.undo(tabId, scriptId);
  const syncResult = await setEditorContent(afterState.content, tabId);

  if (!syncResult.success) {
    shadowWorkspaceSingleton.redo(tabId, scriptId);
    return { success: false, error: syncResult.error };
  }

  shadowWorkspaceSingleton.markSynced(tabId, scriptId);

  return {
    success: true,
    message: 'Undo successful',
    lineCount: afterState.content.split('\n').length,
  };
}

export async function insertAtLine(
  tabId: number,
  line: number,
  text: string
): Promise<EditorResult> {
  const scriptId = 'current_editor';

  // 1. Sync
  const fetchResult = await getEditorContent(tabId);
  if (!fetchResult.success || fetchResult.content === undefined) {
    return { success: false, error: 'Failed to read code' };
  }

  const syncedState = shadowWorkspaceSingleton.setFromEditor(
    tabId,
    scriptId,
    fetchResult.content,
    'pre-insert sync'
  );
  shadowWorkspaceSingleton.markSynced(tabId, syncedState.scriptId);

  // 2. Insert
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

  // 3. Diff
  const diff = shadowWorkspaceSingleton.diffSinceSynced(tabId, scriptId);

  // 4. Sync to editor
  const newContent = insertResult.state?.content || '';
  const syncResult = await setEditorContent(newContent, tabId);

  if (!syncResult.success) {
    shadowWorkspaceSingleton.undo(tabId, scriptId);
    return { success: false, error: syncResult.error };
  }

  shadowWorkspaceSingleton.markSynced(tabId, scriptId);

  return {
    success: true,
    diff: {
      summary: {
        added: diff.summary.added,
        removed: diff.summary.removed,
        hunks: diff.hunks.length,
      },
      hunks: diff.hunks,
    },
    message: `Inserted text at line ${line}`,
  };
}
