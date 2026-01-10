import React, { type ComponentProps } from 'react';
import { ChatMessage, type Message } from '@/components/ui/chat-message';
import { TypingIndicator } from '@/components/ui/typing-indicator';
import { ScrollArea } from '@/components/ui/scroll-area';

type AdditionalMessageOptions = Omit<ComponentProps<typeof ChatMessage>, keyof Message>;

interface MessageListProps {
  messages: Message[];
  showTimeStamps?: boolean;
  isTyping?: boolean;
  messageOptions?:
    | AdditionalMessageOptions
    | ((message: Message, index: number) => AdditionalMessageOptions);
  isGenerating?: boolean;
}

export function MessageList({
  messages,
  showTimeStamps = true,
  isTyping = false,
  messageOptions,
  isGenerating,
}: MessageListProps) {
  if (!messages || messages.length === 0) {
    return null;
  }

  return (
    <ScrollArea className="flex-1 overflow-y-auto">
      <div className="w-full flex flex-col gap-4 px-2 sm:px-4 py-4">
        {messages.map((message, index) => {
          const additionalOptions =
            typeof messageOptions === 'function' ? messageOptions(message, index) : messageOptions;

          return (
            <ChatMessage
              key={message.id || index}
              message={message}
              isLoading={isGenerating && index === messages.length - 1}
              {...additionalOptions}
            />
          );
        })}
        {isGenerating && messages[messages.length - 1]?.role !== 'assistant' && (
          <ChatMessage message={{ id: 'typing', role: 'assistant' }} isLoading={true} />
        )}
      </div>
    </ScrollArea>
  );
}
