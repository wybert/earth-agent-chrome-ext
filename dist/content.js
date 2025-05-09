/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	// The require scope
/******/ 	var __webpack_require__ = {};
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
/*!******************************!*\
  !*** ./src/content/index.ts ***!
  \******************************/
__webpack_require__.r(__webpack_exports__);
// Initialize content script immediately to catch messages early
console.log('Earth Engine AI Assistant content script loading at:', new Date().toISOString());
// Track connection status with background script
let backgroundConnectionVerified = false;
let notificationRetries = 0;
const MAX_NOTIFICATION_RETRIES = 5;
// Track the state of the content script
let backgroundConnected = false;
let connectionRetries = 0;
const MAX_CONNECTION_RETRIES = 5;
const CONNECTION_RETRY_DELAYS = [500, 1000, 2000, 4000, 8000]; // Exponential backoff
// Notify background script that content script is loaded
function notifyBackgroundScript() {
    console.log('Notifying background script that content script is loaded...');
    chrome.runtime.sendMessage({
        type: 'CONTENT_SCRIPT_LOADED',
        url: window.location.href,
        timestamp: Date.now()
    }, (response) => {
        if (chrome.runtime.lastError) {
            console.warn('Error notifying background script:', chrome.runtime.lastError);
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
}
// Track ping attempts to avoid infinite loops
let pingAttempts = 0;
const MAX_PING_ATTEMPTS = 3;
// Respond to ping checks from background script
function setupPingResponse() {
    // Create a specific handler for PING messages to increase reliability
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message && message.type === 'PING') {
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
        }
    });
}
// Update the message listener to handle the new message type
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || !message.type) {
        console.warn('Received invalid message:', message);
        sendResponse({ success: false, error: 'Invalid message format' });
        return false;
    }
    console.log(`Content script received message: ${message.type}`);
    try {
        switch (message.type) {
            case 'PING':
                sendResponse({ success: true, message: 'Earth Engine content script is active' });
                return false;
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
            case 'GET_MAP_LAYERS':
                handleGetMapLayers(sendResponse);
                return true; // Will respond asynchronously
            default:
                console.warn(`Unknown message type: ${message.type}`);
                sendResponse({ success: false, error: `Unknown message type: ${message.type}` });
                return false;
        }
    }
    catch (error) {
        console.error(`Error handling message (${message.type}):`, error);
        sendResponse({
            success: false,
            error: `Error in content script: ${error instanceof Error ? error.message : String(error)}`
        });
        return false;
    }
});
// Also initialize when DOM content is loaded to make sure we have access to the page elements
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setupPingResponse();
        notifyBackgroundScript();
    });
}
else {
    setupPingResponse();
    notifyBackgroundScript();
}
// Also set up a periodic self-check to ensure registration
function periodicSelfCheck() {
    if (pingAttempts < MAX_PING_ATTEMPTS || !backgroundConnectionVerified) {
        pingAttempts++;
        // Send a self-ping to the background script
        chrome.runtime.sendMessage({
            type: 'CONTENT_SCRIPT_HEARTBEAT',
            url: window.location.href,
            timestamp: Date.now()
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.warn('Background connection error during self-check:', chrome.runtime.lastError);
                backgroundConnectionVerified = false;
            }
            else if (response && response.success) {
                console.log('Self-check successful, background script acknowledged content script');
                pingAttempts = 0;
                backgroundConnectionVerified = true;
            }
            else {
                console.warn('Self-check received unexpected response:', response);
                backgroundConnectionVerified = false;
            }
        });
    }
}
// Run self-checks periodically
setInterval(periodicSelfCheck, 10000);
/**
 * Handles the RUN_CODE message by clicking the run button in the Earth Engine editor
 */
async function handleRunCode(code, sendResponse) {
    try {
        console.log('Handling RUN_CODE message, clicking run button');
        // Find the run button by its class and title attributes
        // GEE editor has a button with class "goog-button run-button" and title "Run script (Ctrl+Enter)"
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
            fallbackButton.click();
        }
        else {
            // Click the run button
            runButton.click();
        }
        // Wait for a short time to allow the button state to change
        setTimeout(() => {
            // We successfully clicked the button
            sendResponse({
                success: true,
                result: 'Run button clicked successfully'
            });
        }, 500);
    }
    catch (error) {
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
function handleCheckConsole(sendResponse) {
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
    }
    catch (error) {
        sendResponse({
            success: false,
            error: `Error checking console: ${error instanceof Error ? error.message : String(error)}`
        });
    }
}
/**
 * Handles inspecting the map at specific coordinates
 */
function handleInspectMap(coordinates, sendResponse) {
    try {
        if (!coordinates) {
            sendResponse({
                success: false,
                error: 'No coordinates provided'
            });
            return;
        }
        // This is a placeholder - actual implementation would need to interact with Earth Engine map
        // and might require injecting code to use the Map.onClick() or similar Earth Engine API
        sendResponse({
            success: true,
            data: {
                location: coordinates,
                message: 'Map inspection not fully implemented yet. This is a placeholder response.'
            }
        });
    }
    catch (error) {
        sendResponse({
            success: false,
            error: `Error inspecting map: ${error instanceof Error ? error.message : String(error)}`
        });
    }
}
/**
 * Handles getting Earth Engine tasks
 */
