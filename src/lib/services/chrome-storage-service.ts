/**
 * Chrome API Service Abstractions
 *
 * Provides Promise-wrapped Chrome APIs for:
 * - Better error handling
 * - Testability (can be mocked)
 * - Consistent async/await patterns
 */

export interface StorageService {
  get<T>(keys: string[]): Promise<Record<string, T>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(keys: string[]): Promise<void>;
}

export interface DownloadsService {
  download(options: chrome.downloads.DownloadOptions): Promise<number>;
}

export interface IdentityService {
  getAuthToken(options: { interactive: boolean; scopes: string[] }): Promise<string>;
}

export interface RuntimeService {
  connect(options: { name: string }): chrome.runtime.Port;
}

export interface ChromeServices {
  storage: StorageService;
  downloads: DownloadsService;
  identity: IdentityService;
  runtime: RuntimeService;
}

// Default timeout for Google Drive authentication (60 seconds)
const AUTH_TIMEOUT_MS = 60000;

/**
 * Factory function to create Chrome service implementations
 * Can be replaced with mocks for testing
 */
export function createChromeServices(): ChromeServices {
  return {
    storage: {
      get: <T>(keys: string[]) =>
        new Promise<Record<string, T>>((resolve, reject) => {
          chrome.storage.local.get(keys, (result) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(result as Record<string, T>);
            }
          });
        }),

      set: (items) =>
        new Promise((resolve, reject) => {
          chrome.storage.local.set(items, () => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve();
            }
          });
        }),

      remove: (keys) =>
        new Promise((resolve, reject) => {
          chrome.storage.local.remove(keys, () => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve();
            }
          });
        }),
    },

    downloads: {
      download: (options) =>
        new Promise((resolve, reject) => {
          chrome.downloads.download(options, (downloadId) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else if (downloadId === undefined) {
              reject(new Error('Download failed: no download ID returned'));
            } else {
              resolve(downloadId);
            }
          });
        }),
    },

    identity: {
      // Includes 60-second timeout to prevent hanging auth requests
      getAuthToken: (options) =>
        new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            reject(new Error('Google Drive authentication timed out after 60 seconds'));
          }, AUTH_TIMEOUT_MS);

          chrome.identity.getAuthToken(options, (token) => {
            clearTimeout(timeoutId);
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else if (token) {
              resolve(token);
            } else {
              reject(new Error('No access token received'));
            }
          });
        }),
    },

    runtime: {
      connect: (options) => chrome.runtime.connect(options),
    },
  };
}

// Default instance for production use
export const chromeServices = createChromeServices();
