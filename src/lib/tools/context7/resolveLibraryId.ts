/**
 * Resolves a general library name into a Context7-compatible library ID
 * This tool is required as a first step before using getDocumentation
 * to retrieve Earth Engine dataset documentation
 * 
 * @param libraryName - The library name to search for (e.g., "Earth Engine", "MODIS")
 * @returns The Context7-compatible library ID that can be used with getDocumentation
 */

export interface ResolveLibraryIdResponse {
  success: boolean;
  libraryId: string | null;
  message?: string;
  alternatives?: string[];
}

export async function resolveLibraryId(libraryName: string): Promise<ResolveLibraryIdResponse> {
  try {
    // URL encode the library name to ensure safe transmission
    const encodedQuery = encodeURIComponent(libraryName);
    const url = `https://context7.com/api/v1/search?query="${encodedQuery}"`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return {
        success: false,
        libraryId: null,
        message: `Failed to search for library ID: ${response.statusText}`,
      };
    }

    const data = await response.json();
    
    // Check if we got valid results
    if (data && Array.isArray(data.results) && data.results.length > 0) {
      // Find the best match for Earth Engine datasets
      const earthEngineMatch = data.results.find(
        (result: any) => result.id && 
        (result.id.includes('earthengine') || 
         result.id.includes('earth-engine') ||
         result.title?.toLowerCase().includes('earth engine'))
      );
      
      if (earthEngineMatch) {
        return {
          success: true,
          libraryId: earthEngineMatch.id,
        };
      }
      
      // If no Earth Engine specific match, return the first result
      return {
        success: true,
        libraryId: data.results[0].id,
        alternatives: data.results.slice(1, 5).map((result: any) => result.id),
      };
    }
    
    return {
      success: false,
      libraryId: null,
      message: 'No matching library found',
      alternatives: data?.results?.map((result: any) => result.id) || [],
    };
  } catch (error) {
    return {
      success: false,
      libraryId: null,
      message: `Error resolving library ID: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export default resolveLibraryId; 