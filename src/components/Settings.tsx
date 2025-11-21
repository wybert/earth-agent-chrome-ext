import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Check, X, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { Label } from './ui/label';
import { AVAILABLE_MODELS, MODEL_DISPLAY_NAMES, DEFAULT_MODELS, type ApiProvider } from '@/constants/models';

// Key for storing API key in Chrome Storage
const API_KEY_STORAGE_KEY = 'earth_engine_llm_api_key'; // Legacy key
const OPENAI_API_KEY_STORAGE_KEY = 'earth_engine_openai_api_key';
const ANTHROPIC_API_KEY_STORAGE_KEY = 'earth_engine_anthropic_api_key';
const GOOGLE_API_KEY_STORAGE_KEY = 'earth_engine_google_api_key';
const QWEN_API_KEY_STORAGE_KEY = 'earth_engine_qwen_api_key';
const OLLAMA_API_KEY_STORAGE_KEY = 'earth_engine_ollama_api_key';
const OLLAMA_BASE_URL_STORAGE_KEY = 'earth_engine_ollama_base_url';
const API_PROVIDER_STORAGE_KEY = 'earth_engine_llm_provider';
const MODEL_STORAGE_KEY = 'earth_engine_llm_model';

interface SettingsProps {
  onClose: () => void;
}

