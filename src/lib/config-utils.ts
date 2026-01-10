import { OpenAICompatibleConfig, Provider } from '@/types/extension';
import {
  OPENAI_API_KEY_STORAGE_KEY,
  ANTHROPIC_API_KEY_STORAGE_KEY,
  GOOGLE_API_KEY_STORAGE_KEY,
  Z_AI_API_KEY_STORAGE_KEY,
  API_PROVIDER_STORAGE_KEY,
  MODEL_STORAGE_KEY,
  OPENAI_COMPATIBLE_CONFIGS_STORAGE_KEY,
  DEFAULT_MODELS,
} from '@/constants/models';

export interface ProviderConfig {
  provider: Provider;
  apiKey: string;
  model: string;
  customConfig?: OpenAICompatibleConfig;
}

/**
 * Single source of truth for provider → API key storage key mapping
 */
export function getApiKeyStorageKey(provider: Provider): string | null {
  switch (provider) {
    case 'openai':
      return OPENAI_API_KEY_STORAGE_KEY;
    case 'anthropic':
      return ANTHROPIC_API_KEY_STORAGE_KEY;
    case 'google':
      return GOOGLE_API_KEY_STORAGE_KEY;
    case 'z-ai':
      return Z_AI_API_KEY_STORAGE_KEY;
    default:
      return null; // Custom providers use config.apiKey
  }
}

/**
 * Unified config loading from chrome.storage.sync
 * All components should use this function to ensure consistent behavior
 */
export async function loadProviderConfig(): Promise<ProviderConfig> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(
      [
        OPENAI_API_KEY_STORAGE_KEY,
        ANTHROPIC_API_KEY_STORAGE_KEY,
        GOOGLE_API_KEY_STORAGE_KEY,
        Z_AI_API_KEY_STORAGE_KEY,
        API_PROVIDER_STORAGE_KEY,
        MODEL_STORAGE_KEY,
        OPENAI_COMPATIBLE_CONFIGS_STORAGE_KEY,
      ],
      (result) => {
        const provider = (result[API_PROVIDER_STORAGE_KEY] || 'openai') as Provider;

        // Use default model for provider if no model is stored
        const model =
          result[MODEL_STORAGE_KEY] ||
          DEFAULT_MODELS[provider as keyof typeof DEFAULT_MODELS] ||
          DEFAULT_MODELS.openai;

        let apiKey = '';
        let customConfig: OpenAICompatibleConfig | undefined;

        if (provider.startsWith('custom:')) {
          const configs: OpenAICompatibleConfig[] =
            result[OPENAI_COMPATIBLE_CONFIGS_STORAGE_KEY] || [];
          const customId = provider.replace('custom:', '');
          customConfig = configs.find((c) => c.id === customId);
          apiKey = customConfig?.apiKey || '';
        } else {
          const storageKey = getApiKeyStorageKey(provider);
          apiKey = storageKey ? result[storageKey] || '' : '';
        }

        resolve({ provider, apiKey, model, customConfig });
      }
    );
  });
}

/**
 * Check if an API key is configured for the given provider
 */
export function hasApiKeyConfigured(config: ProviderConfig): boolean {
  return !!config.apiKey;
}
