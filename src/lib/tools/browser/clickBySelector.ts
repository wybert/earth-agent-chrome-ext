/**
 * ClickBySelector tool for browser automation
 * This tool clicks an element on the page using CSS selector
 * Useful for testing and direct element interaction
 *
 * @returns Promise with success status and result message
 */

import { detectEnvironment } from '@/lib/utils';

export interface ClickBySelectorParams {
  selector: string; // CSS selector for the element to click
  elementDescription?: string; // Optional human-readable description
}

export interface ClickBySelectorResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Perform click on a web page using CSS selector
 *
 * @param params.selector CSS selector for the element to click
 * @param params.elementDescription Optional human-readable description
 * @returns Promise with success status and result message/error
 */
export async function clickBySelector(params: ClickBySelectorParams): Promise<ClickBySelectorResponse> {
  const { selector, elementDescription } = params;

  if (!selector) {
    return {
      success: false,
      error: 'CSS selector is required',
    };
  }

  console.log(`[Click By Selector] Attempting to click element with selector: "${selector}"`);

  // Environment detection logic
  const isWindowUndefined = typeof window === 'undefined';
  const isSelfDefined = typeof self !== 'undefined';
  const isChromeDefined = typeof chrome !== 'undefined';
  const hasChromeRuntimeId = isChromeDefined && chrome.runtime?.id;
  const hasChromeTabs = isChromeDefined && !!chrome.tabs;
  const hasChromeScripting = isChromeDefined && !!chrome.scripting;

  // Check if we're in a background script context
  if (isWindowUndefined && isSelfDefined && isChromeDefined && hasChromeRuntimeId && hasChromeTabs && hasChromeScripting) {
    console.log('[Click By Selector] Detected background script context');
    return handleBackgroundScriptClickBySelector(params);
  }

  try {
    const env = detectEnvironment();
    console.log('[Click By Selector] Environment detection result:', env);

    // If we're in background or using background proxy
    if ((env.isBackground && typeof chrome !== 'undefined' && chrome.tabs) || 
        (env.useBackgroundProxy && typeof chrome !== 'undefined' && chrome.runtime)) {
      console.log('[Click By Selector] Using background script for click operation');
      return sendClickBySelectorToBackground(params);
    }

    // If running directly in content script
    if (env.isContentScript && typeof document !== 'undefined') {
      console.log('[Click By Selector] Running directly in content script context');
      return executeClickBySelectorInPage(selector, elementDescription);
    }

    return {
      success: false,
      error: 'Click by selector could not be performed in the current environment.'
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Click By Selector] Error during environment detection or execution:', errorMessage);
    return {
      success: false,
      error: `Error in clickBySelector: ${errorMessage}`
    };
  }
}

/**
 * Send clickBySelector request to background script
 */
async function sendClickBySelectorToBackground(params: ClickBySelectorParams): Promise<ClickBySelectorResponse> {
  return new Promise<ClickBySelectorResponse>((resolve) => {
    const timeoutId = setTimeout(() => {
      console.warn('[Click By Selector] Background script connection timed out.');
      resolve({
        success: false,
        error: 'Background script connection timed out'
      });
    }, 5000);

    try {
      chrome.runtime.sendMessage(
        {
          type: 'CLICK_BY_SELECTOR',
          payload: params
        },
        (response) => {
          clearTimeout(timeoutId);
          if (chrome.runtime.lastError) {
            resolve({
              success: false,
              error: chrome.runtime.lastError.message || 'Error communicating with background script'
            });
            return;
          }
          resolve(response);
        }
      );
    } catch (err) {
      clearTimeout(timeoutId);
      resolve({
        success: false,
        error: err instanceof Error ? err.message : String(err)
      });
    }
  });
}

/**
 * Handle clickBySelector when running in background script context
 */
