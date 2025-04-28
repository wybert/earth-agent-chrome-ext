/**
 * Click tool for browser automation
 * This tool clicks an element on the page using a CSS selector
 * 
 * @returns Promise with success status and result message
 */

import { detectEnvironment } from '@/lib/utils';

export interface ClickResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface ClickParams {
  selector: string;
}

/**
 * Click an element on the page using a CSS selector
 * 
 * @param params Object containing the selector to locate the element
 * @returns Promise with success status and result message/error
 */
export async function click(params: ClickParams): Promise<ClickResponse> {
  try {
    const { selector } = params;
    
    if (!selector) {
      return {
        success: false,
        error: 'Selector is required'
      };
    }
    
    // If running in a content script or sidepanel context, use the background script
    const env = detectEnvironment();
    
    if (env.useBackgroundProxy && typeof chrome !== 'undefined' && chrome.runtime) {
      return new Promise<ClickResponse>((resolve) => {
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
              type: 'CLICK',
              payload: { selector }
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
      return new Promise<ClickResponse>((resolve) => {
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
          
          // Execute script in the tab to click the element
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
                    
                    // Simulate a click event
                    element.click();
                    
                    return { success: true, message: 'Element clicked successfully' };
                  } catch (error) {
                    return { 
                      success: false, 
                      error: 'Error clicking element: ' + (error.message || String(error))
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
            error: `Element not found with selector: ${selector}`
          };
        }
        
        // Scroll element into view
        element.scrollIntoView({ behavior: 'auto', block: 'center' });
        
        // Simulate a click event
        (element as HTMLElement).click();
        
        return {
          success: true,
          message: 'Element clicked successfully'
        };
      } catch (error) {
        return {
          success: false,
          error: `Error clicking element: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    }
    
    // If not in a browser environment, we can't click elements
    if (env.isNodeJs) {
      return {
        success: false,
        error: 'Cannot click elements in Node.js environment'
      };
    }
    
    // Default error if environment detection doesn't work as expected
    return {
      success: false,
      error: 'Unsupported environment for clicking elements'
    };
  } catch (error) {
    return {
      success: false,
      error: `Error clicking element: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export default click; 