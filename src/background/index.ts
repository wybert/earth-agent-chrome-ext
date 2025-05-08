import { handleChatRequest, DEFAULT_MODELS } from './chat-handler';
import { resolveLibraryId, getDocumentation } from '../lib/tools/context7';

// Types for messages between components
interface Message {
  type: string;
  payload?: any;
  [key: string]: any; // Allow for additional properties
}

// Store information about loaded content scripts
const contentScriptTabs = new Map<number, boolean>();

// Timing constants
const CONTENT_SCRIPT_PING_TIMEOUT = 5000; // 5 seconds
const TAB_ACTION_RETRY_DELAY = 1000; // 1 second
const MAX_TAB_ACTION_RETRIES = 3;

// API configuration storage keys
const OPENAI_API_KEY_STORAGE_KEY = 'earth_engine_openai_api_key';
const ANTHROPIC_API_KEY_STORAGE_KEY = 'earth_engine_anthropic_api_key';
const API_KEY_STORAGE_KEY = 'earth_engine_llm_api_key'; // Keep for backward compatibility
const API_PROVIDER_STORAGE_KEY = 'earth_engine_llm_provider';
const DEFAULT_MODEL_STORAGE_KEY = 'earth_engine_llm_model';

// Handle extension icon click
chrome.action.onClicked.addListener(async (tab) => {
  // Only open side panel if we're on the Earth Engine Code Editor
  if (tab.url?.startsWith('https://code.earthengine.google.com/')) {
    // Open the side panel
    await chrome.sidePanel.open({ windowId: tab.windowId });
    await chrome.sidePanel.setOptions({
      enabled: true,
      path: 'sidepanel.html'
    });
  } else {
    // If not on Earth Engine, create a new tab with Earth Engine
    await chrome.tabs.create({
      url: 'https://code.earthengine.google.com/'
    });
  }
});

// Validate server identity with better error handling
async function validateServerIdentity(host: string, port: number): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
    
    const response = await fetch(`http://${host}:${port}/.identity`, {
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error(`Invalid server response: ${response.status}`);
      return false;
    }

    const identity = await response.json();

    // Validate the server signature
    if (identity && identity.signature === "mcp-browser-connector-24x7") {
      return true;
    } else {
      console.error("Invalid server signature - not the browser tools server");
      return false;
    }
  } catch (error) {
    // Handle network errors more gracefully
    console.error("Error validating server identity:", error);
    
    // Don't throw an error, just return false if we can't connect
    return false;
  }
}

// Forward message to Earth Engine tab with improved error handling and retries
export async function sendMessageToEarthEngineTab(message: any, options?: { timeout?: number, retries?: number }): Promise<any> {
  const timeout = options?.timeout || CONTENT_SCRIPT_PING_TIMEOUT;
  const maxRetries = options?.retries || MAX_TAB_ACTION_RETRIES;
  let retryCount = 0;
  
  console.log('Forwarding message to Earth Engine tab:', message);
  
  async function attemptSend(): Promise<any> {
    // Find Earth Engine tab
    const tabs = await chrome.tabs.query({ url: "*://code.earthengine.google.com/*" });
    
    if (!tabs || tabs.length === 0) {
      console.error('No Earth Engine tab found');
      return {
        success: false,
        error: 'No Earth Engine tab found. Please open Google Earth Engine at https://code.earthengine.google.com/ in a tab and try again.'
      };
    }
    
    const tabId = tabs[0].id;
    if (!tabId) {
      console.error('Invalid Earth Engine tab');
      return {
        success: false,
        error: 'Invalid Earth Engine tab'
      };
    }

    // Check if we know the content script is loaded
    if (!contentScriptTabs.has(tabId)) {
      console.log(`Content script not registered for tab ${tabId}, checking with PING...`);
      
      // Try to ping the content script first
      try {
        await pingContentScript(tabId, timeout);
        console.log(`Content script responded to PING in tab ${tabId}`);
        contentScriptTabs.set(tabId, true);
      } catch (error) {
        console.error(`Content script did not respond to PING in tab ${tabId}:`, error);
        
        // If we've already retried too many times, give up
        if (retryCount >= maxRetries) {
          return {
            success: false,
            error: `Content script did not respond after ${maxRetries} attempts. Please ensure you have the Google Earth Engine tab open and fully loaded at https://code.earthengine.google.com/`
          };
        }
        
        // Try to reload the content script by refreshing the tab
        try {
          console.log(`Attempting to reload content script in tab ${tabId}...`);
          await chrome.tabs.reload(tabId);
          
          // Wait for the page to reload and content script to initialize
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Increment retry count and try again
          retryCount++;
          console.log(`Retrying after tab reload (attempt ${retryCount}/${maxRetries})...`);
          return attemptSend();
        } catch (reloadError) {
          return {
            success: false,
            error: 'Content script not loaded and tab refresh failed. Please ensure the Earth Engine tab is open and refresh it manually.'
          };
        }
      }
    }
    
    // Send message to the content script in the Earth Engine tab
    try {
      console.log(`Sending message to tab ${tabId}`);
      
      // Use a timeout promise to handle cases where chrome.tabs.sendMessage doesn't reject
      const messagePromise = new Promise<any>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          // Remove tab from tracking if timeout occurs
          contentScriptTabs.delete(tabId);
          reject(new Error(`Message to tab ${tabId} timed out after ${timeout}ms`));
        }, timeout);
        
        chrome.tabs.sendMessage(tabId, message, (response) => {
          clearTimeout(timeoutId);
          
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
            return;
          }
          
          resolve(response);
        });
      });
      
      const response = await messagePromise;
      console.log('Received response from Earth Engine tab:', response);
      return response;
    } catch (error) {
      console.error('Error communicating with Earth Engine tab:', error);
      
      // If communication fails, remove tab from tracked tabs so we'll try to ping again next time
      contentScriptTabs.delete(tabId);
      
      // If we have retries left, try again
      if (retryCount < maxRetries) {
        retryCount++;
        console.log(`Communication failed, retrying (attempt ${retryCount}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, TAB_ACTION_RETRY_DELAY));
        return attemptSend();
      }
      
      return {
        success: false,
        error: `Error communicating with Earth Engine tab: ${error instanceof Error ? error.message : String(error)}.
        Please make sure the Earth Engine tab is open and active at https://code.earthengine.google.com/`
      };
    }
  }
  
  return attemptSend();
}

