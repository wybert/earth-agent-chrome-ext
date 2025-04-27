/**
 * Inspect the Google Earth Engine map at specific coordinates
 * This tool activates the inspector tool and retrieves data at the specified point
 * 
 * @param coordinates - Optional lat/lng coordinates to inspect
 * @returns Promise with success status and inspection data
 */

import { detectEnvironment } from '@/lib/utils';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface InspectMapResponse {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Inspect the Google Earth Engine map at specific coordinates
 * 
 * @param coordinates - Optional lat/lng coordinates to inspect
 * @returns Promise with inspection data or error
 */
export async function inspectMap(coordinates?: Coordinates): Promise<InspectMapResponse> {
  try {
    // If running in a content script or sidepanel context, use the background script
    const env = detectEnvironment();
    
    if (env.useBackgroundProxy && typeof chrome !== 'undefined' && chrome.runtime) {
      return new Promise<InspectMapResponse>((resolve) => {
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
              type: 'INSPECT_MAP',
              coordinates
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
      return new Promise<InspectMapResponse>((resolve) => {
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
            { type: 'INSPECT_MAP', coordinates },
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
    
    // If not in a browser environment, we can't inspect the map
    if (env.isNodeJs) {
      return {
        success: false,
        error: 'Cannot inspect Earth Engine map in Node.js environment'
      };
    }
    
    // Default error if environment detection doesn't work as expected
    return {
      success: false,
      error: 'Unsupported environment for inspecting Earth Engine map'
    };
  } catch (error) {
    return {
      success: false,
      error: `Error inspecting map: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export default inspectMap; 