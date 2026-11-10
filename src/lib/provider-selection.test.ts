import {
  describeMissingProviderKey,
  modelForProviderSwitch,
  providerForModel,
} from './provider-selection';

describe('provider selection', () => {
  it('maps Kimi Code and Open Platform model ids to kimi', () => {
    expect(providerForModel('k3.1-pro')).toBe('kimi');
    expect(providerForModel('kimi-k3.1-pro')).toBe('kimi');
    expect(providerForModel('gpt-6-astra')).toBe('openai');
  });

  it('stays offline for the default provider when its key is missing', () => {
    const reason = describeMissingProviderKey('openai', false);
    expect(reason).toEqual(expect.stringContaining('OpenAI'));
    expect(reason).not.toBe('Fallback mode active.');
  });

  it('clears the offline reason when the chosen provider has a key', () => {
    expect(describeMissingProviderKey('kimi', true)).toBeNull();
  });

  it('switches to the Kimi Code default when the current model belongs to another provider', () => {
    expect(modelForProviderSwitch('kimi', 'gpt-6-astra', 'coding-cn')).toBe('kimi-for-coding');
    expect(modelForProviderSwitch('kimi', 'k3.1-pro', 'coding-cn')).toBe('k3.1-pro');
  });
});
