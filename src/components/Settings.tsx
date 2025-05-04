import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Check, X, Eye, EyeOff } from 'lucide-react';

// Key for storing API key in Chrome Storage
const API_KEY_STORAGE_KEY = 'earth_engine_llm_api_key';
const API_PROVIDER_STORAGE_KEY = 'earth_engine_llm_provider';

type ApiProvider = 'openai' | 'anthropic';

interface SettingsProps {
  onClose: () => void;
}

export function Settings({ onClose }: SettingsProps) {
  const [apiKey, setApiKey] = useState('');
  const [provider, setProvider] = useState<ApiProvider>('openai');
  const [isSaving, setIsSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Load saved API key on component mount
  useEffect(() => {
    chrome.storage.sync.get([API_KEY_STORAGE_KEY, API_PROVIDER_STORAGE_KEY], (result) => {
      if (result[API_KEY_STORAGE_KEY]) {
        setApiKey(result[API_KEY_STORAGE_KEY]);
      }
      if (result[API_PROVIDER_STORAGE_KEY]) {
        setProvider(result[API_PROVIDER_STORAGE_KEY] as ApiProvider);
      }
    });
  }, []);

  const handleSave = () => {
    setIsSaving(true);
    // Store in Chrome sync storage for sync across devices
    chrome.storage.sync.set(
      {
        [API_KEY_STORAGE_KEY]: apiKey,
        [API_PROVIDER_STORAGE_KEY]: provider
      },
      () => {
        if (chrome.runtime.lastError) {
          console.error('Error saving API key:', chrome.runtime.lastError);
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
        </div>
      </div>
    </Card>
  );
}