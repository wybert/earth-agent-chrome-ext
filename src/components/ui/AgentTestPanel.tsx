import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { X, Upload, Play, Pause, RotateCcw, FileText, HelpCircle, Eye, EyeOff } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

import { screenshot } from '@/lib/tools/browser/screenshot';
import { chromeServices } from '@/lib/services/chrome-storage-service';
import {
  AVAILABLE_MODELS,
  DEFAULT_MODELS,
  MODEL_DISPLAY_NAMES,
  OPENAI_COMPATIBLE_CONFIGS_STORAGE_KEY,
  type ApiProvider,
} from '@/constants/models';
import type { AgentProfile, OpenAICompatibleConfig, Provider } from '@/types/extension';
import { PROFILES_STORAGE_KEY, inferBaseModeFromTools, migrateProfiles } from '@/lib/profiles';

// Validation constants
const VALIDATION = {
  MIN_INTERVAL_MS: 1000, // 1 second minimum
  MAX_INTERVAL_MS: 300000, // 5 minutes maximum
  MIN_TIMEOUT_MS: 60000, // 1 minute minimum
  MAX_TIMEOUT_MS: 7200000, // 120 minutes maximum
  MAX_PROMPTS: 1000, // Rate limiting
  MAX_PREVIEW_COUNT: 10, // Maximum screenshot previews in memory
  DRIVE_ID_PATTERN: /^[a-zA-Z0-9_-]{10,50}$/,
};

const LIST_PAGE_SIZE = 10;

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
}

