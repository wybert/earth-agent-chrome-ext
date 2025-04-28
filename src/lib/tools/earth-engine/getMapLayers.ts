/**
 * Gets information about the current layers displayed in the Google Earth Engine Map
 * This tool retrieves information about visible layers, their opacity, and visibility status
 * 
 * @returns Promise with success status and layer information
 */

import { detectEnvironment } from '@/lib/utils';

export interface MapLayer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  type?: string;
  zIndex?: number;
}

export interface GetMapLayersResponse {
  success: boolean;
  layers?: MapLayer[];
  error?: string;
}

/**
 * Get information about map layers currently displayed in Earth Engine
 * 
 * @returns Promise with success status and layer information
 */
export async function getMapLayers(): Promise<GetMapLayersResponse> {
  try {
    // If running in a content script or sidepanel context, use the background script
    const env = detectEnvironment();
    
    if (env.useBackgroundProxy && typeof chrome !== 'undefined' && chrome.runtime) {
      return new Promise<GetMapLayersResponse>((resolve) => {
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
              type: 'GET_MAP_LAYERS'
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
      return new Promise<GetMapLayersResponse>((resolve) => {
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
            { type: 'GET_MAP_LAYERS' },
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
    
    // If not in a browser environment (like Node.js), we can't access Earth Engine map
    if (env.isNodeJs) {
      return {
        success: false,
        error: 'Cannot get Earth Engine map layers in Node.js environment'
      };
    }
    
    // Default error if environment detection doesn't work as expected
    return {
      success: false,
      error: 'Unsupported environment for accessing Earth Engine map layers'
    };
  } catch (error) {
    return {
      success: false,
      error: `Error getting map layers: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export default getMapLayers; 