import React, { useState, useEffect, useRef } from 'react';
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

import { screenshot } from '@/lib/tools/browser/screenshot';
import { clickBySelector } from '@/lib/tools/browser/clickBySelector';

interface TestPrompt {
  id: string;
  text: string;
  description?: string;
}

interface TestResult {
  id: string;
  prompt: string;
  response: string;
  provider: string;
  model: string;
  timestamp: Date;
  duration: number;
  success: boolean;
  error?: string;
  screenshotId?: string;
  heliconeRequestId?: string;
}

interface TestConfiguration {
  prompts: TestPrompt[];
  provider: 'openai' | 'anthropic' | 'google' | 'qwen' | 'ollama';
  model: string;
  heliconeApiKey: string;
  intervalMs: number;
  timeoutMs: number;
  enableScreenshots: boolean;
  clearCodeBeforeTest: boolean;
  resetMapBeforeTest: boolean;
  reloadGeeEditor: boolean;
  sessionId: string;
  screenshotStorage: 'local' | 'downloads' | 'google-drive';
  driveFolderId?: string;
}

interface AgentTestPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const MODEL_OPTIONS = {
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'o1-preview', label: 'o1 Preview' },
    { value: 'o1-mini', label: 'o1 Mini' },
    { value: 'o3-mini', label: 'o3 Mini' }
  ],
  anthropic: [
    { value: 'claude-opus-4-20250514', label: 'Claude Opus 4' },
    { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
    { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
    { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
    { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
    { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
    { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' }
  ],
  google: [
    { value: 'gemini-2.5-pro-preview-06-05', label: 'Gemini 2.5 Pro Preview (June 5)' },
    { value: 'gemini-2.5-flash-preview-05-20', label: 'Gemini 2.5 Flash Preview (May 20)' },
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    { value: 'gemini-1.5-pro-latest', label: 'Gemini 1.5 Pro (Latest)' },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
    { value: 'gemini-1.5-flash-latest', label: 'Gemini 1.5 Flash (Latest)' },
    { value: 'gemini-1.5-flash-8b', label: 'Gemini 1.5 Flash 8B' },
    { value: 'gemini-1.5-flash-8b-latest', label: 'Gemini 1.5 Flash 8B (Latest)' }
  ],
  qwen: [
    { value: 'qwen-max-latest', label: 'Qwen-Max (Latest)' },
    { value: 'qwen-max', label: 'Qwen-Max' },
    { value: 'qwen-plus-latest', label: 'Qwen-Plus (Latest)' },
    { value: 'qwen-plus', label: 'Qwen-Plus' },
    { value: 'qwen-turbo-latest', label: 'Qwen-Turbo (Latest)' },
    { value: 'qwen-turbo', label: 'Qwen-Turbo' },
    { value: 'qwen-vl-max', label: 'Qwen-VL-Max' },
    { value: 'qwen2.5-72b-instruct', label: 'Qwen2.5-72B-Instruct' },
    { value: 'qwen2.5-14b-instruct-1m', label: 'Qwen2.5-14B-Instruct-1M' },
    { value: 'qwen2.5-vl-72b-instruct', label: 'Qwen2.5-VL-72B-Instruct' }
  ],
  ollama: [
    { value: 'phi3', label: 'Phi-3 (Recommended)' },
    { value: 'llama3.3:70b', label: 'Llama 3.3 70B' },
    { value: 'llama3.3', label: 'Llama 3.3' },
    { value: 'llama3.2:90b', label: 'Llama 3.2 90B' },
    { value: 'llama3.2:70b', label: 'Llama 3.2 70B' },
    { value: 'llama3.2', label: 'Llama 3.2' },
    { value: 'llama3.1:70b', label: 'Llama 3.1 70B' },
    { value: 'llama3.1', label: 'Llama 3.1' },
    { value: 'mistral', label: 'Mistral' },
    { value: 'codellama', label: 'Code Llama' },
    { value: 'deepseek-coder-v2', label: 'DeepSeek Coder V2' },
    { value: 'qwen2.5', label: 'Qwen 2.5' },
    { value: 'gemma2', label: 'Gemma 2' },
    { value: 'llava', label: 'LLaVA (Vision)' },
    { value: 'llava-llama3', label: 'LLaVA Llama3 (Vision)' },
    { value: 'llava-phi3', label: 'LLaVA Phi3 (Vision)' },
    { value: 'moondream', label: 'Moondream (Vision)' }
  ]
};

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

export default function AgentTestPanel({ isOpen, onClose }: AgentTestPanelProps) {
  const [config, setConfig] = useState<TestConfiguration>({
    prompts: EXAMPLE_PROMPTS,
    provider: 'openai',
    model: 'gpt-4o',
    heliconeApiKey: '',
    intervalMs: 5000,
    timeoutMs: 60000,
    enableScreenshots: true,
    clearCodeBeforeTest: true,
    resetMapBeforeTest: true,
    reloadGeeEditor: false,
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
  const [screenshotPreviews, setScreenshotPreviews] = useState<Record<string, string>>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const testTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRunningRef = useRef(false);

  // Update the ref whenever isRunning state changes
  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  // Load stored configuration
  useEffect(() => {
    if (isOpen) {
      chrome.storage.local.get(['agentTestConfig'], (result) => {
        if (result.agentTestConfig) {
          console.log('Loading stored config:', result.agentTestConfig);
          setConfig(prev => ({ 
            ...prev, 
            ...result.agentTestConfig,
            // Always generate a new session ID but keep other settings
            sessionId: `test-session-${Date.now()}`,
            // Provide default timeout if not present in saved config
            timeoutMs: result.agentTestConfig.timeoutMs || 60000
          }));
        }
      });
    }
  }, [isOpen]);

  // Save configuration changes (excluding prompts and sessionId which are session-specific)
  useEffect(() => {
    if (isOpen) {
      const configToSave = {
        provider: config.provider,
        model: config.model,
        heliconeApiKey: config.heliconeApiKey,
        intervalMs: config.intervalMs,
        timeoutMs: config.timeoutMs,
        enableScreenshots: config.enableScreenshots,
        clearCodeBeforeTest: config.clearCodeBeforeTest,
        resetMapBeforeTest: config.resetMapBeforeTest,
        reloadGeeEditor: config.reloadGeeEditor,
        screenshotStorage: config.screenshotStorage,
        driveFolderId: config.driveFolderId
      };
      console.log('Saving config to storage:', configToSave);
      chrome.storage.local.set({ agentTestConfig: configToSave });
    }
  }, [config.provider, config.model, config.heliconeApiKey, config.intervalMs, config.timeoutMs, config.enableScreenshots, config.clearCodeBeforeTest, config.resetMapBeforeTest, config.reloadGeeEditor, config.screenshotStorage, config.driveFolderId, isOpen]);

  const updateConfig = (updates: Partial<TestConfiguration>) => {
    // If provider is changing to Ollama and no model is specified, set default
    if (updates.provider === 'ollama' && !updates.model) {
      updates.model = 'phi3';
    }
    // If provider is changing from Ollama to another provider, set appropriate default
    else if (updates.provider && updates.provider !== 'ollama' && updates.provider !== config.provider) {
      if (MODEL_OPTIONS[updates.provider] && MODEL_OPTIONS[updates.provider].length > 0) {
        updates.model = MODEL_OPTIONS[updates.provider][0].value;
      }
    }
    
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const addPrompt = () => {
    if (!promptText.trim()) return;
    
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
        const data = JSON.parse(text);
        if (Array.isArray(data)) {
          prompts = data.map((item, index) => ({
            id: `uploaded-${index}`,
            text: typeof item === 'string' ? item : item.text || item.prompt || '',
            description: typeof item === 'object' ? item.description : `Uploaded prompt ${index + 1}`
          }));
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
      }
      
      if (prompts.length > 0) {
        updateConfig({ prompts: [...config.prompts, ...prompts.filter(p => p.text)] });
      }
    } catch (error) {
      console.error('Error processing uploaded file:', error);
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setUploadedFile(null);
  };

  // Add new storage functions
  const saveScreenshotDownloads = async (screenshotData: string, testId: string, promptText: string): Promise<string> => {
    try {
      // Convert data URL to blob
      const response = await fetch(screenshotData);
      const blob = await response.blob();
      
      // Create safe filename
      const safePromptText = promptText.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `earth-agent-test-${testId}-${safePromptText}-${timestamp}.png`;
      
      // Use Downloads API
      const downloadId = await new Promise<number>((resolve, reject) => {
        chrome.downloads.download({
          url: URL.createObjectURL(blob),
          filename: `earth-agent-screenshots/${config.sessionId}/${filename}`,
          saveAs: false
        }, (downloadId) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(downloadId);
          }
        });
      });
      
      return `download-${downloadId}`;
    } catch (error) {
      console.error('Error saving screenshot to downloads:', error);
      throw error;
    }
  };

  const authenticateGoogleDrive = async (): Promise<string> => {
    return new Promise((resolve, reject) => {
      // Use Chrome Identity API for OAuth2 authentication
      chrome.identity.getAuthToken({
        interactive: true,
        scopes: ['https://www.googleapis.com/auth/drive.file']
      }, (token) => {
        if (chrome.runtime.lastError) {
          reject(new Error(`Google Drive authentication failed: ${chrome.runtime.lastError.message}`));
        } else if (token) {
          resolve(token);
        } else {
          reject(new Error('No access token received'));
        }
      });
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
        chrome.storage.local.set({
          [`screenshot_${screenshotId}`]: screenshotData
        });
        return screenshotId;
    }
  };

  const executeTest = async (prompt: TestPrompt): Promise<TestResult> => {
    console.log('executeTest called for prompt:', prompt);
    const startTime = Date.now();
    
    try {
      // Reset map, inspector, and console before test if enabled
      if (config.resetMapBeforeTest) {
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
      }
      
      // Clear code editor before test if enabled
      if (config.clearCodeBeforeTest) {
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
        const chatMessage = {
          type: 'CHAT_MESSAGE',
          message: prompt.text,
          messages: [{ role: 'user', content: prompt.text }],
          provider: config.provider,
          model: config.model,
          sessionId: `${config.sessionId}-test-${prompt.id}-${Date.now()}`
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
      let screenshotSuccess = false;
      if (config.enableScreenshots) {
        try {
          console.log('Taking screenshot after agent completion...');
          const screenshotResult = await screenshot();
          if (screenshotResult.success && screenshotResult.screenshotData) {
            // Use new storage system
            screenshotId = await saveScreenshot(screenshotResult.screenshotData, prompt.id, prompt.text);
            screenshotSuccess = true;
            console.log('Screenshot saved with ID:', screenshotId);
          }
        } catch (error) {
          console.error('Screenshot failed:', error);
        }
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
        provider: config.provider,
        model: config.model,
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
        provider: config.provider,
        model: config.model,
        timestamp: new Date(),
        duration,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };

  const runTests = async () => {
    console.log('runTests called');
    console.log('Current config:', config);
    console.log('Prompts length:', config.prompts.length);
    
    if (config.prompts.length === 0) {
      console.log('No prompts configured, returning early');
      return;
    }
    
    console.log('Starting tests...');
    setIsRunning(true);
    isRunningRef.current = true;
    setCurrentTestIndex(0);
    setResults([]);
    setTestProgress(0);

    for (let i = 0; i < config.prompts.length; i++) {
      // Use the current state instead of stale closure
      if (!isRunningRef.current) {
        console.log('Tests stopped by user at index', i);
        break;
      }
      
      console.log(`Running test ${i + 1}/${config.prompts.length}`);
      setCurrentTestIndex(i);
      const prompt = config.prompts[i];
      
      try {
        const result = await executeTest(prompt);
        console.log('Test result:', result);
        setResults(prev => [...prev, result]);
        
        const progress = ((i + 1) / config.prompts.length) * 100;
        setTestProgress(progress);
        
        // Wait for interval before next test (except for last test)
        if (i < config.prompts.length - 1) {
          console.log(`Waiting ${config.intervalMs}ms before next test`);
          await new Promise(resolve => {
            testTimeoutRef.current = setTimeout(resolve, config.intervalMs);
          });
        }
      } catch (error) {
        console.error('Error in test execution:', error);
        // Continue with next test even if one fails
        const errorResult: TestResult = {
          id: `result-${Date.now()}`,
          prompt: prompt.text,
          response: '',
          provider: config.provider,
          model: config.model,
          timestamp: new Date(),
          duration: 0,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
        setResults(prev => [...prev, errorResult]);
      }
    }
    
    console.log('Tests completed');
    setIsRunning(false);
    isRunningRef.current = false;
  };

  const stopTests = () => {
    setIsRunning(false);
    isRunningRef.current = false;
    if (testTimeoutRef.current) {
      clearTimeout(testTimeoutRef.current);
    }
  };

  const resetTests = () => {
    setResults([]);
    setCurrentTestIndex(0);
    setTestProgress(0);
    updateConfig({ sessionId: `test-session-${Date.now()}` });
  };

  const exportResults = () => {
    const csvContent = [
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
        alert('Screenshot was already saved to your Downloads folder');
        return;
      } else if (screenshotId.startsWith('drive-')) {
        // Open Google Drive file
        const driveFileId = screenshotId.replace('drive-', '');
        window.open(`https://drive.google.com/file/d/${driveFileId}/view`, '_blank');
        return;
      } else {
        // Local storage
        const storageKey = `screenshot_${screenshotId}`;
        const result = await chrome.storage.local.get([storageKey]);
        const screenshotData = result[storageKey];
        
        if (!screenshotData) {
          console.error('Screenshot not found in storage');
          return;
        }
        
        // Convert data URL to blob and download
        const link = document.createElement('a');
        link.href = screenshotData;
        // Create a safe filename from the prompt text
        const safePromptText = promptText.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
        link.download = `screenshot_${safePromptText}_${screenshotId}.png`;
        link.click();
      }
    } catch (error) {
      console.error('Error downloading screenshot:', error);
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
      // Load and show preview
      try {
        if (screenshotId.startsWith('download-') || screenshotId.startsWith('drive-')) {
          // Can't preview files from downloads or drive directly
          alert('Preview not available for external storage. Use download/view button instead.');
          return;
        }

        // Local storage
        const storageKey = `screenshot_${screenshotId}`;
        const result = await chrome.storage.local.get([storageKey]);
        const screenshotData = result[storageKey];
    
        if (screenshotData) {
          setScreenshotPreviews(prev => ({
            ...prev,
            [screenshotId]: screenshotData
          }));
        }
      } catch (error) {
        console.error('Error loading screenshot preview:', error);
      }
    }
  };

  if (!isOpen) return null;

  const remainingTests = config.prompts.length - currentTestIndex;
  const successRate = results.length > 0 ? (results.filter(r => r.success).length / results.length) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-6xl h-[90vh] flex flex-col">
        <CardHeader className="flex-shrink-0 flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl font-semibold">Agent Testing Panel</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
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
                    <Label htmlFor="provider">AI Provider</Label>
                    <Select value={config.provider} onValueChange={(value) => updateConfig({ provider: value as 'openai' | 'anthropic' | 'google' | 'qwen' | 'ollama' })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openai">OpenAI</SelectItem>
                        <SelectItem value="anthropic">Anthropic</SelectItem>
                        <SelectItem value="google">Google</SelectItem>
                        <SelectItem value="qwen">Qwen</SelectItem>
                        <SelectItem value="ollama">Ollama</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="model">
                      {config.provider === 'ollama' ? 'Model ID' : 'Model'}
                    </Label>
                    {config.provider === 'ollama' ? (
                      <div>
                        <Input
                          id="model"
                          value={config.model}
                          onChange={(e) => updateConfig({ model: e.target.value })}
                          placeholder="Enter Ollama model ID (e.g., llama3.2, phi3, mistral)"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Enter any Ollama model ID. Popular models: phi3, llama3.3, llama3.2, mistral, codellama, qwen2.5, gemma2
                        </p>
                      </div>
                    ) : (
                      <Select value={config.model} onValueChange={(value) => updateConfig({ model: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MODEL_OPTIONS[config.provider].map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="interval">Interval Between Tests (ms)</Label>
                    <Input
                      id="interval"
                      type="number"
                      value={config.intervalMs}
                      onChange={(e) => updateConfig({ intervalMs: parseInt(e.target.value) || 5000 })}
                      min="1000"
                      step="1000"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="timeout">Test Timeout (ms)</Label>
                    <Input
                      id="timeout"
                      type="number"
                      value={config.timeoutMs}
                      onChange={(e) => updateConfig({ timeoutMs: parseInt(e.target.value) || 60000 })}
                      min="10000"
                      max="300000"
                      step="5000"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      How long to wait for each test to complete (10-300 seconds). Complex prompts may need longer timeouts.
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="helicone-key">Helicone API Key</Label>
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
                    <Label htmlFor="session-id">Session ID</Label>
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
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="screenshots"
                      checked={config.enableScreenshots}
                      onCheckedChange={(checked) => updateConfig({ enableScreenshots: checked })}
                    />
                    <Label htmlFor="screenshots">Enable Screenshots</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="clear-code"
                      checked={config.clearCodeBeforeTest}
                      onCheckedChange={(checked) => updateConfig({ clearCodeBeforeTest: checked })}
                    />
                    <Label htmlFor="clear-code">Clear Code Before Each Test</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="reset-map"
                      checked={config.resetMapBeforeTest}
                      onCheckedChange={(checked) => updateConfig({ resetMapBeforeTest: checked })}
                    />
                    <Label htmlFor="reset-map">Reset Map/Inspector/Console Before Each Test</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="reload-gee-editor"
                      checked={config.reloadGeeEditor}
                      onCheckedChange={(checked) => updateConfig({ reloadGeeEditor: checked })}
                    />
                    <Label htmlFor="reload-gee-editor">Reload Google Earth Engine Editor Between Tests</Label>
                  </div>
                  <div className="text-sm text-muted-foreground ml-6 -mt-1">
                    ⚠️ <strong>Disabled by default.</strong> Reloading the GEE editor clears all state but may cause interruptions.
                  </div>

                  {/* Test Functions Section */}
                  <div className="border-t pt-4">
                    <h4 className="text-lg font-medium mb-3">Test Functions</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Test these functions individually before running agent tests to ensure they work properly.
                    </p>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          console.log('Testing Reset Map/Inspector/Console function...');
                          try {
                            const resetResult = await clickBySelector({
                              selector: 'button.goog-button.reset-button[title="Clear map, inspector, and console"]',
                              elementDescription: 'Reset button to clear map, inspector, and console'
                            });
                            
                            if (resetResult.success) {
                              alert('✅ Reset Map/Inspector/Console test successful!');
                              console.log('Reset successful:', resetResult.message);
                            } else {
                              alert(`❌ Reset test failed: ${resetResult.error}`);
                              console.error('Reset failed:', resetResult.error);
                            }
                          } catch (error) {
                            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                            alert(`❌ Reset test error: ${errorMsg}`);
                            console.error('Reset test error:', error);
                          }
                        }}
                      >
                        🔄 Test Reset Map/Inspector/Console
                      </Button>
                      
                                             <Button
                         variant="outline"
                         size="sm"
                         onClick={async () => {
                           console.log('Testing Clear Script function...');
                           
                           // First try clicking the clear script directly (menu might already be accessible)
                           try {
                             console.log('Trying to click Clear script directly...');
                             const directResult = await clickBySelector({
                               selector: 'div.goog-menuitem-content',
                               elementDescription: 'Clear script menu option (direct)'
                             });
                             
                             if (directResult.success) {
                               console.log('Direct clear script successful:', directResult.message);
                               alert('✅ Clear Script successful (direct click)!');
                               return;
                             } else {
                               console.log('Direct click failed, trying dropdown approach...');
                             }
                           } catch (error) {
                             console.log('Direct click error, trying dropdown approach...');
                           }
                           
                           try {
                             // If direct click failed, try opening dropdown first
                             const dropdownSelectors = [
                               'button.goog-button.reset-button + div.goog-inline-block.goog-flat-menu-button[role="button"]',
                               'button[title="Clear map, inspector, and console"] + div.goog-inline-block.goog-flat-menu-button[role="button"]',
                               '.goog-toolbar-menu-button',
                               'button[title="Reset (Ctrl+Alt+Enter)"] + button',
                               '.goog-button[role="button"][tabindex="0"]:not([title])',
                               'button.goog-button:has(+ .goog-menu)',
                               '.goog-toolbar-button[role="button"]',
                               'button.goog-button.goog-toolbar-button',
                               '[role="button"][aria-haspopup="menu"]',
                               'button[aria-haspopup="true"]',
                               '.goog-button[aria-haspopup="true"]',
                               'button.goog-button[tabindex="0"]'
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
                               await new Promise(resolve => setTimeout(resolve, 1000));
                               
                               // Step 2: Click "Clear script" option in the dropdown menu
                               console.log('Step 2: Clicking Clear script option...');
                               const clearSelectors = [
                                 'div.goog-menuitem-content',
                                 'div.goog-menuitem[role="menuitem"]',
                                 '.goog-menuitem-content:contains("Clear script")',
                                 'div[role="menuitem"]:has(.goog-menuitem-content)'
                               ];
                               
                               let clearResult: any = null;
                               for (const clearSelector of clearSelectors) {
                                 console.log(`Trying clear selector: ${clearSelector}`);
                                 clearResult = await clickBySelector({
                                   selector: clearSelector,
                                   elementDescription: `Clear script menu option (${clearSelector})`
                                 });
                                 
                                 if (clearResult.success) {
                                   console.log(`Clear script successful with selector: ${clearSelector}`);
                                   break;
                                 } else {
                                   console.log(`Clear selector failed: ${clearSelector} - ${clearResult.error}`);
                                 }
                               }
                               
                               if (clearResult.success) {
                                 alert('✅ Clear Script test successful!');
                                 console.log('Clear script successful:', clearResult.message);
                               } else {
                                 alert(`❌ Clear script test failed: ${clearResult.error}`);
                                 console.error('Clear script failed:', clearResult.error);
                               }
                             } else {
                               alert(`❌ Failed to open dropdown. Try manually opening the Reset menu first, then test again.`);
                               console.error('All dropdown selectors failed');
                             }
                           } catch (error) {
                             const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                             alert(`❌ Clear script test error: ${errorMsg}`);
                             console.error('Clear script test error:', error);
                           }
                         }}
                       >
                         🧹 Test Clear Script
                       </Button>
                    </div>
                    <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-sm text-yellow-800">
                        💡 <strong>Clear Script Tip:</strong> If the Clear Script test fails, try manually clicking the Reset button dropdown in Google Earth Engine first, then test again. The dropdown needs to be accessible for the script clearing to work.
                      </p>
                    </div>
                  </div>

                  {config.enableScreenshots && (
                    <>
                      <div>
                        <Label htmlFor="screenshotStorage">Screenshot Storage</Label>
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
                            <Label htmlFor="drive-folder-id">Drive Folder ID (Optional)</Label>
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
                                  alert('Google Drive authentication successful!');
                                } catch (error) {
                                  alert(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                                }
                              }}
                            >
                              Test Google Drive Authentication
                            </Button>
                          </div>
                        </>
                      )}
                    </>
                  )}
                  
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
                      onClick={() => {
                        console.log('Clearing stored configuration...');
                        chrome.storage.local.remove(['agentTestConfig'], () => {
                          // Reset to default config
                          setConfig({
                            prompts: EXAMPLE_PROMPTS,
                            provider: 'openai',
                            model: 'gpt-4o',
                            heliconeApiKey: '',
                            intervalMs: 5000,
                            timeoutMs: 60000,
                            enableScreenshots: true,
                            clearCodeBeforeTest: true,
                            resetMapBeforeTest: true,
                            reloadGeeEditor: false,
                            sessionId: `test-session-${Date.now()}`,
                            screenshotStorage: 'downloads',
                            driveFolderId: ''
                          });
                          console.log('Configuration cleared and reset to defaults');
                        });
                      }}
                    >
                      Clear Stored Settings
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const samplePrompt: TestPrompt = {
                            id: `sample-${Date.now()}`,
                            text: "What is the current weather in New York?",
                            description: "Sample test prompt"
                          };
                          updateConfig({ prompts: [...config.prompts, samplePrompt] });
                        }}
                      >
                        Add Sample
                      </Button>
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
                  <div className="text-2xl font-bold">{config.prompts.length}</div>
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
                      <Button onClick={runTests} disabled={config.prompts.length === 0}>
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
                
                {isRunning && currentTestIndex < config.prompts.length && (
                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge>Running Test #{currentTestIndex + 1}</Badge>
                    </div>
                    <p className="text-sm">{config.prompts[currentTestIndex]?.text}</p>
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