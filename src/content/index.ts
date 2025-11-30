// Types
interface Message {
  type: string;
  payload?: any;
  code?: string;
  coordinates?: {lat: number, lng: number};
  scriptId?: string;
  content?: string;
}

// Add import for interfaces if needed
import { GetMapLayersResponse, MapLayer } from '@/lib/tools/earth-engine/getMapLayers';
import { snapshot, SnapshotResponse } from '@/lib/tools/browser/snapshot';
import { showClickIndicator } from './dom-helpers';


// Singleton pattern to prevent multiple content script instances
const CONTENT_SCRIPT_ID = 'earth-engine-ai-assistant-content-script';
const INSTANCE_TIMESTAMP = Date.now();

// Immediately mark context as potentially invalid if we can't access chrome APIs
let isContextInvalidated = false;
try {
  if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
    console.warn('Chrome extension APIs not available, marking context as invalid');
    isContextInvalidated = true;
  }
} catch (error) {
  console.warn('Error checking chrome APIs on startup:', error);
  isContextInvalidated = true;
}

// Exit immediately if context is invalid
if (isContextInvalidated) {
  console.log('Content script exiting due to invalid context');
  throw new Error('Extension context invalid on startup');
}

// Flag to prevent execution of duplicate instances
let shouldExecute = true;

// Check if another instance is already running
if ((window as any)[CONTENT_SCRIPT_ID]) {
  const existingTimestamp = (window as any)[CONTENT_SCRIPT_ID];
  console.log(`⚠️ [Content Script] Another instance already running (timestamp: ${existingTimestamp}). Current timestamp: ${INSTANCE_TIMESTAMP}.`);

  // If this instance is newer, take over
  if (INSTANCE_TIMESTAMP > existingTimestamp) {
    console.log(`✅ [Content Script] This instance is newer, taking over from old instance ${existingTimestamp}`);
    // Clean up the old instance
    const oldPeriodicCheckId = (window as any)[CONTENT_SCRIPT_ID + '_intervalId'];
    if (oldPeriodicCheckId) {
      clearInterval(oldPeriodicCheckId);
      console.log('🧹 [Content Script] Cleared old periodic check interval');
    }

    // Signal old instance to stop (if it's still listening)
    const oldShouldExecute = (window as any)[CONTENT_SCRIPT_ID + '_shouldExecute'];
    if (oldShouldExecute !== undefined) {
      (window as any)[CONTENT_SCRIPT_ID + '_shouldExecute'] = false;
      console.log('🛑 [Content Script] Signaled old instance to stop');
    }
  } else {
    // This instance is older or same age - don't execute
    console.log(`🛑 [Content Script] Exiting: older/duplicate instance (${INSTANCE_TIMESTAMP} <= ${existingTimestamp})`);
    shouldExecute = false;
    isContextInvalidated = true; // Mark as invalidated to prevent any operations
  }
}

// Mark this instance as the active one ONLY if we should execute
if (shouldExecute) {
  (window as any)[CONTENT_SCRIPT_ID] = INSTANCE_TIMESTAMP;
  (window as any)[CONTENT_SCRIPT_ID + '_shouldExecute'] = true;
  console.log(`✅ [Content Script] Registered as active instance: ${INSTANCE_TIMESTAMP}`);
}

// Initialize content script immediately to catch messages early
console.log('Earth Engine AI Assistant content script loading at:', new Date().toISOString(), 'with timestamp:', INSTANCE_TIMESTAMP);

// Track connection status with background script
let backgroundConnectionVerified = false;
let notificationRetries = 0;
const MAX_NOTIFICATION_RETRIES = 5;

// Track the state of the content script
let backgroundConnected = false;
let connectionRetries = 0;
const MAX_CONNECTION_RETRIES = 5;
const CONNECTION_RETRY_DELAYS = [500, 1000, 2000, 4000, 8000]; // Exponential backoff

let periodicCheckIntervalId: number | undefined;

// Notify background script that content script is loaded
function notifyBackgroundScript() {
  // Check if extension context is valid before attempting communication
  try {
    if (typeof chrome === 'undefined' || 
        typeof chrome.runtime === 'undefined' || 
        typeof chrome.runtime.id === 'undefined') {
      console.warn('Extension context invalidated, cannot notify background script');
      isContextInvalidated = true;
      return;
    }
  } catch (error) {
    console.warn('Error checking extension context in notifyBackgroundScript:', error);
    isContextInvalidated = true;
    return;
  }

  if (isContextInvalidated) {
    console.log('Context already marked as invalidated, skipping background notification');
    return;
  }

  console.log('Notifying background script that content script is loaded...');
  
  try {
    chrome.runtime.sendMessage({ 
      type: 'CONTENT_SCRIPT_LOADED', 
      url: window.location.href,
      timestamp: Date.now() 
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn('Error notifying background script:', chrome.runtime.lastError);
        
        // Check for context invalidation
        if (chrome.runtime.lastError.message?.includes("Extension context invalidated")) {
          console.error('Extension context invalidated during notification');
          isContextInvalidated = true;
          return;
        }
        
        // Retry with exponential backoff if we haven't reached max retries
        if (notificationRetries < MAX_NOTIFICATION_RETRIES) {
          notificationRetries++;
          const delay = Math.pow(2, notificationRetries) * 500; // Exponential backoff
          console.log(`Retrying notification in ${delay}ms (attempt ${notificationRetries}/${MAX_NOTIFICATION_RETRIES})...`);
          setTimeout(notifyBackgroundScript, delay);
        }
        return;
      }
      
      backgroundConnectionVerified = true;
      notificationRetries = 0;
      console.log('Content script loaded notification response:', response);
    });
  } catch (error) {
    console.error('Error sending notification message:', error);
    isContextInvalidated = true;
  }
}

// Track ping attempts to avoid infinite loops
let pingAttempts = 0;
const MAX_PING_ATTEMPTS = 3;

// Track if message listener has been added to prevent duplicates
let messageListenerAdded = false;

