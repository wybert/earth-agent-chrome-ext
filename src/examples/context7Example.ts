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

// Define response type for the dataset info
interface DatasetInfoResponse {
  success: boolean;
  content?: string | null;
  message?: string;
  alternatives?: string[];
  libraryId?: string;
}

/**
 * Example 1: Basic usage with separate resolve and get calls
 */
export async function basicUsageExample() {
  console.log('Running basic usage example...');
  
  try {
    // Step 1: Search for Earth Engine datasets related to MODIS
    const searchResult = await searchEarthEngineDatasets('MODIS') as DatasetInfoResponse;
    
    if (searchResult.success && searchResult.libraryId) {
      console.log(`Found library ID: ${searchResult.libraryId}`);
      
      // Step 2: Get documentation using the found library ID
      const docResult = await getDocumentation(searchResult.libraryId, 'MODIS') as GetDocumentationResponse;
      
      if (docResult.success && docResult.content) {
        console.log('Documentation found:');
        console.log('-'.repeat(50));
        console.log(docResult.content.substring(0, 500) + '...');
        console.log('-'.repeat(50));
      } else {
        console.log('Failed to get documentation:', docResult.message);
      }
    } else {
      console.log('Failed to find Earth Engine dataset library:', searchResult.message);
      
      if (searchResult.alternatives && searchResult.alternatives.length > 0) {
        console.log('Alternative libraries:', searchResult.alternatives);
      }
    }
  } catch (error) {
    console.error('Error in basic usage example:', error);
  }
}

/**
 * Example 2: Using the agent helper function to search datasets
 */
export async function searchDatasetsExample() {
  console.log('\nRunning search datasets example...');
  
  const searchTerms = ['Landsat', 'NDVI', 'Population'];
  
  for (const term of searchTerms) {
    try {
      console.log(`\nSearching for "${term}"...`);
      const result = await searchEarthEngineDatasets(term) as DatasetInfoResponse;
      
      if (result.success && result.libraryId) {
        console.log(`✅ Found library ID: ${result.libraryId}`);
      } else {
        console.log(`❌ Search failed: ${result.message}`);
        
        if (result.alternatives && result.alternatives.length > 0) {
          console.log('Alternative libraries:', result.alternatives);
        }
      }
    } catch (error) {
      console.error(`Error searching for "${term}":`, error);
    }
  }
}

/**
 * Example 3: Using the agent helper function to get documentation
 */
export async function getDocumentationExample() {
  console.log('\nRunning get documentation example...');
  
  try {
    // First, resolve the Earth Engine dataset library ID
    const resolveResult = await resolveLibraryId('Earth Engine datasets') as ResolveLibraryIdResponse;
    
    if (resolveResult.success && resolveResult.libraryId) {
      console.log(`Found library ID: ${resolveResult.libraryId}`);
      
      // Topics to get documentation for
      const topics = ['MODIS', 'Land Cover', 'Precipitation'];
      
      for (const topic of topics) {
        try {
          console.log(`\nGetting documentation for "${topic}"...`);
          const docResult = await getDocumentation(resolveResult.libraryId, topic) as GetDocumentationResponse;
          
          if (docResult.success && docResult.content) {
            console.log(`✅ Documentation found for "${topic}"`);
            console.log('-'.repeat(50));
            console.log(docResult.content.substring(0, 200) + '...');
            console.log('-'.repeat(50));
          } else {
            console.log(`❌ Failed to get documentation for "${topic}": ${docResult.message}`);
          }
        } catch (error) {
          console.error(`Error getting documentation for "${topic}":`, error);
        }
      }
    } else {
      console.log('Failed to resolve Earth Engine dataset library ID:', resolveResult.message);
    }
  } catch (error) {
    console.error('Error in get documentation example:', error);
  }
}

/**
 * Example 4: Using the combined search and retrieve function
 */
