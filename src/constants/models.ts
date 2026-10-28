// Static catalog verified against provider documentation on 2026-10-28.
// Keep the current and immediately previous available generation per family.
// https://developers.openai.com/api/docs/models
// https://platform.claude.com/docs/en/models/overview
// https://ai.google.dev/gemini-api/docs/models
// https://docs.z.ai/guides/llm/glm-5.3
// https://mimo.mi.com/docs/en-US/api/model/list-models
// https://www.kimi.ai/help/kimi-api/api-model-selection
export type ApiProvider = 'openai' | 'anthropic' | 'google' | 'z-ai' | 'mimo' | 'kimi';

export type KimiApiMode =
  | 'open-platform-cn'
  | 'open-platform-global'
  | 'coding-cn'
  | 'coding-global';

export const DEFAULT_KIMI_API_MODE: KimiApiMode = 'open-platform-global';

export const KIMI_API_MODE_ENDPOINTS: Record<KimiApiMode, string> = {
  'open-platform-cn': 'https://api.moonshot.cn/v1',
  'open-platform-global': 'https://api.moonshot.ai/v1',
  'coding-cn': 'https://api.kimi.com/coding/v1',
  'coding-global': 'https://api.kimi.ai/coding/v1',
};

export const KIMI_OPEN_PLATFORM_MODELS = [
  'kimi-k3.1-pro',
  'kimi-k3.1-pro-highspeed',
  'kimi-k3',
  'kimi-k2.6',
];

export const KIMI_CODE_MODELS = [
  'k3.1-pro',
  'k3.1-pro-highspeed',
  'k3',
  'k3-256k',
  'kimi-for-coding',
  'kimi-for-coding-highspeed',
];

export function getKimiModelsForMode(mode: KimiApiMode | string): string[] {
  return mode.startsWith('coding') ? KIMI_CODE_MODELS : KIMI_OPEN_PLATFORM_MODELS;
}

export function getDefaultKimiModelForMode(mode: KimiApiMode | string): string {
  return mode.startsWith('coding') ? 'kimi-for-coding' : 'kimi-k3.1-pro';
}

export function normalizeKimiApiMode(mode: unknown): KimiApiMode {
  switch (mode) {
    case 'open-platform-cn':
    case 'open-platform-global':
    case 'coding-cn':
    case 'coding-global':
      return mode;
    default:
      return DEFAULT_KIMI_API_MODE;
  }
}

export const AVAILABLE_MODELS: Record<ApiProvider, string[]> = {
  openai: [
    'gpt-6-astra',
    'gpt-6.1-sol',
    'gpt-6.1-terra',
    'gpt-6-luna',
    'gpt-5.6-sol',
    'gpt-5.6-terra',
    'gpt-5.6-luna',
  ],
  anthropic: [
    'claude-fable-5-1',
    'claude-opus-5-5',
    'claude-sonnet-5-5',
    'claude-haiku-5-5',
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
    'gemini-3.7-flash',
    'gemini-3.1-flash-lite',
  ],
  'z-ai': ['glm-5.3', 'glm-5.2'],
  mimo: ['mimo-v2.6-pro', 'mimo-v2.6-flash', 'mimo-v2.6-pro-ultraspeed'],
  kimi: [...KIMI_OPEN_PLATFORM_MODELS, ...KIMI_CODE_MODELS],
};

// Human-readable model names
export const MODEL_DISPLAY_NAMES: Record<string, string> = {
  // OpenAI Models
  'gpt-6-astra': 'GPT-6 Astra',
  'gpt-6.1-sol': 'GPT-6.1 Sol',
  'gpt-6.1-terra': 'GPT-6.1 Terra',
  'gpt-6-luna': 'GPT-6 Luna',
  'gpt-5.6-sol': 'GPT-5.6 Sol',
  'gpt-5.6-terra': 'GPT-5.6 Terra',
  'gpt-5.6-luna': 'GPT-5.6 Luna',
  // Anthropic Models
  'claude-fable-5-1': 'Claude Fable 5.1',
  'claude-opus-5-5': 'Claude Opus 5.5',
  'claude-sonnet-5-5': 'Claude Sonnet 5.5',
  'claude-haiku-5-5': 'Claude Haiku 5.5 (Fast)',
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
  // Xiaomi MiMo Models
  'mimo-v2.6-pro': 'MiMo-V2.6 Pro (Multimodal)',
  'mimo-v2.6-flash': 'MiMo-V2.6 Flash (Multimodal, Fast)',
  'mimo-v2.6-pro-ultraspeed': 'MiMo-V2.6 Pro Ultraspeed (Multimodal)',
  // Moonshot Kimi Models
  'kimi-k3.1-pro': 'Kimi K3.1 Pro (Vision)',
  'kimi-k3.1-pro-highspeed': 'Kimi K3.1 Pro Highspeed (Vision)',
  'kimi-k3': 'Kimi K3 (Vision)',
  'kimi-k2.6': 'Kimi K2.6 (Vision)',
  // Kimi Code subscription models
  'k3.1-pro': 'Kimi Code K3.1 Pro (Vision)',
  'k3.1-pro-highspeed': 'Kimi Code K3.1 Pro Highspeed (Vision)',
  k3: 'Kimi Code K3 (Vision)',
  'k3-256k': 'Kimi Code K3 256K (Vision)',
  'kimi-for-coding': 'Kimi Code (Vision)',
  'kimi-for-coding-highspeed': 'Kimi Code Highspeed (Vision)',
};

// Default models for each provider
export const DEFAULT_MODELS: Record<ApiProvider, string> = {
  openai: 'gpt-6-astra',
  anthropic: 'claude-sonnet-5-5',
  google: 'gemini-3.1-pro-preview',
  'z-ai': 'glm-5.3',
  mimo: 'mimo-v2.6-flash',
  kimi: 'kimi-k3.1-pro',
};

// Storage keys for API configuration
export const OPENAI_API_KEY_STORAGE_KEY = 'earth_engine_openai_api_key';
export const ANTHROPIC_API_KEY_STORAGE_KEY = 'earth_engine_anthropic_api_key';
export const GOOGLE_API_KEY_STORAGE_KEY = 'earth_engine_google_api_key';
export const Z_AI_API_KEY_STORAGE_KEY = 'earth_engine_z_ai_api_key';
export const MIMO_API_KEY_STORAGE_KEY = 'earth_engine_mimo_api_key';
export const MIMO_TOKEN_PLAN_REGION_STORAGE_KEY = 'earth_engine_mimo_token_plan_region';
export const KIMI_API_KEY_STORAGE_KEY = 'earth_engine_kimi_api_key';
export const KIMI_API_MODE_STORAGE_KEY = 'earth_engine_kimi_api_mode';
export const API_PROVIDER_STORAGE_KEY = 'earth_engine_llm_provider';
export const MODEL_STORAGE_KEY = 'earth_engine_llm_model';

// Storage key for OpenAI Compatible provider configurations
export const OPENAI_COMPATIBLE_CONFIGS_STORAGE_KEY = 'earth_engine_openai_compatible_configs';

// Storage key for tracking if we need to request activeTab permission (session storage)
export const PERMISSION_NEEDED_STORAGE_KEY = 'earth_agent_permission_needed';
