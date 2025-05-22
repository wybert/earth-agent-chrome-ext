import { handleChatRequest } from './chat-handler';
import { resolveLibraryId, getDocumentation } from '../lib/tools/context7';
import { Message, ExtensionMessage } from '../types/extension';

// Types for messages between components
interface MessageBase {
  type: string;
  payload?: any;
  [key: string]: any; // Allow for additional properties
}

// Provider type for API providers
type Provider = 'openai' | 'anthropic';

// Store active port connections
let port: chrome.runtime.Port | null = null;

// Store connections from side panel ports with type safety
const sidePanelPorts = new Map<string, chrome.runtime.Port>();

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
const MODEL_STORAGE_KEY = 'earth_engine_llm_model';

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
chrome.runtime.onMessage.addListener((message: MessageBase, sender, sendResponse) => {
  console.log('Background script received message:', message);

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
            const config = await chrome.storage.local.get([
              API_KEY_STORAGE_KEY,
              API_PROVIDER_STORAGE_KEY,
              MODEL_STORAGE_KEY
            ]);
            const apiKey = config[API_KEY_STORAGE_KEY];
            const provider = config[API_PROVIDER_STORAGE_KEY] || 'openai';
            const model = config[MODEL_STORAGE_KEY];

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
      // Forward to Earth Engine tab
      (async () => {
        try {
          const response = await sendMessageToEarthEngineTab(message);
          sendResponse(response);
        } catch (error) {
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      })();
      return true; // Will respond asynchronously
    
    case 'CHAT_MESSAGE':
      // Handle chat messages from the sidepanel
      (async () => {
        try {
          console.log('Processing chat message');
          
          // Get API key/provider from storage
          const config = await chrome.storage.local.get([
            API_KEY_STORAGE_KEY,
            OPENAI_API_KEY_STORAGE_KEY,
            ANTHROPIC_API_KEY_STORAGE_KEY,
            API_PROVIDER_STORAGE_KEY,
            MODEL_STORAGE_KEY
          ]);
          
          // Determine provider and API key to use
          const provider = config[API_PROVIDER_STORAGE_KEY] || 'openai';
          let apiKey = '';
          
          if (provider === 'openai') {
            apiKey = config[OPENAI_API_KEY_STORAGE_KEY] || config[API_KEY_STORAGE_KEY] || '';
          } else if (provider === 'anthropic') {
            apiKey = config[ANTHROPIC_API_KEY_STORAGE_KEY] || config[API_KEY_STORAGE_KEY] || '';
          }
          
          const model = config[MODEL_STORAGE_KEY];
          
          if (!apiKey) {
            sendResponse({
              type: 'ERROR',
              error: 'API key not configured. Please set your API key in the extension settings.'
            });
            return;
          }
          
          // Create a unique request ID for tracking
          const requestId = Date.now().toString();
          
          // Process the chat messages
          const chatMessages = message.messages || [];
          
          // Handle image attachments if present
          if (message.attachments && message.attachments.length > 0) {
            // Find the last user message and ensure it has parts
            const lastUserMessageIndex = chatMessages.length - 1;
            if (lastUserMessageIndex >= 0 && chatMessages[lastUserMessageIndex].role === 'user') {
              // Convert the message to use parts if it doesn't have them already
              if (!chatMessages[lastUserMessageIndex].parts) {
                chatMessages[lastUserMessageIndex].parts = [
                  { type: 'text', text: chatMessages[lastUserMessageIndex].content || '' }
                ];
              }
              
              // Add image parts
              message.attachments.forEach((attachment: {type: string, data: string}) => {
                if (attachment.type === 'image' && chatMessages[lastUserMessageIndex].parts) {
                  chatMessages[lastUserMessageIndex].parts.push(attachment);
                }
              });
            }
          }
          
          try {
            // Handle the chat request through the appropriate handler
            const response = await handleChatRequest(
              chatMessages,
              apiKey,
              provider as Provider,
              model
            );
            
            // Get response body as a readable stream
            const reader = response.body?.getReader();
            if (!reader) {
              throw new Error('No readable stream available from response');
            }
            
            // Stream the response back to the sender
            let accumulatedResponse = '';
            
            // Use a loop to read all chunks from the stream
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              // Convert the chunk to text
              const chunkText = new TextDecoder().decode(value);
              accumulatedResponse += chunkText;
              
              // Forward the chunk to the sender - using proper API
              if (sender.tab && sender.tab.id) {
                chrome.tabs.sendMessage(sender.tab.id, {
                  type: 'CHAT_STREAM_CHUNK',
                  requestId,
                  chunk: chunkText
                });
              } else if (port) {
                // If this is from a port connection like sidebar
                port.postMessage({
                  type: 'CHAT_STREAM_CHUNK',
                  requestId,
                  chunk: chunkText
                });
              }
            }
            
            // Send the end of stream notification
            if (sender.tab && sender.tab.id) {
              chrome.tabs.sendMessage(sender.tab.id, {
                type: 'CHAT_STREAM_END',
                requestId,
                fullText: accumulatedResponse
              });
            } else if (port) {
              // If this is from a port connection like sidebar
              port.postMessage({
                type: 'CHAT_STREAM_END',
                requestId,
                fullText: accumulatedResponse
              });
            }
            
          } catch (error: unknown) {
            console.error('Error processing chat request:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            // Send error response using proper API
            if (sender.tab && sender.tab.id) {
              chrome.tabs.sendMessage(sender.tab.id, {
                type: 'ERROR',
                requestId,
                error: `Chat request failed: ${errorMessage}`
              });
            } else if (port) {
              // If this is from a port connection like sidebar
              port.postMessage({
                type: 'ERROR',
                requestId,
                error: `Chat request failed: ${errorMessage}`
              });
            }
          }
        } catch (error: unknown) {
          console.error('Error handling chat message:', error);
          const errorMessage = error instanceof Error ? error.message : String(error);
          
          // Send error response
          sendResponse({
            type: 'ERROR',
            error: `Error handling chat message: ${errorMessage}`
          });
        }
      })();
      return true; // Will respond asynchronously
    
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
      sendResponse({ success: false, error: `Unknown message type: ${message.type}` });
      return false; // Synchronous response
  }
});

