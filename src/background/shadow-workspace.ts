import type { ToolKey } from '@/types/extension';

export interface ShadowLocation {
  line: number; // 1-based
  col: number; // 1-based
}

export interface ShadowRange {
  start: ShadowLocation;
  end: ShadowLocation;
}

export interface ShadowMatch {
  start: ShadowLocation;
  end: ShadowLocation;
  preview: string;
}

interface ShadowCommit {
  content: string;
  timestamp: number;
  message: string;
  source: 'editor' | 'agent' | 'system';
}

export interface ShadowFileState {
  tabId: number;
  scriptId: string;
  version: number;
  content: string;
  commits: ShadowCommit[];
  head: number; // index into commits
  lastSyncedVersion: number;
  lastSyncedContent: string;
}

export class ShadowWorkspace {
  private files = new Map<string, ShadowFileState>();

  private key(tabId: number, scriptId: string) {
    return `${tabId}:${scriptId}`;
  }

  getOrCreate(tabId: number, scriptId = 'current_editor'): ShadowFileState {
    const k = this.key(tabId, scriptId);
    const existing = this.files.get(k);
    if (existing) return existing;

    const now = Date.now();
    const initial: ShadowFileState = {
      tabId,
      scriptId,
      version: 0,
      content: '',
      commits: [{ content: '', timestamp: now, message: 'init', source: 'system' }],
      head: 0,
      lastSyncedVersion: 0,
      lastSyncedContent: '',
    };
    this.files.set(k, initial);
    return initial;
  }

  setFromEditor(tabId: number, scriptId: string, content: string, message = 'sync from editor'): ShadowFileState {
    const state = this.getOrCreate(tabId, scriptId);
    if (content === state.content) return state;
    return this.commit(tabId, scriptId, content, message, 'editor');
  }

  commit(tabId: number, scriptId: string, content: string, message: string, source: ShadowCommit['source']): ShadowFileState {
    const state = this.getOrCreate(tabId, scriptId);
    const nextVersion = state.version + 1;
    const now = Date.now();

    const nextCommits = state.commits.slice(0, state.head + 1);
    nextCommits.push({ content, timestamp: now, message, source });

    const next: ShadowFileState = {
      ...state,
      version: nextVersion,
      content,
      commits: nextCommits,
      head: nextCommits.length - 1,
    };
    this.files.set(this.key(tabId, scriptId), next);
    return next;
  }

  markSynced(tabId: number, scriptId: string): ShadowFileState {
    const state = this.getOrCreate(tabId, scriptId);
    const next = { ...state, lastSyncedVersion: state.version, lastSyncedContent: state.content };
    this.files.set(this.key(tabId, scriptId), next);
    return next;
  }

  undo(tabId: number, scriptId: string): ShadowFileState {
    const state = this.getOrCreate(tabId, scriptId);
    if (state.head <= 0) return state;
    const nextHead = state.head - 1;
    const nextContent = state.commits[nextHead].content;
    const next: ShadowFileState = { ...state, head: nextHead, content: nextContent, version: state.version + 1 };
    this.files.set(this.key(tabId, scriptId), next);
    return next;
  }

  redo(tabId: number, scriptId: string): ShadowFileState {
    const state = this.getOrCreate(tabId, scriptId);
    if (state.head >= state.commits.length - 1) return state;
    const nextHead = state.head + 1;
    const nextContent = state.commits[nextHead].content;
    const next: ShadowFileState = { ...state, head: nextHead, content: nextContent, version: state.version + 1 };
    this.files.set(this.key(tabId, scriptId), next);
    return next;
  }

  applyRangePatch(
    tabId: number,
    scriptId: string,
    range: ShadowRange,
    replacement: string,
    message = 'apply range patch'
  ): ShadowFileState {
    const state = this.getOrCreate(tabId, scriptId);
    const nextContent = applyRangeToText(state.content, range, replacement);
    return this.commit(tabId, scriptId, nextContent, message, 'agent');
  }

