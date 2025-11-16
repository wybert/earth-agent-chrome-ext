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
      <div
        key={session.id}
        className={cn(
          "group relative mb-2 w-full cursor-pointer rounded-lg border bg-background/80 px-2.5 py-2.5 transition hover:bg-background",
          session.id === activeSessionId && "border-primary/60 bg-primary/5"
        )}
        style={{ width: "100%" }}
        role="button"
        tabIndex={0}
        onClick={() => onSelect(session.id)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            onSelect(session.id)
          }
        }}
      >
        <div className="flex flex-col gap-1.5 w-full min-w-0">
          <h3 className="text-sm font-medium break-words overflow-wrap-anywhere word-break-break-word" title={session.title}>
            {session.title}
          </h3>
          <p className="break-words overflow-wrap-anywhere word-break-break-word text-xs text-muted-foreground">
            {session.preview || "No messages yet"}
          </p>
          <span className="text-xs text-muted-foreground">{relativeTime}</span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1 opacity-0 transition group-hover:opacity-100">
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
      </div>
    )
  }

  return (
    <div className={cn("flex h-full w-full flex-col border-r bg-muted/20", className)}>
      <div className="flex h-14 items-center justify-between border-b px-4">
        <h2 className="text-lg font-semibold text-foreground">Chats</h2>
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
      <div className="border-b px-4 py-2">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search chats"
          className="h-8"
        />
      </div>
      <ScrollArea className="flex-1 px-4 py-3">
        {pinned.length > 0 && (
          <div className="mb-4 pr-2">
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Pinned</p>
            <div className="space-y-2">
              {pinned.map(renderSessionRow)}
            </div>
          </div>
        )}
        <div className="pr-2">
          {recent.length > 0 ? (
            <>
              {pinned.length > 0 && (
                <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Recent</p>
              )}
              <div className="space-y-2">
                {recent.map(renderSessionRow)}
              </div>
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
