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

export interface Position {
  x: number;
  y: number;
}

export interface ClickParams {
  selector?: string;
  position?: Position;
}

/**
 * Click an element on the page using a CSS selector or coordinates
 * 
 * @param params.selector CSS selector for the element to click
 * @param params.position Coordinates {x, y} where to click
 * @returns Promise with success status and result message/error
 */
export async function click(params: ClickParams): Promise<ClickResponse> {
  try {
    const { selector, position } = params;

    if (!selector && !position) {
      return {
        success: false,
        error: 'Either selector or position must be provided'
      };
    }

    // Detect environment and handle accordingly
    const env = detectEnvironment();

    // If running in a content script or sidepanel context, use the background script
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
              payload: { selector, position }
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

          // Execute script in the tab to click element
          chrome.scripting.executeScript({
            target: { tabId },
            func: (selector: string | null, position: Position | null) => {
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
          }).then(results => {
            if (!results || results.length === 0) {
              resolve({
                success: false,
                error: 'No result from script execution'
              });
              return;
            }
            
            // Return the result
            resolve(results[0].result as ClickResponse);
          }).catch(error => {
            resolve({
              success: false,
              error: `Error executing script: ${error instanceof Error ? error.message : String(error)}`
            });
          });
        });
      });
    }

    // If running directly in page context (content script)
    if (env.isContentScript && typeof document !== 'undefined') {
      try {
        let element: Element | null = null;
        
        if (selector) {
          element = document.querySelector(selector);
          if (!element) {
            return {
              success: false,
              error: `Element not found with selector: ${selector}`
            };
          }
          
          // Scroll element into view
          element.scrollIntoView({ behavior: 'auto', block: 'center' });
        } else if (position) {
          element = document.elementFromPoint(position.x, position.y);
          if (!element) {
            return {
              success: false,
              error: `No element found at position (${position.x}, ${position.y})`
            };
          }
        }
        
        if (!element) {
          return {
            success: false,
            error: 'No element to click'
          };
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
        
        return {
          success: true,
          message: 'Click executed successfully'
        };
      } catch (error) {
        return {
          success: false,
          error: `Error clicking element: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    }

    // If running in Node.js or unsupported environment
    return {
      success: false,
      error: 'Click operation is not supported in this environment'
    };
  } catch (error) {
    return {
      success: false,
      error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export default click; 