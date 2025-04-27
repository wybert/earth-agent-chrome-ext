/**
 * Example usage of the Context7 Earth Engine dataset tools
 * This demonstrates how to use the tools to search for and retrieve 
 * Google Earth Engine dataset documentation
 */

import {
  searchEarthEngineDatasets,
  getEarthEngineDocumentation,
  getEarthEngineDatasetInfo
} from '../lib/tools/context7/agentTools';

import { 
  resolveLibraryId, 
  getDocumentation 
} from '../lib/tools/context7';

// Import types for better type checking
import { ResolveLibraryIdResponse } from '../lib/tools/context7/resolveLibraryId';
import { GetDocumentationResponse } from '../lib/tools/context7/getDocumentation';

/**
 * Example 1: Basic usage with separate resolve and get calls
 */
export async function basicUsageExample() {
  console.log('Example 1: Basic usage with separate resolve and get calls');
  
  try {
    // First, search for the library ID
    console.log('Searching for Earth Engine datasets...');
    const libraryResult = await resolveLibraryId('Earth Engine datasets');
    
    if (libraryResult.success && libraryResult.libraryId) {
      console.log(`Found library ID: ${libraryResult.libraryId}`);
      
      // Then use the ID to get documentation about Landsat
      console.log('Fetching Landsat documentation...');
      const docResult = await getDocumentation(libraryResult.libraryId, 'Landsat');
      
      if (docResult.success && 'content' in docResult && docResult.content) {
        // Display the first 150 characters of the content
        console.log('Documentation preview:', docResult.content.substring(0, 150) + '...');
        console.log(`Total tokens: ${docResult.tokens || 'unknown'}`);
      } else {
        console.error('Failed to get documentation:', docResult.message);
      }
    } else {
      console.error('Could not find library ID:', libraryResult.message);
      if (libraryResult.alternatives && libraryResult.alternatives.length > 0) {
        console.log('Alternative libraries:', libraryResult.alternatives);
      }
    }
  } catch (error) {
    console.error('Error in basicUsageExample:', error);
  }
}

/**
 * Example 2: Using the agent helper function to search datasets
 */
export async function searchDatasetsExample() {
  console.log('\nExample 2: Searching Earth Engine datasets');
  
  try {
    // Search for MODIS datasets
    console.log('Searching for MODIS datasets...');
    const searchResult = await searchEarthEngineDatasets('MODIS');
    
    if (searchResult.success && searchResult.libraryId) {
      console.log(`Found library ID: ${searchResult.libraryId}`);
      console.log(`Message: ${searchResult.message}`);
    } else {
      console.error('Search failed:', searchResult.message);
      if (searchResult.alternatives && searchResult.alternatives.length > 0) {
        console.log('Alternative datasets:', searchResult.alternatives);
      }
    }
  } catch (error) {
    console.error('Error in searchDatasetsExample:', error);
  }
}

/**
 * Example 3: Using the agent helper function to get documentation
 */
export async function getDocumentationExample() {
  console.log('\nExample 3: Getting Earth Engine documentation');
  
  try {
    // First, get the library ID
    const searchResult = await searchEarthEngineDatasets('Earth Engine');
    
    if (searchResult.success && searchResult.libraryId) {
      // Then get documentation about population datasets
      console.log('Fetching documentation about population datasets...');
      const docResult = await getEarthEngineDocumentation(
        searchResult.libraryId, 
        'population',
        3000 // Limit to 3000 tokens
      );
      
      if (docResult.success && 'content' in docResult && docResult.content) {
        // Display the first 150 characters of the content
        console.log('Documentation preview:', docResult.content.substring(0, 150) + '...');
        console.log(`Total tokens: ${docResult.tokens || 'unknown'}`);
      } else {
        console.error('Failed to get documentation:', docResult.message);
      }
    } else {
      console.error('Could not find library ID:', searchResult.message);
    }
  } catch (error) {
    console.error('Error in getDocumentationExample:', error);
  }
}

/**
 * Example 4: Using the combined search and retrieve function
 */
export async function combinedExample() {
  console.log('\nExample 4: Combined search and documentation retrieval');
  
  try {
    // Get documentation about forest cover in one step
    console.log('Searching and fetching documentation about forest cover...');
    const result = await getEarthEngineDatasetInfo('forest cover');
    
    if (result.success && 'content' in result && result.content) {
      // Display the first 150 characters of the content
      console.log('Documentation preview:', result.content.substring(0, 150) + '...');
      console.log(`Total tokens: ${result.tokens || 'unknown'}`);
    } else {
      console.error('Failed:', result.message);
      if ('alternatives' in result && result.alternatives && result.alternatives.length > 0) {
        console.log('Alternative searches:', result.alternatives);
      }
    }
  } catch (error) {
    console.error('Error in combinedExample:', error);
  }
}

/**
 * Example 5: Handling errors
 */
export async function errorHandlingExample() {
  console.log('\nExample 5: Error handling');
  
  try {
    // Try to get documentation with an invalid library ID
    console.log('Attempting to get documentation with invalid library ID...');
    const badResult = await getDocumentation('invalid-library-id', 'topic');
    
    console.log('Success:', badResult.success); // Should be false
    console.log('Message:', badResult.message);
    console.log('Content:', badResult.content); // Should be null
    
    // Try searching for a non-existent dataset
    console.log('\nSearching for non-existent dataset...');
    const nonExistentSearch = await searchEarthEngineDatasets('xyz123nonexistentdataset');
    
    console.log('Success:', nonExistentSearch.success);
    console.log('Message:', nonExistentSearch.message);
    if ('alternatives' in nonExistentSearch && nonExistentSearch.alternatives && nonExistentSearch.alternatives.length > 0) {
      console.log('Alternative suggestions:', nonExistentSearch.alternatives);
    }
  } catch (error) {
    console.error('Error in errorHandlingExample:', error);
  }
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  await basicUsageExample();
  await searchDatasetsExample();
  await getDocumentationExample();
  await combinedExample();
  await errorHandlingExample();
}

// Uncomment to run examples when this file is executed directly
// if (require.main === module) {
//   runAllExamples().catch(console.error);
// } 