// Helper function to ping content script with timeout
function pingContentScript(tabId: number, timeout = CONTENT_SCRIPT_PING_TIMEOUT): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Content script ping timed out'));
    }, timeout);
    
    chrome.tabs.sendMessage(tabId, { type: 'PING' }, (response) => {
      clearTimeout(timeoutId);
      
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      
      if (response && response.success) {
        resolve(true);
      } else {
        reject(new Error('Invalid ping response'));
      }
    });
  });
}

// Handle messages from content script or side panel
chrome.runtime.onMessage.addListener((message: any, sender, sendResponse) => {
  console.log('Received runtime message:', message, 'from', sender);
  
  switch (message.type) {
    case 'INIT':
      // Handle initialization
      sendResponse({ status: 'initialized' });
      return false; // Synchronous response
    
    case 'CONTENT_SCRIPT_LOADED':
      // Mark content script as loaded for the specific tab
      if (sender.tab && sender.tab.id) {
        console.log(`Content script loaded and registered for tab ${sender.tab.id}`);
        contentScriptTabs.set(sender.tab.id, true);
        sendResponse({ success: true, message: 'Content script registered' });
      } else {
        console.warn('Received CONTENT_SCRIPT_LOADED without tab info');
        sendResponse({ success: false, error: 'Missing tab information' });
      }
      return false; // Synchronous response

    case 'CONTENT_SCRIPT_HEARTBEAT':
      // Acknowledge heartbeat from content script
      console.log('Received heartbeat from content script', sender.tab?.id);
      sendResponse({ success: true, message: 'Heartbeat acknowledged' });
      return false; // Synchronous response
    
    case 'VALIDATE_SERVER':
      if (message.payload && message.payload.host && message.payload.port) {
        validateServerIdentity(message.payload.host, message.payload.port)
          .then(isValid => {
            sendResponse({ isValid });
          })
          .catch(error => {
            sendResponse({ isValid: false, error: error.message });
          });
        return true; // Will respond asynchronously
      }
      sendResponse({ isValid: false, error: 'Invalid payload for VALIDATE_SERVER' });
      return false; // Synchronous response
      
    case 'API_REQUEST':
      // Handle API requests directly (e.g., proxied chat requests if needed)
      if (message.payload && message.payload.endpoint === '/api/chat') {
        (async () => {
          try {
            // Get API key/provider from storage
            const config = await chrome.storage.sync.get([
              API_KEY_STORAGE_KEY,
              OPENAI_API_KEY_STORAGE_KEY,
              ANTHROPIC_API_KEY_STORAGE_KEY,
              API_PROVIDER_STORAGE_KEY,
              DEFAULT_MODEL_STORAGE_KEY
            ]);
            
            // Choose the appropriate API key based on provider
            const provider = config[API_PROVIDER_STORAGE_KEY] || 'openai';
            let apiKey = '';
            if (provider === 'openai') {
              apiKey = config[OPENAI_API_KEY_STORAGE_KEY] || config[API_KEY_STORAGE_KEY] || '';
            } else if (provider === 'anthropic') {
              apiKey = config[ANTHROPIC_API_KEY_STORAGE_KEY] || config[API_KEY_STORAGE_KEY] || '';
            } else {
              apiKey = config[API_KEY_STORAGE_KEY] || '';
            }
            
            const model = config[DEFAULT_MODEL_STORAGE_KEY];

            if (!apiKey) {
              throw new Error('API key not found in storage');
            }

            const body = message.payload.body || {}; 
            const response = await handleChatRequest(
              body.messages,
              apiKey,
              provider,
              model
            );
            
            // Stream the response back? Requires careful handling
            // For simplicity, let's assume non-streaming for direct API calls for now
            const responseData = await response.json(); // Or handle stream appropriately
            sendResponse({ success: true, data: responseData });

          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Error handling proxied API request:', error);
            sendResponse({ success: false, error: `API request failed: ${errorMessage}` });
          }
        })();
        return true; // Will respond asynchronously
      }
      sendResponse({ success: false, error: 'Invalid API_REQUEST payload' });
      return false; // Synchronous response

    // --- Handlers for Direct Earth Engine Tool Calls --- 
    case 'EDIT_SCRIPT':
    case 'RUN_CODE':
    case 'GET_MAP_LAYERS':
    case 'INSPECT_MAP':
    case 'CHECK_CONSOLE':
    case 'GET_TASKS':
      console.log(`Routing ${message.type} message to Earth Engine tab...`);
      sendMessageToEarthEngineTab(message)
          .then(response => {
          sendResponse(response); // Forward the response from content script
          })
          .catch(error => {
          console.error(`Error routing ${message.type} to EE tab:`, error);
          sendResponse({ 
            success: false, 
            error: `Failed to execute ${message.type}: ${error instanceof Error ? error.message : String(error)}` 
          });
        });
      return true; // Indicate asynchronous response
    
    // Handle Context7 API requests
    case 'CONTEXT7_RESOLVE_LIBRARY_ID':
      (async () => {
        try {
          console.log('Resolving library ID for:', message.libraryName);
          const result = await resolveLibraryId(message.libraryName);
          console.log('Resolve result:', result);
          sendResponse(result);
        } catch (error) {
          console.error('Error resolving library ID:', error);
          sendResponse({
            success: false,
            libraryId: null,
            message: `Error resolving library ID: ${error instanceof Error ? error.message : String(error)}`
          });
        }
      })();
      return true; // Will respond asynchronously
      
    case 'CONTEXT7_GET_DOCUMENTATION':
      (async () => {
        try {
          console.log('Getting documentation for:', message.libraryId, message.topic);
          const result = await getDocumentation(
            message.libraryId,
            message.topic
          );
          console.log('Documentation result:', result.success, result.content?.substring(0, 50));
          sendResponse(result);
        } catch (error) {
          console.error('Error getting documentation:', error);
          sendResponse({
            success: false,
            content: null,
            message: `Error getting documentation: ${error instanceof Error ? error.message : String(error)}`
          });
        }
      })();
      return true; // Will respond asynchronously
    
    case 'CONTEXT7_DATASET_INFO':
      (async () => {
        try {
          console.log('Getting dataset info for:', message.topic);
          
          // First, search for the dataset
          const searchResult = await resolveLibraryId(`Earth Engine ${message.topic}`);
          
          if (!searchResult.success || !searchResult.libraryId) {
            sendResponse({
              success: false,
              message: `Could not find documentation for "${message.topic}". ${searchResult.message || ''}`,
              alternatives: searchResult.alternatives,
            });
            return;
          }
          
          // Then get documentation
          const docResult = await getDocumentation(
            searchResult.libraryId,
            message.topic
          );
          
          if (!docResult.success || !docResult.content) {
            sendResponse({
              success: false,
              message: `Could not find documentation for topic "${message.topic}". ${docResult.message || ''}`,
            });
            return;
          }
          
          sendResponse({
            success: true,
            content: docResult.content,
            message: `Documentation found for topic: ${message.topic}`,
          });
        } catch (error) {
          console.error('Error getting dataset info:', error);
          sendResponse({
            success: false,
            message: `Error retrieving Earth Engine documentation: ${error instanceof Error ? error.message : String(error)}`,
          });
        }
      })();
      return true; // Will respond asynchronously
    
    // Browser Automation Tools
    case 'SCREENSHOT':
      (async () => {
        try {
          console.log('Taking screenshot of active tab');
          
          // Get the active tab
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          
          if (!tabs || tabs.length === 0) {
            sendResponse({
              success: false,
              error: 'No active tab found'
            });
            return;
          }
          
          // Take the screenshot
          try {
            const dataUrl = await chrome.tabs.captureVisibleTab(tabs[0].windowId, {
              format: 'png',
              quality: 100
            });
            
            console.log('Screenshot captured successfully');
            sendResponse({
              success: true,
              screenshotData: dataUrl,
              message: 'Screenshot captured successfully'
            });
          } catch (captureError) {
            console.error('Error capturing screenshot:', captureError);
            sendResponse({
              success: false,
              error: `Error capturing screenshot: ${captureError instanceof Error ? captureError.message : String(captureError)}`
            });
          }
        } catch (error) {
          console.error('Error processing screenshot request:', error);
          sendResponse({
            success: false,
            error: `Error processing screenshot request: ${error instanceof Error ? error.message : String(error)}`
          });
        }
      })();
      return true; // Will respond asynchronously
      
    case 'SNAPSHOT':
      (async () => {
        try {
          const maxDepth = message.payload?.maxDepth;
          console.log('Taking page snapshot', maxDepth !== undefined ? `with max depth: ${maxDepth}` : 'with full tree');
          
          // Get the active tab
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          
          if (!tabs || tabs.length === 0 || !tabs[0].id) {
            sendResponse({
              success: false,
              error: 'No active tab found'
            });
            return;
          }
          
          const tabId = tabs[0].id;
          
          // Execute script to get page information
          const results = await chrome.scripting.executeScript({
            target: { tabId },
            func: (maxDepthParam: number | null) => {
              // Get accessibility tree
              const getAccessibilityTree = (element: Element, depth = 0): any => {
                const role = element.getAttribute('role');
                const ariaLabel = element.getAttribute('aria-label');
                const ariaDescription = element.getAttribute('aria-description');
                
                const node: any = {
                  tag: element.tagName.toLowerCase(),
                  role: role || undefined,
                  ariaLabel: ariaLabel || undefined,
                  ariaDescription: ariaDescription || undefined,
                  children: []
                };
                
                // Continue traversing if maxDepth is null (full tree) or we haven't reached it yet
                if (maxDepthParam === null || depth < maxDepthParam) {
                  Array.from(element.children).forEach(child => {
                    node.children.push(getAccessibilityTree(child, depth + 1));
                  });
                }
                
                return node;
              };
              
              return {
                success: true,
                url: window.location.href,
                title: document.title,
                accessibilityTree: getAccessibilityTree(document.body),
                timestamp: Date.now(),
                maxDepth: maxDepthParam
              };
            },
            args: [maxDepth ?? null] // Convert undefined to null for serialization
          });
          
          if (!results || results.length === 0) {
            sendResponse({
              success: false,
              error: 'Failed to execute snapshot script'
            });
            return;
          }
          
          const result = results[0].result;
          console.log('Snapshot captured successfully');
          sendResponse(result);
        } catch (error) {
          console.error('Error taking page snapshot:', error);
          sendResponse({
            success: false,
            error: `Error taking page snapshot: ${error instanceof Error ? error.message : String(error)}`
          });
        }
      })();
      return true; // Will respond asynchronously
      
    case 'CLICK':
      (async () => {
        try {
          console.log('Click request for selector:', message.payload?.selector);
          
          // Get the active tab
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          
          if (!tabs || tabs.length === 0 || !tabs[0].id) {
            sendResponse({
              success: false,
              error: 'No active tab found'
            });
            return;
          }
          
          const tabId = tabs[0].id;
          const selector = message.payload?.selector;
          const position = message.payload?.position;
          
          if (!selector && !position) {
            sendResponse({
              success: false,
              error: 'No selector or position provided'
            });
            return;
          }
          
          const results = await chrome.scripting.executeScript({
            target: { tabId },
            func: (selector: string | null, position: { x: number; y: number } | null) => {
              try {
                let element: Element | null = null;
                
                if (selector) {
                  // Try to find element by selector
                  element = document.querySelector(selector);
                  if (!element) {
                    return { success: false, error: `Element not found with selector: ${selector}` };
                  }
                  
                  // Scroll element into view
                  element.scrollIntoView({ behavior: 'auto', block: 'center' });
                } else if (position) {
                  // Find element at position
                  element = document.elementFromPoint(position.x, position.y);
                  if (!element) {
                    return { success: false, error: `No element found at position (${position.x}, ${position.y})` };
                  }
                }
                
                if (!element) {
                  return { success: false, error: 'No element to click' };
                }
                
                // Create and dispatch click events
                const clickEvent = new MouseEvent('click', {
                  view: window,
                  bubbles: true,
                  cancelable: true,
                  clientX: position?.x || 0,
                  clientY: position?.y || 0
                });
                
                element.dispatchEvent(clickEvent);
                
                return { success: true, message: 'Click executed successfully' };
              } catch (error) {
                return { 
                  success: false, 
                  error: `Error clicking element: ${error instanceof Error ? error.message : String(error)}`
                };
              }
            },
            args: [selector || null, position || null]
          });
          
          if (!results || results.length === 0) {
            sendResponse({
              success: false,
              error: 'No result from script execution'
            });
            return;
          }
          
          // Return the result
          sendResponse(results[0].result);
        } catch (error) {
          console.error('Error processing click request:', error);
          sendResponse({
            success: false,
            error: `Error processing click request: ${error instanceof Error ? error.message : String(error)}`
          });
        }
      })();
      return true; // Will respond asynchronously
      
    case 'TYPE':
      (async () => {
        try {
          console.log('Type request for selector:', message.payload?.selector);
          
          // Get the active tab
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          
          if (!tabs || tabs.length === 0 || !tabs[0].id) {
            sendResponse({
              success: false,
              error: 'No active tab found'
            });
            return;
          }
          
          // Execute script in the tab to type text
          const tabId = tabs[0].id;
          const selector = message.payload?.selector;
          const text = message.payload?.text;
          
          if (!selector) {
            sendResponse({
              success: false,
              error: 'No selector provided'
            });
            return;
          }
          
          if (text === undefined || text === null) {
            sendResponse({
              success: false,
              error: 'No text provided'
            });
            return;
          }
          
          const results = await chrome.scripting.executeScript({
            target: { tabId },
            func: (selector: string, text: string) => {
              try {
                const element = document.querySelector(selector);
                if (!element) {
                  return { success: false, error: `Element not found with selector: ${selector}` };
                }
                
                // Scroll element into view
                element.scrollIntoView({ behavior: 'auto', block: 'center' });
                
                // Focus the element
                (element as HTMLElement).focus();
                
                // Handle different types of elements
                if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
                  // For standard form elements
                  element.value = text;
                  
                  // Trigger input and change events
                  element.dispatchEvent(new Event('input', { bubbles: true }));
                  element.dispatchEvent(new Event('change', { bubbles: true }));
                } else if ((element as HTMLElement).isContentEditable) {
                  // For contentEditable elements
                  element.textContent = text;
                  
                  // Trigger input event for React and other frameworks
                  element.dispatchEvent(new InputEvent('input', { bubbles: true }));
                } else {
                  return { 
                    success: false, 
                    error: 'Element is not an input, textarea, or contentEditable element' 
                  };
                }
                
                return { success: true, message: 'Text typed successfully' };
              } catch (error) {
                return { 
                  success: false, 
                  error: `Error typing text: ${error instanceof Error ? error.message : String(error)}`
                };
              }
            },
            args: [selector, text]
          });

          if (!results || results.length === 0) {
            sendResponse({
              success: false,
              error: 'No result from script execution'
            });
            return;
          }
          
          // Return the result
          sendResponse(results[0].result);
        } catch (error) {
          console.error('Error processing type request:', error);
          sendResponse({
            success: false,
            error: `Error processing type request: ${error instanceof Error ? error.message : String(error)}`
          });
        }
      })();
      return true; // Will respond asynchronously
      
    case 'GET_ELEMENT':
      (async () => {
        try {
          console.log('GetElement request for selector:', message.payload?.selector);
          
          // Get the active tab
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          
          if (!tabs || tabs.length === 0 || !tabs[0].id) {
            sendResponse({
              success: false,
              error: 'No active tab found'
            });
            return;
          }
          
          // Execute script in the tab to get element information
          const tabId = tabs[0].id;
          const selector = message.payload?.selector;
          const limit = message.payload?.limit || 10;
          
          if (!selector) {
            sendResponse({
              success: false,
              error: 'No selector provided'
            });
            return;
          }

          const results = await chrome.scripting.executeScript({
            target: { tabId },
            func: (selector: string, limit: number) => {
              try {
                const elements = Array.from(document.querySelectorAll(selector));
                if (!elements || elements.length === 0) {
                  return { 
                    success: false, 
                    error: `No elements found with selector: ${selector}` 
                  };
                }
                
                const limitedElements = elements.slice(0, limit);
                
                const elementInfos = limitedElements.map(element => {
                  // Get all attributes as key-value pairs
                  const attributesObj: Record<string, string> = {};
                  for (const attr of element.attributes) {
                    attributesObj[attr.name] = attr.value;
                  }
                  
                  // Check if element is visible
                  const style = window.getComputedStyle(element);
                  const isVisible = style.display !== 'none' && 
                                   style.visibility !== 'hidden' && 
                                   style.opacity !== '0';
                  
                  // Check if element is enabled (for form controls)
                  let isEnabled = true;
                  if (element instanceof HTMLButtonElement || 
                      element instanceof HTMLInputElement || 
                      element instanceof HTMLSelectElement || 
                      element instanceof HTMLTextAreaElement || 
                      element instanceof HTMLOptionElement) {
                    isEnabled = !element.disabled;
                  }
                  
                  // Get bounding client rect
                  const rect = element.getBoundingClientRect();
                  const boundingRect = {
                    top: rect.top,
                    right: rect.right,
                    bottom: rect.bottom,
                    left: rect.left,
                    width: rect.width,
                    height: rect.height
                  };
                  
                  // Get element value if applicable
                  let value = undefined;
                  if (element instanceof HTMLInputElement || 
                      element instanceof HTMLTextAreaElement || 
                      element instanceof HTMLSelectElement) {
                    value = element.value;
                  }
                  
                  return {
                    tagName: element.tagName.toLowerCase(),
                    id: element.id || undefined,
                    className: element.className || undefined,
                    textContent: element.textContent ? element.textContent.trim() : undefined,
                    value,
                    attributes: attributesObj,
                    isVisible,
                    isEnabled,
                    boundingRect
                  };
                });
                
                return { 
                  success: true, 
                  elements: elementInfos,
                  count: elements.length
                };
              } catch (error) {
                return { 
                  success: false, 
                  error: `Error getting element information: ${error instanceof Error ? error.message : String(error)}`
                };
              }
            },
            args: [selector, limit]
          });

          if (!results || results.length === 0) {
            sendResponse({
              success: false,
              error: 'No result from script execution'
            });
            return;
          }
          
          // Return the result
          sendResponse(results[0].result);
        } catch (error) {
          console.error('Error processing getElement request:', error);
          sendResponse({
            success: false,
            error: `Error processing getElement request: ${error instanceof Error ? error.message : String(error)}`
          });
        }
      })();
      return true; // Will respond asynchronously
      
    default:
      console.warn(`Unknown message type received in background: ${message.type}`);
  }
  
  return true; // Will respond asynchronously
});

