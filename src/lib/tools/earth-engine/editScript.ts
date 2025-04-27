/**
 * Edit a script in Google Earth Engine
 * This tool modifies an existing script or creates a new one in the Earth Engine Code Editor
 * 
 * @param scriptId - ID of the script to edit
 * @param content - New content to set in the script
 * @returns Promise with success status and result message
 */

import { detectEnvironment } from '@/lib/utils';

export interface EditScriptResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Edit a script in Google Earth Engine
 * 
 * @param scriptId - ID of the script to edit
 * @param content - New content to set in the script
 * @returns Promise with result message or error
 */
export async function editScript(scriptId: string, content: string): Promise<EditScriptResponse> {
  try {
    // Validate inputs
    if (!scriptId) {
      return {
        success: false,
        error: 'Script ID is required'
      };
    }
    
    if (!content) {
      return {
        success: false,
        error: 'Script content is required'
      };
    }
    
    // If running in a content script or sidepanel context, use the background script
    const env = detectEnvironment();
    
    if (env.useBackgroundProxy && typeof chrome !== 'undefined' && chrome.runtime) {
      return new Promise<EditScriptResponse>((resolve) => {
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
              type: 'EDIT_SCRIPT',
              scriptId,
              content
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
      return new Promise<EditScriptResponse>((resolve) => {
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
            { type: 'EDIT_SCRIPT', scriptId, content },
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
    
    // If not in a browser environment, we can't edit scripts
    if (env.isNodeJs) {
      return {
        success: false,
        error: 'Cannot edit Earth Engine scripts in Node.js environment'
      };
    }
    
    // Default error if environment detection doesn't work as expected
    return {
      success: false,
      error: 'Unsupported environment for editing Earth Engine scripts'
    };
  } catch (error) {
    return {
      success: false,
      error: `Error editing script: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export default editScript; 