// Single message listener to handle ALL messages (including PING)
// This prevents duplicate listener registration during hot reloads
// ONLY add listener if this instance should execute
if (shouldExecute && !messageListenerAdded) {
  console.log(`🔧 [Content Script][${INSTANCE_TIMESTAMP}] Adding message listener (single instance)`);
  messageListenerAdded = true;

  chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
  // CRITICAL: Check GLOBAL flag on EVERY message to respect deactivation from newer instances
  const globalShouldExecute = (window as any)[CONTENT_SCRIPT_ID + '_shouldExecute'];
  const isActiveInstance = (window as any)[CONTENT_SCRIPT_ID] === INSTANCE_TIMESTAMP;

  if (!shouldExecute || globalShouldExecute === false || !isActiveInstance) {
    console.log(`🛑 [Content Script][${INSTANCE_TIMESTAMP}] Instance deactivated, ignoring message: ${message.type}`);
    console.log(`   - Local shouldExecute: ${shouldExecute}`);
    console.log(`   - Global shouldExecute: ${globalShouldExecute}`);
    console.log(`   - Is active instance: ${isActiveInstance}`);
    console.log(`   - Current active timestamp: ${(window as any)[CONTENT_SCRIPT_ID]}`);
    return false; // Don't handle this message
  }
  if (isContextInvalidated) {
    console.error('Content script context is invalidated. Aborting message handling for:', message.type);
    // It's tricky to know if we should return true or false here without knowing if sendResponse was originally going to be async.
    // Returning false is safer, but might leave some sendMessage calls in background hanging.
    // However, if context is invalidated, the background might not be there to receive a response anyway.
    return false;
  }

  if (!message || !message.type) {
    console.warn('Received invalid message:', message);
    sendResponse({ success: false, error: 'Invalid message format' });
    return false;
  }
  
  console.log(`Content script received message: ${message.type}`);
  
  try {
    switch (message.type) {
      case 'PING':
        console.log('Received PING from background script, responding...');
        sendResponse({
          success: true,
          message: 'Content script is active',
          timestamp: Date.now(),
          url: window.location.href
        });
        // Reset ping attempts when a successful ping occurs
        pingAttempts = 0;
        backgroundConnectionVerified = true;
        return true;
        
      case 'INIT':
        sendResponse({ success: true, message: 'Earth Engine content script is active' });
        return false;
        
      case 'RUN_CODE':
        handleRunCode(message.code || '', sendResponse);
        return true; // Will respond asynchronously
        
      case 'CHECK_CONSOLE':
        handleCheckConsole(sendResponse);
        return true; // Will respond asynchronously
        
      case 'INSPECT_MAP':
        handleInspectMap(message.coordinates, sendResponse);
        return true; // Will respond asynchronously
        
      case 'GET_TASKS':
        handleGetTasks(sendResponse);
        return true; // Will respond asynchronously
        
      case 'EDIT_SCRIPT':
        handleEditScript(message, sendResponse);
        return true; // Will respond asynchronously

      case 'GET_SCRIPT':
        handleGetScript(sendResponse);
        return true; // Will respond asynchronously

      case 'GET_CONSOLE_OUTPUT':
        handleGetConsoleOutput(sendResponse);
        return true; // Will respond asynchronously

      case 'GET_MAP_LAYERS':
        handleGetMapLayers(sendResponse);
        return true; // Will respond asynchronously

      case 'TAKE_ACCESSIBILITY_SNAPSHOT':
        handleTakeAccessibilitySnapshot(sendResponse);
        return true; // Will respond asynchronously

      case 'GET_ELEMENT_BY_REF_ID':
        if (message.payload && message.payload.refId) {
          handleGetElementByRefId(message.payload.refId, sendResponse);
        } else {
          sendResponse({ success: false, error: 'refId not provided in payload for GET_ELEMENT_BY_REF_ID' });
        }
        return true; // Will respond asynchronously

      case 'CLICK_BY_COORDINATES':
        if (message.payload && typeof message.payload.x === 'number' && typeof message.payload.y === 'number') {
          handleExecuteClickByCoordinates(message.payload.x, message.payload.y, sendResponse);
        } else {
          sendResponse({ success: false, error: 'Invalid payload for CLICK_BY_COORDINATES: x and y are required.' });
        }
        return true; // Will respond asynchronously

      case 'CLICK_BY_SELECTOR':
        if (message.payload && typeof message.payload.selector === 'string') {
          handleClickBySelector(message.payload.selector, message.payload.elementDescription, sendResponse);
        } else {
          sendResponse({ success: false, error: 'selector not provided in payload for CLICK_BY_SELECTOR' });
        }
        return true; // Will respond asynchronously

      case 'CLICK_BY_REF_ID':
        if (message.payload && message.payload.refId) {
          handleClickByRefId(message.payload.refId, sendResponse);
        } else {
          sendResponse({ success: false, error: 'refId not provided in payload for CLICK_BY_REF_ID' });
        }
        return true; // Will respond asynchronously

      case 'GET_MAP_INFO':
        handleGetMapInfo(sendResponse);
        return true; // Will respond asynchronously

      default:
        console.warn(`Unknown message type: ${message.type}`);
        sendResponse({ success: false, error: `Unknown message type: ${message.type}` });
        return false;
    }
  } catch (error) {
    console.error(`Error handling message (${message.type}):`, error);
    sendResponse({ 
      success: false, 
      error: `Error in content script: ${error instanceof Error ? error.message : String(error)}` 
    });
    return false;
  }
  });
} else if (!shouldExecute) {
  console.log(`🛑 [Content Script][${INSTANCE_TIMESTAMP}] Skipping listener registration - instance should not execute`);
}

// Also initialize when DOM content is loaded to make sure we have access to the page elements
// ONLY if this instance should execute
if (shouldExecute) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      notifyBackgroundScript();
    });
  } else {
    notifyBackgroundScript();
  }
} else {
  console.log(`🛑 [Content Script][${INSTANCE_TIMESTAMP}] Skipping initialization - instance should not execute`);
}

// Also set up a periodic self-check to ensure registration
function periodicSelfCheck() {
    // First check if the extension context is still valid
    try {
        if (typeof chrome === 'undefined' ||
            typeof chrome.runtime === 'undefined' ||
            typeof chrome.runtime.id === 'undefined') {
            console.log('Extension context appears to be invalidated. Stopping periodic checks.');
            isContextInvalidated = true;
            if (periodicCheckIntervalId !== undefined) {
                clearInterval(periodicCheckIntervalId);
                periodicCheckIntervalId = undefined;
            }
            return;
        }
    } catch (error) {
        console.log('Error checking extension context, stopping periodic checks:', error instanceof Error ? error.message : String(error));
        isContextInvalidated = true;
        if (periodicCheckIntervalId !== undefined) {
            clearInterval(periodicCheckIntervalId);
            periodicCheckIntervalId = undefined;
        }
        return;
    }

    // Don't proceed if context was previously marked as invalidated
    if (isContextInvalidated) {
        console.log('Context already marked as invalidated, stopping periodic check');
        if (periodicCheckIntervalId !== undefined) {
            clearInterval(periodicCheckIntervalId);
            periodicCheckIntervalId = undefined;
        }
        return;
    }

    // Only send heartbeat if we haven't exceeded max attempts OR if background was previously verified
    if (pingAttempts < MAX_PING_ATTEMPTS || backgroundConnectionVerified) {
        pingAttempts++;
        
        try {
            // Send a self-ping to the background script
            chrome.runtime.sendMessage({
                type: 'CONTENT_SCRIPT_HEARTBEAT',
                url: window.location.href,
                timestamp: Date.now()
            }, (response) => {
                // CRITICAL: Check chrome.runtime.lastError immediately.
                if (chrome.runtime.lastError) {
                    // If context is invalidated, stop all further operations
                    if (chrome.runtime.lastError.message?.includes("Extension context invalidated")) {
                        console.log("Content script context invalidated during heartbeat. Stopping further operations.");
                        isContextInvalidated = true;
                        if (periodicCheckIntervalId !== undefined) {
                            clearInterval(periodicCheckIntervalId);
                            periodicCheckIntervalId = undefined;
                        }
                        backgroundConnectionVerified = false;
                        return;
                    }
                    
                    // For other errors, just continue silently
                    return;
                }

                // If no error, proceed with response handling
                backgroundConnectionVerified = true;
                pingAttempts = 0; 
                console.log('Periodic self-check (heartbeat) response:', response);
            });
        } catch (error) {
            console.log('Error sending heartbeat message, stopping periodic checks:', error instanceof Error ? error.message : String(error));
            // If we can't even send a message, the context is likely invalidated
            isContextInvalidated = true;
            if (periodicCheckIntervalId !== undefined) {
                clearInterval(periodicCheckIntervalId);
                periodicCheckIntervalId = undefined;
            }
            return;
        }
    } else if (!backgroundConnectionVerified && pingAttempts >= MAX_PING_ATTEMPTS) {
        console.log(`Background connection could not be verified after ${MAX_PING_ATTEMPTS} attempts. Stopping heartbeat checks.`);
        if (periodicCheckIntervalId !== undefined) {
            clearInterval(periodicCheckIntervalId);
            periodicCheckIntervalId = undefined;
        }
    }
}

// Run self-checks less frequently (every 30 seconds instead of 10) to reduce context invalidation chances
// ONLY if this instance should execute
if (shouldExecute && periodicCheckIntervalId === undefined) { // Ensure it's not set multiple times if script re-runs somehow
    periodicCheckIntervalId = window.setInterval(periodicSelfCheck, 30000); // Changed from 10000 to 30000
    // Store the interval ID globally so other instances can clean it up
    (window as any)[CONTENT_SCRIPT_ID + '_intervalId'] = periodicCheckIntervalId;
    console.log(`✅ [Content Script][${INSTANCE_TIMESTAMP}] Started periodic self-check`);
} else if (!shouldExecute) {
    console.log(`🛑 [Content Script][${INSTANCE_TIMESTAMP}] Skipping periodic check - instance should not execute`);
}

/**
 * Handles the RUN_CODE message by inserting code and clicking the run button in the Earth Engine editor
 */
