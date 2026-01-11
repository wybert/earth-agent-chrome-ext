import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { AnimatePresence, motion } from 'framer-motion';
import { FileIcon, Loader2, SquareTerminal, User } from 'lucide-react';

import { cn } from '@/lib/utils';
import { FilePreview } from '@/components/ui/file-preview';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';

const chatBubbleVariants = cva('relative rounded-lg px-3 py-2 text-base', {
  variants: {
    isUser: {
      true: 'bg-primary text-primary-foreground',
      false: 'bg-transparent text-foreground pl-0', // Align text with tool cards
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
// Add other part types if used elsewhere (e.g., reasoning, source, error)

type MessagePart = TextPart | ToolInvocationPart | FilePart | ImagePart; // Include ImagePart

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'tool' | 'system';
  createdAt?: Date;
  content?: string;
  parts?: Array<MessagePart>; // Use locally defined type
  toolInvocations?: ToolInvocation[];
}

interface ToolInvocation {
  toolCallId: string;
  toolName: string;
  args: any;
  state?: 'call' | 'result';
  result?: any;
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
  // This allows us to render Tool Invocations (images) AFTER the tool status log
  // but BEFORE the assistant's final text response.
  const endMarker = '<!-- END_TOOL_CALLS -->';
  const hasMarkers = content.includes(endMarker);

  let toolStatusText = '';
  let assistantText = content;

  if (hasMarkers) {
    const markerIndex = content.indexOf(endMarker);
    toolStatusText = content.substring(0, markerIndex + endMarker.length);
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
        {/* 1. Tool Status Text (The "✅ screenshot" list) */}
        {toolStatusText && <BubbleMessage content={toolStatusText} isUser={isUser} />}

        {/* 2. Tool Invocations (The Images / Results) */}
        {message.toolInvocations?.map((toolInvocation, index) => (
          <div
            key={toolInvocation.toolCallId || index}
            className={cn(
              'rounded-lg border-[0.5px] border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-zinc-900 dark:text-zinc-100',
              toolInvocation.toolName === 'screenshot' ? 'p-1' : 'p-3'
            )}
          >
            {/* Conditional Header: Hide for screenshot */}
            {toolInvocation.toolName !== 'screenshot' && (
              <p className="text-sm font-semibold">
                Tool Invocation:
                <span className="ml-1 font-mono">{toolInvocation.toolName}</span>
              </p>
            )}
            {/* Hide args for screenshot tool to reduce clutter */}
            {toolInvocation.toolName !== 'screenshot' && (
              <pre className="mt-2 overflow-x-auto rounded bg-zinc-200 p-2 font-mono text-xs dark:bg-zinc-800">
                {JSON.stringify(toolInvocation.args, null, 2)}
              </pre>
            )}
            {toolInvocation.state === 'result' && toolInvocation.result && (
              <>
                {/* Conditional Result Header: Hide for screenshot with valid image */}
                {!(
                  toolInvocation.toolName === 'screenshot' &&
                  toolInvocation.result.screenshotDataUrl &&
                  toolInvocation.result.screenshotDataUrl.length > 50
                ) && (
                  <>
                    <hr className="my-2 border-zinc-200 dark:border-zinc-700" />
                    <p className="text-sm font-semibold">Tool Result:</p>
                  </>
                )}
                {toolInvocation.result.screenshotDataUrl &&
                toolInvocation.result.screenshotDataUrl.length > 50 ? (
                  <div className="rounded overflow-hidden border-[0.5px] border-zinc-200 dark:border-zinc-800">
                    <img
                      src={toolInvocation.result.screenshotDataUrl}
                      alt="Screenshot"
                      className="max-w-full h-auto max-h-[200px]"
                      loading="lazy"
                    />
                  </div>
                ) : toolInvocation.result.content ? (
                  <div className="mt-1">
                    {Array.isArray(toolInvocation.result.content) ? (
                      toolInvocation.result.content.map((contentPart: any, i: number) => {
                        if (contentPart.type === 'text') {
                          return (
                            <div key={i} className="mb-2">
                              {contentPart.text}
                            </div>
                          );
                        } else if (contentPart.type === 'image') {
                          return (
                            <div key={i} className="rounded overflow-hidden mt-2">
                              <img
                                src={contentPart.data}
                                alt="Tool result image"
                                className="max-w-full h-auto max-h-[200px]"
                                loading="lazy"
                              />
                            </div>
                          );
                        }
                        return null;
                      })
                    ) : (
                      <pre className="overflow-x-auto rounded bg-zinc-200 p-2 font-mono text-xs dark:bg-zinc-800">
                        {JSON.stringify(toolInvocation.result, null, 2)}
                      </pre>
                    )}
                  </div>
                ) : (
                  <pre className="mt-1 overflow-x-auto rounded bg-zinc-200 p-2 font-mono text-xs dark:bg-zinc-800">
                    {JSON.stringify(toolInvocation.result, null, 2)}
                  </pre>
                )}
              </>
            )}
          </div>
        ))}

        {/* 3. Assistant Response Text (Everything after markers) */}
        {assistantText && <BubbleMessage content={assistantText} isUser={isUser} />}

        {/* 4. Mixed Content Parts (Attachments etc) */}
        {message.parts?.map((part, index) => {
          if (part.type === 'text') {
            // Already handled by assistantText logic above for standard cases,
            // but keep for user attachments or non-interleaved messages.
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
          } else if (part.type === 'tool-invocation') {
            return (
              <div
                key={index}
                className={cn(
                  'rounded-lg border-[0.5px] border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-zinc-900 dark:text-zinc-100',
                  part.toolName === 'screenshot' ? 'p-1' : 'p-3'
                )}
              >
                <p className="text-sm font-semibold">
                  Tool Invocation:
                  <span className="ml-1 font-mono">{part.toolName}</span>
                </p>
                {part.toolName !== 'screenshot' && (
                  <pre className="mt-2 overflow-x-auto rounded bg-zinc-200 p-2 font-mono text-xs dark:bg-zinc-800">
                    {JSON.stringify(part.args, null, 2)}
                  </pre>
                )}
                {part.result && (
                  <>
                    <hr className="my-2 border-zinc-200 dark:border-zinc-700" />
                    <p className="text-sm font-semibold">Tool Result:</p>
                    {part.result.screenshotDataUrl && part.result.screenshotDataUrl.length > 50 ? (
                      <div className="rounded overflow-hidden border-[0.5px] border-zinc-200 dark:border-zinc-800">
                        <img
                          src={part.result.screenshotDataUrl}
                          alt="Screenshot"
                          className="max-w-full h-auto max-h-[200px]"
                          loading="lazy"
                        />
                      </div>
                    ) : part.result.content ? (
                      <div className="mt-1">
                        {Array.isArray(part.result.content) ? (
                          part.result.content.map((contentPart: any, i: number) => {
                            if (contentPart.type === 'text') {
                              return (
                                <div key={i} className="mb-2">
                                  {contentPart.text}
                                </div>
                              );
                            } else if (contentPart.type === 'image') {
                              return (
                                <div key={i} className="rounded overflow-hidden mt-2">
                                  <img
                                    src={contentPart.data}
                                    alt="Tool result image"
                                    className="max-w-full h-auto max-h-[200px]"
                                    loading="lazy"
                                  />
                                </div>
                              );
                            }
                            return null;
                          })
                        ) : (
                          <pre className="overflow-x-auto rounded bg-zinc-200 p-2 font-mono text-xs dark:bg-zinc-800">
                            {JSON.stringify(part.result, null, 2)}
                          </pre>
                        )}
                      </div>
                    ) : (
                      <pre className="mt-1 overflow-x-auto rounded bg-zinc-200 p-2 font-mono text-xs dark:bg-zinc-800">
                        {JSON.stringify(part.result, null, 2)}
                      </pre>
                    )}
                  </>
                )}
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

        {/* 5. Message Actions (Always at bottom right) */}
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
