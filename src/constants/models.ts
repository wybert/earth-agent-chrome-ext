// Available models for each provider
export type ApiProvider = 'openai' | 'anthropic' | 'google' | 'qwen' | 'ollama';

export const AVAILABLE_MODELS: Record<ApiProvider, string[]> = {
  openai: [
    'gpt-4.1',
    'gpt-4o',
    'gpt-5',
    'gpt-5.1',
    'gpt-5.1-codex',
    'gpt-5.1-chat-latest'
  ],
  anthropic: [
    'claude-sonnet-4-5-20250929',
    'claude-haiku-4-5-20251001',
    'claude-opus-4-1-20250805',
    'claude-opus-4-20250514',
    'claude-sonnet-4-20250514',
    'claude-3-7-sonnet-20250219',
    'claude-3-5-haiku-20241022'
  ],
  google: [
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gemini-3-pro-preview'
  ],
  qwen: [
    'qwen-max-latest',
    'qwen-max',
    'qwen-plus-latest',
    'qwen-plus',
    'qwen-turbo-latest',
    'qwen-turbo',
    'qwen-vl-max',
    'qwen2.5-72b-instruct',
    'qwen2.5-14b-instruct-1m',
    'qwen2.5-vl-72b-instruct'
  ],
  ollama: [
    'phi3',
    'llama3.3:70b',
    'llama3.3',
    'llama3.2:90b',
    'llama3.2:70b',
    'llama3.2',
    'llama3.1:70b',
    'llama3.1',
    'mistral',
    'codellama',
    'deepseek-coder-v2',
    'qwen2.5',
    'gemma2',
    'llava',
    'llava-llama3',
    'llava-phi3',
    'moondream'
  ]
};

// Human-readable model names
export const MODEL_DISPLAY_NAMES: Record<string, string> = {
  // OpenAI Models
  'gpt-4.1': 'GPT-4.1',
  'gpt-4o': 'GPT-4o',
  'gpt-5': 'GPT-5',
  'gpt-5.1': 'GPT-5.1 (Recommended)',
  'gpt-5.1-codex': 'GPT-5.1 Codex',
  'gpt-5.1-chat-latest': 'GPT-5.1 Chat (Latest)',
  // Anthropic Models
  'claude-sonnet-4-5-20250929': 'Claude Sonnet 4.5 (Latest)',
  'claude-haiku-4-5-20251001': 'Claude Haiku 4.5 (Fast)',
  'claude-opus-4-1-20250805': 'Claude Opus 4.1',
  'claude-opus-4-20250514': 'Claude Opus 4',
  'claude-sonnet-4-20250514': 'Claude Sonnet 4',
  'claude-3-7-sonnet-20250219': 'Claude Sonnet 3.7',
  'claude-3-5-haiku-20241022': 'Claude Haiku 3.5',
  // Google Models
  'gemini-2.5-pro': 'Gemini 2.5 Pro',
  'gemini-2.5-flash': 'Gemini 2.5 Flash',
  'gemini-3-pro-preview': 'Gemini 3 Pro Preview',
  // Qwen
  'qwen-max-latest': 'Qwen Max (Latest)',
  'qwen-max': 'Qwen Max',
  'qwen-plus-latest': 'Qwen Plus (Latest)',
  'qwen-plus': 'Qwen Plus',
  'qwen-turbo-latest': 'Qwen Turbo (Latest)',
  'qwen-turbo': 'Qwen Turbo',
  'qwen-vl-max': 'Qwen VL Max',
  'qwen2.5-72b-instruct': 'Qwen 2.5 72B',
  'qwen2.5-14b-instruct-1m': 'Qwen 2.5 14B (1M)',
  'qwen2.5-vl-72b-instruct': 'Qwen 2.5 VL 72B',
  // Ollama
  'phi3': 'Phi-3',
  'llama3.3:70b': 'Llama 3.3 70B',
  'llama3.3': 'Llama 3.3',
  'llama3.2:90b': 'Llama 3.2 90B',
  'llama3.2:70b': 'Llama 3.2 70B',
  'llama3.2': 'Llama 3.2',
  'llama3.1:70b': 'Llama 3.1 70B',
  'llama3.1': 'Llama 3.1',
  'mistral': 'Mistral',
  'codellama': 'Code Llama',
  'deepseek-coder-v2': 'DeepSeek Coder V2',
  'qwen2.5': 'Qwen 2.5',
  'gemma2': 'Gemma 2',
  'llava': 'LLaVA',
  'llava-llama3': 'LLaVA Llama 3',
  'llava-phi3': 'LLaVA Phi-3',
  'moondream': 'Moondream'
};

// Default models for each provider
export const DEFAULT_MODELS: Record<ApiProvider, string> = {
  openai: 'gpt-4o',
  anthropic: 'claude-sonnet-4-5-20250929',
  google: 'gemini-2.5-pro',
  qwen: 'qwen-max-latest',
  ollama: 'llama3.3'
};
