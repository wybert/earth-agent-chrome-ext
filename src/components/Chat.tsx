import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings as SettingsIcon, RefreshCw, Wrench, Plus } from 'lucide-react';
import type { Message } from 'ai'; // Keep this type
import { Settings } from './Settings';
import { ExtensionMessage } from '../types/extension'; // Restore this type
import ToolsTestPanel from './ui/ToolsTestPanel';
import { z } from 'zod'; // Restore Zod
import { Chat } from "@/components/ui/chat"; // Keep the UI component

// Define Zod schema for message responses (Restore)
const MessageContentSchema = z.string().min(1);

const OpenAIChoiceSchema = z.object({
  message: z.object({
    content: MessageContentSchema
  })
});

const OpenAIResponseSchema = z.object({
  choices: z.array(OpenAIChoiceSchema).min(1)
});

// More flexible response schema that handles multiple formats (Restore)
const ChatResponseSchema = z.object({
  type: z.string(),
  requestId: z.string().optional(),
}).and(
  z.union([
    z.object({ response: MessageContentSchema }),
    z.object({ fullText: MessageContentSchema }),
    z.object({ data: OpenAIResponseSchema }),
    z.object({ data: z.object({ content: MessageContentSchema }) })
  ])
);

// Chrome storage keys (Keep)
const CHAT_SESSIONS_KEY = 'earth_engine_chat_sessions';
const ACTIVE_SESSION_ID_KEY = 'earth_engine_active_session_id';
const API_KEY_STORAGE_KEY = 'earth_engine_llm_api_key'; // Legacy key
const OPENAI_API_KEY_STORAGE_KEY = 'earth_engine_openai_api_key';
const ANTHROPIC_API_KEY_STORAGE_KEY = 'earth_engine_anthropic_api_key';
const API_PROVIDER_STORAGE_KEY = 'earth_engine_llm_provider';

// Default welcome message (Restore)
const createWelcomeMessage = (): Message => ({
  id: `welcome-${Date.now()}`,
  role: 'assistant',
  content: 'Hello! I\'m your Earth Engine Assistant. How can I help you with Earth Engine today?'
});

// Type for session data storage (Keep)
interface ChatSessions {
  [sessionId: string]: Message[];
}

