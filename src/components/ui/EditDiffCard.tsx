import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Undo2, Check } from 'lucide-react';

type DiffLine = {
  type: 'context' | 'delete' | 'insert';
  text: string;
  oldLine?: number;
  newLine?: number;
};
type DiffHunk = { oldStart: number; newStart: number; lines: DiffLine[] };

export interface EditDiffData {
  summary: { added: number; removed: number; hunks: number };
  hunks: DiffHunk[];
}

export function EditDiffCard({
  diff,
  onUndo,
  onClose,
}: {
  diff: EditDiffData;
  onUndo?: () => void;
  onClose: () => void;
}) {
  const { summary, hunks } = diff;

  if (!hunks || hunks.length === 0) {
    return null;
  }

  return (
    <Card className="border border-gray-200 dark:border-gray-700 p-3 bg-white/95 dark:bg-gray-900/95 backdrop-blur shadow-lg">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Check className="w-4 h-4 text-green-500" />
          <span className="text-sm font-medium">Edit Applied</span>
          <span className="text-sm text-gray-500">
            <span className="text-green-600">+{summary.added}</span>{' '}
            <span className="text-red-600">-{summary.removed}</span>{' '}
            <span className="text-gray-400">
              ({summary.hunks} {summary.hunks === 1 ? 'change' : 'changes'})
            </span>
          </span>
        </div>
        <div className="flex gap-1">
          {onUndo && (
            <Button size="sm" variant="ghost" onClick={onUndo} className="h-7 px-2">
              <Undo2 className="w-3.5 h-3.5 mr-1" />
              Undo
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onClose} className="h-7 w-7 p-0">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="max-h-48 overflow-auto rounded-md border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950">
        <pre className="text-[11px] leading-4 font-mono p-2">
          {hunks.map((hunk, hunkIdx) => (
            <React.Fragment key={hunkIdx}>
              <div className="text-gray-400 text-[10px] mb-1">
                @@ -{hunk.oldStart} +{hunk.newStart} @@
              </div>
              {hunk.lines.map((line, idx) => {
                const prefix = line.type === 'insert' ? '+' : line.type === 'delete' ? '-' : ' ';
                const cls =
                  line.type === 'insert'
                    ? 'text-green-700 bg-green-50 dark:bg-green-950/40 dark:text-green-300'
                    : line.type === 'delete'
                      ? 'text-red-700 bg-red-50 dark:bg-red-950/40 dark:text-red-300'
                      : 'text-gray-600 dark:text-gray-400';

                return (
                  <div key={idx} className={`${cls} whitespace-pre`}>
                    {prefix} {line.text}
                  </div>
                );
              })}
              {hunkIdx < hunks.length - 1 && <div className="h-2" />}
            </React.Fragment>
          ))}
        </pre>
      </div>
    </Card>
  );
}
