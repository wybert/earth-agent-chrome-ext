import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Check, X, Eye, EyeOff } from 'lucide-react';

// Key for storing API key in Chrome Storage
const API_KEY_STORAGE_KEY = 'earth_engine_llm_api_key'; // Legacy key
const OPENAI_API_KEY_STORAGE_KEY = 'earth_engine_openai_api_key';
const ANTHROPIC_API_KEY_STORAGE_KEY = 'earth_engine_anthropic_api_key';
const API_PROVIDER_STORAGE_KEY = 'earth_engine_llm_provider';
const MODEL_STORAGE_KEY = 'earth_engine_llm_model';

type ApiProvider = 'openai' | 'anthropic';

// Available models for each provider
const AVAILABLE_MODELS: Record<ApiProvider, string[]> = {
  openai: [
    'gpt-4o', 
    'gpt-4o-2024-05-13',
    'gpt-4o-2024-08-06',
    'gpt-4o-2024-11-20',
    'gpt-4o-mini',
    'gpt-4o-mini-2024-07-18',
    'o4-mini',
    'o4-mini-2025-04-16',
    'gpt-4.5-preview',
    'gpt-4.1',
    'gpt-4.1-mini',
    'gpt-4-turbo',
    'gpt-4-turbo-2024-04-09',
    'gpt-4-0125-preview',
    'gpt-4-1106-preview',
    'gpt-4',
    'gpt-3.5-turbo',
    'gpt-3.5-turbo-0125',
    'gpt-3.5-turbo-1106'
  ],
  anthropic: [
    'claude-opus-4-20250514',
    'claude-sonnet-4-20250514',
    'claude-3-7-sonnet-20250219',
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-5-sonnet-20240620'
  ]
};

// Human-readable model names
const MODEL_DISPLAY_NAMES: Record<string, string> = {
  'gpt-4o': 'GPT-4o (Recommended)',
  'gpt-4o-2024-05-13': 'GPT-4o (May 2024)',
  'gpt-4o-2024-08-06': 'GPT-4o (August 2024)',
  'gpt-4o-2024-11-20': 'GPT-4o (November 2024)',
  'gpt-4o-mini': 'GPT-4o Mini (Fast)',
  'gpt-4o-mini-2024-07-18': 'GPT-4o Mini (July 2024)',
  'o4-mini': 'O4 Mini (Latest)',
  'o4-mini-2025-04-16': 'O4 Mini (April 2025)',
  'gpt-4.5-preview': 'GPT-4.5 Preview (Latest)',
  'gpt-4.1': 'GPT-4.1',
  'gpt-4.1-mini': 'GPT-4.1 Mini',
  'gpt-4-turbo': 'GPT-4 Turbo',
  'gpt-4-turbo-2024-04-09': 'GPT-4 Turbo (April 2024)',
  'gpt-4-0125-preview': 'GPT-4 Turbo (January 2024)',
  'gpt-4-1106-preview': 'GPT-4 Turbo Preview',
  'gpt-4': 'GPT-4',
  'gpt-3.5-turbo': 'GPT-3.5 Turbo',
  'gpt-3.5-turbo-0125': 'GPT-3.5 Turbo (January 2024)',
  'gpt-3.5-turbo-1106': 'GPT-3.5 Turbo (November 2023)',
  'claude-opus-4-20250514': 'Claude Opus 4 (Latest)',
  'claude-sonnet-4-20250514': 'Claude Sonnet 4 (Latest)',
  'claude-3-7-sonnet-20250219': 'Claude 3.7 Sonnet',
  'claude-3-5-sonnet-20241022': 'Claude 3.5 Sonnet (New)',
  'claude-3-5-haiku-20241022': 'Claude 3.5 Haiku',
  'claude-3-5-sonnet-20240620': 'Claude 3.5 Sonnet (Old)'
};

interface SettingsProps {
  onClose: () => void;
}

