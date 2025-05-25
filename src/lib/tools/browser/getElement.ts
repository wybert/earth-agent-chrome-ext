/**
 * GetElement tool for browser automation
 * This tool retrieves information about elements on the page using a CSS selector
 * 
 * @returns Promise with success status and element information
 */

import { detectEnvironment } from '@/lib/utils';

export interface ElementInfo {
  tagName: string;
  id?: string;
  className?: string;
  textContent?: string;
  value?: string;
  attributes: Record<string, string>;
  isVisible: boolean;
  isEnabled: boolean;
  boundingRect?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
    width: number;
    height: number;
  };
}

export interface GetElementResponse {
  success: boolean;
  elements?: ElementInfo[];
  count?: number;
  error?: string;
}

export interface GetElementParams {
  selector: string;
  limit?: number;
}

/**
 * Get information about elements on the page using a CSS selector
 * 
 * @param params Object containing the selector and optional limit
 * @returns Promise with success status and element information
 */
export async function getElement(params: GetElementParams): Promise<GetElementResponse> {
  try {
    const { selector, limit = 10 } = params;
    
    if (!selector) {
      return {
        success: false,
        error: 'Selector is required'
      };
    }
    
    // If running in a content script or sidepanel context, use the background script
    const env = detectEnvironment();
    
    if (env.useBackgroundProxy && typeof chrome !== 'undefined' && chrome.runtime) {
      return new Promise<GetElementResponse>((resolve) => {
        // Add a timeout to handle cases where background script doesn't respond
        const timeoutId = setTimeout(() => {
          console.warn('Background script connection timed out.');
          resolve({
            success: false,
            error: 'Background script connection timed out'
          });
        }, 5000); // 5 second timeout
        
        try {
          chrome.runtime.sendMessage(
            {
              type: 'GET_ELEMENT',
              payload: { selector, limit }
            },
            (response) => {
              // Clear the timeout since we got a response
              clearTimeout(timeoutId);
              
              if (chrome.runtime.lastError) {
                console.warn('Chrome runtime error:', chrome.runtime.lastError);
                resolve({
                  success: false,
                  error: chrome.runtime.lastError.message || 'Error communicating with background script'
                });
                return;
              }
              
              // We got a valid response from the background
              resolve(response);
            }
          );
        } catch (err) {
          // Clear the timeout
          clearTimeout(timeoutId);
          console.error('Error sending message to background script:', err);
          resolve({
            success: false,
            error: err instanceof Error ? err.message : String(err)
          });
        }
      });
    }
    
    // If running in the background script
    if (env.isBackground && typeof chrome !== 'undefined' && chrome.tabs) {
      return new Promise<GetElementResponse>((resolve) => {
        // Get the active tab
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (!tabs || tabs.length === 0) {
            resolve({
              success: false,
              error: 'No active tab found'
            });
            return;
          }
          
          const tabId = tabs[0].id;
          if (!tabId) {
            resolve({
              success: false,
              error: 'Invalid tab'
            });
            return;
          }
          
          // Execute script in the tab to get element information
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
                resolve({
                  success: false,
                  error: chrome.runtime.lastError.message || 'Error executing script in tab'
                });
                return;
              }
              
              if (!results || results.length === 0) {
                resolve({
                  success: false,
                  error: 'No result from tab script execution'
                });
                return;
              }
              
              // Return the result from the executed script
              resolve(results[0]);
            }
          );
        });
      });
    }
    
    // If running directly in page context (content script)
    if (env.isContentScript && typeof document !== 'undefined') {
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
          for (const attr of Array.from(element.attributes)) {
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
    }
    
    // If not in a browser environment, we can't get elements
    if (env.isNodeJs) {
      return {
        success: false,
        error: 'Cannot get element information in Node.js environment'
      };
    }
    
    // Default error if environment detection doesn't work as expected
    return {
      success: false,
      error: 'Unsupported environment for getting element information'
    };
  } catch (error) {
    return {
      success: false,
      error: `Error getting element information: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export default getElement;

export interface GetElementByRefIdParams {
  refId: string;
}

/**
 * Get information about an element on the page using its aria-ref ID
 * 
 * @param params Object containing the refId
 * @returns Promise with success status and element information
 */
export async function getElementByRefId(params: GetElementByRefIdParams): Promise<GetElementResponse> {
  try {
    const { refId } = params;
    
    if (!refId) {
      return {
        success: false,
        error: 'refId is required'
      };
    }
    
    const selector = `[aria-ref="${refId}"]`;
    
    // If running in a content script or sidepanel context, use the background script
    const env = detectEnvironment();
    
    if (env.useBackgroundProxy && typeof chrome !== 'undefined' && chrome.runtime) {
      return new Promise<GetElementResponse>((resolve) => {
        // Add a timeout to handle cases where background script doesn't respond
        const timeoutId = setTimeout(() => {
          console.warn('Background script connection timed out.');
          resolve({
            success: false,
            error: 'Background script connection timed out'
          });
        }, 5000); // 5 second timeout
        
        try {
          chrome.runtime.sendMessage(
            {
              type: 'GET_ELEMENT_BY_REF_ID', // New message type
              payload: { refId }
            },
            (response) => {
              // Clear the timeout since we got a response
              clearTimeout(timeoutId);
              
              if (chrome.runtime.lastError) {
                console.warn('Chrome runtime error:', chrome.runtime.lastError);
                resolve({
                  success: false,
                  error: chrome.runtime.lastError.message || 'Error communicating with background script'
                });
                return;
              }
              
              // We got a valid response from the background
              resolve(response);
            }
          );
        } catch (err) {
          // Clear the timeout
          clearTimeout(timeoutId);
          console.error('Error sending message to background script:', err);
          resolve({
            success: false,
            error: err instanceof Error ? err.message : String(err)
          });
        }
      });
    }
    
    // If running in the background script
    if (env.isBackground && typeof chrome !== 'undefined' && chrome.tabs) {
      return new Promise<GetElementResponse>((resolve) => {
        // Get the active tab
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (!tabs || tabs.length === 0) {
            resolve({
              success: false,
              error: 'No active tab found'
            });
            return;
          }
          
          const tabId = tabs[0].id;
          if (!tabId) {
            resolve({
              success: false,
              error: 'Invalid tab'
            });
            return;
          }
          
          // Execute script in the tab to get element information
          chrome.tabs.executeScript(
            tabId,
            {
              code: `
                (function() {
                  try {
                    const element = document.querySelector('${selector.replace(/'/g, "\\'")}');
                    if (!element) {
                      return { 
                        success: false, 
                        error: 'No element found with refId: ${refId.replace(/'/g, "\\'")}' 
                      };
                    }
                    
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
                    
                    const elementInfo = {
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
                    
                    return { 
                      success: true, 
                      elements: [elementInfo], // Return as an array for consistency
                      count: 1
                    };
                  } catch (error) {
                    return { 
                      success: false, 
                      error: 'Error getting element information by refId: ' + (error.message || String(error))
                    };
                  }
                })();
              `
            },
            (results) => {
              if (chrome.runtime.lastError) {
                resolve({
                  success: false,
                  error: chrome.runtime.lastError.message || 'Error executing script in tab'
                });
                return;
              }
              
              if (!results || results.length === 0) {
                resolve({
                  success: false,
                  error: 'No result from tab script execution'
                });
                return;
              }
              
              // Return the result from the executed script
              resolve(results[0]);
            }
          );
        });
      });
    }
    
    // If running directly in page context (content script)
    if (env.isContentScript && typeof document !== 'undefined') {
      try {
        const element = document.querySelector(selector);
        if (!element) {
          return {
            success: false,
            error: `No element found with refId: ${refId}`
          };
        }
        
        const attributesObj: Record<string, string> = {};
        for (const attr of Array.from(element.attributes)) {
          attributesObj[attr.name] = attr.value;
        }
        
        const style = window.getComputedStyle(element);
        const isVisible = style.display !== 'none' && 
                         style.visibility !== 'hidden' && 
                         style.opacity !== '0';
        
        let isEnabled = true;
        if (element instanceof HTMLButtonElement || 
            element instanceof HTMLInputElement || 
            element instanceof HTMLSelectElement || 
            element instanceof HTMLTextAreaElement || 
            element instanceof HTMLOptionElement) {
          isEnabled = !element.disabled;
        }
        
        const rect = element.getBoundingClientRect();
        const boundingRect = {
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          left: rect.left,
          width: rect.width,
          height: rect.height
        };
        
        let value = undefined;
        if (element instanceof HTMLInputElement || 
            element instanceof HTMLTextAreaElement || 
            element instanceof HTMLSelectElement) {
          value = element.value;
        }
        
        const elementInfo: ElementInfo = {
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
        
        return {
          success: true,
          elements: [elementInfo], // Return as an array
          count: 1
        };
      } catch (error) {
        return {
          success: false,
          error: `Error getting element information by refId: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    }
    
    // If not in a browser environment, we can't get elements
    if (env.isNodeJs) {
      return {
        success: false,
        error: 'Cannot get element information by refId in Node.js environment'
      };
    }
    
    // Default error if environment detection doesn't work as expected
    return {
      success: false,
      error: 'Unsupported environment for getting element information by refId'
    };
  } catch (error) {
    return {
      success: false,
      error: `Error getting element information by refId: ${error instanceof Error ? error.message : String(error)}`
    };
  }
} 