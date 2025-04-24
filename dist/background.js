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