// Listen for side panel connections
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'sidepanel') {
    console.log('Side panel connected');
    
    port.onMessage.addListener(async (message: any) => {
      console.log('Received message from side panel:', message);
      
      // Handle side panel specific messages
      switch (message.type) {
        case 'INIT':
          port.postMessage({ type: 'INIT_RESPONSE', status: 'initialized' });
          break;
          
        case 'CHAT_MESSAGE':
          // Handle chat messages from side panel
          handleChatMessage(message, port);
          break;
          
        case 'PING':
          // Handle ping messages from side panel
          console.log('Received PING from side panel, responding with PONG');
          port.postMessage({ type: 'PONG', timestamp: Date.now() });
          break;
          
        case 'TEST_API':
          console.log('Testing API connection');
          (async () => {
            try {
              // Extract API details from message
              const provider = message.provider || 'openai';
              const apiKey = message.apiKey || '';
              
              console.log(`Testing ${provider} API connection with key: ${apiKey ? '(key provided)' : '(no key)'}`);
              
              if (!apiKey) {
                port.postMessage({ 
                  type: 'TEST_API_RESPONSE', 
                  success: false,
                  error: 'No API key provided'
                });
                return;
              }
              
              let success = false;
              let error = '';
              
              // Test API connection based on provider
              if (provider === 'openai') {
                try {
                  const response = await fetch('https://api.openai.com/v1/models', {
                    method: 'GET',
                    headers: {
                      'Authorization': `Bearer ${apiKey}`,
                      'Content-Type': 'application/json'
                    }
                  });
                  
                  if (response.ok) {
                    console.log('OpenAI API connection test successful');
                    success = true;
                  } else {
                    const errorData = await response.json().catch(() => ({}));
                    error = `API returned status ${response.status}: ${JSON.stringify(errorData)}`;
                    console.error('OpenAI API test failed:', error);
                  }
                } catch (err) {
                  error = err instanceof Error ? err.message : String(err);
                  console.error('Error testing OpenAI API:', error);
                }
              } else if (provider === 'anthropic') {
                try {
                  console.log('Testing Anthropic API connection with model claude-3-7-sonnet-20250219');
                  
                  // Log API key format details (without exposing the key)
                  if (!apiKey.startsWith('sk-ant-')) {
                    console.warn('API key does not start with sk-ant-, which is required for Anthropic');
                  }
                  console.log(`API key length: ${apiKey.length}`);
                  
                  // Log full request details
                  const requestBody = JSON.stringify({
                    model: 'claude-3-7-sonnet-20250219',
                    max_tokens: 10,
                    messages: [
                      { role: 'user', content: 'Hello' }
                    ]
                  });
                  
                  console.log('Anthropic test request body:', requestBody);
                  console.log('Adding anthropic-dangerous-direct-browser-access header');
                  
                  const response = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                      'x-api-key': apiKey,
                      'anthropic-version': '2023-06-01',
                      'Content-Type': 'application/json',
                      'anthropic-dangerous-direct-browser-access': 'true' // Required by Anthropic for browser access
                    },
                    body: requestBody
                  });
                  
                  console.log(`Anthropic test response status: ${response.status}`);
                  console.log(`Response type: ${response.type}`);
                  
                  // Log response headers
                  const responseHeaders: Record<string, string> = {};
                  response.headers.forEach((value, key) => {
                    responseHeaders[key] = value;
                  });
                  console.log('Response headers:', responseHeaders);
                  
                  // Even if status is 200, we need to verify we got an actual response
                  if (response.ok) {
                    try {
                      // First try to get the raw text
                      const rawText = await response.text();
                      console.log(`Raw response text (${rawText.length} chars): ${rawText.substring(0, 100)}${rawText.length > 100 ? '...' : ''}`);
                      
                      if (!rawText || rawText.trim() === '') {
                        console.warn('Anthropic API returned empty response body');
                        error = 'Anthropic API returned empty response';
                        success = false;
                      } else {
                        try {
                          // Then parse as JSON
                          const data = JSON.parse(rawText);
                          if (!data || !data.content) {
                            console.warn('Anthropic API returned response without content field:', data);
                            error = 'Anthropic API returned invalid response format';
                            success = false;
                          } else {
                            console.log('Anthropic API connection test successful. Response:', data);
                            console.log('Content:', data.content);
                            success = true;
                          }
                        } catch (parseErr) {
                          console.error('Error parsing Anthropic API response:', parseErr);
                          error = `Invalid JSON in response: ${rawText}`;
                          success = false;
                        }
                      }
                    } catch (textErr) {
                      console.error('Error reading Anthropic API response text:', textErr);
                      error = 'Could not read API response';
                      success = false;
                    }
                  } else {
                    try {
                      const errorText = await response.text();
                      console.error('Anthropic API error response:', errorText);
                      try {
                        const errorData = JSON.parse(errorText);
                        error = `API returned status ${response.status}: ${JSON.stringify(errorData)}`;
                      } catch (e) {
                        error = `API returned status ${response.status}: ${errorText}`;
                      }
                    } catch (e) {
                      error = `API returned status ${response.status}`;
                    }
                    console.error('Anthropic API test failed:', error);
                  }
                } catch (err) {
                  error = err instanceof Error ? err.message : String(err);
                  console.error('Error testing Anthropic API:', error);
                }
              }
              
              // Send response back to the sidepanel
              port.postMessage({ 
                type: 'TEST_API_RESPONSE', 
                success,
                error: error || undefined
              });
              
            } catch (error) {
              console.error('Error in TEST_API handler:', error);
              port.postMessage({ 
                type: 'TEST_API_RESPONSE', 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error testing API connection'
              });
            }
          })();
          break;
          
        default:
          console.warn('Unknown side panel message type:', message.type);
          port.postMessage({ 
            type: 'ERROR', 
            error: `Unknown message type: ${message.type}` 
          });
      }
    });

    port.onDisconnect.addListener(() => {
      console.log('Side panel disconnected');
    });
  }
});

