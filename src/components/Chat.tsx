import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings as SettingsIcon, RefreshCw, Wrench, Plus } from 'lucide-react';
import type { Message } from 'ai';
import { Settings } from './Settings';
import { ExtensionMessage } from '../types/extension';
import ToolsTestPanel from './ui/ToolsTestPanel';
import { z } from 'zod';
import { Chat } from "@/components/ui/chat";

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
  requestId: z.string().optional(),
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
const CHAT_SESSIONS_KEY = 'earth_engine_chat_sessions';
const ACTIVE_SESSION_ID_KEY = 'earth_engine_active_session_id';
const API_KEY_STORAGE_KEY = 'earth_engine_llm_api_key';
const API_PROVIDER_STORAGE_KEY = 'earth_engine_llm_provider';

// Default welcome message from the assistant
const createWelcomeMessage = (): Message => ({
  id: `welcome-${Date.now()}`,
  role: 'assistant',
  content: 'Hello! I\'m your Earth Engine Assistant. How can I help you with Earth Engine today?'
});

// Type for session data storage
interface ChatSessions {
  [sessionId: string]: Message[];
}

// Rename the exported component to avoid naming conflict
export function ChatUI() {
  const [showSettings, setShowSettings] = useState(false);
  const [showToolsTest, setShowToolsTest] = useState(false);
  const [apiConfigured, setApiConfigured] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiProvider, setApiProvider] = useState<'openai' | 'anthropic'>('openai');
  const [fallbackMode, setFallbackMode] = useState(false);
  const [isLocalLoading, setIsLocalLoading] = useState(false);

  // === Local State Management ===
  const [sessions, setSessions] = useState<ChatSessions>({});
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState<Error | null>(null); // Local error state

  // Local state for fallback mode
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [localInput, setLocalInput] = useState('');

  // Check if API key is configured on component mount
  useEffect(() => {
    chrome.storage.sync.get([API_KEY_STORAGE_KEY, API_PROVIDER_STORAGE_KEY], (result) => {
      const hasApiKey = !!result[API_KEY_STORAGE_KEY];
      setApiConfigured(hasApiKey);
      setApiKey(result[API_KEY_STORAGE_KEY] || '');
      setApiProvider(result[API_PROVIDER_STORAGE_KEY] || 'openai');
      
      if (!hasApiKey) {
        setShowSettings(true); // Show settings if API key is not configured
        // Don't immediately set fallbackMode, let port connection handle it
        // setFallbackMode(true); // Use fallback mode if no API key 
      }
    });
  }, []);

  // Load sessions and active session ID on mount
  useEffect(() => {
    chrome.storage.local.get([CHAT_SESSIONS_KEY, ACTIVE_SESSION_ID_KEY], (result) => {
      const loadedSessions: ChatSessions = result[CHAT_SESSIONS_KEY] || {};
      let currentActiveId: string | null = result[ACTIVE_SESSION_ID_KEY] || null;

      // If no active session ID or no sessions exist, create the first one
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
      // Load messages for the active session
      setMessages(loadedSessions[currentActiveId] || [createWelcomeMessage()]);
      console.log("Loaded sessions, active ID:", currentActiveId);
    });
  }, []); // Load only once on mount

  // Save messages to Chrome storage whenever they change for the ACTIVE session
  useEffect(() => {
    if (activeSessionId && messages.length > 0) {
      // Create a snapshot of sessions to update
      const updatedSessions: ChatSessions = { ...sessions };
      updatedSessions[activeSessionId] = messages;
      
      // Update state and storage
      setSessions(updatedSessions); // Keep local state in sync
      chrome.storage.local.set({ [CHAT_SESSIONS_KEY]: updatedSessions });
    }
    // Depend on messages and activeSessionId
  }, [messages, activeSessionId]); 

  // Set up port connection to background script
  const [port, setPort] = useState<chrome.runtime.Port | null>(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const MAX_CONNECTION_ATTEMPTS = 3;

  // Initialize port connection
  useEffect(() => {
    let currentPort: chrome.runtime.Port | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;
    let isActive = true; // Flag to prevent updates after unmount

    const connectToBackground = () => {
      if (!isActive) return; // Don't connect if component unmounted

      try {
        console.log('Connecting to background script...');
        currentPort = chrome.runtime.connect({ name: 'sidepanel' });
        setPort(currentPort); // Store the port in state
        setConnectionAttempts(0); // Reset attempts on successful connection
        setFallbackMode(false); // Assume connection is good initially
        setError(null); // Clear previous errors

        currentPort.onMessage.addListener(handleResponseWrapper);
        
        currentPort.onDisconnect.addListener(() => {
          console.log('Disconnected from background script, error:', chrome.runtime.lastError?.message);
          
          // Clear the port state only if it's the same port that disconnected
          setPort(prevPort => (prevPort === currentPort ? null : prevPort));

          if (isActive) { // Check if component is still mounted
             // Use chrome.runtime.lastError to check if it was an error or normal disconnect
             if (chrome.runtime.lastError) {
                console.error('Disconnect error:', chrome.runtime.lastError.message);
                setError(new Error(`Connection lost: ${chrome.runtime.lastError.message}. Attempting reconnect...`));
                
                // Try to reconnect if we haven't tried too many times
                setConnectionAttempts(prev => {
                   const nextAttempts = prev + 1;
                   if (nextAttempts <= MAX_CONNECTION_ATTEMPTS) {
                     console.log(`Attempting to reconnect (${nextAttempts}/${MAX_CONNECTION_ATTEMPTS})...`);
                     reconnectTimer = setTimeout(connectToBackground, 1000 * nextAttempts); // Exponential backoff
                     return nextAttempts;
                   } else {
                     setFallbackMode(true);
                     setError(new Error(`Failed to connect after ${MAX_CONNECTION_ATTEMPTS} attempts. Switched to Fallback Mode.`));
                     console.error(`Failed to connect after ${MAX_CONNECTION_ATTEMPTS} attempts. Switching to fallback mode.`);
                     return nextAttempts; // Stop incrementing
                   }
                });
             } else {
               console.log('Port disconnected normally (e.g., background script update).');
               // Optionally try to reconnect immediately or after a short delay
               reconnectTimer = setTimeout(connectToBackground, 500); 
             }
          }
        });
        
        console.log('Connected to background script');
        // Send a ping to verify connection
        currentPort.postMessage({ type: 'PING' });
        
      } catch (error: any) {
        if (isActive) {
           console.error('Failed to connect to background script:', error);
           setError(new Error(`Failed to connect: ${error.message}. Using Fallback Mode.`));
           setFallbackMode(true);
        }
      }
    };
    
    // Wrapper to ensure handleResponse only runs when component is mounted
    const handleResponseWrapper = (response: any) => {
      if (isActive) {
        handleResponse(response);
      }
    };

    connectToBackground(); // Initial connection attempt
    
    // Clean up function
    return () => {
      isActive = false; // Mark component as unmounted
      console.log('ChatUI unmounting, disconnecting port...');
      if (reconnectTimer) clearTimeout(reconnectTimer); // Clear any pending reconnect timers
      if (currentPort) {
        // Remove listeners before disconnecting
        // Note: Removing listeners might be tricky with wrapper functions, ensure correct reference or handle in port logic
        // currentPort.onMessage.removeListener(handleResponseWrapper); // This might not work if the function reference changes
        currentPort.disconnect();
      }
      setPort(null); // Clear port state on unmount
    };
  // Rerun effect if connectionAttempts changes (for retries)
  // Do NOT depend on 'port' or 'handleResponse' to avoid infinite loops
  }, [connectionAttempts]); 

  // Extract response content from validated schema (keep this helper)
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
    setIsLocalLoading(false); // Stop loading indicator when response starts/ends/errors
    setError(null); // Clear error on receiving a valid message
    setFallbackMode(false); // If we get a response, connection is likely working

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
        try {
          // Validate response using Zod schema
          const validationResult = ChatResponseSchema.safeParse(response);
          
          if (validationResult.success) {
            // Extract response content from validated data
            const responseContent = extractResponseContent(validationResult.data);
            
            const assistantMessage: Message = {
              id: response.requestId || (Date.now() + 1).toString(), // Use requestId if available
              role: 'assistant',
              content: responseContent
            };
            
            // Update the placeholder message or add a new one
            setMessages(prev => {
                const placeholderIndex = prev.findIndex(m => m.id.startsWith('assistant-placeholder-'));
                if (placeholderIndex !== -1) {
                    // Replace placeholder
                    const newMessages = [...prev];
                    newMessages[placeholderIndex] = assistantMessage;
                    return newMessages;
                } else {
                    // Append if no placeholder (shouldn't happen with current logic)
                    return [...prev, assistantMessage];
                }
            });
            // Clear input using local handler
            // handleInputChange({ target: { value: '' } } as React.ChangeEvent<HTMLTextAreaElement>);
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
              id: response.requestId || (Date.now() + 1).toString(),
              role: 'assistant',
              content: responseContent
            };
            
            // Update the placeholder message or add a new one
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
            // handleInputChange({ target: { value: '' } } as React.ChangeEvent<HTMLTextAreaElement>);
          }
        } catch (error: any) {
          console.error('Error processing response:', error);
          setError(new Error(`Error processing response: ${error.message}`));
          
          // Add error message
          const errorAssistantMessage: Message = {
            id: response.requestId || (Date.now() + 1).toString(),
            role: 'assistant',
            content: "Sorry, I encountered an error processing the response. Please try again."
          };
          
          // Update placeholder or add error message
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
        // Process streaming chunks
        if (response.chunk) {
          console.log('Received streaming chunk:', response.chunk.substring(0, 20) + '...');
          
          // Update the *last* message in the array (which should be the assistant placeholder)
          setMessages(prevMessages => {
             const lastMessageIndex = prevMessages.length - 1;
             if (lastMessageIndex < 0 || !prevMessages[lastMessageIndex].id.startsWith('assistant-placeholder-')) {
               console.warn('Attempted to stream chunk but no assistant placeholder found at the end');
               // Add a new placeholder if none exists? Or ignore? For now, ignore.
               return prevMessages;
             }
            
            const updatedLastMessage = {
              ...prevMessages[lastMessageIndex],
              content: prevMessages[lastMessageIndex].content + response.chunk
            };
            
            return [
              ...prevMessages.slice(0, lastMessageIndex),
              updatedLastMessage
            ];
          });
        }
        break;
        
      case 'CHAT_STREAM_END':
        console.log('Stream ended, finalizing message');
        setIsLocalLoading(false); // Ensure loading stops at stream end

        // Finalize the last message ID if needed (optional, but good practice)
        setMessages(prevMessages => {
          const lastMessageIndex = prevMessages.length - 1;
          if (lastMessageIndex >= 0 && prevMessages[lastMessageIndex].id.startsWith('assistant-placeholder-')) {
            // Assign a permanent ID using the request ID from the stream end message if available
            const finalId = response.requestId || prevMessages[lastMessageIndex].id.replace('assistant-placeholder-', 'final-');
            const finalizedMessage = {
              ...prevMessages[lastMessageIndex],
              id: finalId
            };
            return [
              ...prevMessages.slice(0, lastMessageIndex),
              finalizedMessage
            ];
          }
          // If the last message is not a placeholder, just return current state
          return prevMessages;
        });
        break;
        
      case 'ERROR':
        console.error('Background script error:', response.error);
        setError(new Error(`API Error: ${response.error || 'Unknown error from background script.'}`));
        setIsLocalLoading(false);

        // Add error message
        const errorAssistantMessage: Message = {
          id: response.requestId || (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Sorry, I encountered an error: ${response.error}. Please try again or check your API configuration.`
        };
        
        // Update placeholder or add error message
        setMessages(prev => {
            const placeholderIndex = prev.findIndex(m => m.id.startsWith('assistant-placeholder-'));
            if (placeholderIndex !== -1) {
                const newMessages = [...prev];
                newMessages[placeholderIndex] = errorAssistantMessage;
                return newMessages;
            } else {
                // Add error message if no placeholder (e.g., error before placeholder added)
                return [...prev, errorAssistantMessage];
            }
        });
        
        // Optionally switch to fallback mode on error
        // setFallbackMode(true); 
        break;
        
      default:
        console.log('Unknown message type:', response.type);
        break;
    }
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  // Custom submit handler - sends message for the *active* session
  const handleChatSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLocalLoading || !port || !activeSessionId) {
       if(!port) {
           console.error("Cannot submit: Port not connected.");
           setError(new Error("Connection error: Cannot reach background service."));
           setFallbackMode(true);
       }
       if(!activeSessionId) console.error("Cannot submit: No active session ID.");
       if(isLocalLoading) console.log("Cannot submit: Already loading");
       if(!input.trim()) console.log("Cannot submit: Input is empty");
       return;
    }
    
    const userMessageContent = input.trim();
    const newUserMessage: Message = { id: 'user-' + Date.now(), role: 'user', content: userMessageContent };
    const assistantPlaceholder: Message = { id: 'assistant-placeholder-' + Date.now(), role: 'assistant', content: '' };
    
    // Add user message & placeholder to current session's messages
    setMessages(prev => [...prev, newUserMessage, assistantPlaceholder]);
    setInput('');
    setIsLocalLoading(true);
    setError(null);

    // Get message history FOR THE CURRENT SESSION to send to background
    const messagesForApi = sessions[activeSessionId]
      ?.filter(m => !m.id.startsWith('welcome') && !m.id.startsWith('assistant-placeholder-')) // Exclude placeholders/welcome
      .concat(newUserMessage) || [newUserMessage]; // Include the new user message

    const messagePayload: ExtensionMessage = {
      type: 'CHAT_MESSAGE',
      message: userMessageContent,
      apiKey,
      provider: apiProvider,
      messages: messagesForApi // Send history of the active session
    };
    console.log('Sending message via port:', messagePayload);
    port.postMessage(messagePayload);
    
  }, [input, isLocalLoading, port, activeSessionId, apiKey, apiProvider, sessions, setMessages, setInput, setIsLocalLoading, setError, setFallbackMode]); // Dependencies

  // Regenerate response for the active session
  const handleRegenerate = useCallback(() => {
    if (isLocalLoading || !port || !activeSessionId) return;

    let lastUserMessage: Message | null = null;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserMessage = messages[i];
        break;
      }
    }

    if (lastUserMessage) {
      console.log("Regenerating response for:", lastUserMessage.content);
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
        apiKey,
        provider: apiProvider,
        messages: messagesForApi
      };
      port.postMessage(messagePayload);
    } else {
      console.log("No user message found to regenerate.");
    }
  }, [messages, isLocalLoading, port, activeSessionId, apiKey, apiProvider, setMessages, setIsLocalLoading, setError]); // Dependencies
  
  // Stop generation
  const stop = useCallback(() => {
      if (!port) return;
      console.log("Attempting to stop generation...");
      port.postMessage({ type: 'CANCEL_STREAM' });
      setIsLocalLoading(false);
      setMessages(prev => prev.filter(m => !m.id.startsWith('assistant-placeholder-')));
  }, [port, setMessages, setIsLocalLoading]); // Dependencies

  // Append message (might need adjustment based on session logic)
  const append = useCallback((message: Message) => {
     console.log("Appending message locally:", message);
     setMessages(prev => [...prev, message]);
  }, [setMessages]); // Dependency

  // Attempt to reconnect or switch out of fallback mode
  const handleRetryAPI = useCallback(() => {
    setError(null);
    setFallbackMode(false);
    if (!port) {
        console.log("Retrying connection...");
        setConnectionAttempts(prev => prev + 1);
    } else {
        console.log("Port exists, attempting ping...");
        port.postMessage({ type: 'PING' });
    }
  }, [port, setFallbackMode, setError, setConnectionAttempts]); // Dependencies
  
  // Function to create a new chat session
  const handleNewChat = useCallback(() => {
    const newSessionId = `session_${Date.now()}`;
    const welcomeMsg = createWelcomeMessage();
    const newSessions = { ...sessions, [newSessionId]: [welcomeMsg] };

    console.log("Creating new chat session:", newSessionId);
    
    setSessions(newSessions); // Update local sessions state
    setActiveSessionId(newSessionId); // Set new session as active
    setMessages([welcomeMsg]); // Set messages for the new session
    setInput(''); // Clear input field
    setError(null); // Clear any errors
    setIsLocalLoading(false); // Reset loading state
    
    // Save updated sessions and active ID to storage
    chrome.storage.local.set({
      [CHAT_SESSIONS_KEY]: newSessions,
      [ACTIVE_SESSION_ID_KEY]: newSessionId
    });
  }, [sessions, setSessions, setActiveSessionId, setMessages, setInput, setError, setIsLocalLoading]); // Dependencies

  // --- Fallback Mode Logic (Simplified for demonstration) --- 
  const handleLocalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLocalLoading) return; 
    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLocalLoading(true);
    setTimeout(() => {
      const response = "Fallback mode currently provides static responses."; // Simple fallback
      const assistantMessage: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: response };
      setMessages(prev => [...prev, assistantMessage]);
      setIsLocalLoading(false);
    }, 500);
  };

  // --- Render Logic --- 
  
  if (showSettings) {
    return <Settings onClose={() => {
      setShowSettings(false);
      chrome.storage.sync.get([API_KEY_STORAGE_KEY, API_PROVIDER_STORAGE_KEY], (result) => {
        const hasApiKey = !!result[API_KEY_STORAGE_KEY];
        setApiConfigured(hasApiKey);
        setApiKey(result[API_KEY_STORAGE_KEY] || '');
        setApiProvider(result[API_PROVIDER_STORAGE_KEY] || 'openai');
        if (hasApiKey && fallbackMode) {
          handleRetryAPI();
        } else if (!hasApiKey) {
          setError(new Error("API Key not configured. Using Fallback Mode."));
          setFallbackMode(true);
        }
      });
    }} />;
  }

  // Use locally managed state for display
  const displayMessages = messages; // Always use the main messages state
  const currentLoading = isLocalLoading; // Use the local loading state

  // Determine if regenerate button should be shown
  const canRegenerate = messages.some(m => m.role === 'user') && !currentLoading && !fallbackMode && !!port;

  return (
    <Card className="w-full h-full grid grid-rows-[auto,1fr,auto] border-0 rounded-none shadow-none overflow-hidden">
      <div className="flex justify-between items-center p-2 px-3 border-b">
        <div className="flex items-center gap-2">
           <Button
              variant="outline"
              size="icon"
              onClick={handleNewChat}
              aria-label="New Chat"
              className="aspect-square bg-gray-200 hover:bg-gray-300 w-10 h-10 p-0 border-0"
              title="New Chat"
            >
              <Plus className="h-5 w-5 text-gray-600" />
            </Button>
            <h2 className="text-base font-medium truncate" title={activeSessionId || 'Chat'}>
              {activeSessionId ? `Session: ${activeSessionId.substring(0,8)}...` : 'Chat'}
            </h2>
         </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            size="icon"
            onClick={() => setShowToolsTest(true)}
            aria-label="Test Tools"
            className="aspect-square bg-gray-200 hover:bg-gray-300 w-10 h-10 p-0 border-0"
            disabled={fallbackMode || !port} 
            title="Test Tools"
          >
            <Wrench className="h-5 w-5 text-gray-600" />
          </Button>
          <Button 
            variant="outline"
            size="icon"
            onClick={() => setShowSettings(true)}
            aria-label="Settings"
            className="aspect-square bg-gray-200 hover:bg-gray-300 w-10 h-10 p-0 border-0"
            title="Settings"
          >
            <SettingsIcon className="h-5 w-5 text-gray-600" />
          </Button>
          {canRegenerate && (
            <Button
              variant="outline"
              size="icon"
              onClick={handleRegenerate}
              aria-label="Regenerate response"
              className="aspect-square bg-gray-200 hover:bg-gray-300 w-10 h-10 p-0 border-0"
              title="Regenerate"
            >
              <RefreshCw className="h-5 w-5 text-gray-600" />
            </Button>
          )}
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <Chat
          messages={displayMessages as any} 
          input={input} 
          handleInputChange={handleInputChange}
          handleSubmit={fallbackMode ? handleLocalSubmit : handleChatSubmit as any}
          isGenerating={currentLoading} 
          stop={stop}
          setMessages={setMessages as any} 
          append={append as any} 
          className="h-full"
        />
      </div>

      {error && (
         <Card className="p-4 m-2 bg-destructive/10 text-destructive border-destructive/50">
           <p className="text-sm font-medium">Error</p>
           <p className="text-sm mt-1">{error.message}</p>
           {!fallbackMode && port === null && connectionAttempts <= MAX_CONNECTION_ATTEMPTS && (
             <Button
               variant="outline"
               size="sm"
               onClick={handleRetryAPI}
               className="mt-2 rounded-md border-destructive/50 text-destructive hover:bg-destructive/20"
             >
               <RefreshCw size={14} className="mr-2" /> Retry Connection
             </Button>
           )}
            {!fallbackMode && (
               <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setError(new Error("Switched to Fallback Mode manually."));
                    setFallbackMode(true);
                  }}
                  className="mt-2 ml-2 rounded-md border-destructive/50 text-destructive hover:bg-destructive/20"
               >
                 Switch to Fallback Mode
               </Button>
             )}
         </Card>
       )}

      {fallbackMode && (
         <Card className="p-4 m-2 bg-yellow-100 border-yellow-300 text-yellow-800">
           <p className="text-sm font-medium">You are in Fallback Mode.</p>
           <p className="text-sm mt-1">Could not connect to the background service or API. Limited local responses may be available.</p>
           {apiConfigured && (
             <Button
               variant="default"
               size="sm"
               onClick={handleRetryAPI}
               className="mt-2 bg-yellow-500 hover:bg-yellow-600 text-white"
               disabled={currentLoading || (port !== null && connectionAttempts === 0)} 
             >
               <RefreshCw size={14} className="mr-2"/> Attempt to Reconnect
             </Button>
           )}
           {!apiConfigured && (
              <Button
                variant="link"
                size="sm"
                onClick={() => setShowSettings(true)}
                className="mt-2 text-yellow-900 px-0"
              >
                Configure API Key in Settings
              </Button>
           )}
         </Card>
       )}

      <ToolsTestPanel isOpen={showToolsTest} onClose={() => setShowToolsTest(false)} />
    </Card>
  );
}