interface AgentTestPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const EXAMPLE_PROMPTS = [
  {
    id: 'code-generation',
    text: 'Generate JavaScript code to load and visualize Landsat 9 imagery for San Francisco from the last month.',
    description: 'Code generation for satellite imagery',
  },
  {
    id: 'dataset-info',
    text: 'What datasets are available for monitoring deforestation in the Amazon rainforest?',
    description: 'Dataset discovery and recommendation',
  },
  {
    id: 'complex-analysis',
    text: 'Create a complete workflow to calculate NDVI for agricultural fields, mask clouds, and export the results as a time series chart.',
    description: 'Complex multi-step analysis workflow',
  },
];

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  'z-ai': 'Z.AI',
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
  });

  const [isRunning, setIsRunning] = useState(false);
  const [currentTestIndex, setCurrentTestIndex] = useState(0);
  const [results, setResults] = useState<TestResult[]>([]);
  const [testProgress, setTestProgress] = useState(0);
  const [promptText, setPromptText] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [heliconeTestStatus, setHeliconeTestStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [heliconeTestMessage, setHeliconeTestMessage] = useState('');
  const [customProviders, setCustomProviders] = useState<OpenAICompatibleConfig[]>([]);
  const [profiles, setProfiles] = useState<AgentProfile[]>([]);
  const [downloadFormat, setDownloadFormat] = useState<string>('');
  const [promptsPage, setPromptsPage] = useState(1);
  const [resultsPage, setResultsPage] = useState(1);
  const [screenshotPreviews, setScreenshotPreviews] = useState<Record<string, string>>({});
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [currentTestStartTime, setCurrentTestStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // FileSystem API directory handle for the working folder (user selected)
  const [fileSystemHandle, setFileSystemHandle] = useState<FileSystemDirectoryHandle | null>(null);

  // Session folder handle (created for each test run)
  const sessionFolderRef = useRef<FileSystemDirectoryHandle | null>(null);

  // Track the current test result index for filename generation
  const testResultIndexRef = useRef(0);

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
      const customConfig = customProviders.find((config) => config.id === configId);
      if (!customConfig) return null;

      return {
        provider: `custom:${configId}` as Provider,
        model: modelName,
        label: `${customConfig.name} - ${modelName}`,
      };
    }

    const provider = findProviderForModel(value);
    if (!provider) return null;

    return {
      provider,
      model: value,
      label: getModelDisplayName(value),
    };
  };

  const toggleModelSelection = (value: string) => {
    updateConfig({
      selectedModels: config.selectedModels.includes(value)
        ? config.selectedModels.filter((modelId) => modelId !== value)
        : [...config.selectedModels, value],
    });
  };

  const resolvedSelectedModels = config.selectedModels
    .map(resolveSelectedModel)
    .filter((entry): entry is SelectedModelEntry => Boolean(entry));

  const totalTests = config.prompts.length * resolvedSelectedModels.length;
  const promptsPageCount = Math.max(1, Math.ceil(config.prompts.length / LIST_PAGE_SIZE));
  const resultsPageCount = Math.max(1, Math.ceil(results.length / LIST_PAGE_SIZE));
  const promptsPageStart = (promptsPage - 1) * LIST_PAGE_SIZE;
  const promptsPageEnd = Math.min(promptsPageStart + LIST_PAGE_SIZE, config.prompts.length);
  const resultsPageStart = (resultsPage - 1) * LIST_PAGE_SIZE;
  const resultsPageEnd = Math.min(resultsPageStart + LIST_PAGE_SIZE, results.length);
  const pagedPrompts = config.prompts.slice(promptsPageStart, promptsPageEnd);
  const pagedResults = results.slice(resultsPageStart, resultsPageEnd);

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
    if (promptsPage > promptsPageCount) {
      setPromptsPage(promptsPageCount);
    }
  }, [promptsPage, promptsPageCount]);

  useEffect(() => {
    if (resultsPage > resultsPageCount) {
      setResultsPage(resultsPageCount);
    }
  }, [resultsPage, resultsPageCount]);

  useEffect(() => {
    chrome.storage.sync.get([OPENAI_COMPATIBLE_CONFIGS_STORAGE_KEY], (result) => {
      const configs: OpenAICompatibleConfig[] = result[OPENAI_COMPATIBLE_CONFIGS_STORAGE_KEY] || [];
      setCustomProviders(configs);
    });

    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName === 'sync' && changes[OPENAI_COMPATIBLE_CONFIGS_STORAGE_KEY]) {
        const configs: OpenAICompatibleConfig[] =
          changes[OPENAI_COMPATIBLE_CONFIGS_STORAGE_KEY].newValue || [];
        setCustomProviders(configs);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  useEffect(() => {
    chrome.storage.sync.get([PROFILES_STORAGE_KEY], (result) => {
      setProfiles(migrateProfiles(result[PROFILES_STORAGE_KEY]));
    });

    const handleProfileChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName !== 'sync') return;
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
      activeTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      activeTimeoutsRef.current.clear();

      // Disconnect all active ports
      activePortsRef.current.forEach((port) => {
        try {
          port.disconnect();
        } catch (e) {
          /* already disconnected */
        }
      });
      activePortsRef.current.clear();

      // Clear test port
      if (testPortRef.current) {
        try {
          testPortRef.current.disconnect();
        } catch (e) {
          /* already disconnected */
        }
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
    chromeServices.storage
      .get<
        Partial<TestConfiguration> & {
          model?: string;
          provider?: string;
          reloadGeeEditor?: boolean;
        }
      >(['agentTestConfig'])
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
          const candidateModels =
            storedSelectedModels.length > 0
              ? storedSelectedModels
              : legacyModel
                ? [legacyModel]
                : [...DEFAULT_SELECTED_MODELS];
          const normalizedModels = candidateModels.filter((value) => {
            if (value.startsWith('custom:')) return true;
            return Boolean(findProviderForModel(value));
          });
          const selectedModels =
            normalizedModels.length > 0 ? normalizedModels : [...DEFAULT_SELECTED_MODELS];

          setConfig((prev) => ({
            ...prev,
            ...storedConfigWithoutLegacy,
            // Always generate a new session ID but keep other settings
            sessionId: `test-session-${Date.now()}`,
            selectedModels,
            // Provide default timeout if not present in saved config
            timeoutMs: storedConfigWithoutLegacy.timeoutMs || prev.timeoutMs,
            intervalMs: storedConfigWithoutLegacy.intervalMs || prev.intervalMs,
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
        };
        chromeServices.storage.set({ agentTestConfig: configToSave }).catch((error) => {
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
    setConfig((prev) => ({ ...prev, ...updates }));
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
      description: 'Custom prompt',
    };

    updateConfig({ prompts: [...config.prompts, newPrompt] });
    setPromptText('');
  };

  const removePrompt = (id: string) => {
    updateConfig({ prompts: config.prompts.filter((p) => p.id !== id) });
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
              id: (typeof item === 'object' && item.id) ? item.id : `uploaded-${index}`,
              text: typeof item === 'string' ? item : item.text || item.prompt || '',
              description:
                typeof item === 'object' ? item.description : `Uploaded prompt ${index + 1}`,
            }));
          } else {
            toast.error('Invalid JSON format', { description: 'Expected an array of prompts' });
            return;
          }
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          toast.error('Invalid JSON file', {
            description:
              parseError instanceof Error ? parseError.message : 'Could not parse file contents',
            duration: 5000,
          });
          return;
        }
      } else if (file.name.endsWith('.csv')) {
        const lines = text.split('\n').filter((line) => line.trim());
        const hasHeader =
          lines[0]?.toLowerCase().includes('prompt') || lines[0]?.toLowerCase().includes('text');
        const startIndex = hasHeader ? 1 : 0;

        prompts = lines.slice(startIndex).map((line, index) => {
          const columns = line.split(',').map((col) => col.trim().replace(/^"(.*)"$/, '$1'));
          return {
            id: `uploaded-${index}`,
            text: columns[0] || '',
            description: columns[1] || `Uploaded prompt ${index + 1}`,
          };
        });
      } else {
        toast.error('Unsupported file format', {
          description: 'Please upload a .json or .csv file',
        });
        return;
      }

      const validPrompts = prompts.filter((p) => p.text);
      if (validPrompts.length > 0) {
        // Check rate limit
        const totalPrompts = config.prompts.length + validPrompts.length;
        if (totalPrompts > VALIDATION.MAX_PROMPTS) {
          toast.warning(
            `Only adding first ${VALIDATION.MAX_PROMPTS - config.prompts.length} prompts (limit: ${VALIDATION.MAX_PROMPTS})`
          );
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

  // Save screenshot to session folder and store data URL for preview
  const saveScreenshot = async (
    screenshotData: string,
    resultIndex: number,
    modelName: string
  ): Promise<string> => {
    if (!sessionFolderRef.current) {
      throw new Error('Session folder not created. Please run tests first.');
    }

    const response = await fetch(screenshotData);
    const blob = await response.blob();

    // Use result index in filename to match CSV rows (1-based for human readability)
    const safeModelName = modelName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
    const filename = `${String(resultIndex + 1).padStart(4, '0')}_${safeModelName}.png`;

    try {
      const fileHandle = await sessionFolderRef.current.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      console.log('Screenshot saved to session folder:', filename);

      // Store data URL for preview
      setScreenshotPreviews((prev) => ({
        ...prev,
        [filename]: screenshotData,
      }));

      return filename;
    } catch (error) {
      console.error('Error saving screenshot to filesystem:', error);
      throw error;
    }
  };

  // Save CSV results to session folder
  const saveResultsCsv = async (csvContent: string): Promise<void> => {
    if (!sessionFolderRef.current) {
      throw new Error('Session folder not created');
    }

    const filename = `results.csv`;
    try {
      const fileHandle = await sessionFolderRef.current.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(csvContent);
      await writable.close();
      console.log('Results CSV saved to session folder:', filename);
    } catch (error) {
      console.error('Error saving results CSV:', error);
      throw error;
    }
  };

  const executeTest = async (
    prompt: TestPrompt,
    modelEntry: SelectedModelEntry
  ): Promise<TestResult> => {
    console.log('executeTest called for prompt:', prompt);
    const startTime = Date.now();

    // Helper function to send reset messages via port
    const sendResetMessage = (
      port: chrome.runtime.Port,
      type: string
    ): Promise<{ success: boolean; error?: string }> => {
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve({ success: false, error: 'Reset operation timed out' });
        }, 5000);

        const handler = (message: any) => {
          if (message.type === `${type}_RESULT`) {
            clearTimeout(timeout);
            port.onMessage.removeListener(handler);
            resolve({ success: message.success, error: message.error });
          }
        };

        port.onMessage.addListener(handler);
        port.postMessage({ type });
      });
    };

    try {
      // Create a port for reset operations
      const resetPort = chrome.runtime.connect({ name: 'agent-test' });

      // Reset map, inspector, and console before test
      try {
        console.log('Resetting Google Earth Engine map, inspector, and console...');
        const resetResult = await sendResetMessage(resetPort, 'RESET_MAP_CONSOLE');

        if (resetResult.success) {
          console.log('Reset button clicked successfully');
          // Wait a moment for the reset to take effect
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } else {
          console.warn('Failed to click reset button:', resetResult.error);
        }
      } catch (error) {
        console.error('Failed to reset map/inspector/console:', error);
        // Don't fail the test, just log the error and continue
      }

      // Clear code editor before test
      try {
        console.log('Clearing Google Earth Engine code editor...');
        const clearResult = await sendResetMessage(resetPort, 'CLEAR_EDITOR');

        if (clearResult.success) {
          console.log('Code editor cleared successfully');
          // Wait for clearing to take effect
          await new Promise((resolve) => setTimeout(resolve, 500));
        } else {
          console.warn('Failed to clear code editor:', clearResult.error);
        }
      } catch (error) {
        console.error('Failed to clear code editor:', error);
        // Don't fail the test, just log the error and continue
      }

      // Disconnect the reset port
      try {
        resetPort.disconnect();
      } catch (e) {
        // Already disconnected
      }

      // Send message to the agent through the extension's messaging system first
      console.log('Creating test promise...');
      const response = await new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.log(`Test timeout reached after ${config.timeoutMs}ms`);
          reject(new Error(`Test timeout after ${Math.round(config.timeoutMs / 60000)} minutes`));
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
          profileTools: modeConfig.profileTools,
          heliconeHeaders: config.heliconeApiKey
            ? {
                'Helicone-Auth': `Bearer ${config.heliconeApiKey}`,
                'Helicone-Session-Id': config.sessionId,
                'Helicone-Session-Name': `benchmark-${prompt.id}`,
              }
            : undefined,
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
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Now take screenshot AFTER the agent has completed and UI has settled
      let screenshotId: string | undefined;
      try {
        console.log('Taking screenshot after agent completion...');
        const screenshotResult = await screenshot();
        if (screenshotResult.success && screenshotResult.screenshotData) {
          // Save screenshot with result index for CSV matching
          const currentIndex = testResultIndexRef.current;
          screenshotId = await saveScreenshot(
            screenshotResult.screenshotData,
            currentIndex,
            modelEntry.model
          );
          console.log('Screenshot saved:', screenshotId);
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
        heliconeRequestId,
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
        error: error instanceof Error ? error.message : 'Unknown error',
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

    // Check output folder is selected
    if (!fileSystemHandle) {
      toast.error('Please select an output folder first');
      return;
    }

    // Create session subfolder
    try {
      const sessionFolder = await fileSystemHandle.getDirectoryHandle(config.sessionId, {
        create: true,
      });
      sessionFolderRef.current = sessionFolder;
      console.log('Created session folder:', config.sessionId);
    } catch (error) {
      console.error('Failed to create session folder:', error);
      toast.error('Failed to create session folder', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
      return;
    }

    console.log('Starting tests...');
    setIsRunningWithRef(true);
    setCurrentTestIndex(0);
    setResults([]);
    setTestProgress(0);
    setScreenshotPreviews({}); // Clear previous previews
    testResultIndexRef.current = 0; // Reset result index

    const testQueue = config.prompts.flatMap((prompt) =>
      resolvedSelectedModels.map((modelEntry) => ({ prompt, modelEntry }))
    );

    const allResults: TestResult[] = [];

    for (let i = 0; i < testQueue.length; i++) {
      // Use the current state instead of stale closure
      if (!isRunningRef.current) {
        console.log('Tests stopped by user at index', i);
        break;
      }

      console.log(`Running test ${i + 1}/${testQueue.length}`);
      setCurrentTestIndex(i);
      setCurrentTestStartTime(Date.now());
      testResultIndexRef.current = i; // Update result index before each test
      const { prompt, modelEntry } = testQueue[i];

      const result = await executeTest(prompt, modelEntry);
      console.log('Test result:', result);
      allResults.push(result);
      setResults((prev) => [...prev, result]);

      const progress = ((i + 1) / testQueue.length) * 100;
      setTestProgress(progress);
      setCurrentTestStartTime(null);

      // Wait for interval before next test (except for last test)
      if (i < testQueue.length - 1 && isRunningRef.current) {
        console.log(`Waiting ${config.intervalMs}ms before next test`);
        await new Promise((resolve) => {
          testTimeoutRef.current = setTimeout(resolve, config.intervalMs);
        });
      }
    }

    console.log('Tests completed');
    setIsRunningWithRef(false);
    setCurrentTestStartTime(null);

    // Save results CSV to output folder
    if (allResults.length > 0) {
      try {
        const csvContent = buildResultsCsvFromResults(allResults);
        await saveResultsCsv(csvContent);
        toast.success(
          `Tests completed: ${allResults.length} tests run. Results saved to output folder.`
        );
      } catch (error) {
        console.error('Failed to save results CSV:', error);
        toast.success(`Tests completed: ${allResults.length} tests run`);
        toast.warning('Failed to save results CSV', {
          description: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    } else {
      toast.success(`Tests completed: ${testQueue.length} tests run`);
    }
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
      try {
        testPortRef.current.disconnect();
      } catch (e) {
        /* already disconnected */
      }
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

  // Build CSV from provided results array (for saving to filesystem)
  const buildResultsCsvFromResults = (resultsArray: TestResult[]) => {
    return [
      [
        'Index',
        'Timestamp',
        'Prompt',
        'Response',
        'Provider',
        'Model',
        'Duration (ms)',
        'Success',
        'Error',
        'Screenshot',
      ],
      ...resultsArray.map((result, index) => [
        (index + 1).toString(),
        result.timestamp.toISOString(),
        `"${result.prompt.replace(/"/g, '""')}"`,
        `"${result.response.replace(/"/g, '""')}"`,
        result.provider,
        result.model,
        result.duration.toString(),
        result.success.toString(),
        result.error || '',
        result.screenshotId || '',
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');
  };

  const downloadPrompts = (format: 'csv' | 'json') => {
    const timestamp = Date.now();
    if (config.prompts.length === 0) {
      toast.warning('No prompts to download');
      return;
    }
    if (format === 'json') {
      const payload = config.prompts.map((prompt) =>
        prompt.description
          ? { text: prompt.text, description: prompt.description }
          : { text: prompt.text }
      );
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
      ...config.prompts.map((prompt) => [prompt.text, prompt.description || '']),
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

  // Toggle preview visibility state
  const [showPreviews, setShowPreviews] = useState(true);

  const toggleAllScreenshotPreviews = () => {
    setShowPreviews((prev) => !prev);
  };

  // Close handler with confirmation when tests are running
  const handleClose = useCallback(() => {
    if (isRunning) {
      const confirmStop = window.confirm('Tests are still running. Stop tests and close panel?');
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

    const avgDuration =
      completedResults.reduce((sum, r) => sum + r.duration, 0) / completedResults.length;
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
  const successRate =
    results.length > 0 ? (results.filter((r) => r.success).length / results.length) * 100 : 0;
  const currentPromptIndex =
    resolvedSelectedModels.length > 0
      ? Math.floor(currentTestIndex / resolvedSelectedModels.length)
      : 0;
  const currentPrompt = config.prompts[currentPromptIndex];
  const currentModelLabel =
    resolvedSelectedModels.length > 0
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
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="setup">Setup</TabsTrigger>
              <TabsTrigger value="prompts">Prompts</TabsTrigger>
              <TabsTrigger value="run">Run Tests</TabsTrigger>
            </TabsList>

            {/* Setup Tab */}
            <TabsContent value="setup" className="flex-1 overflow-auto space-y-6 px-1">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-5">
                  <div>
                    <Label className="mb-2 block">Models</Label>
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
                                <label
                                  key={modelId}
                                  htmlFor={inputId}
                                  className="flex items-center gap-2 text-sm"
                                >
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
                                <label
                                  key={value}
                                  htmlFor={inputId}
                                  className="flex items-center gap-2 text-sm"
                                >
                                  <input
                                    id={inputId}
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-input"
                                    checked={config.selectedModels.includes(value)}
                                    onChange={() => toggleModelSelection(value)}
                                  />
                                  <span className="truncate">
                                    {customProvider.name} - {customProvider.modelName}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="overflow-visible">
                    <Label htmlFor="mode" className="mb-2 block">
                      Mode
                    </Label>
                    <Select
                      value={config.modeSelection}
                      onValueChange={(value) => updateConfig({ modeSelection: value })}
                    >
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
                    <Label htmlFor="interval" className="mb-2 block">
                      Interval Between Tests (s)
                    </Label>
                    <Input
                      id="interval"
                      type="number"
                      value={Math.round(config.intervalMs / 1000)}
                      onChange={(e) => {
                        const seconds = parseInt(e.target.value, 10);
                        updateConfig({
                          intervalMs: (Number.isFinite(seconds) ? seconds : 5) * 1000,
                        });
                      }}
                      min={VALIDATION.MIN_INTERVAL_MS / 1000}
                      max={VALIDATION.MAX_INTERVAL_MS / 1000}
                      step="1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="timeout" className="mb-2 block">
                      Test Timeout (min)
                    </Label>
                    <Input
                      id="timeout"
                      type="number"
                      value={Math.round(config.timeoutMs / 60000)}
                      onChange={(e) => {
                        const minutes = parseInt(e.target.value, 10);
                        updateConfig({
                          timeoutMs: (Number.isFinite(minutes) ? minutes : 1) * 60000,
                        });
                      }}
                      min={VALIDATION.MIN_TIMEOUT_MS / 60000}
                      max={VALIDATION.MAX_TIMEOUT_MS / 60000}
                      step="1"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      How long to wait for each test to complete (1-120 minutes). Complex prompts
                      may need longer timeouts.
                    </p>
                  </div>
                </div>

                <div className="space-y-5">
                  <div>
                    <Label htmlFor="helicone-key" className="mb-2 block">
                      Helicone API Key{' '}
                      <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="helicone-key"
                        type={showApiKey ? 'text' : 'password'}
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
                        title={showApiKey ? 'Hide API key' : 'Show API key'}
                      >
                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="session-id" className="mb-2 block">
                      Session ID{' '}
                      <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
                    </Label>
                    <div className="flex gap-2 items-center">
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

                  {/* Output Folder Selection */}
                  <div className="p-4 bg-muted/50 border border-border rounded-md space-y-3">
                    <Label className="font-medium text-foreground">Output Folder</Label>
                    <p className="text-sm text-muted-foreground">
                      Select a folder where test results (screenshots and CSV) will be saved.
                    </p>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            const handle = await window.showDirectoryPicker();
                            setFileSystemHandle(handle);
                            toast.success(`Folder selected: ${handle.name}`);
                          } catch (error) {
                            // User cancelled the picker
                            if ((error as Error).name !== 'AbortError') {
                              toast.error('Failed to select folder', {
                                description:
                                  error instanceof Error ? error.message : 'Unknown error',
                              });
                            }
                          }
                        }}
                      >
                        {fileSystemHandle ? 'Change Folder' : 'Select Output Folder'}
                      </Button>
                    </div>
                    {fileSystemHandle ? (
                      <div className="text-sm text-green-600 dark:text-green-400">
                        <p>
                          ✓ Working folder:{' '}
                          <span className="font-mono">{fileSystemHandle.name}/</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Each test run creates:{' '}
                          <span className="font-mono">
                            {fileSystemHandle.name}/{config.sessionId}/
                          </span>
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        ⚠️ You must select an output folder before running tests
                      </p>
                    )}
                  </div>

                  {/* Test Helicone button - only shows when API key is configured */}
                  {config.heliconeApiKey && (
                    <div className="pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className={
                          heliconeTestStatus === 'success'
                            ? 'border-green-500 text-green-600'
                            : heliconeTestStatus === 'error'
                              ? 'border-red-500 text-red-600'
                              : ''
                        }
                        onClick={async () => {
                          setHeliconeTestStatus('pending');
                          setHeliconeTestMessage('Testing...');
                          try {
                            const result = await chrome.runtime.sendMessage({
                              type: 'TEST_HELICONE',
                              apiKey: config.heliconeApiKey,
                            });

                            if (result?.success) {
                              setHeliconeTestStatus('success');
                              setHeliconeTestMessage('API key is valid');
                            } else if (result?.status === 401) {
                              setHeliconeTestStatus('error');
                              setHeliconeTestMessage('Invalid API key');
                            } else {
                              setHeliconeTestStatus('error');
                              setHeliconeTestMessage(result?.error || 'Connection failed');
                            }
                          } catch (error) {
                            setHeliconeTestStatus('error');
                            setHeliconeTestMessage(error instanceof Error ? error.message : 'Network error');
                          }
                        }}
                      >
                        Test Helicone
                      </Button>
                      {heliconeTestMessage && (
                        <p className={`text-xs mt-1 ${
                          heliconeTestStatus === 'success' ? 'text-green-600' :
                          heliconeTestStatus === 'error' ? 'text-red-600' :
                          'text-muted-foreground'
                        }`}>
                          {heliconeTestMessage}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-medium mb-4">Configuration Help</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <HelpCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong>Helicone API Key:</strong> Get your API key from{' '}
                      <a
                        href="https://helicone.ai"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        helicone.ai
                      </a>
                      . This enables request logging and analytics.
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <HelpCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong>Session ID:</strong> Groups related test requests together in Helicone
                      for easier analysis. Each test run should use a unique session ID.
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <HelpCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong>Output Folder:</strong> Select a folder where test results will be
                      saved. Each test run saves:
                      <ul className="ml-4 mt-1 text-xs space-y-1">
                        <li>• Screenshots named with index (e.g., 0001_gpt-4.png)</li>
                        <li>• CSV file with all results (results_session-id.csv)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Prompts Tab */}
            <TabsContent
              value="prompts"
              className="flex-1 overflow-hidden flex flex-col space-y-4 px-1"
            >
              <div className="space-y-3">
                <Label htmlFor="new-prompt" className="block">
                  Add New Prompt
                </Label>
                <div className="flex gap-3 items-end">
                  <Textarea
                    id="new-prompt"
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    placeholder="Enter a test prompt..."
                    rows={3}
                    className="flex-1"
                  />
                  <Button onClick={addPrompt} disabled={!promptText.trim()} size="sm">
                    Add Prompt
                  </Button>
                </div>
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
                    <strong>JSON format:</strong> Array of strings or objects with 'text' and
                    optional 'description' fields
                  </div>
                  <div>
                    <strong>CSV format:</strong> First column should contain prompts, second column
                    (optional) contains descriptions
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-auto">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Test Prompts ({config.prompts.length})</h3>
                    <div className="flex gap-2 items-center overflow-visible">
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
                        <SelectTrigger className="h-8 w-[120px] text-sm">
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

                  {pagedPrompts.map((prompt, index) => (
                    <Card key={prompt.id} className="p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary">#{promptsPageStart + index + 1}</Badge>
                            {prompt.description && (
                              <span className="text-sm text-muted-foreground">
                                {prompt.description}
                              </span>
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
                  {config.prompts.length > LIST_PAGE_SIZE && (
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs text-muted-foreground">
                        Showing {promptsPageStart + 1}-{promptsPageEnd} of {config.prompts.length}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPromptsPage((prev) => Math.max(1, prev - 1))}
                          disabled={promptsPage === 1}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setPromptsPage((prev) => Math.min(promptsPageCount, prev + 1))
                          }
                          disabled={promptsPage === promptsPageCount}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Run Tests Tab */}
            <TabsContent value="run" className="flex-1 space-y-6 px-1">
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
                      <Button
                        onClick={runTests}
                        disabled={
                          config.prompts.length === 0 || resolvedSelectedModels.length === 0
                        }
                      >
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
                        <span>
                          {Math.floor(elapsedTime / 60)}:
                          {(elapsedTime % 60).toString().padStart(2, '0')}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          / {Math.floor(config.timeoutMs / 60000)}:{((config.timeoutMs % 60000) / 1000).toString().padStart(2, '0')}
                        </span>
                      </div>
                    </div>
                    <Progress
                      value={(elapsedTime / (config.timeoutMs / 1000)) * 100}
                      className="h-1 mb-2"
                    />
                    <p className="text-sm line-clamp-2">{currentPrompt?.text}</p>
                    {currentModelLabel && (
                      <p className="text-xs text-muted-foreground mt-1">{currentModelLabel}</p>
                    )}
                    {results.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Est. remaining:{' '}
                        {formatEstimatedTime(
                          results,
                          Math.max(totalTests - currentTestIndex - 1, 0),
                          config.intervalMs
                        )}
                      </p>
                    )}
                  </Card>
                )}
              </div>

              {/* Test Results */}
              <div className="flex-1 overflow-hidden flex flex-col space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-lg font-medium">Test Results ({results.length})</h3>
                    {fileSystemHandle && results.length > 0 && sessionFolderRef.current && (
                      <p className="text-xs text-muted-foreground mt-1">
                        📁 Results saved to:{' '}
                        <span className="font-mono">
                          {fileSystemHandle.name}/{sessionFolderRef.current.name}/
                        </span>
                      </p>
                    )}
                  </div>
                  {results.length > 0 && Object.keys(screenshotPreviews).length > 0 && (
                    <Button onClick={toggleAllScreenshotPreviews} variant="outline" size="sm">
                      {showPreviews ? (
                        <EyeOff className="h-4 w-4 mr-1.5" />
                      ) : (
                        <Eye className="h-4 w-4 mr-1.5" />
                      )}
                      {showPreviews ? 'Hide Previews' : 'Show Previews'}
                    </Button>
                  )}
                </div>

                <div className="flex-1 overflow-auto">
                  <div className="space-y-2">
                    {pagedResults.map((result, index) => (
                      <Card
                        key={result.id}
                        className={`p-4 ${result.success ? 'border-primary/30' : 'border-destructive/30'}`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant={result.success ? 'default' : 'destructive'}>
                                #{resultsPageStart + index + 1} -{' '}
                                {result.success ? 'Success' : 'Failed'}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {result.timestamp.toLocaleString()}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {result.duration}ms
                              </span>
                              <Badge variant="outline">
                                {result.provider} {result.model}
                              </Badge>
                            </div>
                            {result.screenshotId && (
                              <Badge variant="outline">
                                <FileText className="h-3 w-3 mr-1" />
                                {result.screenshotId}
                              </Badge>
                            )}
                          </div>

                          <div>
                            <h4 className="font-medium text-sm mb-1">Prompt:</h4>
                            <p className="text-sm bg-muted/50 p-2 rounded">{result.prompt}</p>
                          </div>

                          {result.success ? (
                            <div>
                              <h4 className="font-medium text-sm mb-1">Response:</h4>
                              <p className="text-sm bg-primary/5 p-2 rounded">{result.response}</p>
                            </div>
                          ) : (
                            <div>
                              <h4 className="font-medium text-sm mb-1">Error:</h4>
                              <p className="text-sm bg-destructive/10 p-2 rounded text-destructive">
                                {result.error}
                              </p>
                            </div>
                          )}

                          {result.screenshotId && (
                            <div>
                              <h4 className="font-medium text-sm mb-1">
                                Screenshot:{' '}
                                <span className="font-mono text-xs text-muted-foreground">
                                  {result.screenshotId}
                                </span>
                              </h4>
                              {showPreviews && screenshotPreviews[result.screenshotId] && (
                                <div className="bg-muted/50 p-2 rounded">
                                  <img
                                    src={screenshotPreviews[result.screenshotId]}
                                    alt={`Screenshot for test ${index + 1}`}
                                    className="max-w-full h-auto rounded border"
                                    style={{ maxHeight: '300px' }}
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                    {results.length > LIST_PAGE_SIZE && (
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-xs text-muted-foreground">
                          Showing {resultsPageStart + 1}-{resultsPageEnd} of {results.length}
                        </span>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setResultsPage((prev) => Math.max(1, prev - 1))}
                            disabled={resultsPage === 1}
                          >
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setResultsPage((prev) => Math.min(resultsPageCount, prev + 1))
                            }
                            disabled={resultsPage === resultsPageCount}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
