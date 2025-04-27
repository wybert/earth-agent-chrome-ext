/**
 * Wrapper functions for the Context7 library specifically designed for AI agent usage
 * These functions are simplified versions of the base tools that are formatted
 * to be easily called by an AI assistant agent
 */

import { resolveLibraryId, getDocumentation } from './index';
import { detectEnvironment } from '@/lib/utils';

// Define the base URL for Context7 API
const CONTEXT7_API_BASE_URL = "https://context7.com/api";

/**
 * Searches for Google Earth Engine dataset documentation
 * 
 * @param query - Search query or specific dataset name
 * @returns Object with success status and results
 */
export async function searchEarthEngineDatasets(query: string) {
  try {
    // First, resolve the Earth Engine dataset library ID
    const resolveResult = await resolveLibraryId(`Earth Engine ${query}`);
    
    if (!resolveResult.success || !resolveResult.libraryId) {
      return {
        success: false,
        message: `Could not find documentation for "${query}". ${resolveResult.message || ''}`,
        alternatives: resolveResult.alternatives,
      };
    }
    
    return {
      success: true,
      libraryId: resolveResult.libraryId,
      message: `Found documentation library: ${resolveResult.libraryId}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Error searching for Earth Engine datasets: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Gets detailed documentation about Google Earth Engine datasets
 * 
 * @param libraryId - The library ID (from searchEarthEngineDatasets or directly specified)
 * @param topic - Topic to filter documentation (e.g., "population", "landsat")
 * @param options - Optional parameters for customizing the request
 * @returns Object with documentation content or error message
 */
export async function getEarthEngineDocumentation(
  libraryId: string,
  topic: string,
  options: {
    tokens?: number;
    folders?: string;
  } = {}
) {
  try {
    // If no library ID is provided, try to resolve it based on the topic
    let finalLibraryId = libraryId;
    
    if (!finalLibraryId) {
      const resolveResult = await resolveLibraryId('Earth Engine datasets');
      if (resolveResult.success && resolveResult.libraryId) {
        finalLibraryId = resolveResult.libraryId;
      } else {
        return {
          success: false,
          message: 'Could not resolve Earth Engine dataset library ID. Please try searching first.',
        };
      }
    }
    
    // Get the documentation with options
    const docResult = await getDocumentation(finalLibraryId, topic, options);
    
    if (!docResult.success || !docResult.content) {
      return {
        success: false,
        message: `Could not find documentation for topic "${topic}". ${docResult.message || ''}`,
      };
    }
    
    return {
      success: true,
      content: docResult.content,
      message: `Documentation found for topic: ${topic}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Error retrieving Earth Engine documentation: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Utility function that combines search and documentation retrieval in one call
 * Useful for agents that want to get documentation in one step
 * 
 * @param topic - The topic or dataset to search for
 * @param options - Optional parameters for customizing the request
 * @returns Object with documentation content or error message
 */
export async function getEarthEngineDatasetInfo(
  topic: string,
  options: {
    tokens?: number;
    folders?: string;
  } = {}
) {
  // If we're in a content script or sidepanel and background is available, use a direct message
  const env = detectEnvironment();
  
  if (env.useBackgroundProxy && typeof chrome !== 'undefined' && chrome.runtime) {
    return new Promise((resolve) => {
      // Add a timeout to handle cases where background script doesn't respond
      const timeoutId = setTimeout(() => {
        console.warn('Background script connection timed out. Falling back to direct data retrieval.');
        // Fall back to direct retrieval if background script isn't responding
        performDirectDataRetrieval(topic, options).then(resolve);
      }, 2000); // 2 second timeout
      
      try {
        chrome.runtime.sendMessage(
          {
            type: 'CONTEXT7_DATASET_INFO',
            topic,
            options
          },
          (response) => {
            // Clear the timeout since we got a response
            clearTimeout(timeoutId);
            
            if (chrome.runtime.lastError) {
              console.warn('Chrome runtime error:', chrome.runtime.lastError);
              console.info('Falling back to direct data retrieval...');
              // Fall back to direct retrieval if there's a communication error
              performDirectDataRetrieval(topic, options).then(resolve);
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
        console.info('Falling back to direct data retrieval...');
        // Fall back to direct retrieval if there's an exception
        performDirectDataRetrieval(topic, options).then(resolve);
      }
    });
  }
  
  // Standard flow
  return performDirectDataRetrieval(topic, options);
}

/**
 * Helper function for direct data retrieval without going through background
 * Used as a fallback when background script communication fails
 */
async function performDirectDataRetrieval(
  topic: string,
  options: {
    tokens?: number;
    folders?: string;
  } = {}
) {
  try {
    // First, search for the dataset
    const searchResult = await searchEarthEngineDatasets(topic);
    
    if (!searchResult.success || !searchResult.libraryId) {
      return {
        success: false,
        message: searchResult.message || 'No library ID found',
        alternatives: searchResult.alternatives,
      };
    }
    
    // Then get documentation with options
    const docResult = await getEarthEngineDocumentation(
      searchResult.libraryId,
      topic,
      options
    );
    
    return docResult;
  } catch (error) {
    return {
      success: false,
      message: `Error in direct data retrieval: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export default {
  searchEarthEngineDatasets,
  getEarthEngineDocumentation,
  getEarthEngineDatasetInfo,
}; 