/**
 * Click tool for browser automation
 * This tool clicks an element on the page using element reference from accessibility snapshot
 * Matches the playwright-mcp implementation exactly
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
  element: string; // Human-readable element description used to obtain permission to interact with the element
  ref: string; // Exact target element reference from the page snapshot
}

/**
 * Perform click on a web page using element reference from accessibility snapshot
 * 
 * @param params.element Human-readable element description
 * @param params.ref Exact target element reference from the page snapshot
 * @returns Promise with success status and result message/error
 */
export async function click(params: ClickParams): Promise<ClickResponse> {
  try {
    const { element, ref } = params;

    if (!element || !ref) {
      return {
        success: false,
        error: 'Both element description and ref are required'
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
              payload: { element, ref }
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

          // Execute script in the tab to click element by reference
          chrome.scripting.executeScript({
            target: { tabId },
            func: (elementDescription: string, ref: string) => {
              try {
                // Function to find element recursively in document and shadow DOMs
                const findElementInShadowDom = (currentRoot: Document | ShadowRoot, refValue: string): Element | null => {
                  const foundElement = currentRoot.querySelector(`[aria-ref="${refValue}"]`);
                  if (foundElement) {
                    return foundElement;
                  }

                  // Search in all open shadow roots within the current root
                  const shadowHosts = currentRoot.querySelectorAll('*');
                  for (const host of Array.from(shadowHosts)) {
                    if (host.shadowRoot && host.shadowRoot.mode === 'open') {
                      const elementInShadow = findElementInShadowDom(host.shadowRoot, refValue);
                      if (elementInShadow) {
                        return elementInShadow;
                      }
                    }
                  }
                  return null;
                };

                // Find element by aria-ref attribute (matches playwright-mcp locator pattern)
                console.log(`[Content Script - Click] Attempting to find element with ref: "${ref}"`);
                const element = findElementInShadowDom(document, ref);
                
                if (!element) {
                  console.error(`[Content Script - Click] Element not found with ref: "${ref}" in document or any shadow DOMs.`);
                  return { 
                    success: false, 
                    error: `Element not found with ref: ${ref}` 
                  };
                }
                console.log(`[Content Script - Click] Found element for ref "${ref}":`, element);

                // Ensure element is still connected to the DOM
                if (!element.isConnected) {
                  return {
                    success: false,
                    error: `Element with ref: ${ref} is detached from the DOM`
                  };
                }
                
                // Scroll element into view
                element.scrollIntoView({ behavior: 'auto', block: 'center' });
                
                // Get element's bounding rect for click coordinates
                const rect = element.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                
                // Create and dispatch click events (matching playwright behavior)
                const mouseDownEvent = new MouseEvent('mousedown', {
                  view: window,
                  bubbles: true,
                  cancelable: true,
                  clientX: centerX,
                  clientY: centerY,
                  button: 0
                });
                
                const mouseUpEvent = new MouseEvent('mouseup', {
                  view: window,
                  bubbles: true,
                  cancelable: true,
                  clientX: centerX,
                  clientY: centerY,
                  button: 0
                });
                
                const clickEvent = new MouseEvent('click', {
                  view: window,
                  bubbles: true,
                  cancelable: true,
                  clientX: centerX,
                  clientY: centerY,
                  button: 0
                });
                
                // Dispatch events in order (mousedown -> mouseup -> click)
                element.dispatchEvent(mouseDownEvent);
                element.dispatchEvent(mouseUpEvent);
                element.dispatchEvent(clickEvent);
                
                // Also trigger native click for form elements and links
                if (element instanceof HTMLElement) {
                  element.click();
                }
                console.log(`[Content Script - Click] Click dispatched for element with ref: "${ref}"`);
                return { 
                  success: true, 
                  message: `Click executed successfully on ${elementDescription}` 
                };
              } catch (error) {
                console.error(`[Content Script - Click] Error clicking element with ref "${ref}":`, error);
                return { 
                  success: false, 
                  error: `Error clicking element: ${error instanceof Error ? error.message : String(error)}`
                };
              }
            },
            args: [element, ref]
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
        // Function to find element recursively in document and shadow DOMs
        const findElementInShadowDomDirect = (currentRoot: Document | ShadowRoot, refValue: string): Element | null => {
          const foundElement = currentRoot.querySelector(`[aria-ref="${refValue}"]`);
          if (foundElement) {
            return foundElement;
          }

          // Search in all open shadow roots within the current root
          const shadowHosts = currentRoot.querySelectorAll('*');
          for (const host of Array.from(shadowHosts)) {
            if (host.shadowRoot && host.shadowRoot.mode === 'open') {
              const elementInShadow = findElementInShadowDomDirect(host.shadowRoot, refValue);
              if (elementInShadow) {
                return elementInShadow;
              }
            }
          }
          return null;
        };

        // Find element by aria-ref attribute (matches playwright-mcp locator pattern)
        console.log(`[Content Script - Click Direct] Attempting to find element with ref: "${ref}"`);
        const targetElement = findElementInShadowDomDirect(document, ref);
        
        if (!targetElement) {
          console.error(`[Content Script - Click Direct] Element not found with ref: "${ref}" in document or any shadow DOMs.`);
          return {
            success: false,
            error: `Element not found with ref: ${ref}`
          };
        }
        console.log(`[Content Script - Click Direct] Found element for ref "${ref}":`, targetElement);

        // Ensure element is still connected to the DOM
        if (!targetElement.isConnected) {
          return {
            success: false,
            error: `Element with ref: ${ref} is detached from the DOM`
          };
        }
        
        // Scroll element into view
        targetElement.scrollIntoView({ behavior: 'auto', block: 'center' });
        
        // Get element's bounding rect for click coordinates
        const rect = targetElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // Create and dispatch click events (matching playwright behavior)
        const mouseDownEvent = new MouseEvent('mousedown', {
          view: window,
          bubbles: true,
          cancelable: true,
          clientX: centerX,
          clientY: centerY,
          button: 0
        });
        
        const mouseUpEvent = new MouseEvent('mouseup', {
          view: window,
          bubbles: true,
          cancelable: true,
          clientX: centerX,
          clientY: centerY,
          button: 0
        });
        
        const clickEvent = new MouseEvent('click', {
          view: window,
          bubbles: true,
          cancelable: true,
          clientX: centerX,
          clientY: centerY,
          button: 0
        });
        
        // Dispatch events in order (mousedown -> mouseup -> click)
        targetElement.dispatchEvent(mouseDownEvent);
        targetElement.dispatchEvent(mouseUpEvent);
        targetElement.dispatchEvent(clickEvent);
        
        // Also trigger native click for form elements and links
        if (targetElement instanceof HTMLElement) {
          targetElement.click();
        }
        console.log(`[Content Script - Click Direct] Click dispatched for element with ref: "${ref}"`);
        return {
          success: true,
          message: `Click executed successfully on ${element}`
        };
      } catch (error) {
        console.error(`[Content Script - Click Direct] Error clicking element with ref "${ref}":`, error);
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