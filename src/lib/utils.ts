import { ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Detects the current execution environment
 * @returns Information about the current environment
 */
export function detectEnvironment() {
  const isBackground = typeof chrome !== 'undefined' &&
                       chrome.runtime &&
                       typeof chrome.runtime.getManifest === 'function' &&
                       (chrome.extension?.getBackgroundPage?.() === window);

  const isExtension = typeof chrome !== 'undefined' &&
                      chrome.runtime &&
                      !!chrome.runtime.id;

  const isContentScript = isExtension &&
                         !isBackground &&
                         typeof document !== 'undefined';

  const isSidepanel = isExtension &&
                     !isBackground &&
                     typeof document !== 'undefined' &&
                     window.location.pathname.includes('sidepanel.html');

  const isNodeJs = typeof window === 'undefined' &&
                  typeof process !== 'undefined' &&
                  !!process.versions &&
                  !!process.versions.node;

  return {
    isBackground,
    isContentScript,
    isSidepanel,
    isExtension,
    isNodeJs,
    useBackgroundProxy: (isContentScript || isSidepanel) && !isBackground
  };
}

// ============ AI Tools Helper Functions ============

/**
 * Smart tab selection: Chooses the most relevant GEE tab from multiple options
 * Priority:
 * 1. Active tab in current window
 * 2. Any active tab
 * 3. Most recently accessed tab
 * 4. First tab
 */
export function selectBestEarthEngineTab(tabs: chrome.tabs.Tab[]): chrome.tabs.Tab | null {
  if (tabs.length === 0) return null;
  if (tabs.length === 1) return tabs[0];

  console.log(`🔍 [Tab Selection] Found ${tabs.length} GEE tabs, selecting the best one...`);

  // 1. Try to find active tab in current window
  const activeInCurrentWindow = tabs.find(tab => tab.active && tab.windowId);
  if (activeInCurrentWindow) {
    console.log(`✅ [Tab Selection] Selected active tab in current window: ${activeInCurrentWindow.id}`);
    return activeInCurrentWindow;
  }

  // 2. Try to find any active tab
  const anyActive = tabs.find(tab => tab.active);
  if (anyActive) {
    console.log(`✅ [Tab Selection] Selected active tab: ${anyActive.id}`);
    return anyActive;
  }

  // 3. Find most recently accessed tab
  const withLastAccessed = tabs.filter(tab => typeof tab.lastAccessed === 'number');
  if (withLastAccessed.length > 0) {
    const mostRecent = withLastAccessed.reduce((a, b) =>
      (a.lastAccessed || 0) > (b.lastAccessed || 0) ? a : b
    );
    console.log(`✅ [Tab Selection] Selected most recently accessed tab: ${mostRecent.id}`);
    return mostRecent;
  }

  // 4. Fallback to first tab
  console.log(`⚠️ [Tab Selection] Using first tab as fallback: ${tabs[0].id}`);
  return tabs[0];
}

/**
 * Ensures content script is loaded in the specified tab
 * Pings the content script first, and injects if not loaded
 */
export async function ensureContentScript(tabId: number): Promise<{success: boolean, error?: string}> {
  try {
    // Try to ping the content script
    await new Promise<void>((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, { type: 'PING' }, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
    console.log(`✅ [Content Script] Already loaded in tab ${tabId}`);
    return { success: true };
  } catch (pingError) {
    console.log(`📝 [Content Script] Not loaded in tab ${tabId}, injecting...`);

    // Content script not loaded, inject it
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js']
      });
      console.log(`✅ [Content Script] Injected successfully into tab ${tabId}`);

      // Wait for content script to initialize
      await new Promise(resolve => setTimeout(resolve, 500));
      return { success: true };
    } catch (injectError: any) {
      console.error(`❌ [Content Script] Failed to inject into tab ${tabId}:`, injectError);
      return {
        success: false,
        error: `Failed to inject content script: ${injectError?.message || 'Unknown error'}`
      };
    }
  }
}

/**
 * Validates that required Chrome APIs are available
 */
export function validateChromeAPIs(): {success: boolean, error?: string} {
  if (typeof chrome === 'undefined' || !chrome.tabs) {
    return {
      success: false,
      error: 'Chrome tabs API not available. Tool can only run in background script context.'
    };
  }

  if (!chrome.scripting) {
    return {
      success: false,
      error: 'Chrome scripting API not available. Requires Manifest V3.'
    };
  }

  return { success: true };
}

// ============ Resilient Fetch ============

type FetchInput = Parameters<typeof fetch>[0];

export interface ResilientFetchOptions {
  /** Maximum number of attempts for the same request. */
  maxAttempts?: number;
  /** Initial retry delay. Each retry doubles the delay (simple exponential backoff). */
  baseDelayMs?: number;
  /** Optional label to make console logs easier to track. */
  label?: string;
  /** Custom fetch implementation. Defaults to the global fetch. */
  fetchImpl?: typeof fetch;
  /** Custom retry predicate. */
  shouldRetryError?: (error: unknown) => boolean;
  /** Custom retry predicate for HTTP responses. */
  shouldRetryResponse?: (response: Response) => boolean;
}

const defaultShouldRetryError = (error: unknown): boolean => {
  if (!error) return false;
  if (error instanceof TypeError && error.message.toLowerCase().includes('fetch')) {
    return true;
  }
  if (error instanceof Error && /network/i.test(error.message)) {
    return true;
  }
  return false;
};

const defaultShouldRetryResponse = (response: Response): boolean => {
  if (response.status === 408) return true; // Request timeout
  if (response.status >= 500) return true; // Server side issues
  return false;
};

/**
 * Creates a resilient fetch function with automatic retry logic
 * Uses exponential backoff for retries on network errors and 5xx responses
 */
export function createResilientFetch(options: ResilientFetchOptions = {}): typeof fetch {
  const {
    maxAttempts = 3,
    baseDelayMs = 500,
    label = 'ResilientFetch',
    fetchImpl = fetch,
    shouldRetryError = defaultShouldRetryError,
    shouldRetryResponse = defaultShouldRetryResponse,
  } = options;

  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  return async function resilientFetch(input: FetchInput, init?: RequestInit): Promise<Response> {
    let attempt = 0;
    let lastError: unknown;

    while (attempt < maxAttempts) {
      attempt += 1;
      const preparedInput = input instanceof Request ? input.clone() : input;
      const preparedInit = cloneRequestInit(init);

      try {
        const response = await fetchImpl(preparedInput, preparedInit);
        if (response.ok || !shouldRetryResponse(response) || attempt >= maxAttempts) {
          return response;
        }

        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        console.warn(`⚠️ [${label}] HTTP ${response.status} on attempt ${attempt}/${maxAttempts}. Retrying in ${delay}ms.`);
        await wait(delay);
        continue;
      } catch (error) {
        lastError = error;
        if (!shouldRetryError(error) || attempt >= maxAttempts) {
          throw error;
        }

        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        console.warn(`⚠️ [${label}] Fetch failed on attempt ${attempt}/${maxAttempts}: ${error instanceof Error ? error.message : String(error)}. Retrying in ${delay}ms...`);
        await wait(delay);
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error(`[${label}] Fetch failed after ${maxAttempts} attempts`);
  };
}

function cloneRequestInit(init?: RequestInit): RequestInit | undefined {
  if (!init) return undefined;
  const cloned: RequestInit = { ...init };

  if (init.headers instanceof Headers) {
    cloned.headers = new Headers(init.headers);
  } else if (Array.isArray(init.headers)) {
    cloned.headers = [...init.headers];
  } else if (init.headers) {
    cloned.headers = { ...init.headers };
  }

  return cloned;
} 