async function handleRunCode(code: string, sendResponse: (response: any) => void) {
  try {
    console.log('Handling RUN_CODE message with code:', code.substring(0, 100) + '...');

    // Step 1: First insert the code into the editor
    if (code && code.trim().length > 0) {
      console.log('Inserting code into editor before running...');

      // Use the same logic as handleEditScript to insert code
      const insertResult = await new Promise<{success: boolean, error?: string}>((resolve) => {
        handleEditScript({
          type: 'EDIT_SCRIPT',
          scriptId: 'current',
          content: code
        }, (response: any) => {
          resolve(response);
        });
      });

      if (!insertResult.success) {
        console.error('Failed to insert code:', insertResult.error);
        sendResponse({
          success: false,
          error: `Failed to insert code into editor: ${insertResult.error}`
        });
        return;
      }

      console.log('Code inserted successfully, waiting before running...');
      // Wait a bit longer to ensure code is fully inserted and editor is ready
      await new Promise(resolve => setTimeout(resolve, 800));
    } else {
      console.log('No code provided, will just click run button on existing code');
    }

    // Step 2: Find and click the run button
    console.log('Looking for run button...');
    const runButton = document.querySelector('button.goog-button.run-button[title="Run script (Ctrl+Enter)"]');

    if (!runButton) {
      // Fallback to alternative selectors if the specific one fails
      const fallbackButton = document.querySelector('.run-button') ||
                            document.querySelector('button[title*="Run script"]') ||
                            document.querySelector('button.goog-button[value="Run"]');

      if (!fallbackButton) {
        console.error('Run button not found');
        sendResponse({
          success: false,
          error: 'Run button not found in the Google Earth Engine editor'
        });
        return;
      }

      console.log('Using fallback run button selector');
      (fallbackButton as HTMLElement).click();
    } else {
      console.log('Clicking run button');
      (runButton as HTMLElement).click();
    }

    // Wait for a short time to allow the button state to change
    setTimeout(() => {
      // We successfully clicked the button
      console.log('Run button clicked successfully');
      sendResponse({
        success: true,
        result: 'Code inserted and run button clicked successfully'
      });
    }, 500);
  } catch (error) {
    console.error('Error executing Earth Engine code:', error);
    sendResponse({
      success: false,
      error: `Error executing Earth Engine code: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

/**
 * Handles checking the Earth Engine console for errors
 */
function handleCheckConsole(sendResponse: (response: any) => void) {
  try {
    // Find console output element
    const consoleOutput = document.querySelector('.console-output');
    
    if (!consoleOutput) {
      sendResponse({
        success: true,
        errors: []
      });
      return;
    }
    
    // Get error elements from the console
    const errorElements = consoleOutput.querySelectorAll('.error, .warning');
    const errors = Array.from(errorElements).map(el => ({
      type: el.classList.contains('error') ? 'error' : 'warning',
      message: el.textContent || 'Unknown error'
    }));
    
    sendResponse({
      success: true,
      errors
    });
  } catch (error) {
    sendResponse({
      success: false,
      error: `Error checking console: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

/**
 * Recursively extract Inspector tree structure as JSON
 * This handles GEE's nested explorer UI elements
 */
function extractInspectorTreeAsJSON(explorer: Element): any {
  // Handle simple leaf nodes
  if (explorer.classList.contains('simple')) {
    const trivial = explorer.querySelector('.trivial');
    if (trivial) {
      const label = trivial.querySelector('.label span')?.textContent || '';
      const fullText = trivial.textContent || '';
      let value = fullText.replace(label + ':', '').trim();

      // Try to parse as JSON array
      if (value.startsWith('[') && value.endsWith(']')) {
        try {
          return JSON.parse(value);
        } catch (e) {
          return value;
        }
      }

      // Try to parse as number
      const numValue = parseFloat(value);
      return isNaN(numValue) ? value : numValue;
    }
    return null;
  }

  // Handle complex nodes with zippies
  const zippy = explorer.querySelector(':scope > .zippy');
  if (!zippy) return null;

  const header = zippy.querySelector('.header');
  const body = zippy.querySelector('.body');
  if (!header) return null;

  const headerText = header.textContent || '';

  // Check if body is empty - extract value from header
  if (!body || body.children.length === 0) {
    const colonIndex = headerText.indexOf(':');
    if (colonIndex > -1) {
      let value = headerText.substring(colonIndex + 1).trim();

      // Special case: Parse band summary format like '"maximum", float, EPSG:4326, 2x1 px'
      const bandSummaryMatch = value.match(/^"([^"]+)",\s*(\w+),\s*(EPSG:\d+),\s*(\d+)x(\d+)\s*px$/);
      if (bandSummaryMatch) {
        return {
          id: bandSummaryMatch[1],
          data_type: bandSummaryMatch[2],
          crs: bandSummaryMatch[3],
          dimensions: [parseInt(bandSummaryMatch[4]), parseInt(bandSummaryMatch[5])]
        };
      }

      // Try to parse as JSON array
      if (value.startsWith('[') && value.endsWith(']')) {
        try {
          return JSON.parse(value);
        } catch (e) {
          return value;
        }
      }

      // Try to parse as number
      const numValue = parseFloat(value);
      return isNaN(numValue) ? value : numValue;
    }
    return headerText;
  }

  // Body has children - check if it's a List or Object
  const bodyExplorers = body.querySelectorAll(':scope > .explorer');

  // List: numbered items (0:, 1:, 2:, etc.)
  const isListLike = Array.from(bodyExplorers).every((exp, idx) => {
    const expHeader = exp.querySelector('.zippy > .header')?.textContent || '';
    return expHeader.startsWith(`${idx}:`);
  });

  if (isListLike && bodyExplorers.length > 0) {
    return Array.from(bodyExplorers).map(exp => extractInspectorTreeAsJSON(exp));
  }

  // Object: key-value pairs
  const result: Record<string, any> = {};
  bodyExplorers.forEach(exp => {
    const expHeader = exp.querySelector('.zippy > .header')?.textContent || '';
    const colonIndex = expHeader.indexOf(':');

    if (colonIndex > -1) {
      const key = expHeader.substring(0, colonIndex).trim();
      const value = extractInspectorTreeAsJSON(exp);
      result[key] = value;
    }
  });

  return Object.keys(result).length > 0 ? result : headerText;
}

/**
 * Handles inspecting the map at specific coordinates
 */
async function handleInspectMap(coordinates: {lat: number, lng: number} | undefined, sendResponse: (response: any) => void) {
  try {
    console.log(`🔍 [InspectMap] Reading Inspector panel data`);
    if (coordinates) {
      console.log(`🔍 [InspectMap] Requested coordinates: lat=${coordinates.lat}, lng=${coordinates.lng}`);
    }

    // Check if Inspector panel exists
    const inspectPanel = document.querySelector('.inspect-panel');
    if (!inspectPanel) {
      console.error('❌ [InspectMap] Inspector panel not found');
      sendResponse({
        success: false,
        error: 'Inspector panel not found. Please ensure the Inspector tab is open in Earth Engine.'
      });
      return;
    }

    console.log('✅ [InspectMap] Inspector panel found');

    // Check if Inspector has data
    const panelText = inspectPanel.textContent || '';
    console.log(`📄 [InspectMap] Panel text preview: "${panelText.substring(0, 100)}..."`);

    if (panelText.includes('Click on the map')) {
      console.warn('⚠️ [InspectMap] Inspector is empty');
      sendResponse({
        success: false,
        error: 'Inspector is empty. Please manually click on the map at the location you want to inspect, then try again.'
      });
      return;
    }

    // Step 1: Scroll to trigger lazy loading
    console.log(`📜 [InspectMap] Scrolling to trigger lazy loading`);
    (inspectPanel as HTMLElement).scrollTop = (inspectPanel as HTMLElement).scrollHeight;
    await new Promise(resolve => setTimeout(resolve, 300));

    // Step 2: Expand all collapsed sections by actually clicking them
    const allCollapsedZippies = inspectPanel.querySelectorAll('.zippy.collapsed');
    console.log(`🔓 [InspectMap] Found ${allCollapsedZippies.length} collapsed sections to expand`);

    allCollapsedZippies.forEach(zippy => {
      const header = zippy.querySelector('.header');
      if (header) {
        const headerText = header.textContent?.trim() || '';
        console.log(`  🖱️ [InspectMap] Clicking to expand: "${headerText.substring(0, 50)}"`);
        (header as HTMLElement).click();
      }
    });

    // Wait for content to load after clicking
    await new Promise(resolve => setTimeout(resolve, 500));
    (inspectPanel as HTMLElement).scrollTop = (inspectPanel as HTMLElement).scrollHeight;
    await new Promise(resolve => setTimeout(resolve, 300));

    // Step 3: Extract Point information (first explorer)
    const pointExplorer = inspectPanel.querySelector(':scope > .explorer');
    const pointData = pointExplorer ? extractInspectorTreeAsJSON(pointExplorer) : null;
    console.log(`📍 [InspectMap] Point data:`, pointData);

    // Extract coordinates from point header for validation
    const pointHeader = inspectPanel.querySelector('.explorer .header');
    const pointText = pointHeader?.textContent || '';
    const pointMatch = pointText.match(/Point\s*\(([-\d.]+),\s*([-\d.]+)\)/);
    const inspectedCoords = pointMatch ? {
      lng: parseFloat(pointMatch[1]),
      lat: parseFloat(pointMatch[2])
    } : null;

    if (!inspectedCoords) {
      console.warn('⚠️ [InspectMap] Could not extract coordinates from Inspector');
      sendResponse({
        success: false,
        error: 'Could not read coordinates from Inspector. Please click on the map first.'
      });
      return;
    }

    console.log(`📍 [InspectMap] Extracted coordinates: lng=${inspectedCoords.lng}, lat=${inspectedCoords.lat}`);

    // Verify coordinates match if provided
    if (coordinates) {
      const latDiff = Math.abs(coordinates.lat - inspectedCoords.lat);
      const lngDiff = Math.abs(coordinates.lng - inspectedCoords.lng);
      const tolerance = 0.1; // roughly 10km at equator

      if (latDiff > tolerance || lngDiff > tolerance) {
        console.warn(`⚠️ [InspectMap] Coordinate mismatch - requested (${coordinates.lng}, ${coordinates.lat}), found (${inspectedCoords.lng}, ${inspectedCoords.lat})`);
        sendResponse({
          success: false,
          error: `Inspector shows data for coordinates (${inspectedCoords.lng}, ${inspectedCoords.lat}), which is different from requested coordinates (${coordinates.lng}, ${coordinates.lat}). Please click on the map at the desired location first.`,
          data: {
            requestedCoordinates: coordinates,
            inspectedCoordinates: inspectedCoords
          }
        });
        return;
      }
    }

    // Step 4: Extract Pixels section
    const pixelsSection = Array.from(inspectPanel.querySelectorAll('.inspect-view.inspect-image'));
    const pixelsData = pixelsSection.map((section) => {
      const explorer = section.querySelector('.explorer');
      const header = explorer?.querySelector('.header');
      const layerName = header?.querySelector('.label span')?.textContent || 'Unknown';
      const data = explorer ? extractInspectorTreeAsJSON(explorer) : null;
      return { layerName, data };
    });

    // Step 5: Extract Objects section (includes EPSG and all metadata)
    const objectsSection = Array.from(inspectPanel.querySelectorAll('.inspect-view.inspect-object'));
    const objectsData = objectsSection.map((section) => {
      const explorer = section.querySelector('.explorer');
      const header = explorer?.querySelector('.header');
      const layerName = header?.querySelector('.label span')?.textContent || 'Unknown';
      const data = explorer ? extractInspectorTreeAsJSON(explorer) : null;
      return { layerName, data };
    });

    console.log(`✅ [InspectMap] Successfully extracted complete Inspector data`);
    console.log(`   - Point data: ${pointData ? 'Yes' : 'No'}`);
    console.log(`   - Pixels sections: ${pixelsData.length}`);
    console.log(`   - Objects sections: ${objectsData.length}`);

    // Check if Objects section is empty and provide helpful suggestion
    let suggestion = undefined;
    if (objectsData.length === 0 || objectsData.every(obj => !obj.data || Object.keys(obj.data).length === 0)) {
      suggestion = 'Objects section appears empty or not expanded. To get CRS/EPSG information, manually click on "Objects" in the Inspector panel to expand it, then call this tool again.';
      console.warn('⚠️ [InspectMap] ' + suggestion);
    }

    sendResponse({
      success: true,
      data: {
        requestedCoordinates: coordinates,
        inspectedCoordinates: inspectedCoords,
        point: pointData,
        pixels: pixelsData,
        objects: objectsData,
        // Legacy format for backward compatibility
        layers: pixelsData.map(p => ({
          name: p.layerName,
          type: typeof p.data === 'object' ? 'Image' : 'Unknown',
          values: typeof p.data === 'object' ? p.data : { value: p.data }
        })),
        layerCount: pixelsData.length
      },
      suggestion
    });

  } catch (error) {
    console.error('Error in handleInspectMap:', error);
    sendResponse({
      success: false,
      error: `Error inspecting map: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

/**
 * Handles getting Earth Engine tasks
 */
function handleGetTasks(sendResponse: (response: any) => void) {
  try {
    // This is a placeholder - actual implementation would need to access the Earth Engine 
    // task list from the UI or by executing code in the Earth Engine context
    sendResponse({
      success: true,
      tasks: [],
      message: 'Task retrieval not fully implemented yet. This is a placeholder response.'
    });
  } catch (error) {
    sendResponse({
      success: false,
      error: `Error getting tasks: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

// Notify the background script that the content script is loaded
function notifyBackgroundScriptLoaded() {
  // Check if extension context is valid before attempting communication
  try {
    if (typeof chrome === 'undefined' || 
        typeof chrome.runtime === 'undefined' || 
        typeof chrome.runtime.id === 'undefined') {
      console.warn('Extension context invalidated, cannot notify background script in notifyBackgroundScriptLoaded');
      isContextInvalidated = true;
      return;
    }
  } catch (error) {
    console.warn('Error checking extension context in notifyBackgroundScriptLoaded:', error);
    isContextInvalidated = true;
    return;
  }

  if (isContextInvalidated) {
    console.log('Context already marked as invalidated, skipping background script notification');
    return;
  }

  try {
    console.log('Earth Engine Agent content script loaded, notifying background script...');
    chrome.runtime.sendMessage({ type: 'CONTENT_SCRIPT_LOADED' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error notifying background script:', chrome.runtime.lastError);
        
        // Check for context invalidation
        if (chrome.runtime.lastError.message?.includes("Extension context invalidated")) {
          console.error('Extension context invalidated during background script notification');
          isContextInvalidated = true;
          return;
        }
        
        // Retry with exponential backoff if we haven't exceeded max retries
        if (connectionRetries < MAX_CONNECTION_RETRIES) {
          const delay = CONNECTION_RETRY_DELAYS[connectionRetries] || 10000; // Default to 10s for any retry beyond our array
          connectionRetries++;
          console.log(`Retrying connection to background script in ${delay}ms (attempt ${connectionRetries}/${MAX_CONNECTION_RETRIES})...`);
          
          setTimeout(notifyBackgroundScriptLoaded, delay);
        } else {
          console.error(`Failed to connect to background script after ${MAX_CONNECTION_RETRIES} attempts`);
        }
        return;
      }
      
      backgroundConnected = true;
      console.log('Background script notified of content script load.');
    });
  } catch (error) {
    console.error('Failed to notify background script:', error);
    isContextInvalidated = true;
  }
}

// Initialize content script
function initialize() {
  notifyBackgroundScriptLoaded();
}

/**
 * Handles editing an Earth Engine script
 */
async function handleEditScript(message: any, sendResponse: (response: any) => void) {
  console.log('Handling edit script message:', message);
  
  const scriptId = message.scriptId;
  const content = message.content || '';
  
  if (!scriptId || !content) {
    sendResponse({
      success: false,
      error: 'Script ID and content are required'
    });
    return;
  }
  
  try {
    // Create a log to track which method succeeded
    let successMethod = '';
    let editorUpdated = false;
    
    console.log('Attempting to update Earth Engine editor content...');
    
    // METHOD 1: Direct Ace editor access - try multiple paths
    try {
      console.log('METHOD 1: Attempting direct Ace editor access...');
      
      // Try different potential paths to find the Ace editor instance
      const editorPaths = [
        // Try standard AceEditor global
        () => (window as any).ace,
        
        // Try to find the editor in the page scope
        () => Array.from(document.querySelectorAll('.ace_editor')).map(
          el => (el as any).__ace_editor__ || (el as any).env?.editor
        ).find(editor => editor),
        
        // Try from CodeMirror if it's used instead
        () => {
          const cmElements = document.querySelectorAll('.CodeMirror');
          if (cmElements.length > 0) {
            return Array.from(cmElements).map(el => (el as any).CodeMirror).find(cm => cm);
          }
          return null;
        },
        
        // Try to find editor in Google Earth Engine specific objects
        () => (window as any).ee?.Editor?.ace,
        () => (window as any).ee?.data?.aceEditor,
        () => (window as any).code?.editor?.aceEditor,
        
        // Last resort - try to scan the entire window object for anything that looks like an editor
        () => {
          const foundEditors = [];
          for (const key in window) {
            try {
              const obj = (window as any)[key];
              if (obj && typeof obj === 'object' && 
                  (obj.setContent || obj.setValue || obj.getSession || obj.edit)) {
                foundEditors.push(obj);
              }
            } catch (e) {
              // Ignore errors from security restrictions
            }
          }
          return foundEditors[0]; // Return the first one we find
        }
      ];
      
      // Try each path until we find an editor
      let editor = null;
      for (const getEditor of editorPaths) {
        try {
          const potentialEditor = getEditor();
          if (potentialEditor) {
            editor = potentialEditor;
            console.log('Found potential editor:', editor);
            break;
          }
        } catch (e) {
          // Continue to the next method
          console.log('Editor path attempt failed:', e);
        }
      }
      
      if (editor) {
        // Try different methods to update content based on what API the editor exposes
        const updateMethods = [
          // Standard Ace editor API
          () => {
            if (editor.getSession && editor.setValue) {
              editor.setValue(content, -1); // -1 to place cursor at start
              return true;
            }
            return false;
          },
          
          // Some editors have a setContent method
          () => {
            if (editor.setContent) {
              editor.setContent(content);
              return true;
            }
            return false;
          },
          
          // CodeMirror API
          () => {
            if (editor.setValue) {
              editor.setValue(content);
              return true;
            }
            return false;
          },
          
          // Nested session access
          () => {
            if (editor.getSession && editor.getSession().setValue) {
              editor.getSession().setValue(content);
              return true;
            }
            return false;
          }
        ];
        
        for (const update of updateMethods) {
          try {
            if (update()) {
              editorUpdated = true;
              successMethod = 'Direct editor API';
              console.log('Successfully updated editor content via direct API');
              break;
            }
          } catch (e) {
            // Try the next method
            console.log('Editor update method failed:', e);
          }
        }
      }
    } catch (error) {
      console.error('Error accessing Ace editor directly:', error);
    }
    
    // METHOD 2: DOM Manipulation - Bypass CSP restrictions
    if (!editorUpdated) {
      try {
        console.log('METHOD 2: Attempting DOM manipulation...');
        
        // Find the pre elements in the editor
        const editorPres = document.querySelectorAll('.ace_editor pre');
        if (editorPres.length > 0) {
          console.log(`Found ${editorPres.length} pre elements in the editor`);
          
          // Create a text node with our content
          const textNode = document.createTextNode(content);
          
          // Clear and update the first pre element (main content area)
          const mainPre = editorPres[0];
          mainPre.textContent = '';
          mainPre.appendChild(textNode);
          
          // Dispatch input and change events to trigger editor update
          mainPre.dispatchEvent(new Event('input', { bubbles: true }));
          mainPre.dispatchEvent(new Event('change', { bubbles: true }));
          
          // Find the textarea that may be connected to the editor
          const textareas = document.querySelectorAll('textarea');
          for (const textarea of Array.from(textareas)) {
            try {
              textarea.value = content;
              textarea.dispatchEvent(new Event('input', { bubbles: true }));
              textarea.dispatchEvent(new Event('change', { bubbles: true }));
            } catch (e) {
              console.log('Error updating textarea:', e);
            }
          }
          
          editorUpdated = true;
          successMethod = 'DOM manipulation';
          console.log('Successfully updated editor content via DOM manipulation');
        } else {
          console.log('No pre elements found in the editor');
        }
      } catch (error) {
        console.error('Error using DOM manipulation to update editor:', error);
      }
    }
    
    // METHOD 3: Find and update the hidden textarea that Ace uses
    if (!editorUpdated) {
      try {
        console.log('METHOD 3: Searching for hidden textarea...');
        
        // Look for textareas that might be connected to the editor
        const textareas = document.querySelectorAll('textarea');
        console.log(`Found ${textareas.length} textareas in the document`);
        
        let textareaUpdated = false;
        
        for (const textarea of Array.from(textareas)) {
          try {
            // Check if this might be an editor textarea (hidden ones are often used by Ace)
            if (textarea.classList.contains('ace_text-input') || 
                textarea.style.position === 'absolute' || 
                textarea.style.opacity === '0' ||
                textarea.style.height === '1px' ||
                textarea.parentElement?.classList.contains('ace_editor')) {
              
              console.log('Found potential editor textarea:', textarea);
              
              // Set the value
              textarea.value = content;
              
              // Trigger input events
              textarea.dispatchEvent(new Event('input', { bubbles: true }));
              textarea.dispatchEvent(new Event('change', { bubbles: true }));
              
              // Try to trigger a keypress event with Ctrl+A and then paste content
              textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true }));
              textarea.dispatchEvent(new ClipboardEvent('paste', { 
                bubbles: true,
                clipboardData: new DataTransfer()
              }));
              
              textareaUpdated = true;
              console.log('Updated textarea:', textarea);
            }
          } catch (e) {
            console.log('Error updating a textarea:', e);
          }
        }
        
        if (textareaUpdated) {
          editorUpdated = true;
          successMethod = 'Hidden textarea';
          console.log('Successfully updated editor content via hidden textarea');
        }
      } catch (error) {
        console.error('Error updating hidden textarea:', error);
      }
    }
    
    // If all methods failed, return error
    if (!editorUpdated) {
      console.error('All methods for updating editor content failed');
      sendResponse({ 
        success: false, 
        error: 'Failed to update editor content. Could not access the Earth Engine Code Editor. Try manually updating the code.'
      });
      return;
    }
    
    // Return success if any method worked
    console.log(`Editor content updated successfully using method: ${successMethod}`);
    sendResponse({
      success: true,
      method: successMethod,
      message: `Editor content updated successfully using ${successMethod}`
    });
    
  } catch (error) {
    console.error('Error editing Earth Engine script:', error);
    sendResponse({
      success: false,
      error: `Error editing Earth Engine script: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

/**
 * Handles getting the current script content from the Earth Engine code editor
 */
async function handleGetScript(sendResponse: (response: any) => void) {
  console.log('Handling get script message');

  try {
    let scriptContent = '';
    let successMethod = '';
    let contentFound = false;

    console.log('Attempting to read Earth Engine editor content...');

    // METHOD 1: Direct Ace editor access - try multiple paths
    try {
      console.log('METHOD 1: Attempting direct Ace editor access...');

      // Try different potential paths to find the Ace editor instance
      const editorPaths = [
        // Try standard AceEditor global
        () => (window as any).ace,

        // Try to find the editor in the page scope
        () => Array.from(document.querySelectorAll('.ace_editor')).map(
          el => (el as any).__ace_editor__ || (el as any).env?.editor
        ).find(editor => editor),

        // Try from CodeMirror if it's used instead
        () => {
          const cmElements = document.querySelectorAll('.CodeMirror');
          if (cmElements.length > 0) {
            return Array.from(cmElements).map(el => (el as any).CodeMirror).find(cm => cm);
          }
          return null;
        },

        // Try to find editor in Google Earth Engine specific objects
        () => (window as any).ee?.Editor?.ace,
        () => (window as any).ee?.data?.aceEditor,
        () => (window as any).code?.editor?.aceEditor,

        // Last resort - try to scan the entire window object for anything that looks like an editor
        () => {
          const foundEditors = [];
          for (const key in window) {
            try {
              const obj = (window as any)[key];
              if (obj && typeof obj === 'object' &&
                  (obj.getValue || obj.getSession || obj.edit)) {
                foundEditors.push(obj);
              }
            } catch (e) {
              // Ignore errors from security restrictions
            }
          }
          return foundEditors[0]; // Return the first one we find
        }
      ];

      // Try each path until we find an editor
      let editor = null;
      for (const getEditor of editorPaths) {
        try {
          const potentialEditor = getEditor();
          if (potentialEditor) {
            editor = potentialEditor;
            console.log('Found potential editor:', editor);
            break;
          }
        } catch (e) {
          // Continue to the next method
          console.log('Editor path attempt failed:', e);
        }
      }

      if (editor) {
        // Try different methods to get content based on what API the editor exposes
        const getMethods = [
          // Standard Ace editor API
          () => {
            if (editor.getValue) {
              return editor.getValue();
            }
            return null;
          },

          // Some editors have a getContent method
          () => {
            if (editor.getContent) {
              return editor.getContent();
            }
            return null;
          },

          // Session-based access
          () => {
            if (editor.getSession && editor.getSession().getValue) {
              return editor.getSession().getValue();
            }
            return null;
          },

          // CodeMirror API
          () => {
            if (editor.doc && editor.doc.getValue) {
              return editor.doc.getValue();
            }
            return null;
          }
        ];

        for (const getMethod of getMethods) {
          try {
            const content = getMethod();
            if (content !== null && content !== undefined) {
              scriptContent = content;
              contentFound = true;
              successMethod = 'Direct editor API';
              console.log('Successfully read editor content via direct API');
              break;
            }
          } catch (e) {
            // Try the next method
            console.log('Editor get method failed:', e);
          }
        }
      }
    } catch (error) {
      console.error('Error accessing Ace editor directly:', error);
    }

    // METHOD 2: DOM Manipulation - Read from editor pre elements
    if (!contentFound) {
      try {
        console.log('METHOD 2: Attempting DOM reading...');

        // Find the pre elements in the editor
        const editorPres = document.querySelectorAll('.ace_editor .ace_text-layer');
        if (editorPres.length > 0) {
          console.log(`Found ${editorPres.length} text layer elements in the editor`);

          // Get text content from the text layer
          const textLayer = editorPres[0];
          scriptContent = textLayer.textContent || '';

          contentFound = true;
          successMethod = 'DOM text layer reading';
          console.log('Successfully read editor content via DOM text layer');
        } else {
          // Try alternative: read from all .ace_line elements
          const aceLines = document.querySelectorAll('.ace_editor .ace_line');
          if (aceLines.length > 0) {
            console.log(`Found ${aceLines.length} ace_line elements`);
            scriptContent = Array.from(aceLines)
              .map(line => line.textContent || '')
              .join('\n');

            contentFound = true;
            successMethod = 'DOM ace_line reading';
            console.log('Successfully read editor content via ace_line elements');
          } else {
            console.log('No text layer or ace_line elements found in the editor');
          }
        }
      } catch (error) {
        console.error('Error using DOM reading:', error);
      }
    }

    // METHOD 3: Read from hidden textarea
    if (!contentFound) {
      try {
        console.log('METHOD 3: Searching for hidden textarea...');

        // Look for textareas that might be connected to the editor
        const textareas = document.querySelectorAll('textarea');
        console.log(`Found ${textareas.length} textareas in the document`);

        for (const textarea of Array.from(textareas)) {
          try {
            // Check if this might be an editor textarea
            if (textarea.classList.contains('ace_text-input') ||
                textarea.style.position === 'absolute' ||
                textarea.style.opacity === '0' ||
                textarea.style.height === '1px' ||
                textarea.parentElement?.classList.contains('ace_editor')) {

              console.log('Found potential editor textarea:', textarea);

              const content = textarea.value;
              if (content && content.length > 0) {
                scriptContent = content;
                contentFound = true;
                successMethod = 'Hidden textarea';
                console.log('Successfully read editor content via hidden textarea');
                break;
              }
            }
          } catch (e) {
            console.log('Error reading from a textarea:', e);
          }
        }
      } catch (error) {
        console.error('Error reading hidden textarea:', error);
      }
    }

    // If all methods failed, return error
    if (!contentFound) {
      console.error('All methods for reading editor content failed');
      sendResponse({
        success: false,
        error: 'Failed to read editor content. Could not access the Earth Engine Code Editor.'
      });
      return;
    }

    // Count lines in the script
    const lineCount = scriptContent.split('\n').length;

    // Return success with the script content
    console.log(`Editor content read successfully using method: ${successMethod}, ${lineCount} lines`);
    sendResponse({
      success: true,
      content: scriptContent,
      lineCount: lineCount,
      method: successMethod
    });

  } catch (error) {
    console.error('Error getting Earth Engine script:', error);
    sendResponse({
      success: false,
      error: `Error getting Earth Engine script: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

/**
 * Handles getting all console output from the Earth Engine console
 */
async function handleGetConsoleOutput(sendResponse: (response: any) => void) {
  console.log('Handling get console output message');

  try {
    // Find the EE-CONSOLE element
    const eeConsole = document.querySelector('ee-console');

    if (!eeConsole) {
      console.warn('EE-CONSOLE element not found');
      sendResponse({
        success: false,
        error: 'Console element not found. Make sure you are on the Google Earth Engine code editor page.'
      });
      return;
    }

    // Get all console log entries (they are direct children in light DOM)
    const consoleLogElements = eeConsole.querySelectorAll('ee-console-log');

    if (consoleLogElements.length === 0) {
      console.log('No console output found');
      sendResponse({
        success: true,
        outputs: [],
        count: 0,
        message: 'Console is empty. Run some code to see output.'
      });
      return;
    }

    // Parse each console log entry
    const outputs: Array<{
      type: string,
      message: string,
      index: number,
      hasVisualContent?: boolean,
      visualElementType?: string,
      chartDescription?: string
    }> = [];
    consoleLogElements.forEach((logElement, index) => {
      try {
        // GEE console entries can have multiple child divs when print() has multiple arguments
        // e.g., print('Number:', 42) creates two children: one for 'Number:' and one for '42'
        // We need to get the full textContent and clean it up properly

        let message = logElement.textContent || '';

        // Remove the "JSON" button text that appears at the start
        message = message.replace(/^JSON/, '').trim();

        // Alternative method: get text from all .trivial divs if available
        // This handles cases where content is split across multiple divs
        const trivialDivs = logElement.querySelectorAll('.trivial');
        if (trivialDivs.length > 0) {
          const trivialTexts: string[] = [];
          trivialDivs.forEach(div => {
            const text = div.textContent?.trim();
            if (text) {
              trivialTexts.push(text);
            }
          });
          if (trivialTexts.length > 0) {
            message = trivialTexts.join(' ');
          }
        }

        // Detect visual content (charts, images, etc.)
        const visualElements = logElement.querySelectorAll('canvas, svg, img, iframe, [class*="chart"]');
        let hasVisualContent = false;
        let visualElementType: 'canvas' | 'svg' | 'img' | 'iframe' | 'unknown' | undefined;
        let chartDescription: string | undefined;

        if (visualElements.length > 0) {
          hasVisualContent = true;

          // Determine the visual element type
          if (logElement.querySelector('canvas')) {
            visualElementType = 'canvas';
          } else if (logElement.querySelector('svg')) {
            visualElementType = 'svg';
          } else if (logElement.querySelector('img')) {
            visualElementType = 'img';
          } else if (logElement.querySelector('iframe')) {
            visualElementType = 'iframe';
          } else {
            visualElementType = 'unknown';
          }

          // Try to get chart description from title or heading elements
          const titleElement = logElement.querySelector('[class*="title"], h3, h4, h5, .chart-title');
          if (titleElement && titleElement.textContent) {
            chartDescription = titleElement.textContent.trim();
          }

          // Add a hint to the message
          message = message + ' [📊 Chart/visualization detected - use screenshot tool to view details]';
        }

        // Detect the type based on class names or content
        let type: 'info' | 'error' | 'warning' | 'log' | 'chart' = 'log';

        if (hasVisualContent) {
          type = 'chart';
        } else if (logElement.classList.contains('error') || message.toLowerCase().includes('error')) {
          type = 'error';
        } else if (logElement.classList.contains('warning') || message.toLowerCase().includes('warning')) {
          type = 'warning';
        } else {
          type = 'info';
        }

        outputs.push({
          type,
          message,
          index,
          ...(hasVisualContent && { hasVisualContent }),
          ...(visualElementType && { visualElementType }),
          ...(chartDescription && { chartDescription })
        });

      } catch (parseError) {
        console.warn(`Error parsing console log entry ${index}:`, parseError);
        outputs.push({
          type: 'error',
          message: `[Parse Error] Could not read console entry ${index}`,
          index
        });
      }
    });

    console.log(`Successfully read ${outputs.length} console outputs`);
    sendResponse({
      success: true,
      outputs,
      count: outputs.length
    });

  } catch (error) {
    console.error('Error getting console output:', error);
    sendResponse({
      success: false,
      error: `Error getting console output: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

/**
 * Handles getting information about Earth Engine map layers
 */
async function handleGetMapLayers(sendResponse: (response: GetMapLayersResponse) => void) {
  try {
    console.log('Handling GET_MAP_LAYERS message');
    
    // Look for the layers panel which typically contains layer information
    const layersPanel = document.querySelector('.layers-card');
    if (!layersPanel) {
      console.log('Layers panel not found');
      sendResponse({
        success: true,
        layers: []
      });
      return;
    }
    
    // Find all layer items in the panel
    const layerItems = layersPanel.querySelectorAll('.layer-card');
    const layers: MapLayer[] = [];
    
    layerItems.forEach((item, index) => {
      try {
        // Extract layer ID - usually in the item ID or data attributes
        const id = item.id || `layer-${index}`;
        
        // Try to find the layer name
        const nameElement = item.querySelector('.layer-title, .layer-name');
        const name = nameElement ? nameElement.textContent?.trim() || `Layer ${index+1}` : `Layer ${index+1}`;
        
        // Check visibility - usually there's an eye icon or visibility checkbox
        const visibilityEl = item.querySelector('.visibility-toggle, input[type="checkbox"]');
        const visibleAttr = visibilityEl?.getAttribute('aria-checked') || visibilityEl?.getAttribute('checked');
        const hiddenClass = item.classList.contains('hidden') || item.classList.contains('layer-hidden');
        const visible = visibleAttr === 'true' || visibleAttr === 'checked' || !hiddenClass;
        
        // Try to find opacity information - often a slider or numeric value
        const opacityEl = item.querySelector('.opacity-slider, input[type="range"], .opacity-value');
        let opacity = 1.0; // Default to full opacity
        
        if (opacityEl) {
          const opacityValue = opacityEl.getAttribute('value') || 
                              opacityEl.getAttribute('aria-valuenow') || 
                              (opacityEl as HTMLInputElement).value;
          
          if (opacityValue) {
            // Normalize to 0-1 range (Earth Engine sometimes uses 0-100)
            opacity = parseFloat(opacityValue);
            if (opacity > 1) opacity /= 100;
          }
        }
        
        // Look for layer type information if available
        const typeEl = item.querySelector('.layer-type');
        const type = typeEl ? typeEl.textContent?.trim() : undefined;
        
        // Add to layers collection
        layers.push({
          id,
          name,
          visible,
          opacity,
          type,
          zIndex: index
        });
      } catch (itemError) {
        console.warn(`Error parsing layer item:`, itemError);
        // Continue with other layers even if one fails
      }
    });
    
    console.log(`Found ${layers.length} map layers`);
    sendResponse({
      success: true,
      layers
    });
  } catch (error) {
    console.error('Error getting map layers:', error);
    sendResponse({
      success: false,
      error: `Error getting map layers: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

/**
 * Recursively searches for an element with a given aria-ref ID,
 * traversing through open shadow DOMs.
 */
function findElementInNodeRecursive(node: Document | ShadowRoot, refId: string): Element | null {
  const selector = `[aria-ref="${refId}"]`;
  let foundElement = node.querySelector(selector);

  if (foundElement) {
    return foundElement;
  }

  // If not found in the current node, search in shadow roots of its children
  const elements = node.querySelectorAll('*');
  for (const element of Array.from(elements)) {
    if (element.shadowRoot && element.shadowRoot.mode === 'open') {
      foundElement = findElementInNodeRecursive(element.shadowRoot, refId);
      if (foundElement) {
        return foundElement;
      }
    }
  }
  return null;
}

/**
 * Handles getting element information by its aria-ref ID
 */
function handleGetElementByRefId(refId: string, sendResponse: (response: any) => void) {
  try {
    if (!refId) {
      sendResponse({
        success: false,
        error: 'refId is required'
      });
      return;
    }

    const element = findElementInNodeRecursive(document, refId);

    if (!element) {
      sendResponse({
        success: false,
        error: `No element found with refId: ${refId}`
      });
      return;
    }

    // Logic to extract element details (similar to getElement.ts content script part)
    const attributesObj: Record<string, string> = {};
    for (const attr of Array.from(element.attributes)) {
      attributesObj[attr.name] = attr.value;
    }

    const style = window.getComputedStyle(element);
    const isVisible = style.display !== 'none' &&
                      style.visibility !== 'hidden' &&
                      style.opacity !== '0';

    let isEnabled = true;
    if (element instanceof HTMLButtonElement ||
        element instanceof HTMLInputElement ||
        element instanceof HTMLSelectElement ||
        element instanceof HTMLTextAreaElement ||
        element instanceof HTMLOptionElement) {
      isEnabled = !element.disabled;
    }

    const rect = element.getBoundingClientRect();
    const boundingRect = {
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      left: rect.left,
      width: rect.width,
      height: rect.height
    };

    let value = undefined;
    if (element instanceof HTMLInputElement ||
        element instanceof HTMLTextAreaElement ||
        element instanceof HTMLSelectElement) {
      value = (element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value;
    }

    const elementInfo = {
      tagName: element.tagName.toLowerCase(),
      id: element.id || undefined,
      className: element.className || undefined,
      textContent: element.textContent ? element.textContent.trim() : undefined,
      value,
      attributes: attributesObj,
      isVisible,
      isEnabled,
      boundingRect
    };

    sendResponse({
      success: true,
      elements: [elementInfo], // Return as an array for consistency with getElement
      count: 1
    });

  } catch (error) {
    console.error(`Error in handleGetElementByRefId for refId '${refId}':`, error);
    sendResponse({
      success: false,
      error: `Error getting element by refId: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

/**
 * Handles executing a click at specific coordinates on the page.
 */
async function handleExecuteClickByCoordinates(x: number, y: number, sendResponse: (response: any) => void) {
  try {
    console.log(`[Content Script] Attempting to click at coordinates: (${x}, ${y})`);
    const elementAtPoint = document.elementFromPoint(x, y);

    if (!elementAtPoint) {
      sendResponse({
        success: false,
        error: `No element found at coordinates (${x}, ${y})`
      });
      return;
    }

    console.log(`[Content Script] Element at (${x},${y}):`, elementAtPoint);

    // Show visual indicator at click location
    showClickIndicator(x, y);

    // Create and dispatch mouse events to simulate a click
    // A simpler event sequence to avoid triggering double-click-like behavior (e.g., zoom)
    const eventSequence = ['mousedown', 'mouseup', 'click'];

    for (const eventType of eventSequence) {
      const event = new MouseEvent(eventType, {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        view: window,
        composed: true // Important for events to cross shadow DOM boundaries if needed
      });
      console.log(`[Content Script] Dispatching ${eventType} on`, elementAtPoint);
      elementAtPoint.dispatchEvent(event);
    }

    sendResponse({
      success: true,
      message: `Successfully simulated click at (${x}, ${y}) on element: ${elementAtPoint.tagName}`
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Content Script] Error executing click by coordinates:', errorMessage);
    sendResponse({
      success: false,
      error: `Error clicking by coordinates in page: ${errorMessage}`
    });
  }
}

/**
 * Handles clicking by CSS selector
 */
async function handleClickBySelector(selector: string, elementDescription: string | undefined, sendResponse: (response: any) => void) {
  try {
    console.log(`[Content Script - Click By Selector] Looking for element with selector: "${selector}"`);
    
    // Function to search in shadow DOMs as well
    const findElementInShadowDoms = (root: Document | ShadowRoot, selector: string): Element | null => {
      // Try direct query first
      try {
        const element = root.querySelector(selector);
        if (element) {
          console.log(`[Content Script - Click By Selector] Found element directly:`, element);
          return element;
        }
      } catch (error) {
        console.error(`[Content Script - Click By Selector] Error in direct querySelector:`, error);
      }
      
      // Search in shadow DOMs
      const allElements = root.querySelectorAll('*');
      for (const host of Array.from(allElements)) {
        if (host.shadowRoot && host.shadowRoot.mode === 'open') {
          console.log(`[Content Script - Click By Selector] Searching in shadow DOM of:`, host);
          const elementInShadow = findElementInShadowDoms(host.shadowRoot, selector);
          if (elementInShadow) {
            console.log(`[Content Script - Click By Selector] Found element in shadow DOM:`, elementInShadow);
            return elementInShadow;
          }
        }
      }
      
      return null;
    };

    const element = findElementInShadowDoms(document, selector);
    
    if (!element) {
      console.error(`[Content Script - Click By Selector] Element not found with selector: "${selector}"`);
      sendResponse({
        success: false,
        error: `Element not found with selector: ${selector}`
      });
      return;
    }

    console.log(`[Content Script - Click By Selector] Found element:`, element);
    console.log(`[Content Script - Click By Selector] Element details: tagName=${element.tagName}, id=${element.id || 'none'}, class=${element.className || 'none'}`);

    // Check if element is connected to DOM
    if (!element.isConnected) {
      console.error(`[Content Script - Click By Selector] Element is detached from DOM`);
      sendResponse({
        success: false,
        error: 'Element is detached from the DOM'
      });
      return;
    }

    // Scroll element into view
    console.log(`[Content Script - Click By Selector] Scrolling element into view`);
    element.scrollIntoView({ behavior: 'auto', block: 'center' });

    // Get element's bounding rect for click coordinates
    const rect = element.getBoundingClientRect();
    console.log(`[Content Script - Click By Selector] Element bounding rect:`, rect);
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Create and dispatch mouse events
    const mouseDownEvent = new MouseEvent('mousedown', {
      view: window,
      bubbles: true,
      cancelable: true,
      clientX: centerX,
      clientY: centerY,
      button: 0
    });

    const mouseUpEvent = new MouseEvent('mouseup', {
      view: window,
      bubbles: true,
      cancelable: true,
      clientX: centerX,
      clientY: centerY,
      button: 0
    });

    const clickEvent = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true,
      clientX: centerX,
      clientY: centerY,
      button: 0
    });

    // Dispatch events in sequence
    console.log(`[Content Script - Click By Selector] Dispatching mouse events`);
    element.dispatchEvent(mouseDownEvent);
    element.dispatchEvent(mouseUpEvent);
    element.dispatchEvent(clickEvent);

    // Also trigger native click for form elements and links
    if (element instanceof HTMLElement) {
      console.log(`[Content Script - Click By Selector] Calling native click() method`);
      element.click();
    }

    console.log(`[Content Script - Click By Selector] Click sequence completed`);
    sendResponse({
      success: true,
      message: `Successfully clicked element with selector: ${selector}${elementDescription ? ` (${elementDescription})` : ''}`
    });
  } catch (error) {
    console.error(`[Content Script - Click By Selector] Error clicking element:`, error);
    sendResponse({
      success: false,
      error: `Error clicking element: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

async function handleClickByRefId(refId: string, sendResponse: (response: any) => void) {
  console.log(`Content script: Handling CLICK_BY_REF_ID for refId: ${refId}`);
  try {
    if (typeof chrome === 'undefined' || typeof chrome.runtime === 'undefined' || typeof chrome.runtime.id === 'undefined') {
      console.warn('[ClickByRefIdTool - CS] Extension context appears to be invalidated. Aborting.');
      sendResponse({ success: false, error: 'Extension context invalidated' });
      return;
    }

    const element = findElementInNodeRecursive(document, refId);

    if (element && typeof (element as HTMLElement).click === 'function') {
      (element as HTMLElement).click();
      console.log(`Successfully clicked element with refId: ${refId}`);
      sendResponse({ success: true, message: `Successfully clicked element with refId: ${refId}`, refId });
    } else {
      console.warn(`Element with refId '${refId}' not found or not clickable.`);
      sendResponse({ success: false, error: `Element with refId '${refId}' not found or not clickable.`, refId });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error clicking element with refId '${refId}':`, error);
    sendResponse({ success: false, error: `Error clicking element: ${errorMessage}`, refId });
  }
}

/**
 * Get map information including bounds, center point, and viewport dimensions
 */
function handleGetMapInfo(sendResponse: (response: any) => void) {
  console.log('Content script: Handling GET_MAP_INFO');
  try {
    const mapElement = document.querySelector('.ui-map') as HTMLElement;

    if (!mapElement) {
      sendResponse({
        success: false,
        error: 'Map element not found. Please ensure you are on the Earth Engine Code Editor page.'
      });
      return;
    }

    const rect = mapElement.getBoundingClientRect();

    const mapInfo = {
      mapBounds: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height
      },
      centerPoint: {
        x: rect.x + rect.width / 2,
        y: rect.y + rect.height / 2
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    };

    sendResponse({
      success: true,
      data: mapInfo
    });
  } catch (error) {
    console.error('Error getting map info:', error);
    sendResponse({
      success: false,
      error: `Error getting map info: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

async function handleTakeAccessibilitySnapshot(sendResponse: (response: SnapshotResponse) => void) {
  console.log('Content script: Handling TAKE_ACCESSIBILITY_SNAPSHOT');
  try {
    const result = await snapshot(); // This will call captureDirectSnapshot
    sendResponse(result);
  } catch (error) {
    console.error('Error taking accessibility snapshot in content script:', error);
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error in handleTakeAccessibilitySnapshot'
    });
  }
}

console.log('Earth Engine AI Assistant content script fully loaded and listeners attached.');

// Add a global error handler to catch any remaining uncaught errors
window.addEventListener('error', (event) => {
  if (event.error && event.error.message && event.error.message.includes('Extension context invalidated')) {
    console.warn('Global error handler caught extension context invalidation, marking context as invalid');
    isContextInvalidated = true;
    
    // Clear the periodic check if it's still running
    if (periodicCheckIntervalId !== undefined) {
      clearInterval(periodicCheckIntervalId);
      periodicCheckIntervalId = undefined;
    }
    
    // Prevent the error from bubbling up
    event.preventDefault();
    return false;
  }
});

// Add unhandled promise rejection handler for extension context errors
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.message && event.reason.message.includes('Extension context invalidated')) {
    console.warn('Global promise rejection handler caught extension context invalidation');
    isContextInvalidated = true;
    
    // Clear the periodic check if it's still running
    if (periodicCheckIntervalId !== undefined) {
      clearInterval(periodicCheckIntervalId);
      periodicCheckIntervalId = undefined;
    }
    
    // Prevent the error from causing console spam
    event.preventDefault();
  }
});

// Clean up when the page is about to unload
window.addEventListener('beforeunload', () => {
  console.log('Content script cleaning up before page unload...');
  
  // Clear the periodic check interval
  if (periodicCheckIntervalId !== undefined) {
    clearInterval(periodicCheckIntervalId);
    periodicCheckIntervalId = undefined;
  }
  
  // Remove our singleton marker
  delete (window as any)[CONTENT_SCRIPT_ID];
  delete (window as any)[CONTENT_SCRIPT_ID + '_intervalId'];
  
  // Mark context as invalidated to prevent any further operations
  isContextInvalidated = true;
});
