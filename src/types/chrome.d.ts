/// <reference types="chrome"/>

declare namespace chrome {
  export = chrome;
}

// Chrome extension type definitions

// Add FetchEvent interface for service workers
interface FetchEvent extends Event {
  request: Request;
  respondWith(response: Promise<Response> | Response): void;
}

declare var self: ServiceWorkerGlobalScope;

interface ServiceWorkerGlobalScope extends Window {
  addEventListener(type: 'fetch', callback: (event: FetchEvent) => void): void;
}