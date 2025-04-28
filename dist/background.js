/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/background/routes.ts":
/*!**********************************!*\
  !*** ./src/background/routes.ts ***!
  \**********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   handleChatRoute: () => (/* binding */ handleChatRoute)
/* harmony export */ });
// Earth Engine system prompt with domain expertise
const GEE_SYSTEM_PROMPT = `You are Earth Engine Assistant, an AI specialized in Google Earth Engine (GEE) geospatial analysis.

Your capabilities:
- Provide code examples for GEE tasks like image processing, classification, and visualization
- Explain Earth Engine concepts, APIs, and best practices
- Help troubleshoot Earth Engine code issues
- Recommend appropriate datasets and methods for geospatial analysis

Instructions:
- Always provide code within backticks: \`code\`
- Format Earth Engine code with proper JavaScript/Python syntax
- When suggesting large code blocks, include comments explaining key steps
- Cite specific Earth Engine functions and methods when relevant
- For complex topics, break down explanations step-by-step
- If you're unsure about something, acknowledge limitations rather than providing incorrect information

Common Earth Engine patterns:
- Image and collection loading: ee.Image(), ee.ImageCollection()
- Filtering: .filterDate(), .filterBounds()
- Reducing: .reduce(), .mean(), .median()
- Visualization: Map.addLayer(), ui.Map(), ui.Chart()
- Classification: .classify(), ee.Classifier.randomForest()
- Exporting: Export.image.toDrive(), Export.table.toAsset()

Speak in a helpful, educational tone while providing practical guidance for Earth Engine tasks.`;
// Route handler for /api/chat
async function handleChatRoute(request) {
    try {
        const { messages, apiKey, provider } = await request.json();
        if (!apiKey) {
            return new Response(JSON.stringify({ error: 'API key not configured' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return new Response(JSON.stringify({ error: 'No messages provided' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        // Stream response based on the provider
        let responseStream;
        if (provider === 'openai') {
            responseStream = await streamOpenAIResponse(apiKey, messages);
        }
        else if (provider === 'anthropic') {
            responseStream = await streamAnthropicResponse(apiKey, messages);
        }
        else {
            return new Response(JSON.stringify({ error: 'Unsupported API provider' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        // Create a streamText-compatible response
        return new Response(responseStream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'X-Content-Type-Options': 'nosniff',
                'Cache-Control': 'no-store',
            }
        });
    }
    catch (error) {
        console.error('Chat API error:', error);
        return new Response(JSON.stringify({ error: error.message || 'An error occurred' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
// Stream API for OpenAI
async function streamOpenAIResponse(apiKey, messages) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: GEE_SYSTEM_PROMPT },
                ...messages.map(msg => ({
                    role: msg.role,
                    content: msg.content
                }))
            ],
            temperature: 0.2,
            stream: true,
        })
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Error calling OpenAI API');
    }
    // Direct passthrough of the streaming response
    return response.body;
}
// Stream API for Anthropic
async function streamAnthropicResponse(apiKey, messages) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Accept': 'text/event-stream'
        },
        body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 4000,
            system: GEE_SYSTEM_PROMPT,
            messages: messages.map(msg => ({
                role: msg.role,
                content: msg.content
            })),
            temperature: 0.2,
            stream: true,
        })
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Error calling Anthropic API');
    }
    // Direct passthrough of the streaming response
    return response.body;
}


/***/ }),

/***/ "./src/lib/tools/context7/getDocumentation.ts":
/*!****************************************************!*\
  !*** ./src/lib/tools/context7/getDocumentation.ts ***!
  \****************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   getDocumentation: () => (/* binding */ getDocumentation)