// Helper function to handle chat messages
async function handleChatMessage(message: any, port: chrome.runtime.Port) {
  const requestId = `req_${Date.now()}`;
  console.log(`[${requestId}] Handling chat message...`);
    
  try {
    const conversationMessages = message.messages || [{
      role: 'user',
      content: message.message
    }];
    
    console.log(`[${requestId}] Processing chat with ${conversationMessages.length} messages in history`);
    
    // Get API key and provider from storage
    const apiConfig = await new Promise<{apiKey: string, provider: string, model: string}>(
      (resolve, reject) => {
        chrome.storage.sync.get(
          [API_KEY_STORAGE_KEY, OPENAI_API_KEY_STORAGE_KEY, ANTHROPIC_API_KEY_STORAGE_KEY, API_PROVIDER_STORAGE_KEY, DEFAULT_MODEL_STORAGE_KEY], 
          (result) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            
            const provider = result[API_PROVIDER_STORAGE_KEY] || 'openai';
            
            // Choose the appropriate API key based on provider
            let apiKey = '';
            if (provider === 'openai') {
              apiKey = result[OPENAI_API_KEY_STORAGE_KEY] || result[API_KEY_STORAGE_KEY] || '';
            } else if (provider === 'anthropic') {
              apiKey = result[ANTHROPIC_API_KEY_STORAGE_KEY] || result[API_KEY_STORAGE_KEY] || '';
            } else {
              apiKey = result[API_KEY_STORAGE_KEY] || '';
            }
            
            console.log(`[${requestId}] Using provider: ${provider}`);
            console.log(`[${requestId}] API key present: ${apiKey ? 'Yes' : 'No'}`);
            if (apiKey) {
              console.log(`[${requestId}] API key length: ${apiKey.length}`);
              // Simple validation - don't log full key but check basic format
              if (provider === 'openai' && !apiKey.startsWith('sk-')) {
                console.warn(`[${requestId}] Warning: OpenAI API key has invalid format (should start with sk-)`);
              } else if (provider === 'anthropic' && !apiKey.startsWith('sk-ant-')) {
                console.warn(`[${requestId}] Warning: Anthropic API key has invalid format (should start with sk-ant-)`);
              }
            }
            
            resolve({
              apiKey,
              provider,
              model: result[DEFAULT_MODEL_STORAGE_KEY] || ''
            });
          }
        );
      }
    );
    
    if (!apiConfig.apiKey) {
      console.error(`[${requestId}] API key not configured`);
      port.postMessage({ 
        type: 'ERROR',
        requestId,
        error: 'API key not configured. Please configure it in the extension settings.'
      });
      return;
    }
    
    // Validate key format based on provider
    if (apiConfig.provider === 'openai' && !apiConfig.apiKey.startsWith('sk-')) {
      console.error(`[${requestId}] Invalid OpenAI API key format`);
      port.postMessage({ 
        type: 'ERROR',
        requestId,
        error: 'Invalid OpenAI API key format. OpenAI keys should start with "sk-".'
      });
      return;
    } else if (apiConfig.provider === 'anthropic' && !apiConfig.apiKey.startsWith('sk-ant-')) {
      console.error(`[${requestId}] Invalid Anthropic API key format`);
      port.postMessage({ 
        type: 'ERROR',
        requestId,
        error: 'Invalid Anthropic API key format. Anthropic keys should start with "sk-ant-".'
      });
      return;
    }
    
    // Log model information
    console.log(`[${requestId}] Using model: ${apiConfig.model || 'Default model for provider'}`);
    
    // Validate model compatibility with provider
    if (apiConfig.provider === 'openai' && apiConfig.model && apiConfig.model.includes('claude')) {
      console.warn(`[${requestId}] Warning: Using Claude model (${apiConfig.model}) with OpenAI provider. This will fail.`);
      port.postMessage({ 
        type: 'ERROR',
        requestId,
        error: 'Model/provider mismatch: Cannot use Claude models with OpenAI provider. Please change either the model or provider in settings.'
      });
      return;
    }
    
    if (apiConfig.provider === 'anthropic' && apiConfig.model && !apiConfig.model.includes('claude')) {
      console.warn(`[${requestId}] Warning: Using non-Claude model (${apiConfig.model}) with Anthropic provider. This will fail.`);
      port.postMessage({ 
        type: 'ERROR',
        requestId,
        error: 'Model/provider mismatch: Anthropic provider only supports Claude models. Please change either the model or provider in settings.'
      });
      return;
    }
    
    // Call the new handler which directly processes messages
    console.log(`[${requestId}] Calling LLM API with provider: ${apiConfig.provider}`);
    const response = await handleChatRequest(
      conversationMessages,
      apiConfig.apiKey,
      apiConfig.provider as any, // Cast to Provider type
      apiConfig.model
    );
      
    console.log(`[${requestId}] Response status from chat handler: ${response.status}`);

    if (!response.ok) {
      // Handle potential errors from the handler
      let errorPayload;
      try {
          errorPayload = await response.json();
      } catch (e) {
          errorPayload = { error: `API Error: ${response.statusText}` };
      }
      console.error(`[${requestId}] Error from chat handler:`, errorPayload);
      port.postMessage({ 
        type: 'ERROR',
        requestId,
        error: errorPayload.error || errorPayload.message || 'Unknown API error'
      });
      return; // Stop processing on error
    }

    // Check if the response body exists
    if (!response.body) {
        console.error(`[${requestId}] Response body is null.`);
        port.postMessage({ 
          type: 'ERROR',
          requestId,
          error: 'Received empty response from API handler'
        });
        return; // Stop processing if no body
    }
      
    // Process the simple text stream from response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    console.log(`[${requestId}] Reading text stream...`);
    
    let chunkCount = 0;
    let totalCharsReceived = 0;
        
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log(`[${requestId}] Text stream finished. Received ${chunkCount} chunks, ${totalCharsReceived} total characters.`);
          
          // Add diagnostic information for empty responses
          if (chunkCount === 0) {
            console.warn(`[${requestId}] Empty response received. This could indicate:`);
            
            if (apiConfig.provider === 'anthropic') {
              console.warn(`[${requestId}] 1. Anthropic API key format issue - should start with sk-ant-`);
              console.warn(`[${requestId}] 2. Model compatibility - '${apiConfig.model}' may not be supported or spelled correctly`);
              console.warn(`[${requestId}] 3. Required header 'anthropic-dangerous-direct-browser-access: true' might be missing`);
              console.warn(`[${requestId}] 4. Network CORS issues - check console for any blocked requests`);
              
              port.postMessage({ 
                type: 'ERROR',
                requestId,
                error: `No response from Anthropic API. Please check that your Anthropic API key is valid (should start with sk-ant-) and that the model "${apiConfig.model}" is correct.`
              });
            } else {
              console.warn(`[${requestId}] 1. OpenAI API key format issue - should start with sk-`);
              console.warn(`[${requestId}] 2. Model compatibility - '${apiConfig.model}' may not be supported`);
              console.warn(`[${requestId}] 3. Network CORS issues - check console for blocked requests`);
              
              port.postMessage({ 
                type: 'ERROR',
                requestId,
                error: `No response from OpenAI API. Please check that your OpenAI API key is valid and that the model "${apiConfig.model}" is correct.`
              });
            }
            
            // We've already sent an error message, so no need to send the CHAT_STREAM_END
            return;
          }
          
          port.postMessage({
            type: 'CHAT_STREAM_END',
            requestId
          });
          break; // Exit loop when stream is done
        }
        
        // Decode the chunk and send it directly
        const chunk = decoder.decode(value, { stream: true });
        
        if (chunk) { // Avoid sending empty chunks if decoder yields them
          chunkCount++;
          totalCharsReceived += chunk.length;
          console.log(`[${requestId}] Chunk ${chunkCount}: ${chunk.length} chars, text: "${chunk.substring(0, 50)}${chunk.length > 50 ? '...' : ''}"`);
          
          port.postMessage({ 
            type: 'CHAT_STREAM_CHUNK',
            requestId,
            chunk: chunk
          });
        } else {
          console.log(`[${requestId}] Received empty chunk (length: ${value ? value.length : 0} bytes)`);
        }
      }
    } catch (streamError) {
      const errorMessage = streamError instanceof Error ? streamError.message : String(streamError);
      console.error(`[${requestId}] Error reading text stream:`, streamError);
      port.postMessage({ 
        type: 'ERROR',
        requestId,
        error: `Stream reading error: ${errorMessage}` 
      });
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[${requestId}] Chat processing error:`, error);
    port.postMessage({ 
      type: 'ERROR',
      requestId,
      error: `Chat handler error: ${errorMessage}` 
    });
  }
}

// Generate a fallback response for Earth Engine queries
function generateFallbackResponse(query: string): string {
  const keywords: Record<string, string> = {
    'ndvi': 'NDVI (Normalized Difference Vegetation Index) can be calculated using: ```\nvar ndvi = image.normalizedDifference(["NIR", "RED"]);\n```',
    'landsat': 'Landsat imagery can be accessed via: ```\nvar landsat = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")\n```',
    'sentinel': 'Sentinel imagery is available through: ```\nvar sentinel = ee.ImageCollection("COPERNICUS/S2_SR")\n```',
    'export': 'You can export images using Export.image.toDrive() or visualize them with Map.addLayer()',
    'classify': 'For classification, use ee.Classifier methods like randomForest() or smileCart()',
    'reducer': 'Reducers like mean(), sum(), or min() can aggregate data spatially or temporally'
  };
  
  // Check if any keywords are in the query
  for (const [key, response] of Object.entries(keywords)) {
    if (query.toLowerCase().includes(key)) {
      return response;
    }
  }
  
  // Default response
  return "I can help with Earth Engine tasks like image processing, classification, and data export. Could you provide more details about what you're trying to do?";
}