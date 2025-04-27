/**
 * Get tasks from Google Earth Engine
 * This tool retrieves the list of export tasks from the Earth Engine interface
 * 
 * @returns Promise with success status and array of tasks
 */

import { detectEnvironment } from '@/lib/utils';

export interface Task {
  id: string;
  name: string;
  state: string;
  created: string;
  type: string;
}

export interface GetTasksResponse {
  success: boolean;
  tasks?: Task[];
  error?: string;
}

/**
 * Get tasks from Google Earth Engine
 * 
 * @returns Promise with array of tasks or error message
 */
export async function getTasks(): Promise<GetTasksResponse> {
  try {
    // If running in a content script or sidepanel context, use the background script
    const env = detectEnvironment();
    
    if (env.useBackgroundProxy && typeof chrome !== 'undefined' && chrome.runtime) {
      return new Promise<GetTasksResponse>((resolve) => {
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
              type: 'GET_TASKS'
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
      return new Promise<GetTasksResponse>((resolve) => {
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
            { type: 'GET_TASKS' },
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
    
    // If not in a browser environment, we can't get the tasks
    if (env.isNodeJs) {
      return {
        success: false,
        error: 'Cannot get Earth Engine tasks in Node.js environment'
      };
    }
    
    // Default error if environment detection doesn't work as expected
    return {
      success: false,
      error: 'Unsupported environment for getting Earth Engine tasks'
    };
  } catch (error) {
    return {
      success: false,
      error: `Error getting tasks: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export default getTasks; 