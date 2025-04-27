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
import { z } from 'zod';

// Define Zod schema for message responses
const MessageContentSchema = z.string().min(1);

const OpenAIChoiceSchema = z.object({
  message: z.object({
    content: MessageContentSchema
  })
});

const OpenAIResponseSchema = z.object({
  choices: z.array(OpenAIChoiceSchema).min(1)
});

// More flexible response schema that handles multiple formats
const ChatResponseSchema = z.object({
  type: z.string(),
  requestId: z.string(),
}).and(
  z.union([
    // Direct response in response field
    z.object({ 
      response: MessageContentSchema 
    }),
    // Response in fullText field
    z.object({ 
      fullText: MessageContentSchema 
    }),
    // OpenAI format
    z.object({ 
      data: OpenAIResponseSchema 
    }),
    // Simple content field
    z.object({ 
      data: z.object({ 
        content: MessageContentSchema 
      }) 
    })
  ])
);

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
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const portRef = useRef<chrome.runtime.Port | null>(null);
  
  // Vercel AI SDK's useChat hook with edge runtime streaming support
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    error,
    setMessages,
    reload,
    stop,
  } = useChat({
    api: `chrome-extension://${chrome.runtime.id}/api/chat`,
    initialMessages: [WELCOME_MESSAGE],
    body: {
      apiKey,
      provider: apiProvider
    },
    onResponse: () => {
      // We're not using the built-in processing 
      console.log("API response received");
    },
    onFinish: () => {
      setIsLoading(false);
    },
    onError: (error) => {
      console.error("Chat API error:", error);
      setFallbackMode(true);
      setIsLoading(false);
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
  }, [messages, localMessages]);

  // Initialize port connection to background script
  useEffect(() => {
    function setupPort() {
      try {
        console.log('Connecting to background script...');
        const newPort = chrome.runtime.connect({ name: 'sidepanel' });
        
        newPort.onMessage.addListener(handleResponse);
        
        newPort.onDisconnect.addListener(() => {
          console.log('Disconnected from background script', chrome.runtime.lastError);
          portRef.current = null;
          setFallbackMode(true);
        });
        
        portRef.current = newPort;
        console.log('Connected to background script');
        
        // Send initialization message
        newPort.postMessage({ type: 'INIT' });
      } catch (error) {
        console.error('Failed to connect to background script:', error);
        portRef.current = null;
        setFallbackMode(true);
      }
    }
    
    // Initial setup
    setupPort();
    
    // Cleanup on unmount
    return () => {
      if (portRef.current) {
        try {
          portRef.current.disconnect();
          portRef.current = null;
        } catch (e) {
          console.error('Error disconnecting port:', e);
        }
      }
    };
  }, []);
  
  // Extract response content from validated schema
  const extractResponseContent = (validatedResponse: z.infer<typeof ChatResponseSchema>): string => {
    if ('response' in validatedResponse) {
      console.log('Using validated direct response field');
      return validatedResponse.response;
    } 
    else if ('fullText' in validatedResponse) {
      console.log('Using validated fullText field');
      return validatedResponse.fullText;
    }
    else if ('data' in validatedResponse) {
      const data = validatedResponse.data;
      if ('choices' in data && data.choices.length > 0) {
        console.log('Using validated OpenAI format response');
        return data.choices[0].message.content;
      }
      else if ('content' in data) {
        console.log('Using validated simple content field');
        return data.content;
      }
    }
    
    // This should never happen if validation passed
    throw new Error('Could not extract content from validated response');
  };
  
  // Handle responses from background script
  const handleResponse = (response: any) => {
    console.log('Received message from background:', response);
    
    // Dump the full response object as JSON for debugging
    try {
      console.log('Full response object:', JSON.stringify(response, null, 2));
    } catch (e) {
      console.log('Could not stringify response object:', e);
    }
    
    // Process message based on type
    switch (response.type) {
      case 'CHAT_RESPONSE':
        // Create user message
        const userMessage: Message = {
          id: Date.now().toString(),
          role: 'user',
          content: input
        };
        
        try {
          // Validate response using Zod schema
          const validationResult = ChatResponseSchema.safeParse(response);
          
          if (validationResult.success) {
            // Extract response content from validated data
            const responseContent = extractResponseContent(validationResult.data);
            
            const assistantMessage: Message = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: responseContent
            };
            
            setMessages(prev => [...prev, userMessage, assistantMessage]);
            handleInputChange({ target: { value: '' } } as React.ChangeEvent<HTMLTextAreaElement>);
          } else {
            // Handle validation error - try fallback content extraction
            console.warn('Response validation failed:', validationResult.error);
            let responseContent = '';
            
            // Try the standard extraction methods
            if (response.response) {
              responseContent = response.response;
              console.log('Using direct response field (fallback):', responseContent.substring(0, 100) + '...');
            } else if (response.data) {
              if (response.data.choices && response.data.choices.length > 0) {
                responseContent = response.data.choices[0].message?.content || '';
                console.log('Using OpenAI format response (fallback):', responseContent.substring(0, 100) + '...');
              } else if (response.data.content) {
                responseContent = response.data.content;
                console.log('Using simple content field (fallback):', responseContent.substring(0, 100) + '...');
              } else if (typeof response.data === 'string') {
                responseContent = response.data;
                console.log('Using string response (fallback):', responseContent.substring(0, 100) + '...');
              }
            } else if (response.fullText) {
              responseContent = response.fullText;
              console.log('Using fullText field (fallback):', responseContent.substring(0, 100) + '...');
            }
            
            // If we still couldn't extract content, look for any string properties
            if (!responseContent.trim()) {
              console.warn('Fallback extraction failed, trying to find any text content');
              
              // Recursively search for any string property longer than 20 characters
              const findTextContent = (obj: any, depth = 0): string => {
                if (depth > 5) return ''; // Limit recursion depth
                
                if (typeof obj === 'string' && obj.trim().length > 20) {
                  console.log('Found potential text content:', obj.substring(0, 50) + '...');
                  return obj;
                }
                
                if (obj && typeof obj === 'object') {
                  for (const key in obj) {
                    const value = obj[key];
                    const content = findTextContent(value, depth + 1);
                    if (content) return content;
                  }
                }
                
                return '';
              };
              
              const foundContent = findTextContent(response);
              if (foundContent) {
                console.log('Using discovered text content');
                responseContent = foundContent;
              } else {
                console.warn('No usable content found in the response');
                responseContent = 'Sorry, I could not generate a response.';
              }
            }
            
            const assistantMessage: Message = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: responseContent
            };
            
            setMessages(prev => [...prev, userMessage, assistantMessage]);
            handleInputChange({ target: { value: '' } } as React.ChangeEvent<HTMLTextAreaElement>);
          }
        } catch (error) {
          console.error('Error processing response:', error);
          
          // Add error message
          const errorAssistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: "Sorry, I encountered an error processing the response. Please try again."
          };
          
          setMessages(prev => [...prev, userMessage, errorAssistantMessage]);
        }
        
        setIsLoading(false);
        break;
        
      case 'CHAT_STREAM_END':
        // Just mark the loading as complete, don't add a new message
        console.log('Stream ended, loading complete');
        setIsLoading(false);
        break;
        
      case 'ERROR':
        console.error('Chat API error:', response.error);
        
        // Add user message even when there's an error
        const errorUserMessage: Message = {
          id: Date.now().toString(),
          role: 'user',
          content: input
        };
        
        // Add error message
        const errorAssistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: "Sorry, I encountered an error processing your request. Please try again or check your API configuration."
        };
        
        setMessages(prev => [...prev, errorUserMessage, errorAssistantMessage]);
        handleInputChange({ target: { value: '' } } as React.ChangeEvent<HTMLTextAreaElement>);
        setFallbackMode(true);
        setIsLoading(false);
        break;
        
      // Ignore streaming chunks since we're not using streaming
      case 'CHAT_STREAM_CHUNK':
        // Do nothing - we're ignoring intermediate chunks
        break;
        
      default:
        console.log('Unknown message type:', response.type);
        break;
    }
  };

  // Format message content to properly render code blocks
  const formatMessageContent = (content: string) => {
    // Check if content contains code blocks
    if (!content.includes('```')) {
      return <div className="whitespace-pre-wrap break-words">{content}</div>;
    }
    
    // Split by code blocks (```code```)
    const segments = content.split(/(```(?:javascript|js)?\n[\s\S]*?\n```)/g);
    
    return (
      <div className="w-full">
        {segments.map((segment, idx) => {
          // Check if this is a code block
          if (segment.startsWith('```') && segment.endsWith('```')) {
            // Extract code without the backticks and language identifier
            let code = segment.replace(/```(?:javascript|js)?\n/, '').replace(/\n```$/, '');
            
            return (
              <div key={idx} className="my-4 w-full overflow-hidden rounded-md border border-gray-200">
                <div className="bg-gray-900 text-white px-4 py-2 text-sm flex justify-between items-center">
                  <span>JavaScript</span>
                  <button 
                    onClick={() => navigator.clipboard.writeText(code)}
                    className="hover:bg-gray-700 p-1 rounded"
                    title="Copy code"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  </button>
                </div>
                <pre className="bg-gray-800 text-gray-100 p-4 overflow-x-auto">
                  <code className="text-sm font-mono">{code}</code>
                </pre>
              </div>
            );
          } else if (segment.trim()) {
            // Regular text content
            return (
              <div key={idx} className="whitespace-pre-wrap break-words mb-3">
                {segment}
              </div>
            );
          }
          return null;
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

  // Custom submit handler that uses port messaging
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || isLoading) return;
    
    setIsLoading(true);
    
    try {
      if (portRef.current) {
        // Send message through port
        const message: ExtensionMessage = {
          type: 'CHAT_MESSAGE',
          message: input.trim(),
          apiKey,
          provider: apiProvider
        };

        console.log('Sending message:', message);
        portRef.current.postMessage(message);
      } else {
        // Try to reconnect
        console.error('No port connection available');
        setFallbackMode(true);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error sending chat message:', error);
      setFallbackMode(true);
      setIsLoading(false);
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
      setIsLoading(true);
      reload();
    }
  };

  const handleStopGenerating = () => {
    stop();
    setIsLoading(false);
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

  // Messages to display
  const displayMessages = [...(fallbackMode ? localMessages : messages)];
  
  // Current input state
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
          {/* Show messages */}
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

          {/* Simple loading indicator */}
          {currentLoading && (
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
        {currentLoading ? (
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