import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { AnimatePresence, motion } from 'framer-motion';
import { FileIcon, Loader2, SquareTerminal, User, ChevronRight, Check, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { FilePreview } from '@/components/ui/file-preview';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';

const chatBubbleVariants = cva('relative rounded-lg px-3 py-2 text-base', {
  variants: {
    isUser: {
      true: 'bg-primary text-primary-foreground',
      false: 'bg-transparent text-foreground pl-0',
    },
    animation: {
      none: '',
      fadeIn: 'animate-in fade-in-0 zoom-in-95 duration-300',
    },
  },
  defaultVariants: {
    isUser: false,
    animation: 'fadeIn',
  },
});

interface BubbleMessageProps extends VariantProps<typeof chatBubbleVariants> {
  content: string;
  actions?: React.ReactNode;
}

function BubbleMessage({ content, isUser, animation, actions }: BubbleMessageProps) {
  return (
    <div className={cn('group/message w-fit max-w-full flex flex-col gap-1')}>
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -10 }}
        transition={{
          opacity: { duration: 0.2 },
          layout: {
            type: 'spring',
            bounce: 0.4,
            duration: animation === 'fadeIn' ? 0.4 : 0,
          },
        }}
        style={{ originX: isUser ? 1 : 0 }}
        className={cn(
          chatBubbleVariants({ isUser, animation }),
          'break-words overflow-wrap-anywhere w-full max-w-full',
          isUser && 'sm:max-w-[600px]'
        )}
      >
        <MarkdownRenderer content={content} />
      </motion.div>
      {actions ? (
        <div
          className={cn(
            'flex space-x-1 text-foreground opacity-0 transition-opacity group-hover/message:opacity-100',
            isUser ? 'mr-1 self-end' : 'ml-1'
          )}
        >
          {actions}
        </div>
      ) : null}
    </div>
  );
}

// Define MessagePart locally based on usage
interface TextPart {
  type: 'text';
  text: string;
}
interface ToolInvocationPart {
  type: 'tool-invocation';
  toolName: string;
  args: any;
  result?: any;
}
interface FilePart {
  type: 'file';
  file: any;
}
interface ImagePart {
  type: 'image';
  data: string;
}

type MessagePart = TextPart | ToolInvocationPart | FilePart | ImagePart;

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'tool' | 'system';
  createdAt?: Date;
  content?: string;
  parts?: Array<MessagePart>;
  toolInvocations?: ToolInvocation[];
}

interface ToolInvocation {
  toolCallId: string;
  toolName: string;
  args: any;
  state?: 'call' | 'result';
  result?: any;
  duration?: number;
}

interface ChatMessageProps {
  message: Message;
  isLoading?: boolean;
  actions?: React.ReactNode;
}

