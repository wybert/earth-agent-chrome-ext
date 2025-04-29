// Types for extension messaging
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
  provider?: string;
  messages?: Array<{ id: string; role: string; content: string }>;
}