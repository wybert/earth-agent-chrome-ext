import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Check, X, Eye, EyeOff, ExternalLink, Shield } from 'lucide-react';
import { type ApiProvider } from '@/constants/models';
import { OpenAICompatibleSection } from './OpenAICompatibleSection';

// Storage keys
const API_KEY_STORAGE_KEY = 'earth_engine_llm_api_key'; // Legacy key
const OPENAI_API_KEY_STORAGE_KEY = 'earth_engine_openai_api_key';
const ANTHROPIC_API_KEY_STORAGE_KEY = 'earth_engine_anthropic_api_key';
const GOOGLE_API_KEY_STORAGE_KEY = 'earth_engine_google_api_key';
const QWEN_API_KEY_STORAGE_KEY = 'earth_engine_qwen_api_key';
const OLLAMA_BASE_URL_STORAGE_KEY = 'earth_engine_ollama_base_url';
const PROJECT_NAME_STORAGE_KEY = 'earth_engine_project_name';
const PROJECT_CONTEXT_STORAGE_KEY = 'earth_engine_project_context';

interface SettingsProps {
  onClose: () => void;
}

export function Settings({ onClose }: SettingsProps) {
  // API Keys state
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [anthropicApiKey, setAnthropicApiKey] = useState('');
  const [googleApiKey, setGoogleApiKey] = useState('');
  const [qwenApiKey, setQwenApiKey] = useState('');
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState('http://localhost:11434/api');

  // Show/hide API keys
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [showAnthropicKey, setShowAnthropicKey] = useState(false);
  const [showGoogleKey, setShowGoogleKey] = useState(false);
  const [showQwenKey, setShowQwenKey] = useState(false);

  // Status
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState('');

  // Project Context state
  const [projectName, setProjectName] = useState('');
  const [projectContext, setProjectContext] = useState('');
  const [contextSaveStatus, setContextSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Load all data on mount
  useEffect(() => {
    // Load API keys from sync storage
    chrome.storage.sync.get([
      API_KEY_STORAGE_KEY,
      OPENAI_API_KEY_STORAGE_KEY,
      ANTHROPIC_API_KEY_STORAGE_KEY,
      GOOGLE_API_KEY_STORAGE_KEY,
      QWEN_API_KEY_STORAGE_KEY,
      OLLAMA_BASE_URL_STORAGE_KEY
    ], (result) => {
      setOpenaiApiKey(result[OPENAI_API_KEY_STORAGE_KEY] || result[API_KEY_STORAGE_KEY] || '');
      setAnthropicApiKey(result[ANTHROPIC_API_KEY_STORAGE_KEY] || '');
      setGoogleApiKey(result[GOOGLE_API_KEY_STORAGE_KEY] || '');
      setQwenApiKey(result[QWEN_API_KEY_STORAGE_KEY] || '');
      setOllamaBaseUrl(result[OLLAMA_BASE_URL_STORAGE_KEY] || 'http://localhost:11434/api');
    });

    // Load project context from local storage
    chrome.storage.local.get([
      PROJECT_NAME_STORAGE_KEY,
      PROJECT_CONTEXT_STORAGE_KEY
    ], (result) => {
      setProjectName(result[PROJECT_NAME_STORAGE_KEY] || '');
      setProjectContext(result[PROJECT_CONTEXT_STORAGE_KEY] || '');
    });
  }, []);

  const handleSaveApiKey = (provider: ApiProvider, apiKey: string) => {
    const storageData: { [key: string]: string } = {};

    // Store API key in the provider-specific key
    if (provider === 'openai') {
      storageData[OPENAI_API_KEY_STORAGE_KEY] = apiKey;
      storageData[API_KEY_STORAGE_KEY] = apiKey; // Keep legacy key
    } else if (provider === 'anthropic') {
      storageData[ANTHROPIC_API_KEY_STORAGE_KEY] = apiKey;
    } else if (provider === 'google') {
      storageData[GOOGLE_API_KEY_STORAGE_KEY] = apiKey;
    } else if (provider === 'qwen') {
      storageData[QWEN_API_KEY_STORAGE_KEY] = apiKey;
    } else if (provider === 'ollama') {
      // Ollama doesn't use API keys, only save Base URL
      storageData[OLLAMA_BASE_URL_STORAGE_KEY] = ollamaBaseUrl;
    }

    chrome.storage.sync.set(storageData, () => {
      if (chrome.runtime.lastError) {
        console.error('Error saving API key:', chrome.runtime.lastError);
        setSaveStatus('error');
        setSaveMessage(`Failed to save ${provider} API key`);
      } else {
        setSaveStatus('success');
        setSaveMessage(`${provider} API key saved successfully`);
      }

      // Reset status after 2 seconds
      setTimeout(() => {
        setSaveStatus('idle');
        setSaveMessage('');
      }, 2000);
    });
  };

  const handleSaveContext = () => {
    // Validate character limit
    if (projectContext.length > 2000) {
      setContextSaveStatus('error');
      setTimeout(() => setContextSaveStatus('idle'), 3000);
      return;
    }

    // Save to local storage
    chrome.storage.local.set({
      [PROJECT_NAME_STORAGE_KEY]: projectName,
      [PROJECT_CONTEXT_STORAGE_KEY]: projectContext
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error saving project context:', chrome.runtime.lastError);
        setContextSaveStatus('error');
      } else {
        setContextSaveStatus('success');
      }

      // Reset status after 3 seconds
      setTimeout(() => {
        setContextSaveStatus('idle');
      }, 3000);
    });
  };

  const handleClearContext = () => {
    // Clear project context without confirmation
    setProjectName('');
    setProjectContext('');

    // Clear from storage
    chrome.storage.local.set({
      [PROJECT_NAME_STORAGE_KEY]: '',
      [PROJECT_CONTEXT_STORAGE_KEY]: ''
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error clearing project context:', chrome.runtime.lastError);
      }
    });
  };

  return (
    <Card className="p-4 w-full h-full flex flex-col overflow-hidden">
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <h2 className="text-lg font-semibold">Settings</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4 overflow-y-auto flex-1 px-1 -mx-1">
        {/* Privacy Notice */}
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-2">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">Privacy & Your Data</h3>
              <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
                By using Earth Agent, you agree to our data practices. All your data (API keys, chat history, settings) is stored locally on your device and never sent to our servers. Your messages are sent directly to your chosen AI provider.
              </p>
              <a
                href="https://github.com/wybert/earth-agent-ai-sdk/blob/main/PRIVACY_POLICY.md"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline font-medium transition-colors"
              >
                Read Privacy Policy
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>

        {/* API Keys Section */}
        <div className="pt-2">
          <h3 className="text-sm font-semibold mb-1">API Keys</h3>
          <p className="text-xs text-gray-500 mb-3">Your API keys are stored securely in Chrome's synced storage and are never sent to our servers.</p>

          <div className="space-y-4">
            {/* OpenAI */}
            <div>
              <label className="text-sm mb-1 block">OpenAI API Key</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showOpenaiKey ? 'text' : 'password'}
                    value={openaiApiKey}
                    onChange={(e) => setOpenaiApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 px-3 flex items-center"
                    onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                  >
                    {showOpenaiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button onClick={() => handleSaveApiKey('openai', openaiApiKey)} disabled={!openaiApiKey}>
                  Save
                </Button>
              </div>
            </div>

            {/* Anthropic */}
            <div>
              <label className="text-sm mb-1 block">Anthropic API Key</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showAnthropicKey ? 'text' : 'password'}
                    value={anthropicApiKey}
                    onChange={(e) => setAnthropicApiKey(e.target.value)}
                    placeholder="sk-ant-..."
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 px-3 flex items-center"
                    onClick={() => setShowAnthropicKey(!showAnthropicKey)}
                  >
                    {showAnthropicKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button onClick={() => handleSaveApiKey('anthropic', anthropicApiKey)} disabled={!anthropicApiKey}>
                  Save
                </Button>
              </div>
            </div>

            {/* Google */}
            <div>
              <label className="text-sm mb-1 block">Google API Key</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showGoogleKey ? 'text' : 'password'}
                    value={googleApiKey}
                    onChange={(e) => setGoogleApiKey(e.target.value)}
                    placeholder="AIza..."
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 px-3 flex items-center"
                    onClick={() => setShowGoogleKey(!showGoogleKey)}
                  >
                    {showGoogleKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button onClick={() => handleSaveApiKey('google', googleApiKey)} disabled={!googleApiKey}>
                  Save
                </Button>
              </div>
            </div>

            {/* Qwen */}
            <div>
              <label className="text-sm mb-1 block">Qwen API Key</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showQwenKey ? 'text' : 'password'}
                    value={qwenApiKey}
                    onChange={(e) => setQwenApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 px-3 flex items-center"
                    onClick={() => setShowQwenKey(!showQwenKey)}
                  >
                    {showQwenKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button onClick={() => handleSaveApiKey('qwen', qwenApiKey)} disabled={!qwenApiKey}>
                  Save
                </Button>
              </div>
            </div>

            {/* Ollama */}
            <div>
              <label className="text-sm mb-1 block">Ollama Base URL</label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={ollamaBaseUrl}
                  onChange={(e) => setOllamaBaseUrl(e.target.value)}
                  placeholder="http://localhost:11434/api"
                  className="flex-1"
                />
                <Button onClick={() => handleSaveApiKey('ollama', '')}>
                  Save
                </Button>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t my-4"></div>

            {/* OpenAI Compatible Providers */}
            <OpenAICompatibleSection />

            {/* Status Messages */}
            {saveStatus === 'success' && (
              <div className="text-sm flex items-center text-green-600">
                <Check className="h-4 w-4 mr-1" /> {saveMessage}
              </div>
            )}

            {saveStatus === 'error' && (
              <div className="text-sm flex items-center text-red-600">
                <X className="h-4 w-4 mr-1" /> {saveMessage}
              </div>
            )}
          </div>
        </div>

        {/* Project Context Section */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold mb-1">Project Context</h3>
          <div className="text-xs text-gray-500 mb-3">
            <p>ℹ️ These instructions will be applied to every chat message.</p>
            <p className="mt-1">Stored locally on this device (not synced across devices).</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm mb-1 block">Project Name</label>
              <Input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Enter project name (optional)"
              />
            </div>

            <div>
              <label className="text-sm mb-1 block">Custom Instructions</label>
              <textarea
                value={projectContext}
                onChange={(e) => setProjectContext(e.target.value)}
                placeholder="Add project-specific context that will be included in every message...

Examples:
- Project background and goals
- Custom terminology and definitions
- Preferred coding styles or conventions
- Domain-specific knowledge"
                className="w-full h-[120px] px-3 py-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                maxLength={2000}
              />
              <div className="flex items-center justify-between mt-1">
                <span className={`text-xs ${projectContext.length > 1900 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-500'}`}>
                  {projectContext.length}/2000 characters
                </span>
                {projectContext.length > 2000 && (
                  <span className="text-xs text-red-600 dark:text-red-400">
                    Character limit exceeded
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSaveContext} disabled={projectContext.length > 2000}>
                Save Context
              </Button>
              <Button onClick={handleClearContext} variant="outline" disabled={!projectName && !projectContext}>
                Clear
              </Button>
            </div>

            {contextSaveStatus === 'success' && (
              <div className="text-sm flex items-center text-green-600">
                <Check className="h-4 w-4 mr-1" /> Project context saved successfully
              </div>
            )}

            {contextSaveStatus === 'error' && (
              <div className="text-sm flex items-center text-red-600">
                <X className="h-4 w-4 mr-1" /> Error saving project context
              </div>
            )}
          </div>
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

          {/* Logo */}
          <div className="flex justify-center mt-6">
            <img
              src="/assets/icon.svg"
              alt="Earth Agent Logo"
              className="w-24 h-24 opacity-80 dark:opacity-70"
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