  search(tabId: number, scriptId: string, query: string, maxResults = 20): ShadowMatch[] {
    const state = this.getOrCreate(tabId, scriptId);
    if (!query) return [];

    const matches: ShadowMatch[] = [];
    const text = state.content;
    let idx = 0;
    while (idx < text.length && matches.length < maxResults) {
      const found = text.indexOf(query, idx);
      if (found === -1) break;
      const start = indexToLineCol(text, found);
      const end = indexToLineCol(text, found + query.length);
      const previewStart = Math.max(0, found - 40);
      const previewEnd = Math.min(text.length, found + query.length + 40);
      matches.push({
        start,
        end,
        preview: text.slice(previewStart, previewEnd).replace(/\n/g, '\\n'),
      });
      idx = found + Math.max(1, query.length);
    }
    return matches;
  }

  replaceAll(tabId: number, scriptId: string, query: string, replacement: string, message = 'replace all'): ShadowFileState {
    const state = this.getOrCreate(tabId, scriptId);
    if (!query) return state;
    const nextContent = state.content.split(query).join(replacement);
    if (nextContent === state.content) return state;
    return this.commit(tabId, scriptId, nextContent, message, 'agent');
  }

  patchByMatchIndex(
    tabId: number,
    scriptId: string,
    query: string,
    matchIndex: number,
    replacement: string,
    message = 'patch by match index'
  ): ShadowFileState {
    const state = this.getOrCreate(tabId, scriptId);
    if (!query) return state;
    const occurrences: number[] = [];
    let idx = 0;
    while (idx < state.content.length) {
      const found = state.content.indexOf(query, idx);
      if (found === -1) break;
      occurrences.push(found);
      idx = found + Math.max(1, query.length);
    }
    const oneBased = Math.max(1, matchIndex);
    const offset = occurrences[oneBased - 1];
    if (offset === undefined) return state;
    const range: ShadowRange = {
      start: indexToLineCol(state.content, offset),
      end: indexToLineCol(state.content, offset + query.length),
    };
    const nextContent = applyRangeToText(state.content, range, replacement);
    return this.commit(tabId, scriptId, nextContent, message, 'agent');
  }

  /**
   * Claude Code-style edit: replace old_string with new_string.
   * Returns an object with success status and details.
   *
   * Behavior:
   * - If old_string is not found: returns { success: false, error: 'not_found' }
   * - If old_string appears multiple times and replaceAll is false: returns { success: false, error: 'not_unique', count }
   * - If old_string === new_string: returns { success: false, error: 'no_change' }
   * - Otherwise: performs replacement and returns { success: true, state }
   */
  edit(
    tabId: number,
    scriptId: string,
    oldString: string,
    newString: string,
    replaceAll = false,
    message = 'edit'
  ): { success: boolean; error?: string; count?: number; state?: ShadowFileState } {
    const state = this.getOrCreate(tabId, scriptId);

    // Count occurrences
    let count = 0;
    let idx = 0;
    while (idx < state.content.length) {
      const found = state.content.indexOf(oldString, idx);
      if (found === -1) break;
      count++;
      idx = found + Math.max(1, oldString.length);
    }

    // Validate
    if (count === 0) {
      return { success: false, error: 'not_found', count: 0 };
    }

    if (oldString === newString) {
      return { success: false, error: 'no_change', count };
    }

    if (count > 1 && !replaceAll) {
      return { success: false, error: 'not_unique', count };
    }

    // Perform replacement
    let nextContent: string;
    if (replaceAll) {
      nextContent = state.content.split(oldString).join(newString);
    } else {
      // Replace first (and only) occurrence
      const pos = state.content.indexOf(oldString);
      nextContent = state.content.slice(0, pos) + newString + state.content.slice(pos + oldString.length);
    }

    const nextState = this.commit(tabId, scriptId, nextContent, message, 'agent');
    return { success: true, count, state: nextState };
  }

