/**
 * Fetches documentation for Google Earth Engine datasets from Context7
 * This tool uses a Context7-compatible library ID (obtained from resolveLibraryId)
 * to fetch documentation about Earth Engine datasets
 * 
 * @param context7CompatibleLibraryID - The library ID from resolveLibraryId (e.g., "wybert/earthengine-dataset-catalog-md")
 * @param topic - Optional topic to filter documentation (e.g., "population", "landsat")
 * @param options - Additional options for the request (tokens, folders)
 * @returns The documentation content, success status, and any error messages
 */

export interface GetDocumentationResponse {
  success: boolean;
  content: string | null;
  message?: string;
}

// Define the base URL for Context7 API
const CONTEXT7_API_BASE_URL = "https://context7.com/api";
const DEFAULT_TYPE = "txt";

export async function getDocumentation(
  context7CompatibleLibraryID: string,
  topic?: string,
  options: {
    tokens?: number;
    folders?: string;
  } = {}
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

    // If running in a content script or sidepanel context, use the background script
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      return new Promise<GetDocumentationResponse>((resolve) => {
        // Add a timeout to handle cases where background script doesn't respond
        const timeoutId = setTimeout(() => {
          console.warn('Background script connection timed out. Falling back to direct API call.');
          // Fall back to direct API call if background script isn't responding
          makeDirectApiCall(context7CompatibleLibraryID, topic, options).then(resolve);
        }, 2000); // 2 second timeout
        
        try {
          chrome.runtime.sendMessage(
            {
              type: 'CONTEXT7_GET_DOCUMENTATION',
              libraryId: context7CompatibleLibraryID,
              topic,
              options
            },
            (response) => {
              // Clear the timeout since we got a response
              clearTimeout(timeoutId);
              
              if (chrome.runtime.lastError) {
                console.warn('Chrome runtime error:', chrome.runtime.lastError);
                console.info('Falling back to direct API call...');
                // Fall back to direct API call if there's a communication error
                makeDirectApiCall(context7CompatibleLibraryID, topic, options).then(resolve);
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
          makeDirectApiCall(context7CompatibleLibraryID, topic, options).then(resolve);
        }
      });
    }

    // Direct API call when running in background script or Node.js environment
    return makeDirectApiCall(context7CompatibleLibraryID, topic, options);
  } catch (error) {
    return {
      success: false,
      content: null,
      message: `Error fetching documentation: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Helper function to make a direct API call to Context7
 * Used as a fallback when background script communication fails
 */
async function makeDirectApiCall(
  context7CompatibleLibraryID: string,
  topic?: string,
  options: {
    tokens?: number;
    folders?: string;
  } = {}
): Promise<GetDocumentationResponse> {
  try {
    // Remove leading slash if present
    if (context7CompatibleLibraryID.startsWith("/")) {
      context7CompatibleLibraryID = context7CompatibleLibraryID.slice(1);
    }

    // Build the URL using URL object
    const url = new URL(`${CONTEXT7_API_BASE_URL}/v1/${context7CompatibleLibraryID}`);
    
    // Add options to URL params
    if (options.tokens) url.searchParams.set("tokens", options.tokens.toString());
    if (options.folders) url.searchParams.set("folders", options.folders);
    if (topic) url.searchParams.set("topic", topic);
    url.searchParams.set("type", DEFAULT_TYPE);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/plain',
        'X-Context7-Source': 'earth-agent-ai-sdk',
      },
    });

    if (!response.ok) {
      return {
        success: false,
        content: null,
        message: `Failed to fetch documentation: ${response.statusText}`,
      };
    }

    // Get the text content directly
    const text = await response.text();
    
    // Check if the text is valid
    if (!text || text === "No content available" || text === "No context data available") {
      return {
        success: false,
        content: null,
        message: 'No documentation content found',
      };
    }
    
    // Try to parse as JSON in case of JSON response
    try {
      const data = JSON.parse(text);
      if (data && data.content) {
        return {
          success: true,
          content: data.content,
        };
      }
    } catch (e) {
      // Not JSON, use text as is
    }
    
    // Return the text content directly
    return {
      success: true,
      content: text,
    };
  } catch (error) {
    return {
      success: false,
      content: null,
      message: `Error making direct API call: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export default getDocumentation; 