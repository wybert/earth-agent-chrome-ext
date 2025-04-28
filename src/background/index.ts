import { handleChatRoute } from './routes';
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
async function sendMessageToEarthEngineTab(message: any, options?: { timeout?: number, retries?: number }): Promise<any> {
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
chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
  console.log('Background script received message:', message);

  switch (message.type) {
    case 'INIT':
      // Handle initialization
      sendResponse({ status: 'initialized' });
      break;
    
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
      break;
      
    case 'API_REQUEST':
      // Handle API requests directly
      if (message.payload && message.payload.endpoint === '/api/chat') {
        handleChatRoute(new Request(message.payload.url, {
          method: 'POST',
          headers: message.payload.headers || {},
          body: message.payload.body ? JSON.stringify(message.payload.body) : undefined
        }))
          .then(response => {
            response.json().then(data => {
              sendResponse({ success: true, data });
            });
          })
          .catch(error => {
            sendResponse({ success: false, error: error.message });
          });
        return true; // Will respond asynchronously
      }
      break;
    
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
    
    // Earth Engine Tool Handlers
    case 'RUN_CODE':
      (async () => {
        try {
          console.log('Running Earth Engine code, length:', message.code?.length || 0);
          console.log('Code snippet:', message.code?.substring(0, 50) + '...');
          
          const response = await sendMessageToEarthEngineTab(message);
          console.log('Code execution response:', response);
          sendResponse(response);
        } catch (error) {
          console.error('Error running Earth Engine code:', error);
          sendResponse({
            success: false,
            error: `Error running Earth Engine code: ${error instanceof Error ? error.message : String(error)}`
          });
        }
      })();
      return true; // Will respond asynchronously
      
    case 'INSPECT_MAP':
      (async () => {
        try {
          console.log('Inspecting Earth Engine map at coordinates:', message.coordinates);
          
          const response = await sendMessageToEarthEngineTab(message);
          console.log('Map inspection response:', response);
          sendResponse(response);
        } catch (error) {
          console.error('Error inspecting Earth Engine map:', error);
          sendResponse({
            success: false,
            error: `Error inspecting Earth Engine map: ${error instanceof Error ? error.message : String(error)}`
          });
        }
      })();
      return true; // Will respond asynchronously
      
    case 'CHECK_CONSOLE':
      (async () => {
        try {
          console.log('Checking Earth Engine console for errors');
          
          const response = await sendMessageToEarthEngineTab(message);
          console.log('Console check response:', response);
          sendResponse(response);
        } catch (error) {
          console.error('Error checking Earth Engine console:', error);
          sendResponse({
            success: false,
            error: `Error checking Earth Engine console: ${error instanceof Error ? error.message : String(error)}`
          });
        }
      })();
      return true; // Will respond asynchronously
      
    case 'GET_TASKS':
      (async () => {
        try {
          console.log('Getting Earth Engine tasks');
          
          const response = await sendMessageToEarthEngineTab(message);
          console.log('Get tasks response:', response);
          sendResponse(response);
        } catch (error) {
          console.error('Error getting Earth Engine tasks:', error);
          sendResponse({
            success: false,
            error: `Error getting Earth Engine tasks: ${error instanceof Error ? error.message : String(error)}`
          });
        }
      })();
      return true; // Will respond asynchronously
      
    case 'EDIT_SCRIPT':
      (async () => {
        try {
          console.log('Editing Earth Engine script:', 
                      message.scriptId, 
                      'content length:', message.content?.length || 0);
          
          const response = await sendMessageToEarthEngineTab(message);
          console.log('Script edit response:', response);
          sendResponse(response);
        } catch (error) {
          console.error('Error editing Earth Engine script:', error);
          sendResponse({
            success: false,
            error: `Error editing Earth Engine script: ${error instanceof Error ? error.message : String(error)}`
          });
        }
      })();
      return true; // Will respond asynchronously
    
    case 'CONTENT_SCRIPT_LOADED':
      if (sender.tab && sender.tab.id) {
        console.log(`Content script loaded in tab ${sender.tab.id}:`, message.url);
        contentScriptTabs.set(sender.tab.id, true);
      } else {
        console.log('Content script loaded but sender tab info is missing');
      }
      sendResponse({ success: true, message: 'Background script acknowledged content script loading' });
      break;
    
    case 'CONTENT_SCRIPT_HEARTBEAT':
      if (sender.tab && sender.tab.id) {
        console.log(`Content script heartbeat received from tab ${sender.tab.id}:`, message.url);
        // Update the map to ensure we know this content script is active
        contentScriptTabs.set(sender.tab.id, true);
      } else {
        console.log('Content script heartbeat received but sender tab info is missing');
      }
      sendResponse({ success: true, message: 'Background script acknowledged heartbeat' });
      break;
    
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
          
          // Execute script in the tab to click the element
          const tabId = tabs[0].id;
          const selector = message.payload?.selector;
          
          if (!selector) {
            sendResponse({
              success: false,
              error: 'No selector provided'
            });
            return;
          }
          
          // Use chrome.scripting.executeScript instead of chrome.tabs.executeScript
          const results = await chrome.scripting.executeScript({
            target: { tabId },
            func: (selector) => {
              try {
                const element = document.querySelector(selector);
                if (!element) {
                  return { 
                    success: false, 
                    error: `Element not found with selector: ${selector}` 
                  };
                }
                
                // Get element position
                const rect = element.getBoundingClientRect();
                const x = rect.left + (rect.width / 2);
                const y = rect.top + (rect.height / 2);
                
                // Scroll element into view
                element.scrollIntoView({ behavior: 'auto', block: 'center' });
                
                // Create and dispatch mouse events
                const events = [
                  new MouseEvent('mouseover', { bubbles: true, clientX: x, clientY: y }),
                  new MouseEvent('mouseenter', { bubbles: true, clientX: x, clientY: y }),
                  new MouseEvent('mousedown', { bubbles: true, clientX: x, clientY: y }),
                  new MouseEvent('mouseup', { bubbles: true, clientX: x, clientY: y }),
                  new MouseEvent('click', { bubbles: true, clientX: x, clientY: y })
                ];
                
                events.forEach(event => element.dispatchEvent(event));
                
                return { 
                  success: true, 
                  message: 'Element clicked successfully',
                  position: { x, y }
                };
              } catch (error) {
                return { 
                  success: false, 
                  error: 'Error clicking element: ' + (error instanceof Error ? error.message : String(error))
                };
              }
            },
            args: [selector]
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
          const append = message.payload?.append === true;
          
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
          
          chrome.tabs.executeScript(
            tabId,
            {
              code: `
                (function() {
                  try {
                    const element = document.querySelector('${selector.replace(/'/g, "\\'")}');
                    if (!element) {
                      return { success: false, error: 'Element not found with selector: ${selector.replace(/'/g, "\\'")}' };
                    }
                    
                    // Scroll element into view
                    element.scrollIntoView({ behavior: 'auto', block: 'center' });
                    
                    // Focus the element
                    element.focus();
                    
                    // Handle different types of elements
                    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
                      // For standard form elements
                      if (${append}) {
                        element.value = element.value + \`${text.replace(/`/g, '\\`')}\`;
                      } else {
                        element.value = \`${text.replace(/`/g, '\\`')}\`;
                      }
                      
                      // Trigger input and change events
                      element.dispatchEvent(new Event('input', { bubbles: true }));
                      element.dispatchEvent(new Event('change', { bubbles: true }));
                    } else if (element.isContentEditable) {
                      // For contentEditable elements
                      if (${append}) {
                        element.textContent = (element.textContent || '') + \`${text.replace(/`/g, '\\`')}\`;
                      } else {
                        element.textContent = \`${text.replace(/`/g, '\\`')}\`;
                      }
                      
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
                      error: 'Error typing text: ' + (error.message || String(error))
                    };
                  }
                })();
              `
            },
            (results) => {
              if (chrome.runtime.lastError) {
                sendResponse({
                  success: false,
                  error: chrome.runtime.lastError.message || 'Error executing script in tab'
                });
                return;
              }
              
              if (!results || results.length === 0) {
                sendResponse({
                  success: false,
                  error: 'No result from tab script execution'
                });
                return;
              }
              
              // Return the result
              sendResponse(results[0]);
            }
          );
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
          
          chrome.tabs.executeScript(
            tabId,
            {
              code: `
                (function() {
                  try {
                    const elements = Array.from(document.querySelectorAll('${selector.replace(/'/g, "\\'")}'));
                    if (!elements || elements.length === 0) {
                      return { 
                        success: false, 
                        error: 'No elements found with selector: ${selector.replace(/'/g, "\\'")}' 
                      };
                    }
                    
                    const limit = ${limit};
                    const limitedElements = elements.slice(0, limit);
                    
                    const elementInfos = limitedElements.map(element => {
                      // Get all attributes as key-value pairs
                      const attributesObj = {};
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
                      error: 'Error getting element information: ' + (error.message || String(error))
                    };
                  }
                })();
              `
            },
            (results) => {
              if (chrome.runtime.lastError) {
                sendResponse({
                  success: false,
                  error: chrome.runtime.lastError.message || 'Error executing script in tab'
                });
                return;
              }
              
              if (!results || results.length === 0) {
                sendResponse({
                  success: false,
                  error: 'No result from tab script execution'
                });
                return;
              }
              
              // Return the result
              sendResponse(results[0]);
            }
          );
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
      console.log('Unhandled message type:', message.type);
      sendResponse({ success: false, error: `Unhandled message type: ${message.type}` });
      break;
  }
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
          
        default:
          console.warn('Unknown side panel message type:', message.type);
          port.postMessage({ type: 'ERROR', error: 'Unknown message type' });
      }
    });

    port.onDisconnect.addListener(() => {
      console.log('Side panel disconnected');
    });
  }
});

