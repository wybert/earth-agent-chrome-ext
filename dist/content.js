/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/*!******************************!*\
  !*** ./src/content/index.ts ***!
  \******************************/

// Initialize content script immediately to catch messages early
console.log('Earth Engine AI Assistant content script loading at:', new Date().toISOString());
// Notify background script that content script is loaded
function notifyBackgroundScript() {
    chrome.runtime.sendMessage({
        type: 'CONTENT_SCRIPT_LOADED',
        url: window.location.href,
        timestamp: Date.now()
    }, (response) => {
        console.log('Content script loaded notification response:', response);
    });
}
// Setup message listener immediately (don't wait for DOMContentLoaded)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Content script received message:', message, 'at:', new Date().toISOString());
    switch (message.type) {
        case 'GET_EDITOR_CONTENT':
            // TODO: Implement editor content retrieval
            sendResponse({ content: 'Not implemented yet' });
            break;
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
            handleEditScript(message.scriptId, message.content, sendResponse);
            return true; // Will respond asynchronously
        case 'PING':
            // Simple ping to check if content script is loaded
            sendResponse({
                success: true,
                message: 'Content script is active',
                timestamp: Date.now()
            });
            break;
        default:
            console.warn('Unknown message type:', message.type);
            sendResponse({ success: false, error: 'Unknown message type' });
    }
    return true; // Will respond asynchronously
});
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
/**
 * Handles editing an Earth Engine script
 */
function handleEditScript(scriptId, content, sendResponse) {
    try {
        if (!scriptId || !content) {
            sendResponse({
                success: false,
                error: 'Script ID and content are required'
            });
            return;
        }
        // This is a placeholder - actual implementation would need to interact with 
        // Earth Engine script management APIs or UI elements
        sendResponse({
            success: true,
            message: `Script editing not fully implemented yet. This would edit script ${scriptId}.`
        });
    }
    catch (error) {
        sendResponse({
            success: false,
            error: `Error editing script: ${error instanceof Error ? error.message : String(error)}`
        });
    }
}
// Also initialize when DOM content is loaded to make sure we have access to the page elements
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', notifyBackgroundScript);
}
else {
    notifyBackgroundScript();
}

/******/ })()
;
//# sourceMappingURL=content.js.map