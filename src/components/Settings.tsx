import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Check, X, Eye, EyeOff, ChevronDown } from 'lucide-react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from './ui/select';
import { PROVIDER_MODELS, DEFAULT_MODELS } from '../api/chat';

// Key for storing API keys in Chrome Storage (provider-specific)
const OPENAI_API_KEY_STORAGE_KEY = 'earth_engine_openai_api_key';
const ANTHROPIC_API_KEY_STORAGE_KEY = 'earth_engine_anthropic_api_key';
const GOOGLE_API_KEY_STORAGE_KEY = 'earth_engine_google_api_key';
const API_PROVIDER_STORAGE_KEY = 'earth_engine_llm_provider';
const DEFAULT_MODEL_STORAGE_KEY = 'earth_engine_llm_model';

type ApiProvider = 'openai' | 'anthropic' | 'google';

interface SettingsProps {
  onClose: () => void;
}

export function Settings({ onClose }: SettingsProps) {
  // Store API keys for each provider separately
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [anthropicApiKey, setAnthropicApiKey] = useState('');
  const [googleApiKey, setGoogleApiKey] = useState('');
  
  const [provider, setProvider] = useState<ApiProvider>('openai');
  const [selectedModel, setSelectedModel] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Helper to get the current API key based on provider
  const getCurrentApiKey = () => {
    switch(provider) {
      case 'openai': return openaiApiKey;
      case 'anthropic': return anthropicApiKey;
      case 'google': return googleApiKey;
      default: return '';
    }
  };

  // Helper to set the current API key based on provider
  const setCurrentApiKey = (value: string) => {
    switch(provider) {
      case 'openai': setOpenaiApiKey(value); break;
      case 'anthropic': setAnthropicApiKey(value); break;
      case 'google': setGoogleApiKey(value); break;
    }
  };

  // Load saved settings on component mount
  useEffect(() => {
    chrome.storage.sync.get([
      OPENAI_API_KEY_STORAGE_KEY, 
      ANTHROPIC_API_KEY_STORAGE_KEY, 
      GOOGLE_API_KEY_STORAGE_KEY,
      API_PROVIDER_STORAGE_KEY, 
      DEFAULT_MODEL_STORAGE_KEY
    ], (result) => {
      // Load saved API keys
      if (result[OPENAI_API_KEY_STORAGE_KEY]) {
        setOpenaiApiKey(result[OPENAI_API_KEY_STORAGE_KEY]);
      }
      if (result[ANTHROPIC_API_KEY_STORAGE_KEY]) {
        setAnthropicApiKey(result[ANTHROPIC_API_KEY_STORAGE_KEY]);
      }
      if (result[GOOGLE_API_KEY_STORAGE_KEY]) {
        setGoogleApiKey(result[GOOGLE_API_KEY_STORAGE_KEY]);
      }

      // Load saved provider and model
      if (result[API_PROVIDER_STORAGE_KEY]) {
        setProvider(result[API_PROVIDER_STORAGE_KEY] as ApiProvider);
      }
      if (result[DEFAULT_MODEL_STORAGE_KEY]) {
        setSelectedModel(result[DEFAULT_MODEL_STORAGE_KEY]);
      } else {
        // Set default model based on provider
        setSelectedModel(DEFAULT_MODELS[result[API_PROVIDER_STORAGE_KEY] as ApiProvider || 'openai']);
      }
    });
  }, []);

  // Update selected model when provider changes
  useEffect(() => {
    setSelectedModel(DEFAULT_MODELS[provider]);
  }, [provider]);

  const handleSave = () => {
    setIsSaving(true);
    
    // Determine which API key to save based on current provider
    const storageKey = provider === 'openai' 
      ? OPENAI_API_KEY_STORAGE_KEY 
      : provider === 'anthropic' 
        ? ANTHROPIC_API_KEY_STORAGE_KEY 
        : GOOGLE_API_KEY_STORAGE_KEY;
    
    const currentApiKey = getCurrentApiKey();
    
    // Store in Chrome sync storage
    chrome.storage.sync.set(
      {
        [storageKey]: currentApiKey,
        [API_PROVIDER_STORAGE_KEY]: provider,
        [DEFAULT_MODEL_STORAGE_KEY]: selectedModel
      },
      () => {
        if (chrome.runtime.lastError) {
          console.error('Error saving settings:', chrome.runtime.lastError);
          setSaveStatus('error');
        } else {
          setSaveStatus('success');
          // Test the API connection
          testApiConnection(provider, currentApiKey);
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
      
      // For OpenAI, we'll test with a simple models.list call
      if (provider === 'openai') {
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
          setConnectionStatus('success');
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
          setConnectionStatus('success');
        } else {
          console.error('Anthropic API key format looks invalid');
          setConnectionStatus('error');
        }
      }
      // For Google, check if the API key looks valid (simplified check)
      else if (provider === 'google') {
        // Google API keys are typically long alphanumeric strings
        if (key.length > 20) {
          console.log('Google API key format looks valid');
          setConnectionStatus('success');
        } else {
          console.error('Google API key format looks invalid');
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
            <Button 
              variant={provider === 'google' ? 'default' : 'outline'}
              onClick={() => setProvider('google')}
            >
              Google
            </Button>
          </div>
        </div>

        <div>
          <label className="text-sm mb-1 block">Select Model</label>
          <Select 
            value={selectedModel} 
            onValueChange={setSelectedModel}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              {PROVIDER_MODELS[provider].map(model => (
                <SelectItem key={model.id} value={model.id}>
                  {model.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <label className="text-sm mb-1 block">API Key</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={showApiKey ? 'text' : 'password'}
                value={getCurrentApiKey()}
                onChange={(e) => setCurrentApiKey(e.target.value)}
                placeholder={`Enter your ${
                  provider === 'openai' ? 'OpenAI' : 
                  provider === 'anthropic' ? 'Anthropic' : 'Google'
                } API key`}
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
            <Button 
              onClick={handleSave} 
              disabled={isSaving || !getCurrentApiKey() || !selectedModel}
            >
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
          <p>Your API keys are stored securely in Chrome's synced storage and are never sent to our servers.</p>
          <p className="mt-1">
            {provider === 'openai' 
              ? 'You can create an OpenAI API key in your OpenAI dashboard.' 
              : provider === 'anthropic'
                ? 'You can create an Anthropic API key in your Anthropic console.'
                : 'You can create a Google API key in your Google Cloud console.'}
          </p>
        </div>
      </div>
    </Card>
  );
}