// Helper function to handle chat messages
async function handleChatMessage(message: any, port: chrome.runtime.Port) {
  try {
    const requestId = Date.now().toString();
    
    // Instead of trying to use fetch to an API endpoint within the extension,
    // directly call the handler function with properly formatted request
    const body = {
      messages: [{
        role: 'user',
        content: message.message
      }],
      apiKey: message.apiKey,
      provider: message.provider
    };
    
    // Create a request object for the handler
    const request = new Request('chrome-extension://internal/api/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${message.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    try {
      // Call the handler directly instead of using fetch
      const response = await handleChatRoute(request);
      
      if (response.headers.get('Content-Type')?.includes('text/plain')) {
        // Handle streaming response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        
        if (reader) {
          try {
            let accumulatedText = '';
            let buffer = '';
            
            while (true) {
              const { done, value } = await reader.read();
              
              if (done) {
                // Send final message with complete text
                port.postMessage({ 
                  type: 'CHAT_RESPONSE',
                  requestId,
                  data: {
                    choices: [{
                      message: {
                        content: accumulatedText
                      }
                    }]
                  }
                });
                
                // Also send end of stream message
                port.postMessage({
                  type: 'CHAT_STREAM_END',
                  requestId
                });
                
                break;
              }
              
              // Decode the chunk with proper streaming setup
              buffer += decoder.decode(value, { stream: true });
              
              // Process SSE format
              const lines = buffer.split('\n');
              buffer = lines.pop() || ''; // Keep the last (potentially incomplete) line in the buffer
              
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(5); // Remove 'data: ' prefix
                  
                  // Handle [DONE] message
                  if (data === '[DONE]') {
                    continue;
                  }
                  
                  try {
                    const parsedData = JSON.parse(data);
                    
                    // Extract content from OpenAI response format
                    if (parsedData.choices && parsedData.choices.length > 0) {
                      const delta = parsedData.choices[0].delta;
                      
                      if (delta && delta.content) {
                        const content = delta.content;
                        accumulatedText += content;
                        
                        // Send only the actual content as a chunk
                        port.postMessage({ 
                          type: 'CHAT_STREAM_CHUNK',
                          requestId,
                          chunk: content 
                        });
                      }
                    } 
                    // Handle Anthropic format (if needed)
                    else if (parsedData.type === 'content_block_delta' && parsedData.delta && parsedData.delta.text) {
                      const content = parsedData.delta.text;
                      accumulatedText += content;
                      
                      port.postMessage({ 
                        type: 'CHAT_STREAM_CHUNK',
                        requestId,
                        chunk: content 
                      });
                    }
                  } catch (error) {
                    console.warn('Error parsing SSE data:', error);
                    // If parsing fails, ignore this line
                  }
                }
              }
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Error reading stream:', errorMessage);
            port.postMessage({ 
              type: 'ERROR',
              requestId,
              error: errorMessage 
            });
          }
        }
      } else {
        // Handle JSON response
        const data = await response.json();
        port.postMessage({ 
          type: 'CHAT_RESPONSE',
          requestId,
          data 
        });
      }
    } catch (error) {
      console.error('Error processing chat:', error);
      
      // Use fallback mode
      const fallbackResponse = {
        type: 'CHAT_RESPONSE',
        requestId,
        data: {
          choices: [{
            message: {
              content: "I'm having trouble connecting to the API. Let me use my fallback mode to help you with Earth Engine.\n\n" + 
                       generateFallbackResponse(message.message)
            }
          }]
        }
      };
      
      port.postMessage(fallbackResponse);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Chat processing error:', errorMessage);
    port.postMessage({ 
      type: 'ERROR',
      requestId: Date.now().toString(),
      error: errorMessage 
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