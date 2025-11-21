// Available models for each provider
export type ApiProvider = 'openai' | 'anthropic' | 'google' | 'qwen' | 'ollama';

export const AVAILABLE_MODELS: Record<ApiProvider, string[]> = {
  openai: [
    // GPT-5.1 Series (Latest)
    'gpt-5.1',
    'gpt-5.1-2025-11-13',
    'gpt-5.1-chat-latest',
    'gpt-5.1-codex',
    'gpt-5.1-codex-mini',
    // GPT-5 Series
    'gpt-5',
    'gpt-5-2025-08-07',
    'gpt-5-chat-latest',
    'gpt-5-pro',
    'gpt-5-pro-2025-10-06',
    'gpt-5-mini',
    'gpt-5-mini-2025-08-07',
    'gpt-5-nano',
    'gpt-5-nano-2025-08-07',
    'gpt-5-codex',
    // GPT-4o Series
    'gpt-4o',
    'gpt-4o-2024-05-13',
    'gpt-4o-2024-08-06',
    'gpt-4o-2024-11-20',
    'gpt-4o-mini',
    'gpt-4o-mini-2024-07-18'
  ],
  anthropic: [
    // Claude 4.5 Series (Latest)
    'claude-sonnet-4-5-20250929',
    'claude-haiku-4-5-20251001',
    // Claude 4.1 Series
    'claude-opus-4-1-20250805',
    // Claude 4 Series
    'claude-opus-4-20250514',
    'claude-sonnet-4-20250514'
  ],
  google: [
    // Latest Aliases (Auto-updated)
    'gemini-pro-latest',
    'gemini-flash-latest',
    'gemini-flash-lite-latest',
    // Gemini 3 Pro Series (Latest with thinking)
    'gemini-3-pro-preview',
    // Gemini 2.5 Pro Series (Most Capable)
    'gemini-2.5-pro',
    'gemini-2.5-pro-preview-06-05',
    'gemini-2.5-pro-preview-05-06',
    'gemini-2.5-pro-preview-03-25',
    // Gemini 2.5 Flash Series (Balanced)
    'gemini-2.5-flash',
    'gemini-2.5-flash-preview-05-20',
    'gemini-2.5-flash-preview-09-2025',
    // Gemini 2.5 Flash-Lite Series (Fast)
    'gemini-2.5-flash-lite',
    'gemini-2.5-flash-lite-preview-06-17',
    'gemini-2.5-flash-lite-preview-09-2025'
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
  // GPT-5.1 Series
  'gpt-5.1': 'GPT-5.1 (Recommended)',
  'gpt-5.1-2025-11-13': 'GPT-5.1 (November 2025)',
  'gpt-5.1-chat-latest': 'GPT-5.1 Chat (Latest)',
  'gpt-5.1-codex': 'GPT-5.1 Codex',
  'gpt-5.1-codex-mini': 'GPT-5.1 Codex Mini',
  // GPT-5 Series
  'gpt-5': 'GPT-5',
  'gpt-5-2025-08-07': 'GPT-5 (August 2025)',
  'gpt-5-chat-latest': 'GPT-5 Chat (Latest)',
  'gpt-5-pro': 'GPT-5 Pro',
  'gpt-5-pro-2025-10-06': 'GPT-5 Pro (October 2025)',
  'gpt-5-mini': 'GPT-5 Mini (Fast)',
  'gpt-5-mini-2025-08-07': 'GPT-5 Mini (August 2025)',
  'gpt-5-nano': 'GPT-5 Nano (Ultra Fast)',
  'gpt-5-nano-2025-08-07': 'GPT-5 Nano (August 2025)',
  'gpt-5-codex': 'GPT-5 Codex',
  // GPT-4o Series
  'gpt-4o': 'GPT-4o',
  'gpt-4o-2024-05-13': 'GPT-4o (May 2024)',
  'gpt-4o-2024-08-06': 'GPT-4o (August 2024)',
  'gpt-4o-2024-11-20': 'GPT-4o (November 2024)',
  'gpt-4o-mini': 'GPT-4o Mini',
  'gpt-4o-mini-2024-07-18': 'GPT-4o Mini (July 2024)',
  // Claude 4.5 Series
  'claude-sonnet-4-5-20250929': 'Claude Sonnet 4.5 (Latest)',
  'claude-haiku-4-5-20251001': 'Claude Haiku 4.5 (Fast)',
  // Claude 4.1 Series
  'claude-opus-4-1-20250805': 'Claude Opus 4.1',
  // Claude 4 Series
  'claude-opus-4-20250514': 'Claude Opus 4',
  'claude-sonnet-4-20250514': 'Claude Sonnet 4',
  // Gemini Latest
  'gemini-pro-latest': 'Gemini Pro (Latest)',
  'gemini-flash-latest': 'Gemini Flash (Latest)',
  'gemini-flash-lite-latest': 'Gemini Flash Lite (Latest)',
  // Gemini 3 Pro
  'gemini-3-pro-preview': 'Gemini 3 Pro Preview',
  // Gemini 2.5 Pro
  'gemini-2.5-pro': 'Gemini 2.5 Pro',
  'gemini-2.5-pro-preview-06-05': 'Gemini 2.5 Pro (June 2025)',
  'gemini-2.5-pro-preview-05-06': 'Gemini 2.5 Pro (May 2025)',
  'gemini-2.5-pro-preview-03-25': 'Gemini 2.5 Pro (March 2025)',
  // Gemini 2.5 Flash
  'gemini-2.5-flash': 'Gemini 2.5 Flash',
  'gemini-2.5-flash-preview-05-20': 'Gemini 2.5 Flash (May 2025)',
  'gemini-2.5-flash-preview-09-2025': 'Gemini 2.5 Flash (Sep 2025)',
  // Gemini 2.5 Flash Lite
  'gemini-2.5-flash-lite': 'Gemini 2.5 Flash Lite',
  'gemini-2.5-flash-lite-preview-06-17': 'Gemini 2.5 Flash Lite (June 2025)',
  'gemini-2.5-flash-lite-preview-09-2025': 'Gemini 2.5 Flash Lite (Sep 2025)',
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
  openai: 'gpt-5.1',
  anthropic: 'claude-sonnet-4-5-20250929',
  google: 'gemini-2.5-pro',
  qwen: 'qwen-max-latest',
  ollama: 'llama3.3'
};
