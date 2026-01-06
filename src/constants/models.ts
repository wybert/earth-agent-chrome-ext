// Available models for each provider
export type ApiProvider = 'openai' | 'anthropic' | 'google' | 'z-ai';

export const AVAILABLE_MODELS: Record<ApiProvider, string[]> = {
  openai: [
    'gpt-5.2-pro',
    'gpt-5.2',
    'gpt-5.2-chat-latest',
    'gpt-5.1',
    'gpt-5.1-codex',
    'gpt-5.1-chat-latest'
  ],
  anthropic: [
    'claude-opus-4-5-20251101',
    'claude-sonnet-4-5-20250929',
    'claude-haiku-4-5-20251001'
  ],
  google: [
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gemini-3-pro-preview',
    'gemini-3-flash-preview'
  ],
  'z-ai': [
    'glm-4.7'
  ]
};

// Human-readable model names
export const MODEL_DISPLAY_NAMES: Record<string, string> = {
  // OpenAI Models
  'gpt-5.2-pro': 'GPT-5.2 Pro',
  'gpt-5.2': 'GPT-5.2 (Latest)',
  'gpt-5.2-chat-latest': 'GPT-5.2 Chat (Latest)',
  'gpt-5.1': 'GPT-5.1',
  'gpt-5.1-codex': 'GPT-5.1 Codex',
  'gpt-5.1-chat-latest': 'GPT-5.1 Chat (Latest)',
  // Anthropic Models
  'claude-opus-4-5-20251101': 'Claude Opus 4.5 (Best)',
  'claude-sonnet-4-5-20250929': 'Claude Sonnet 4.5 (Recommended)',
  'claude-haiku-4-5-20251001': 'Claude Haiku 4.5 (Fast)',
  // Google Models
  'gemini-2.5-pro': 'Gemini 2.5 Pro',
  'gemini-2.5-flash': 'Gemini 2.5 Flash',
  'gemini-3-pro-preview': 'Gemini 3 Pro Preview',
  'gemini-3-flash-preview': 'Gemini 3 Flash Preview',
  // Z.AI Models
  'glm-4.7': 'GLM-4.7'
};

// Default models for each provider
export const DEFAULT_MODELS: Record<ApiProvider, string> = {
  openai: 'gpt-5.2',
  anthropic: 'claude-sonnet-4-5-20250929',
  google: 'gemini-2.5-pro',
  'z-ai': 'glm-4.7'
};

// Storage keys for API configuration
export const OPENAI_API_KEY_STORAGE_KEY = 'earth_engine_openai_api_key';
export const ANTHROPIC_API_KEY_STORAGE_KEY = 'earth_engine_anthropic_api_key';
export const GOOGLE_API_KEY_STORAGE_KEY = 'earth_engine_google_api_key';
export const Z_AI_API_KEY_STORAGE_KEY = 'earth_engine_z_ai_api_key';
export const API_PROVIDER_STORAGE_KEY = 'earth_engine_llm_provider';
export const MODEL_STORAGE_KEY = 'earth_engine_llm_model';

// Storage key for OpenAI Compatible provider configurations
export const OPENAI_COMPATIBLE_CONFIGS_STORAGE_KEY = 'earth_engine_openai_compatible_configs';
