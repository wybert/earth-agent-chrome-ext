// Static catalog verified against provider documentation on 2026-09-17.
// Keep the current and immediately previous available generation per family.
// https://developers.openai.com/api/docs/models
// https://platform.claude.com/docs/en/models/overview
// https://ai.google.dev/gemini-api/docs/models
// https://docs.z.ai/guides/llm/glm-5.3
export type ApiProvider = 'openai' | 'anthropic' | 'google' | 'z-ai';

export const AVAILABLE_MODELS: Record<ApiProvider, string[]> = {
  openai: [
    'gpt-6-astra',
    'gpt-5.6-sol',
    'gpt-5.6-terra',
    'gpt-5.6-luna',
  ],
  anthropic: [
    'claude-fable-5-1',
    'claude-opus-5',
    'claude-sonnet-5',
    'claude-haiku-4-5-20251001',
    'claude-fable-5',
    'claude-opus-4-8',
    'claude-sonnet-4-6',
  ],
  google: [
    'gemini-3.1-pro-preview',
    'gemini-3.8-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.7-flash',
    'gemini-3.1-flash-lite',
  ],
  'z-ai': ['glm-5.3', 'glm-5.2'],
};

// Human-readable model names
export const MODEL_DISPLAY_NAMES: Record<string, string> = {
  // OpenAI Models
  'gpt-6-astra': 'GPT-6 Astra',
  'gpt-5.6-sol': 'GPT-5.6 Sol',
  'gpt-5.6-terra': 'GPT-5.6 Terra',
  'gpt-5.6-luna': 'GPT-5.6 Luna',
  // Anthropic Models
  'claude-fable-5-1': 'Claude Fable 5.1',
  'claude-opus-5': 'Claude Opus 5',
  'claude-sonnet-5': 'Claude Sonnet 5',
  'claude-fable-5': 'Claude Fable 5',
  'claude-opus-4-8': 'Claude Opus 4.8',
  'claude-sonnet-4-6': 'Claude Sonnet 4.6',
  'claude-haiku-4-5-20251001': 'Claude Haiku 4.5 (Fast)',
  // Google Models
  'gemini-3.1-pro-preview': 'Gemini 3.1 Pro (Preview)',
  'gemini-3.8-flash': 'Gemini 3.8 Flash',
  'gemini-3.5-flash-lite': 'Gemini 3.5 Flash Lite',
  'gemini-3.7-flash': 'Gemini 3.7 Flash',
  'gemini-3.1-flash-lite': 'Gemini 3.1 Flash Lite',
  // Z.AI Models
  'glm-5.3': 'GLM-5.3 (Text only)',
  'glm-5.2': 'GLM-5.2 (Text only)',
};

// Default models for each provider
export const DEFAULT_MODELS: Record<ApiProvider, string> = {
  openai: 'gpt-6-astra',
  anthropic: 'claude-sonnet-5',
  google: 'gemini-3.1-pro-preview',
  'z-ai': 'glm-5.3',
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

// Storage key for tracking if we need to request activeTab permission (session storage)
export const PERMISSION_NEEDED_STORAGE_KEY = 'earth_agent_permission_needed';
