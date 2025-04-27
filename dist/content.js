/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/*!******************************!*\
  !*** ./src/content/index.ts ***!
  \******************************/

// Initialize content script
function initialize() {
    console.log('Earth Engine AI Assistant content script initialized');
    // --- Auto-search for the Console button and summary span on load ---
    const xpath = '/html/body/ee-app-context/div/div[2]/div[1]/div/div[2]';
    const containerNode = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    const container = containerNode;
    if (container) {
        // Find the "Console" button
        const consoleButton = Array.from(container.querySelectorAll('button'))
            .find(btn => btn.textContent && btn.textContent.trim() === 'Console');
        // Find the summary span
        const summarySpan = container.querySelector('span.summary');
        if (consoleButton) {
            console.log('Found Console button:', consoleButton);
        }
        else {
            console.log('Console button not found');
        }
        if (summarySpan) {
            console.log('Found summary span:', summarySpan, 'Text:', summarySpan.textContent);
        }
        else {
            console.log('Summary span not found');
        }
    }
    else {
        console.log('Container not found for the given XPath');
    }
    // --- End auto-search ---
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
            case 'GET_SUMMARY_SPAN': {
                // Updated XPath to the Console tab container
                const xpath = "/html/body/ee-app-context/div/div[2]/div[1]/div/div[2]/div/ee-tab-panel/ee-tab[2]";
                const container = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                let summaryText = '';
                if (container) {
                    // Look for a span with class 'summary'
                    const summarySpan = container.querySelector('span.summary');
                    if (summarySpan) {
                        summaryText = summarySpan.textContent || '';
                    }
                    else {
                        summaryText = 'Wrong direction';
                    }
                }
                else {
                    summaryText = 'Wrong direction';
                }
                sendResponse({ summary: summaryText });
                break;
            }
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