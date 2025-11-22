/**
 * Get all output from the Google Earth Engine console
 * This tool reads all console messages including print() outputs, not just errors
 *
 * @returns Promise with success status and console outputs
 */

import { detectEnvironment } from '@/lib/utils';

export interface ConsoleOutputEntry {
  type: 'info' | 'error' | 'warning' | 'log' | 'chart';
  message: string;
  timestamp?: number;
  // Chart/visualization detection
  hasVisualContent?: boolean;
  visualElementType?: 'canvas' | 'svg' | 'img' | 'iframe' | 'unknown';
  chartDescription?: string;
}

export interface GetConsoleOutputResponse {
  success: boolean;
  outputs?: ConsoleOutputEntry[];
  count?: number;
  error?: string;
}

/**
 * Get all output from the Google Earth Engine console
 *
 * @returns Promise with console outputs or error message
 */
export async function getConsoleOutput(): Promise<GetConsoleOutputResponse> {
  try {
    // If running in a content script or sidepanel context, use the background script
    const env = detectEnvironment();

    if (env.useBackgroundProxy && typeof chrome !== 'undefined' && chrome.runtime) {
      return new Promise<GetConsoleOutputResponse>((resolve) => {
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
              type: 'GET_CONSOLE_OUTPUT'
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
      return new Promise<GetConsoleOutputResponse>((resolve) => {
        // First we need to find the Earth Engine tab
        chrome.tabs.query({ url: "*://code.earthengine.google.com/*" }, (tabs) => {
          if (!tabs || tabs.length === 0) {
            resolve({
              success: false,
              error: 'No Earth Engine tab found. Please open Earth Engine in a tab.'
            });
            return;
          }

          const tabId = tabs[0].id;
          if (!tabId) {
            resolve({
              success: false,
              error: 'Invalid Earth Engine tab'
            });
            return;
          }

          // Send message to the content script in the Earth Engine tab
          chrome.tabs.sendMessage(
            tabId,
            { type: 'GET_CONSOLE_OUTPUT' },
            (response) => {
              if (chrome.runtime.lastError) {
                resolve({
                  success: false,
                  error: chrome.runtime.lastError.message || 'Error communicating with Earth Engine tab'
                });
                return;
              }

              resolve(response);
            }
          );
        });
      });
    }

    // If not in a browser environment, we can't get console output
    if (env.isNodeJs) {
      return {
        success: false,
        error: 'Cannot get Earth Engine console output in Node.js environment'
      };
    }

    // Default error if environment detection doesn't work as expected
    return {
      success: false,
      error: 'Unsupported environment for getting Earth Engine console output'
    };
  } catch (error) {
    return {
      success: false,
      error: `Error getting console output: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export default getConsoleOutput;
