import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type DiffLine = {
  type: 'context' | 'delete' | 'insert';
  text: string;
  oldLine?: number;
  newLine?: number;
};
type DiffHunk = { oldStart: number; newStart: number; lines: DiffLine[] };

export function ShadowDiffCard({
  diff,
  onSyncToEditor,
  onUndo,
  onRedo,
  onClose,
}: {
  diff: { summary: { added: number; removed: number; hunks: number }; hunks: DiffHunk[] };
  onSyncToEditor: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onClose: () => void;
}) {
  const { summary, hunks } = diff;

  return (
    <Card className="border border-gray-200 dark:border-gray-700 p-3 bg-white/95 dark:bg-gray-900/95 backdrop-blur">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium">
          Changes: <span className="text-green-600">+{summary.added}</span>{' '}
          <span className="text-red-600">-{summary.removed}</span>{' '}
          <span className="text-gray-500">({summary.hunks} hunks)</span>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onUndo}>
            Undo
          </Button>
          <Button size="sm" variant="outline" onClick={onRedo}>
            Redo
          </Button>
          <Button size="sm" variant="default" onClick={onSyncToEditor}>
            Sync to Editor
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      <div className="mt-3 max-h-56 overflow-auto rounded-md border border-gray-100 dark:border-gray-800">
        <pre className="text-[11px] leading-4 font-mono p-2">
          {hunks.map((hunk, hunkIdx) => (
            <React.Fragment key={hunkIdx}>
              <div className="text-gray-500">
                @@ -{hunk.oldStart} +{hunk.newStart} @@
              </div>
              {hunk.lines.map((line, idx) => {
                const prefix = line.type === 'insert' ? '+' : line.type === 'delete' ? '-' : ' ';
                const cls =
                  line.type === 'insert'
                    ? 'text-green-700 bg-green-50 dark:bg-green-950/30 dark:text-green-300'
                    : line.type === 'delete'
                      ? 'text-red-700 bg-red-50 dark:bg-red-950/30 dark:text-red-300'
                      : 'text-gray-800 dark:text-gray-200';

                const oldNo = line.oldLine ? String(line.oldLine).padStart(4, ' ') : '    ';
                const newNo = line.newLine ? String(line.newLine).padStart(4, ' ') : '    ';

                return (
                  <div key={idx} className={cls}>
                    {oldNo} {newNo} {prefix} {line.text}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </pre>
      </div>
    </Card>
  );
}
