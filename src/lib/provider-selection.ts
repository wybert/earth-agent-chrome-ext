import {
  AVAILABLE_MODELS,
  DEFAULT_MODELS,
  getDefaultKimiModelForMode,
  getKimiModelsForMode,
  type ApiProvider,
  type KimiApiMode,
} from '@/constants/models';

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  'z-ai': 'Z.AI',
  mimo: 'Xiaomi MiMo',
  kimi: 'Kimi',
};

export function providerLabel(provider: string): string {
  if (PROVIDER_LABELS[provider]) return PROVIDER_LABELS[provider];
  if (provider.startsWith('custom:')) return 'the selected custom provider';
  return provider;
}

/** Which built-in provider owns a composer model id. */
export function providerForModel(modelId: string): ApiProvider | null {
  for (const [providerKey, models] of Object.entries(AVAILABLE_MODELS)) {
    if (models.includes(modelId)) return providerKey as ApiProvider;
  }
  return null;
}

/**
 * Reason to stay offline, or null when this provider can take a chat turn.
 * Saving a key does not by itself change the active provider.
 */
export function describeMissingProviderKey(provider: string, hasKey: boolean): string | null {
  if (hasKey) return null;
  return `No API key is saved for ${providerLabel(provider)}. Save that provider's key in Settings and choose it as the active provider, or pick one of its models in the chat box.`;
}

/** Keep the current model when it belongs to the provider; otherwise use that provider's default. */
export function modelForProviderSwitch(
  provider: ApiProvider,
  currentModel: string,
  kimiMode: KimiApiMode
): string {
  const models = provider === 'kimi' ? getKimiModelsForMode(kimiMode) : AVAILABLE_MODELS[provider];
  if (currentModel && models.includes(currentModel)) return currentModel;
  if (provider === 'kimi') return getDefaultKimiModelForMode(kimiMode);
  return DEFAULT_MODELS[provider];
}
