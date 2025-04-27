/**
 * Runs code in the Google Earth Engine Code Editor
 * This tool injects code into the editor and clicks the run button
 * 
 * @param code - JavaScript code to run in Earth Engine
 * @returns Promise with success status and result/error message
 */

import { detectEnvironment } from '@/lib/utils';

export interface RunCodeResponse {
  success: boolean;
  result?: string;
  error?: string;
}

/**
 * Run code in the Google Earth Engine Code Editor
 * 
 * @param code - Code to inject and run
 * @returns Promise with success status and result/error message
 */
export async function runCode(code: string): Promise<RunCodeResponse> {
  try {
    // If running in a content script or sidepanel context, use the background script
    const env = detectEnvironment();
    
    if (env.useBackgroundProxy && typeof chrome !== 'undefined' && chrome.runtime) {
      return new Promise<RunCodeResponse>((resolve) => {
        // Add a timeout to handle cases where background script doesn't respond
        const timeoutId = setTimeout(() => {
          console.warn('Background script connection timed out.');
          resolve({
            success: false,
            error: 'Background script connection timed out'
          });
        }, 2000); // 2 second timeout
        
        try {
          chrome.runtime.sendMessage(
            {
              type: 'RUN_CODE',
              code
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
    
    // If running in the background script (which communicates with the content script)
    // In this case, we're already in the background script that received a message from
    // the content script or sidepanel, so we would be sending a message to the content script
    // that's injected into the Earth Engine page
    if (env.isBackground && typeof chrome !== 'undefined' && chrome.tabs) {
      return new Promise<RunCodeResponse>((resolve) => {
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
            { type: 'RUN_CODE', code },
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
    
    // If not in a browser environment (like Node.js), we can't run Earth Engine code
    if (env.isNodeJs) {
      return {
        success: false,
        error: 'Cannot run Earth Engine code in Node.js environment'
      };
    }
    
    // Default error if environment detection doesn't work as expected
    return {
      success: false,
      error: 'Unsupported environment for running Earth Engine code'
    };
  } catch (error) {
    return {
      success: false,
      error: `Error running code: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export default runCode; 