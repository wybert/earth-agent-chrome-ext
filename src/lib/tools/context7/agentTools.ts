/**
 * Wrapper functions for the Context7 library specifically designed for AI agent usage
 * These functions are simplified versions of the base tools that are formatted
 * to be easily called by an AI assistant agent
 */

import { resolveLibraryId, getDocumentation } from './index';

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
 * @param maxTokens - Maximum tokens to retrieve (default: 5000)
 * @returns Object with documentation content or error message
 */
export async function getEarthEngineDocumentation(
  libraryId: string,
  topic: string,
  maxTokens: number = 5000
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
    
    // Get the documentation
    const docResult = await getDocumentation(finalLibraryId, topic, maxTokens);
    
    if (!docResult.success || !docResult.content) {
      return {
        success: false,
        message: `Could not find documentation for topic "${topic}". ${docResult.message || ''}`,
      };
    }
    
    return {
      success: true,
      content: docResult.content,
      tokens: docResult.tokens,
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
 * @param maxTokens - Maximum tokens to retrieve
 * @returns Object with documentation content or error message
 */
export async function getEarthEngineDatasetInfo(topic: string, maxTokens: number = 5000) {
  // First, search for the dataset
  const searchResult = await searchEarthEngineDatasets(topic);
  
  if (!searchResult.success || !searchResult.libraryId) {
    return {
      success: false,
      message: searchResult.message || 'No library ID found',
      alternatives: searchResult.alternatives,
    };
  }
  
  // Then get documentation
  const docResult = await getEarthEngineDocumentation(
    searchResult.libraryId,
    topic,
    maxTokens
  );
  
  return docResult;
}

export default {
  searchEarthEngineDatasets,
  getEarthEngineDocumentation,
  getEarthEngineDatasetInfo,
}; 