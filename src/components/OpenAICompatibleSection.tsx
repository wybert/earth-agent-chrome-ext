import React, { useState, useEffect } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Eye, EyeOff, ChevronDown, ChevronUp, Trash2, Plus } from 'lucide-react';
import type { OpenAICompatibleConfig } from '@/types/extension';
import { OPENAI_COMPATIBLE_CONFIGS_STORAGE_KEY } from '@/constants/models';

// UUID generator
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

interface ConfigCardProps {
  config: OpenAICompatibleConfig;
  expanded: boolean;
  onToggle: () => void;
  onSave: (config: OpenAICompatibleConfig) => void;
  onDelete: () => void;
}

function ConfigCard({ config, expanded, onToggle, onSave, onDelete }: ConfigCardProps) {
  const [name, setName] = useState(config.name);
  const [baseURL, setBaseURL] = useState(config.baseURL);
  const [apiKey, setApiKey] = useState(config.apiKey);
  const [modelName, setModelName] = useState(config.modelName);
  const [supportsImages, setSupportsImages] = useState(config.supportsImages ?? false);
  const [showApiKey, setShowApiKey] = useState(false);

  const isValid = name.trim() && baseURL.trim() && modelName.trim();

  const handleSave = () => {
    if (!isValid) return;

    onSave({
      ...config,
      name: name.trim(),
      baseURL: baseURL.trim(),
      apiKey: apiKey.trim(),
      modelName: modelName.trim(),
      supportsImages,
      updatedAt: Date.now()
    });
  };

  const handleDelete = () => {
    if (confirm(`Delete provider "${config.name}"? This action cannot be undone.`)) {
      onDelete();
    }
  };

  return (
    <div className="border rounded-md">
      {/* Collapsed Header */}
      <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800" onClick={onToggle}>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          <span className="font-medium">{config.name || 'Unnamed Provider'}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            title="Delete provider"
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </button>
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </div>
      </div>

      {/* Expanded Form */}
      {expanded && (
        <div className="p-4 border-t space-y-3">
          {/* Provider Name */}
          <div>
            <label className="text-sm mb-1 block">Provider Name *</label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Provider"
              className="w-full"
            />
          </div>

          {/* Base URL */}
          <div>
            <label className="text-sm mb-1 block">Base URL *</label>
            <Input
              type="text"
              value={baseURL}
              onChange={(e) => setBaseURL(e.target.value)}
              placeholder="https://api.example.com/v1"
              className="w-full"
            />
          </div>

          {/* API Key */}
          <div>
            <label className="text-sm mb-1 block">API Key (optional)</label>
            <div className="relative">
              <Input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full pr-10"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 px-3 flex items-center"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Model Name */}
          <div>
            <label className="text-sm mb-1 block">Model Name *</label>
            <Input
              type="text"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="deepseek-chat"
              className="w-full"
            />
          </div>

          {/* Supports Images and Actions */}
          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={supportsImages}
                onChange={(e) => setSupportsImages(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">Supports Images</span>
            </label>

            <Button
              onClick={handleSave}
              disabled={!isValid}
              size="sm"
            >
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="border border-dashed rounded-md p-6 text-center">
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
        No OpenAI Compatible providers configured
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-500 mb-4">
        Add providers like DeepSeek, Together AI, Groq, or any service that supports OpenAI-compatible APIs
      </p>
      <Button onClick={onAdd} variant="outline" size="sm">
        <Plus className="h-4 w-4 mr-2" />
        Add OpenAI Compatible Provider
      </Button>
    </div>
  );
}

export function OpenAICompatibleSection() {
  const [configs, setConfigs] = useState<OpenAICompatibleConfig[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  // Load configs from storage
  useEffect(() => {
    chrome.storage.sync.get([OPENAI_COMPATIBLE_CONFIGS_STORAGE_KEY], (result) => {
      const loadedConfigs = result[OPENAI_COMPATIBLE_CONFIGS_STORAGE_KEY] || [];
      setConfigs(loadedConfigs);
    });
  }, []);

  const saveConfigs = (newConfigs: OpenAICompatibleConfig[]) => {
    chrome.storage.sync.set({
      [OPENAI_COMPATIBLE_CONFIGS_STORAGE_KEY]: newConfigs
    }, () => {
      setConfigs(newConfigs);
      showMessage('✓ Configuration saved successfully!');
    });
  };

  const showMessage = (message: string) => {
    setStatusMessage(message);
    setTimeout(() => setStatusMessage(''), 3000);
  };

  const handleAddNew = () => {
    const newConfig: OpenAICompatibleConfig = {
      id: generateUUID(),
      name: 'New Provider',
      baseURL: '',
      apiKey: '',
      modelName: '',
      supportsImages: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const newConfigs = [...configs, newConfig];
    setConfigs(newConfigs);
    setExpandedId(newConfig.id);
  };

  const handleSave = (updatedConfig: OpenAICompatibleConfig) => {
    const newConfigs = configs.map(c =>
      c.id === updatedConfig.id ? updatedConfig : c
    );
    saveConfigs(newConfigs);
  };

  const handleDelete = (id: string) => {
    const newConfigs = configs.filter(c => c.id !== id);
    saveConfigs(newConfigs);
    if (expandedId === id) {
      setExpandedId(null);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold mb-1">OpenAI Compatible Providers</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Custom providers using OpenAI-compatible APIs
        </p>
      </div>

      {configs.length === 0 ? (
        <EmptyState onAdd={handleAddNew} />
      ) : (
        <div className="space-y-2">
          {configs.map((config) => (
            <ConfigCard
              key={config.id}
              config={config}
              expanded={expandedId === config.id}
              onToggle={() => setExpandedId(expandedId === config.id ? null : config.id)}
              onSave={handleSave}
              onDelete={() => handleDelete(config.id)}
            />
          ))}

          <Button onClick={handleAddNew} variant="outline" className="w-full" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add OpenAI Compatible Provider
          </Button>
        </div>
      )}

      {statusMessage && (
        <div className="text-sm text-green-600 dark:text-green-400">
          {statusMessage}
        </div>
      )}
    </div>
  );
}
