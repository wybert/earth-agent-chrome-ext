import React, { useEffect, useRef, useState } from 'react';
import { useChat } from 'ai/react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Message } from 'ai';

// Chrome storage key for chat messages
const STORAGE_KEY = 'earth_engine_chat_history';

// Default welcome message from the assistant
const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content: 'Hello! I\'m your Earth Engine Assistant. How can I help you with Earth Engine today?'
};

// Static responses until we integrate with a real API
const STATIC_RESPONSES = [
  'I can help you analyze satellite imagery in Earth Engine.',
  'You can use Earth Engine to process large-scale geospatial datasets.',
  'Try creating a simple NDVI visualization with Landsat data.',
  'Earth Engine provides access to petabytes of satellite imagery and geospatial datasets.',
  'You can export your Earth Engine analysis results to Google Drive or Cloud Storage.',
];

export function Chat() {
  // Use local state to handle messages since we need to customize storage
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load chat history from Chrome storage when component mounts
  useEffect(() => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      const savedMessages = result[STORAGE_KEY];
      if (savedMessages && savedMessages.length > 0) {
        setMessages(savedMessages);
      }
    });
  }, []);

  // Save messages to Chrome storage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      chrome.storage.local.set({ [STORAGE_KEY]: messages });
    }
  }, [messages]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  // Generate a simple random response for now
  const getStaticResponse = () => {
    const randomIndex = Math.floor(Math.random() * STATIC_RESPONSES.length);
    return STATIC_RESPONSES[randomIndex];
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim()) return;
    
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    // Simulate a delay for the response
    setTimeout(() => {
      // Add assistant message
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: getStaticResponse(),
      };
      
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <Card className="w-full h-[600px] grid grid-rows-[1fr,auto]">
      <ScrollArea className="p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex w-max max-w-[75%] flex-col gap-2 rounded-lg px-3 py-2 text-sm',
                message.role === 'user'
                  ? 'ml-auto bg-primary text-primary-foreground'
                  : 'bg-muted'
              )}
            >
              {message.content}
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>
      <form
        onSubmit={handleSubmit}
        className="p-4 flex items-center gap-2 border-t"
      >
        <Textarea
          className="min-h-[60px] resize-none"
          placeholder="Type your message..."
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />
        <Button
          type="submit"
          size="icon"
          disabled={isLoading || !input.trim()}
        >
          <Send className="h-4 w-4" />
          {isLoading && <span className="sr-only">Sending...</span>}
        </Button>
      </form>
    </Card>
  );
}