async function handleBackgroundScriptClickBySelector(params: ClickBySelectorParams): Promise<ClickBySelectorResponse> {
  const { selector, elementDescription } = params;
  
  console.log('[Click By Selector - Background] Handling click by selector in background script');
  
  return new Promise<ClickBySelectorResponse>((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        console.error('[Click By Selector - Background] Error querying tabs:', chrome.runtime.lastError.message);
        resolve({ success: false, error: `Error querying tabs: ${chrome.runtime.lastError.message}` });
        return;
      }
      
      if (!tabs || tabs.length === 0) {
        console.error('[Click By Selector - Background] No active tab found');
        resolve({ success: false, error: 'No active tab found' });
        return;
      }

      const tabId = tabs[0].id;
      if (!tabId) {
        console.error('[Click By Selector - Background] Invalid tab ID');
        resolve({ success: false, error: 'Invalid tab' });
        return;
      }

      console.log(`[Click By Selector - Background] Executing script in tab ${tabId}`);
      
      chrome.scripting.executeScript({
        target: { tabId },
        func: (selector: string, description?: string) => {
          try {
            console.log(`[Content Script - Click By Selector] Looking for element with selector: "${selector}"`);
            
            // Function to search in shadow DOMs as well
            const findElementInShadowDoms = (root: Document | ShadowRoot, selector: string): Element | null => {
              // Try direct query first
              try {
                const element = root.querySelector(selector);
                if (element) {
                  console.log(`[Content Script - Click By Selector] Found element directly:`, element);
                  return element;
                }
              } catch (error) {
                console.error(`[Content Script - Click By Selector] Error in direct querySelector:`, error);
              }
              
              // Search in shadow DOMs
              const allElements = root.querySelectorAll('*');
              for (const host of Array.from(allElements)) {
                if (host.shadowRoot && host.shadowRoot.mode === 'open') {
                  console.log(`[Content Script - Click By Selector] Searching in shadow DOM of:`, host);
                  const elementInShadow = findElementInShadowDoms(host.shadowRoot, selector);
                  if (elementInShadow) {
                    console.log(`[Content Script - Click By Selector] Found element in shadow DOM:`, elementInShadow);
                    return elementInShadow;
                  }
                }
              }
              
              return null;
            };

            const element = findElementInShadowDoms(document, selector);
            
            if (!element) {
              console.error(`[Content Script - Click By Selector] Element not found with selector: "${selector}"`);
              return {
                success: false,
                error: `Element not found with selector: ${selector}`
              };
            }

            console.log(`[Content Script - Click By Selector] Found element:`, element);
            console.log(`[Content Script - Click By Selector] Element details: tagName=${element.tagName}, id=${element.id || 'none'}, class=${element.className || 'none'}`);

            // Check if element is connected to DOM
            if (!element.isConnected) {
              console.error(`[Content Script - Click By Selector] Element is detached from DOM`);
              return {
                success: false,
                error: 'Element is detached from the DOM'
              };
            }

            // Scroll element into view
            console.log(`[Content Script - Click By Selector] Scrolling element into view`);
            element.scrollIntoView({ behavior: 'auto', block: 'center' });

            // Get element's bounding rect for click coordinates
            const rect = element.getBoundingClientRect();
            console.log(`[Content Script - Click By Selector] Element bounding rect:`, rect);
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            // Create and dispatch mouse events
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

            // Dispatch events in sequence
            console.log(`[Content Script - Click By Selector] Dispatching mouse events`);
            element.dispatchEvent(mouseDownEvent);
            element.dispatchEvent(mouseUpEvent);
            element.dispatchEvent(clickEvent);

            // Also trigger native click for form elements and links
            if (element instanceof HTMLElement) {
              console.log(`[Content Script - Click By Selector] Calling native click() method`);
              element.click();
            }

            console.log(`[Content Script - Click By Selector] Click sequence completed`);
            return {
              success: true,
              message: `Successfully clicked element with selector: ${selector}${description ? ` (${description})` : ''}`
            };
          } catch (error) {
            console.error(`[Content Script - Click By Selector] Error clicking element:`, error);
            return {
              success: false,
              error: `Error clicking element: ${error instanceof Error ? error.message : String(error)}`
            };
          }
        },
        args: [selector, elementDescription]
      }).then((results) => {
        if (chrome.runtime.lastError) {
          console.error('[Click By Selector - Background] Script execution error:', chrome.runtime.lastError.message);
          resolve({
            success: false,
            error: `Script execution error: ${chrome.runtime.lastError.message}`
          });
          return;
        }

        const result = results?.[0]?.result;
        if (!result) {
          console.error('[Click By Selector - Background] No result from script execution');
          resolve({
            success: false,
            error: 'No result from script execution'
          });
          return;
        }

        console.log('[Click By Selector - Background] Script execution result:', result);
        resolve(result);
      }).catch((error) => {
        console.error('[Click By Selector - Background] Script execution failed:', error);
        resolve({
          success: false,
          error: `Script execution failed: ${error.message || String(error)}`
        });
      });
    });
  });
}

/**
 * Execute clickBySelector directly in page context (content script)
 */
async function executeClickBySelectorInPage(selector: string, description?: string): Promise<ClickBySelectorResponse> {
  try {
    console.log(`[Content Script - Click By Selector Direct] Looking for element with selector: "${selector}"`);
    
    // Function to search in shadow DOMs as well
    const findElementInShadowDoms = (root: Document | ShadowRoot, selector: string): Element | null => {
      // Try direct query first
      try {
        const element = root.querySelector(selector);
        if (element) {
          return element;
        }
      } catch (error) {
        console.error(`Error in direct querySelector:`, error);
      }
      
      // Search in shadow DOMs
      const allElements = root.querySelectorAll('*');
      for (const host of Array.from(allElements)) {
        if (host.shadowRoot && host.shadowRoot.mode === 'open') {
          const elementInShadow = findElementInShadowDoms(host.shadowRoot, selector);
          if (elementInShadow) {
            return elementInShadow;
          }
        }
      }
      
      return null;
    };

    const element = findElementInShadowDoms(document, selector);
    
    if (!element) {
      return {
        success: false,
        error: `Element not found with selector: ${selector}`
      };
    }

    console.log(`[Content Script - Click By Selector Direct] Found element:`, element);

    // Check if element is connected to DOM
    if (!element.isConnected) {
      return {
        success: false,
        error: 'Element is detached from the DOM'
      };
    }

    // Scroll element into view
    element.scrollIntoView({ behavior: 'auto', block: 'center' });

    // Get element's bounding rect for click coordinates
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Create and dispatch mouse events
    const events = ['mousedown', 'mouseup', 'click'];
    events.forEach(eventType => {
      const event = new MouseEvent(eventType, {
        view: window,
        bubbles: true,
        cancelable: true,
        clientX: centerX,
        clientY: centerY,
        button: 0
      });
      element.dispatchEvent(event);
    });

    // Also trigger native click for form elements and links
    if (element instanceof HTMLElement) {
      element.click();
    }

    return {
      success: true,
      message: `Successfully clicked element with selector: ${selector}${description ? ` (${description})` : ''}`
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Content Script - Click By Selector Direct] Error:', errorMessage);
    return {
      success: false,
      error: `Error clicking element: ${errorMessage}`
    };
  }
}

export default clickBySelector; 