/**
 * Screenshot tool for capturing the current state of a webpage
 * This tool takes a screenshot of the current browser window
 * 
 * @returns Promise with success status and screenshot data in base64 format
 */

import { detectEnvironment } from '@/lib/utils';

export interface ScreenshotResponse {
  success: boolean;
  screenshotData?: string; // Base64-encoded PNG image data
  error?: string;
}

/**
 * Take a screenshot of the current browser window
 * 
 * @returns Promise with success status and screenshot data/error message
 */
export async function screenshot(): Promise<ScreenshotResponse> {
  try {
    // If running in a content script or sidepanel context, use the background script
    const env = detectEnvironment();
    
    if (env.useBackgroundProxy && typeof chrome !== 'undefined' && chrome.runtime) {
      return new Promise<ScreenshotResponse>((resolve) => {
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
              type: 'SCREENSHOT'
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
      return new Promise<ScreenshotResponse>((resolve) => {
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
          
          // Capture screenshot of the tab
          chrome.tabs.captureVisibleTab(
            tabs[0].windowId,
            { format: 'png' },
            (dataUrl) => {
              if (chrome.runtime.lastError) {
                resolve({
                  success: false,
                  error: chrome.runtime.lastError.message || 'Error capturing screenshot'
                });
                return;
              }
              
              resolve({
                success: true,
                screenshotData: dataUrl
              });
            }
          );
        });
      });
    }
    
    // If not in a browser environment, we can't take screenshots
    if (env.isNodeJs) {
      return {
        success: false,
        error: 'Cannot take screenshots in Node.js environment'
      };
    }
    
    // Default error if environment detection doesn't work as expected
    return {
      success: false,
      error: 'Unsupported environment for taking screenshots'
    };
  } catch (error) {
    return {
      success: false,
      error: `Error capturing screenshot: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export default screenshot; 