import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings as SettingsIcon, RefreshCw, Wrench, Plus, FlaskConical, Menu, Edit2, X, HelpCircle } from 'lucide-react';
// Project uses custom Message type for Chrome extension communication
// AI SDK types (UIMessage, ModelMessage) are only used in chat-handler.ts
import { Settings } from './Settings';
import { Message, ExtensionMessage, Provider } from '../types/extension';
import { createSessionRecord, getSuggestedSessionTitle, migrateSessions, truncateText, createWelcomeMessage, getLastMessagePreview } from './chat-helpers';
import ToolsTestPanel from './ui/ToolsTestPanel';
import AgentTestPanel from './ui/AgentTestPanel';
import { TabStatusIndicator } from './TabStatusIndicator';
import { z } from 'zod'; // Restore Zod
import { Chat } from "@/components/ui/chat"; // Keep the UI component
import { SessionSidebar, type SidebarSession } from "@/components/ui/session-sidebar";
import { TokenUsageDisplay } from "@/components/ui/TokenUsageDisplay";
import { DEFAULT_MODELS } from '@/constants/models';
import { WelcomeModal, OnboardingTour } from '@/components/Onboarding';
import { useOnboarding } from '@/hooks/useOnboarding';

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

// Session management limits
const MAX_SESSIONS = 50; // Maximum number of chat sessions to keep
const OPENAI_API_KEY_STORAGE_KEY = 'earth_engine_openai_api_key';
const ANTHROPIC_API_KEY_STORAGE_KEY = 'earth_engine_anthropic_api_key';
const GOOGLE_API_KEY_STORAGE_KEY = 'earth_engine_google_api_key';
const QWEN_API_KEY_STORAGE_KEY = 'earth_engine_qwen_api_key';
const OLLAMA_API_KEY_STORAGE_KEY = 'earth_engine_ollama_api_key';
const API_PROVIDER_STORAGE_KEY = 'earth_engine_llm_provider';
const MODEL_STORAGE_KEY = 'earth_engine_llm_model';

// Helper function to handle image files
const processImageFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        const dataUrl = e.target.result.toString();
        console.log(`Processed image: ${file.type}, size: ${file.size}, data URL length: ${dataUrl.length}`);
        // Ensure data URL is properly formatted with correct MIME type
        if (!dataUrl.startsWith('data:')) {
          const formattedUrl = `data:${file.type || 'image/png'};base64,${dataUrl}`;
          resolve(formattedUrl);
        } else {
          resolve(dataUrl);
        }
      } else {
        console.error('Reader result was null when processing image');
        reject(new Error('Failed to read image file'));
      }
    };
    reader.onerror = (error) => {
      console.error('Error reading image file:', error);
      reject(new Error('Error reading file'));
    };
    reader.readAsDataURL(file);
  });
};

interface ChatSessionMeta {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  lastMessagePreview?: string
  pinned?: boolean
}

interface StoredChatSession {
  id: string
  meta: ChatSessionMeta
  messages: Message[]
}

type ChatSessions = Record<string, StoredChatSession>