/* harmony export */ });
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
// Define the base URL for Context7 API
const CONTEXT7_API_BASE_URL = "https://context7.com/api";
const DEFAULT_TYPE = "txt";
async function getDocumentation(context7CompatibleLibraryID, topic, options = {}) {
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
            return new Promise((resolve) => {
                // Add a timeout to handle cases where background script doesn't respond
                const timeoutId = setTimeout(() => {
                    console.warn('Background script connection timed out. Falling back to direct API call.');
                    // Fall back to direct API call if background script isn't responding
                    makeDirectApiCall(context7CompatibleLibraryID, topic, options).then(resolve);
                }, 2000); // 2 second timeout
                try {
                    chrome.runtime.sendMessage({
                        type: 'CONTEXT7_GET_DOCUMENTATION',
                        libraryId: context7CompatibleLibraryID,
                        topic,
                        options
                    }, (response) => {
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
                    });
                }
                catch (err) {
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
    }
    catch (error) {
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
async function makeDirectApiCall(context7CompatibleLibraryID, topic, options = {}) {
    try {
        // Remove leading slash if present
        if (context7CompatibleLibraryID.startsWith("/")) {
            context7CompatibleLibraryID = context7CompatibleLibraryID.slice(1);
        }
        // Build the URL using URL object
        const url = new URL(`${CONTEXT7_API_BASE_URL}/v1/${context7CompatibleLibraryID}`);
        // Add options to URL params
        if (options.tokens)
            url.searchParams.set("tokens", options.tokens.toString());
        if (options.folders)
            url.searchParams.set("folders", options.folders);
        if (topic)
            url.searchParams.set("topic", topic);
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
        }
        catch (e) {
            // Not JSON, use text as is
        }
        // Return the text content directly
        return {
            success: true,
            content: text,
        };
    }
    catch (error) {
        return {
            success: false,
            content: null,
            message: `Error making direct API call: ${error instanceof Error ? error.message : String(error)}`,
        };
    }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (getDocumentation);


/***/ }),

/***/ "./src/lib/tools/context7/index.ts":
/*!*****************************************!*\
  !*** ./src/lib/tools/context7/index.ts ***!
  \*****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   getDocumentation: () => (/* reexport safe */ _getDocumentation__WEBPACK_IMPORTED_MODULE_1__["default"]),
/* harmony export */   resolveLibraryId: () => (/* reexport safe */ _resolveLibraryId__WEBPACK_IMPORTED_MODULE_0__["default"])
/* harmony export */ });
/* harmony import */ var _resolveLibraryId__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./resolveLibraryId */ "./src/lib/tools/context7/resolveLibraryId.ts");
/* harmony import */ var _getDocumentation__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./getDocumentation */ "./src/lib/tools/context7/getDocumentation.ts");
/**
 * Context7 tools for fetching Google Earth Engine dataset documentation
 *
 * This module provides tools to:
 * 1. Resolve library names to Context7-compatible IDs
 * 2. Fetch detailed documentation about Earth Engine datasets
 *
 * Usage example:
 * ```typescript
 * import { resolveLibraryId, getDocumentation } from './lib/tools/context7';
 *
 * async function fetchLandsatDocs() {
 *   // First, resolve the library ID
 *   const resolveResult = await resolveLibraryId('Earth Engine datasets');
 *
 *   if (resolveResult.success && resolveResult.libraryId) {
 *     // Then fetch documentation about Landsat
 *     const docs = await getDocumentation(resolveResult.libraryId, 'Landsat');
 *
 *     if (docs.success && docs.content) {
 *       console.log(docs.content);
 *     }
 *   }
 * }
 * ```
 */




/***/ }),

/***/ "./src/lib/tools/context7/resolveLibraryId.ts":
/*!****************************************************!*\
  !*** ./src/lib/tools/context7/resolveLibraryId.ts ***!
  \****************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   resolveLibraryId: () => (/* binding */ resolveLibraryId)
/* harmony export */ });
/**
 * Resolves a general library name into a Context7-compatible library ID
 * This tool is required as a first step before using getDocumentation
 * to retrieve Earth Engine dataset documentation
 *
 * @param libraryName - The library name to search for (e.g., "Earth Engine", "MODIS")
 * @returns The Context7-compatible library ID that can be used with getDocumentation
 */