  /**
   * Insert text at a specific line number.
   * Line numbers are 1-based. Line 0 means "at the very beginning".
   * Line 1 means "before line 1" (same as line 0).
   * Line N means "after line N-1, before line N".
   * If line > total lines, appends at the end.
   */
  insertAtLine(
    tabId: number,
    scriptId: string,
    line: number,
    text: string,
    message = 'insert at line'
  ): { success: boolean; state?: ShadowFileState; lineCount?: number } {
    const state = this.getOrCreate(tabId, scriptId);
    const lines = state.content.split('\n');
    const totalLines = lines.length;

    // Normalize line number (1-based, 0 means beginning)
    const insertIndex = Math.max(0, Math.min(line <= 0 ? 0 : line - 1, totalLines));

    // Strip only ONE trailing newline to prevent accidental empty lines
    // AI models often pass "// comment\n" instead of "// comment"
    // If AI intentionally wants an empty line, they can pass "// comment\n\n"
    const normalizedText = text.replace(/\n$/, '');

    // Insert the text
    const textLines = normalizedText.split('\n');
    lines.splice(insertIndex, 0, ...textLines);

    const nextContent = lines.join('\n');
    const nextState = this.commit(tabId, scriptId, nextContent, message, 'agent');

    return {
      success: true,
      state: nextState,
      lineCount: nextState.content.split('\n').length
    };
  }

  diffSinceSynced(tabId: number, scriptId: string) {
    const state = this.getOrCreate(tabId, scriptId);
    const oldLines = (state.lastSyncedContent ?? '').split('\n');
    const newLines = (state.content ?? '').split('\n');
    const ops = diffLinesMyers(oldLines, newLines);
    const hunks = buildHunksFromOps(ops, 3);

    const summary = hunks.reduce(
      (acc, h) => {
        for (const l of h.lines) {
          if (l.type === 'insert') acc.added += 1;
          if (l.type === 'delete') acc.removed += 1;
        }
        return acc;
      },
      { added: 0, removed: 0, hunks: hunks.length }
    );

    return { summary, hunks };
  }

  listAvailableTools(): ToolKey[] {
    // Not strictly used yet; placeholder if you want to expose workspace tools in profiles later.
    return [];
  }
}

export function lineColToIndex(text: string, loc: ShadowLocation): number {
  const line = Math.max(1, loc.line);
  const col = Math.max(1, loc.col);
  let currentLine = 1;
  let index = 0;

  while (currentLine < line && index < text.length) {
    const nextNewline = text.indexOf('\n', index);
    if (nextNewline === -1) {
      index = text.length;
      break;
    }
    index = nextNewline + 1;
    currentLine += 1;
  }

  return Math.min(text.length, index + (col - 1));
}

export function indexToLineCol(text: string, index: number): ShadowLocation {
  const safeIndex = Math.max(0, Math.min(text.length, index));
  let line = 1;
  let lastNewline = -1;
  for (let i = 0; i < safeIndex; i++) {
    if (text.charCodeAt(i) === 10) {
      line += 1;
      lastNewline = i;
    }
  }
  return { line, col: safeIndex - lastNewline };
}

export function applyRangeToText(text: string, range: ShadowRange, replacement: string): string {
  const startIdx = lineColToIndex(text, range.start);
  const endIdx = lineColToIndex(text, range.end);
  const a = Math.min(startIdx, endIdx);
  const b = Math.max(startIdx, endIdx);
  return text.slice(0, a) + replacement + text.slice(b);
}

export const shadowWorkspaceSingleton = new ShadowWorkspace();

type DiffOp =
  | { type: 'equal'; lines: string[] }
  | { type: 'delete'; lines: string[] }
  | { type: 'insert'; lines: string[] };

function diffLinesMyers(a: string[], b: string[]): DiffOp[] {
  const n = a.length;
  const m = b.length;
  const max = n + m;
  const v = new Map<number, number>();
  v.set(1, 0);
  const trace: Map<number, number>[] = [];

  for (let d = 0; d <= max; d++) {
    const snapshot = new Map(v);
    trace.push(snapshot);
    for (let k = -d; k <= d; k += 2) {
      const vKMinus = v.get(k - 1);
      const vKPlus = v.get(k + 1);
      let x: number;
      if (k === -d || (k !== d && (vKMinus ?? -1) < (vKPlus ?? -1))) {
        x = vKPlus ?? 0;
      } else {
        x = (vKMinus ?? 0) + 1;
      }
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) {
        x++;
        y++;
      }
      v.set(k, x);
      if (x >= n && y >= m) {
        return backtrack(trace, a, b);
      }
    }
  }
  return [{ type: 'delete', lines: a }, { type: 'insert', lines: b }];
}