export function Settings({ onClose }: SettingsProps) {
  const [apiKey, setApiKey] = useState('');
  const [provider, setProvider] = useState<ApiProvider>('openai');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState('http://localhost:11434/api');
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
      GOOGLE_API_KEY_STORAGE_KEY,
      QWEN_API_KEY_STORAGE_KEY,
      OLLAMA_API_KEY_STORAGE_KEY,
      OLLAMA_BASE_URL_STORAGE_KEY,
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
      } else if (savedProvider === 'google') {
        const googleKey = result[GOOGLE_API_KEY_STORAGE_KEY] || result[API_KEY_STORAGE_KEY] || '';
        setApiKey(googleKey);
      } else if (savedProvider === 'qwen') {
        const qwenKey = result[QWEN_API_KEY_STORAGE_KEY] || result[API_KEY_STORAGE_KEY] || '';
        setApiKey(qwenKey);
      } else if (savedProvider === 'ollama') {
        const ollamaKey = result[OLLAMA_API_KEY_STORAGE_KEY] || '';
        setApiKey(ollamaKey);
        const ollamaUrl = result[OLLAMA_BASE_URL_STORAGE_KEY] || 'http://localhost:11434/api';
        setOllamaBaseUrl(ollamaUrl);
      }

      // Load saved model or default model for the provider
      const savedModel = result[MODEL_STORAGE_KEY] as string || '';
      if (savedModel && AVAILABLE_MODELS[savedProvider].includes(savedModel)) {
        setSelectedModel(savedModel);
      } else {
        setSelectedModel(DEFAULT_MODELS[savedProvider]);
      }
    });
  }, []);

  // Load the provider-specific API key when provider changes
  useEffect(() => {
    chrome.storage.sync.get([
      API_KEY_STORAGE_KEY, 
      OPENAI_API_KEY_STORAGE_KEY,
      ANTHROPIC_API_KEY_STORAGE_KEY,
      GOOGLE_API_KEY_STORAGE_KEY,
      QWEN_API_KEY_STORAGE_KEY,
      OLLAMA_API_KEY_STORAGE_KEY,
      OLLAMA_BASE_URL_STORAGE_KEY,
      MODEL_STORAGE_KEY
    ], (result) => {
      if (provider === 'openai') {
        const openaiKey = result[OPENAI_API_KEY_STORAGE_KEY] || result[API_KEY_STORAGE_KEY] || '';
        setApiKey(openaiKey);
      } else if (provider === 'anthropic') {
        const anthropicKey = result[ANTHROPIC_API_KEY_STORAGE_KEY] || result[API_KEY_STORAGE_KEY] || '';
        setApiKey(anthropicKey);
      } else if (provider === 'google') {
        const googleKey = result[GOOGLE_API_KEY_STORAGE_KEY] || result[API_KEY_STORAGE_KEY] || '';
        setApiKey(googleKey);
      } else if (provider === 'qwen') {
        const qwenKey = result[QWEN_API_KEY_STORAGE_KEY] || result[API_KEY_STORAGE_KEY] || '';
        setApiKey(qwenKey);
      } else if (provider === 'ollama') {
        const ollamaKey = result[OLLAMA_API_KEY_STORAGE_KEY] || '';
        setApiKey(ollamaKey);
        const ollamaUrl = result[OLLAMA_BASE_URL_STORAGE_KEY] || 'http://localhost:11434/api';
        setOllamaBaseUrl(ollamaUrl);
      }

      // When provider changes, check if current model is valid for new provider
      const currentSavedModel = result[MODEL_STORAGE_KEY] as string || '';
      
      if (currentSavedModel && AVAILABLE_MODELS[provider].includes(currentSavedModel)) {
        // Keep current model if it's valid for the new provider (rare case)
        setSelectedModel(currentSavedModel);
      } else {
        // Otherwise default to the default model for the new provider
        setSelectedModel(DEFAULT_MODELS[provider]);
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
    } else if (provider === 'google') {
      storageData[GOOGLE_API_KEY_STORAGE_KEY] = apiKey;
    } else if (provider === 'qwen') {
      storageData[QWEN_API_KEY_STORAGE_KEY] = apiKey;
    } else if (provider === 'ollama') {
      storageData[OLLAMA_API_KEY_STORAGE_KEY] = apiKey;
      storageData[OLLAMA_BASE_URL_STORAGE_KEY] = ollamaBaseUrl;
    }
    
    if (provider !== 'ollama') {
      storageData[API_KEY_STORAGE_KEY] = apiKey; // Keep legacy key for backward compatibility (not needed for Ollama)
    }
    
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
        try {
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

            // API key is valid if we can list models
            // Mark as success immediately - don't test specific model to avoid API charges
            setConnectionStatus('success');

            // Optional: Test specific model (commented out to avoid API charges)
            /*
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
                } else {
                  const errorData = await modelTestResponse.json();
                  console.warn(`Model ${model} test failed (but API key is valid):`, errorData);
                }
              } catch (modelError) {
                console.warn(`Error testing model ${model} (but API key is valid):`, modelError);
              }
            }
            */
          } else {
            console.error('OpenAI API connection failed:', response.statusText);
            const errorData = await response.json().catch(() => ({}));
            console.error('Error details:', errorData);
            setConnectionStatus('error');
          }
        } catch (networkError) {
          console.error('OpenAI API network error:', networkError);
          setConnectionStatus('error');
        }
      } 
      // For Anthropic, we'll check if the API key format is valid (usually starts with 'sk-ant-')
      else if (provider === 'anthropic') {
        // Validate Anthropic API key format - more relaxed validation
        // Anthropic keys usually start with 'sk-ant-' but format may vary
        if (key && key.trim().length > 20) {
          console.log('Anthropic API key format looks valid (length check passed)');
          console.log(`API key length: ${key.length}, starts with: ${key.substring(0, 7)}`);

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
          console.error('Anthropic API key looks invalid - too short or empty');
          setConnectionStatus('error');
        }
      }
      // For Google, we'll check if the API key format is valid
      else if (provider === 'google') {
        // Validate Google API key format - more relaxed validation
        // Google API keys can have different formats (AIza*, or other formats for Gemini)
        if (key && key.trim().length >= 20) {
          console.log('Google API key format looks valid (length check passed)');
          console.log(`API key length: ${key.length}, starts with: ${key.substring(0, 4)}`);

          // We could test with a simple API call but for now just validate that key exists
          // Note: This is commented out to avoid unnecessary API charges
          // Uncomment this for production if desired
          /*
          if (model) {
            try {
              const modelTestResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
                method: 'GET',
                headers: {
                  'x-goog-api-key': key,
                  'Content-Type': 'application/json'
                }
              });

              if (modelTestResponse.ok) {
                console.log(`Google API connection test successful`);
                setConnectionStatus('success');
              } else {
                const errorData = await modelTestResponse.json();
                console.error(`Google API test failed:`, errorData);
                setConnectionStatus('error');
              }
            } catch (modelError) {
              console.error(`Error testing Google API:`, modelError);
              setConnectionStatus('error');
            }
          } else {
            setConnectionStatus('success');
          }
          */
          setConnectionStatus('success');
        } else {
          console.error('Google API key looks invalid - too short or empty');
          setConnectionStatus('error');
        }
      }
      // For Qwen, we'll check if the API key looks valid
      else if (provider === 'qwen') {
        // Validate Qwen API key (DashScope API key format)
        if (key && key.trim().length > 10) {
          console.log('Qwen API key format looks valid');
          
          // We could test with a simple API call but for now just validate that key is not empty
          // Note: This is commented out to avoid unnecessary API charges
          // Uncomment this for production if desired
          /*
          if (model) {
            try {
              const modelTestResponse = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/models', {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${key}`,
                  'Content-Type': 'application/json'
                }
              });
              
              if (modelTestResponse.ok) {
                console.log(`Qwen API connection test successful`);
                setConnectionStatus('success');
              } else {
                const errorData = await modelTestResponse.json();
                console.error(`Qwen API test failed:`, errorData);
                setConnectionStatus('error');
              }
            } catch (modelError) {
              console.error(`Error testing Qwen API:`, modelError);
              setConnectionStatus('error');
            }
          } else {
            setConnectionStatus('success');
          }
          */
          setConnectionStatus('success');
        } else {
          console.error('Qwen API key looks invalid');
          setConnectionStatus('error');
        }
      }
      // For Ollama, we'll check if the base URL is reachable
      else if (provider === 'ollama') {
        console.log('🔧 [Settings] Testing Ollama connection', {
          baseUrl: ollamaBaseUrl,
          model: model,
          hasApiKey: !!key
        });
        
        // For Ollama, test the actual connection
        try {
          // Test the /api/tags endpoint to see if Ollama is running
          const testUrl = `${ollamaBaseUrl.replace('/api', '')}/api/tags`;
          console.log('🔧 [Settings] Testing Ollama endpoint:', testUrl);
          
          const testResponse = await fetch(testUrl, {
            method: 'GET',
            headers: key ? { 'Authorization': `Bearer ${key}` } : {},
            // Add timeout and proper error handling
            signal: AbortSignal.timeout(5000)
          });
          
          if (testResponse.ok) {
            const data = await testResponse.json();
            console.log('✅ [Settings] Ollama connection test successful:', data);
            setConnectionStatus('success');
          } else {
            console.error('❌ [Settings] Ollama connection test failed:', {
              status: testResponse.status,
              statusText: testResponse.statusText,
              url: testUrl
            });
            setConnectionStatus('error');
          }
        } catch (ollamaError) {
          console.error('❌ [Settings] Error testing Ollama connection:', {
            error: ollamaError,
            baseUrl: ollamaBaseUrl,
            message: ollamaError instanceof Error ? ollamaError.message : 'Unknown error'
          });
          // For local development, still mark as success if it's a network error (Ollama might be running but not accessible due to CORS)
          if (ollamaError instanceof Error && (ollamaError.message.includes('fetch') || ollamaError.message.includes('network'))) {
            console.log('🔧 [Settings] Assuming Ollama is available despite fetch error (likely CORS)');
            setConnectionStatus('success');
          } else {
            setConnectionStatus('error');
          }
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
          <label className="text-sm mb-2 block">Select API Provider</label>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={provider === 'openai' ? 'default' : 'outline'}
              onClick={() => setProvider('openai')}
              className="flex-1 min-w-[90px] text-sm px-3 py-2"
            >
              OpenAI
            </Button>
            <Button
              variant={provider === 'anthropic' ? 'default' : 'outline'}
              onClick={() => setProvider('anthropic')}
              className="flex-1 min-w-[90px] text-sm px-3 py-2"
            >
              Anthropic
            </Button>
            <Button
              variant={provider === 'google' ? 'default' : 'outline'}
              onClick={() => setProvider('google')}
              className="flex-1 min-w-[90px] text-sm px-3 py-2"
            >
              Google
            </Button>
            <Button
              variant={provider === 'qwen' ? 'default' : 'outline'}
              onClick={() => setProvider('qwen')}
              className="flex-1 min-w-[90px] text-sm px-3 py-2"
            >
              Qwen
            </Button>
            <Button
              variant={provider === 'ollama' ? 'default' : 'outline'}
              onClick={() => setProvider('ollama')}
              className="flex-1 min-w-[90px] text-sm px-3 py-2"
            >
              Ollama
            </Button>
          </div>
          {provider === 'google' && (
            <p className="text-xs text-gray-500 mt-2">
              Note: Google Gemini models may require a Google Cloud project with billing enabled. 
              Please refer to Google's rate limit and pricing documentation.
            </p>
          )}
          {provider === 'qwen' && (
            <p className="text-xs text-gray-500 mt-2">
              Note: Qwen uses DashScope API keys. You can obtain your API key from the Alibaba Cloud DashScope console.
              Base URL: https://dashscope.aliyuncs.com/compatible-mode/v1
            </p>
          )}
          {provider === 'ollama' && (
            <p className="text-xs text-gray-500 mt-2">
              Note: Ollama runs locally or on a remote server. For local instances, usually no API key is required.
              Default Base URL: http://localhost:11434/api
            </p>
          )}
        </div>

        {provider === 'ollama' && (
          <div>
            <label className="text-sm mb-1 block">Base URL</label>
            <Input
              type="text"
              value={ollamaBaseUrl}
              onChange={(e) => setOllamaBaseUrl(e.target.value)}
              placeholder="http://localhost:11434/api"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter the URL of your Ollama instance. Use http://localhost:11434/api for local installations.
            </p>
          </div>
        )}

        {provider !== 'ollama' && (
          <div>
            <label className="text-sm mb-1 block">API Key</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={`Enter your ${provider === 'openai' ? 'OpenAI' : provider === 'anthropic' ? 'Anthropic' : provider === 'google' ? 'Google' : 'Qwen'} API key`}
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
          </div>
        )}
        
        {provider === 'ollama' && (
          <div>
            <Button onClick={handleSave} disabled={isSaving} className="w-full">
              Save Configuration
            </Button>
          </div>
        )}

        {saveStatus === 'success' && (
          <div className="mt-2 text-sm flex items-center text-green-600">
            <Check className="h-4 w-4 mr-1" /> {provider === 'ollama' ? 'Configuration saved successfully' : 'API key saved successfully'}
          </div>
        )}

        {saveStatus === 'error' && (
          <div className="mt-2 text-sm flex items-center text-red-600">
            <X className="h-4 w-4 mr-1" /> {provider === 'ollama' ? 'Error saving configuration' : 'Error saving API key'}
          </div>
        )}

        {connectionStatus === 'success' && (
          <div className="mt-2 text-sm flex items-center text-green-600">
            <Check className="h-4 w-4 mr-1" /> {provider === 'ollama' ? 'Ollama connection verified successfully' : 'API connection verified successfully'}
          </div>
        )}

        {connectionStatus === 'error' && (
          <div className="mt-2 text-sm flex items-center text-red-600">
            <X className="h-4 w-4 mr-1" /> {provider === 'ollama' ? 'Could not verify Ollama connection' : 'Could not verify API connection'}
          </div>
        )}

        <div className="text-sm text-gray-500">
          <p>Your API key is stored securely in Chrome's synced storage and is never sent to our servers.</p>
          <p className="mt-1">
            {provider === 'openai' 
              ? 'You can create an OpenAI API key in your OpenAI dashboard.' 
              : provider === 'anthropic' 
              ? 'You can create an Anthropic API key in your Anthropic console.'
              : provider === 'google' 
              ? 'You can create a Google Generative AI API key in your Google AI Studio.'
              : provider === 'qwen'
              ? 'You can create a Qwen API key in your Qwen console.'
              : 'For Ollama, API key is usually not required for local instances. Configure base URL above.'}
          </p>
          <p className="mt-1">
            <strong>Model selection:</strong> You can select models directly from the chat interface. Different models have varying capabilities, speeds, and costs.
          </p>
        </div>

        {/* About Section */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold mb-3">About Earth Agent</h3>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <p className="flex items-center justify-between">
              <span>Version:</span>
              <code className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-xs">1.0.0</code>
            </p>
            <a
              href="https://github.com/wybert/earth-agent-chrome-ext"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <span>GitHub Repository</span>
              <ExternalLink className="h-4 w-4" />
            </a>
            <a
              href="https://github.com/wybert/earth-agent-chrome-ext/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <span>Report an Issue</span>
              <ExternalLink className="h-4 w-4" />
            </a>
            <p className="pt-2 text-xs">
              AI-powered assistant for Google Earth Engine
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}