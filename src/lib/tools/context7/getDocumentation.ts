/**
 * Fetches documentation for Google Earth Engine datasets from Context7
 * This tool uses a Context7-compatible library ID (obtained from resolveLibraryId)
 * to fetch documentation about Earth Engine datasets
 * 
 * @param context7CompatibleLibraryID - The library ID from resolveLibraryId (e.g., "wybert/earthengine-dataset-catalog-md")
 * @param topic - Optional topic to filter documentation (e.g., "population", "landsat")
 * @param tokens - Maximum number of tokens to retrieve (default: 5000)
 * @returns The documentation content, success status, and any error messages
 */

export interface GetDocumentationResponse {
  success: boolean;
  content: string | null;
  message?: string;
  tokens?: number;
}

export async function getDocumentation(
  context7CompatibleLibraryID: string,
  topic?: string,
  tokens: number = 5000
): Promise<GetDocumentationResponse> {
  try {
    // Check if we have a valid library ID
    if (!context7CompatibleLibraryID) {
      return {
        success: false,
        content: null,
        message: 'Missing Context7-compatible library ID. Use resolveLibraryId first.',
      };
    }

    // Build the URL based on provided parameters
    let url = `https://context7.com/api/v1/${context7CompatibleLibraryID}`;
    
    // Add topic if provided
    if (topic) {
      url += `?topic="${encodeURIComponent(topic)}"`;
    }
    
    // Add tokens parameter (add with ? or & depending on whether we already have parameters)
    const separator = url.includes('?') ? '&' : '?';
    url += `${separator}tokens=${tokens}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return {
        success: false,
        content: null,
        message: `Failed to fetch documentation: ${response.statusText}`,
      };
    }

    const data = await response.json();
    
    // Check if we got valid documentation content
    if (data && data.content) {
      return {
        success: true,
        content: data.content,
        tokens: data.tokens || tokens,
      };
    }
    
    return {
      success: false,
      content: null,
      message: 'No documentation content found',
    };
  } catch (error) {
    return {
      success: false,
      content: null,
      message: `Error fetching documentation: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export default getDocumentation; 