function handleGetTasks(sendResponse) {
    try {
        // This is a placeholder - actual implementation would need to access the Earth Engine 
        // task list from the UI or by executing code in the Earth Engine context
        sendResponse({
            success: true,
            tasks: [],
            message: 'Task retrieval not fully implemented yet. This is a placeholder response.'
        });
    }
    catch (error) {
        sendResponse({
            success: false,
            error: `Error getting tasks: ${error instanceof Error ? error.message : String(error)}`
        });
    }
}
// Notify the background script that the content script is loaded
function notifyBackgroundScriptLoaded() {
    try {
        console.log('Earth Engine Agent content script loaded, notifying background script...');
        chrome.runtime.sendMessage({ type: 'CONTENT_SCRIPT_LOADED' }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('Error notifying background script:', chrome.runtime.lastError);
                // Retry with exponential backoff if we haven't exceeded max retries
                if (connectionRetries < MAX_CONNECTION_RETRIES) {
                    const delay = CONNECTION_RETRY_DELAYS[connectionRetries] || 10000; // Default to 10s for any retry beyond our array
                    connectionRetries++;
                    console.log(`Retrying connection to background script in ${delay}ms (attempt ${connectionRetries}/${MAX_CONNECTION_RETRIES})...`);
                    setTimeout(notifyBackgroundScriptLoaded, delay);
                }
                else {
                    console.error(`Failed to connect to background script after ${MAX_CONNECTION_RETRIES} attempts`);
                }
                return;
            }
            backgroundConnected = true;
            console.log('Background script notified of content script load.');
        });
    }
    catch (error) {
        console.error('Failed to notify background script:', error);
    }
}
// Initialize content script
function initialize() {
    notifyBackgroundScriptLoaded();
}
/**
 * Handles editing an Earth Engine script
 */
async function handleEditScript(message, sendResponse) {
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
                () => window.ace,
                // Try to find the editor in the page scope
                () => Array.from(document.querySelectorAll('.ace_editor')).map(el => el.__ace_editor__ || el.env?.editor).find(editor => editor),
                // Try from CodeMirror if it's used instead
                () => {
                    const cmElements = document.querySelectorAll('.CodeMirror');
                    if (cmElements.length > 0) {
                        return Array.from(cmElements).map(el => el.CodeMirror).find(cm => cm);
                    }
                    return null;
                },
                // Try to find editor in Google Earth Engine specific objects
                () => window.ee?.Editor?.ace,
                () => window.ee?.data?.aceEditor,
                () => window.code?.editor?.aceEditor,
                // Last resort - try to scan the entire window object for anything that looks like an editor
                () => {
                    const foundEditors = [];
                    for (const key in window) {
                        try {
                            const obj = window[key];
                            if (obj && typeof obj === 'object' &&
                                (obj.setContent || obj.setValue || obj.getSession || obj.edit)) {
                                foundEditors.push(obj);
                            }
                        }
                        catch (e) {
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
                }
                catch (e) {
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
                    }
                    catch (e) {
                        // Try the next method
                        console.log('Editor update method failed:', e);
                    }
                }
            }
        }
        catch (error) {
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
                        }
                        catch (e) {
                            console.log('Error updating textarea:', e);
                        }
                    }
                    editorUpdated = true;
                    successMethod = 'DOM manipulation';
                    console.log('Successfully updated editor content via DOM manipulation');
                }
                else {
                    console.log('No pre elements found in the editor');
                }
            }
            catch (error) {
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
                    }
                    catch (e) {
                        console.log('Error updating a textarea:', e);
                    }
                }
                if (textareaUpdated) {
                    editorUpdated = true;
                    successMethod = 'Hidden textarea';
                    console.log('Successfully updated editor content via hidden textarea');
                }
            }
            catch (error) {
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
    }
    catch (error) {
        console.error('Error editing Earth Engine script:', error);
        sendResponse({
            success: false,
            error: `Error editing Earth Engine script: ${error instanceof Error ? error.message : String(error)}`
        });
    }
}
/**
 * Handles getting information about Earth Engine map layers
 */
async function handleGetMapLayers(sendResponse) {
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
        const layers = [];
        layerItems.forEach((item, index) => {
            try {
                // Extract layer ID - usually in the item ID or data attributes
                const id = item.id || `layer-${index}`;
                // Try to find the layer name
                const nameElement = item.querySelector('.layer-title, .layer-name');
                const name = nameElement ? nameElement.textContent?.trim() || `Layer ${index + 1}` : `Layer ${index + 1}`;
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
                        opacityEl.value;
                    if (opacityValue) {
                        // Normalize to 0-1 range (Earth Engine sometimes uses 0-100)
                        opacity = parseFloat(opacityValue);
                        if (opacity > 1)
                            opacity /= 100;
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
            }
            catch (itemError) {
                console.warn(`Error parsing layer item:`, itemError);
                // Continue with other layers even if one fails
            }
        });
        console.log(`Found ${layers.length} map layers`);
        sendResponse({
            success: true,
            layers
        });
    }
    catch (error) {
        console.error('Error getting map layers:', error);
        sendResponse({
            success: false,
            error: `Error getting map layers: ${error instanceof Error ? error.message : String(error)}`
        });
    }
}


/******/ })()
;
//# sourceMappingURL=content.js.map