function backtrack(trace: Map<number, number>[], a: string[], b: string[]): DiffOp[] {
  let x = a.length;
  let y = b.length;
  const ops: Array<{ type: 'equal' | 'delete' | 'insert'; line: string }> = [];

  for (let d = trace.length - 1; d >= 0; d--) {
    const v = trace[d];
    const k = x - y;
    const prevK =
      k === -d || (k !== d && (v.get(k - 1) ?? -1) < (v.get(k + 1) ?? -1)) ? k + 1 : k - 1;
    const prevX = v.get(prevK) ?? 0;
    const prevY = prevX - prevK;

    while (x > prevX && y > prevY) {
      ops.push({ type: 'equal', line: a[x - 1] });
      x--;
      y--;
    }

    if (d === 0) break;

    if (x === prevX) {
      ops.push({ type: 'insert', line: b[y - 1] });
      y--;
    } else {
      ops.push({ type: 'delete', line: a[x - 1] });
      x--;
    }
  }

  ops.reverse();
  const grouped: DiffOp[] = [];
  for (const op of ops) {
    const last = grouped[grouped.length - 1];
    if (last && last.type === op.type) {
      last.lines.push(op.line);
    } else {
      grouped.push({ type: op.type, lines: [op.line] } as DiffOp);
    }
  }
  return grouped;
}

function buildHunksFromOps(ops: DiffOp[], context: number) {
  let oldLine = 1;
  let newLine = 1;
  const hunks: Array<{
    oldStart: number;
    newStart: number;
    lines: Array<{ type: 'context' | 'delete' | 'insert'; text: string; oldLine?: number; newLine?: number }>;
  }> = [];

  const pushContext = (hunk: any, text: string) => {
    hunk.lines.push({ type: 'context', text, oldLine, newLine });
    oldLine++;
    newLine++;
  };
  const pushDelete = (hunk: any, text: string) => {
    hunk.lines.push({ type: 'delete', text, oldLine });
    oldLine++;
  };
  const pushInsert = (hunk: any, text: string) => {
    hunk.lines.push({ type: 'insert', text, newLine });
    newLine++;
  };

  let pendingContext: string[] = [];
  let current: any = null;
  const flushPendingContext = () => {
    if (!current) return;
    const take = pendingContext.slice(0, context);
    for (const line of take) pushContext(current, line);
    pendingContext = pendingContext.slice(take.length);
  };

  for (const op of ops) {
    if (op.type === 'equal') {
      for (const line of op.lines) {
        if (current) {
          pendingContext.push(line);
          if (pendingContext.length > context * 2) {
            flushPendingContext();
            hunks.push(current);
            current = null;
            // skip remaining pending context, but advance line counters
            for (const skipped of pendingContext) {
              oldLine++;
              newLine++;
            }
            pendingContext = [];
          } else {
            // advance counters only when we commit context into hunk; keep as pending for now
            oldLine++;
            newLine++;
          }
        } else {
          oldLine++;
          newLine++;
        }
      }
      continue;
    }

    // non-equal: start a new hunk if needed, including leading context
    if (!current) {
      current = { oldStart: Math.max(1, oldLine - pendingContext.length), newStart: Math.max(1, newLine - pendingContext.length), lines: [] as any[] };
      // Add up to `context` lines from the end of pending context as prefix
      const prefix = pendingContext.slice(-context);
      // Adjust old/new line numbers back for prefix push
      oldLine -= prefix.length;
      newLine -= prefix.length;
      for (const l of prefix) pushContext(current, l);
      // Restore counters to where they were after prefix
      // (pushContext already advanced)
      pendingContext = [];
    } else {
      flushPendingContext();
    }

    if (op.type === 'delete') {
      for (const line of op.lines) pushDelete(current, line);
    } else if (op.type === 'insert') {
      for (const line of op.lines) pushInsert(current, line);
    }
  }

  if (current) {
    // Add trailing context
    flushPendingContext();
    hunks.push(current);
  }

  return hunks;
}