export function ChatMessage({ message, isLoading, actions }: ChatMessageProps) {
  const Icon = message.role === 'user' ? User : SquareTerminal;
  const isUser = message.role === 'user';
  const content = message.content ?? '';

  if (!content && !message.parts?.length && !message.toolInvocations?.length) {
    return null;
  }

  // Logic to split content by tool call markers
  const endMarker = '<!-- END_TOOL_CALLS -->';
  const hasMarkers = content.includes(endMarker);

  // We only extract assistantText. We ignore toolStatusText because we render structured cards.
  let assistantText = content;

  if (hasMarkers) {
    const markerIndex = content.indexOf(endMarker);
    assistantText = content.substring(markerIndex + endMarker.length).trim();
  }

  // Render avatar component
  const avatar = (
    <div
      className={cn(
        'flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full border shadow',
        isUser ? 'bg-background' : 'bg-primary text-primary-foreground'
      )}
    >
      <Icon className="h-5 w-5" />
    </div>
  );

  return (
    <div className={cn('group flex items-start gap-3', isUser && 'justify-end')}>
      {avatar}
      <div
        className={cn('flex flex-col gap-2 flex-1 min-w-0', isUser ? 'items-end' : 'items-start')}
      >
        {/* 1. Tool Invocations (Collapsible Cards) */}
        {message.toolInvocations?.map((toolInvocation, index) => {
          const isScreenshot = toolInvocation.toolName === 'screenshot';
          const isCall = toolInvocation.state === 'call';
          const isSuccess =
            toolInvocation.state === 'result' && toolInvocation.result?.success !== false;
          const duration = toolInvocation.duration
            ? `(${(toolInvocation.duration / 1000).toFixed(1)}s)`
            : '';

          // Screenshot: Open by default if finished. Others: Closed.
          const defaultOpen = isScreenshot && !isCall;

          return (
            <div key={toolInvocation.toolCallId || index} className="w-full max-w-full">
              <details
                className="group/tool border-[0.5px] border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/50 overflow-hidden"
                open={defaultOpen}
              >
                <summary className="flex items-center gap-2 p-2 cursor-pointer list-none hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors text-sm">
                  {/* Status Icon */}
                  {isCall ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  ) : isSuccess ? (
                    <Check className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <X className="h-3.5 w-3.5 text-red-500" />
                  )}

                  <span className="font-medium font-mono text-xs">{toolInvocation.toolName}</span>

                  <span className="text-xs text-muted-foreground ml-auto flex items-center gap-2">
                    {duration}
                    <ChevronRight className="h-3.5 w-3.5 transition-transform group-open/tool:rotate-90" />
                  </span>
                </summary>

                <div className="p-2 border-t border-zinc-200 dark:border-zinc-800 text-xs">
                  {/* Args (Hidden for screenshot to reduce clutter, visible for others) */}
                  {!isScreenshot && (
                    <div className="mb-2">
                      <span className="font-semibold text-muted-foreground">Input:</span>
                      <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-all rounded bg-zinc-200/50 p-1.5 font-mono text-xs dark:bg-zinc-800/50">
                        {JSON.stringify(toolInvocation.args, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Result */}
                  {toolInvocation.state === 'result' && (
                    <div>
                      {!isScreenshot && (
                        <span className="font-semibold text-muted-foreground">Output:</span>
                      )}

                      {/* Screenshot Image */}
                      {isScreenshot && toolInvocation.result?.screenshotDataUrl ? (
                        <div className="rounded overflow-hidden border-[0.5px] border-zinc-200 dark:border-zinc-800">
                          <img
                            src={toolInvocation.result.screenshotDataUrl}
                            alt="Screenshot"
                            className="max-w-full h-auto max-h-[200px] object-contain object-left-top"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        // Standard JSON result
                        <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-all rounded bg-zinc-200/50 p-1.5 font-mono text-xs dark:bg-zinc-800/50">
                          {JSON.stringify(toolInvocation.result, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              </details>
            </div>
          );
        })}

        {/* 2. Assistant Response Text */}
        {assistantText && <BubbleMessage content={assistantText} isUser={isUser} />}

        {/* 3. Mixed Content Parts (Attachments etc) */}
        {message.parts?.map((part, index) => {
          if (part.type === 'text') {
            if (hasMarkers && part.text === content) return null;
            return <BubbleMessage key={index} content={part.text} isUser={isUser} />;
          } else if (part.type === 'file') {
            return <FilePreview key={index} file={part} />;
          } else if (part.type === 'image') {
            return (
              <div
                key={index}
                className={cn(
                  'rounded-lg overflow-hidden max-w-[500px]',
                  isUser ? 'ml-auto' : 'mr-auto'
                )}
              >
                <img
                  src={part.data}
                  alt="Uploaded image"
                  className="w-full h-auto object-contain max-h-[200px]"
                  loading="lazy"
                />
              </div>
            );
          }
          return null;
        })}

        {isLoading ? (
          <div className={cn(chatBubbleVariants({ isUser: false }))}>
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : null}

        {/* 4. Message Actions (Always at bottom right) */}
        {actions && !isLoading && (
          <div
            className={cn(
              'flex items-center gap-1 mt-1 opacity-0 transition-opacity group-hover:opacity-100',
              isUser ? 'self-end' : 'self-start'
            )}
          >
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
