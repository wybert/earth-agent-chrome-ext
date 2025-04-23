/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/*!*********************************!*\
  !*** ./src/background/index.ts ***!
  \*********************************/

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
    }
    else {
        // If not on Earth Engine, create a new tab with Earth Engine
        await chrome.tabs.create({
            url: 'https://code.earthengine.google.com/'
        });
    }
});
// Validate server identity with better error handling
async function validateServerIdentity(host, port) {
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
        }
        else {
            console.error("Invalid server signature - not the browser tools server");
            return false;
        }
    }
    catch (error) {
        // Handle network errors more gracefully
        console.error("Error validating server identity:", error);
        // Don't throw an error, just return false if we can't connect
        return false;
    }
}
// Handle messages from content script or side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
        port.onMessage.addListener((message) => {
            console.log('Received message from side panel:', message);
            // Handle side panel specific messages here
        });
        port.onDisconnect.addListener(() => {
            console.log('Side panel disconnected');
        });
    }
});

/******/ })()
;
//# sourceMappingURL=background.js.map