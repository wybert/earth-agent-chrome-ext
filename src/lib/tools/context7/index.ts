/**
 * Context7 tools for fetching Google Earth Engine dataset documentation
 * 
 * This module provides tools to:
 * 1. Resolve library names to Context7-compatible IDs
 * 2. Fetch detailed documentation about Earth Engine datasets
 * 
 * Usage example:
 * ```typescript
 * import { resolveLibraryId, getDocumentation } from './lib/tools/context7';
 * 
 * async function fetchLandsatDocs() {
 *   // First, resolve the library ID
 *   const resolveResult = await resolveLibraryId('Earth Engine datasets');
 *   
 *   if (resolveResult.success && resolveResult.libraryId) {
 *     // Then fetch documentation about Landsat
 *     const docs = await getDocumentation(resolveResult.libraryId, 'Landsat');
 *     
 *     if (docs.success && docs.content) {
 *       console.log(docs.content);
 *     }
 *   }
 * }
 * ```
 */

export { default as resolveLibraryId } from './resolveLibraryId';
export { default as getDocumentation } from './getDocumentation';

// Also export the types for better type checking
export type { 
  ResolveLibraryIdResponse 
} from './resolveLibraryId';

export type { 
  GetDocumentationResponse 
} from './getDocumentation'; 