import { handleChatRoute } from './routes';
import { resolveLibraryId, getDocumentation } from '../lib/tools/context7';

// Types for messages between components
interface Message {
  type: string;
  payload?: any;
  [key: string]: any; // Allow for additional properties
}

// Handle extension icon click
chrome.action.onClicked.addListener(async (tab) => {
  // Only open side panel if we're on the Earth Engine Code Editor
  if (tab.url?.startsWith('https://code.earthengine.google.com/')) {
    // Open the side panel
    await chrome.sidePanel.open({ windowId: tab.windowId });
    await chrome.sidePanel.setOptions({
      enabled: true,
      path: 'sidepanel.html'
    });
  } else {
    // If not on Earth Engine, create a new tab with Earth Engine
    await chrome.tabs.create({
      url: 'https://code.earthengine.google.com/'
    });
  }
});

// Validate server identity with better error handling
async function validateServerIdentity(host: string, port: number): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
    
    const response = await fetch(`http://${host}:${port}/.identity`, {
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error(`Invalid server response: ${response.status}`);
      return false;
    }

    const identity = await response.json();

    // Validate the server signature
    if (identity && identity.signature === "mcp-browser-connector-24x7") {
      return true;
    } else {
      console.error("Invalid server signature - not the browser tools server");
      return false;
    }
  } catch (error) {
    // Handle network errors more gracefully
    console.error("Error validating server identity:", error);
    
    // Don't throw an error, just return false if we can't connect
    return false;
  }
}

// Handle messages from content script or side panel
chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
  console.log('Background script received message:', message);

  switch (message.type) {
    case 'INIT':
      // Handle initialization
      sendResponse({ status: 'initialized' });
      break;
    
    case 'VALIDATE_SERVER':
      if (message.payload && message.payload.host && message.payload.port) {
        validateServerIdentity(message.payload.host, message.payload.port)
          .then(isValid => {
            sendResponse({ isValid });
          })
          .catch(error => {
            sendResponse({ isValid: false, error: error.message });
          });
        return true; // Will respond asynchronously
      }
      break;
      
    case 'API_REQUEST':
      // Handle API requests directly
      if (message.payload && message.payload.endpoint === '/api/chat') {
        handleChatRoute(new Request(message.payload.url, {
          method: 'POST',
          headers: message.payload.headers || {},
          body: message.payload.body ? JSON.stringify(message.payload.body) : undefined
        }))
          .then(response => {
            response.json().then(data => {
              sendResponse({ success: true, data });
            });
          })
          .catch(error => {
            sendResponse({ success: false, error: error.message });
          });
        return true; // Will respond asynchronously
      }
      break;
    
    // Handle Context7 API requests
    case 'CONTEXT7_RESOLVE_LIBRARY_ID':
      (async () => {
        try {
          console.log('Resolving library ID for:', message.libraryName);
          const result = await resolveLibraryId(message.libraryName);
          console.log('Resolve result:', result);
          sendResponse(result);
        } catch (error) {
          console.error('Error resolving library ID:', error);
          sendResponse({
            success: false,
            libraryId: null,
            message: `Error resolving library ID: ${error instanceof Error ? error.message : String(error)}`
          });
        }
      })();
      return true; // Will respond asynchronously
      
    case 'CONTEXT7_GET_DOCUMENTATION':
      (async () => {
        try {
          console.log('Getting documentation for:', message.libraryId, message.topic);
          const result = await getDocumentation(
            message.libraryId,
            message.topic
          );
          console.log('Documentation result:', result.success, result.content?.substring(0, 50));
          sendResponse(result);
        } catch (error) {
          console.error('Error getting documentation:', error);
          sendResponse({
            success: false,
            content: null,
            message: `Error getting documentation: ${error instanceof Error ? error.message : String(error)}`
          });
        }
      })();
      return true; // Will respond asynchronously
    
    case 'CONTEXT7_DATASET_INFO':
      (async () => {
        try {
          console.log('Getting dataset info for:', message.topic);
          
          // First, search for the dataset
          const searchResult = await resolveLibraryId(`Earth Engine ${message.topic}`);
          
          if (!searchResult.success || !searchResult.libraryId) {
            sendResponse({
              success: false,
              message: `Could not find documentation for "${message.topic}". ${searchResult.message || ''}`,
              alternatives: searchResult.alternatives,
            });
            return;
          }
          
          // Then get documentation
          const docResult = await getDocumentation(
            searchResult.libraryId,
            message.topic
          );
          
          if (!docResult.success || !docResult.content) {
            sendResponse({
              success: false,
              message: `Could not find documentation for topic "${message.topic}". ${docResult.message || ''}`,
            });
            return;
          }
          
          sendResponse({
            success: true,
            content: docResult.content,
            message: `Documentation found for topic: ${message.topic}`,
          });
        } catch (error) {
          console.error('Error getting dataset info:', error);
          sendResponse({
            success: false,
            message: `Error retrieving Earth Engine documentation: ${error instanceof Error ? error.message : String(error)}`,
          });
        }
      })();
      return true; // Will respond asynchronously
    
    default:
      console.warn('Unknown message type:', message.type);
      sendResponse({ error: 'Unknown message type' });
  }

  // Return true to indicate we will send a response asynchronously
  return true;
});

