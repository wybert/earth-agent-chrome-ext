/**
 * Type tool for browser automation
 * This tool types text into an input, textarea, or contentEditable element
 * 
 * @returns Promise with success status and result message
 */

import { detectEnvironment } from '@/lib/utils';

export interface TypeResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface TypeParams {
  selector: string;
  text: string;
}

/**
 * Type text into an input, textarea, or contentEditable element
 * 
 * @param params.selector CSS selector for the element to type into
 * @param params.text Text to type
 * @returns Promise with success status and result message/error
 */
export async function type(params: TypeParams): Promise<TypeResponse> {
  try {
    const { selector, text } = params;
    
    if (!selector) {
      return {
        success: false,
        error: 'Selector is required'
      };
    }
    
    if (text === undefined || text === null) {
      return {
        success: false,
        error: 'Text is required'
      };
    }
    
    // If running in a content script or sidepanel context, use the background script
    const env = detectEnvironment();
    
    if (env.useBackgroundProxy && typeof chrome !== 'undefined' && chrome.runtime) {
      return new Promise<TypeResponse>((resolve) => {
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
              type: 'TYPE',
              payload: { selector, text }
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
    if (env.isBackground && typeof chrome !== 'undefined' && chrome.scripting) {
      return new Promise<TypeResponse>((resolve) => {
        // Get the active tab
        chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
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
          
          try {
            // Execute script in the tab to type text
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
              resolve({
                success: false,
                error: 'No result from script execution'
              });
              return;
            }

            // Return the result from the executed script
            const scriptResult = results[0].result as TypeResponse;
            resolve(scriptResult);
          } catch (error) {
            resolve({
              success: false,
              error: `Error executing script: ${error instanceof Error ? error.message : String(error)}`
            });
          }
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
            error: `Element not found with selector: ${selector}`
          };
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
        
        return {
          success: true,
          message: 'Text typed successfully'
        };
      } catch (error) {
        return {
          success: false,
          error: `Error typing text: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    }
    
    // If not in a browser environment, we can't type text
    if (env.isNodeJs) {
      return {
        success: false,
        error: 'Cannot type text in Node.js environment'
      };
    }
    
    // Default error if environment detection doesn't work as expected
    return {
      success: false,
      error: 'Unsupported environment for typing text'
    };
  } catch (error) {
    return {
      success: false,
      error: `Error typing text: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export default type; 