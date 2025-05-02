import React from 'react'
import { cva, type VariantProps } from "class-variance-authority"
import { AnimatePresence, motion } from "framer-motion"
import { FileIcon, Loader2, SquareTerminal, User } from "lucide-react"

import { cn } from "@/lib/utils"
import { FilePreview } from "@/components/ui/file-preview"
import { MarkdownRenderer } from "@/components/ui/markdown-renderer"

const chatBubbleVariants = cva(
  "relative rounded-lg px-3 py-2 text-base",
  {
    variants: {
      isUser: {
        true: "bg-primary text-primary-foreground",
        false: "bg-muted text-muted-foreground",
      },
      animation: {
        none: "",
        fadeIn: "animate-in fade-in-0 zoom-in-95 duration-300",
      },
    },
    defaultVariants: {
      isUser: false,
      animation: "fadeIn",
    },
  }
)

interface BubbleMessageProps extends VariantProps<typeof chatBubbleVariants> {
  content: string
  actions?: React.ReactNode
}

function BubbleMessage({
  content,
  isUser,
  animation,
  actions,
}: BubbleMessageProps) {
  return (
    <div className={cn("group/message relative")}>
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -10 }}
        transition={{
          opacity: { duration: 0.2 },
          layout: {
            type: "spring",
            bounce: 0.4,
            duration: animation === "fadeIn" ? 0.4 : 0,
          },
        }}
        style={{ originX: isUser ? 1 : 0 }}
        className={cn(
          chatBubbleVariants({ isUser, animation }),
          "break-words"
        )}
      >
        <MarkdownRenderer content={content} />
        {actions ? (
          <div className="absolute -bottom-4 right-2 flex space-x-1 rounded-lg border bg-background p-1 text-foreground opacity-0 transition-opacity group-hover/message:opacity-100">
            {actions}
          </div>
        ) : null}
      </motion.div>
    </div>
  )
}

// Define MessagePart locally based on usage
interface TextPart { type: "text"; text: string; }
interface ToolInvocationPart { type: "tool-invocation"; toolName: string; args: any; result?: any; }
interface FilePart { type: "file"; file: any; }
// Add other part types if used elsewhere (e.g., reasoning, source, error)

type MessagePart = TextPart | ToolInvocationPart | FilePart; // Combine defined parts

export interface Message {
  id: string
  role: "user" | "assistant" | "tool" | "system"
  createdAt?: Date
  content?: string
  parts?: Array<MessagePart> // Use locally defined type
  toolInvocations?: ToolInvocation[]
}

interface ToolInvocation {
  toolCallId: string
  toolName: string
  args: any
  state?: "call" | "result"
  result?: any
}

interface ChatMessageProps {
  message: Message
  isLoading?: boolean
  actions?: React.ReactNode
}

export function ChatMessage({ message, isLoading, actions }: ChatMessageProps) {
  const Icon = message.role === "user" ? User : SquareTerminal
  const isUser = message.role === "user"
  const content = message.content ?? ""

  if (!content && !message.parts?.length && !message.toolInvocations?.length) {
    return null
  }

  return (
    <div className={cn("group flex items-start gap-3", isUser && "justify-end")}>
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full border shadow",
          isUser ? "bg-background" : "bg-primary text-primary-foreground"
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div
        className={cn("flex flex-col gap-2", isUser ? "items-end" : "items-start")}
      >
        {content ? (
          <BubbleMessage content={content} isUser={isUser} actions={actions} />
        ) : null}
        {message.parts?.map((part, index) => {
          if (part.type === "text") {
            return (
              <BubbleMessage
                key={index}
                content={part.text}
                isUser={isUser}
                actions={actions}
              />
            )
          } else if (part.type === "tool-invocation") {
            return (
              <div
                key={index}
                className="rounded-lg border bg-zinc-100 p-3 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100"
              >
                <p className="text-sm font-semibold">
                  Tool Invocation:
                  <span className="ml-1 font-mono">{part.toolName}</span>
                </p>
                <pre className="mt-2 overflow-x-auto rounded bg-zinc-200 p-2 font-mono text-xs dark:bg-zinc-800">
                  {JSON.stringify(part.args, null, 2)}
                </pre>
                {part.result && (
                  <>
                    <hr className="my-2 border-zinc-200 dark:border-zinc-700" />
                    <p className="text-sm font-semibold">Tool Result:</p>
                    <pre className="mt-1 overflow-x-auto rounded bg-zinc-200 p-2 font-mono text-xs dark:bg-zinc-800">
                      {JSON.stringify(part.result, null, 2)}
                    </pre>
                  </>
                )}
              </div>
            )
          } else if (part.type === "file") {
            return (
              <FilePreview
                key={index}
                file={part.file}
              />
            )
          }
          // Handle other part types as needed
        })}
        {message.toolInvocations?.map((toolInvocation, index) => (
          <div
            key={toolInvocation.toolCallId || index}
            className="rounded-lg border bg-zinc-100 p-3 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <p className="text-sm font-semibold">
              Tool Invocation:
              <span className="ml-1 font-mono">{toolInvocation.toolName}</span>
            </p>
            <pre className="mt-2 overflow-x-auto rounded bg-zinc-200 p-2 font-mono text-xs dark:bg-zinc-800">
              {JSON.stringify(toolInvocation.args, null, 2)}
            </pre>
            {toolInvocation.state === "result" && toolInvocation.result && (
              <>
                <hr className="my-2 border-zinc-200 dark:border-zinc-700" />
                <p className="text-sm font-semibold">Tool Result:</p>
                <pre className="mt-1 overflow-x-auto rounded bg-zinc-200 p-2 font-mono text-xs dark:bg-zinc-800">
                  {JSON.stringify(toolInvocation.result, null, 2)}
                </pre>
              </>
            )}
          </div>
        ))}
        {isLoading ? (
          <div className={cn(chatBubbleVariants({ isUser: false }))}>
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : null}
      </div>
    </div>
  )
}