// Listen for side panel connections
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'sidepanel') {
    console.log('Side panel connected');
    
    port.onMessage.addListener(async (message: any) => {
      console.log('Received message from side panel:', message);
      
      // Handle side panel specific messages
      switch (message.type) {
        case 'INIT':
          port.postMessage({ type: 'INIT_RESPONSE', status: 'initialized' });
          break;
          
        case 'CHAT_MESSAGE':
          // Handle chat messages from side panel
          handleChatMessage(message, port);
          break;
          
        default:
          console.warn('Unknown side panel message type:', message.type);
          port.postMessage({ type: 'ERROR', error: 'Unknown message type' });
      }
    });

    port.onDisconnect.addListener(() => {
      console.log('Side panel disconnected');
    });
  }
});

// Helper function to handle chat messages
async function handleChatMessage(message: any, port: chrome.runtime.Port) {
  try {
    const requestId = Date.now().toString();
    
    // Instead of trying to use fetch to an API endpoint within the extension,
    // directly call the handler function with properly formatted request
    const body = {
      messages: [{
        role: 'user',
        content: message.message
      }],
      apiKey: message.apiKey,
      provider: message.provider
    };
    
    // Create a request object for the handler
    const request = new Request('chrome-extension://internal/api/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${message.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    try {
      // Call the handler directly instead of using fetch
      const response = await handleChatRoute(request);
      
      if (response.headers.get('Content-Type')?.includes('text/plain')) {
        // Handle streaming response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        
        if (reader) {
          try {
            let accumulatedText = '';
            let buffer = '';
            
            while (true) {
              const { done, value } = await reader.read();
              
              if (done) {
                // Send final message with complete text
                port.postMessage({ 
                  type: 'CHAT_RESPONSE',
                  requestId,
                  data: {
                    choices: [{
                      message: {
                        content: accumulatedText
                      }
                    }]
                  }
                });
                
                // Also send end of stream message
                port.postMessage({
                  type: 'CHAT_STREAM_END',
                  requestId
                });
                
                break;
              }
              
              // Decode the chunk with proper streaming setup
              buffer += decoder.decode(value, { stream: true });
              
              // Process SSE format
              const lines = buffer.split('\n');
              buffer = lines.pop() || ''; // Keep the last (potentially incomplete) line in the buffer
              
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(5); // Remove 'data: ' prefix
                  
                  // Handle [DONE] message
                  if (data === '[DONE]') {
                    continue;
                  }
                  
                  try {
                    const parsedData = JSON.parse(data);
                    
                    // Extract content from OpenAI response format
                    if (parsedData.choices && parsedData.choices.length > 0) {
                      const delta = parsedData.choices[0].delta;
                      
                      if (delta && delta.content) {
                        const content = delta.content;
                        accumulatedText += content;
                        
                        // Send only the actual content as a chunk
                        port.postMessage({ 
                          type: 'CHAT_STREAM_CHUNK',
                          requestId,
                          chunk: content 
                        });
                      }
                    } 
                    // Handle Anthropic format (if needed)
                    else if (parsedData.type === 'content_block_delta' && parsedData.delta && parsedData.delta.text) {
                      const content = parsedData.delta.text;
                      accumulatedText += content;
                      
                      port.postMessage({ 
                        type: 'CHAT_STREAM_CHUNK',
                        requestId,
                        chunk: content 
                      });
                    }
                  } catch (error) {
                    console.warn('Error parsing SSE data:', error);
                    // If parsing fails, ignore this line
                  }
                }
              }
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Error reading stream:', errorMessage);
            port.postMessage({ 
              type: 'ERROR',
              requestId,
              error: errorMessage 
            });
          }
        }
      } else {
        // Handle JSON response
        const data = await response.json();
        port.postMessage({ 
          type: 'CHAT_RESPONSE',
          requestId,
          data 
        });
      }
    } catch (error) {
      console.error('Error processing chat:', error);
      
      // Use fallback mode
      const fallbackResponse = {
        type: 'CHAT_RESPONSE',
        requestId,
        data: {
          choices: [{
            message: {
              content: "I'm having trouble connecting to the API. Let me use my fallback mode to help you with Earth Engine.\n\n" + 
                       generateFallbackResponse(message.message)
            }
          }]
        }
      };
      
      port.postMessage(fallbackResponse);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Chat processing error:', errorMessage);
    port.postMessage({ 
      type: 'ERROR',
      requestId: Date.now().toString(),
      error: errorMessage 
    });
  }
}

// Generate a fallback response for Earth Engine queries
function generateFallbackResponse(query: string): string {
  const keywords: Record<string, string> = {
    'ndvi': 'NDVI (Normalized Difference Vegetation Index) can be calculated using: ```\nvar ndvi = image.normalizedDifference(["NIR", "RED"]);\n```',
    'landsat': 'Landsat imagery can be accessed via: ```\nvar landsat = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")\n```',
    'sentinel': 'Sentinel imagery is available through: ```\nvar sentinel = ee.ImageCollection("COPERNICUS/S2_SR")\n```',
    'export': 'You can export images using Export.image.toDrive() or visualize them with Map.addLayer()',
    'classify': 'For classification, use ee.Classifier methods like randomForest() or smileCart()',
    'reducer': 'Reducers like mean(), sum(), or min() can aggregate data spatially or temporally'
  };
  
  // Check if any keywords are in the query
  for (const [key, response] of Object.entries(keywords)) {
    if (query.toLowerCase().includes(key)) {
      return response;
    }
  }
  
  // Default response
  return "I can help with Earth Engine tasks like image processing, classification, and data export. Could you provide more details about what you're trying to do?";
}