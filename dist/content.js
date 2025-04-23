/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/*!******************************!*\
  !*** ./src/content/index.ts ***!
  \******************************/

// Initialize content script
function initialize() {
    console.log('Earth Engine AI Assistant content script initialized');
    // Send initialization message to background script
    chrome.runtime.sendMessage({ type: 'INIT' }, (response) => {
        console.log('Initialization response:', response);
    });
    // Set up message listener
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log('Content script received message:', message);
        switch (message.type) {
            case 'GET_EDITOR_CONTENT':
                // TODO: Implement editor content retrieval
                sendResponse({ content: 'Not implemented yet' });
                break;
            default:
                console.warn('Unknown message type:', message.type);
                sendResponse({ error: 'Unknown message type' });
        }
        return true; // Will respond asynchronously
    });
}
// Start initialization when the page is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
}
else {
    initialize();
}

/******/ })()
;
//# sourceMappingURL=content.js.map