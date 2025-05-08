import { Message, CoreMessage, streamText, tool } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { getDocumentation } from '../lib/tools/context7';

// Available providers
export type Provider = 'openai' | 'anthropic';

// Default models configuration
export const DEFAULT_MODELS: Record<Provider, string> = {
  openai: 'gpt-4o',
  anthropic: 'claude-3-7-sonnet-20250219'
};

// API versions
export const API_VERSIONS: Record<Provider, string> = {
  openai: '2023-01-01',
  anthropic: '2023-06-01'
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
  console.log(`[chat-handler] handleChatRequest called with provider: ${provider}`);
  try {
    if (!apiKey) {
      console.error('[chat-handler] No API key provided');
      return new Response(JSON.stringify({ 
        error: 'API key not configured',
        message: 'Please set your API key in the extension settings' 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.error('[chat-handler] No valid messages provided');
      return new Response(JSON.stringify({ error: 'No messages provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Setup LLM provider
    let llmProvider: ReturnType<typeof createOpenAI> | ReturnType<typeof createAnthropic>;
    let effectiveModel: string;
    
    if (provider === 'openai') {
      console.log(`[chat-handler] Using OpenAI provider${model ? ` with model ${model}` : ''}`);
      llmProvider = createOpenAI({ apiKey });
      
      // Validate model - ensure we're using an OpenAI model
      if (model && (model.includes('claude') || !model.includes('gpt'))) {
        console.warn(`[chat-handler] Warning: ${model} appears to be an Anthropic model but provider is OpenAI, defaulting to ${DEFAULT_MODELS.openai}`);
        effectiveModel = DEFAULT_MODELS.openai;
      } else {
        effectiveModel = model || DEFAULT_MODELS.openai;
      }
    } else if (provider === 'anthropic') {
      console.log(`[chat-handler] Using Anthropic provider${model ? ` with model ${model}` : ''}`);
      
      // Enhanced configuration for Anthropic
      const anthropicOptions = { 
        apiKey,
        // Explicitly define the headers needed for Anthropic browser requests
        headers: {
          'anthropic-dangerous-direct-browser-access': 'true'
        }
      };
      
      console.log('[chat-handler] Initializing Anthropic provider with browser support headers');
      llmProvider = createAnthropic(anthropicOptions);
      
      // Validate model - ensure we're using an Anthropic model
      if (model && !model.includes('claude')) {
        console.warn(`[chat-handler] Warning: ${model} doesn't appear to be an Anthropic model but provider is Anthropic, defaulting to ${DEFAULT_MODELS.anthropic}`);
        effectiveModel = DEFAULT_MODELS.anthropic;
      } else {
        effectiveModel = model || DEFAULT_MODELS.anthropic;
      }
    } else {
      console.error(`[chat-handler] Unsupported provider: ${provider}`);
      return new Response(JSON.stringify({ error: 'Unsupported API provider' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`[chat-handler] Using model: ${effectiveModel}`);

    // Simplified message mapping for basic CoreMessage structure
    const formattedMessages: CoreMessage[] = messages
      .map((msg): CoreMessage | null => {
        // Only include user, assistant, and system roles with simple string content
        if ((msg.role === 'user' || msg.role === 'assistant' || msg.role === 'system') && 
            typeof msg.content === 'string') {
          return { role: msg.role, content: msg.content };
        }
        console.warn('[chat-handler] Filtering out message with incompatible role/content:', msg);
        return null; 
      })
      .filter((msg): msg is CoreMessage => msg !== null);

    // Log the first user message for debugging (without logging whole conversation)
    const userMsg = formattedMessages.find(m => m.role === 'user');
    if (userMsg) {
      const content = typeof userMsg.content === 'string' 
        ? userMsg.content 
        : 'Non-string content';
      console.log(`[chat-handler] User query: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`);
    }

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

          // Return multi-modal response with both text and image
          return {
            success: true,
            message: 'Screenshot captured successfully.',
            screenshotDataUrl: resizedDataUrl,
            content: [
              {
                type: 'text',
                text: 'Here is the screenshot of the current browser tab:'
              },
              {
                type: 'image',
                data: resizedDataUrl
              }
            ]
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
    });

    // Use streamText for AI generation with tools
    try {
      console.log('[chat-handler] Calling streamText with tools');
      
      // Add extra debug log for request
      try {
        // Safely get the last message content preview
        const lastMessage = formattedMessages[formattedMessages.length-1];
        let lastMessagePreview = "No message";
        if (lastMessage && typeof lastMessage.content === 'string') {
          lastMessagePreview = lastMessage.content.substring(0, 50) + (lastMessage.content.length > 50 ? '...' : '');
        }
        
        console.log(`[chat-handler] streamText request details: 
          - Provider: ${provider}
          - Model: ${effectiveModel}
          - System prompt length: ${GEE_SYSTEM_PROMPT.length} chars
          - User messages: ${formattedMessages.length}
          - Last message preview: "${lastMessagePreview}"
        `);
        
        // Configure provider-specific fetch options
        let customFetchOptions: any = {};
        
        // Create a CORS-safe fetch implementation with provider-specific headers
        const enhancedProxyFetch = async (url: string, options: RequestInit) => {
          console.log(`[chat-handler] Making API request to: ${url} using ${provider} provider`);
          
          // Deep clone the options to avoid modifying the original
          const fetchOptions = JSON.parse(JSON.stringify({
            ...options,
            headers: { ...options.headers }
          }));
          
          // Set up provider-specific headers
          const requestHeaders = fetchOptions.headers as Record<string, string>;
          
          if (provider === 'anthropic') {
            // Ensure Anthropic headers are correctly set up
            console.log('[chat-handler] Setting up Anthropic-specific headers for browser request');
            
            // Remove Authorization header if present (Anthropic uses x-api-key)
            if (requestHeaders.Authorization) {
              console.log('[chat-handler] Removing Authorization header for Anthropic request');
              delete requestHeaders.Authorization;
            }
            
            // Add required Anthropic headers
            console.log('[chat-handler] Adding x-api-key and anthropic headers');
            requestHeaders['x-api-key'] = apiKey;
            requestHeaders['anthropic-version'] = '2023-06-01';
            requestHeaders['anthropic-dangerous-direct-browser-access'] = 'true';
            
            // Ensure content-type is correctly set
            requestHeaders['Content-Type'] = 'application/json';
          }
          
          // Don't log API keys to console
          const sanitizedHeaders = {...requestHeaders};
          if (sanitizedHeaders['Authorization']) {
            sanitizedHeaders['Authorization'] = '***API KEY REDACTED***';
          }
          if (sanitizedHeaders['x-api-key']) {
            sanitizedHeaders['x-api-key'] = '***API KEY REDACTED***';
          }
          console.log(`[chat-handler] Request headers:`, sanitizedHeaders);
          console.log(`[chat-handler] Request method: ${fetchOptions.method}`);
          
          if (fetchOptions.body) {
            try {
              // Try to parse and log the body for debugging
              const bodyObj = JSON.parse(fetchOptions.body as string);
              console.log(`[chat-handler] Request body (model): ${bodyObj.model}`);
              console.log(`[chat-handler] Request body structure:`, 
                {
                  messageCount: bodyObj.messages?.length || 0,
                  hasSystem: !!bodyObj.system,
                  maxTokens: bodyObj.max_tokens
                }
              );
            } catch (e) {
              console.log('[chat-handler] Could not parse request body for logging');
            }
          }

          try {
            // Use chrome extension's privileged fetch which bypasses CORS
            console.log('[chat-handler] Sending fetch request...');
            const response = await fetch(url, {
              ...fetchOptions,
              headers: requestHeaders,
              mode: 'cors',
              credentials: 'omit'
            });
            
            console.log(`[chat-handler] API response status: ${response.status}`);
            console.log(`[chat-handler] API response type: ${response.type}`);
            
            // Log response headers for debugging
            const responseHeadersLog: Record<string, string> = {};
            response.headers.forEach((value, key) => {
              responseHeadersLog[key] = value;
            });
            console.log('[chat-handler] Response headers:', responseHeadersLog);
            
            // Check for error status
            if (!response.ok) {
              const errorBody = await response.text();
              console.error(`[chat-handler] API error response: ${errorBody}`);
              
              // Add provider-specific error messages
              if (provider === 'anthropic' && response.status === 200 && !errorBody) {
                console.error('[chat-handler] Anthropic API returned empty response with status 200. This could be due to incorrect model name or API key format issues.');
              } else if (response.status === 401) {
                console.error(`[chat-handler] Authentication error with ${provider}: Invalid API key or authentication failure`);
              } else if (response.status === 403) {
                console.error(`[chat-handler] Authorization error with ${provider}: API key does not have access to the requested resource`);
              } else if (response.status === 429) {
                console.error(`[chat-handler] Rate limit error with ${provider}: Too many requests`);
              } else if (response.status >= 500) {
                console.error(`[chat-handler] Server error with ${provider}: The provider API is experiencing issues`);
              }
              
              throw new Error(`${provider} API returned error ${response.status}: ${errorBody}`);
            }
            
            return response;
          } catch (error) {
            console.error(`[chat-handler] Fetch error with ${provider}:`, error);
            throw error;
          }
        };
        
        // Configure the appropriate LLM provider with enhanced fetch
        if (provider === 'anthropic') {
          // Special configuration for Anthropic - use x-api-key and properly structured options
          console.log('[chat-handler] Setting up Anthropic provider with the following config:');
          console.log(`[chat-handler] - Model: ${effectiveModel}`);
          console.log('[chat-handler] - Using custom fetch wrapper with CORS headers');
          
          // Create properly formatted Anthropic provider
          llmProvider = createAnthropic({
            apiKey,
            fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
              // Convert input to string URL
              const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
              
              console.log(`[chat-handler] Making API request to: ${url} using Anthropic provider`);
              
              // Deep clone the options to avoid modifying the original
              const fetchOptions = JSON.parse(JSON.stringify({
                ...init,
                headers: { ...(init?.headers || {}) }
              }));
              
              // Ensure Anthropic headers are correctly set up
              const requestHeaders = fetchOptions.headers as Record<string, string>;
              requestHeaders['anthropic-dangerous-direct-browser-access'] = 'true';
              
              try {
                const response = await fetch(url, fetchOptions);
                
                // Debug information for non-successful responses
                if (!response.ok) {
                  const errorText = await response.text();
                  console.log(`[chat-handler] API error response: ${errorText}`);
                  
                  // Special handling for 404 errors which usually indicate model not found
                  if (response.status === 404) {
                    console.error(`[chat-handler] Error 404: Model "${effectiveModel}" not found. Please verify the model ID is exactly correct.`);
                    console.error(`[chat-handler] Valid Anthropic model IDs include: claude-3-7-sonnet-20250219, claude-3-5-sonnet-20241022, claude-3-5-haiku-20241022`);
                  }
                  
                  throw new Error(`Anthropic API returned error ${response.status}: ${errorText}`);
                }
                
                return response;
              } catch (error) {
                console.error(`[chat-handler] Fetch error with ${provider}:`, error);
                throw error;
              }
            }
          });
          
          // Make a direct test call to verify API connectivity
          try {
            console.log('[chat-handler] Making a diagnostic direct API call to Anthropic');
            const testResponse = await fetch('https://api.anthropic.com/v1/messages', {
              method: 'POST',
              headers: {
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'Content-Type': 'application/json',
                'anthropic-dangerous-direct-browser-access': 'true'
              },
              body: JSON.stringify({
                model: effectiveModel,
                max_tokens: 10,
                messages: [
                  { role: 'user', content: 'Test message' }
                ]
              })
            });
            
            console.log(`[chat-handler] Anthropic test response status: ${testResponse.status}`);
            
            if (testResponse.ok) {
              try {
                const textData = await testResponse.text();
                console.log(`[chat-handler] Anthropic test response body: ${textData.substring(0, 100)}...`);
                try {
                  const jsonData = JSON.parse(textData);
                  console.log('[chat-handler] Parsed JSON response successfully:', jsonData.content?.[0]?.text || 'No content field');
                } catch (e) {
                  console.warn('[chat-handler] Could not parse response as JSON:', e);
                }
              } catch (e) {
                console.warn('[chat-handler] Could not read response text:', e);
              }
            } else {
              console.error(`[chat-handler] Anthropic test failed with status ${testResponse.status}`);
              try {
                const errorText = await testResponse.text();
                console.error(`[chat-handler] Error response: ${errorText}`);
              } catch (e) {
                console.error('[chat-handler] Could not read error response:', e);
              }
            }
          } catch (e) {
            console.error('[chat-handler] Diagnostic API call failed:', e);
          }
        } else {
          // OpenAI uses standard Authorization header
          llmProvider = createOpenAI({ 
            apiKey,
            fetch: (input: RequestInfo | URL, init?: RequestInit) => {
              // Cast to string if it's a URL or Request
              const url = typeof input === 'string' ? input : input.toString();
              return enhancedProxyFetch(url, init || {});
            }
          });
        }
        
        const result = await streamText({
          model: llmProvider(effectiveModel),
          system: GEE_SYSTEM_PROMPT,
          messages: formattedMessages,
          tools: {
            weather: weatherTool,
            earthEngineDataset: earthEngineDatasetTool,
            earthEngineScript: earthEngineScriptTool,
            earthEngineRunCode: earthEngineRunCodeTool,
            screenshot: screenshotTool
          },
          maxSteps: 5, // Allow up to 5 steps
          temperature: 0.2,
          // Enable experimental content for multi-modal tool responses (supported by Anthropic)
          experimental_enableToolContentInResult: true
        } as any); // Type assertion to avoid compile errors with experimental parameters
        
        console.log('[chat-handler] streamText returned successfully');
        
        // Get response and add debugging for the stream
        const response = result.toTextStreamResponse();
        
        // Wrap the original stream with debugging
        const originalBody = response.body;
        if (originalBody) {
          const reader = originalBody.getReader();
          const debugStream = new ReadableStream({
            async start(controller) {
              let chunkCount = 0;
              let totalBytes = 0;
              
              try {
                while (true) {
                  const { done, value } = await reader.read();
                  
                  if (done) {
                    console.log(`[chat-handler] Stream complete. Received ${chunkCount} chunks, ${totalBytes} total bytes.`);
                    
                    // Add diagnostic for zero chunks with Anthropic
                    if (chunkCount === 0 && provider === 'anthropic') {
                      console.warn(`[chat-handler] Warning: No chunks received from Anthropic API.
                        This could indicate:
                        1. Anthropic API key issues - check the format (should start with sk-ant-)
                        2. Model compatibility issues - using ${effectiveModel}
                        3. CORS issues - check for network errors
                        4. Empty response from Anthropic API`);
                    }
                    
                    controller.close();
                    break;
                  }
                  
                  // Log chunk info
                  chunkCount++;
                  totalBytes += value.length;
                  const text = new TextDecoder().decode(value, { stream: true });
                  console.log(`[chat-handler] Stream chunk ${chunkCount}: ${value.length} bytes, text: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
                  
                  // Forward chunk to new stream
                  controller.enqueue(value);
                }
              } catch (error) {
                console.error(`[chat-handler] Stream reading error:`, error);
                controller.error(error);
              }
            }
          });
          
          // Return a new response with the debug stream
          return new Response(debugStream, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
          });
        }
        
        return response;
      } catch (streamError: unknown) {
        console.error('[chat-handler] Error in streamText call:', streamError);
        
        // Try to extract meaningful error information
        let errorMessage = 'An error occurred while processing your request';
        let statusCode = 500;
        
        if (streamError instanceof Error) {
          errorMessage = streamError.message;
          
          // Check for common API errors
          if (errorMessage.includes('API key')) {
            statusCode = 401;
            errorMessage = 'Invalid API key. Please check your API key in the extension settings.';
          } else if (errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
            statusCode = 429;
            errorMessage = 'Rate limit exceeded. Please try again later.';
          } else if (errorMessage.includes('CORS') || errorMessage.includes('fetch')) {
            statusCode = 500;
            errorMessage = 'CORS error: The extension cannot connect to the API directly. This is likely a configuration issue.';
            console.error('[chat-handler] CORS error details:', streamError);
          }
        }
        
        return new Response(JSON.stringify({ 
          error: 'Chat processing failed',
          message: errorMessage
        }), {
          status: statusCode,
          headers: { 'Content-Type': 'application/json' }
        });
      }
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