import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Undo2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface DiffSummary {
  added: number;
  removed: number;
  hunks?: number;
}

// Match the structure from EditDiffCard
type DiffLine = {
  type: 'context' | 'delete' | 'insert';
  text: string;
  oldLine?: number;
  newLine?: number;
};

type DiffHunk = {
  oldStart: number;
  newStart: number;
  lines: DiffLine[];
};

export interface DiffStatusBarProps {
  summary: DiffSummary;
  hunks?: DiffHunk[];
  onUndo?: () => void;
  onClose?: () => void;
  className?: string;
}

export function DiffStatusBar({
  summary,
  hunks,
  onUndo,
  onClose,
  className,
}: DiffStatusBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasChanges = summary.added > 0 || summary.removed > 0;
  if (!hasChanges) return null;

  return (
    <div className={cn('border-b border-border bg-muted/30', className)}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm text-foreground hover:text-foreground/80 transition-colors"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="flex items-center gap-1.5">
            <span className="text-green-600 dark:text-green-400 font-medium">
              Edit Applied
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="text-green-600 dark:text-green-400">+{summary.added}</span>
            <span className="text-red-600 dark:text-red-400">-{summary.removed}</span>
            <span className="text-muted-foreground">lines</span>
          </span>
        </button>

        <div className="flex items-center gap-1">
          {onUndo && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onUndo}
              className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
            >
              <Undo2 className="h-3.5 w-3.5" />
              Undo
            </Button>
          )}
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Expanded diff content */}
      {isExpanded && hunks && hunks.length > 0 && (
        <div className="px-3 pb-3">
          <div className="rounded-md border border-border bg-background overflow-hidden max-h-48 overflow-y-auto">
            {hunks.map((hunk, hunkIndex) => (
              <div key={hunkIndex}>
                {/* Hunk header */}
                <div className="bg-muted/50 px-3 py-1 text-xs font-mono text-muted-foreground border-b border-border">
                  @@ -{hunk.oldStart} +{hunk.newStart} @@
                </div>
                {/* Hunk lines */}
                <div className="text-xs font-mono">
                  {hunk.lines.map((line, lineIndex) => {
                    const prefix = line.type === 'insert' ? '+' : line.type === 'delete' ? '-' : ' ';
                    return (
                      <div
                        key={lineIndex}
                        className={cn(
                          'px-3 py-0.5 whitespace-pre-wrap break-all',
                          line.type === 'insert' && 'bg-green-100 dark:bg-green-950/50 text-green-800 dark:text-green-300',
                          line.type === 'delete' && 'bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-300',
                          line.type === 'context' && 'text-muted-foreground'
                        )}
                      >
                        <span className="select-none mr-2 text-muted-foreground">
                          {prefix}
                        </span>
                        {line.text}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
