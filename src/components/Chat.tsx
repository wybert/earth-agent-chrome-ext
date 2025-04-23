import React, { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Settings as SettingsIcon, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Message } from 'ai';
import { Settings } from './Settings';

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

// Earth Engine system prompt with domain expertise
const GEE_SYSTEM_PROMPT = `You are Earth Engine Assistant, an AI specialized in Google Earth Engine (GEE) geospatial analysis.

Your capabilities:
- Provide code examples for GEE tasks like image processing, classification, and visualization
- Explain Earth Engine concepts, APIs, and best practices
- Help troubleshoot Earth Engine code issues
- Recommend appropriate datasets and methods for geospatial analysis

Instructions:
- Always provide code within backticks: \`code\`
- Format Earth Engine code with proper JavaScript/Python syntax
- When suggesting large code blocks, include comments explaining key steps
- Cite specific Earth Engine functions and methods when relevant
- For complex topics, break down explanations step-by-step
- If you're unsure about something, acknowledge limitations rather than providing incorrect information

Common Earth Engine patterns:
- Image and collection loading: ee.Image(), ee.ImageCollection()
- Filtering: .filterDate(), .filterBounds()
- Reducing: .reduce(), .mean(), .median()
- Visualization: Map.addLayer(), ui.Map(), ui.Chart()
- Classification: .classify(), ee.Classifier.randomForest()
- Exporting: Export.image.toDrive(), Export.table.toAsset()

Speak in a helpful, educational tone while providing practical guidance for Earth Engine tasks.`;

export function Chat() {
  const [showSettings, setShowSettings] = useState(false);
  const [apiConfigured, setApiConfigured] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiProvider, setApiProvider] = useState<'openai' | 'anthropic'>('openai');
  const [fallbackMode, setFallbackMode] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  // Direct API call to OpenAI
  const callOpenAI = async (messages: Message[]) => {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: GEE_SYSTEM_PROMPT },
            ...messages.map(msg => ({
              role: msg.role,
              content: msg.content
            }))
          ],
          temperature: 0.2,
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Error calling OpenAI API');
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error: any) {
      console.error('OpenAI API error:', error);
      throw error;
    }
  };

  // Direct API call to Anthropic
  const callAnthropic = async (messages: Message[]) => {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 4000,
          system: GEE_SYSTEM_PROMPT,
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          temperature: 0.2,
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Error calling Anthropic API');
      }

      const data = await response.json();
      return data.content[0].text;
    } catch (error: any) {
      console.error('Anthropic API error:', error);
      throw error;
    }
  };

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

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || isLoading) return;
    
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    if (fallbackMode) {
      // Generate a response with a slight delay to simulate processing
      setTimeout(() => {
        const response = getGeeResponse(userMessage.content);
        
        // Add assistant message
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response,
        };
        
        setMessages(prev => [...prev, assistantMessage]);
        setIsLoading(false);
      }, 1000);
    } else {
      try {
        // Send to the appropriate API based on provider
        const allMessages = [...messages, userMessage]; // Include the new user message
        let responseContent: string;
        
        if (apiProvider === 'openai') {
          responseContent = await callOpenAI(allMessages);
        } else {
          responseContent = await callAnthropic(allMessages);
        }
        
        // Add assistant message
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: responseContent,
        };
        
        setMessages(prev => [...prev, assistantMessage]);
        setErrorMessage(null);
      } catch (error: any) {
        console.error("Chat API error:", error);
        setErrorMessage(error.message || "Error connecting to AI service");
        
        // Add a fallback response
        const fallbackMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: "I'm having trouble connecting to the AI service. Please check your API key in settings or try again later.",
        };
        
        setMessages(prev => [...prev, fallbackMessage]);
        
        // Switch to fallback mode for API errors
        if (error.message?.includes('API key') || error.message?.includes('auth')) {
          setFallbackMode(true);
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleRegenerate = async () => {
    if (messages.length >= 2 && !isLoading) {
      // Find the index of the last user message
      let lastUserMessageIndex = -1;
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'user') {
          lastUserMessageIndex = i;
          break;
        }
      }
      
      if (lastUserMessageIndex !== -1) {
        setIsLoading(true);
        setErrorMessage(null);
        
        // Keep messages up to and including the last user message
        const updatedMessages = messages.slice(0, lastUserMessageIndex + 1);
        setMessages(updatedMessages);
        
        try {
          // Send to the appropriate API based on provider
          let responseContent: string;
          
          if (apiProvider === 'openai') {
            responseContent = await callOpenAI(updatedMessages);
          } else {
            responseContent = await callAnthropic(updatedMessages);
          }
          
          // Add new assistant message
          const assistantMessage: Message = {
            id: Date.now().toString(),
            role: 'assistant',
            content: responseContent,
          };
          
          setMessages([...updatedMessages, assistantMessage]);
        } catch (error: any) {
          console.error("Regeneration error:", error);
          setErrorMessage(error.message || "Error regenerating response");
          
          // Add a fallback response
          const fallbackMessage: Message = {
            id: Date.now().toString(),
            role: 'assistant',
            content: "I'm having trouble regenerating a response. Please check your API key in settings or try again later.",
          };
          
          setMessages([...updatedMessages, fallbackMessage]);
        } finally {
          setIsLoading(false);
        }
      }
    }
  };

  const handleRetryAPI = () => {
    setFallbackMode(false);
    setErrorMessage(null);
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
          setFallbackMode(false); // Try to use API again if key was added
          setErrorMessage(null);
        } else {
          setFallbackMode(true);
        }
      });
    }} />;
  }

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
          {messages.map((message) => (
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

          {errorMessage && !fallbackMode && (
            <div className="flex items-center gap-2 p-2 text-sm text-red-500 bg-red-50 rounded-md">
              <span>{errorMessage}</span>
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
        onSubmit={handleSubmit}
        className="p-4 flex items-center gap-2 border-t"
      >
        <Textarea
          className="min-h-[60px] resize-none"
          placeholder={apiConfigured 
            ? "Ask about Earth Engine..." 
            : "Configure API key in Settings to use AI features..."
          }
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={isLoading || (!apiConfigured && !fallbackMode)}
        />
        <Button
          type="submit"
          size="icon"
          disabled={isLoading || (!apiConfigured && !fallbackMode) || !input.trim()}
        >
          <Send className="h-4 w-4" />
          {isLoading && <span className="sr-only">Sending...</span>}
        </Button>
      </form>
    </Card>
  );
}