// Restore original component name and structure
export function ChatUI() {
  const [showSettings, setShowSettings] = useState(false);
  const [showToolsTest, setShowToolsTest] = useState(false);
  const [apiConfigured, setApiConfigured] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiProvider, setApiProvider] = useState<'openai' | 'anthropic'>('openai');
  const [fallbackMode, setFallbackMode] = useState(false); // Restore fallback state
  const [isLocalLoading, setIsLocalLoading] = useState(false); // Restore loading state

  // Restore local state management
  const [sessions, setSessions] = useState<ChatSessions>({});
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState<Error | null>(null);

  // Restore port connection state and logic
  const [port, setPort] = useState<chrome.runtime.Port | null>(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const MAX_CONNECTION_ATTEMPTS = 3;

  // Restore API config check useEffect
  useEffect(() => {
    chrome.storage.sync.get([
      API_KEY_STORAGE_KEY, 
      OPENAI_API_KEY_STORAGE_KEY,
      ANTHROPIC_API_KEY_STORAGE_KEY,
      API_PROVIDER_STORAGE_KEY
    ], (result) => {
      const provider = result[API_PROVIDER_STORAGE_KEY] || 'openai';
      
      // Determine if an API key is configured for the selected provider
      let hasKey = false;
      let currentKey = '';
      
      if (provider === 'openai') {
        currentKey = result[OPENAI_API_KEY_STORAGE_KEY] || result[API_KEY_STORAGE_KEY] || '';
        hasKey = !!currentKey;
      } else if (provider === 'anthropic') {
        currentKey = result[ANTHROPIC_API_KEY_STORAGE_KEY] || result[API_KEY_STORAGE_KEY] || '';
        hasKey = !!currentKey;
      }
      
      const hasApiKey = hasKey;
      setApiConfigured(hasApiKey);
      setApiKey(currentKey);
      setApiProvider(provider);
      
      if (!hasKey) {
        setShowSettings(true);
      }
    });
  }, []);

  // Restore session loading useEffect
  useEffect(() => {
    chrome.storage.local.get([CHAT_SESSIONS_KEY, ACTIVE_SESSION_ID_KEY], (result) => {
      const loadedSessions: ChatSessions = result[CHAT_SESSIONS_KEY] || {};
      let currentActiveId: string | null = result[ACTIVE_SESSION_ID_KEY] || null;
      if (!currentActiveId || Object.keys(loadedSessions).length === 0) {
        const newSessionId = `session_${Date.now()}`;
        loadedSessions[newSessionId] = [createWelcomeMessage()];
        currentActiveId = newSessionId;
        chrome.storage.local.set({
          [CHAT_SESSIONS_KEY]: loadedSessions,
          [ACTIVE_SESSION_ID_KEY]: currentActiveId
        });
        console.log("Initialized first chat session:", newSessionId);
      }
      setSessions(loadedSessions);
      setActiveSessionId(currentActiveId);
      setMessages(loadedSessions[currentActiveId] || [createWelcomeMessage()]);
      console.log("Loaded sessions, active ID:", currentActiveId);
    });
  }, []);

  // Restore session saving useEffect
  useEffect(() => {
    if (activeSessionId && messages.length > 0) {
      const updatedSessions: ChatSessions = { ...sessions };
      updatedSessions[activeSessionId] = messages;
      setSessions(updatedSessions);
      chrome.storage.local.set({ [CHAT_SESSIONS_KEY]: updatedSessions });
      }
  }, [messages, activeSessionId]);

  // Restore port connection useEffect
  useEffect(() => {
    let currentPort: chrome.runtime.Port | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;
    let isActive = true;
    
    const connectToBackground = () => {
      if (!isActive) return;
      try {
        console.log('Connecting to background script...');
        currentPort = chrome.runtime.connect({ name: 'sidepanel' });
        setPort(currentPort);
        setConnectionAttempts(0);
        setFallbackMode(false);
        setError(null);

        currentPort.onMessage.addListener(handleResponseWrapper);
        currentPort.onDisconnect.addListener(() => {
          console.log('Disconnected from background script, error:', chrome.runtime.lastError?.message);
          setPort(prevPort => (prevPort === currentPort ? null : prevPort));
          if (isActive) {
             if (chrome.runtime.lastError) {
                console.error('Disconnect error:', chrome.runtime.lastError.message);
                setError(new Error(`Connection lost: ${chrome.runtime.lastError.message}. Attempting reconnect...`));
                setConnectionAttempts(prev => {
                   const nextAttempts = prev + 1;
                   if (nextAttempts <= MAX_CONNECTION_ATTEMPTS) {
                     console.log(`Attempting to reconnect (${nextAttempts}/${MAX_CONNECTION_ATTEMPTS})...`);
                     reconnectTimer = setTimeout(connectToBackground, 1000 * nextAttempts);
                     return nextAttempts;
            } else {
              setFallbackMode(true);
                     setError(new Error(`Failed to connect after ${MAX_CONNECTION_ATTEMPTS} attempts. Switched to Fallback Mode.`));
                     console.error(`Failed to connect after ${MAX_CONNECTION_ATTEMPTS} attempts. Switching to fallback mode.`);
                     return nextAttempts;
                   }
                });
             } else {
               console.log('Port disconnected normally.');
               reconnectTimer = setTimeout(connectToBackground, 500);
            }
          }
        });
        console.log('Connected to background script');
        currentPort.postMessage({ type: 'PING' });
      } catch (error: any) {
        if (isActive) {
        console.error('Failed to connect to background script:', error);
           setError(new Error(`Failed to connect: ${error.message}. Using Fallback Mode.`));
        setFallbackMode(true);
        }
      }
    };
    
    const handleResponseWrapper = (response: any) => {
      if (isActive) {
        handleResponse(response);
      }
    };

    connectToBackground();
    return () => {
      isActive = false;
      console.log('ChatUI unmounting, disconnecting port...');
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (currentPort) {
          currentPort.disconnect();
      }
      setPort(null);
    };
  }, [connectionAttempts]); // Restore dependency

  // Restore response extraction helper
  const extractResponseContent = (validatedResponse: z.infer<typeof ChatResponseSchema>): string => {
    if ('response' in validatedResponse) return validatedResponse.response;
    if ('fullText' in validatedResponse) return validatedResponse.fullText;
    if ('data' in validatedResponse) {
      const data = validatedResponse.data;
      if ('choices' in data && data.choices.length > 0) return data.choices[0].message.content;
      if ('content' in data) return data.content;
    }
    throw new Error('Could not extract content from validated response');
  };

  // Restore background message handler
  const handleResponse = (response: any) => {
    setIsLocalLoading(false);
    setError(null);
    setFallbackMode(false);
    
    // Remove verbose logging of every chunk message
    // Only log non-stream chunks for debugging
    if (response.type !== 'CHAT_STREAM_CHUNK') {
      console.log('Received message from background:', response);
    try {
      console.log('Full response object:', JSON.stringify(response, null, 2));
      } catch (e) { /* ignore */ }
    }
    
    switch (response.type) {
      case 'CHAT_RESPONSE':
        try {
          const validationResult = ChatResponseSchema.safeParse(response);
          let responseContent = '';
          if (validationResult.success) {
            responseContent = extractResponseContent(validationResult.data);
          } else {
            console.warn('Response validation failed:', validationResult.error);
            // Restore fallback extraction logic
            if (response.response) responseContent = response.response;
            else if (response.data?.choices?.[0]?.message?.content) responseContent = response.data.choices[0].message.content;
            else if (response.data?.content) responseContent = response.data.content;
            else if (typeof response.data === 'string') responseContent = response.data;
            else if (response.fullText) responseContent = response.fullText;
            // Add deep search if necessary
            if (!responseContent.trim()) responseContent = 'Sorry, I could not process the response.';
          }
          const assistantMessage: Message = {
            id: response.requestId || (Date.now() + 1).toString(),
            role: 'assistant',
            content: responseContent
          };
          setMessages(prev => {
              const placeholderIndex = prev.findIndex(m => m.id.startsWith('assistant-placeholder-'));
              if (placeholderIndex !== -1) {
                  const newMessages = [...prev];
                  newMessages[placeholderIndex] = assistantMessage;
                  return newMessages;
              } else {
                  return [...prev, assistantMessage];
              }
          });
        } catch (error: any) {
          console.error('Error processing response:', error);
          setError(new Error(`Error processing response: ${error.message}`));
          const errorAssistantMessage: Message = {
            id: response.requestId || (Date.now() + 1).toString(),
            role: 'assistant',
            content: "Sorry, I encountered an error processing the response."
          };
          setMessages(prev => {
              const placeholderIndex = prev.findIndex(m => m.id.startsWith('assistant-placeholder-'));
              if (placeholderIndex !== -1) {
                  const newMessages = [...prev];
                  newMessages[placeholderIndex] = errorAssistantMessage;
                  return newMessages;
              } else {
                  return [...prev, errorAssistantMessage];
        }
          });
        }
        break;
      case 'CHAT_STREAM_CHUNK':
        if (response.chunk) {
          // Enhanced logging for tool-related chunks
          if (response.chunk.includes('tool_call') || response.chunk.includes('function_call')) {
            console.log('Received tool call chunk. Processing...');
          } else if (response.chunk.includes('tool_result') || response.chunk.includes('tool:')) {
            console.log('Received tool result chunk. Processing...');
          }
          
          setMessages(prevMessages => {
             const lastMessageIndex = prevMessages.length - 1;
             if (lastMessageIndex < 0 || !prevMessages[lastMessageIndex].id.startsWith('assistant-placeholder-')) {
              return prevMessages;
            }
            const updatedLastMessage = {
              ...prevMessages[lastMessageIndex],
              content: prevMessages[lastMessageIndex].content + response.chunk
            };
             return [...prevMessages.slice(0, lastMessageIndex), updatedLastMessage];
          });
        }
        break;
      case 'CHAT_STREAM_END':
        setIsLocalLoading(false);
        setMessages(prevMessages => {
            const lastMessageIndex = prevMessages.length - 1;
          if (lastMessageIndex >= 0 && prevMessages[lastMessageIndex].id.startsWith('assistant-placeholder-')) {
            const finalId = response.requestId || prevMessages[lastMessageIndex].id.replace('assistant-placeholder-', 'final-');
            
            // Check for incomplete tool responses
            const content = prevMessages[lastMessageIndex].content;
            let finalizedContent = content;
            
            // Ensure tool call responses are properly formatted if they appear incomplete
            if ((content.includes('tool_call') || content.includes('function_call')) && 
                (!content.includes('tool_result') && !content.includes('final result'))) {
              console.log('Tool call without result detected. This may indicate an incomplete response.');
            }
            
            const finalizedMessage = { 
              ...prevMessages[lastMessageIndex], 
              id: finalId,
              content: finalizedContent 
            };
            return [...prevMessages.slice(0, lastMessageIndex), finalizedMessage];
          }
          return prevMessages;
        });
        break;
      case 'ERROR':
        console.error('Background script error:', response.error);
        // Extract API key errors and provide more helpful messages
        let errorMessage = response.error || 'Unknown error';
        let errorSuggestion = '';
        
        if (errorMessage.includes('API key') || errorMessage.includes('authorization') || 
            errorMessage.includes('authenticate') || errorMessage.includes('401')) {
          errorMessage = 'API key issue: ' + errorMessage;
          errorSuggestion = 'Please check your API key in Settings.';
        } else if (errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
          errorMessage = 'Rate limiting: ' + errorMessage;
          errorSuggestion = 'Try again in a few minutes.';
        } else if (errorMessage.includes('model') && errorMessage.includes('not')) {
          errorMessage = 'Model availability issue: ' + errorMessage;
          errorSuggestion = 'Check available models or try a different model in Settings.';
        }
        
        setError(new Error(`${errorMessage} ${errorSuggestion}`));
        setIsLocalLoading(false);
        const errorAssistantMessage: Message = {
          id: response.requestId || (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Sorry, I encountered an error: ${errorMessage}. ${errorSuggestion}`
        };
        setMessages(prev => {
            const placeholderIndex = prev.findIndex(m => m.id.startsWith('assistant-placeholder-'));
            if (placeholderIndex !== -1) {
                const newMessages = [...prev];
                newMessages[placeholderIndex] = errorAssistantMessage;
                return newMessages;
            } else {
                return [...prev, errorAssistantMessage];
            }
        });
        break;
      default: break;
    }
  };

  // Restore input handler
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  // Restore original submit handler using port
  const handleChatSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLocalLoading || !port || !activeSessionId) {
       if(!port) setError(new Error("Connection error: Cannot reach background service."));
       return;
    }
    const userMessageContent = input.trim();
    const newUserMessage: Message = { id: 'user-' + Date.now(), role: 'user', content: userMessageContent };
    const assistantPlaceholder: Message = { id: 'assistant-placeholder-' + Date.now(), role: 'assistant', content: '' };
    setMessages(prev => [...prev, newUserMessage, assistantPlaceholder]);
    setInput('');
    setIsLocalLoading(true);
    setError(null);
    const messagesForApi = sessions[activeSessionId]
      ?.filter(m => !m.id.startsWith('welcome') && !m.id.startsWith('assistant-placeholder-'))
      .concat(newUserMessage) || [newUserMessage];
    const messagePayload: ExtensionMessage = {
          type: 'CHAT_MESSAGE',
          message: userMessageContent,
          messages: messagesForApi
        };
    port.postMessage(messagePayload);
  }, [input, isLocalLoading, port, activeSessionId, sessions]);

  // Restore regenerate handler
  const handleRegenerate = useCallback(() => {
    if (isLocalLoading || !port || !activeSessionId) return;
    let lastUserMessage: Message | null = null;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserMessage = messages[i]; break;
      }
    }
    if (lastUserMessage) {
      setIsLocalLoading(true);
      setError(null);
      const historyUpToUser = messages.slice(0, messages.findIndex(m => m.id === lastUserMessage!.id) + 1);
      const assistantPlaceholder: Message = { id: 'assistant-placeholder-' + Date.now(), role: 'assistant', content: '' };
      setMessages([...historyUpToUser, assistantPlaceholder]);
      const messagesForApi = historyUpToUser
          .filter(m => !m.id.startsWith('welcome') && !m.id.startsWith('assistant-placeholder-'));
      const messagePayload: ExtensionMessage = {
        type: 'CHAT_MESSAGE',
        message: lastUserMessage.content,
        messages: messagesForApi
      };
      port.postMessage(messagePayload);
    }
  }, [messages, isLocalLoading, port, activeSessionId]);

  // Restore stop handler
  const stop = useCallback(() => {
      if (!port) return;
      port.postMessage({ type: 'CANCEL_STREAM' });
      setIsLocalLoading(false);
      setMessages(prev => prev.filter(m => !m.id.startsWith('assistant-placeholder-')));
  }, [port]);

  // Restore append (if needed, though likely unused with port logic)
  const append = useCallback((message: Message) => {
     setMessages(prev => [...prev, message]);
  }, []);

  // Restore retry handler
  const handleRetryAPI = useCallback(() => {
    setError(null);
    setFallbackMode(false);
    if (!port) {
        setConnectionAttempts(prev => prev + 1);
    } else {
        port.postMessage({ type: 'PING' });
    }
  }, [port]);

  // Restore new chat handler
  const handleNewChat = useCallback(() => {
    const newSessionId = `session_${Date.now()}`;
    const welcomeMsg = createWelcomeMessage();
    const newSessions = { ...sessions, [newSessionId]: [welcomeMsg] };
    setSessions(newSessions);
    setActiveSessionId(newSessionId);
    setMessages([welcomeMsg]);
    setInput('');
    setError(null);
    setIsLocalLoading(false);
    chrome.storage.local.set({
      [CHAT_SESSIONS_KEY]: newSessions,
      [ACTIVE_SESSION_ID_KEY]: newSessionId
    });
  }, [sessions]);

  // Restore simple local fallback handler
  const handleLocalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLocalLoading) return;
    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLocalLoading(true);
    setTimeout(() => {
      const response = "Fallback mode active.";
      const assistantMessage: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: response };
      setMessages(prev => [...prev, assistantMessage]);
      setIsLocalLoading(false);
    }, 500);
  };

  // Restore test API handler
  const handleTestAPI = useCallback(() => {
    if (!port) {
      setError(new Error("Connection error: Cannot reach background service."));
      return;
    }
    port.postMessage({ type: 'TEST_API' });
  }, [port]);

  // --- Render Logic ---
  if (showSettings) {
    return <Settings onClose={() => {
      setShowSettings(false);
      chrome.storage.sync.get([
        API_KEY_STORAGE_KEY, 
        OPENAI_API_KEY_STORAGE_KEY,
        ANTHROPIC_API_KEY_STORAGE_KEY,
        API_PROVIDER_STORAGE_KEY
      ], (result) => {
        const provider = result[API_PROVIDER_STORAGE_KEY] || 'openai';
        
        // Determine if an API key is configured for the selected provider
        let hasKey = false;
        let currentKey = '';
        
        if (provider === 'openai') {
          currentKey = result[OPENAI_API_KEY_STORAGE_KEY] || result[API_KEY_STORAGE_KEY] || '';
          hasKey = !!currentKey;
        } else if (provider === 'anthropic') {
          currentKey = result[ANTHROPIC_API_KEY_STORAGE_KEY] || result[API_KEY_STORAGE_KEY] || '';
          hasKey = !!currentKey;
        }
        
        setApiConfigured(hasKey);
        setApiKey(currentKey);
        setApiProvider(provider);
        
        if (hasKey && fallbackMode) {
          handleRetryAPI();
        } else if (!hasKey) {
          setError(new Error("API Key not configured."));
          setFallbackMode(true);
        }
      });
    }} />;
  }

  const displayMessages = messages;
  const currentLoading = isLocalLoading;
  const canRegenerate = messages.some(m => m.role === 'user') && !currentLoading && !fallbackMode && !!port;

  return (
    <Card className="w-full h-full grid grid-rows-[auto,1fr,auto] border-0 rounded-none shadow-none overflow-hidden">
      <div className="flex justify-between items-center p-2 px-3 border-b">
        <div className="flex items-center gap-2">
           <Button variant="outline" size="icon" onClick={handleNewChat} aria-label="New Chat" className="aspect-square bg-gray-200 hover:bg-gray-300 w-10 h-10 p-0 border-0" title="New Chat">
              <Plus className="h-5 w-5 text-gray-600" />
            </Button>
            <h2 className="text-base font-medium truncate" title={activeSessionId || 'Chat'}>
              {activeSessionId ? `Session: ${activeSessionId.substring(0,8)}...` : 'Chat'}
            </h2>
         </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={handleTestAPI} aria-label="Test API" className="aspect-square bg-gray-200 hover:bg-gray-300 w-10 h-10 p-0 border-0" title="Test API Connection">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-gray-600"><circle cx="12" cy="12" r="10"/><path d="m8 12 2 2 6-6"/></svg>
          </Button>
          <Button variant="outline" size="icon" onClick={() => setShowToolsTest(true)} aria-label="Test Tools" className="aspect-square bg-gray-200 hover:bg-gray-300 w-10 h-10 p-0 border-0" disabled={fallbackMode || !port} title="Test Tools">
            <Wrench className="h-5 w-5 text-gray-600" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setShowSettings(true)} aria-label="Settings" className="aspect-square bg-gray-200 hover:bg-gray-300 w-10 h-10 p-0 border-0" title="Settings">
            <SettingsIcon className="h-5 w-5 text-gray-600" />
          </Button>
          {canRegenerate && (
            <Button variant="outline" size="icon" onClick={handleRegenerate} aria-label="Regenerate response" className="aspect-square bg-gray-200 hover:bg-gray-300 w-10 h-10 p-0 border-0" title="Regenerate">
              <RefreshCw className="h-5 w-5 text-gray-600" />
            </Button>
          )}
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <Chat
          messages={displayMessages as any} // Keep cast for now
          input={input}
          handleInputChange={handleInputChange}
          handleSubmit={fallbackMode ? handleLocalSubmit : handleChatSubmit as any}
          isGenerating={currentLoading}
          stop={stop}
          setMessages={setMessages as any}
          append={append as any} // Pass append even if unused by Chat component itself
          className="h-full"
        />
              </div>

      {/* Restore Error and Fallback Displays */}
      {error && (
         <Card className="p-4 m-2 bg-destructive/10 text-destructive border-destructive/50">
           <p className="text-sm font-medium">Error</p>
           <p className="text-sm mt-1">{error.message}</p>
           {!fallbackMode && port === null && connectionAttempts <= MAX_CONNECTION_ATTEMPTS && (
                <Button variant="outline" size="sm" onClick={handleRetryAPI} className="mt-2 rounded-md border-destructive/50 text-destructive hover:bg-destructive/20">
               <RefreshCw size={14} className="mr-2" /> Retry Connection
                </Button>
           )}
            {!fallbackMode && (
                <Button variant="outline" size="sm" onClick={() => { setError(new Error("Switched to Fallback Mode manually.")); setFallbackMode(true); }} className="mt-2 rounded-md border-destructive/50 text-destructive hover:bg-destructive/20">
                 Switch to Fallback Mode
                </Button>
             )}
         </Card>
          )}
      {fallbackMode && (
         <Card className="p-4 m-2 bg-yellow-100 border-yellow-300 text-yellow-800">
           <p className="text-sm font-medium">Fallback Mode</p>
           <p className="text-sm mt-1">Could not connect. Limited local responses.</p>
           {apiConfigured && (
             <Button variant="default" size="sm" onClick={handleRetryAPI} className="mt-2 rounded-md border-yellow-300 text-yellow-800 hover:bg-yellow-200" disabled={currentLoading || (port !== null && connectionAttempts === 0)}>
               <RefreshCw size={14} className="mr-2"/> Reconnect
             </Button>
           )}
           {!apiConfigured && (
              <Button variant="link" size="sm" onClick={() => setShowSettings(true)} className="mt-2 rounded-md border-yellow-300 text-yellow-800 hover:bg-yellow-200">
                Configure API Key
              </Button>
           )}
         </Card>
       )}

      <ToolsTestPanel isOpen={showToolsTest} onClose={() => setShowToolsTest(false)} />
    </Card>
  );
}