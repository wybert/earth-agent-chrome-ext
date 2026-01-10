import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Plus,
  X,
  Edit2,
  Trash2,
  Copy,
  Pin,
  PinOff,
  Download,
  Upload,
  ChevronDown,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface SidebarSession {
  id: string;
  title: string;
  preview?: string;
  updatedAt: number;
  pinned?: boolean;
  messagesContent?: string; // All messages content concatenated for search
}

interface SessionSidebarProps {
  sessions: SidebarSession[];
  activeSessionId: string | null;
  onSelect: (sessionId: string) => void;
  onCreate: () => void;
  onRename: (sessionId: string, newTitle: string) => void;
  onDelete: (sessionId: string) => void;
  onDuplicate: (sessionId: string) => void;
  onTogglePin: (sessionId: string) => void;
  onExportSession?: (sessionId: string, format: 'json' | 'markdown') => void;
  onExportAll?: (format: 'json' | 'markdown') => void;
  onImport?: () => void;
  className?: string;
  showCloseButton?: boolean;
  onClose?: () => void;
}

export function SessionSidebar({
  sessions,
  activeSessionId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  onDuplicate,
  onTogglePin,
  onExportSession,
  onExportAll,
  onImport,
  className,
  showCloseButton,
  onClose,
}: SessionSidebarProps) {
  const [search, setSearch] = React.useState('');
  const [editingSessionId, setEditingSessionId] = React.useState<string | null>(null);
  const [editingTitle, setEditingTitle] = React.useState('');

  const normalizedSearch = search.trim().toLowerCase();
  const filtered = React.useMemo(() => {
    if (!normalizedSearch) return sessions;
    return sessions.filter((session) => {
      // Search in title, preview, and all messages content
      const haystack =
        `${session.title} ${session.preview || ''} ${session.messagesContent || ''}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [sessions, normalizedSearch]);

  const pinned = filtered.filter((session) => session.pinned);
  const recent = filtered.filter((session) => !session.pinned);

  const startEditing = (session: SidebarSession) => {
    setEditingSessionId(session.id);
    setEditingTitle(session.title);
  };

  const saveEditing = () => {
    if (
      editingSessionId &&
      editingTitle.trim() &&
      editingTitle.trim() !== sessions.find((s) => s.id === editingSessionId)?.title
    ) {
      onRename(editingSessionId, editingTitle.trim());
    }
    setEditingSessionId(null);
    setEditingTitle('');
  };

  const cancelEditing = () => {
    setEditingSessionId(null);
    setEditingTitle('');
  };

  const renderSessionRow = (session: SidebarSession) => {
    const relativeTime = formatDistanceToNow(new Date(session.updatedAt || Date.now()), {
      addSuffix: true,
    });

    const isEditing = editingSessionId === session.id;

    return (
      <div
        key={session.id}
        className={cn(
          'group relative mb-2 w-full rounded-lg border bg-background/80 px-2.5 py-2.5 transition hover:bg-background',
          session.id === activeSessionId && 'border-primary/60 bg-primary/5',
          !isEditing && 'cursor-pointer'
        )}
        style={{ width: '100%' }}
        role="button"
        tabIndex={0}
        onClick={() => !isEditing && onSelect(session.id)}
        onKeyDown={(event) => {
          if (!isEditing && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            onSelect(session.id);
          }
        }}
      >
        <div className="flex flex-col gap-1.5 w-full min-w-0">
          {isEditing ? (
            <Input
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  saveEditing();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  cancelEditing();
                }
              }}
              onBlur={saveEditing}
              autoFocus
              className="h-7 text-sm font-medium"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <h3
              className="text-sm font-medium break-words overflow-wrap-anywhere word-break-break-word"
              title={session.title}
            >
              {session.title}
            </h3>
          )}
          <p className="break-words overflow-wrap-anywhere word-break-break-word text-xs text-muted-foreground">
            {session.preview || 'No messages yet'}
          </p>
          <span className="text-xs text-muted-foreground">{relativeTime}</span>
        </div>
        {!isEditing && (
          <div className="mt-2 flex flex-wrap items-center gap-1 opacity-0 transition group-hover:opacity-100">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="Rename"
              onClick={(event) => {
                event.stopPropagation();
                startEditing(session);
              }}
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="Duplicate"
              onClick={(event) => {
                event.stopPropagation();
                onDuplicate(session.id);
              }}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
            {onExportSession && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    title="Export"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  onClick={(event: React.MouseEvent) => event.stopPropagation()}
                >
                  <DropdownMenuItem onClick={() => onExportSession(session.id, 'json')}>
                    Export as JSON
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onExportSession(session.id, 'markdown')}>
                    Export as Markdown
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title={session.pinned ? 'Unpin' : 'Pin'}
              onClick={(event) => {
                event.stopPropagation();
                onTogglePin(session.id);
              }}
            >
              {session.pinned ? (
                <PinOff className="h-3.5 w-3.5" />
              ) : (
                <Pin className="h-3.5 w-3.5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive"
              title="Delete"
              onClick={(event) => {
                event.stopPropagation();
                onDelete(session.id);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn('flex h-full w-full flex-col border-r bg-muted/20', className)}>
      <div className="flex h-12 items-center justify-between border-b px-4">
        <h2 className="text-base font-semibold text-foreground">Chats</h2>
        <div className="flex items-center">
          {showCloseButton && (
            <Button
              size="icon"
              variant="ghost"
              onClick={onClose}
              className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 border-b px-4 py-2">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search chats"
          className="h-8 flex-1"
        />
        {onImport && (
          <Button
            size="icon"
            variant="ghost"
            onClick={onImport}
            title="Import sessions"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Upload className="h-4 w-4" />
          </Button>
        )}
        {onExportAll && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                title="Export all sessions"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Download className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onExportAll('json')}>
                Export All as JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExportAll('markdown')}>
                Export All as Markdown
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <ScrollArea className="flex-1 px-4 py-3">
        {pinned.length > 0 && (
          <div className="mb-4 pr-2">
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Pinned</p>
            <div className="space-y-2">{pinned.map(renderSessionRow)}</div>
          </div>
        )}
        <div className="pr-2">
          {recent.length > 0 ? (
            <>
              {pinned.length > 0 && (
                <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Recent</p>
              )}
              <div className="space-y-2">{recent.map(renderSessionRow)}</div>
            </>
          ) : (
            pinned.length === 0 && (
              <div className="rounded-lg border border-dashed bg-background/60 p-4 text-center text-sm text-muted-foreground">
                No conversations yet. Start a new one!
              </div>
            )
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
