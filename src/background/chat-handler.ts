import { Message, CoreMessage, streamText, tool, TextPart, ImagePart, FilePart } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { getDocumentation } from '../lib/tools/context7';
import { snapshot as browserSnapshot, SnapshotResponse } from '../lib/tools/browser/snapshot';

// Available providers
export type Provider = 'openai' | 'anthropic';

// Default models configuration
export const DEFAULT_MODELS: Record<Provider, string> = {
  openai: 'gpt-4o',
  anthropic: 'claude-3-5-haiku-20241022'
};

// Custom fetch function for Anthropic to handle CORS
const corsProxyFetch = async (input: string | URL | Request, options: RequestInit = {}): Promise<Response> => {
  // Get the URL as a string
  let url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  
  // Fix the Anthropic API path if needed
  // If the URL is to Anthropic but missing the /v1 path segment, add it
  if (url.startsWith('https://api.anthropic.com/') && !url.includes('/v1/')) {
    url = url.replace('https://api.anthropic.com/', 'https://api.anthropic.com/v1/');
    console.log(`🔄 [CORS Proxy] Fixed API path: ${url}`);
    
    // If input is a string, replace it directly
    if (typeof input === 'string') {
      input = url;
    } 
    // If input is a URL object, create a new URL
    else if (input instanceof URL) {
      input = new URL(url);
    }
    // If input is a Request, create a new Request with the corrected URL
    else {
      input = new Request(url, input);
    }
  }
  
  console.log(`🔄 [CORS Proxy] Fetching from ${url}`);
  
  try {
    // Add the required headers for browser requests to Anthropic
    const headers = new Headers(options.headers || {});
    headers.set('anthropic-version', '2023-06-01');
    headers.set('anthropic-dangerous-direct-browser-access', 'true');
    
    // Create new options with enhanced headers
    const enhancedOptions: RequestInit = {
      ...options,
      headers,
      // Add credentials to ensure cookies are sent with the request
      credentials: 'include',
      // Add mode to handle CORS preflight
      mode: 'cors'
    };
    
    console.log(`🔄 [CORS Proxy] Headers set: ${JSON.stringify(Object.fromEntries(headers.entries()))}`);
    
    // Make the fetch request with enhanced options
    const response = await fetch(input, enhancedOptions);
    
    // Log success or error
    if (response.ok) {
      console.log(`✅ [CORS Proxy] Request succeeded: ${response.status} ${response.statusText}`);
    } else {
      console.error(`❌ [CORS Proxy] Request failed: ${response.status} ${response.statusText}`);
      // Try to get error details
      try {
        const errorData = await response.clone().text();
        console.error(`❌ [CORS Proxy] Error details: ${errorData}`);
      } catch (e) {
        console.error(`❌ [CORS Proxy] Could not read error details`);
      }
    }
    
    return response;
  } catch (error) {
    console.error(`❌ [CORS Proxy] Fetch error:`, error);
    // Create a synthetic error response
    return new Response(
      JSON.stringify({
        error: {
          type: 'fetch_error',
          message: error instanceof Error ? error.message : String(error),
          details: 'Error occurred during custom fetch operation'
        }
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

// Earth Engine system prompt with domain expertise
export const GEE_SYSTEM_PROMPT = `You are Earth Engine Assistant, an AI specialized in Google Earth Engine (GEE) geospatial analysis.

Your capabilities:
- Provide code examples for GEE tasks like image processing, classification, and visualization
- Explain Earth Engine concepts, APIs, and best practices
- Help troubleshoot Earth Engine code issues
- Recommend appropriate datasets and methods for geospatial analysis
- You can use tools to get the weather in a location
- You can search for Earth Engine datasets and get documentation
- You can insert JavaScript code directly into the Earth Engine code editor
- You can execute JavaScript code in the Earth Engine environment
- You can take a screenshot of the current browser tab and include it directly in your responses

Workflow for map-related questions:
1. When a user asks about creating a map, visualizing data, or needs geospatial analysis, ALWAYS use the earthEngineDataset tool FIRST to retrieve relevant dataset information
2. Wait for the tool response to get dataset IDs, paths, and documentation
3. Based on the retrieved information, craft appropriate code examples that correctly reference the dataset
4. Provide a complete, working solution that includes proper dataset loading, processing, and visualization
5. If the user reports issues or you need to see the visual output, consider using the screenshot tool to capture the current state of the map or console.

Visual Assistance Workflow:
1. When a user asks about what's on their map or to analyze current visual elements, use the screenshot tool
2. The screenshot will be captured and included directly in your response
3. You can then analyze what's visible in the image and provide context, explanations, or suggestions
4. Use phrases like "As I can see in the screenshot..." when referring to visual elements
5. When analyzing maps, point out relevant features like coastlines, urban areas, vegetation patterns, etc.

Workflow for implementing code:
1. When a user wants to implement/run code, first ensure the code is complete and correct
2. You have TWO options for executing code:
   a. Use the earthEngineScript tool to INSERT the code into the Google Earth Engine editor
   b. Use the earthEngineRunCode tool to DIRECTLY RUN the code in the Earth Engine environment

When to use earthEngineScript vs earthEngineRunCode:
- Use earthEngineScript when the user wants to examine, modify, or save the code before running it
- Use earthEngineRunCode when the user wants immediate results or to execute a quick test
- If the user says "run this code" or "execute this", use earthEngineRunCode
- If the user says "add this code" or "put this in the editor", use earthEngineScript
- When uncertain, use earthEngineScript as it's less invasive

Debugging Workflow:
1. If a user reports an error after running code, ask for the specific error message.
2. Check the code you provided for obvious syntax errors or logical flaws.
3. If the error isn't clear, consider using the screenshot tool to see the GEE console output or map state.
4. Based on the error message and potentially the screenshot, suggest corrections or alternative approaches.

Instructions:
- Always provide code within backticks: \`code\`
- Format Earth Engine code with proper JavaScript/Python syntax
- When suggesting large code blocks, include comments explaining key steps
- Cite specific Earth Engine functions and methods when relevant
- For complex topics, break down explanations step-by-step
- If you're unsure about something, acknowledge limitations rather than providing incorrect information
- When asked about weather, use the weather tool to get real-time information and format it nicely
- When asked about Earth Engine datasets, use the earthEngineDataset tool to get up-to-date documentation
- For ANY map or geospatial visualization request, FIRST use earthEngineDataset tool before providing code
- When a user wants to implement your code suggestion, use the appropriate tool based on their intent
- Use the screenshot tool judiciously when visual context is needed for debugging or understanding results.
- When users ask you to "make a screenshot and tell me about what's going on", use the screenshot tool and analyze the image in your response

Common Earth Engine patterns:
- Image and collection loading: ee.Image(), ee.ImageCollection()
- Filtering: .filterDate(), .filterBounds()
- Reducing: .reduce(), .mean(), .median()
- Visualization: Map.addLayer(), ui.Map(), ui.Chart()
- Classification: .classify(), ee.Classifier.randomForest()
- Exporting: Export.image.toDrive(), Export.table.toAsset()

Dataset-Driven Code Examples:
- After retrieving dataset information using the earthEngineDataset tool, include the exact dataset ID/path in your code
- Match your code examples to the specific bands, properties, and structure of the dataset
- Include appropriate visualization parameters based on the dataset type
- Reference key metadata like resolution, time range, and units when available

Code Implementation:
- When a user asks to implement a code example, offer to insert it directly using the earthEngineScript tool
- When a user asks to run or execute code immediately, use the earthEngineRunCode tool
- Before inserting or running, ensure the code is complete, properly formatted and includes all necessary imports
- Always offer to help troubleshoot any errors that may occur when running the inserted code
- If a user is asked to "try this code", automatically offer to insert or run it for them

Speak in a helpful, educational tone while providing practical guidance for Earth Engine tasks.`;

/**
 * Handle chat messages from the UI
 */
export async function handleChatRequest(messages: Message[], apiKey: string, provider: Provider, model?: string): Promise<Response> {
  try {
    // Debug log at start of request
    console.log(`🔍 [Chat Handler] Request starting with provider: ${provider}, requested model: ${model || 'default'}`);
    
    if (!apiKey) {
      return new Response(JSON.stringify({ 
        error: 'API key not configured',
        message: 'Please set your API key in the extension settings' 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'No messages provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Setup LLM provider
    let llmProvider: ReturnType<typeof createOpenAI> | ReturnType<typeof createAnthropic>;
    let effectiveModel: string;
    
    if (provider === 'openai') {
      llmProvider = createOpenAI({ apiKey });
      effectiveModel = model || DEFAULT_MODELS.openai;
      console.log(`Using OpenAI provider with model: ${effectiveModel}`);
    } else if (provider === 'anthropic') {
      // Check if the requested model exists in our available model list
      const anthropicModels = [
        'claude-3-7-sonnet-20250219',
        'claude-3-5-sonnet-20241022',
        'claude-3-5-haiku-20241022',
        'claude-3-5-sonnet-20240620'
      ];
      
      // Use the requested model if it's in our list, otherwise use the default
      let selectedModel = model;
      if (!selectedModel || !anthropicModels.includes(selectedModel)) {
        console.log(`⚠️ [Chat Handler] Requested Claude model "${model}" not found in available models. Using default.`);
        selectedModel = DEFAULT_MODELS.anthropic;
      }
      
      effectiveModel = selectedModel;
      
      // Create the Anthropic provider
      llmProvider = createAnthropic({ 
        apiKey,
        // Set the correct baseURL for the Anthropic API, without the version path
        baseURL: 'https://api.anthropic.com',
        // Use our custom fetch to handle CORS issues
        fetch: corsProxyFetch,
      });
      
      console.log(`Using Anthropic provider with model: ${effectiveModel} (UI selection was: ${model || 'not specified'})`);
    } else {
      return new Response(JSON.stringify({ error: 'Unsupported API provider' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Message mapping that supports both string content and multi-modal content with parts
    const formattedMessages: CoreMessage[] = messages
      .map((msg): CoreMessage | null => {
        // Handle messages with simple string content
        if ((msg.role === 'user' || msg.role === 'assistant' || msg.role === 'system') && 
            typeof msg.content === 'string') {
          return { role: msg.role, content: msg.content };
        }
        // Handle messages with parts (multi-modal content)
        else if ((msg.role === 'user' || msg.role === 'assistant' || msg.role === 'system') && 
                 msg.parts && Array.isArray(msg.parts)) {
          
          // Log that we're processing a multi-modal message
          console.log('Processing multi-modal message with parts:', msg.parts.length);
          console.log('Multi-modal message parts types:', msg.parts.map(p => p.type).join(', '));
          
          // Build an array of properly-typed parts
          const formattedParts: (TextPart | ImagePart)[] = [];
          
          for (const part of msg.parts) {
            if (part.type === 'text' && part.text) {
              console.log('Processing text part:', part.text.substring(0, 50) + (part.text.length > 50 ? '...' : ''));
              formattedParts.push({ type: 'text', text: part.text } as TextPart);
            } else if (part.type === 'file' && part.mimeType?.startsWith('image/') && part.data) {
              console.log('Processing image attachment in message', {
                mimeType: part.mimeType,
                dataLength: part.data.length,
                dataPrefix: part.data.substring(0, 30) + '...'
              });
              
              // Ensure data URL format is correct (should start with data:image/...)
              let imageData = part.data;
              if (!imageData.startsWith('data:')) {
                imageData = `data:${part.mimeType || 'image/png'};base64,${part.data}`;
                console.log('Added proper data URL prefix to image');
              }
              
              formattedParts.push({ 
                type: 'image', 
                image: imageData,
                mimeType: part.mimeType 
              } as ImagePart);
            }
          }
          
          // Only return if we have valid parts
          if (formattedParts.length > 0) {
            console.log(`Created formatted message with ${formattedParts.length} parts:`, 
              formattedParts.map(p => p.type).join(', '));
            return { role: msg.role, content: formattedParts as any };
          } else {
            console.warn('No valid parts found in multi-modal message');
          }
        }
        console.warn('Filtering out message with incompatible role/content:', msg);
        return null; 
      })
      .filter((msg): msg is CoreMessage => msg !== null);

    // Define the weather tool using the AI SDK tool format
    const weatherTool = tool({
      description: 'Get the weather in a location',
      parameters: z.object({
        location: z.string().describe('The location to get the weather for'),
      }),
      execute: async ({ location }) => {
        // Simulate weather data
        const temperature = 72 + Math.floor(Math.random() * 21) - 10;
        return {
          location,
          temperature,
          description: temperature > 75 ? 'Sunny and warm' : 'Partly cloudy',
          humidity: Math.floor(Math.random() * 30) + 50, // Random humidity between 50-80%
        };
      },
    });

    // Define Earth Engine dataset documentation tool
    const earthEngineDatasetTool = tool({
      description: 'Get information about Earth Engine datasets including documentation and code examples',
      parameters: z.object({
        datasetQuery: z.string().describe('The Earth Engine dataset or topic to search for (e.g., "LANDSAT", "elevation", "MODIS")')
      }),
      execute: async ({ datasetQuery }) => {
        try {
          console.log(`🌍 [EarthEngineDatasetTool] Tool called with query: "${datasetQuery}"`);
          console.time('EarthEngineDatasetTool execution');
          
          // Use the Context7 getDocumentation function to fetch dataset information
          // The Earth Engine dataset catalog is stored in wybert/earthengine-dataset-catalog-md
          const result = await getDocumentation(
            'wybert/earthengine-dataset-catalog-md',
            datasetQuery,
            { tokens: 15000 } // Get a good amount of content
          );
          
          console.timeEnd('EarthEngineDatasetTool execution');
          
          if (!result.success || !result.content) {
            console.warn(`❌ [EarthEngineDatasetTool] No results found for "${datasetQuery}". Error: ${result.message}`);
            return {
              found: false,
              message: result.message || `Could not find documentation for "${datasetQuery}"`,
              suggestion: "Try a more general search term or check the spelling of the dataset name."
            };
          }
          
          console.log(`✅ [EarthEngineDatasetTool] Found documentation for "${datasetQuery}". Content length: ${result.content.length} chars`);
          
          return {
            found: true,
            query: datasetQuery,
            documentation: result.content,
            message: `Documentation found for Earth Engine dataset related to "${datasetQuery}"`
          };
        } catch (error) {
          console.error(`❌ [EarthEngineDatasetTool] Error fetching Earth Engine dataset info:`, error);
          return {
            found: false,
            message: `Error retrieving Earth Engine dataset information: ${error instanceof Error ? error.message : String(error)}`,
            suggestion: "Try again with a different dataset name or more specific query."
          };
        }
      },
    });

    // Define Earth Engine script editor tool
    const earthEngineScriptTool = tool({
      description: 'Insert JavaScript code into the Google Earth Engine code editor',
      parameters: z.object({
        scriptId: z.string().describe('The ID of the script to edit (use "current" for the currently open script)'),
        code: z.string().describe('The Google Earth Engine JavaScript code to insert into the editor')
      }),
      execute: async ({ scriptId, code }) => {
        try {
          console.log(`🔧 [EarthEngineScriptTool] Tool called to edit script "${scriptId}"`);
          console.time('EarthEngineScriptTool execution');
          
          const targetScriptId = scriptId === 'current' ? 'current_editor' : scriptId;
          
          // Check if Chrome tabs API is available
          if (typeof chrome === 'undefined' || !chrome.tabs) {
            console.warn('❌ [EarthEngineScriptTool] Chrome tabs API not available');
            return {
              success: false,
              error: 'Cannot edit Earth Engine scripts: Extension context not available',
              suggestion: "This operation requires running in a Chrome extension environment"
            };
          }
          
          // Find the Earth Engine tab
          const earthEngineTabs = await new Promise<chrome.tabs.Tab[]>((resolve) => {
            chrome.tabs.query({ url: "*://code.earthengine.google.com/*" }, (tabs) => {
              resolve(tabs || []);
            });
          });
          
          if (earthEngineTabs.length === 0) {
            console.warn('❌ [EarthEngineScriptTool] No Earth Engine tab found');
            return {
              success: false,
              error: 'No Earth Engine tab found',
              suggestion: "Please open Google Earth Engine in a browser tab first"
            };
          }
          
          const tabId = earthEngineTabs[0].id;
          if (!tabId) {
            console.warn('❌ [EarthEngineScriptTool] Invalid Earth Engine tab');
            return {
              success: false,
              error: 'Invalid Earth Engine tab',
              suggestion: "Please reload your Earth Engine tab and try again"
            };
          }
          
          console.log(`🔧 [EarthEngineScriptTool] Found Earth Engine tab: ${tabId}`);
          
          // Check/inject content script
          try {
            await new Promise<void>((resolve, reject) => {
              const timeout = setTimeout(() => reject(new Error('Content script ping timed out')), 300);
              chrome.tabs.sendMessage(tabId, { type: 'PING' }, (response) => {
                clearTimeout(timeout);
                if (chrome.runtime.lastError) {
                  reject(new Error(chrome.runtime.lastError.message || 'Error pinging content script'));
                } else {
                  resolve();
                }
              });
            });
            console.log(`🔧 [EarthEngineScriptTool] Content script ready`);
          } catch (pingError: unknown) {
            const errorMessage = pingError instanceof Error ? pingError.message : String(pingError);
            console.log(`🔧 [EarthEngineScriptTool] Content script not ready: ${errorMessage}, injecting...`);
            try {
              await new Promise<void>((resolve, reject) => {
                chrome.scripting.executeScript({
                  target: { tabId },
                  files: ['content.js']
                }, (results) => {
                  if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message || 'Failed to inject content script'));
                  } else {
                    setTimeout(resolve, 500); // Wait for script init
                  }
                });
              });
              console.log(`🔧 [EarthEngineScriptTool] Content script injected successfully`);
            } catch (injectError: unknown) {
              const injectErrorMessage = injectError instanceof Error ? injectError.message : String(injectError);
              console.warn(`❌ [EarthEngineScriptTool] Failed to inject content script: ${injectErrorMessage}`);
              return {
                success: false,
                error: `Content script not available: ${injectErrorMessage}`,
                suggestion: "Try refreshing the Earth Engine tab and ensure the extension has permission"
              };
            }
          }
          
          // Send message to content script
          const result: any = await new Promise((resolve) => {
            chrome.tabs.sendMessage(tabId, { type: 'EDIT_SCRIPT', scriptId: targetScriptId, content: code }, (response) => {
              if (chrome.runtime.lastError) {
                resolve({ success: false, error: chrome.runtime.lastError.message || 'Error communicating with content script' });
              } else {
                resolve(response || { success: false, error: 'No response from content script' });
              }
            });
          });
          
          console.timeEnd('EarthEngineScriptTool execution');
          
          if (!result.success) {
            console.warn(`❌ [EarthEngineScriptTool] Failed to edit script via content script: ${result.error}`);
            return {
              success: false,
              error: result.error || 'Unknown error editing script',
              suggestion: "Check content script logs or ensure EE tab is active."
            };
          }
          
          console.log(`✅ [EarthEngineScriptTool] Successfully edited script "${targetScriptId}"`);
          return {
            success: true,
            scriptId: targetScriptId,
            message: result.message || `Successfully inserted code into Earth Engine script "${targetScriptId}"`,
            nextSteps: "You can now run the script in Earth Engine by clicking the 'Run' button"
          };
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`❌ [EarthEngineScriptTool] Unexpected error:`, error);
          return {
            success: false,
            error: `Unexpected error in EarthEngineScriptTool: ${errorMessage}`,
            suggestion: "Check background script logs for more details"
          };
        }
      },
    });

    // Define Earth Engine code runner tool
    const earthEngineRunCodeTool = tool({
      description: 'Run JavaScript code in the Google Earth Engine code editor',
      parameters: z.object({
        code: z.string().describe('The Google Earth Engine JavaScript code to run in the editor')
      }),
      execute: async ({ code }) => {
        try {
          console.log(`🏃 [EarthEngineRunCodeTool] Tool called to run code`);
          console.time('EarthEngineRunCodeTool execution');
          
          // Check if Chrome tabs API is available
          if (typeof chrome === 'undefined' || !chrome.tabs) {
            console.warn('❌ [EarthEngineRunCodeTool] Chrome tabs API not available');
            return {
              success: false,
              error: 'Cannot run Earth Engine code: Extension context not available',
              suggestion: "This operation requires running in a Chrome extension environment"
            };
          }
          
          // Find the Earth Engine tab
          const earthEngineTabs = await new Promise<chrome.tabs.Tab[]>((resolve) => {
            chrome.tabs.query({ url: "*://code.earthengine.google.com/*" }, (tabs) => {
              resolve(tabs || []);
            });
          });
          
          if (earthEngineTabs.length === 0) {
            console.warn('❌ [EarthEngineRunCodeTool] No Earth Engine tab found');
            return {
              success: false,
              error: 'No Earth Engine tab found',
              suggestion: "Please open Google Earth Engine in a browser tab first"
            };
          }
          
          const tabId = earthEngineTabs[0].id;
          if (!tabId) {
            console.warn('❌ [EarthEngineRunCodeTool] Invalid Earth Engine tab');
            return {
              success: false,
              error: 'Invalid Earth Engine tab',
              suggestion: "Please reload your Earth Engine tab and try again"
            };
          }
          
          console.log(`🏃 [EarthEngineRunCodeTool] Found Earth Engine tab: ${tabId}`);
          
          // Check/inject content script
          try {
            await new Promise<void>((resolve, reject) => {
              const timeout = setTimeout(() => reject(new Error('Content script ping timed out')), 300);
              chrome.tabs.sendMessage(tabId, { type: 'PING' }, (response) => {
                clearTimeout(timeout);
                if (chrome.runtime.lastError) {
                  reject(new Error(chrome.runtime.lastError.message || 'Error pinging content script'));
                } else {
                  resolve();
                }
              });
            });
            console.log(`🏃 [EarthEngineRunCodeTool] Content script ready`);
          } catch (pingError: unknown) {
            const errorMessage = pingError instanceof Error ? pingError.message : String(pingError);
            console.log(`🏃 [EarthEngineRunCodeTool] Content script not ready: ${errorMessage}, injecting...`);
            try {
              await new Promise<void>((resolve, reject) => {
                chrome.scripting.executeScript({
                  target: { tabId },
                  files: ['content.js']
                }, (results) => {
                  if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message || 'Failed to inject content script'));
                  } else {
                    setTimeout(resolve, 500); // Wait for script init
                  }
                });
              });
              console.log(`🏃 [EarthEngineRunCodeTool] Content script injected successfully`);
            } catch (injectError: unknown) {
              const injectErrorMessage = injectError instanceof Error ? injectError.message : String(injectError);
              console.warn(`❌ [EarthEngineRunCodeTool] Failed to inject content script: ${injectErrorMessage}`);
              return {
                success: false,
                error: `Content script not available: ${injectErrorMessage}`,
                suggestion: "Try refreshing the Earth Engine tab and ensure the extension has permission"
              };
            }
          }
          
          // Send message to content script
          const result: any = await new Promise((resolve) => {
            chrome.tabs.sendMessage(tabId, { type: 'RUN_CODE', code }, (response) => {
              if (chrome.runtime.lastError) {
                resolve({ success: false, error: chrome.runtime.lastError.message || 'Error communicating with content script' });
              } else {
                resolve(response || { success: false, error: 'No response from content script' });
              }
            });
          });
          
          console.timeEnd('EarthEngineRunCodeTool execution');
          
          if (!result.success) {
            console.warn(`❌ [EarthEngineRunCodeTool] Failed to run code via content script: ${result.error}`);
            return {
              success: false,
              error: result.error || 'Unknown error running code',
              suggestion: "Check content script logs or ensure EE tab is active."
            };
          }
          
          console.log(`✅ [EarthEngineRunCodeTool] Successfully ran code with result: ${result.result || 'No result returned'}`);
          return {
            success: true,
            result: result.result || 'Code executed successfully',
            message: 'Earth Engine code executed successfully',
            nextSteps: "Check the Earth Engine console for any output or results"
          };
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`❌ [EarthEngineRunCodeTool] Unexpected error:`, error);
          return {
            success: false,
            error: `Unexpected error in EarthEngineRunCodeTool: ${errorMessage}`,
            suggestion: "Check background script logs for more details"
          };
        }
      },
    });

    // Define Screenshot tool
    const screenshotTool = tool({
      description: 'Capture a screenshot of the current active browser tab. Useful for seeing map visualizations, console errors, or task status in Google Earth Engine.',
      parameters: z.object({}), // No parameters needed
      execute: async () => {
        try {
          console.log(`📸 [ScreenshotTool] Tool called`);
          console.time('ScreenshotTool execution');

          // Check if Chrome tabs API is available
          if (typeof chrome === 'undefined' || !chrome.tabs) {
            console.warn('❌ [ScreenshotTool] Chrome tabs API not available');
            return {
              success: false,
              error: 'Cannot take screenshots: Extension context not available',
            };
          }

          // Get the active tab in the current window
          const tabs = await new Promise<chrome.tabs.Tab[]>((resolve) => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              resolve(tabs || []);
            });
          });

          if (!tabs || tabs.length === 0) {
            console.warn('❌ [ScreenshotTool] No active tab found');
            return {
              success: false,
              error: 'No active tab found',
            };
          }

          const activeTab = tabs[0];
          if (!activeTab.id || !activeTab.windowId) {
             console.warn('❌ [ScreenshotTool] Invalid active tab information');
            return {
              success: false,
              error: 'Could not get active tab information',
            };
          }
          
          console.log(`📸 [ScreenshotTool] Capturing visible area of tab ${activeTab.id}`);

          // Capture the visible tab area with reduced quality
          const dataUrl = await new Promise<string>((resolve, reject) => {
             chrome.tabs.captureVisibleTab(activeTab.windowId, { format: 'jpeg', quality: 50 }, (dataUrl) => {
               if (chrome.runtime.lastError) {
                 reject(new Error(chrome.runtime.lastError.message || 'Unknown error capturing tab'));
               } else if (!dataUrl) {
                  reject(new Error('captureVisibleTab returned empty data URL'));
               } else {
                 resolve(dataUrl);
               }
             });
          });

          // Resize the image in the active tab's content script
          let resizedDataUrl = dataUrl;
          try {
            if (activeTab.id) {
              // Inject and execute the resizing script in the active tab
              const results = await chrome.scripting.executeScript({
                target: { tabId: activeTab.id },
                func: (imgSrc: string, maxWidth: number) => {
                  return new Promise<string>((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => {
                      const canvas = document.createElement('canvas');
                      let width = img.width;
                      let height = img.height;
                      
                      // Calculate new dimensions while maintaining aspect ratio
                      if (width > maxWidth) {
                        const ratio = maxWidth / width;
                        width = maxWidth;
                        height = Math.floor(height * ratio);
                      }
                      
                      canvas.width = width;
                      canvas.height = height;
                      
                      const ctx = canvas.getContext('2d');
                      if (!ctx) {
                        reject('Could not get canvas context');
                        return;
                      }
                      
                      // Draw and compress
                      ctx.drawImage(img, 0, 0, width, height);
                      
                      // Return as JPEG with reduced quality
                      const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.5);
                      resolve(resizedDataUrl);
                    };
                    
                    img.onerror = () => reject('Error loading image for resizing');
                    img.src = imgSrc;
                  });
                },
                args: [dataUrl, 640] // Limit width to 640px max
              });
              
              if (results && results[0] && results[0].result) {
                resizedDataUrl = results[0].result as string;
                console.log(`📸 [ScreenshotTool] Successfully resized image: ${resizedDataUrl.length} bytes`);
              }
            }
          } catch (resizeError) {
            console.warn(`📸 [ScreenshotTool] Error resizing image:`, resizeError);
            // Continue with original image if resize fails
          }
          
          console.timeEnd('ScreenshotTool execution');
          console.log(`✅ [ScreenshotTool] Screenshot captured (data URL length: ${resizedDataUrl.length})`);
          
          // Log the full screenshot data URL for viewing in a new tab
          console.log('🖼️ [ScreenshotTool] SCREENSHOT DATA URL FOR VIEWING:');
          console.log(resizedDataUrl);
          console.log('🖼️ [ScreenshotTool] END OF SCREENSHOT DATA URL');

          // Return result with screenshot data
          return {
            success: true,
            message: 'Screenshot captured successfully.',
            screenshotDataUrl: resizedDataUrl
          };

        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`❌ [ScreenshotTool] Error capturing screenshot:`, error);
          console.timeEnd('ScreenshotTool execution'); // Ensure timeEnd is called on error
          return {
            success: false,
            error: `Error taking screenshot: ${errorMessage}`,
          };
        }
      },
      // Fix experimental_toToolResultContent to match expected type signature
      experimental_toToolResultContent: (result: any) => {
        console.log('📸 [ScreenshotTool] Converting result to tool content');
        
        if (!result.success) {
          // Return error as text
          return [{ type: 'text', text: `Error taking screenshot: ${result.error || 'Unknown error'}` }];
        }
        
        // Extract the base64 content from the data URL
        let base64Data = result.screenshotDataUrl;
        // Remove the data URL prefix if it exists (e.g., "data:image/jpeg;base64,")
        if (base64Data.includes(';base64,')) {
          base64Data = base64Data.split(';base64,')[1];
          console.log('📸 [ScreenshotTool] Extracted base64 data from data URL');
        }
        
        // Return both text and image for successful screenshots
        return [
          { type: 'text', text: 'Here is the screenshot of the current browser tab:' },
          { type: 'image', data: base64Data, mimeType: 'image/jpeg' }
        ];
      },
    });

    // Define Browser Snapshot tool
    const snapshotTool = tool({
      description: 'Capture an accessibility snapshot of the current active browser tab. Provides DOM structure and element references.',
      parameters: z.object({}), // No parameters needed
      execute: async () => {
        try {
          console.log('🔎 [SnapshotTool] Tool called in background');
          console.time('SnapshotTool execution - background part');

          if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.scripting) {
            console.warn('❌ [SnapshotTool] Chrome API not available in this context');
            return {
              success: false,
              error: 'Chrome API not available for snapshot tool',
            };
          }

          // Get the active tab
          const tabs = await new Promise<chrome.tabs.Tab[]>((resolve) => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              resolve(tabs || []);
            });
          });

          if (!tabs || tabs.length === 0) {
            console.warn('❌ [SnapshotTool] No active tab found');
            return { success: false, error: 'No active tab found' };
          }
          const activeTab = tabs[0];
          if (!activeTab.id) {
            console.warn('❌ [SnapshotTool] Active tab has no ID');
            return { success: false, error: 'Active tab has no ID' };
          }
          const tabId = activeTab.id;

          // Check/inject content script (simplified, assumes content script is generally available or injected by other means)
          // A more robust implementation would ping/inject like earthEngineScriptTool
          try {
            await new Promise<void>((resolve, reject) => {
              const timeout = setTimeout(() => reject(new Error('Content script ping timed out for SnapshotTool')), 500);
              chrome.tabs.sendMessage(tabId, { type: 'PING' }, (response) => {
                clearTimeout(timeout);
                if (chrome.runtime.lastError) {
                  console.warn(`[SnapshotTool] Ping failed: ${chrome.runtime.lastError.message}, attempting to inject.`);
                  // Attempt to inject if ping fails
                  chrome.scripting.executeScript({
                    target: { tabId },
                    files: ['content.js'],
                  }, (injectionResults) => {
                    if (chrome.runtime.lastError) {
                      reject(new Error(`Failed to inject content script: ${chrome.runtime.lastError.message}`));
                    } else {
                      console.log('[SnapshotTool] Content script injected, assuming ready.');
                      setTimeout(resolve, 500); // Give script time to load
                    }
                  });
                } else if (response && response.type === 'PONG') {
                  console.log('[SnapshotTool] Content script responded to PING.');
                  resolve();
                } else {
                  // Ping successful but no PONG, or unexpected response, try injecting
                  console.warn('[SnapshotTool] Ping response not as expected, attempting to inject.');
                   chrome.scripting.executeScript({
                    target: { tabId },
                    files: ['content.js'],
                  }, (injectionResults) => {
                    if (chrome.runtime.lastError) {
                      reject(new Error(`Failed to inject content script: ${chrome.runtime.lastError.message}`));
                    } else {
                      console.log('[SnapshotTool] Content script injected after failed ping logic, assuming ready.');
                      setTimeout(resolve, 500); // Give script time to load
                    }
                  });
                }
              });
            });
          } catch (err) {
            console.error('❌ [SnapshotTool] Content script check/injection failed:', err);
            return { success: false, error: err instanceof Error ? err.message : 'Content script not available' };
          }

          // Send message to content script to perform the snapshot
          const resultFromContentScript: SnapshotResponse = await new Promise((resolve) => {
            chrome.tabs.sendMessage(tabId, { type: 'TAKE_ACCESSIBILITY_SNAPSHOT' }, (response) => {
              if (chrome.runtime.lastError) {
                resolve({ success: false, error: chrome.runtime.lastError.message || 'Error communicating with content script for snapshot' });
              } else {
                resolve(response || { success: false, error: 'No response from content script for snapshot' });
              }
            });
          });

          console.timeEnd('SnapshotTool execution - background part');
          console.log(`✅ [SnapshotTool] Snapshot result from content script. Success: ${resultFromContentScript.success}`);
          if (resultFromContentScript.success && resultFromContentScript.snapshot) {
            console.log('🔎 [SnapshotTool] Full snapshot data in execute (copy from here):');
            console.log(resultFromContentScript.snapshot);
          } else if (!resultFromContentScript.success) {
            console.error('❌ [SnapshotTool] Snapshot failed in content script:', resultFromContentScript.error);
          }
          
          return resultFromContentScript; // This should be SnapshotResponse { success: boolean, snapshot?: string, error?: string }

        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`❌ [SnapshotTool] Error in execute block:`, error);
          console.timeEnd('SnapshotTool execution - background part');
          return {
            success: false,
            error: `Error taking snapshot: ${errorMessage}`,
          };
        }
      },
      experimental_toToolResultContent: (result: any) => {
        console.log('🔎 [SnapshotTool] Converting result to tool content');
        
        if (!result.success) {
          console.error('❌ [SnapshotTool] Error in toToolResultContent - result not successful:', result.error);
          return [{ type: 'text', text: `Error taking snapshot: ${result.error || 'Unknown error'}` }];
        }

        if (result.snapshot) {
          console.log('🔎 [SnapshotTool] Full snapshot data for UI conversion (copy from here):');
          console.log(result.snapshot);
        } else {
          console.warn('⚠️ [SnapshotTool] No snapshot data found in result for UI conversion, though success was true.');
           return [{ type: 'text', text: 'Snapshot tool succeeded but no snapshot data was returned.' }];
        }
        
        // Return the snapshot data as text
        return [
          { type: 'text', text: 'Here is the accessibility snapshot of the current browser tab:\n' + result.snapshot }
        ];
      },
    });

    // Log the final messages being sent to AI provider
    console.log(`[Chat Handler] Sending ${formattedMessages.length} messages to AI provider ${provider} (${effectiveModel})`);
    
    // Log detailed information about formatted messages
    console.log('📝 [Chat Handler] FORMATTED MESSAGES DETAILED LOG:');
    console.log(JSON.stringify(formattedMessages, (key, value) => {
      // For image data, truncate the string to avoid console flooding
      if (key === 'image' && typeof value === 'string' && value.length > 100) {
        return value.substring(0, 100) + '... [truncated]';
      }
      return value;
    }, 2));
    console.log('📝 [Chat Handler] END OF FORMATTED MESSAGES LOG');
    
    // Log details of messages with image parts for debugging
    formattedMessages.forEach((msg, idx) => {
      if (Array.isArray(msg.content)) {
        const partTypes = msg.content.map(p => p.type).join(', ');
        console.log(`[Chat Handler] Message ${idx} (${msg.role}) contains parts: ${partTypes}`);
        
        // Log image parts specifically
        const imageParts = msg.content.filter(p => p.type === 'image');
        if (imageParts.length > 0) {
          console.log(`[Chat Handler] Message ${idx} contains ${imageParts.length} image parts`);
          imageParts.forEach((p: any, i) => {
            console.log(`[Chat Handler] Image ${i+1} data type: ${typeof p.image}, length: ${
              typeof p.image === 'string' ? p.image.substring(0, 50) + '...' : 'non-string'
            }`);
            
            // Log full image data for viewing in a new tab
            if (typeof p.image === 'string') {
              console.log(`🖼️ [Chat Handler] IMAGE ${i+1} DATA URL FOR VIEWING:`);
              console.log(p.image);
              console.log(`🖼️ [Chat Handler] END OF IMAGE ${i+1} DATA URL`);
            }
          });
        }
      } else {
        console.log(`[Chat Handler] Message ${idx} (${msg.role}): Simple string content`);
        console.log(`Content: ${typeof msg.content === 'string' ? msg.content.substring(0, 100) + '...' : 'non-string content'}`);
      }
    });
    
    console.log(`🚀 [Chat Handler] Starting AI stream with provider: ${provider}, model: ${effectiveModel}`);
    console.time('streamText execution');
    
    // Configure stream options based on provider
    let streamOptions: any = {
      model: llmProvider(effectiveModel),
      system: GEE_SYSTEM_PROMPT,
      messages: formattedMessages,
      tools: {
        weather: weatherTool,
        earthEngineDataset: earthEngineDatasetTool,
        earthEngineScript: earthEngineScriptTool,
        earthEngineRunCode: earthEngineRunCodeTool,
        screenshot: screenshotTool,
        snapshot: snapshotTool
      },
      maxSteps: 5, // Allow up to 5 steps
      temperature: 0.7,
    };
    
    // For Anthropic models, add special headers for browser usage
    if (provider === 'anthropic') {
      console.log(`🔧 [Chat Handler] Adding special headers for Anthropic browser usage`);
      streamOptions.headers = {
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      };
      // Enable experimental content for multi-modal tool responses (supported by Anthropic)
      streamOptions.experimental_enableToolContentInResult = true;
    }
    
    console.log(`📊 [Chat Handler] Final stream configuration:`, JSON.stringify(streamOptions, (k, v) => 
      k === 'messages' ? '[Messages array]' : (k === 'tools' ? '[Tools object]' : v), 2));
    
    // Use streamText for AI generation with tools
    const result = await streamText(streamOptions);
    
    console.timeEnd('streamText execution');
    console.log(`✅ [Chat Handler] Completed streamText call. Converting to text stream response.`);
    
    // Debug the result object to see what we got back
    console.log(`📊 [Chat Handler] Result type: ${typeof result}`);
    console.log(`📊 [Chat Handler] Result keys: ${Object.keys(result).join(', ')}`);
    
    // If there were tool calls, log them
    if (result.toolCalls && Array.isArray(result.toolCalls)) {
      console.log(`🛠️ [Chat Handler] Tool calls made: ${result.toolCalls.length}`);
      result.toolCalls.forEach((call, idx) => {
        console.log(`🛠️ [Chat Handler] Tool call ${idx+1}: ${call.name || 'unnamed'}`);
        if (call.args) {
          console.log(`🛠️ [Chat Handler] Tool call args: ${JSON.stringify(call.args)}`);
        }
        if (call.result) {
          console.log(`🛠️ [Chat Handler] Tool call result status: ${call.result.success ? 'success' : 'failure'}`);
        }
      });
    }
    
    // Convert to text stream response
    return result.toTextStreamResponse();
  } catch (error: any) {
    console.error('Chat handler error:', error);
    return new Response(JSON.stringify({ 
      error: 'Chat processing failed',
      message: error instanceof Error ? error.message : 'Unknown error occurred' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}