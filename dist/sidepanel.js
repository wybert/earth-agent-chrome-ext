/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/*!********************************!*\
  !*** ./src/sidepanel/index.ts ***!
  \********************************/

class SidePanel {
    constructor() {
        this.contentElement = document.getElementById('content');
        this.initializePort();
        this.setupEventListeners();
    }
    initializePort() {
        // Connect to the background script
        this.port = chrome.runtime.connect({ name: 'sidepanel' });
        this.port.onMessage.addListener((message) => {
            console.log('Received message:', message);
            // Handle incoming messages
        });
        this.port.onDisconnect.addListener(() => {
            console.log('Disconnected from background script');
            // Handle disconnection (e.g., try to reconnect)
        });
    }
    setupEventListeners() {
        // Add event listeners for UI interactions here
        console.log('Setting up event listeners');
    }
    // Method to send messages to the background script
    sendMessage(message) {
        this.port.postMessage(message);
    }
}
// Initialize the side panel when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new SidePanel();
});

/******/ })()
;
//# sourceMappingURL=sidepanel.js.map