// Listen for side panel connections
chrome.runtime.onConnect.addListener((newPort) => {
  if (newPort.name === 'sidepanel') {
    console.log('Side panel connected');
    // Store the port globally so it can be used by other message handlers
    port = newPort;
    
    newPort.onMessage.addListener(async (message: any) => {
      console.log('Received message from side panel:', message);
      
      // Handle side panel specific messages
      switch (message.type) {
        case 'INIT':
          newPort.postMessage({ type: 'INIT_RESPONSE', status: 'initialized' });
          break;
          
        case 'CHAT_MESSAGE':
          // Handle chat messages from side panel
          handleChatMessage(message, newPort);
          break;
          
        case 'PING':
          // Handle ping messages from side panel
          console.log('Received PING from side panel, responding with PONG');
          newPort.postMessage({ type: 'PONG', timestamp: Date.now() });
          break;
          
        default:
          console.warn('Unknown side panel message type:', message.type);
          newPort.postMessage({ type: 'ERROR', error: 'Unknown message type' });
      }
    });

    newPort.onDisconnect.addListener(() => {
      console.log('Side panel disconnected');
      if (port === newPort) {
        // Clear the global port reference when this port disconnects
        port = null;
      }
    });
  }
});

// Helper function to handle chat messages
async function handleChatMessage(message: any, port: chrome.runtime.Port) {
  const requestId = `req_${Date.now()}`;
  console.log(`[${requestId}] Handling chat message...`);
  console.log(`[${requestId}] Message type: ${message.type}`);
  
  // Debug log provider/model information from message if available
  if (message.provider) {
    console.log(`[${requestId}] Requested provider: ${message.provider}`);
  }
  if (message.model) {
    console.log(`[${requestId}] Requested model: ${message.model}`);
  }
  
  // Log attachment information
  if (message.attachments && message.attachments.length > 0) {
    console.log(`[${requestId}] Message contains ${message.attachments.length} attachment(s)`);
    message.attachments.forEach((att: {type: string, mimeType?: string, data: string}, index: number) => {
      console.log(`[${requestId}] Attachment ${index + 1}: type=${att.type}, data length=${att.data ? att.data.length : 'undefined'}`);
    });
  } else {
    console.log(`[${requestId}] Message contains no attachments`);
  }
    
  try {
    let conversationMessages;
    
    // If there are attachments, create a message with parts array
    if (message.attachments && message.attachments.length > 0) {
      const lastMessage = message.messages ? message.messages[message.messages.length - 1] : null;
      
      // If we're adding to existing messages, replace the last user message with one that has parts
      if (message.messages && message.messages.length > 0) {
        // Copy all except the last message if it's a user message
        conversationMessages = lastMessage && lastMessage.role === 'user' 
          ? message.messages.slice(0, -1) 
          : [...message.messages];
          
        // Add a new user message with parts array
        conversationMessages.push({
          role: 'user',
          parts: [
            { type: 'text', text: message.message || "Here's an image:" },
            ...message.attachments.map((img: {type: string, mimeType?: string, data: string}) => ({
              type: 'file',
              mimeType: img.mimeType || 'image/png',
              name: 'image.png',
              data: img.data,
              size: img.data.length
            }))
          ]
        });
      } else {
        // No existing messages, create new array with single user message
        conversationMessages = [{
          role: 'user',
          parts: [
            { type: 'text', text: message.message || "Here's an image:" },
            ...message.attachments.map((img: {type: string, mimeType?: string, data: string}) => ({
              type: 'file',
              mimeType: img.mimeType || 'image/png',
              name: 'image.png',
              data: img.data,
              size: img.data.length
            }))
          ]
        }];
      }
      console.log(`[${requestId}] Created message with ${message.attachments.length} attachments in parts array`);
    } else {
      // No attachments, proceed with normal message
      conversationMessages = message.messages || [{
        role: 'user',
        content: message.message
      }];
    }
    
    console.log(`[${requestId}] Processing chat with ${conversationMessages.length} messages in history`);
    
    // Get API key and provider from storage
    const apiConfig = await new Promise<{apiKey: string, provider: string, model: string}>(
      (resolve, reject) => {
        chrome.storage.sync.get(
          [API_KEY_STORAGE_KEY, OPENAI_API_KEY_STORAGE_KEY, ANTHROPIC_API_KEY_STORAGE_KEY, API_PROVIDER_STORAGE_KEY, MODEL_STORAGE_KEY], 
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
            
            // Get the user-selected model or fall back to empty string (which will use the default in chat-handler.ts)
            const model = result[MODEL_STORAGE_KEY] || '';
            console.log(`[${requestId}] Using provider: ${provider}, model: ${model || 'default'}`);
            
            resolve({
              apiKey,
              provider,
              model: model
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
    
    // Check if any messages have parts or attachments
    const hasMultiModalContent = conversationMessages.some((msg: any) => msg.parts && Array.isArray(msg.parts));
    if (hasMultiModalContent) {
      console.log(`[${requestId}] Detected messages with multi-modal content (parts array)`);
    }
    
    // Call the new handler which directly processes messages
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
        
          try {
            while (true) {
              const { done, value } = await reader.read();
              
              if (done) {
            console.log(`[${requestId}] Text stream finished.`);
                port.postMessage({
                  type: 'CHAT_STREAM_END',
                  requestId
                });
            break; // Exit loop when stream is done
          }
          
          // Decode the chunk and send it directly
          const chunk = decoder.decode(value, { stream: true });
          
          if (chunk) { // Avoid sending empty chunks if decoder yields them
                      port.postMessage({ 
                        type: 'CHAT_STREAM_CHUNK',
                        requestId,
              chunk: chunk
                      });
          }
                    }
    } catch (streamError) {
      const errorMessage = streamError instanceof Error ? streamError.message : String(streamError);
      console.error(`[${requestId}] Error reading text stream:`, errorMessage);
            port.postMessage({ 
              type: 'ERROR',
              requestId,
        error: `Stream reading error: ${errorMessage}` 
      });
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[${requestId}] Chat processing error:`, errorMessage);
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