// Restore original component name and structure
export function ChatUI() {
  const [showSettings, setShowSettings] = useState(false);

  // Onboarding
  const {
    showWelcome,
    showTour,
    currentStep,
    steps,
    startTour,
    nextStep,
    skipTour,
    completeTour,
  } = useOnboarding();

  // Debug onboarding state
  useEffect(() => {
    console.log('🎯 [Chat] Onboarding state:', { showWelcome, showTour, currentStep });
  }, [showWelcome, showTour, currentStep]);
  const [showToolsTest, setShowToolsTest] = useState(false);
  const [showAgentTest, setShowAgentTest] = useState(false);
  const [apiConfigured, setApiConfigured] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiProvider, setApiProvider] = useState<Provider>('openai');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [fallbackMode, setFallbackMode] = useState(false); // Restore fallback state
  const [isLocalLoading, setIsLocalLoading] = useState(false); // Restore loading state

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(false);

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

  // Tool events state for debugging panel
  const [toolEvents, setToolEvents] = useState<Array<{type: string, toolName?: string, args?: any, result?: any, timestamp: number}>>([]);
  const toolEventsRef = useRef<Array<{type: string, toolName?: string, args?: any, result?: any, timestamp: number}>>([]);

  // Title editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitleText, setEditingTitleText] = useState('');

  // Agent mode state (ask = read-only, do = full actions)
  const [agentMode, setAgentMode] = useState<'ask' | 'do'>('ask');

  // Token usage tracking for current session
  const [sessionTokenUsage, setSessionTokenUsage] = useState<{
    totalPromptTokens: number;
    totalCompletionTokens: number;
    totalTokens: number;
  }>({ totalPromptTokens: 0, totalCompletionTokens: 0, totalTokens: 0 });

  // Clean up old sessions if exceeding MAX_SESSIONS limit
  const cleanupOldSessions = useCallback((sessions: ChatSessions): ChatSessions => {
    const sessionArray = Object.values(sessions);

    // If we're under the limit, no cleanup needed
    if (sessionArray.length <= MAX_SESSIONS) {
      return sessions;
    }

    console.log(`Session limit exceeded: ${sessionArray.length}/${MAX_SESSIONS}. Cleaning up old sessions...`);

    // Sort sessions: pinned first, then by updatedAt (newest first)
    const sortedSessions = sessionArray.sort((a, b) => {
      // Pinned sessions always come first
      if (a.meta.pinned && !b.meta.pinned) return -1;
      if (!a.meta.pinned && b.meta.pinned) return 1;
      // Then sort by update time (newest first)
      return b.meta.updatedAt - a.meta.updatedAt;
    });

    // Keep the first MAX_SESSIONS (which includes all pinned + newest unpinned)
    const sessionsToKeep = sortedSessions.slice(0, MAX_SESSIONS);
    const removedCount = sessionArray.length - sessionsToKeep.length;

    console.log(`Removed ${removedCount} old unpinned session(s)`);

    // Convert back to Record format
    const cleanedSessions: ChatSessions = {};
    sessionsToKeep.forEach(session => {
      cleanedSessions[session.id] = session;
    });

    return cleanedSessions;
  }, []);

  const persistSessionsState = useCallback((nextSessions: ChatSessions, nextActiveId?: string | null) => {
    // Clean up old sessions before persisting
    const cleanedSessions = cleanupOldSessions(nextSessions);

    const payload: Record<string, any> = { [CHAT_SESSIONS_KEY]: cleanedSessions };
    if (typeof nextActiveId !== 'undefined') {
      payload[ACTIVE_SESSION_ID_KEY] = nextActiveId;
    }
    chrome.storage.local.set(payload);
  }, [cleanupOldSessions]);

  const sessionList = useMemo<SidebarSession[]>(() => {
    return Object.values(sessions)
      .map((session) => {
        // Extract all messages content for search
        const messagesContent = session.messages
          .filter(m => !m.id.startsWith('welcome')) // Exclude welcome messages
          .map(m => {
            // For messages with parts (like images), only extract text content
            if (m.parts) {
              return m.parts
                .filter(p => p.type === 'text' && p.text)
                .map(p => p.text)
                .join(' ');
            }
            return m.content || '';
          })
          .join(' ');

        return {
          id: session.id,
          title: session.meta.title,
          preview: session.meta.lastMessagePreview || '',
          updatedAt: session.meta.updatedAt,
          pinned: session.meta.pinned,
          messagesContent: messagesContent,
        };
      })
      .sort((a, b) => {
        if ((a.pinned ? 1 : 0) !== (b.pinned ? 1 : 0)) {
          return a.pinned ? -1 : 1;
        }
        return b.updatedAt - a.updatedAt;
      });
  }, [sessions]);

  const activeSession = activeSessionId ? sessions[activeSessionId] : null;
  const activeSessionTitle = activeSession?.meta.title || 'Chat';

  // Restore API config check useEffect
  useEffect(() => {
    chrome.storage.sync.get([
      API_KEY_STORAGE_KEY,
      OPENAI_API_KEY_STORAGE_KEY,
      ANTHROPIC_API_KEY_STORAGE_KEY,
      GOOGLE_API_KEY_STORAGE_KEY,
      QWEN_API_KEY_STORAGE_KEY,
      OLLAMA_API_KEY_STORAGE_KEY,
      API_PROVIDER_STORAGE_KEY,
      MODEL_STORAGE_KEY
    ], (result) => {
      const provider = result[API_PROVIDER_STORAGE_KEY] || 'openai';
      // Use default model for provider if no model is stored
      const model = result[MODEL_STORAGE_KEY] || DEFAULT_MODELS[provider as keyof typeof DEFAULT_MODELS] || DEFAULT_MODELS.openai;

      // Determine if an API key is configured for the selected provider
      let hasKey = false;
      let currentKey = '';

      if (provider === 'openai') {
        currentKey = result[OPENAI_API_KEY_STORAGE_KEY] || result[API_KEY_STORAGE_KEY] || '';
        hasKey = !!currentKey;
      } else if (provider === 'anthropic') {
        currentKey = result[ANTHROPIC_API_KEY_STORAGE_KEY] || result[API_KEY_STORAGE_KEY] || '';
        hasKey = !!currentKey;
      } else if (provider === 'google') {
        currentKey = result[GOOGLE_API_KEY_STORAGE_KEY] || result[API_KEY_STORAGE_KEY] || '';
        hasKey = !!currentKey;
      } else if (provider === 'qwen') {
        currentKey = result[QWEN_API_KEY_STORAGE_KEY] || result[API_KEY_STORAGE_KEY] || '';
        hasKey = !!currentKey;
      } else if (provider === 'ollama') {
        currentKey = result[OLLAMA_API_KEY_STORAGE_KEY] || '';
        hasKey = true; // Ollama doesn't require an API key for local instances
        console.log('🔧 [Chat] Ollama provider selected, skipping API key requirement check');
      }

      const hasApiKey = hasKey;
      setApiConfigured(hasApiKey);
      setApiKey(currentKey);
      setApiProvider(provider as any);
      setSelectedModel(model);

      // Save the default model to storage if none was set
      if (!result[MODEL_STORAGE_KEY]) {
        chrome.storage.sync.set({ [MODEL_STORAGE_KEY]: model });
      }

      if (!hasKey) {
        setShowSettings(true);
      }
    });
  }, []);

  // Restore session loading useEffect
  useEffect(() => {
    chrome.storage.local.get([CHAT_SESSIONS_KEY, ACTIVE_SESSION_ID_KEY], (result) => {
      let loadedSessions = migrateSessions(result[CHAT_SESSIONS_KEY]);
      if (Object.keys(loadedSessions).length === 0) {
        const firstId = `session_${Date.now()}`;
        loadedSessions = {
          [firstId]: createSessionRecord(firstId),
        };
      }

      // Apply session limit cleanup on load
      loadedSessions = cleanupOldSessions(loadedSessions);

      let currentActiveId: string | null = result[ACTIVE_SESSION_ID_KEY] || null;
      if (!currentActiveId || !loadedSessions[currentActiveId]) {
        currentActiveId = Object.keys(loadedSessions)[0] || null;
      }

      setSessions(loadedSessions);
      setActiveSessionId(currentActiveId);
      setMessages(
        (currentActiveId && loadedSessions[currentActiveId]?.messages) || [createWelcomeMessage()]
      );

      chrome.storage.local.set({
        [CHAT_SESSIONS_KEY]: loadedSessions,
        [ACTIVE_SESSION_ID_KEY]: currentActiveId,
      });

      console.log("Loaded sessions (v2), active ID:", currentActiveId, "Total sessions:", Object.keys(loadedSessions).length);
    });
  }, [cleanupOldSessions]);

  // Restore session saving useEffect
  useEffect(() => {
    if (!activeSessionId) return;
    setSessions(prev => {
      const existing = prev[activeSessionId] || createSessionRecord(activeSessionId, messages)
      const updatedMeta: ChatSessionMeta = {
        ...existing.meta,
        updatedAt: Date.now(),
        lastMessagePreview: getLastMessagePreview(messages),
      }
      const updatedSessions: ChatSessions = {
        ...prev,
        [activeSessionId]: { ...existing, meta: updatedMeta, messages },
      }
      persistSessionsState(updatedSessions)
      return updatedSessions
    })
  }, [messages, activeSessionId, persistSessionsState])

  // Restore port connection useEffect
  useEffect(() => {
    let currentPort: chrome.runtime.Port | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;
    let isActive = true;
    let isConnecting = false; // Connection lock to prevent race conditions
    let messageListener: ((response: any) => void) | null = null;
    let disconnectListener: (() => void) | null = null;

    const connectToBackground = () => {
      if (!isActive || isConnecting) {
        console.log('Skipping connection attempt: isActive=%s, isConnecting=%s', isActive, isConnecting);
        return;
      }

      isConnecting = true;

      // Clear any pending reconnection timer
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }

      // Clean up old port if exists
      const oldPort = currentPort;
      if (oldPort) {
        try {
          if (messageListener) {
            oldPort.onMessage.removeListener(messageListener);
          }
          if (disconnectListener) {
            oldPort.onDisconnect.removeListener(disconnectListener);
          }
          oldPort.disconnect();
        } catch (e) {
          console.warn('Error cleaning up old port:', e);
        }
        currentPort = null;
        messageListener = null;
        disconnectListener = null;
      }

      try {
        console.log('Connecting to background script...');
        currentPort = chrome.runtime.connect({ name: 'sidepanel' });
        setPort(currentPort);
        setConnectionAttempts(0);
        setFallbackMode(false);
        setError(null);

        // Create new message listener for this connection
        messageListener = (response: any) => {
          if (isActive) {
            handleResponse(response);
          }
        };

        currentPort.onMessage.addListener(messageListener);

        // Create and store disconnect listener reference
        disconnectListener = () => {
          console.log('Disconnected from background script, error:', chrome.runtime.lastError?.message);

          // Clean up this connection's listener
          if (currentPort && messageListener) {
            try {
              currentPort.onMessage.removeListener(messageListener);
            } catch (e) {
              console.warn('Error removing message listener:', e);
  }
}

          setPort(prevPort => (prevPort === currentPort ? null : prevPort));
          isConnecting = false; // Release lock on disconnect

          if (isActive && !isConnecting) {
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
               console.log('Port disconnected normally, will reconnect...');
               reconnectTimer = setTimeout(connectToBackground, 500);
            }
          }
        };

        currentPort.onDisconnect.addListener(disconnectListener);

        console.log('Connected to background script');
        currentPort.postMessage({ type: 'PING' });
        isConnecting = false; // Release lock after successful connection
      } catch (error: any) {
        isConnecting = false; // Release lock on error
        if (isActive) {
        console.error('Failed to connect to background script:', error);
           setError(new Error(`Failed to connect: ${error.message}. Using Fallback Mode.`));
        setFallbackMode(true);
        }
      }
    };

    connectToBackground();
    return () => {
      isActive = false;
      isConnecting = false;
      console.log('ChatUI unmounting, disconnecting port...');

      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }

      if (currentPort) {
        try {
          if (messageListener) {
            currentPort.onMessage.removeListener(messageListener);
          }
          if (disconnectListener) {
            currentPort.onDisconnect.removeListener(disconnectListener);
          }
          currentPort.disconnect();
        } catch (e) {
          console.warn('Error during cleanup:', e);
        }
        currentPort = null;
        messageListener = null;
        disconnectListener = null;
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
    // Don't set isLocalLoading to false here - it should only be set to false
    // when streaming actually ends (CHAT_STREAM_END) or there's an error
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
          setMessages(prevMessages => {
             const lastMessageIndex = prevMessages.length - 1;
             if (lastMessageIndex < 0 || !prevMessages[lastMessageIndex].id.startsWith('assistant-placeholder-')) {
              return prevMessages;
            }

            // Extract tool calls section and text content separately
            const currentContent = prevMessages[lastMessageIndex].content || '';
            const startMarker = '<!-- TOOL_CALLS -->\n';
            const endMarker = '\n<!-- END_TOOL_CALLS -->\n\n';

            let toolCallsSection = '';
            let textContent = currentContent;

            const startIndex = currentContent.indexOf(startMarker);
            if (startIndex >= 0) {
              const endIndex = currentContent.indexOf(endMarker, startIndex);
              if (endIndex >= 0) {
                toolCallsSection = currentContent.substring(startIndex, endIndex + endMarker.length);
                textContent = currentContent.substring(endIndex + endMarker.length);
              }
            }

            // Performance optimization: Create new array only with modified last message
            // This avoids unnecessary re-creation of the entire array on every chunk
            const newMessages = prevMessages.slice(); // Shallow copy
            newMessages[lastMessageIndex] = {
              ...prevMessages[lastMessageIndex],
              content: toolCallsSection + textContent + response.chunk
            };
            return newMessages;
          });
        }
        break;
      case 'CHAT_STREAM_END':
        setIsLocalLoading(false);
        setMessages(prevMessages => {
            const lastMessageIndex = prevMessages.length - 1;
          if (lastMessageIndex >= 0 && prevMessages[lastMessageIndex].id.startsWith('assistant-placeholder-')) {
            const finalId = response.requestId || prevMessages[lastMessageIndex].id.replace('assistant-placeholder-', 'final-');
            // Keep the tool call information in final message
            const content = prevMessages[lastMessageIndex].content || '';
            // Performance optimization: Use slice() + direct assignment instead of spread operator
            const newMessages = prevMessages.slice();
            newMessages[lastMessageIndex] = { ...prevMessages[lastMessageIndex], id: finalId, content };
            return newMessages;
          }
          return prevMessages;
        });
        // Clear tool events state (but keep them in the message)
        toolEventsRef.current = [];
        setToolEvents([]);
        break;
      case 'TOKEN_ESTIMATE':
        // Handle token estimate before API call
        console.log('📊 [Chat] Received token estimate:', response.estimate);
        if (response.estimate) {
          setSessionTokenUsage(prev => {
            const updated = {
              totalPromptTokens: prev.totalPromptTokens + (response.estimate.promptTokens || 0),
              totalCompletionTokens: prev.totalCompletionTokens, // Don't add completion tokens yet
              totalTokens: prev.totalTokens + (response.estimate.promptTokens || 0)
            };
            console.log('📊 [Chat] Token estimate added:', {
              previous: prev,
              estimate: response.estimate,
              updated: updated
            });
            return updated;
          });
        }
        break;
      case 'TOKEN_USAGE':
        // Handle actual token usage from API response
        // Note: This includes both prompt and completion tokens, so we need to adjust
        console.log('📊 [Chat] Received actual token usage:', response.usage);
        if (response.usage) {
          setSessionTokenUsage(prev => {
            // The actual usage includes prompt tokens which we already added via estimate
            // So we only add the completion tokens here
            const updated = {
              totalPromptTokens: prev.totalPromptTokens, // Already counted in estimate
              totalCompletionTokens: prev.totalCompletionTokens + (response.usage.completionTokens || 0),
              totalTokens: prev.totalTokens + (response.usage.completionTokens || 0)
            };
            console.log('📊 [Chat] Actual token usage added:', {
              previous: prev,
              incoming: response.usage,
              updated: updated
            });
            return updated;
          });

          // Also attach token usage to the last assistant message
          setMessages(prevMessages => {
            const lastMessageIndex = prevMessages.length - 1;
            if (lastMessageIndex >= 0 && prevMessages[lastMessageIndex].role === 'assistant') {
              const newMessages = prevMessages.slice();
              newMessages[lastMessageIndex] = {
                ...prevMessages[lastMessageIndex],
                tokenUsage: {
                  promptTokens: response.usage.promptTokens,
                  completionTokens: response.usage.completionTokens,
                  totalTokens: response.usage.totalTokens
                }
              };
              return newMessages;
            }
            return prevMessages;
          });
        }
        break;
      case 'TOOL_EVENT':
        // Handle tool execution events - add to message content
        console.log('🔧 [Chat] TOOL_EVENT received:', response.event);
        if (response.event) {
          // Update tool events ref and state
          toolEventsRef.current = [...toolEventsRef.current, response.event];
          setToolEvents(toolEventsRef.current);

          console.log('🔧 [Chat] Current tool events:', toolEventsRef.current);

          // Then update message
          setMessages(prevMessages => {
            const lastMessageIndex = prevMessages.length - 1;
            if (lastMessageIndex >= 0 && prevMessages[lastMessageIndex].id.startsWith('assistant-placeholder-')) {
              const currentMessage = prevMessages[lastMessageIndex];
              const content = currentMessage.content || '';

              // Extract existing tool calls section and text content
              const startMarker = '<!-- TOOL_CALLS -->\n';
              const endMarker = '\n<!-- END_TOOL_CALLS -->\n\n';

              let textContent = content;
              const startIndex = content.indexOf(startMarker);
              if (startIndex >= 0) {
                const endIndex = content.indexOf(endMarker, startIndex);
                if (endIndex >= 0) {
                  textContent = content.substring(endIndex + endMarker.length);
                }
              }

              // Build tool status section from all events in ref
              const toolStatusLines: string[] = [];
              toolEventsRef.current.forEach(event => {
                if (event.type === 'tool_start') {
                  toolStatusLines.push(`⚙️ Tool executing: ${event.toolName}`);
                } else if (event.type === 'tool_finish') {
                  toolStatusLines.push(`✅ Tool completed: ${event.toolName}`);
                }
              });

              const toolStatus = toolStatusLines.length > 0
                ? startMarker + toolStatusLines.join('  \n') + endMarker
                : '';

              console.log('🔧 [Chat] Tool status to add:', toolStatus);
              console.log('🔧 [Chat] Text content:', textContent.substring(0, 100));

              // Performance optimization: Use slice() + direct assignment
              const newMessages = prevMessages.slice();
              newMessages[lastMessageIndex] = {
                ...currentMessage,
                content: toolStatus + textContent
              };
              return newMessages;
            }
            return prevMessages;
          });
        }
        break;
      case 'ERROR':
        console.error('Background script error:', response.error);

        // Ignore "Unknown message type" errors - these are likely from CANCEL_STREAM race conditions
        if (response.error && typeof response.error === 'string' && response.error.includes('Unknown message type')) {
          console.log('Ignoring "Unknown message type" error (likely from cancelled stream)');
          break;
        }

        // Parse and format error message for better user experience
        let errorMessage = response.error || 'Unknown error';
        let userFriendlyMessage = '';

        try {
          // Check for specific error types and provide helpful guidance
          if (typeof errorMessage === 'string') {
            // Ollama CORS error
            if (errorMessage.includes('Ollama CORS Configuration Required')) {
              const errorData = JSON.parse(errorMessage);
              userFriendlyMessage = `🚨 **Ollama CORS Issue**\n\n${errorData.message}\n\n**💡 Solution:**\n${errorData.solution}\n\n**🔧 Alternative:**\n${errorData.alternativeSolution}`;
            }
            // Model not found errors
            else if (errorMessage.toLowerCase().includes('model') && (errorMessage.toLowerCase().includes('not found') || errorMessage.toLowerCase().includes('does not exist') || errorMessage.toLowerCase().includes('invalid model'))) {
              userFriendlyMessage = `❌ **Model Error**\n\nThe selected model is not available or doesn't exist.\n\n**Possible causes:**\n• Model name is incorrect\n• Your API key doesn't have access to this model\n• Model has been deprecated or renamed\n\n**What to do:**\n1. Check the model name in the dropdown menu\n2. Verify your API key has access to this model\n3. Try selecting a different model\n\n**Error details:** ${errorMessage}`;
            }
            // Context/Token limit errors (must check before rate limit)
            else if (errorMessage.toLowerCase().includes('context length') ||
                     errorMessage.toLowerCase().includes('maximum context') ||
                     errorMessage.toLowerCase().includes('context_length_exceeded') ||
                     errorMessage.toLowerCase().includes('token limit') ||
                     errorMessage.toLowerCase().includes('too many tokens') ||
                     errorMessage.toLowerCase().includes('exceeds') && errorMessage.toLowerCase().includes('token')) {
              userFriendlyMessage = `📏 **Context Length Exceeded**\n\nYour conversation has exceeded the model's maximum context window.\n\n**What happened:**\nThe total tokens (messages + system prompt + tools) exceeded the model's limit.\n\n**What to do:**\n1. Start a new chat session (New Chat button)\n2. Delete some earlier messages to reduce context\n3. Switch to a model with larger context window:\n   • Gemini 2.5 Pro: 2M tokens\n   • Claude Sonnet 4.5: 200k tokens\n   • GPT-4o: 128k tokens\n\n**Error details:** ${errorMessage}`;
            }
            // Rate limit errors
            else if (errorMessage.toLowerCase().includes('rate limit') || errorMessage.toLowerCase().includes('quota') || errorMessage.toLowerCase().includes('429')) {
              userFriendlyMessage = `⏱️ **Rate Limit Exceeded**\n\nYou've exceeded the API rate limit or quota.\n\n**What to do:**\n• Wait a few minutes and try again\n• Check your API usage dashboard\n• Consider upgrading your API plan\n\n**Error details:** ${errorMessage}`;
            }
            // Authentication errors
            else if (errorMessage.toLowerCase().includes('unauthorized') || errorMessage.toLowerCase().includes('invalid api key') || errorMessage.toLowerCase().includes('authentication') || errorMessage.toLowerCase().includes('401')) {
              userFriendlyMessage = `🔑 **Authentication Error**\n\nYour API key is invalid or has expired.\n\n**What to do:**\n1. Go to Settings (⚙️ icon)\n2. Check your API key is correct\n3. Generate a new API key if needed\n\n**Error details:** ${errorMessage}`;
            }
            // Permission errors
            else if (errorMessage.toLowerCase().includes('permission') || errorMessage.toLowerCase().includes('access denied') || errorMessage.toLowerCase().includes('forbidden') || errorMessage.toLowerCase().includes('403')) {
              userFriendlyMessage = `🚫 **Permission Error**\n\nYour API key doesn't have permission for this operation.\n\n**What to do:**\n• Verify your API key has the required permissions\n• Check if your account has access to this feature/model\n• Contact your API provider if issues persist\n\n**Error details:** ${errorMessage}`;
            }
            // Generic API errors
            else {
              userFriendlyMessage = `❌ **API Error**\n\n${errorMessage}\n\n**What to do:**\n• Check your internet connection\n• Verify your API settings\n• Try again in a moment`;
            }
          }
        } catch (parseError) {
          // If parsing fails, use the original error message
          userFriendlyMessage = `❌ **Error**\n\n${errorMessage}`;
        }

        setError(new Error(userFriendlyMessage));
        setIsLocalLoading(false);
        const errorAssistantMessage: Message = {
          id: response.requestId || (Date.now() + 1).toString(),
          role: 'assistant',
          content: userFriendlyMessage
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
  const handleChatSubmit = useCallback(async (e?: React.FormEvent, options?: { experimental_attachments?: FileList }) => {
    e?.preventDefault();
    if ((!input.trim() && !options?.experimental_attachments?.length) || isLocalLoading || !port || !activeSessionId) {
       if(!port) setError(new Error("Connection connection error: Cannot reach background service."));
       return;
    }
    
    if (options?.experimental_attachments?.length) {
      console.log(`Received ${options.experimental_attachments.length} attachments in handleChatSubmit`);
      Array.from(options.experimental_attachments).forEach((file, i) => {
        console.log(`Attachment ${i+1}: ${file.name}, ${file.type}, ${file.size} bytes`);
      });
    }

    // Process any attached files
    let messageParts = [];
    let imageAttachments = [];
    
    // Handle file attachments if present
    if (options?.experimental_attachments && options.experimental_attachments.length > 0) {
      try {
        const files = Array.from(options.experimental_attachments);
        
        // Process each file
        for (const file of files) {
          // Check if it's an image
          if (file.type.startsWith('image/')) {
            try {
              const dataUrl = await processImageFile(file);
              const mimeType = file.type || 'image/png';
              console.log(`Adding image attachment: ${mimeType}, data URL prefix: ${dataUrl.substring(0, 30)}...`);
              
              // Add to both structures for compatibility
              messageParts.push({
                type: 'file' as const,
                mimeType: mimeType,
                name: file.name || 'image.png',
                data: dataUrl,
                size: file.size
              });
              
              imageAttachments.push({
                type: 'image',
                mimeType: mimeType,
                data: dataUrl
              });
              console.log(`Successfully added image attachment (${dataUrl.length} bytes)`);
            } catch (error) {
              console.error('Failed to process image file:', error);
              setError(new Error(`Failed to process image: ${error instanceof Error ? error.message : String(error)}`));
            }
          } else {
            console.log(`Unsupported file type: ${file.type}`);
          }
        }
      } catch (e) {
        console.error("Error processing file attachments:", e);
      }
    }

    // Create appropriate message structures
    const userMessageId = 'user-' + Date.now();
    
    let newUserMessage: Message;
    if (imageAttachments.length > 0) {
      // If there are image attachments, create a message with parts
      newUserMessage = {
        id: userMessageId,
        role: 'user',
        content: input.trim() || "Here's an image:",
        parts: [
          { type: 'text', text: input.trim() || "Here's an image:" },
          ...imageAttachments.map(img => ({
            type: 'file' as const,
            mimeType: 'image/png',
            name: 'image.png',
            data: img.data,
            size: img.data.length
          }))
        ]
      };
    } else {
      // Text-only message
      newUserMessage = { 
        id: userMessageId, 
        role: 'user', 
        content: input.trim() 
      };
    }
    
    const assistantPlaceholder: Message = { id: 'assistant-placeholder-' + Date.now(), role: 'assistant', content: '' };
    setMessages(prev => [...prev, newUserMessage, assistantPlaceholder]);
    setInput('');
    setIsLocalLoading(true);
    setError(null);
    toolEventsRef.current = []; // Clear previous tool events
    setToolEvents([]);
    
    const messagesForApi = sessions[activeSessionId]?.messages
      ?.filter(m => !m.id.startsWith('welcome') && !m.id.startsWith('assistant-placeholder-'))
      .concat(newUserMessage) || [newUserMessage];
    
    // Get provider and model from storage before sending the message
    chrome.storage.sync.get([API_PROVIDER_STORAGE_KEY, MODEL_STORAGE_KEY], (result) => {
      const provider = result[API_PROVIDER_STORAGE_KEY] || 'openai';
      const model = result[MODEL_STORAGE_KEY] || '';
      
      console.log(`🐛 [Debug] Chat sending message with provider: ${provider}, model: ${model}`);
      
      const messagePayload: ExtensionMessage = {
        type: 'CHAT_MESSAGE',
        message: input.trim(),
        messages: messagesForApi,
        attachments: imageAttachments.length > 0 ? imageAttachments : undefined,
        provider: provider,
        model: model,
        mode: agentMode
      };

      console.log(`🔧 [Chat] Full message payload being sent:`, {
        type: messagePayload.type,
        provider: messagePayload.provider,
        model: messagePayload.model,
        mode: messagePayload.mode,
        messageLength: messagePayload.message?.length || 0,
        messagesCount: messagePayload.messages?.length || 0,
        hasAttachments: !!messagePayload.attachments
      });
      
      if (imageAttachments.length > 0) {
        console.log(`Sending message with ${imageAttachments.length} image attachments`);
        console.log(`Image attachments: ${imageAttachments.map(img => 
          `${img.mimeType} (${img.data.length} bytes, starts with ${img.data.substring(0, 30)}...)`).join(', ')}`);
      }
      
      port.postMessage(messagePayload);
    });
  }, [input, isLocalLoading, port, activeSessionId, sessions, agentMode]);

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
      
      // Get provider and model from storage before sending the regenerate message
      chrome.storage.sync.get([API_PROVIDER_STORAGE_KEY, MODEL_STORAGE_KEY], (result) => {
        const provider = result[API_PROVIDER_STORAGE_KEY] || 'openai';
        const model = result[MODEL_STORAGE_KEY] || '';
        
        console.log(`🐛 [Debug] Chat regenerating with provider: ${provider}, model: ${model}, mode: ${agentMode}`);

        const messagePayload: ExtensionMessage = {
          type: 'CHAT_MESSAGE',
          message: lastUserMessage.content,
          messages: messagesForApi,
          provider: provider,
          model: model,
          mode: agentMode
        };
        port.postMessage(messagePayload);
      });
    }
  }, [messages, isLocalLoading, port, activeSessionId, agentMode]);

  // Restore stop handler
  const stop = useCallback(() => {
      if (!port) return;
      port.postMessage({ type: 'CANCEL_STREAM' });
      setIsLocalLoading(false);

      // Keep the partial message that was generated, but finalize it
      setMessages(prev => {
        const placeholderIndex = prev.findIndex(m => m.id.startsWith('assistant-placeholder-'));
        if (placeholderIndex !== -1) {
          const placeholder = prev[placeholderIndex];
          // Only keep the message if it has content
          if (placeholder.content && placeholder.content.trim()) {
            // Convert placeholder to final message (keep the content as-is)
            const finalMessage = {
              ...placeholder,
              id: `cancelled-${Date.now()}`
            };
            return [...prev.slice(0, placeholderIndex), finalMessage, ...prev.slice(placeholderIndex + 1)];
          } else {
            // If no content was generated, remove the placeholder
            return prev.filter((m) => !m.id.startsWith('assistant-placeholder-'));
          }
        }
        return prev;
      });
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

  const handleSelectSession = useCallback((sessionId: string) => {
    if (sessionId === activeSessionId) {
      setIsMobileSidebarOpen(false);
      return;
    }
    const session = sessions[sessionId];
    if (!session) return;
    setActiveSessionId(sessionId);
    setMessages(session.messages);
    setInput('');
    setError(null);
    setIsLocalLoading(false);
    // Reset token usage when switching sessions
    setSessionTokenUsage({ totalPromptTokens: 0, totalCompletionTokens: 0, totalTokens: 0 });
    chrome.storage.local.set({ [ACTIVE_SESSION_ID_KEY]: sessionId });
    setIsMobileSidebarOpen(false);
  }, [sessions, activeSessionId]);

  const handleRenameSession = useCallback((sessionId: string, newTitle: string) => {
    const session = sessions[sessionId];
    if (!session) return;
    const normalized = newTitle.trim();
    if (!normalized || normalized === session.meta.title) return;
    setSessions(prev => {
      const current = prev[sessionId];
      if (!current) return prev;
      const updatedSessions: ChatSessions = {
        ...prev,
        [sessionId]: {
          ...current,
          meta: { ...current.meta, title: normalized, updatedAt: Date.now() },
        },
      };
      persistSessionsState(updatedSessions);
      return updatedSessions;
    });
  }, [sessions, persistSessionsState]);

  const startEditingTitle = useCallback(() => {
    if (!activeSessionId) return;
    const session = sessions[activeSessionId];
    if (!session) return;
    setEditingTitleText(session.meta.title);
    setIsEditingTitle(true);
  }, [activeSessionId, sessions]);

  const saveEditingTitle = useCallback(() => {
    if (!activeSessionId || !editingTitleText.trim()) {
      setIsEditingTitle(false);
      return;
    }
    handleRenameSession(activeSessionId, editingTitleText);
    setIsEditingTitle(false);
  }, [activeSessionId, editingTitleText, handleRenameSession]);

  const cancelEditingTitle = useCallback(() => {
    setIsEditingTitle(false);
    setEditingTitleText('');
  }, []);

  const handleDeleteSession = useCallback((sessionId: string) => {
    const session = sessions[sessionId];
    if (!session) return;
    if (!window.confirm(`Delete "${session.meta.title}"? This cannot be undone.`)) return;
    setSessions(prev => {
      if (!prev[sessionId]) return prev;
      const nextSessions: ChatSessions = { ...prev };
      delete nextSessions[sessionId];
      let nextActiveId = activeSessionId;
      if (!nextActiveId || nextActiveId === sessionId) {
        const remainingIds = Object.keys(nextSessions);
        if (remainingIds.length === 0) {
          const fallbackId = `session_${Date.now()}`;
          nextSessions[fallbackId] = createSessionRecord(fallbackId);
          nextActiveId = fallbackId;
        } else {
          nextActiveId = remainingIds[0];
        }
        if (nextActiveId && nextSessions[nextActiveId]) {
          setActiveSessionId(nextActiveId);
          setMessages(nextSessions[nextActiveId].messages);
        }
      }
      persistSessionsState(nextSessions, nextActiveId || null);
      return nextSessions;
    });
    setIsMobileSidebarOpen(false);
  }, [sessions, activeSessionId, persistSessionsState]);

  const handleDuplicateSession = useCallback((sessionId: string) => {
    const session = sessions[sessionId];
    if (!session) return;
    const newSessionId = `session_${Date.now()}`;
    const clonedMessages = session.messages.map((message, index) => ({
      ...message,
      id: `${message.id}-${Date.now()}-${index}`,
    }));
    const record = createSessionRecord(newSessionId, clonedMessages, {
      title: `${session.meta.title} (Copy)`,
    });
    setSessions(prev => {
      const nextSessions: ChatSessions = { ...prev, [newSessionId]: record };
      persistSessionsState(nextSessions, newSessionId);
      return nextSessions;
    });
    setActiveSessionId(newSessionId);
    setMessages(record.messages);
    setInput('');
    setError(null);
    setIsLocalLoading(false);
    // Reset token usage for new session
    setSessionTokenUsage({ totalPromptTokens: 0, totalCompletionTokens: 0, totalTokens: 0 });
    setIsMobileSidebarOpen(false);
  }, [sessions, persistSessionsState]);

  const handleTogglePin = useCallback((sessionId: string) => {
    setSessions(prev => {
      const current = prev[sessionId];
      if (!current) return prev;
      const updatedSessions: ChatSessions = {
        ...prev,
        [sessionId]: {
          ...current,
          meta: { ...current.meta, pinned: !current.meta.pinned, updatedAt: Date.now() },
        },
      };
      persistSessionsState(updatedSessions);
      return updatedSessions;
    });
  }, [persistSessionsState]);

  const handleClearActiveSession = useCallback(() => {
    if (!activeSessionId) return;
    if (!window.confirm('Clear this conversation?')) return;
    const welcomeMsg = createWelcomeMessage();
    setMessages([welcomeMsg]);
    setInput('');
  }, [activeSessionId]);

  // Restore new chat handler
  const handleNewChat = useCallback(() => {
    const newSessionId = `session_${Date.now()}`;
    const welcomeMsg = createWelcomeMessage();
    const record = createSessionRecord(newSessionId, [welcomeMsg]);
    setSessions(prev => {
      const nextSessions: ChatSessions = { ...prev, [newSessionId]: record };
      persistSessionsState(nextSessions, newSessionId);
      return nextSessions;
    });
    setActiveSessionId(newSessionId);
    setMessages(record.messages);
    setInput('');
    setError(null);
    setIsLocalLoading(false);
    // Reset token usage for new session
    setSessionTokenUsage({ totalPromptTokens: 0, totalCompletionTokens: 0, totalTokens: 0 });
    setIsMobileSidebarOpen(false);
  }, [persistSessionsState]);

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

  // --- Render Logic ---
  if (showSettings) {
    return <Settings onClose={() => {
      setShowSettings(false);
      chrome.storage.sync.get([
        API_KEY_STORAGE_KEY,
        OPENAI_API_KEY_STORAGE_KEY,
        ANTHROPIC_API_KEY_STORAGE_KEY,
        GOOGLE_API_KEY_STORAGE_KEY,
        QWEN_API_KEY_STORAGE_KEY,
        OLLAMA_API_KEY_STORAGE_KEY,
        API_PROVIDER_STORAGE_KEY,
        MODEL_STORAGE_KEY
      ], (result) => {
        const provider = result[API_PROVIDER_STORAGE_KEY] || 'openai';
        // Use default model for provider if no model is stored
        const model = result[MODEL_STORAGE_KEY] || DEFAULT_MODELS[provider as keyof typeof DEFAULT_MODELS] || DEFAULT_MODELS.openai;

        // Determine if an API key is configured for the selected provider
        let hasKey = false;
        let currentKey = '';

        if (provider === 'openai') {
          currentKey = result[OPENAI_API_KEY_STORAGE_KEY] || result[API_KEY_STORAGE_KEY] || '';
          hasKey = !!currentKey;
        } else if (provider === 'anthropic') {
          currentKey = result[ANTHROPIC_API_KEY_STORAGE_KEY] || result[API_KEY_STORAGE_KEY] || '';
          hasKey = !!currentKey;
        } else if (provider === 'google') {
          currentKey = result[GOOGLE_API_KEY_STORAGE_KEY] || result[API_KEY_STORAGE_KEY] || '';
          hasKey = !!currentKey;
        } else if (provider === 'qwen') {
          currentKey = result[QWEN_API_KEY_STORAGE_KEY] || result[API_KEY_STORAGE_KEY] || '';
          hasKey = !!currentKey;
        } else if (provider === 'ollama') {
          currentKey = result[OLLAMA_API_KEY_STORAGE_KEY] || '';
          hasKey = true; // Ollama doesn't require an API key for local instances
        }

        setApiConfigured(hasKey);
        setApiKey(currentKey);
        setApiProvider(provider as any);
        setSelectedModel(model);

        // Save the default model to storage if none was set
        if (!result[MODEL_STORAGE_KEY]) {
          chrome.storage.sync.set({ [MODEL_STORAGE_KEY]: model });
        }
        
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
    <>
      <Card className="w-full h-full flex flex-col border-0 rounded-none shadow-none overflow-hidden">
        {/* Fixed Header - Top Toolbar */}
        <div className="flex-none flex justify-between items-center p-2 px-3 border-b min-w-0">
          <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                // Check if we're on desktop (md breakpoint is 768px)
                const isDesktop = window.innerWidth >= 768;
                if (isDesktop) {
                  setIsDesktopSidebarOpen(!isDesktopSidebarOpen);
                } else {
                  setIsMobileSidebarOpen(true);
                }
              }}
              aria-label="Toggle chat list"
              className="shrink-0 aspect-square bg-gray-200 hover:bg-gray-300 w-8 h-8 p-0 border-0"
              title="Toggle chat list"
            >
              <Menu className="h-4 w-4 text-gray-600" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleNewChat}
              aria-label="New Chat"
              className="shrink-0 aspect-square bg-gray-200 hover:bg-gray-300 w-8 h-8 p-0 border-0"
              title="New Chat"
            >
              <Plus className="h-4 w-4 text-gray-600" />
            </Button>
            {isEditingTitle ? (
              <input
                type="text"
                value={editingTitleText}
                onChange={(e) => setEditingTitleText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    saveEditingTitle();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    cancelEditingTitle();
                  }
                }}
                onBlur={saveEditingTitle}
                autoFocus
                className="flex-1 text-sm font-medium bg-transparent border-b border-primary px-1 focus:outline-none min-w-0"
              />
            ) : (
              <h2 className="text-sm font-medium truncate" title={activeSessionTitle}>
                {activeSessionTitle}
              </h2>
            )}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Rename chat"
              className="h-8 w-8 shrink-0"
              title="Rename chat"
              onClick={startEditingTitle}
              disabled={!activeSessionId}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-1 items-center shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
              onClick={handleClearActiveSession}
              disabled={!activeSessionId}
            >
              Clear
            </Button>
          <TabStatusIndicator />
          <Button variant="outline" size="icon" onClick={() => setShowToolsTest(true)} aria-label="Test Tools" className="hidden sm:flex aspect-square bg-gray-200 hover:bg-gray-300 w-8 h-8 p-0 border-0" disabled={fallbackMode || !port} title="Test Tools">
            <Wrench className="h-4 w-4 text-gray-600" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setShowAgentTest(true)} aria-label="Agent Testing" className="hidden sm:flex aspect-square bg-gray-200 hover:bg-gray-300 w-8 h-8 p-0 border-0" disabled={!apiConfigured} title="Agent Testing">
            <FlaskConical className="h-4 w-4 text-gray-600" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => window.open('https://github.com/wybert/earth-agent-chrome-ext', '_blank')}
            aria-label="Help"
            className="aspect-square bg-gray-200 hover:bg-gray-300 w-8 h-8 p-0 border-0"
            title="Help"
            data-onboarding="help-button"
          >
            <HelpCircle className="h-4 w-4 text-gray-600" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowSettings(true)}
            aria-label="Settings"
            className="aspect-square bg-gray-200 hover:bg-gray-300 w-8 h-8 p-0 border-0"
            title="Settings"
            data-onboarding="settings-button"
          >
            <SettingsIcon className="h-4 w-4 text-gray-600" />
          </Button>
        </div>
      </div>

        {/* Token Usage Display - Right below header */}
        <TokenUsageDisplay
          promptTokens={sessionTokenUsage.totalPromptTokens}
          completionTokens={sessionTokenUsage.totalCompletionTokens}
          totalTokens={sessionTokenUsage.totalTokens}
          model={selectedModel}
        />

        {/* Main Content Area with Sidebar */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {isDesktopSidebarOpen && (
            <div className="hidden h-full flex-none md:flex md:w-72">
              <SessionSidebar
                sessions={sessionList}
                activeSessionId={activeSessionId}
                onSelect={handleSelectSession}
                onCreate={handleNewChat}
                onRename={handleRenameSession}
                onDelete={handleDeleteSession}
                onDuplicate={handleDuplicateSession}
                onTogglePin={handleTogglePin}
                className="w-full"
              />
            </div>
          )}
          <div className="flex-1 relative flex flex-col min-h-0 overflow-hidden">
            <Chat
              messages={displayMessages as any}
              input={input}
              handleInputChange={handleInputChange}
              handleSubmit={fallbackMode ? handleLocalSubmit : handleChatSubmit as any}
              isGenerating={currentLoading}
              stop={stop}
              setMessages={setMessages as any}
              append={append as any}
              onRegenerate={handleRegenerate}
              showRegenerate={canRegenerate}
              mode={agentMode}
              onModeChange={setAgentMode}
              provider={apiProvider}
              model={selectedModel}
              onProviderChange={setApiProvider}
              onModelChange={setSelectedModel}
              className="flex-1 min-h-0"
            />

            {/* Error and Fallback Displays - Positioned at bottom above input */}
            {/* Removed duplicate error display - errors are now shown as assistant messages in the chat */}
            {fallbackMode && (
              <Card className="absolute bottom-20 left-2 right-2 p-4 bg-yellow-100 border-yellow-300 text-yellow-800 z-10">
                <p className="text-sm font-medium">Fallback Mode</p>
                <p className="text-sm mt-1">Could not connect. Limited local responses.</p>
                {apiConfigured && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleRetryAPI}
                    className="mt-2 rounded-md border-yellow-300 text-yellow-800 hover:bg-yellow-200"
                    disabled={currentLoading || (port !== null && connectionAttempts === 0)}
                  >
                    <RefreshCw size={14} className="mr-2" /> Reconnect
                  </Button>
                )}
                {!apiConfigured && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setShowSettings(true)}
                    className="mt-2 rounded-md border-yellow-300 text-yellow-800 hover:bg-yellow-200"
                  >
                    Configure API Key
                  </Button>
                )}
              </Card>
            )}
          </div>
        </div>

        {/* Overlay Panels */}
        <ToolsTestPanel isOpen={showToolsTest} onClose={() => setShowToolsTest(false)} />
        <AgentTestPanel isOpen={showAgentTest} onClose={() => setShowAgentTest(false)} />
      </Card>

      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsMobileSidebarOpen(false)} />
          <div className="relative h-full w-72 max-w-full border-r bg-background">
            <SessionSidebar
              sessions={sessionList}
              activeSessionId={activeSessionId}
              onSelect={handleSelectSession}
              onCreate={handleNewChat}
              onRename={handleRenameSession}
              onDelete={handleDeleteSession}
              onDuplicate={handleDuplicateSession}
              onTogglePin={handleTogglePin}
              className="h-full w-full bg-background shadow-xl"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2"
              aria-label="Close chat list"
              onClick={() => setIsMobileSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Onboarding */}
      {showWelcome && (
        <WelcomeModal onStart={startTour} onSkip={skipTour} />
      )}
      {showTour && (
        <OnboardingTour
          steps={steps}
          currentStep={currentStep}
          onNext={nextStep}
          onSkip={skipTour}
          onComplete={completeTour}
        />
      )}
    </>
  );
}
// Export helpers for testing
export { truncateText, getSuggestedSessionTitle, migrateSessions, createSessionRecord }
