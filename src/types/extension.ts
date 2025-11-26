// Types for extension messaging
export interface MessagePart {
  type: string;
  text?: string;
  mimeType?: string;
  name?: string;
  data?: string;
  size?: number;
}

export interface Message {
  id: string; // Required for AI SDK 5.0 compatibility
  role: string;
  content?: string;
  parts?: MessagePart[];
}

// Built-in providers
export type BuiltInProvider = 'openai' | 'anthropic' | 'google' | 'qwen' | 'ollama';

// Custom provider format: 'custom:{uuid}'
export type Provider = BuiltInProvider | `custom:${string}`;

// OpenAI Compatible provider configuration
export interface OpenAICompatibleConfig {
  id: string;              // Unique identifier (UUID)
  name: string;            // User-provided name (e.g., "DeepSeek", "Together AI")
  baseURL: string;         // API endpoint URL
  apiKey: string;          // API key for this provider
  modelName: string;       // Default model name to use
  enabled: boolean;        // Whether this config is currently active
  createdAt: number;       // Creation timestamp
  updatedAt: number;       // Last update timestamp
}

export interface ExtensionMessage {
  type: string;
  payload?: any;
  requestId?: string;
  endpoint?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  error?: string;
  chunk?: string;
  message?: string;
  apiKey?: string;
  provider?: Provider;
  model?: string;
  messages?: Message[];
  attachments?: Array<{ type: string; mimeType?: string; data: string }>; // Support for image attachments
  hasMultiModal?: boolean; // Flag to indicate multi-modal content
  sender?: string;
  mode?: 'ask' | 'do'; // Agent mode: ask (read-only) or do (full actions)
}