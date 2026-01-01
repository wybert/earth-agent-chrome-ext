import { ShadowWorkspace } from './shadow-workspace';

describe('ShadowWorkspace', () => {
  it('applies range patch by line/col', () => {
    const ws = new ShadowWorkspace();
    ws.commit(1, 'current_editor', 'line1\nline2\nline3\n', 'seed', 'system');
    ws.applyRangePatch(
      1,
      'current_editor',
      { start: { line: 2, col: 1 }, end: { line: 2, col: 6 } },
      'LINE2',
      'patch'
    );
    const state = ws.getOrCreate(1, 'current_editor');
    expect(state.content).toBe('line1\nLINE2\nline3\n');
  });

  it('supports undo/redo', () => {
    const ws = new ShadowWorkspace();
    ws.commit(1, 'current_editor', 'a', 'seed', 'system');
    ws.commit(1, 'current_editor', 'ab', 'add b', 'agent');
    ws.undo(1, 'current_editor');
    expect(ws.getOrCreate(1, 'current_editor').content).toBe('a');
    ws.redo(1, 'current_editor');
    expect(ws.getOrCreate(1, 'current_editor').content).toBe('ab');
  });

  it('searches and returns matches', () => {
    const ws = new ShadowWorkspace();
    ws.commit(1, 'current_editor', 'hello\nworld\nhello\n', 'seed', 'system');
    const matches = ws.search(1, 'current_editor', 'hello', 10);
    expect(matches.length).toBe(2);
    expect(matches[0].start.line).toBe(1);
    expect(matches[1].start.line).toBe(3);
  });

  it('replaceAll replaces all occurrences', () => {
    const ws = new ShadowWorkspace();
    ws.commit(1, 'current_editor', 'foo foo\nfoo\n', 'seed', 'system');
    ws.replaceAll(1, 'current_editor', 'foo', 'bar');
    expect(ws.getOrCreate(1, 'current_editor').content).toBe('bar bar\nbar\n');
  });

  it('patchByMatchIndex replaces only the Nth occurrence (1-based)', () => {
    const ws = new ShadowWorkspace();
    ws.commit(1, 'current_editor', 'x\ny\nx\nx\n', 'seed', 'system');
    ws.patchByMatchIndex(1, 'current_editor', 'x', 2, 'Z');
    expect(ws.getOrCreate(1, 'current_editor').content).toBe('x\ny\nZ\nx\n');
  });

  it('diffSinceSynced shows changes since last sync', () => {
    const ws = new ShadowWorkspace();
    ws.commit(1, 'current_editor', 'a\nb\nc\n', 'seed', 'system');
    ws.markSynced(1, 'current_editor');
    ws.replaceAll(1, 'current_editor', 'b', 'B');
    const diff = ws.diffSinceSynced(1, 'current_editor');
    expect(diff.summary.hunks).toBeGreaterThan(0);
  });
});
