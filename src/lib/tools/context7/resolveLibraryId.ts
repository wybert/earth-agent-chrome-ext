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

// Define the base URL for Context7 API
const CONTEXT7_API_BASE_URL = "https://context7.com/api";

export async function resolveLibraryId(libraryName: string): Promise<ResolveLibraryIdResponse> {
  try {
    // If running in a content script or sidepanel context, use the background script
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      // Check if background script is available
      // Add a timeout to prevent hanging if background isn't responsive
      return new Promise<ResolveLibraryIdResponse>((resolve) => {
        // Add a timeout to handle cases where the background script doesn't respond
        const timeoutId = setTimeout(() => {
          console.warn('Background script connection timed out. Falling back to direct API call.');
          // Fall back to direct API call if background script isn't responding
          makeDirectApiCall(libraryName).then(resolve);
        }, 2000); // 2 second timeout
        
        try {
          chrome.runtime.sendMessage(
            {
              type: 'CONTEXT7_RESOLVE_LIBRARY_ID',
              libraryName
            },
            (response) => {
              // Clear the timeout since we got a response
              clearTimeout(timeoutId);
              
              // Handle error if present
              if (chrome.runtime.lastError) {
                console.warn('Chrome runtime error:', chrome.runtime.lastError);
                console.info('Falling back to direct API call...');
                // Fall back to direct API call if there's a communication error
                makeDirectApiCall(libraryName).then(resolve);
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
          console.info('Falling back to direct API call...');
          // Fall back to direct API call if there's an exception
          makeDirectApiCall(libraryName).then(resolve);
        }
      });
    }
    
    // Direct API call when running in background script or Node.js environment
    return makeDirectApiCall(libraryName);
  } catch (error) {
    return {
      success: false,
      libraryId: null,
      message: `Error resolving library ID: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Helper function to make a direct API call to Context7
 * Used as a fallback when background script communication fails
 */
async function makeDirectApiCall(libraryName: string): Promise<ResolveLibraryIdResponse> {
  try {
    // Create URL object using the base URL
    const url = new URL(`${CONTEXT7_API_BASE_URL}/v1/search`);
    // Set search params using proper URL API
    url.searchParams.set("query", libraryName);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Context7-Source': 'earth-agent-ai-sdk',
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
      message: `Error making direct API call: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export default resolveLibraryId; 