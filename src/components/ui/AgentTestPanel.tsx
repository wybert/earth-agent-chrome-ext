import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { X, Upload, Download, Play, Pause, RotateCcw, FileText, HelpCircle, Eye, EyeOff } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import JSZip from 'jszip';

import { screenshot } from '@/lib/tools/browser/screenshot';
import { clickBySelector } from '@/lib/tools/browser/clickBySelector';
import { chromeServices } from '@/lib/services/chrome-storage-service';
import { AVAILABLE_MODELS, DEFAULT_MODELS, MODEL_DISPLAY_NAMES, OPENAI_COMPATIBLE_CONFIGS_STORAGE_KEY, type ApiProvider } from '@/constants/models';
import type { AgentProfile, OpenAICompatibleConfig, Provider } from '@/types/extension';
import {
  PROFILES_STORAGE_KEY,
  inferBaseModeFromTools,
  migrateProfiles
} from '@/lib/profiles';

// Validation constants
const VALIDATION = {
  MIN_INTERVAL_MS: 1000,     // 1 second minimum
  MAX_INTERVAL_MS: 300000,   // 5 minutes maximum
  MIN_TIMEOUT_MS: 10000,     // 10 seconds minimum
  MAX_TIMEOUT_MS: 300000,    // 5 minutes maximum
  MAX_PROMPTS: 1000,         // Rate limiting
  MAX_PREVIEW_COUNT: 10,     // Maximum screenshot previews in memory
  DRIVE_ID_PATTERN: /^[a-zA-Z0-9_-]{10,50}$/
};

interface TestPrompt {
  id: string;
  text: string;
  description?: string;
}

interface TestResult {
  id: string;
  prompt: string;
  response: string;
  provider: Provider;
  model: string;
  timestamp: Date;
  duration: number;
  success: boolean;
  error?: string;
  screenshotId?: string;
  heliconeRequestId?: string;
}

interface SelectedModelEntry {
  provider: Provider;
  model: string;
  label: string;
}

interface TestConfiguration {
  prompts: TestPrompt[];
  selectedModels: string[];
  modeSelection: string;
  heliconeApiKey: string;
  intervalMs: number;
  timeoutMs: number;
  sessionId: string;
  screenshotStorage: 'local' | 'downloads' | 'google-drive';
  driveFolderId?: string;
}

interface AgentTestPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const EXAMPLE_PROMPTS = [
  {
    id: 'basic-hello',
    text: 'Hello! Can you help me get started with Google Earth Engine?',
    description: 'Basic greeting and assistance request'
  },
  {
    id: 'code-generation',
    text: 'Generate JavaScript code to load and visualize Landsat 9 imagery for San Francisco from the last month.',
    description: 'Code generation for satellite imagery'
  },
  {
    id: 'dataset-info',
    text: 'What datasets are available for monitoring deforestation in the Amazon rainforest?',
    description: 'Dataset discovery and recommendation'
  },
  {
    id: 'error-debugging',
    text: 'I\'m getting a "Collection.limit: Invalid argument" error. Can you help me fix this code: var collection = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2").limit("10");',
    description: 'Error debugging and code fixing'
  },
  {
    id: 'complex-analysis',
    text: 'Create a complete workflow to calculate NDVI for agricultural fields, mask clouds, and export the results as a time series chart.',
    description: 'Complex multi-step analysis workflow'
  }
];

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  'z-ai': 'Z.AI'
};

const DEFAULT_SELECTED_MODELS = [DEFAULT_MODELS.openai];

