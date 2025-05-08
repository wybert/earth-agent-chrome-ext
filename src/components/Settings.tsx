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
const DEFAULT_MODEL_STORAGE_KEY = 'earth_engine_llm_model';

// Default models for each provider
const OPENAI_MODELS = [
  'gpt-4o',
  'gpt-4-turbo',
  'gpt-4',
  'gpt-3.5-turbo'
];

const ANTHROPIC_MODELS = [
  'claude-3-7-sonnet-20250219',  // Latest flagship model
  'claude-3-5-sonnet-20241022',  // v2 Sonnet model
  'claude-3-5-haiku-20241022'    // Latest Haiku model
];

type ApiProvider = 'openai' | 'anthropic';

interface SettingsProps {
  onClose: () => void;
}

export function Settings({ onClose }: SettingsProps) {
  const [apiKey, setApiKey] = useState('');
  const [provider, setProvider] = useState<ApiProvider>('openai');
  const [model, setModel] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Load saved settings on component mount
  useEffect(() => {
    chrome.storage.sync.get([
      API_KEY_STORAGE_KEY, 
      OPENAI_API_KEY_STORAGE_KEY,
      ANTHROPIC_API_KEY_STORAGE_KEY,
      API_PROVIDER_STORAGE_KEY,
      DEFAULT_MODEL_STORAGE_KEY
    ], (result) => {
      const savedProvider = result[API_PROVIDER_STORAGE_KEY] as ApiProvider || 'openai';
      setProvider(savedProvider);
      
      // Set default model based on provider
      const savedModel = result[DEFAULT_MODEL_STORAGE_KEY];
      if (savedModel) {
        setModel(savedModel);
      } else {
        // Set default model based on provider if none is saved
        setModel(savedProvider === 'openai' ? OPENAI_MODELS[0] : ANTHROPIC_MODELS[0]);
      }
      
      // Load the appropriate API key based on provider
      if (savedProvider === 'openai') {
        const openaiKey = result[OPENAI_API_KEY_STORAGE_KEY] || result[API_KEY_STORAGE_KEY] || '';
        setApiKey(openaiKey);
      } else if (savedProvider === 'anthropic') {
        const anthropicKey = result[ANTHROPIC_API_KEY_STORAGE_KEY] || result[API_KEY_STORAGE_KEY] || '';
        setApiKey(anthropicKey);
      }
    });
  }, []);

  // Load the provider-specific API key when provider changes
  useEffect(() => {
    chrome.storage.sync.get([
      API_KEY_STORAGE_KEY, 
      OPENAI_API_KEY_STORAGE_KEY,
      ANTHROPIC_API_KEY_STORAGE_KEY
    ], (result) => {
      if (provider === 'openai') {
        const openaiKey = result[OPENAI_API_KEY_STORAGE_KEY] || result[API_KEY_STORAGE_KEY] || '';
        setApiKey(openaiKey);
        
        // If current model is an Anthropic model, switch to default OpenAI model
        if (model.includes('claude')) {
          setModel(OPENAI_MODELS[0]);
        }
      } else if (provider === 'anthropic') {
        const anthropicKey = result[ANTHROPIC_API_KEY_STORAGE_KEY] || result[API_KEY_STORAGE_KEY] || '';
        setApiKey(anthropicKey);
        
        // If current model is not a Claude model, switch to default Anthropic model
        if (!model.includes('claude')) {
          setModel(ANTHROPIC_MODELS[0]);
        }
      }
    });
  }, [provider]);

  const handleSave = () => {
    setIsSaving(true);
    // Store in Chrome sync storage for sync across devices
    const storageData: { [key: string]: any } = {
      [API_PROVIDER_STORAGE_KEY]: provider,
      [DEFAULT_MODEL_STORAGE_KEY]: model
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
          console.error('Error saving settings:', chrome.runtime.lastError);
          setSaveStatus('error');
        } else {
          setSaveStatus('success');
          // Test the API connection
          testApiConnection(provider, apiKey);
        }
        setIsSaving(false);
        
        // Reset status after 3 seconds
        setTimeout(() => {
          setSaveStatus('idle');
        }, 3000);
      }
    );
  };

  const testApiConnection = async (provider: ApiProvider, key: string) => {
    try {
      setConnectionStatus('idle');
      
      // For basic validation of key format
      if (provider === 'anthropic' && !key.startsWith('sk-ant-')) {
        console.error('Anthropic API key has invalid format (should start with sk-ant-)');
        setConnectionStatus('error');
        return;
      } else if (provider === 'openai' && !key.startsWith('sk-')) {
        console.error('OpenAI API key has invalid format (should start with sk-)');
        setConnectionStatus('error');
        return;
      }
      
      console.log(`Testing ${provider} API connection through background script...`);
      
      // Create a connection to the background script
      const port = chrome.runtime.connect({ name: 'sidepanel' });
      
      // Set up a promise to handle the response
      const responsePromise = new Promise<boolean>((resolve, reject) => {
        // Set a timeout
        const timeoutId = setTimeout(() => {
          reject(new Error('API test connection timed out after 10 seconds'));
        }, 10000);
        
        // Listen for the response
        port.onMessage.addListener(function listener(response) {
          if (response.type === 'TEST_API_RESPONSE') {
            clearTimeout(timeoutId);
            port.onMessage.removeListener(listener);
            console.log('Received API test response:', response);
            resolve(response.success);
          }
        });
      });
      
      // Send the request to the background script
      port.postMessage({ 
        type: 'TEST_API',
        provider,
        apiKey: key
      });
      
      try {
        const success = await responsePromise;
        setConnectionStatus(success ? 'success' : 'error');
      } catch (err) {
        console.error('Error during API connection test:', err);
        setConnectionStatus('error');
      }
      
    } catch (error) {
      console.error('Error setting up API connection test:', error);
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
          <div className="grid grid-cols-2 gap-2">
            {(provider === 'openai' ? OPENAI_MODELS : ANTHROPIC_MODELS).map((modelOption) => (
              <Button 
                key={modelOption}
                variant={model === modelOption ? 'default' : 'outline'}
                onClick={() => setModel(modelOption)}
                className="text-xs"
                size="sm"
              >
                {modelOption}
              </Button>
            ))}
          </div>
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
              <Check className="h-4 w-4 mr-1" /> Settings saved successfully
            </div>
          )}

          {saveStatus === 'error' && (
            <div className="mt-2 text-sm flex items-center text-red-600">
              <X className="h-4 w-4 mr-1" /> Error saving settings
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
            <strong>Important:</strong> Make sure to use {provider === 'openai' ? 'OpenAI' : 'Anthropic'} models with the {provider === 'openai' ? 'OpenAI' : 'Anthropic'} provider.
          </p>
        </div>
      </div>
    </Card>
  );
}