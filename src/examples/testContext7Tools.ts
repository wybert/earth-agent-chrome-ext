/**
 * Simple test script for Context7 tools
 * This can be run directly from Node.js to verify the tools work outside the extension
 */

import {
  searchEarthEngineDatasets,
  getEarthEngineDocumentation,
  getEarthEngineDatasetInfo
} from '../lib/tools/context7/agentTools';

import { resolveLibraryId, getDocumentation } from '../lib/tools/context7';

// Import response types
import { ResolveLibraryIdResponse } from '../lib/tools/context7/resolveLibraryId';
import { GetDocumentationResponse } from '../lib/tools/context7/getDocumentation';

// Define a type for the expected structure of dataset info results
interface DatasetInfoResult {
  success: boolean;
  content?: string | null;
  message?: string;
  alternatives?: string[];
  libraryId?: string; // Add libraryId property for search results
}

/**
 * Run individual tool tests
 */
async function runToolTests() {
  console.log('=== Testing Context7 Tools ===\n');

  try {
    // Test resolveLibraryId
    console.log('1. Testing resolveLibraryId');
    const resolveResult: ResolveLibraryIdResponse = await resolveLibraryId('Earth Engine datasets');
    console.log('Result:', JSON.stringify(resolveResult, null, 2));
    console.log('\n');

    // Save library ID for subsequent tests
    const libraryId = resolveResult.success && resolveResult.libraryId 
      ? resolveResult.libraryId 
      : '';

    if (libraryId) {
      // Test getDocumentation
      console.log('2. Testing getDocumentation');
      const docResult: GetDocumentationResponse = await getDocumentation(libraryId, 'Landsat');
      console.log('Success:', docResult.success);
      console.log('Content Preview:', docResult.content?.substring(0, 150) + '...');
      console.log('\n');
      
      // Test getDocumentation with options
      console.log('3. Testing getDocumentation with options');
      const docResultWithOptions = await getDocumentation(
        libraryId, 
        'Landsat', 
        { tokens: 500 }
      );
      console.log('Success:', docResultWithOptions.success);
      console.log('Content Preview (with tokens limit):', docResultWithOptions.content?.substring(0, 150) + '...');
      console.log('\n');
      
      // Test searchEarthEngineDatasets
      console.log('4. Testing searchEarthEngineDatasets');
      const searchResult = await searchEarthEngineDatasets('MODIS') as DatasetInfoResult;
      console.log('Result:', JSON.stringify(searchResult, null, 2));
      console.log('\n');
      
      // Test getEarthEngineDocumentation
      console.log('5. Testing getEarthEngineDocumentation');
      const eeDocResult = await getEarthEngineDocumentation(
        libraryId, 
        'forest cover'
      );
      console.log('Success:', eeDocResult.success);
      if (eeDocResult.success && eeDocResult.content) {
        console.log('Content Preview:', eeDocResult.content.substring(0, 150) + '...');
      }
      console.log('\n');
      
      // Test getEarthEngineDocumentation with options
      console.log('6. Testing getEarthEngineDocumentation with options');
      const eeDocResultWithOptions = await getEarthEngineDocumentation(
        libraryId, 
        'forest cover',
        { tokens: 1000, folders: 'collections' }
      );
      console.log('Success:', eeDocResultWithOptions.success);
      if (eeDocResultWithOptions.success && eeDocResultWithOptions.content) {
        console.log('Content Preview (with options):', eeDocResultWithOptions.content.substring(0, 150) + '...');
      }
      console.log('\n');
    }
    
    // Test getEarthEngineDatasetInfo
    console.log('7. Testing getEarthEngineDatasetInfo');
    const result = await getEarthEngineDatasetInfo('elevation') as DatasetInfoResult;
    
    console.log('Success:', result.success ? 'true' : 'false');
    
    if (result.success && result.content) {
      console.log('Content Preview:', result.content.substring(0, 150) + '...');
    }
    
    if (result.alternatives && Array.isArray(result.alternatives)) {
      console.log('Alternatives count:', result.alternatives.length);
    }
    
    console.log('\n');
    
    // Test getEarthEngineDatasetInfo with options
    console.log('8. Testing getEarthEngineDatasetInfo with options');
    const resultWithOptions = await getEarthEngineDatasetInfo('elevation', { tokens: 800 }) as DatasetInfoResult;
    
    console.log('Success:', resultWithOptions.success ? 'true' : 'false');
    
    if (resultWithOptions.success && resultWithOptions.content) {
      console.log('Content Preview (with token limit):', resultWithOptions.content.substring(0, 150) + '...');
    }
    
    console.log('\n');
    
  } catch (error) {
    console.error('Error in tests:', error);
  }
  
  console.log('=== Test Complete ===');
}

// Run all tests when this file is executed directly
if (require.main === module) {
  runToolTests().catch(console.error);
}

export default runToolTests; 