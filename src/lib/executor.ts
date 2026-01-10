import { ensureContentScript } from './utils';

export interface ExecutionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Execute a message in the content script with robust error handling and timeout.
 */
export async function executeInContentScript<T = unknown>(
  tabId: number,
  message: unknown,
  timeoutMs: number = 10000
): Promise<any> {
  // Using any for return to match flexible usage, but generic T for internal type safety if needed
  // Ensure content script is loaded
  const scriptReady = await ensureContentScript(tabId);
  if (!scriptReady.success) {
    return {
      success: false,
      error: scriptReady.error || 'Content script not available',
    };
  }

  // Send message
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({
        success: false,
        error: `Content script execution timed out after ${timeoutMs}ms`,
      });
    }, timeoutMs);

    chrome.tabs.sendMessage(tabId, message, (response) => {
      clearTimeout(timeout);
      if (chrome.runtime.lastError) {
        resolve({
          success: false,
          error: chrome.runtime.lastError.message || 'Error communicating with content script',
        });
      } else {
        resolve(response || { success: false, error: 'No response from content script' });
      }
    });
  });
}
