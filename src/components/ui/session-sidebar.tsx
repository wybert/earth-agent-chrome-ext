import React from "react"
import { formatDistanceToNow } from "date-fns"
import { Plus, X, Edit2, Trash2, Copy, Pin, PinOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

export interface SidebarSession {
  id: string
  title: string
  preview?: string
  updatedAt: number
  pinned?: boolean
}

interface SessionSidebarProps {
  sessions: SidebarSession[]
  activeSessionId: string | null
  onSelect: (sessionId: string) => void
  onCreate: () => void
  onRename: (sessionId: string) => void
  onDelete: (sessionId: string) => void
  onDuplicate: (sessionId: string) => void
  onTogglePin: (sessionId: string) => void
  className?: string
  showCloseButton?: boolean
  onClose?: () => void
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
  className,
  showCloseButton,
  onClose,
}: SessionSidebarProps) {
  const [search, setSearch] = React.useState("")

  const normalizedSearch = search.trim().toLowerCase()
  const filtered = React.useMemo(() => {
    if (!normalizedSearch) return sessions
    return sessions.filter((session) => {
      const haystack = `${session.title} ${session.preview || ""}`.toLowerCase()
      return haystack.includes(normalizedSearch)
    })
  }, [sessions, normalizedSearch])

  const pinned = filtered.filter((session) => session.pinned)
  const recent = filtered.filter((session) => !session.pinned)

  const renderSessionRow = (session: SidebarSession) => {
    const relativeTime = formatDistanceToNow(new Date(session.updatedAt || Date.now()), {
      addSuffix: true,
    })

    return (
      <button
        key={session.id}
        className={cn(
          "group relative mb-2 w-full rounded-lg border bg-background/80 p-3 text-left transition hover:bg-background",
          session.id === activeSessionId && "border-primary/60 bg-primary/5"
        )}
        onClick={() => onSelect(session.id)}
      >
        <div className="flex items-center justify-between text-sm font-medium">
          <span className="truncate" title={session.title}>{session.title}</span>
          <span className="ml-2 shrink-0 text-xs text-muted-foreground">{relativeTime}</span>
        </div>
        <p className="mt-1 max-h-[2.5rem] min-h-[1.5rem] overflow-hidden text-xs text-muted-foreground">
          {session.preview || "No messages yet"}
        </p>
        <div className="mt-2 flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Rename" onClick={(event) => { event.stopPropagation(); onRename(session.id) }}>
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Duplicate" onClick={(event) => { event.stopPropagation(); onDuplicate(session.id) }}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" title={session.pinned ? "Unpin" : "Pin"} onClick={(event) => { event.stopPropagation(); onTogglePin(session.id) }}>
            {session.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="Delete" onClick={(event) => { event.stopPropagation(); onDelete(session.id) }}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </button>
    )
  }

  return (
    <div className={cn("flex h-full w-full flex-col border-r bg-muted/20", className)}>
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="text-sm font-semibold">Chats</div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={onCreate}>
            <Plus className="mr-1 h-3.5 w-3.5" /> New
          </Button>
          {showCloseButton && (
            <Button size="icon" variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      <div className="border-b px-3 py-2">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search chats"
          className="h-8"
        />
      </div>
      <ScrollArea className="flex-1 px-3 py-3">
        {pinned.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Pinned</p>
            {pinned.map(renderSessionRow)}
          </div>
        )}
        <div>
          {recent.length > 0 ? (
            <>
              {pinned.length > 0 && (
                <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Recent</p>
              )}
              {recent.map(renderSessionRow)}
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
  )
}