export async function combinedExample() {
  console.log('\nRunning combined example...');
  
  const datasets = ['MODIS', 'Landsat 8', 'Sentinel-2'];
  
  for (const dataset of datasets) {
    try {
      console.log(`\nGetting information for "${dataset}"...`);
      const result = await getEarthEngineDatasetInfo(dataset) as DatasetInfoResponse;
      
      if (result.success && result.content) {
        console.log(`✅ Information found for "${dataset}"`);
        console.log('-'.repeat(50));
        console.log(result.content.substring(0, 200) + '...');
        console.log('-'.repeat(50));
      } else {
        console.log(`❌ Failed to get information for "${dataset}": ${result.message}`);
        
        // Check for alternatives if available
        if ('alternatives' in result && Array.isArray(result.alternatives) && result.alternatives.length > 0) {
          console.log('Alternative libraries:', result.alternatives);
        }
      }
    } catch (error) {
      console.error(`Error getting information for "${dataset}":`, error);
    }
  }
}

/**
 * Example 5: Using options parameter to customize documentation retrieval
 */
export async function optionsExample() {
  console.log('\nRunning options parameter example...');
  
  try {
    // First, resolve the Earth Engine dataset library ID
    const resolveResult = await resolveLibraryId('Earth Engine datasets') as ResolveLibraryIdResponse;
    
    if (resolveResult.success && resolveResult.libraryId) {
      console.log(`Found library ID: ${resolveResult.libraryId}`);
      
      // Example 1: Using tokens option to limit response size
      console.log('\nGetting documentation with tokens limit...');
      const limitedResult = await getDocumentation(
        resolveResult.libraryId, 
        'Landsat', 
        { tokens: 500 }
      ) as GetDocumentationResponse;
      
      if (limitedResult.success && limitedResult.content) {
        console.log('Limited content (500 tokens):');
        console.log('-'.repeat(50));
        console.log(limitedResult.content);
        console.log('-'.repeat(50));
      }
      
      // Example 2: Using the folders option to target specific content
      console.log('\nGetting documentation with folders specification...');
      const foldersResult = await getDocumentation(
        resolveResult.libraryId, 
        'MODIS', 
        { folders: 'collections' }
      ) as GetDocumentationResponse;
      
      if (foldersResult.success && foldersResult.content) {
        console.log('Content from specified folders:');
        console.log('-'.repeat(50));
        console.log(foldersResult.content.substring(0, 200) + '...');
        console.log('-'.repeat(50));
      }
      
      // Example 3: Using options with getEarthEngineDatasetInfo
      console.log('\nGetting dataset info with options...');
      const datasetResult = await getEarthEngineDatasetInfo('elevation', { tokens: 1000 }) as DatasetInfoResponse;
      
      if (datasetResult.success && datasetResult.content) {
        console.log('Dataset info with token limit:');
        console.log('-'.repeat(50));
        console.log(datasetResult.content.substring(0, 200) + '...');
        console.log('-'.repeat(50));
      }
      
    } else {
      console.log('Failed to resolve Earth Engine dataset library ID:', resolveResult.message);
    }
  } catch (error) {
    console.error('Error in options example:', error);
  }
}

/**
 * Example 6: Handling errors
 */
export async function errorHandlingExample() {
  console.log('\nRunning error handling example...');
  
  // Example 1: Invalid library ID
  try {
    console.log('\nTrying invalid library ID...');
    const result = await getDocumentation('invalid-library-id', 'MODIS') as GetDocumentationResponse;
    console.log('Result:', result);
  } catch (error) {
    console.error('Error with invalid library ID:', error);
  }
  
  // Example 2: Non-existent dataset
  try {
    console.log('\nSearching for non-existent dataset...');
    const result = await searchEarthEngineDatasets('ThisDatasetDoesNotExist123') as DatasetInfoResponse;
    console.log('Result:', result);
  } catch (error) {
    console.error('Error with non-existent dataset:', error);
  }
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  console.log('Starting Context7 Earth Engine Tools Examples');
  console.log('='.repeat(50));
  
  await basicUsageExample();
  await searchDatasetsExample();
  await getDocumentationExample();
  await combinedExample();
  await optionsExample();
  await errorHandlingExample();
  
  console.log('='.repeat(50));
  console.log('All examples completed');
}

// Uncomment to run examples
// runAllExamples().catch(console.error); 