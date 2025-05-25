/**
 * Tool for simulating hover/mouseover events on webpage elements
 * Returns a promise with success status and error message if applicable
 */

import { detectEnvironment } from '@/lib/utils';

export interface HoverResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface HoverParams {
  selector: string;
}

/**
 * Simulates hovering over an element on the webpage
 * @param params.selector - CSS selector for the target element
 * @returns Promise<HoverResponse> with success status and error message if applicable
 */
export async function hover(params: HoverParams): Promise<HoverResponse> {
  const { selector } = params;

  if (!selector) {
    return {
      success: false,
      error: 'No selector provided'
    };
  }

  const env = detectEnvironment();

  if (env.isContentScript) {
    // In content script, directly interact with the page
    const element = document.querySelector(selector);
    if (!element) {
      return {
        success: false,
        error: `No element found for selector: ${selector}`
      };
    }

    try {
      // Create and dispatch mouseover event
      const event = new MouseEvent('mouseover', {
        view: window,
        bubbles: true,
        cancelable: true
      });
      element.dispatchEvent(event);

      // Create and dispatch mouseenter event
      const enterEvent = new MouseEvent('mouseenter', {
        view: window,
        bubbles: true,
        cancelable: true
      });
      element.dispatchEvent(enterEvent);

      return {
        success: true,
        message: `Successfully hovered over element: ${selector}`
      };
    } catch (error) {
      return {
        success: false,
        error: `Error hovering over element: ${error}`
      };
    }
  } else if (env.isBackground) {
    // In background script, send message to content script
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) {
        return {
          success: false,
          error: 'No active tab found'
        };
      }

      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (selector: string) => {
          const element = document.querySelector(selector);
          if (!element) {
            return { error: `No element found for selector: ${selector}` };
          }

          try {
            // Create and dispatch mouseover event
            const event = new MouseEvent('mouseover', {
              view: window,
              bubbles: true,
              cancelable: true
            });
            element.dispatchEvent(event);

            // Create and dispatch mouseenter event
            const enterEvent = new MouseEvent('mouseenter', {
              view: window,
              bubbles: true,
              cancelable: true
            });
            element.dispatchEvent(enterEvent);

            return { success: true };
          } catch (error) {
            return { error: `Error hovering over element: ${error}` };
          }
        },
        args: [selector]
      });

      if (!results || results.length === 0) {
        return {
          success: false,
          error: 'No result from script execution'
        };
      }

      const result = results[0].result as { success: boolean } | { error: string };
      if ('error' in result) {
        return {
          success: false,
          error: result.error
        };
      }

      return {
        success: true,
        message: `Successfully hovered over element: ${selector}`
      };
    } catch (error) {
      return {
        success: false,
        error: `Error executing hover script: ${error}`
      };
    }
  }

  return {
    success: false,
    error: 'Hover tool can only be used in a browser extension context'
  };
} 