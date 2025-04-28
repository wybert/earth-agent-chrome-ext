/**
 * Snapshot tool for browser automation
 * This tool captures the current state of the page including URL, title, and accessibility tree
 * 
 * @returns Promise with success status and snapshot data
 */

import { detectEnvironment } from '@/lib/utils';

export interface SnapshotResponse {
  success: boolean;
  message?: string;
  error?: string;
  url?: string;
  title?: string;
  snapshot?: string;
}

/**
 * Capture a snapshot of the current page state
 * @returns Promise with success status and snapshot data
 */
export async function snapshot(): Promise<SnapshotResponse> {
  try {
    // Detect environment and handle accordingly
    const env = detectEnvironment();

    // If running in a content script or sidepanel context, use the background script
    if (env.useBackgroundProxy && typeof chrome !== 'undefined' && chrome.runtime) {
      return new Promise<SnapshotResponse>((resolve) => {
        // Add a timeout to handle cases where background script doesn't respond
        const timeoutId = setTimeout(() => {
          console.warn('Background script connection timed out.');
          resolve({
            success: false,
            error: 'Background script connection timed out'
          });
        }, 5000); // 5 second timeout

        try {
          chrome.runtime.sendMessage(
            {
              type: 'SNAPSHOT'
            },
            (response) => {
              // Clear the timeout since we got a response
              clearTimeout(timeoutId);

              if (chrome.runtime.lastError) {
                console.warn('Chrome runtime error:', chrome.runtime.lastError);
                resolve({
                  success: false,
                  error: chrome.runtime.lastError.message || 'Error communicating with background script'
                });
                return;
              }

              // We got a valid response from the background
              resolve(response);
            }
          );
        } catch (err) {
          // Clear the timeout
          clearTimeout(timeoutId);
          console.error('Error sending message to background script:', err);
          resolve({
            success: false,
            error: err instanceof Error ? err.message : String(err)
          });
        }
      });
    }

    // If running in the background script
    if (env.isBackground && typeof chrome !== 'undefined' && chrome.tabs) {
      return new Promise<SnapshotResponse>((resolve) => {
        // Get the active tab
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (!tabs || tabs.length === 0) {
            resolve({
              success: false,
              error: 'No active tab found'
            });
            return;
          }

          const tabId = tabs[0].id;
          if (!tabId) {
            resolve({
              success: false,
              error: 'Invalid tab'
            });
            return;
          }

          // Get tab info
          const url = tabs[0].url;
          const title = tabs[0].title;

          // Execute script in the tab to capture accessibility tree
          chrome.scripting.executeScript({
            target: { tabId },
            func: () => {
              try {
                // Helper function to process a node
                function processNode(node: Element): any {
                  const result: any = {
                    tag: node.tagName.toLowerCase(),
                    role: node.getAttribute('role'),
                    text: node.textContent?.trim()
                  };

                  // Add relevant ARIA attributes
                  for (const attr of node.attributes) {
                    if (attr.name.startsWith('aria-')) {
                      result[attr.name] = attr.value;
                    }
                  }

                  // Process children
                  const children = Array.from(node.children).map(processNode);
                  if (children.length > 0) {
                    result.children = children;
                  }

                  return result;
                }

                // Start from body and process the tree
                const tree = processNode(document.body);
                return { tree };
              } catch (error) {
                return { 
                  error: `Error capturing snapshot: ${error instanceof Error ? error.message : String(error)}`
                };
              }
            }
          }).then(results => {
            if (!results || results.length === 0) {
              resolve({
                success: false,
                error: 'No result from script execution'
              });
              return;
            }

            const result = results[0].result as { tree: any } | { error: string };
            if ('error' in result) {
              resolve({
                success: false,
                error: result.error
              });
              return;
            }

            resolve({
              success: true,
              url,
              title,
              snapshot: JSON.stringify(result.tree, null, 2),
              message: 'Snapshot captured successfully'
            });
          }).catch(error => {
            resolve({
              success: false,
              error: `Error executing script: ${error instanceof Error ? error.message : String(error)}`
            });
          });
        });
      });
    }

    // If running directly in page context (content script)
    if (env.isContentScript && typeof document !== 'undefined') {
      try {
        // Helper function to process a node
        function processNode(node: Element): any {
          const result: any = {
            tag: node.tagName.toLowerCase(),
            role: node.getAttribute('role'),
            text: node.textContent?.trim()
          };

          // Add relevant ARIA attributes
          for (const attr of node.attributes) {
            if (attr.name.startsWith('aria-')) {
              result[attr.name] = attr.value;
            }
          }

          // Process children
          const children = Array.from(node.children).map(processNode);
          if (children.length > 0) {
            result.children = children;
          }

          return result;
        }

        // Start from body and process the tree
        const tree = processNode(document.body);

        return {
          success: true,
          url: window.location.href,
          title: document.title,
          snapshot: JSON.stringify(tree, null, 2),
          message: 'Snapshot captured successfully'
        };
      } catch (error) {
        return {
          success: false,
          error: `Error capturing snapshot: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    }

    // If running in Node.js or unsupported environment
    return {
      success: false,
      error: 'Snapshot operation is not supported in this environment'
    };
  } catch (error) {
    return {
      success: false,
      error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export default snapshot; 