export default function AgentTestPanel({ isOpen, onClose }: AgentTestPanelProps) {
  const [config, setConfig] = useState<TestConfiguration>({
    prompts: EXAMPLE_PROMPTS,
    selectedModels: [...DEFAULT_SELECTED_MODELS],
    modeSelection: 'ask',
    heliconeApiKey: '',
    intervalMs: 5000,
    timeoutMs: 60000,
    sessionId: `test-session-${Date.now()}`,
    screenshotStorage: 'downloads',
    driveFolderId: ''
  });
  
  const [isRunning, setIsRunning] = useState(false);
  const [currentTestIndex, setCurrentTestIndex] = useState(0);
  const [results, setResults] = useState<TestResult[]>([]);
  const [testProgress, setTestProgress] = useState(0);
  const [promptText, setPromptText] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [customProviders, setCustomProviders] = useState<OpenAICompatibleConfig[]>([]);
  const [profiles, setProfiles] = useState<AgentProfile[]>([]);
  const [downloadFormat, setDownloadFormat] = useState<string>('');
  const [screenshotPreviews, setScreenshotPreviews] = useState<Record<string, string>>({});
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [currentTestStartTime, setCurrentTestStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  const getModelDisplayName = (modelId: string) => MODEL_DISPLAY_NAMES[modelId] || modelId;

  const getProviderDisplayName = (provider: string) => PROVIDER_LABELS[provider] || provider;

  const findProviderForModel = (modelId: string): ApiProvider | null => {
    for (const [providerKey, models] of Object.entries(AVAILABLE_MODELS)) {
      if (models.includes(modelId)) {
        return providerKey as ApiProvider;
      }
    }
    return null;
  };

  const resolveSelectedModel = (value: string): SelectedModelEntry | null => {
    if (value.startsWith('custom:')) {
      const parts = value.split(':');
      if (parts.length < 3) return null;
      const configId = parts[1];
      const modelName = parts.slice(2).join(':');
      const customConfig = customProviders.find(config => config.id === configId);
      if (!customConfig) return null;

      return {
        provider: `custom:${configId}` as Provider,
        model: modelName,
        label: `${customConfig.name} - ${modelName}`
      };
    }

    const provider = findProviderForModel(value);
    if (!provider) return null;

    return {
      provider,
      model: value,
      label: getModelDisplayName(value)
    };
  };

  const toggleModelSelection = (value: string) => {
    updateConfig({
      selectedModels: config.selectedModels.includes(value)
        ? config.selectedModels.filter(modelId => modelId !== value)
        : [...config.selectedModels, value]
    });
  };

  const resolvedSelectedModels = config.selectedModels
    .map(resolveSelectedModel)
    .filter((entry): entry is SelectedModelEntry => Boolean(entry));

  const totalTests = config.prompts.length * resolvedSelectedModels.length;

  const resolveModeAndProfile = (): {
    baseMode: 'ask' | 'do';
    profileId?: string;
    profilePrompt?: string;
    profileTools?: string[];
  } => {
    if (config.modeSelection.startsWith('profile:')) {
      const id = config.modeSelection.slice('profile:'.length);
      const profile = profiles.find((p) => p.id === id);
      if (!profile) {
        return { baseMode: 'ask' };
      }
      return {
        baseMode: inferBaseModeFromTools(profile.tools),
        profileId: profile.id,
        profilePrompt: profile.prompt || undefined,
        profileTools: profile.tools as any,
      };
    }
    return { baseMode: (config.modeSelection as 'ask' | 'do') || 'ask' };
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const testTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRunningRef = useRef(false);

  // Cleanup refs for memory leak prevention
  const activeTimeoutsRef = useRef<Set<NodeJS.Timeout>>(new Set());
  const activePortsRef = useRef<Set<chrome.runtime.Port>>(new Set());
  const testPortRef = useRef<chrome.runtime.Port | null>(null);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const configChangedRef = useRef(false);

  // Sync setter for isRunning to avoid stale closures
  const setIsRunningWithRef = useCallback((value: boolean | ((prev: boolean) => boolean)) => {
    setIsRunning((prev) => {
      const newValue = typeof value === 'function' ? value(prev) : value;
      isRunningRef.current = newValue;
      return newValue;
    });
  }, []);

  // Update elapsed time during test execution
  useEffect(() => {
    if (!isRunning || !currentTestStartTime) {
      setElapsedTime(0);
      return;
    }

    const intervalId = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - currentTestStartTime) / 1000));
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isRunning, currentTestStartTime]);

  useEffect(() => {
    chrome.storage.sync.get([OPENAI_COMPATIBLE_CONFIGS_STORAGE_KEY], (result) => {
      const configs: OpenAICompatibleConfig[] = result[OPENAI_COMPATIBLE_CONFIGS_STORAGE_KEY] || [];
      setCustomProviders(configs);
    });

    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'sync' && changes[OPENAI_COMPATIBLE_CONFIGS_STORAGE_KEY]) {
        const configs: OpenAICompatibleConfig[] = changes[OPENAI_COMPATIBLE_CONFIGS_STORAGE_KEY].newValue || [];
        setCustomProviders(configs);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  useEffect(() => {
    chrome.storage.local.get([PROFILES_STORAGE_KEY], (result) => {
      setProfiles(migrateProfiles(result[PROFILES_STORAGE_KEY]));
    });

    const handleProfileChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName !== 'local') return;
      if (changes[PROFILES_STORAGE_KEY]) {
        setProfiles(migrateProfiles(changes[PROFILES_STORAGE_KEY].newValue));
      }
    };

    chrome.storage.onChanged.addListener(handleProfileChange);
    return () => chrome.storage.onChanged.removeListener(handleProfileChange);
  }, []);

  // Cleanup all resources on unmount
  useEffect(() => {
    return () => {
      // Clear all active timeouts
      activeTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      activeTimeoutsRef.current.clear();

      // Disconnect all active ports
      activePortsRef.current.forEach(port => {
        try { port.disconnect(); } catch (e) { /* already disconnected */ }
      });
      activePortsRef.current.clear();

      // Clear test port
      if (testPortRef.current) {
        try { testPortRef.current.disconnect(); } catch (e) { /* already disconnected */ }
        testPortRef.current = null;
      }

      // Clear save timer
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, []);

  // Load stored configuration with loading state
  useEffect(() => {
    if (!isOpen) {
      setIsLoadingConfig(false);
      return;
    }

    setIsLoadingConfig(true);
    chromeServices.storage.get<Partial<TestConfiguration> & { model?: string; provider?: string; reloadGeeEditor?: boolean }>(['agentTestConfig'])
      .then((result) => {
        if (result.agentTestConfig) {
          console.log('Loading stored config:', result.agentTestConfig);
          const storedConfig = result.agentTestConfig;
          const {
            model: legacyModelValue,
            provider: _legacyProvider,
            reloadGeeEditor: _legacyReload,
            ...storedConfigWithoutLegacy
          } = storedConfig;
          const storedSelectedModels = Array.isArray(storedConfig.selectedModels)
            ? storedConfig.selectedModels
            : [];
          const legacyModel = typeof legacyModelValue === 'string' ? legacyModelValue : '';
          const candidateModels = storedSelectedModels.length > 0
            ? storedSelectedModels
            : legacyModel
              ? [legacyModel]
              : [...DEFAULT_SELECTED_MODELS];
          const normalizedModels = candidateModels.filter((value) => {
            if (value.startsWith('custom:')) return true;
            return Boolean(findProviderForModel(value));
          });
          const selectedModels = normalizedModels.length > 0 ? normalizedModels : [...DEFAULT_SELECTED_MODELS];

          setConfig(prev => ({
            ...prev,
            ...storedConfigWithoutLegacy,
            // Always generate a new session ID but keep other settings
            sessionId: `test-session-${Date.now()}`,
            selectedModels,
            // Provide default timeout if not present in saved config
            timeoutMs: storedConfigWithoutLegacy.timeoutMs || prev.timeoutMs,
            intervalMs: storedConfigWithoutLegacy.intervalMs || prev.intervalMs
          }));
        }
      })
      .catch((error) => {
        console.error('Failed to load config:', error);
        toast.error('Failed to load saved configuration');
      })
      .finally(() => {
        setIsLoadingConfig(false);
      });
  }, [isOpen]);

  // Track when config changes
  useEffect(() => {
    configChangedRef.current = true;
  }, [config]);

  // Debounced save - reduces storage writes from 11 deps to 2
  useEffect(() => {
    if (!isOpen) return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      if (configChangedRef.current) {
        const configToSave = {
          selectedModels: config.selectedModels,
          modeSelection: config.modeSelection,
          heliconeApiKey: config.heliconeApiKey,
          intervalMs: config.intervalMs,
          timeoutMs: config.timeoutMs,
          screenshotStorage: config.screenshotStorage,
          driveFolderId: config.driveFolderId
        };
        chromeServices.storage.set({ agentTestConfig: configToSave })
          .catch((error) => {
            console.error('Failed to save config:', error);
          });
        configChangedRef.current = false;
      }
    }, 500); // 500ms debounce

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [isOpen, config]);

  const updateConfig = (updates: Partial<TestConfiguration>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const addPrompt = () => {
    if (!promptText.trim()) return;

    // Rate limiting check
    if (config.prompts.length >= VALIDATION.MAX_PROMPTS) {
      toast.error(`Maximum ${VALIDATION.MAX_PROMPTS} prompts allowed`);
      return;
    }

    const newPrompt: TestPrompt = {
      id: `prompt-${Date.now()}`,
      text: promptText.trim(),
      description: 'Custom prompt'
    };

    updateConfig({ prompts: [...config.prompts, newPrompt] });
    setPromptText('');
  };

  const removePrompt = (id: string) => {
    updateConfig({ prompts: config.prompts.filter(p => p.id !== id) });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);

    try {
      const text = await file.text();
      let prompts: TestPrompt[] = [];

      if (file.name.endsWith('.json')) {
        try {
          const data = JSON.parse(text);
          if (Array.isArray(data)) {
            prompts = data.map((item, index) => ({
              id: `uploaded-${index}`,
              text: typeof item === 'string' ? item : item.text || item.prompt || '',
              description: typeof item === 'object' ? item.description : `Uploaded prompt ${index + 1}`
            }));
          } else {
            toast.error('Invalid JSON format', { description: 'Expected an array of prompts' });
            return;
          }
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          toast.error('Invalid JSON file', {
            description: parseError instanceof Error ? parseError.message : 'Could not parse file contents',
            duration: 5000,
          });
          return;
        }
      } else if (file.name.endsWith('.csv')) {
        const lines = text.split('\n').filter(line => line.trim());
        const hasHeader = lines[0]?.toLowerCase().includes('prompt') || lines[0]?.toLowerCase().includes('text');
        const startIndex = hasHeader ? 1 : 0;

        prompts = lines.slice(startIndex).map((line, index) => {
          const columns = line.split(',').map(col => col.trim().replace(/^"(.*)"$/, '$1'));
          return {
            id: `uploaded-${index}`,
            text: columns[0] || '',
            description: columns[1] || `Uploaded prompt ${index + 1}`
          };
        });
      } else {
        toast.error('Unsupported file format', { description: 'Please upload a .json or .csv file' });
        return;
      }

      const validPrompts = prompts.filter(p => p.text);
      if (validPrompts.length > 0) {
        // Check rate limit
        const totalPrompts = config.prompts.length + validPrompts.length;
        if (totalPrompts > VALIDATION.MAX_PROMPTS) {
          toast.warning(`Only adding first ${VALIDATION.MAX_PROMPTS - config.prompts.length} prompts (limit: ${VALIDATION.MAX_PROMPTS})`);
          const allowedCount = VALIDATION.MAX_PROMPTS - config.prompts.length;
          updateConfig({ prompts: [...config.prompts, ...validPrompts.slice(0, allowedCount)] });
        } else {
          updateConfig({ prompts: [...config.prompts, ...validPrompts] });
          toast.success(`Added ${validPrompts.length} prompts`);
        }
      } else {
        toast.warning('No valid prompts found in file');
      }
    } catch (error) {
      console.error('Error processing uploaded file:', error);
      toast.error('Failed to process file', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setUploadedFile(null);
  };

  // Add new storage functions
  const saveScreenshotDownloads = async (screenshotData: string, testId: string, promptText: string): Promise<string> => {
    // Convert data URL to blob
    const response = await fetch(screenshotData);
    const blob = await response.blob();

    // Create safe filename
    const safePromptText = promptText.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `earth-agent-test-${testId}-${safePromptText}-${timestamp}.png`;

    // Create ObjectURL and ensure it gets revoked
    const url = URL.createObjectURL(blob);
    try {
      const downloadId = await chromeServices.downloads.download({
        url,
        filename: `earth-agent-screenshots/${config.sessionId}/${filename}`,
        saveAs: false
      });
      return `download-${downloadId}`;
    } finally {
      // Always revoke to prevent memory leak
      URL.revokeObjectURL(url);
    }
  };

  const authenticateGoogleDrive = async (): Promise<string> => {
    // Uses chromeServices which has a 60-second timeout built in
    return chromeServices.identity.getAuthToken({
      interactive: true,
      scopes: ['https://www.googleapis.com/auth/drive.file']
    });
  };

  const saveScreenshotGoogleDrive = async (screenshotData: string, testId: string, promptText: string): Promise<string> => {
    try {
      // Get OAuth2 access token
      const accessToken = await authenticateGoogleDrive();
      
      // Convert data URL to blob
      const response = await fetch(screenshotData);
      const blob = await response.blob();
      
      // Create safe filename
      const safePromptText = promptText.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `earth-agent-test-${testId}-${safePromptText}-${timestamp}.png`;
      
      // Prepare metadata
      const metadata = {
        name: filename,
        parents: config.driveFolderId ? [config.driveFolderId] : undefined
      };
      
      // Create form data for multipart upload
      const formData = new FormData();
      formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      formData.append('file', blob);
      
      // Upload to Google Drive
      const uploadResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        body: formData
      });
      
      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Google Drive upload failed: ${uploadResponse.statusText} - ${errorText}`);
      }
      
      const result = await uploadResponse.json();
      console.log('Google Drive upload successful:', result);
      return `drive-${result.id}`;
    } catch (error) {
      console.error('Error saving screenshot to Google Drive:', error);
      throw error;
    }
  };

  const saveScreenshot = async (screenshotData: string, testId: string, promptText: string): Promise<string> => {
    switch (config.screenshotStorage) {
      case 'downloads':
        return await saveScreenshotDownloads(screenshotData, testId, promptText);

      case 'google-drive':
        return await saveScreenshotGoogleDrive(screenshotData, testId, promptText);

      case 'local':
      default:
        // Keep existing local storage for small-scale testing
        const screenshotId = `screenshot-${testId}-${Date.now()}`;
        await chromeServices.storage.set({
          [`screenshot_${screenshotId}`]: screenshotData
        });
        return screenshotId;
    }
  };

  const executeTest = async (prompt: TestPrompt, modelEntry: SelectedModelEntry): Promise<TestResult> => {
    console.log('executeTest called for prompt:', prompt);
    const startTime = Date.now();
    
    try {
      // Reset map, inspector, and console before test
      try {
        console.log('Resetting Google Earth Engine map, inspector, and console...');
        const resetResult = await clickBySelector({
          selector: 'button.goog-button.reset-button[title="Clear map, inspector, and console"]',
          elementDescription: 'Reset button to clear map, inspector, and console'
        });
        
        if (resetResult.success) {
          console.log('Reset button clicked successfully');
          // Wait a moment for the reset to take effect
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          console.warn('Failed to click reset button:', resetResult.error);
        }
      } catch (error) {
        console.error('Failed to reset map/inspector/console:', error);
        // Don't fail the test, just log the error and continue
      }
      
      // Clear code editor before test
      try {
        console.log('Clearing Google Earth Engine code editor using clickBySelector...');
          
        // First try clicking the clear script directly (menu might already be accessible)
        try {
          console.log('Trying to click Clear script directly...');
          const directResult = await clickBySelector({
            selector: 'div.goog-menuitem-content',
            elementDescription: 'Clear script menu option (direct)'
          });
          
          if (directResult.success) {
            console.log('Direct clear script successful:', directResult.message);
            await new Promise(resolve => setTimeout(resolve, 500));
          } else {
            console.log('Direct click failed, trying dropdown approach...');
            throw new Error('Direct click failed');
          }
        } catch (error) {
          console.log('Direct click error, trying dropdown approach...');
          
          // Step 1: Click the Reset dropdown arrow to open the menu using improved selector
          console.log('Step 1: Opening Reset dropdown menu...');
          const dropdownSelectors = [
            'button.goog-button.reset-button + div.goog-inline-block.goog-flat-menu-button[role="button"]',
            'button[title="Clear map, inspector, and console"] + div.goog-inline-block.goog-flat-menu-button[role="button"]',
            '.goog-toolbar-menu-button'
          ];
          
          let dropdownResult: any = null;
          for (const selector of dropdownSelectors) {
            console.log(`Trying dropdown selector: ${selector}`);
            dropdownResult = await clickBySelector({
              selector: selector,
              elementDescription: `Reset dropdown arrow (${selector})`
            });
            
            if (dropdownResult.success) {
              console.log(`Dropdown opened with selector: ${selector}`);
              break;
            } else {
              console.log(`Selector failed: ${selector} - ${dropdownResult.error}`);
            }
          }
          
          if (dropdownResult && dropdownResult.success) {
            console.log('Reset dropdown opened successfully');
            // Wait for menu to appear
            await new Promise(resolve => setTimeout(resolve, 800));
            
            // Step 2: Click "Clear script" option in the dropdown menu
            console.log('Step 2: Clicking Clear script option...');
            const clearResult = await clickBySelector({
              selector: 'div.goog-menuitem-content',
              elementDescription: 'Clear script menu option'
            });
            
            if (clearResult.success) {
              console.log('Code cleared successfully using clickBySelector');
              // Wait for clearing to take effect
              await new Promise(resolve => setTimeout(resolve, 500));
            } else {
              console.warn('Failed to click clear script option:', clearResult.error);
            }
          } else {
            console.warn('Failed to open reset dropdown with any selector');
          }
        }
      } catch (error) {
        console.error('Failed to clear code editor:', error);
        // Don't fail the test, just log the error and continue
      }
      
      // Send message to the agent through the extension's messaging system first
      console.log('Creating test promise...');
      const response = await new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.log(`Test timeout reached after ${config.timeoutMs}ms`);
          reject(new Error(`Test timeout after ${config.timeoutMs / 1000} seconds`));
        }, config.timeoutMs);
        
        // Create isolated session for each test to prevent conversation memory carryover
        // Each test gets its own unique session ID to ensure independent results
        const modeConfig = resolveModeAndProfile();
        const chatMessage = {
          type: 'CHAT_MESSAGE',
          message: prompt.text,
          messages: [{ role: 'user', content: prompt.text }],
          provider: modelEntry.provider,
          model: modelEntry.model,
          sessionId: `${config.sessionId}-test-${prompt.id}-${Date.now()}`,
          mode: modeConfig.baseMode,
          profileId: modeConfig.profileId,
          profilePrompt: modeConfig.profilePrompt,
          profileTools: modeConfig.profileTools
        };

        console.log('Sending chat message:', chatMessage);

        // Use the extension's port-based messaging instead of runtime.sendMessage
        let fullResponse = '';
        let responseReceived = false;
        
        // Connect to background script
        console.log('Connecting to background script...');
        const port = chrome.runtime.connect({ name: 'agent-test' });
        
        port.onMessage.addListener((message) => {
          console.log('Received port message:', message);
          if (message.type === 'CHAT_STREAM_CHUNK') {
            fullResponse += message.chunk;
          } else if (message.type === 'CHAT_STREAM_END') {
            console.log('Chat stream ended, full response:', fullResponse);
            clearTimeout(timeout);
            responseReceived = true;
            resolve(fullResponse || 'No response received');
            port.disconnect();
          } else if (message.type === 'ERROR') {
            console.log('Received error from background:', message.error);
            clearTimeout(timeout);
            reject(new Error(message.error || 'Unknown error'));
            port.disconnect();
          }
        });
        
        port.onDisconnect.addListener(() => {
          console.log('Port disconnected');
          if (!responseReceived) {
            clearTimeout(timeout);
            reject(new Error('Connection disconnected before response received'));
          }
        });
        
        // Send the message
        console.log('Posting message to port...');
        port.postMessage(chatMessage);
      });

      console.log('AI response completed, waiting 2 seconds before taking screenshot...');
      
      // Wait 2 seconds for any UI changes to complete, then take screenshot
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Now take screenshot AFTER the agent has completed and UI has settled
      let screenshotId: string | undefined;
      try {
        console.log('Taking screenshot after agent completion...');
        const screenshotResult = await screenshot();
        if (screenshotResult.success && screenshotResult.screenshotData) {
          // Use new storage system
          screenshotId = await saveScreenshot(screenshotResult.screenshotData, prompt.id, prompt.text);
          console.log('Screenshot saved with ID:', screenshotId);
        }
      } catch (error) {
        console.error('Screenshot failed:', error);
      }

      const duration = Date.now() - startTime;
      console.log('Test completed successfully, duration:', duration);

      // Note: Helicone logging should be configured at the AI provider level in the background script
      // using the proxy approach with baseURL: 'https://oai.helicone.ai/v1' and appropriate headers
      // See: https://ai-sdk.dev/providers/observability/helicone
      let heliconeRequestId: string | undefined;

      return {
        id: `result-${Date.now()}`,
        prompt: prompt.text,
        response,
        provider: modelEntry.provider,
        model: modelEntry.model,
        timestamp: new Date(),
        duration,
        success: true,
        screenshotId,
        heliconeRequestId
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('Test failed with error:', error);
      return {
        id: `result-${Date.now()}`,
        prompt: prompt.text,
        response: '',
        provider: modelEntry.provider,
        model: modelEntry.model,
        timestamp: new Date(),
        duration,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };

  const runTests = async () => {
    console.log('runTests called, prompts:', config.prompts.length);

    if (config.prompts.length === 0) {
      toast.warning('No prompts configured');
      return;
    }

    if (resolvedSelectedModels.length === 0) {
      toast.warning('Select at least one model');
      return;
    }

    console.log('Starting tests...');
    setIsRunningWithRef(true);
    setCurrentTestIndex(0);
    setResults([]);
    setTestProgress(0);

    const testQueue = config.prompts.flatMap(prompt =>
      resolvedSelectedModels.map(modelEntry => ({ prompt, modelEntry }))
    );

    for (let i = 0; i < testQueue.length; i++) {
      // Use the current state instead of stale closure
      if (!isRunningRef.current) {
        console.log('Tests stopped by user at index', i);
        break;
      }

      console.log(`Running test ${i + 1}/${testQueue.length}`);
      setCurrentTestIndex(i);
      setCurrentTestStartTime(Date.now());
      const { prompt, modelEntry } = testQueue[i];

      const result = await executeTest(prompt, modelEntry);
      console.log('Test result:', result);
      setResults(prev => [...prev, result]);

      const progress = ((i + 1) / testQueue.length) * 100;
      setTestProgress(progress);
      setCurrentTestStartTime(null);

      // Wait for interval before next test (except for last test)
      if (i < testQueue.length - 1 && isRunningRef.current) {
        console.log(`Waiting ${config.intervalMs}ms before next test`);
        await new Promise(resolve => {
          testTimeoutRef.current = setTimeout(resolve, config.intervalMs);
        });
      }
    }

    console.log('Tests completed');
    setIsRunningWithRef(false);
    setCurrentTestStartTime(null);
    toast.success(`Tests completed: ${testQueue.length} tests run`);
  };

  const stopTests = useCallback(() => {
    setIsRunningWithRef(false);
    setCurrentTestStartTime(null);

    if (testTimeoutRef.current) {
      clearTimeout(testTimeoutRef.current);
      testTimeoutRef.current = null;
    }

    // Disconnect test port
    if (testPortRef.current) {
      try { testPortRef.current.disconnect(); } catch (e) { /* already disconnected */ }
      testPortRef.current = null;
    }

    toast.info('Tests stopped');
  }, [setIsRunningWithRef]);

  const resetTests = () => {
    setResults([]);
    setCurrentTestIndex(0);
    setTestProgress(0);
    updateConfig({ sessionId: `test-session-${Date.now()}` });
  };

  const buildResultsCsv = () => {
    return [
      ['Timestamp', 'Prompt', 'Response', 'Provider', 'Model', 'Duration (ms)', 'Success', 'Error', 'Screenshot ID'],
      ...results.map(result => [
        result.timestamp.toISOString(),
        `"${result.prompt.replace(/"/g, '""')}"`,
        `"${result.response.replace(/"/g, '""')}"`,
        result.provider,
        result.model,
        result.duration.toString(),
        result.success.toString(),
        result.error || '',
        result.screenshotId || ''
      ])
    ].map(row => row.join(',')).join('\n');
  };

  const downloadPrompts = (format: 'csv' | 'json') => {
    const timestamp = Date.now();
    if (config.prompts.length === 0) {
      toast.warning('No prompts to download');
      return;
    }
    if (format === 'json') {
      const payload = config.prompts.map((prompt) => (
        prompt.description
          ? { text: prompt.text, description: prompt.description }
          : { text: prompt.text }
      ));
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `agent-test-prompts-${timestamp}.json`;
      link.click();
      URL.revokeObjectURL(url);
      return;
    }

    const rows = [
      ['prompt', 'description'],
      ...config.prompts.map(prompt => [prompt.text, prompt.description || ''])
    ];
    const csvContent = rows
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `agent-test-prompts-${timestamp}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadResultsBundle = async () => {
    if (results.length === 0) {
      toast.warning('No results to download');
      return;
    }

    try {
      const zip = new JSZip();
      const csvContent = buildResultsCsv();
      zip.file(`agent-test-results-${config.sessionId}.csv`, csvContent);

      const manifestLines: string[] = [];

      for (const result of results) {
        if (!result.screenshotId) continue;

        if (result.screenshotId.startsWith('screenshot-')) {
          const storageKey = `screenshot_${result.screenshotId}`;
          const stored = await chromeServices.storage.get<string>([storageKey]);
          const screenshotData = stored[storageKey];
          if (screenshotData) {
            const base64Marker = 'base64,';
            const base64Index = screenshotData.indexOf(base64Marker);
            if (base64Index !== -1) {
              const base64Data = screenshotData.slice(base64Index + base64Marker.length);
              zip.file(`screenshots/${result.screenshotId}.png`, base64Data, { base64: true });
            } else {
              manifestLines.push(`${result.id} | missing base64 data for local screenshot`);
            }
          } else {
            manifestLines.push(`${result.id} | missing local screenshot data`);
          }
          continue;
        }

        if (result.screenshotId.startsWith('download-')) {
          const downloadId = Number(result.screenshotId.replace('download-', ''));
          const downloadItems = await new Promise<chrome.downloads.DownloadItem[]>((resolve) => {
            chrome.downloads.search({ id: downloadId }, resolve);
          });
          const filename = downloadItems[0]?.filename;
          const promptSnippet = result.prompt.replace(/\s+/g, ' ').slice(0, 120);
          manifestLines.push(`${result.id} | ${promptSnippet} | downloads: ${filename || result.screenshotId}`);
          continue;
        }

        if (result.screenshotId.startsWith('drive-')) {
          const fileId = result.screenshotId.replace('drive-', '');
          const promptSnippet = result.prompt.replace(/\s+/g, ' ').slice(0, 120);
          manifestLines.push(`${result.id} | ${promptSnippet} | drive: https://drive.google.com/file/d/${fileId}/view`);
          continue;
        }

        manifestLines.push(`${result.id} | unknown screenshot reference: ${result.screenshotId}`);
      }

      if (manifestLines.length > 0) {
        zip.file('screenshots-manifest.txt', manifestLines.join('\n'));
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `agent-test-results-${config.sessionId}.zip`;
      link.click();
      URL.revokeObjectURL(url);

      if (manifestLines.length > 0) {
        toast.info('Some screenshots are stored externally and listed in screenshots-manifest.txt');
      }
    } catch (error) {
      console.error('Failed to download results bundle:', error);
      toast.error('Failed to download results bundle', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const exportResults = () => {
    const csvContent = buildResultsCsv();

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `agent-test-results-${config.sessionId}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadScreenshot = async (screenshotId: string, promptText: string) => {
    try {
      // Handle different storage types
      if (screenshotId.startsWith('download-')) {
        // Already downloaded to filesystem
        toast.info('Screenshot already saved to Downloads folder');
        return;
      } else if (screenshotId.startsWith('drive-')) {
        // Open Google Drive file
        const driveFileId = screenshotId.replace('drive-', '');
        window.open(`https://drive.google.com/file/d/${driveFileId}/view`, '_blank');
        return;
      } else {
        // Local storage
        const storageKey = `screenshot_${screenshotId}`;
        const result = await chromeServices.storage.get<string>([storageKey]);
        const screenshotData = result[storageKey];

        if (!screenshotData) {
          console.error('Screenshot not found in storage');
          toast.error('Screenshot not found', { description: 'It may have been deleted from storage' });
          return;
        }

        // Convert data URL to blob and download
        const link = document.createElement('a');
        link.href = screenshotData;
        // Create a safe filename from the prompt text
        const safePromptText = promptText.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
        link.download = `screenshot_${safePromptText}_${screenshotId}.png`;
        link.click();
        toast.success('Screenshot downloaded');
      }
    } catch (error) {
      console.error('Error downloading screenshot:', error);
      toast.error('Failed to download screenshot', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const downloadAllScreenshots = async () => {
    const screenshotResults = results.filter(r => r.screenshotId);
    if (screenshotResults.length === 0) {
      console.log('No screenshots to download');
      return;
    }

    for (const result of screenshotResults) {
      if (result.screenshotId) {
        await downloadScreenshot(result.screenshotId, result.prompt);
        // Small delay between downloads to avoid overwhelming the browser
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  };

  const toggleScreenshotPreview = async (screenshotId: string) => {
    if (screenshotPreviews[screenshotId]) {
      // Remove from previews
      const newPreviews = { ...screenshotPreviews };
      delete newPreviews[screenshotId];
      setScreenshotPreviews(newPreviews);
    } else {
      // Check preview limit before loading
      const currentCount = Object.keys(screenshotPreviews).length;
      if (currentCount >= VALIDATION.MAX_PREVIEW_COUNT) {
        toast.warning(`Maximum ${VALIDATION.MAX_PREVIEW_COUNT} previews shown`, {
          description: 'Close some previews to view more'
        });
        return;
      }

      // Load and show preview
      try {
        if (screenshotId.startsWith('download-') || screenshotId.startsWith('drive-')) {
          // Can't preview files from downloads or drive directly
          toast.info('Preview not available for external storage', {
            description: 'Use download/view button instead'
          });
          return;
        }

        // Local storage
        const storageKey = `screenshot_${screenshotId}`;
        const result = await chromeServices.storage.get<string>([storageKey]);
        const screenshotData = result[storageKey];

        if (screenshotData) {
          setScreenshotPreviews(prev => ({
            ...prev,
            [screenshotId]: screenshotData
          }));
        } else {
          toast.error('Screenshot not found');
        }
      } catch (error) {
        console.error('Error loading screenshot preview:', error);
        toast.error('Failed to load preview');
      }
    }
  };

  // Close handler with confirmation when tests are running
  const handleClose = useCallback(() => {
    if (isRunning) {
      const confirmStop = window.confirm(
        'Tests are still running. Stop tests and close panel?'
      );
      if (!confirmStop) return;
      stopTests();
    }
    onClose();
  }, [isRunning, onClose, stopTests]);

  // Helper for estimated remaining time
  const formatEstimatedTime = (
    completedResults: TestResult[],
    remainingCount: number,
    intervalMs: number
  ): string => {
    if (completedResults.length === 0 || remainingCount === 0) return 'calculating...';

    const avgDuration = completedResults.reduce((sum, r) => sum + r.duration, 0) / completedResults.length;
    const totalMs = remainingCount * (avgDuration + intervalMs);

    const minutes = Math.floor(totalMs / 60000);
    const seconds = Math.floor((totalMs % 60000) / 1000);

    return minutes > 0 ? `~${minutes}m ${seconds}s` : `~${seconds}s`;
  };

  if (!isOpen) return null;

  // Show loading state while config is being fetched
  if (isLoadingConfig) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="p-8">
          <div className="flex items-center gap-3">
            <div className="animate-spin h-5 w-5 border-2 border-blue-500 rounded-full border-t-transparent" />
            <span>Loading configuration...</span>
          </div>
        </Card>
      </div>
    );
  }

  const remainingTests = Math.max(totalTests - currentTestIndex, 0);
  const successRate = results.length > 0 ? (results.filter(r => r.success).length / results.length) * 100 : 0;
  const currentPromptIndex = resolvedSelectedModels.length > 0
    ? Math.floor(currentTestIndex / resolvedSelectedModels.length)
    : 0;
  const currentPrompt = config.prompts[currentPromptIndex];
  const currentModelLabel = resolvedSelectedModels.length > 0
    ? resolvedSelectedModels[currentTestIndex % resolvedSelectedModels.length]?.label
    : undefined;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-6xl h-[90vh] flex flex-col">
        <CardHeader className="flex-shrink-0 flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl font-semibold">Agent Testing Panel</CardTitle>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-hidden">
          <Tabs defaultValue="setup" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="setup">Setup</TabsTrigger>
              <TabsTrigger value="prompts">Prompts</TabsTrigger>
              <TabsTrigger value="run">Run Tests</TabsTrigger>
              <TabsTrigger value="results">Results</TabsTrigger>
            </TabsList>
            
            {/* Setup Tab */}
            <TabsContent value="setup" className="flex-1 overflow-auto space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label>Models</Label>
                    <div className="mt-2 space-y-4">
                      {Object.entries(AVAILABLE_MODELS).map(([providerKey, models]) => (
                        <div key={providerKey} className="space-y-2">
                          <div className="text-xs font-semibold text-muted-foreground uppercase">
                            {getProviderDisplayName(providerKey)}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {models.map((modelId) => {
                              const inputId = `model-${providerKey}-${modelId}`;
                              return (
                                <label key={modelId} htmlFor={inputId} className="flex items-center gap-2 text-sm">
                                  <input
                                    id={inputId}
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-input"
                                    checked={config.selectedModels.includes(modelId)}
                                    onChange={() => toggleModelSelection(modelId)}
                                  />
                                  <span className="truncate">{getModelDisplayName(modelId)}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}

                      {customProviders.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-xs font-semibold text-muted-foreground uppercase">
                            Custom Providers
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {customProviders.map((customProvider) => {
                              const value = `custom:${customProvider.id}:${customProvider.modelName}`;
                              const inputId = `model-custom-${customProvider.id}`;
                              return (
                                <label key={value} htmlFor={inputId} className="flex items-center gap-2 text-sm">
                                  <input
                                    id={inputId}
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-input"
                                    checked={config.selectedModels.includes(value)}
                                    onChange={() => toggleModelSelection(value)}
                                  />
                                  <span className="truncate">{customProvider.name} - {customProvider.modelName}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="mode">Mode</Label>
                    <Select value={config.modeSelection} onValueChange={(value) => updateConfig({ modeSelection: value })}>
                      <SelectTrigger id="mode">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ask">Ask</SelectItem>
                        <SelectItem value="do">Do</SelectItem>
                        {profiles.length > 0 && (
                          <>
                            <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              Profiles
                            </div>
                            {profiles.map((profile) => (
                              <SelectItem key={profile.id} value={`profile:${profile.id}`}>
                                <span className="truncate" title={profile.name}>
                                  {profile.name}
                                </span>
                              </SelectItem>
                            ))}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="interval" className="flex items-center gap-2">
                      Interval Between Tests (s)
                      <span className="text-xs text-muted-foreground">(Optional)</span>
                    </Label>
                    <Input
                      id="interval"
                      type="number"
                      value={Math.round(config.intervalMs / 1000)}
                      onChange={(e) => {
                        const seconds = parseInt(e.target.value, 10);
                        updateConfig({ intervalMs: (Number.isFinite(seconds) ? seconds : 5) * 1000 });
                      }}
                      min={VALIDATION.MIN_INTERVAL_MS / 1000}
                      max={VALIDATION.MAX_INTERVAL_MS / 1000}
                      step="1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="timeout" className="flex items-center gap-2">
                      Test Timeout (s)
                      <span className="text-xs text-muted-foreground">(Optional)</span>
                    </Label>
                    <Input
                      id="timeout"
                      type="number"
                      value={Math.round(config.timeoutMs / 1000)}
                      onChange={(e) => {
                        const seconds = parseInt(e.target.value, 10);
                        updateConfig({ timeoutMs: (Number.isFinite(seconds) ? seconds : 60) * 1000 });
                      }}
                      min={VALIDATION.MIN_TIMEOUT_MS / 1000}
                      max={VALIDATION.MAX_TIMEOUT_MS / 1000}
                      step="5"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      How long to wait for each test to complete (10-300 seconds). Complex prompts may need longer timeouts.
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="helicone-key" className="flex items-center gap-2">
                      Helicone API Key
                      <span className="text-xs text-muted-foreground">(Optional)</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="helicone-key"
                        type={showApiKey ? "text" : "password"}
                        value={config.heliconeApiKey}
                        onChange={(e) => updateConfig({ heliconeApiKey: e.target.value })}
                        placeholder="sk-..."
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowApiKey(!showApiKey)}
                        title={showApiKey ? "Hide API key" : "Show API key"}
                      >
                        {showApiKey ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="session-id" className="flex items-center gap-2">
                      Session ID
                      <span className="text-xs text-muted-foreground">(Optional)</span>
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="session-id"
                        value={config.sessionId}
                        onChange={(e) => updateConfig({ sessionId: e.target.value })}
                        placeholder="test-session-..."
                      />
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => updateConfig({ sessionId: `test-session-${Date.now()}` })}
                        title="Generate new session ID"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="screenshotStorage" className="flex items-center gap-2">
                        Screenshot Storage
                        <span className="text-xs text-muted-foreground">(Optional)</span>
                      </Label>
                      <Select value={config.screenshotStorage} onValueChange={(value) => updateConfig({ screenshotStorage: value as 'local' | 'downloads' | 'google-drive' })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="local">Local Storage (Limited)</SelectItem>
                          <SelectItem value="downloads">Downloads Folder (Recommended)</SelectItem>
                          <SelectItem value="google-drive">Google Drive (Cloud)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-gray-500 mt-1">
                        {config.screenshotStorage === 'local' && '⚠️ Limited to ~20 screenshots due to browser storage limits'}
                        {config.screenshotStorage === 'downloads' && '✅ Unlimited storage - saves to Downloads/earth-agent-screenshots/'}
                        {config.screenshotStorage === 'google-drive' && '☁️ Uploads to Google Drive - requires API key below'}
                      </p>
                    </div>

                    {config.screenshotStorage === 'google-drive' && (
                      <>
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                          <h4 className="font-medium text-blue-900 mb-2">Google Drive Setup Required</h4>
                          <p className="text-sm text-blue-800 mb-3">
                            To use Google Drive storage, you need to configure OAuth2 authentication:
                          </p>
                          <ol className="text-sm text-blue-800 space-y-1 ml-4">
                            <li>1. Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Console</a></li>
                            <li>2. Create OAuth2 credentials for Chrome Extension</li>
                            <li>3. Enable Google Drive API</li>
                            <li>4. Update manifest.json with your client_id</li>
                            <li>5. The extension will prompt for authentication when first used</li>
                          </ol>
                        </div>
                        <div>
                          <Label htmlFor="drive-folder-id" className="flex items-center gap-2">
                            Drive Folder ID
                            <span className="text-xs text-muted-foreground">(Optional)</span>
                          </Label>
                          <Input
                            id="drive-folder-id"
                            value={config.driveFolderId || ''}
                            onChange={(e) => updateConfig({ driveFolderId: e.target.value })}
                            placeholder="e.g., 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                          />
                          <p className="text-sm text-gray-500 mt-1">
                            Leave empty to save to Drive root folder. Get folder ID from Drive URL.
                          </p>
                        </div>
                        <div>
                          <Button
                            variant="outline"
                            onClick={async () => {
                              try {
                                await authenticateGoogleDrive();
                                toast.success('Google Drive authentication successful!');
                              } catch (error) {
                                toast.error('Authentication failed', {
                                  description: error instanceof Error ? error.message : 'Unknown error'
                                });
                              }
                            }}
                          >
                            Test Google Drive Authentication
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                  
                  <div className="pt-4">
                    <Button
                      variant="outline"
                      onClick={async () => {
                        console.log('Testing connection...');
                        try {
                          const port = chrome.runtime.connect({ name: 'agent-test' });
                          let connected = false;
                          
                          port.onMessage.addListener((message) => {
                            console.log('Connection test message:', message);
                            connected = true;
                            port.disconnect();
                          });
                          
                          port.onDisconnect.addListener(() => {
                            console.log('Connection test disconnected, connected:', connected);
                          });
                          
                          port.postMessage({ type: 'CONNECTION_TEST' });
                          
                          setTimeout(() => {
                            if (!connected) {
                              console.log('Connection test failed - no response');
                              port.disconnect();
                            }
                          }, 5000);
                        } catch (error) {
                          console.error('Connection test error:', error);
                        }
                      }}
                    >
                      Test Connection
                    </Button>
                  </div>
                  
                  <div className="pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        console.log('Resetting stored configuration...');
                        try {
                          await chromeServices.storage.remove(['agentTestConfig']);
                          // Reset to default config
                          setConfig({
                            prompts: EXAMPLE_PROMPTS,
                            selectedModels: [...DEFAULT_SELECTED_MODELS],
                            modeSelection: 'ask',
                            heliconeApiKey: '',
                            intervalMs: 5000,
                            timeoutMs: 60000,
                            sessionId: `test-session-${Date.now()}`,
                            screenshotStorage: 'downloads',
                            driveFolderId: ''
                          });
                          toast.success('Settings reset to defaults');
                        } catch (error) {
                          toast.error('Failed to clear settings');
                        }
                      }}
                    >
                      Reset Settings
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium mb-4">Configuration Help</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <HelpCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong>Helicone API Key:</strong> Get your API key from <a href="https://helicone.ai" target="_blank" rel="noopener noreferrer" className="underline">helicone.ai</a>. This enables request logging and analytics.
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <HelpCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong>Session ID:</strong> Groups related test requests together in Helicone for easier analysis. Each test run should use a unique session ID.
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <HelpCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong>Screenshots:</strong> Automatically captures screenshots after each agent response. Choose storage method:
                      <ul className="ml-4 mt-1 text-xs space-y-1">
                        <li>• <strong>Local Storage:</strong> Browser storage, limited to ~20 screenshots</li>
                        <li>• <strong>Downloads Folder:</strong> Unlimited storage, best for 1000+ tests</li>
                        <li>• <strong>Google Drive:</strong> Cloud storage with API access required</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            {/* Prompts Tab */}
            <TabsContent value="prompts" className="flex-1 overflow-hidden flex flex-col space-y-4">
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <Label htmlFor="new-prompt">Add New Prompt</Label>
                  <Textarea
                    id="new-prompt"
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    placeholder="Enter a test prompt..."
                    rows={3}
                  />
                </div>
                <Button onClick={addPrompt} disabled={!promptText.trim()}>
                  Add Prompt
                </Button>
              </div>
              
              <div className="flex gap-2 items-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload File
                </Button>
                <span className="text-sm text-muted-foreground">
                  Upload JSON array or CSV file with prompts
                </span>
              </div>
              
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium mb-2">File Format Help</h3>
                <div className="text-sm text-muted-foreground space-y-2">
                  <div>
                    <strong>JSON format:</strong> Array of strings or objects with 'text' and optional 'description' fields
                  </div>
                  <div>
                    <strong>CSV format:</strong> First column should contain prompts, second column (optional) contains descriptions
                  </div>
                </div>
              </div>
              
              <div className="flex-1 overflow-auto">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Test Prompts ({config.prompts.length})</h3>
                    <div className="flex gap-2">
                      <Select
                        value={downloadFormat}
                        onValueChange={(value) => {
                          setDownloadFormat(value);
                          if (value === 'csv' || value === 'json') {
                            downloadPrompts(value);
                            setDownloadFormat('');
                          }
                        }}
                      >
                        <SelectTrigger className="h-8 px-3 text-sm">
                          <SelectValue placeholder="Download" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="csv">Download CSV</SelectItem>
                          <SelectItem value="json">Download JSON</SelectItem>
                        </SelectContent>
                      </Select>
                      {config.prompts.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateConfig({ prompts: [] })}
                        >
                          Clear All
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {config.prompts.map((prompt, index) => (
                    <Card key={prompt.id} className="p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary">#{index + 1}</Badge>
                            {prompt.description && (
                              <span className="text-sm text-muted-foreground">{prompt.description}</span>
                            )}
                          </div>
                          <p className="text-sm">{prompt.text}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removePrompt(prompt.id)}
                          className="flex-shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>
            
            {/* Run Tests Tab */}
            <TabsContent value="run" className="flex-1 space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <Card className="p-4">
                  <div className="text-2xl font-bold">{totalTests}</div>
                  <div className="text-sm text-muted-foreground">Total Tests</div>
                </Card>
                <Card className="p-4">
                  <div className="text-2xl font-bold">{remainingTests}</div>
                  <div className="text-sm text-muted-foreground">Remaining</div>
                </Card>
                <Card className="p-4">
                  <div className="text-2xl font-bold">{Math.round(successRate)}%</div>
                  <div className="text-sm text-muted-foreground">Success Rate</div>
                </Card>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Test Progress</h3>
                  <div className="flex gap-2">
                    {!isRunning ? (
                      <Button onClick={runTests} disabled={config.prompts.length === 0 || resolvedSelectedModels.length === 0}>
                        <Play className="h-4 w-4 mr-2" />
                        Start Tests
                      </Button>
                    ) : (
                      <Button onClick={stopTests} variant="destructive">
                        <Pause className="h-4 w-4 mr-2" />
                        Stop Tests
                      </Button>
                    )}
                    <Button onClick={resetTests} variant="outline">
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset
                    </Button>
                  </div>
                </div>
                
                <Progress value={testProgress} className="w-full" />
                
                {isRunning && currentTestIndex < totalTests && (
                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge>Running Test #{currentTestIndex + 1}</Badge>
                        <span className="text-sm text-muted-foreground">
                          Step {currentTestIndex + 1} of {totalTests}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-sm">
                        <span>{Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}</span>
                        <span className="text-xs text-muted-foreground">
                          / {Math.floor(config.timeoutMs / 1000)}s
                        </span>
                      </div>
                    </div>
                    <Progress value={(elapsedTime / (config.timeoutMs / 1000)) * 100} className="h-1 mb-2" />
                    <p className="text-sm line-clamp-2">{currentPrompt?.text}</p>
                    {currentModelLabel && (
                      <p className="text-xs text-muted-foreground mt-1">{currentModelLabel}</p>
                    )}
                    {results.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Est. remaining: {formatEstimatedTime(results, Math.max(totalTests - currentTestIndex - 1, 0), config.intervalMs)}
                      </p>
                    )}
                  </Card>
                )}
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Recent Results</h3>
                <div className="max-h-96 overflow-auto space-y-2">
                  {results.slice(-5).reverse().map((result, index) => (
                    <Card key={result.id} className={`p-3 ${result.success ? 'border-green-200' : 'border-red-200'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={result.success ? "default" : "destructive"}>
                              {result.success ? 'Success' : 'Failed'}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {result.duration}ms
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {result.model}
                            </span>
                          </div>
                          <p className="text-sm font-medium mb-1">{result.prompt}</p>
                          {result.success ? (
                            <p className="text-sm text-muted-foreground line-clamp-2">{result.response}</p>
                          ) : (
                            <p className="text-sm text-red-600">{result.error}</p>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>
            
            {/* Results Tab */}
            <TabsContent value="results" className="flex-1 overflow-hidden flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Test Results ({results.length})</h3>
                <div className="flex gap-2">
                  <Button onClick={downloadResultsBundle} variant="outline" size="sm" disabled={results.length === 0}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Results
                  </Button>
                  {results.some(r => r.screenshotId) && (
                    <Button onClick={downloadAllScreenshots} variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download All Screenshots
                    </Button>
                  )}
                  <Button onClick={exportResults} disabled={results.length === 0} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </div>
              
              <div className="flex-1 overflow-auto">
                <div className="space-y-2">
                  {results.map((result, index) => (
                    <Card key={result.id} className={`p-4 ${result.success ? 'border-green-200' : 'border-red-200'}`}>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant={result.success ? "default" : "destructive"}>
                              #{index + 1} - {result.success ? 'Success' : 'Failed'}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {result.timestamp.toLocaleString()}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {result.duration}ms
                            </span>
                            <Badge variant="outline">{result.provider} {result.model}</Badge>
                          </div>
                          {result.screenshotId && (
                            <button
                              onClick={() => toggleScreenshotPreview(result.screenshotId!)}
                              className="inline-flex items-center"
                            >
                              <Badge variant="outline" className="cursor-pointer hover:bg-blue-50 transition-colors">
                                <FileText className="h-3 w-3 mr-1" />
                                {screenshotPreviews[result.screenshotId!] ? 'Hide Preview' : 'Show Preview'}
                              </Badge>
                            </button>
                          )}
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-sm mb-1">Prompt:</h4>
                          <p className="text-sm bg-gray-50 p-2 rounded">{result.prompt}</p>
                        </div>
                        
                        {result.success ? (
                          <div>
                            <h4 className="font-medium text-sm mb-1">Response:</h4>
                            <p className="text-sm bg-green-50 p-2 rounded">{result.response}</p>
                          </div>
                        ) : (
                          <div>
                            <h4 className="font-medium text-sm mb-1">Error:</h4>
                            <p className="text-sm bg-red-50 p-2 rounded text-red-600">{result.error}</p>
                          </div>
                        )}
                        
                        {result.screenshotId && screenshotPreviews[result.screenshotId] && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-sm">Screenshot:</h4>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => downloadScreenshot(result.screenshotId!, result.prompt)}
                              >
                                <Download className="h-3 w-3 mr-1" />
                                Download
                              </Button>
                            </div>
                            <div className="bg-gray-50 p-2 rounded">
                              <img
                                src={screenshotPreviews[result.screenshotId]}
                                alt={`Screenshot for test ${index + 1}`}
                                className="max-w-full h-auto rounded border"
                                style={{ maxHeight: '300px' }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
} 