// Define the base URL for Context7 API
const CONTEXT7_API_BASE_URL = "https://context7.com/api";
async function resolveLibraryId(libraryName) {
    try {
        // If running in a content script or sidepanel context, use the background script
        if (typeof chrome !== 'undefined' && chrome.runtime) {
            // Check if background script is available
            // Add a timeout to prevent hanging if background isn't responsive
            return new Promise((resolve) => {
                // Add a timeout to handle cases where the background script doesn't respond
                const timeoutId = setTimeout(() => {
                    console.warn('Background script connection timed out. Falling back to direct API call.');
                    // Fall back to direct API call if background script isn't responding
                    makeDirectApiCall(libraryName).then(resolve);
                }, 2000); // 2 second timeout
                try {
                    chrome.runtime.sendMessage({
                        type: 'CONTEXT7_RESOLVE_LIBRARY_ID',
                        libraryName
                    }, (response) => {
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
                    });
                }
                catch (err) {
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
    }
    catch (error) {
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
async function makeDirectApiCall(libraryName) {
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
            const earthEngineMatch = data.results.find((result) => result.id &&
                (result.id.includes('earthengine') ||
                    result.id.includes('earth-engine') ||
                    result.title?.toLowerCase().includes('earth engine')));
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
                alternatives: data.results.slice(1, 5).map((result) => result.id),
            };
        }
        return {
            success: false,
            libraryId: null,
            message: 'No matching library found',
            alternatives: data?.results?.map((result) => result.id) || [],
        };
    }
    catch (error) {
        return {
            success: false,
            libraryId: null,
            message: `Error making direct API call: ${error instanceof Error ? error.message : String(error)}`,
        };
    }
}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (resolveLibraryId);


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
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
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
/*!*********************************!*\
  !*** ./src/background/index.ts ***!
  \*********************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _routes__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./routes */ "./src/background/routes.ts");
/* harmony import */ var _lib_tools_context7__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../lib/tools/context7 */ "./src/lib/tools/context7/index.ts");


// Store information about loaded content scripts
const contentScriptTabs = new Map();
// Timing constants
const CONTENT_SCRIPT_PING_TIMEOUT = 5000; // 5 seconds
const TAB_ACTION_RETRY_DELAY = 1000; // 1 second
const MAX_TAB_ACTION_RETRIES = 3;
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
// Forward message to Earth Engine tab with improved error handling and retries
async function sendMessageToEarthEngineTab(message, options) {
    const timeout = options?.timeout || CONTENT_SCRIPT_PING_TIMEOUT;
    const maxRetries = options?.retries || MAX_TAB_ACTION_RETRIES;
    let retryCount = 0;
    console.log('Forwarding message to Earth Engine tab:', message);
    async function attemptSend() {
        // Find Earth Engine tab
        const tabs = await chrome.tabs.query({ url: "*://code.earthengine.google.com/*" });
        if (!tabs || tabs.length === 0) {
            console.error('No Earth Engine tab found');
            return {
                success: false,
                error: 'No Earth Engine tab found. Please open Google Earth Engine at https://code.earthengine.google.com/ in a tab and try again.'
            };
        }
        const tabId = tabs[0].id;
        if (!tabId) {
            console.error('Invalid Earth Engine tab');
            return {
                success: false,
                error: 'Invalid Earth Engine tab'
            };
        }
        // Check if we know the content script is loaded
        if (!contentScriptTabs.has(tabId)) {
            console.log(`Content script not registered for tab ${tabId}, checking with PING...`);
            // Try to ping the content script first
            try {
                await pingContentScript(tabId, timeout);
                console.log(`Content script responded to PING in tab ${tabId}`);
                contentScriptTabs.set(tabId, true);
            }
            catch (error) {
                console.error(`Content script did not respond to PING in tab ${tabId}:`, error);
                // If we've already retried too many times, give up
                if (retryCount >= maxRetries) {
                    return {
                        success: false,
                        error: `Content script did not respond after ${maxRetries} attempts. Please ensure you have the Google Earth Engine tab open and fully loaded at https://code.earthengine.google.com/`
                    };
                }
                // Try to reload the content script by refreshing the tab
                try {
                    console.log(`Attempting to reload content script in tab ${tabId}...`);
                    await chrome.tabs.reload(tabId);
                    // Wait for the page to reload and content script to initialize
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    // Increment retry count and try again
                    retryCount++;
                    console.log(`Retrying after tab reload (attempt ${retryCount}/${maxRetries})...`);
                    return attemptSend();
                }
                catch (reloadError) {
                    return {
                        success: false,
                        error: 'Content script not loaded and tab refresh failed. Please ensure the Earth Engine tab is open and refresh it manually.'
                    };
                }
            }
        }
        // Send message to the content script in the Earth Engine tab
        try {
            console.log(`Sending message to tab ${tabId}`);
            // Use a timeout promise to handle cases where chrome.tabs.sendMessage doesn't reject
            const messagePromise = new Promise((resolve, reject) => {
                const timeoutId = setTimeout(() => {
                    // Remove tab from tracking if timeout occurs
                    contentScriptTabs.delete(tabId);
                    reject(new Error(`Message to tab ${tabId} timed out after ${timeout}ms`));
                }, timeout);
                chrome.tabs.sendMessage(tabId, message, (response) => {
                    clearTimeout(timeoutId);
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                        return;
                    }
                    resolve(response);
                });
            });
            const response = await messagePromise;
            console.log('Received response from Earth Engine tab:', response);
            return response;
        }
        catch (error) {
            console.error('Error communicating with Earth Engine tab:', error);
            // If communication fails, remove tab from tracked tabs so we'll try to ping again next time
            contentScriptTabs.delete(tabId);
            // If we have retries left, try again
            if (retryCount < maxRetries) {
                retryCount++;
                console.log(`Communication failed, retrying (attempt ${retryCount}/${maxRetries})...`);
                await new Promise(resolve => setTimeout(resolve, TAB_ACTION_RETRY_DELAY));
                return attemptSend();
            }
            return {
                success: false,
                error: `Error communicating with Earth Engine tab: ${error instanceof Error ? error.message : String(error)}.
        Please make sure the Earth Engine tab is open and active at https://code.earthengine.google.com/`
            };
        }
    }
    return attemptSend();
}
// Helper function to ping content script with timeout
function pingContentScript(tabId, timeout = CONTENT_SCRIPT_PING_TIMEOUT) {
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            reject(new Error('Content script ping timed out'));
        }, timeout);
        chrome.tabs.sendMessage(tabId, { type: 'PING' }, (response) => {
            clearTimeout(timeoutId);
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
                return;
            }
            if (response && response.success) {
                resolve(true);
            }
            else {
                reject(new Error('Invalid ping response'));
            }
        });
    });
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
        case 'API_REQUEST':
            // Handle API requests directly
            if (message.payload && message.payload.endpoint === '/api/chat') {
                (0,_routes__WEBPACK_IMPORTED_MODULE_0__.handleChatRoute)(new Request(message.payload.url, {
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
                    const result = await (0,_lib_tools_context7__WEBPACK_IMPORTED_MODULE_1__.resolveLibraryId)(message.libraryName);
                    console.log('Resolve result:', result);
                    sendResponse(result);
                }
                catch (error) {
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
                    const result = await (0,_lib_tools_context7__WEBPACK_IMPORTED_MODULE_1__.getDocumentation)(message.libraryId, message.topic);
                    console.log('Documentation result:', result.success, result.content?.substring(0, 50));
                    sendResponse(result);
                }
                catch (error) {
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
                    const searchResult = await (0,_lib_tools_context7__WEBPACK_IMPORTED_MODULE_1__.resolveLibraryId)(`Earth Engine ${message.topic}`);
                    if (!searchResult.success || !searchResult.libraryId) {
                        sendResponse({
                            success: false,
                            message: `Could not find documentation for "${message.topic}". ${searchResult.message || ''}`,
                            alternatives: searchResult.alternatives,
                        });
                        return;
                    }
                    // Then get documentation
                    const docResult = await (0,_lib_tools_context7__WEBPACK_IMPORTED_MODULE_1__.getDocumentation)(searchResult.libraryId, message.topic);
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
                }
                catch (error) {
                    console.error('Error getting dataset info:', error);
                    sendResponse({
                        success: false,
                        message: `Error retrieving Earth Engine documentation: ${error instanceof Error ? error.message : String(error)}`,
                    });
                }
            })();
            return true; // Will respond asynchronously
        // Earth Engine Tool Handlers
        case 'RUN_CODE':
            (async () => {
                try {
                    console.log('Running Earth Engine code, length:', message.code?.length || 0);
                    console.log('Code snippet:', message.code?.substring(0, 50) + '...');
                    const response = await sendMessageToEarthEngineTab(message);
                    console.log('Code execution response:', response);
                    sendResponse(response);
                }
                catch (error) {
                    console.error('Error running Earth Engine code:', error);
                    sendResponse({
                        success: false,
                        error: `Error running Earth Engine code: ${error instanceof Error ? error.message : String(error)}`
                    });
                }
            })();
            return true; // Will respond asynchronously
        case 'INSPECT_MAP':
            (async () => {
                try {
                    console.log('Inspecting Earth Engine map at coordinates:', message.coordinates);
                    const response = await sendMessageToEarthEngineTab(message);
                    console.log('Map inspection response:', response);
                    sendResponse(response);
                }
                catch (error) {
                    console.error('Error inspecting Earth Engine map:', error);
                    sendResponse({
                        success: false,
                        error: `Error inspecting Earth Engine map: ${error instanceof Error ? error.message : String(error)}`
                    });
                }
            })();
            return true; // Will respond asynchronously
        case 'CHECK_CONSOLE':
            (async () => {
                try {
                    console.log('Checking Earth Engine console for errors');
                    const response = await sendMessageToEarthEngineTab(message);
                    console.log('Console check response:', response);
                    sendResponse(response);
                }
                catch (error) {
                    console.error('Error checking Earth Engine console:', error);
                    sendResponse({
                        success: false,
                        error: `Error checking Earth Engine console: ${error instanceof Error ? error.message : String(error)}`
                    });
                }
            })();
            return true; // Will respond asynchronously
        case 'GET_TASKS':
            (async () => {
                try {
                    console.log('Getting Earth Engine tasks');
                    const response = await sendMessageToEarthEngineTab(message);
                    console.log('Get tasks response:', response);
                    sendResponse(response);
                }
                catch (error) {
                    console.error('Error getting Earth Engine tasks:', error);
                    sendResponse({
                        success: false,
                        error: `Error getting Earth Engine tasks: ${error instanceof Error ? error.message : String(error)}`
                    });
                }
            })();
            return true; // Will respond asynchronously
        case 'EDIT_SCRIPT':
            (async () => {
                try {
                    console.log('Editing Earth Engine script:', message.scriptId, 'content length:', message.content?.length || 0);
                    const response = await sendMessageToEarthEngineTab(message);
                    console.log('Script edit response:', response);
                    sendResponse(response);
                }
                catch (error) {
                    console.error('Error editing Earth Engine script:', error);
                    sendResponse({
                        success: false,
                        error: `Error editing Earth Engine script: ${error instanceof Error ? error.message : String(error)}`
                    });
                }
            })();
            return true; // Will respond asynchronously
        case 'CONTENT_SCRIPT_LOADED':
            if (sender.tab && sender.tab.id) {
                console.log(`Content script loaded in tab ${sender.tab.id}:`, message.url);
                contentScriptTabs.set(sender.tab.id, true);
            }
            else {
                console.log('Content script loaded but sender tab info is missing');
            }
            sendResponse({ success: true, message: 'Background script acknowledged content script loading' });
            break;
        case 'CONTENT_SCRIPT_HEARTBEAT':
            if (sender.tab && sender.tab.id) {
                console.log(`Content script heartbeat received from tab ${sender.tab.id}:`, message.url);
                // Update the map to ensure we know this content script is active
                contentScriptTabs.set(sender.tab.id, true);
            }
            else {
                console.log('Content script heartbeat received but sender tab info is missing');
            }
            sendResponse({ success: true, message: 'Background script acknowledged heartbeat' });
            break;
        // Browser Automation Tools
        case 'SCREENSHOT':
            (async () => {
                try {
                    console.log('Taking screenshot of active tab');
                    // Get the active tab
                    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
                    if (!tabs || tabs.length === 0) {
                        sendResponse({
                            success: false,
                            error: 'No active tab found'
                        });
                        return;
                    }
                    // Take the screenshot
                    try {
                        const dataUrl = await chrome.tabs.captureVisibleTab(tabs[0].windowId, {
                            format: 'png',
                            quality: 100
                        });
                        console.log('Screenshot captured successfully');
                        sendResponse({
                            success: true,
                            screenshotData: dataUrl,
                            message: 'Screenshot captured successfully'
                        });
                    }
                    catch (captureError) {
                        console.error('Error capturing screenshot:', captureError);
                        sendResponse({
                            success: false,
                            error: `Error capturing screenshot: ${captureError instanceof Error ? captureError.message : String(captureError)}`
                        });
                    }
                }
                catch (error) {
                    console.error('Error processing screenshot request:', error);
                    sendResponse({
                        success: false,
                        error: `Error processing screenshot request: ${error instanceof Error ? error.message : String(error)}`
                    });
                }
            })();
            return true; // Will respond asynchronously
        case 'CLICK':
            (async () => {
                try {
                    console.log('Click request for selector:', message.payload?.selector);
                    // Get the active tab
                    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
                    if (!tabs || tabs.length === 0 || !tabs[0].id) {
                        sendResponse({
                            success: false,
                            error: 'No active tab found'
                        });
                        return;
                    }
                    const tabId = tabs[0].id;
                    const selector = message.payload?.selector;
                    const position = message.payload?.position;
                    if (!selector && !position) {
                        sendResponse({
                            success: false,
                            error: 'No selector or position provided'
                        });
                        return;
                    }
                    const results = await chrome.scripting.executeScript({
                        target: { tabId },
                        func: (selector, position) => {
                            try {
                                let element = null;
                                if (selector) {
                                    // Try to find element by selector
                                    element = document.querySelector(selector);
                                    if (!element) {
                                        return { success: false, error: `Element not found with selector: ${selector}` };
                                    }
                                    // Scroll element into view
                                    element.scrollIntoView({ behavior: 'auto', block: 'center' });
                                }
                                else if (position) {
                                    // Find element at position
                                    element = document.elementFromPoint(position.x, position.y);
                                    if (!element) {
                                        return { success: false, error: `No element found at position (${position.x}, ${position.y})` };
                                    }
                                }
                                if (!element) {
                                    return { success: false, error: 'No element to click' };
                                }
                                // Create and dispatch click events
                                const clickEvent = new MouseEvent('click', {
                                    view: window,
                                    bubbles: true,
                                    cancelable: true,
                                    clientX: position?.x || 0,
                                    clientY: position?.y || 0
                                });
                                element.dispatchEvent(clickEvent);
                                return { success: true, message: 'Click executed successfully' };
                            }
                            catch (error) {
                                return {
                                    success: false,
                                    error: `Error clicking element: ${error instanceof Error ? error.message : String(error)}`
                                };
                            }
                        },
                        args: [selector || null, position || null]
                    });
                    if (!results || results.length === 0) {
                        sendResponse({
                            success: false,
                            error: 'No result from script execution'
                        });
                        return;
                    }
                    // Return the result
                    sendResponse(results[0].result);
                }
                catch (error) {
                    console.error('Error processing click request:', error);
                    sendResponse({
                        success: false,
                        error: `Error processing click request: ${error instanceof Error ? error.message : String(error)}`
                    });
                }
            })();
            return true; // Will respond asynchronously
        case 'TYPE':
            (async () => {
                try {
                    console.log('Type request for selector:', message.payload?.selector);
                    // Get the active tab
                    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
                    if (!tabs || tabs.length === 0 || !tabs[0].id) {
                        sendResponse({
                            success: false,
                            error: 'No active tab found'
                        });
                        return;
                    }
                    // Execute script in the tab to type text
                    const tabId = tabs[0].id;
                    const selector = message.payload?.selector;
                    const text = message.payload?.text;
                    if (!selector) {
                        sendResponse({
                            success: false,
                            error: 'No selector provided'
                        });
                        return;
                    }
                    if (text === undefined || text === null) {
                        sendResponse({
                            success: false,
                            error: 'No text provided'
                        });
                        return;
                    }
                    const results = await chrome.scripting.executeScript({
                        target: { tabId },
                        func: (selector, text) => {
                            try {
                                const element = document.querySelector(selector);
                                if (!element) {
                                    return { success: false, error: `Element not found with selector: ${selector}` };
                                }
                                // Scroll element into view
                                element.scrollIntoView({ behavior: 'auto', block: 'center' });
                                // Focus the element
                                element.focus();
                                // Handle different types of elements
                                if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
                                    // For standard form elements
                                    element.value = text;
                                    // Trigger input and change events
                                    element.dispatchEvent(new Event('input', { bubbles: true }));
                                    element.dispatchEvent(new Event('change', { bubbles: true }));
                                }
                                else if (element.isContentEditable) {
                                    // For contentEditable elements
                                    element.textContent = text;
                                    // Trigger input event for React and other frameworks
                                    element.dispatchEvent(new InputEvent('input', { bubbles: true }));
                                }
                                else {
                                    return {
                                        success: false,
                                        error: 'Element is not an input, textarea, or contentEditable element'
                                    };
                                }
                                return { success: true, message: 'Text typed successfully' };
                            }
                            catch (error) {
                                return {
                                    success: false,
                                    error: `Error typing text: ${error instanceof Error ? error.message : String(error)}`
                                };
                            }
                        },
                        args: [selector, text]
                    });
                    if (!results || results.length === 0) {
                        sendResponse({
                            success: false,
                            error: 'No result from script execution'
                        });
                        return;
                    }
                    // Return the result
                    sendResponse(results[0].result);
                }
                catch (error) {
                    console.error('Error processing type request:', error);
                    sendResponse({
                        success: false,
                        error: `Error processing type request: ${error instanceof Error ? error.message : String(error)}`
                    });
                }
            })();
            return true; // Will respond asynchronously
        case 'GET_ELEMENT':
            (async () => {
                try {
                    console.log('GetElement request for selector:', message.payload?.selector);
                    // Get the active tab
                    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
                    if (!tabs || tabs.length === 0 || !tabs[0].id) {
                        sendResponse({
                            success: false,
                            error: 'No active tab found'
                        });
                        return;
                    }
                    // Execute script in the tab to get element information
                    const tabId = tabs[0].id;
                    const selector = message.payload?.selector;
                    const limit = message.payload?.limit || 10;
                    if (!selector) {
                        sendResponse({
                            success: false,
                            error: 'No selector provided'
                        });
                        return;
                    }
                    chrome.tabs.executeScript(tabId, {
                        code: `
                (function() {
                  try {
                    const elements = Array.from(document.querySelectorAll('${selector.replace(/'/g, "\\'")}'));
                    if (!elements || elements.length === 0) {
                      return { 
                        success: false, 
                        error: 'No elements found with selector: ${selector.replace(/'/g, "\\'")}' 
                      };
                    }
                    
                    const limit = ${limit};
                    const limitedElements = elements.slice(0, limit);
                    
                    const elementInfos = limitedElements.map(element => {
                      // Get all attributes as key-value pairs
                      const attributesObj = {};
                      for (const attr of element.attributes) {
                        attributesObj[attr.name] = attr.value;
                      }
                      
                      // Check if element is visible
                      const style = window.getComputedStyle(element);
                      const isVisible = style.display !== 'none' && 
                                       style.visibility !== 'hidden' && 
                                       style.opacity !== '0';
                      
                      // Check if element is enabled (for form controls)
                      let isEnabled = true;
                      if (element instanceof HTMLButtonElement || 
                          element instanceof HTMLInputElement || 
                          element instanceof HTMLSelectElement || 
                          element instanceof HTMLTextAreaElement || 
                          element instanceof HTMLOptionElement) {
                        isEnabled = !element.disabled;
                      }
                      
                      // Get bounding client rect
                      const rect = element.getBoundingClientRect();
                      const boundingRect = {
                        top: rect.top,
                        right: rect.right,
                        bottom: rect.bottom,
                        left: rect.left,
                        width: rect.width,
                        height: rect.height
                      };
                      
                      // Get element value if applicable
                      let value = undefined;
                      if (element instanceof HTMLInputElement || 
                          element instanceof HTMLTextAreaElement || 
                          element instanceof HTMLSelectElement) {
                        value = element.value;
                      }
                      
                      return {
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
                    });
                    
                    return { 
                      success: true, 
                      elements: elementInfos,
                      count: elements.length
                    };
                  } catch (error) {
                    return { 
                      success: false, 
                      error: 'Error getting element information: ' + (error.message || String(error))
                    };
                  }
                })();
              `
                    }, (results) => {
                        if (chrome.runtime.lastError) {
                            sendResponse({
                                success: false,
                                error: chrome.runtime.lastError.message || 'Error executing script in tab'
                            });
                            return;
                        }
                        if (!results || results.length === 0) {
                            sendResponse({
                                success: false,
                                error: 'No result from tab script execution'
                            });
                            return;
                        }
                        // Return the result
                        sendResponse(results[0]);
                    });
                }
                catch (error) {
                    console.error('Error processing getElement request:', error);
                    sendResponse({
                        success: false,
                        error: `Error processing getElement request: ${error instanceof Error ? error.message : String(error)}`
                    });
                }
            })();
            return true; // Will respond asynchronously
        default:
            console.log('Unhandled message type:', message.type);
            sendResponse({ success: false, error: `Unhandled message type: ${message.type}` });
            break;
    }
});
// Listen for side panel connections
chrome.runtime.onConnect.addListener((port) => {
    if (port.name === 'sidepanel') {
        console.log('Side panel connected');
        port.onMessage.addListener(async (message) => {
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
                case 'PING':
                    // Handle ping messages from side panel
                    console.log('Received PING from side panel, responding with PONG');
                    port.postMessage({ type: 'PONG', timestamp: Date.now() });
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
async function handleChatMessage(message, port) {
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
            const response = await (0,_routes__WEBPACK_IMPORTED_MODULE_0__.handleChatRoute)(request);
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
                                    }
                                    catch (error) {
                                        console.warn('Error parsing SSE data:', error);
                                        // If parsing fails, ignore this line
                                    }
                                }
                            }
                        }
                    }
                    catch (error) {
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        console.error('Error reading stream:', errorMessage);
                        port.postMessage({
                            type: 'ERROR',
                            requestId,
                            error: errorMessage
                        });
                    }
                }
            }
            else {
                // Handle JSON response
                const data = await response.json();
                port.postMessage({
                    type: 'CHAT_RESPONSE',
                    requestId,
                    data
                });
            }
        }
        catch (error) {
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
    }
    catch (error) {
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
function generateFallbackResponse(query) {
    const keywords = {
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

})();

/******/ })()
;
//# sourceMappingURL=background.js.map