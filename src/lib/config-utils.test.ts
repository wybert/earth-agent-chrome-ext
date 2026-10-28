import { loadProviderConfig } from './config-utils';
import {
  API_PROVIDER_STORAGE_KEY,
  KIMI_API_KEY_STORAGE_KEY,
  MIMO_API_KEY_STORAGE_KEY,
  MODEL_STORAGE_KEY,
} from '@/constants/models';

describe('loadProviderConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    ['kimi', KIMI_API_KEY_STORAGE_KEY, 'kimi-test-key'],
    ['mimo', MIMO_API_KEY_STORAGE_KEY, 'mimo-test-key'],
  ])('loads the %s API key from synced storage', async (provider, keyStorageKey, apiKey) => {
    const storedValues = {
      [API_PROVIDER_STORAGE_KEY]: provider,
      [MODEL_STORAGE_KEY]: `${provider}-test-model`,
      [keyStorageKey]: apiKey,
    };
    (chrome.storage.sync.get as jest.Mock).mockImplementation((_keys, callback) => {
      callback(storedValues);
    });

    await expect(loadProviderConfig()).resolves.toMatchObject({
      provider,
      model: `${provider}-test-model`,
      apiKey,
    });
  });
});
