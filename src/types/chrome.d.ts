/// <reference types="chrome"/>

declare namespace chrome {
  export = chrome;
}

// Chrome extension type definitions

// Extend Chrome Tab type to include lastAccessed property
declare namespace chrome.tabs {
  interface Tab {
    lastAccessed?: number;
  }
}

// Add FetchEvent interface for service workers
interface FetchEvent extends Event {
  request: Request;
  respondWith(response: Promise<Response> | Response): void;
}

declare var self: ServiceWorkerGlobalScope;

interface ServiceWorkerGlobalScope extends Window {
  addEventListener(type: 'fetch', callback: (event: FetchEvent) => void): void;
}

// File System Access API type declarations
interface FileSystemHandle {
  kind: 'file' | 'directory';
  name: string;
}

interface FileSystemFileHandle extends FileSystemHandle {
  kind: 'file';
  createWritable(): Promise<FileSystemWritableFileStream>;
}

interface FileSystemDirectoryHandle extends FileSystemHandle {
  kind: 'directory';
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>;
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FileSystemDirectoryHandle>;
}

interface FileSystemWritableFileStream extends WritableStream {
  write(data: BufferSource | Blob | string): Promise<void>;
  seek(position: number): Promise<void>;
  truncate(size: number): Promise<void>;
  close(): Promise<void>;
}

interface Window {
  showDirectoryPicker(): Promise<FileSystemDirectoryHandle>;
}