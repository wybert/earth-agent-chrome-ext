import React, { useEffect, useRef, useState } from 'react';
import { useChat } from 'ai/react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Settings as SettingsIcon, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Message } from 'ai';
import { Settings } from './Settings';
import { ExtensionMessage } from '../types/extension';

// Chrome storage keys
const STORAGE_KEY = 'earth_engine_chat_history';
const API_KEY_STORAGE_KEY = 'earth_engine_llm_api_key';
const API_PROVIDER_STORAGE_KEY = 'earth_engine_llm_provider';

// Default welcome message from the assistant
const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content: 'Hello! I\'m your Earth Engine Assistant. How can I help you with Earth Engine today?'
};

export function Chat() {
  const [showSettings, setShowSettings] = useState(false);
  const [apiConfigured, setApiConfigured] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiProvider, setApiProvider] = useState<'openai' | 'anthropic'>('openai');
  const [fallbackMode, setFallbackMode] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Vercel AI SDK's useChat hook with edge runtime streaming support
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    setMessages,
    reload,
    stop
  } = useChat({
    api: `chrome-extension://${chrome.runtime.id}/api/chat`,
    initialMessages: [WELCOME_MESSAGE],
    body: {
      apiKey,
      provider: apiProvider
    },
    onResponse(response) {
      // Handle streaming response
      if (response.body) {
        const reader = response.body.getReader();
        // Process the stream
        (async () => {
          try {
            const decoder = new TextDecoder();
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                setIsTyping(false);
                break;
              }
              // Only try to decode if value is an ArrayBuffer
              if (value instanceof Uint8Array) {
                const text = decoder.decode(value, { stream: true });
                console.log('Received chunk:', text);
                // Update the last message with the new chunk
                setMessages(prev => {
                  const lastMessage = prev[prev.length - 1];
                  if (lastMessage?.role === 'assistant') {
                    return [
                      ...prev.slice(0, -1),
                      { ...lastMessage, content: lastMessage.content + text }
                    ];
                  }
                  return [...prev, { id: Date.now().toString(), role: 'assistant', content: text }];
                });
              }
            }
          } catch (error) {
            console.error('Error reading stream:', error);
            setFallbackMode(true);
          }
        })();
      }
    },
    onFinish: () => {
      setIsTyping(false);
    },
    onError: (error) => {
      console.error("Chat API error:", error);
      setFallbackMode(true);
    }
  });
  
  // Local state for fallback mode
  const [localMessages, setLocalMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [localInput, setLocalInput] = useState('');
  const [isLocalLoading, setIsLocalLoading] = useState(false);

  // Check if API key is configured on component mount
  useEffect(() => {
    chrome.storage.sync.get([API_KEY_STORAGE_KEY, API_PROVIDER_STORAGE_KEY], (result) => {
      const hasApiKey = !!result[API_KEY_STORAGE_KEY];
      setApiConfigured(hasApiKey);
      setApiKey(result[API_KEY_STORAGE_KEY] || '');
      setApiProvider(result[API_PROVIDER_STORAGE_KEY] || 'openai');
      
      if (!hasApiKey) {
        setShowSettings(true); // Show settings if API key is not configured
        setFallbackMode(true); // Use fallback mode if no API key
      }
    });
  }, []);

  // Load chat history from Chrome storage when component mounts
  useEffect(() => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      const savedMessages = result[STORAGE_KEY];
      if (savedMessages && savedMessages.length > 0) {
        setLocalMessages(savedMessages);
        setMessages(savedMessages);
      }
    });
  }, [setMessages]);

  // Save messages to Chrome storage whenever they change
  useEffect(() => {
    // Save whichever messages are currently active
    const messagesToSave = fallbackMode ? localMessages : messages;
    
    if (messagesToSave.length > 0) {
      chrome.storage.local.set({ [STORAGE_KEY]: messagesToSave });
    }
  }, [messages, localMessages, fallbackMode]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, localMessages, isTyping]);

  // Format message content to properly render code blocks
  const formatMessageContent = (content: string) => {
    // Split the content by code blocks
    const parts = content.split(/(`{1,3})(.*?)(\1)/g);
    
    if (parts.length === 1) {
      return <div className="whitespace-pre-wrap">{content}</div>;
    }
    
    return (
      <div className="whitespace-pre-wrap">
        {parts.map((part, i) => {
          // Check if this part is a code block
          if (i % 4 === 2 && parts[i - 1].includes('`')) {
            return (
              <pre key={i} className="bg-gray-800 text-gray-100 p-2 my-2 rounded overflow-x-auto">
                <code>{part}</code>
              </pre>
            );
          } else if (i % 4 !== 0 && i % 4 !== 3) {
            // Skip the backtick parts
            return null;
          } else {
            return part;
          }
        })}
      </div>
    );
  };

  // Fallback mode: Generate a simple response when API fails
  const getGeeResponse = (query: string) => {
    // Simple keyword-based response system for Earth Engine
    const keywords = {
      'ndvi': 'NDVI (Normalized Difference Vegetation Index) can be calculated using: ```\nvar ndvi = image.normalizedDifference(["NIR", "RED"]);\n```',
      'landsat': 'Landsat imagery can be accessed via: ```\nvar landsat = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")\n```',
      'sentinel': 'Sentinel imagery is available through: ```\nvar sentinel = ee.ImageCollection("COPERNICUS/S2_SR")\n```',
      'export': 'You can export images using Export.image.toDrive() or visualize them with Map.addLayer()',
      'classify': 'For classification, use ee.Classifier methods like randomForest() or smileCart()',
      'reducer': 'Reducers like mean(), sum(), or min() can aggregate data spatially or temporally'
    };
    
    // Check if any keywords are in the query
    for (const [key, response] of Object.entries(keywords)) {
      if (query.toLowerCase().includes(key)) {
        return response;
      }
    }
    
    // Default response
    return "I can help with Earth Engine tasks like image processing, classification, and data export. Could you provide more details about what you're trying to do?";
  };

  // Handle fallback form submission
  const handleLocalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!localInput.trim() || isLocalLoading) return;
    
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: localInput.trim(),
    };
    
    setLocalMessages(prev => [...prev, userMessage]);
    setLocalInput('');
    setIsLocalLoading(true);
    
    // Generate a response with a slight delay to simulate processing
    setTimeout(() => {
      const response = getGeeResponse(userMessage.content);
      
      // Add assistant message
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
      };
      
      setLocalMessages(prev => [...prev, assistantMessage]);
      setIsLocalLoading(false);
    }, 1000);
  };

  const handleLocalInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalInput(e.target.value);
  };

  // Set up port connection to background script
  const [port, setPort] = useState<chrome.runtime.Port | null>(null);
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState<Message | null>(null);

  // Initialize port connection
  useEffect(() => {
    const newPort = chrome.runtime.connect({ name: 'sidepanel' });
    
    newPort.onMessage.addListener((response: any) => {
      switch (response.type) {
        case 'CHAT_RESPONSE':
          // Handle non-streaming response
          if (!currentStreamingMessage) {
            const userMessage: Message = {
              id: Date.now().toString(),
              role: 'user',
              content: input.trim()
            };

            const assistantMessage: Message = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: response.data?.choices?.[0]?.message?.content || 
                       response.data?.content || 
                       'Sorry, I could not generate a response.'
            };

            setMessages(prev => [...prev, userMessage, assistantMessage]);
          }
          setIsTyping(false);
          setCurrentStreamingMessage(null);
          break;

        case 'CHAT_STREAM_CHUNK':
          // Handle streaming chunk
          if (!currentStreamingMessage) {
            // Add user message if this is the first chunk
            const userMessage: Message = {
              id: Date.now().toString(),
              role: 'user',
              content: input.trim()
            };
            setMessages(prev => [...prev, userMessage]);
            
            // Create new streaming message
            const newMessage: Message = {
              id: response.requestId,
              role: 'assistant',
              content: response.chunk
            };
            setCurrentStreamingMessage(newMessage);
          } else {
            // Update existing streaming message
            setCurrentStreamingMessage(prev => prev ? {
              ...prev,
              content: prev.content + response.chunk
            } : null);
          }
          break;

        case 'CHAT_STREAM_END':
          // Finalize streaming message
          if (currentStreamingMessage) {
            setMessages(prev => [...prev, currentStreamingMessage]);
            setCurrentStreamingMessage(null);
          }
          setIsTyping(false);
          break;

        case 'ERROR':
          console.error('Chat API error:', response.error);
          setFallbackMode(true);
          setIsTyping(false);
          setCurrentStreamingMessage(null);
          break;
      }
    });

    newPort.onDisconnect.addListener(() => {
      console.log('Disconnected from background script');
      setPort(null);
      setFallbackMode(true);
      setCurrentStreamingMessage(null);
    });

    setPort(newPort);

    return () => {
      newPort.disconnect();
    };
  }, []);

  // Custom submit handler that uses port messaging
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !port) return;

    setIsTyping(true);
    setCurrentStreamingMessage(null);
    
    try {
      // Send message through port
      const message: ExtensionMessage = {
        type: 'CHAT_MESSAGE',
        message: input.trim(),
        apiKey,
        provider: apiProvider
      };

      port.postMessage(message);
    } catch (error) {
      console.error('Error sending chat message:', error);
      setFallbackMode(true);
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (fallbackMode) {
        handleLocalSubmit(e);
      } else {
        handleChatSubmit(e);
      }
    }
  };

  const handleRegenerate = () => {
    if (messages.length >= 2) {
      setIsTyping(true);
      reload();
    }
  };

  const handleStopGenerating = () => {
    stop();
    setIsTyping(false);
  };

  const handleRetryAPI = () => {
    setFallbackMode(false);
  };
  
  if (showSettings) {
    return <Settings onClose={() => {
      setShowSettings(false);
      // Check if API key was configured after settings are closed
      chrome.storage.sync.get([API_KEY_STORAGE_KEY, API_PROVIDER_STORAGE_KEY], (result) => {
        const hasApiKey = !!result[API_KEY_STORAGE_KEY];
        setApiConfigured(hasApiKey);
        setApiKey(result[API_KEY_STORAGE_KEY] || '');
        setApiProvider(result[API_PROVIDER_STORAGE_KEY] || 'openai');
        
        if (hasApiKey) {
          setFallbackMode(false);
        } else {
          setFallbackMode(true);
        }
      });
    }} />;
  }

  // Display messages including current streaming message
  const displayMessages = [
    ...fallbackMode ? localMessages : messages,
    ...(currentStreamingMessage ? [currentStreamingMessage] : [])
  ];
  const currentInput = fallbackMode ? localInput : input;
  const currentInputHandler = fallbackMode ? handleLocalInputChange : handleInputChange;
  const currentSubmitHandler = fallbackMode ? handleLocalSubmit : handleChatSubmit;
  const currentLoading = fallbackMode ? isLocalLoading : isLoading;

  return (
    <Card className="w-full h-[600px] grid grid-rows-[auto,1fr,auto]">
      <div className="flex justify-between items-center p-3 border-b">
        <h2 className="text-sm font-medium">Earth Engine Assistant</h2>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8" 
          onClick={() => setShowSettings(true)}
        >
          <SettingsIcon className="h-4 w-4" />
        </Button>
      </div>
      
      <ScrollArea className="p-4">
        <div className="space-y-4">
          {displayMessages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex w-max max-w-[90%] flex-col gap-2 rounded-lg px-3 py-2 text-sm',
                message.role === 'user'
                  ? 'ml-auto bg-primary text-primary-foreground'
                  : 'bg-muted'
              )}
            >
              {formatMessageContent(message.content)}
            </div>
          ))}

          {isTyping && !fallbackMode && (
            <div className="flex items-center gap-2 p-3 text-sm bg-muted rounded-lg w-max">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}

          {error && !fallbackMode && (
            <div className="flex items-center gap-2 p-2 text-sm text-red-500 bg-red-50 rounded-md">
              <span>{error.message || "Error connecting to AI service"}</span>
              <div className="flex gap-2 ml-auto">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleRegenerate}
                >
                  <RefreshCw className="h-3 w-3 mr-1" /> Regenerate
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowSettings(true)}
                >
                  Settings
                </Button>
              </div>
            </div>
          )}

          {fallbackMode && apiConfigured && (
            <div className="flex items-center gap-2 p-2 text-sm text-amber-600 bg-amber-50 rounded-md">
              <span>Using local responses. API connection failed.</span>
              <Button 
                variant="outline" 
                size="sm" 
                className="ml-auto"
                onClick={handleRetryAPI}
              >
                Retry API
              </Button>
            </div>
          )}

          <div ref={scrollRef} />
        </div>
      </ScrollArea>
      
      <form
        onSubmit={currentSubmitHandler}
        className="p-4 flex items-center gap-2 border-t"
      >
        <Textarea
          className="min-h-[60px] resize-none"
          placeholder={apiConfigured 
            ? "Ask about Earth Engine..." 
            : "Configure API key in Settings to use AI features..."
          }
          value={currentInput}
          onChange={currentInputHandler}
          onKeyDown={handleKeyDown}
          disabled={currentLoading || (!apiConfigured && !fallbackMode)}
        />
        {currentLoading && !fallbackMode ? (
          <Button
            type="button"
            size="icon"
            variant="destructive"
            onClick={handleStopGenerating}
          >
            <span className="sr-only">Stop generating</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><rect width="6" height="16" x="9" y="4"/></svg>
          </Button>
        ) : (
          <Button
            type="submit"
            size="icon"
            disabled={currentLoading || (!apiConfigured && !fallbackMode) || !currentInput.trim()}
          >
            <Send className="h-4 w-4" />
            <span className="sr-only">Send message</span>
          </Button>
        )}
      </form>

      <style>{`
        .typing-indicator {
          display: flex;
          align-items: center;
        }
        
        .typing-indicator span {
          height: 8px;
          width: 8px;
          margin: 0 2px;
          background-color: #9ca3af;
          border-radius: 50%;
          display: inline-block;
          animation: typing 1.4s infinite ease-in-out both;
        }
        
        .typing-indicator span:nth-child(1) {
          animation-delay: 0s;
        }
        
        .typing-indicator span:nth-child(2) {
          animation-delay: 0.2s;
        }
        
        .typing-indicator span:nth-child(3) {
          animation-delay: 0.4s;
        }
        
        @keyframes typing {
          0%, 100% {
            transform: scale(0.6);
            opacity: 0.6;
          }
          50% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </Card>
  );
}