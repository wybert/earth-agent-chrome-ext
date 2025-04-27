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
      return <div className="whitespace-pre-wrap break-words">{content}</div>;
    }
    
    return (
      <div className="whitespace-pre-wrap break-words">
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
  const [connectionAttempts, setConnectionAttempts] = useState(0);

  // Initialize port connection
  useEffect(() => {
    let newPort: chrome.runtime.Port | null = null;
    
    const connectToBackground = () => {
      try {
        console.log('Connecting to background script...');
        newPort = chrome.runtime.connect({ name: 'sidepanel' });
        
        newPort.onMessage.addListener((response: any) => {
          console.log('Received message:', response);
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
          console.log('Disconnected from background script, error:', chrome.runtime.lastError);
          if (newPort === port) {
            setPort(null);
            
            // Try to reconnect if we haven't tried too many times
            if (connectionAttempts < 3) {
              console.log(`Attempting to reconnect (${connectionAttempts + 1}/3)...`);
              setConnectionAttempts(prev => prev + 1);
              setTimeout(connectToBackground, 1000);
            } else {
              setFallbackMode(true);
              console.error('Failed to connect after multiple attempts. Switching to fallback mode.');
            }
          }
        });

        setPort(newPort);
        setConnectionAttempts(0);
        console.log('Connected to background script');
        
        // Send a ping to verify connection
        newPort.postMessage({ type: 'PING' });
        
        return newPort;
      } catch (error) {
        console.error('Failed to connect to background script:', error);
        setFallbackMode(true);
        return null;
      }
    };
    
    // Connect when component mounts or connection attempts change
    const currentPort = connectToBackground();
    
    // Clean up function
    return () => {
      if (currentPort) {
        try {
          currentPort.disconnect();
        } catch (e) {
          console.error('Error disconnecting port:', e);
        }
      }
    };
  }, [connectionAttempts]); // Dependency on connectionAttempts to allow reconnection attempts

  // Custom submit handler that uses port messaging
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate input
    if (!input.trim() || isLoading) return;
    
    setIsTyping(true);
    setCurrentStreamingMessage(null);
    
    try {
      if (port) {
        // Send message through port
        const message: ExtensionMessage = {
          type: 'CHAT_MESSAGE',
          message: input.trim(),
          apiKey,
          provider: apiProvider
        };

        console.log('Sending message:', message);
        port.postMessage(message);
      } else {
        // Try to reconnect or fall back
        console.error('No port connection available');
        
        // Attempt to reconnect
        setConnectionAttempts(prev => prev + 1);
        
        // Add user message
        const userMessage: Message = {
          id: Date.now().toString(),
          role: 'user',
          content: input.trim()
        };
        
        setMessages(prev => [...prev, userMessage]);
        
        // Show a temporary response about connection issue
        setTimeout(() => {
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: 'I\'m having trouble connecting to the backend service. Trying to reconnect...'
          };
          
          setMessages(prev => [...prev, assistantMessage]);
          setIsTyping(false);
          setFallbackMode(true);
        }, 1000);
      }
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
    <Card className="w-full h-full grid grid-rows-[auto,1fr,auto] border-0 rounded-none shadow-none">
      <div className="flex justify-between items-center p-2 px-3 border-b">
        <h2 className="text-base font-medium">Mapping through prompting</h2>
        <Button 
          variant="outline"
          size="icon"
          rounded="full"
          onClick={() => setShowSettings(true)}
          aria-label="Settings"
          className="aspect-square bg-gray-200 hover:bg-gray-300 w-10 h-10 p-0 border-0"
        >
          <SettingsIcon className="h-5 w-5 text-gray-600" />
        </Button>
      </div>
      
      <ScrollArea className="px-2 py-4 rounded-none">
        <div className="space-y-4 w-full mx-auto">
          {displayMessages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex flex-col gap-2 rounded-lg px-3 py-2 text-base break-words',
                message.role === 'user'
                  ? 'ml-auto bg-primary text-primary-foreground'
                  : 'bg-muted'
              )}
              style={{ maxWidth: '98%', minWidth: 'unset', width: 'auto' }}
            >
              {formatMessageContent(message.content)}
            </div>
          ))}

          {isTyping && !fallbackMode && (
            <div className="flex items-center gap-2 p-3 text-base bg-muted rounded-lg w-max">
              <div className="typing-indicator flex gap-1">
                <span className="h-2 w-2 bg-muted-foreground rounded-full animate-pulse"></span>
                <span className="h-2 w-2 bg-muted-foreground rounded-full animate-pulse delay-150"></span>
                <span className="h-2 w-2 bg-muted-foreground rounded-full animate-pulse delay-300"></span>
              </div>
            </div>
          )}

          {error && !fallbackMode && (
            <div className="flex items-center gap-2 p-2 text-base text-destructive bg-destructive/10 rounded-md">
              <span>{error.message || "Error connecting to AI service"}</span>
              <div className="flex gap-2 ml-auto">
                <Button 
                  variant="outline" 
                  size="sm"
                  rounded="lg"
                  onClick={handleRegenerate}
                >
                  <RefreshCw className="h-3 w-3 mr-1" /> Regenerate
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  rounded="lg"
                  onClick={() => setShowSettings(true)}
                >
                  Settings
                </Button>
              </div>
            </div>
          )}

          {fallbackMode && apiConfigured && (
            <div className="flex items-center gap-2 p-2 text-base text-warning-foreground bg-warning/10 rounded-md">
              <span>Using local responses. API connection failed.</span>
              <Button 
                variant="warning" 
                size="sm"
                rounded="lg"
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
        className="p-2 px-3 flex items-center gap-2 border-t"
      >
        <Textarea
          className="min-h-[60px] resize-none text-base"
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
            variant="outline"
            rounded="full"
            onClick={handleStopGenerating}
            aria-label="Stop generating"
            className="aspect-square bg-gray-200 hover:bg-gray-300 w-10 h-10 p-0 border-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-gray-600"><rect width="6" height="16" x="9" y="4"/></svg>
          </Button>
        ) : (
          <Button
            type="submit"
            size="icon"
            variant="outline"
            rounded="full"
            disabled={currentLoading || (!apiConfigured && !fallbackMode) || !currentInput.trim()}
            aria-label="Send message"
            className="aspect-square bg-gray-200 hover:bg-gray-300 w-10 h-10 p-0 border-0"
          >
            <Send className="h-5 w-5 text-gray-600" />
          </Button>
        )}
      </form>
    </Card>
  );
}