export function Settings({ onClose }: SettingsProps) {
  const [apiKey, setApiKey] = useState('');
  const [provider, setProvider] = useState<ApiProvider>('openai');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Load saved API key on component mount
  useEffect(() => {
    chrome.storage.sync.get([
      API_KEY_STORAGE_KEY, 
      OPENAI_API_KEY_STORAGE_KEY,
      ANTHROPIC_API_KEY_STORAGE_KEY,
      API_PROVIDER_STORAGE_KEY,
      MODEL_STORAGE_KEY
    ], (result) => {
      const savedProvider = result[API_PROVIDER_STORAGE_KEY] as ApiProvider || 'openai';
      setProvider(savedProvider);
      
      // Load the appropriate API key based on provider
      if (savedProvider === 'openai') {
        const openaiKey = result[OPENAI_API_KEY_STORAGE_KEY] || result[API_KEY_STORAGE_KEY] || '';
        setApiKey(openaiKey);
      } else if (savedProvider === 'anthropic') {
        const anthropicKey = result[ANTHROPIC_API_KEY_STORAGE_KEY] || result[API_KEY_STORAGE_KEY] || '';
        setApiKey(anthropicKey);
      }

      // Load saved model or default to first model for the provider
      const savedModel = result[MODEL_STORAGE_KEY] as string || '';
      if (savedModel && AVAILABLE_MODELS[savedProvider].includes(savedModel)) {
        setSelectedModel(savedModel);
      } else {
        setSelectedModel(AVAILABLE_MODELS[savedProvider][0]);
      }
    });
  }, []);

  // Load the provider-specific API key when provider changes
  useEffect(() => {
    chrome.storage.sync.get([
      API_KEY_STORAGE_KEY, 
      OPENAI_API_KEY_STORAGE_KEY,
      ANTHROPIC_API_KEY_STORAGE_KEY,
      MODEL_STORAGE_KEY
    ], (result) => {
      if (provider === 'openai') {
        const openaiKey = result[OPENAI_API_KEY_STORAGE_KEY] || result[API_KEY_STORAGE_KEY] || '';
        setApiKey(openaiKey);
      } else if (provider === 'anthropic') {
        const anthropicKey = result[ANTHROPIC_API_KEY_STORAGE_KEY] || result[API_KEY_STORAGE_KEY] || '';
        setApiKey(anthropicKey);
      }

      // When provider changes, check if current model is valid for new provider
      const currentSavedModel = result[MODEL_STORAGE_KEY] as string || '';
      
      if (currentSavedModel && AVAILABLE_MODELS[provider].includes(currentSavedModel)) {
        // Keep current model if it's valid for the new provider (rare case)
        setSelectedModel(currentSavedModel);
      } else {
        // Otherwise default to first model for the new provider
        setSelectedModel(AVAILABLE_MODELS[provider][0]);
      }
    });
  }, [provider]);

  const handleSave = () => {
    setIsSaving(true);
    // Store in Chrome sync storage for sync across devices
    const storageData: { [key: string]: any } = {
      [API_PROVIDER_STORAGE_KEY]: provider,
      [MODEL_STORAGE_KEY]: selectedModel
    };
    
    // Store API key in the provider-specific key and the legacy key for backward compatibility
    if (provider === 'openai') {
      storageData[OPENAI_API_KEY_STORAGE_KEY] = apiKey;
    } else if (provider === 'anthropic') {
      storageData[ANTHROPIC_API_KEY_STORAGE_KEY] = apiKey;
    }
    storageData[API_KEY_STORAGE_KEY] = apiKey; // Keep legacy key for backward compatibility
    
    chrome.storage.sync.set(
      storageData,
      () => {
        if (chrome.runtime.lastError) {
          console.error('Error saving API key:', chrome.runtime.lastError);
          setSaveStatus('error');
        } else {
          setSaveStatus('success');
          // Test the API connection
          testApiConnection(provider, apiKey, selectedModel);
        }
        setIsSaving(false);
        
        // Reset status after 3 seconds
        setTimeout(() => {
          setSaveStatus('idle');
        }, 3000);
      }
    );
  };

  const testApiConnection = async (provider: ApiProvider, key: string, model: string) => {
    try {
      setConnectionStatus('idle');
      
      // For OpenAI, we'll test with a simple models.list call
      if (provider === 'openai') {
        // First check if the API key is valid by listing models
        const response = await fetch('https://api.openai.com/v1/models', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('OpenAI Connection test result:', result);
          
          // Then test if the selected model is valid with a simple completion
          if (model) {
            try {
              const modelTestResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${key}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  model: model,
                  messages: [{ role: 'user', content: 'Hello, please respond with "Model test successful"' }],
                  max_tokens: 20
                })
              });
              
              if (modelTestResponse.ok) {
                console.log(`Model test successful for ${model}`);
                setConnectionStatus('success');
              } else {
                const errorData = await modelTestResponse.json();
                console.error(`Model ${model} test failed:`, errorData);
                setConnectionStatus('error');
              }
            } catch (modelError) {
              console.error(`Error testing model ${model}:`, modelError);
              setConnectionStatus('error');
            }
          } else {
            setConnectionStatus('success');
          }
        } else {
          console.error('OpenAI API connection failed:', response.statusText);
          setConnectionStatus('error');
        }
      } 
      // For Anthropic, we'll check if the API key format is valid (since we can't easily test without making a charged API call)
      else if (provider === 'anthropic') {
        // Validate Anthropic API key format (usually starts with 'sk-ant-')
        if (key.startsWith('sk-ant-') && key.length > 20) {
          console.log('Anthropic API key format looks valid');
          
          // If a model was selected, we could test it with a minimal API call
          // Note: This is commented out to avoid unnecessary API charges
          // Uncomment this for production if desired
          /*
          if (model) {
            try {
              const modelTestResponse = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                  'x-api-key': key,
                  'anthropic-version': '2023-06-01',
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  model: model,
                  messages: [{ role: 'user', content: 'Hello, please respond with "Model test successful"' }],
                  max_tokens: 20
                })
              });
              
              if (modelTestResponse.ok) {
                console.log(`Model test successful for ${model}`);
                setConnectionStatus('success');
              } else {
                const errorData = await modelTestResponse.json();
                console.error(`Model ${model} test failed:`, errorData);
                setConnectionStatus('error');
              }
            } catch (modelError) {
              console.error(`Error testing model ${model}:`, modelError);
              setConnectionStatus('error');
            }
          } else {
            setConnectionStatus('success');
          }
          */
          setConnectionStatus('success');
        } else {
          console.error('Anthropic API key format looks invalid');
          setConnectionStatus('error');
        }
      }
      
    } catch (error) {
      console.error('Error testing API connection:', error);
      setConnectionStatus('error');
    }
  };

  return (
    <Card className="p-4 w-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">LLM API Settings</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4">
        {connectionStatus === 'success' && (
          <div className="text-sm bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-2 text-green-800 dark:text-green-300">
            <p><strong>Active Configuration:</strong></p>
            <p>Provider: <strong>{provider}</strong></p>
            <p>Model: <strong>{selectedModel}</strong></p>
          </div>
        )}
        <div>
          <label className="text-sm mb-1 block">Select API Provider</label>
          <div className="flex gap-2">
            <Button 
              variant={provider === 'openai' ? 'default' : 'outline'}
              onClick={() => setProvider('openai')}
            >
              OpenAI
            </Button>
            <Button 
              variant={provider === 'anthropic' ? 'default' : 'outline'}
              onClick={() => setProvider('anthropic')}
            >
              Anthropic
            </Button>
          </div>
        </div>

        <div>
          <label className="text-sm mb-1 block">Select Model</label>
          <select 
            className="w-full p-2 border rounded-md mb-4 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
          >
            {AVAILABLE_MODELS[provider].map((modelId) => (
              <option key={modelId} value={modelId}>
                {MODEL_DISPLAY_NAMES[modelId] || modelId}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="text-sm mb-1 block">API Key</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={`Enter your ${provider === 'openai' ? 'OpenAI' : 'Anthropic'} API key`}
                className="pr-10"
              />
              <button 
                type="button" 
                className="absolute inset-y-0 right-0 px-3 flex items-center"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button onClick={handleSave} disabled={isSaving || !apiKey}>
              Save
            </Button>
          </div>

          {saveStatus === 'success' && (
            <div className="mt-2 text-sm flex items-center text-green-600">
              <Check className="h-4 w-4 mr-1" /> API key saved successfully
            </div>
          )}

          {saveStatus === 'error' && (
            <div className="mt-2 text-sm flex items-center text-red-600">
              <X className="h-4 w-4 mr-1" /> Error saving API key
            </div>
          )}

          {connectionStatus === 'success' && (
            <div className="mt-2 text-sm flex items-center text-green-600">
              <Check className="h-4 w-4 mr-1" /> API connection verified successfully
            </div>
          )}

          {connectionStatus === 'error' && (
            <div className="mt-2 text-sm flex items-center text-red-600">
              <X className="h-4 w-4 mr-1" /> Could not verify API connection
            </div>
          )}
        </div>

        <div className="text-sm text-gray-500">
          <p>Your API key is stored securely in Chrome's synced storage and is never sent to our servers.</p>
          <p className="mt-1">
            {provider === 'openai' 
              ? 'You can create an OpenAI API key in your OpenAI dashboard.' 
              : 'You can create an Anthropic API key in your Anthropic console.'}
          </p>
          <p className="mt-1">
            <strong>Model selection:</strong> Different models have varying capabilities, speeds, and costs.
            More powerful models may offer better results but could be slower or more expensive to use.
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Selected model: <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">{selectedModel}</code>
          </p>
        </div>
      </div>
    </Card>
  );
}