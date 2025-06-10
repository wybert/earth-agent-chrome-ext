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
  id?: string;
  role: string;
  content?: string;
  parts?: MessagePart[];
}

export type Provider = 'openai' | 'anthropic' | 'google' | 'qwen' | 'ollama';

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
}