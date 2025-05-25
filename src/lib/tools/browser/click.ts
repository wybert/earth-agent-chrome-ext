/**
 * Click tool for browser automation
 * This tool clicks an element on the page using element reference from accessibility snapshot
 * Matches the playwright-mcp implementation exactly
 * 
 * @returns Promise with success status and result message
 */

import { detectEnvironment } from '@/lib/utils';

export interface ClickResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface ClickParams {
  element: string; // Human-readable element description used to obtain permission to interact with the element
  ref: string; // Exact target element reference from the page snapshot
}

/**
 * Perform click on a web page using element reference from accessibility snapshot
 * 
 * @param params.element Human-readable element description
 * @param params.ref Exact target element reference from the page snapshot
 * @returns Promise with success status and result message/error
 */
export async function click(params: ClickParams): Promise<ClickResponse> {
  const { element, ref } = params;

  if (!element || !ref) {
    return {
      success: false,
      error: 'Both element description and ref are required'
    };
  }

  // Pre-check for MV3 Service Worker (background script) environment.
  // This is where `detectEnvironment` might fail if it unsafely access `window`.
  const isWindowUndefined = typeof window === 'undefined';
  const isSelfDefined = typeof self !== 'undefined';
  const isChromeDefined = typeof chrome !== 'undefined';
  const hasChromeRuntimeId = isChromeDefined && chrome.runtime?.id;
  const hasChromeTabs = isChromeDefined && !!chrome.tabs; // Use !! to ensure boolean
  const hasChromeScripting = isChromeDefined && !!chrome.scripting; // Use !! to ensure boolean

  if (isWindowUndefined && isSelfDefined && isChromeDefined && hasChromeRuntimeId && hasChromeTabs && hasChromeScripting) {
    console.log('[Click Tool] Detected direct execution in background service worker. Routing to handleBackgroundScriptClick.');
    return await handleBackgroundScriptClick(params);
  } else if (isWindowUndefined) {
    // If window is undefined, we are likely in a service worker, but the full pre-check failed. Log why.
    console.warn('[Click Tool] Service Worker Pre-check FAILED. This means detectEnvironment() will be called, which may cause "window is not defined". Conditions:');
    console.warn(`  - isWindowUndefined: ${isWindowUndefined} (Expected: true)`);
    console.warn(`  - isSelfDefined: ${isSelfDefined} (Expected: true)`);
    console.warn(`  - isChromeDefined: ${isChromeDefined} (Expected: true)`);
    console.warn(`  - hasChromeRuntimeId: ${hasChromeRuntimeId} (Expected: true)`);
    console.warn(`  - hasChromeTabs: ${hasChromeTabs} (Expected: true - Check "tabs" permission in manifest.json)`);
    console.warn(`  - hasChromeScripting: ${hasChromeScripting} (Expected: true - Check "scripting" permission in manifest.json)`);
    // Falling through to detectEnvironment(), which is likely to throw the "window is not defined" error.
    // The logs above should help identify why this pre-check failed.
  }

  // If not in an MV3 service worker (or the check above was inconclusive),
  // proceed with the standard environment detection.
  try {
    // Detect environment and handle accordingly
    const env = detectEnvironment();
    // This log will appear if not in a service worker, OR if the pre-check failed but detectEnvironment() somehow succeeded.
    console.log('[Click Tool] detectEnvironment() call. Result:', env);
    
    // If we're in the background script directly being called from the message handler,
    // (e.g. MV2 background page, or if detectEnvironment is robust for MV3)
    if (env.isBackground && typeof chrome !== 'undefined' && chrome.tabs) {
      console.log('[Click Tool] Running in background script context (identified by detectEnvironment).');
      return await handleBackgroundScriptClick(params);
    }
    
    // If running in a content script or sidepanel context, use the background script
    if (env.useBackgroundProxy && typeof chrome !== 'undefined' && chrome.runtime) {
      console.log('[Click Tool] Using background script proxy for click operation');
      return new Promise<ClickResponse>((resolve) => {
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
              type: 'CLICK',
              payload: { element, ref }
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
    
    // If running directly in page context (content script)
    if (env.isContentScript && typeof document !== 'undefined') {
      console.log('[Click Tool] Running directly in content script context');
      try {
        // Function to find element recursively in document and shadow DOMs
        const findElementInShadowDomDirect = (currentRoot: Document | ShadowRoot, refValue: string): Element | null => {
          console.log(`[Content Script - Click Direct] Searching for ref: "${refValue}" in root:`, currentRoot);
          console.log(`[Content Script - Click Direct] Root type: ${currentRoot instanceof Document ? 'Document' : 'ShadowRoot'}`);
          
          // If currentRoot is a ShadowRoot, log its host
          if ('host' in currentRoot) {
            console.log(`[Content Script - Click Direct] Current root is a ShadowRoot. Host element:`, currentRoot.host);
            console.log(`[Content Script - Click Direct] Host tag name: ${currentRoot.host.tagName}`);
            console.log(`[Content Script - Click Direct] Host id: ${currentRoot.host.id || 'none'}`);
            console.log(`[Content Script - Click Direct] Host class: ${currentRoot.host.className || 'none'}`);
          }
          
          // Log the query we're about to run
          console.log(`[Content Script - Click Direct] Running querySelector for '[aria-ref="${refValue}"]'`);
          
          try {
            const foundElement = currentRoot.querySelector(`[aria-ref="${refValue}"]`);
            console.log(`[Content Script - Click Direct] Direct query result for "${refValue}":`, foundElement);
            
            // If we found an element, log more details about it
            if (foundElement) {
              console.log(`[Content Script - Click Direct] Found element tag: ${foundElement.tagName}`);
              console.log(`[Content Script - Click Direct] Found element outerHTML:`, foundElement.outerHTML);
              return foundElement;
            }
          } catch (error) {
            console.error(`[Content Script - Click Direct] Error in querySelector:`, error);
          }
          
          // Search in all open shadow roots within the current root
          console.log(`[Content Script - Click Direct] Element not found directly, searching in shadow roots...`);
          let shadowHosts;
          try {
            shadowHosts = currentRoot.querySelectorAll('*');
            console.log(`[Content Script - Click Direct] Found ${shadowHosts.length} potential shadow hosts in current root for "${refValue}".`);
          } catch (error) {
            console.error(`[Content Script - Click Direct] Error querying for shadow hosts:`, error);
            return null;
          }
          
          // Log the first few hosts for debugging
          if (shadowHosts.length > 0) {
            console.log(`[Content Script - Click Direct] First 5 potential hosts:`, 
              Array.from(shadowHosts).slice(0, 5).map(h => ({
                tag: h.tagName,
                id: h.id || 'none',
                class: h.className || 'none',
                hasShadow: !!h.shadowRoot
              }))
            );
          }
          
          for (const host of Array.from(shadowHosts)) {
            if (host.shadowRoot && host.shadowRoot.mode === 'open') {
              console.log(`[Content Script - Click Direct] Checking shadow DOM of host:`, host);
              console.log(`[Content Script - Click Direct] Host tag: ${host.tagName}, id: ${host.id || 'none'}`);
              
              const elementInShadow = findElementInShadowDomDirect(host.shadowRoot, refValue);
              if (elementInShadow) {
                console.log(`[Content Script - Click Direct] ✅ Found element in shadow DOM of ${host.tagName}`);
                return elementInShadow;
              }
            }
          }
          
          console.log(`[Content Script - Click Direct] ❌ No element found with ref: "${refValue}" in this root or its shadow DOMs`);
          return null;
        };

        // Find element by aria-ref attribute (matches playwright-mcp locator pattern)
        console.log(`[Content Script - Click Direct] 🔎 Attempting to find element with ref: "${ref}" in document`, {
          documentURL: document.URL,
          documentTitle: document.title,
          documentReadyState: document.readyState
        });
        
        // Log some stats about the document to help debug
        console.log(`[Content Script - Click Direct] Document stats: ${document.querySelectorAll('*').length} elements, ${document.querySelectorAll('[aria-ref]').length} elements with aria-ref`);
        
        const targetElement = findElementInShadowDomDirect(document, ref);
        console.log(`[Content Script - Click Direct] Result of findElementInShadowDomDirect search for ref "${ref}":`, targetElement);
        
        if (!targetElement) {
          console.error(`[Content Script - Click Direct] ❌ Element not found with ref: "${ref}" in document or any shadow DOMs.`);
          
          // Log some data about existing aria-ref elements to help diagnose the issue
          try {
            const allAriaRefs = document.querySelectorAll('[aria-ref]');
            console.log(`[Content Script - Click Direct] Found ${allAriaRefs.length} elements with aria-ref attribute in document:`);
            
            if (allAriaRefs.length > 0) {
              console.log('[Content Script - Click Direct] List of available aria-ref values:');
              Array.from(allAriaRefs).slice(0, 20).forEach((el, idx) => {
                const elRef = el.getAttribute('aria-ref');
                console.log(`${idx}: Element with aria-ref="${elRef}", tagName=${el.tagName}, id=${el.id || 'none'}`);
              });
            }
            
            // Try a close match search
            if (ref.length > 2) {
              console.log(`[Content Script - Click Direct] Searching for partial matches for ref "${ref}"...`);
              const partialMatches = Array.from(allAriaRefs).filter(el => {
                const attrValue = el.getAttribute('aria-ref');
                return attrValue && attrValue.includes(ref.slice(1));
              });
              
              if (partialMatches.length > 0) {
                console.log(`[Content Script - Click Direct] Found ${partialMatches.length} partial matches:`, 
                  partialMatches.map(el => ({
                    ref: el.getAttribute('aria-ref'),
                    tag: el.tagName,
                    id: el.id || 'none'
                  }))
                );
              }
            }
          } catch (err) {
            console.error('[Content Script - Click Direct] Error while logging available aria-refs:', err);
          }
          
          return {
            success: false,
            error: `Element not found with ref: ${ref}`
          };
        }
        console.log(`[Content Script - Click Direct] ✅ Found element for ref "${ref}":`, targetElement);
        console.log(`[Content Script - Click Direct] Element details: tagName=${targetElement.tagName}, id=${targetElement.id || 'none'}, class=${targetElement.className || 'none'}`);
        console.log(`[Content Script - Click Direct] Element outerHTML:`, targetElement.outerHTML);

        // Ensure element is still connected to the DOM
        console.log(`[Content Script - Click Direct] Checking if element is connected to DOM. isConnected=${targetElement.isConnected}`);
        if (!targetElement.isConnected) {
          console.error(`[Content Script - Click Direct] Element with ref: ${ref} is detached from the DOM`);
          return {
            success: false,
            error: `Element with ref: ${ref} is detached from the DOM`
          };
        }
        console.log(`[Content Script - Click Direct] Element is connected to the DOM and ready for interaction`);
        
        // Scroll element into view
        console.log(`[Content Script - Click Direct] Scrolling element into view:`, targetElement);
        targetElement.scrollIntoView({ behavior: 'auto', block: 'center' });
        
        // Get element's bounding rect for click coordinates
        const rect = targetElement.getBoundingClientRect();
        console.log(`[Content Script - Click Direct] Element bounding rect:`, {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height
        });
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        console.log(`[Content Script - Click Direct] Calculated click coordinates: (${centerX}, ${centerY})`);
        
        // Create and dispatch click events (matching playwright behavior)
        const mouseDownEvent = new MouseEvent('mousedown', {
          view: window,
          bubbles: true,
          cancelable: true,
          clientX: centerX,
          clientY: centerY,
          button: 0
        });
        
        const mouseUpEvent = new MouseEvent('mouseup', {
          view: window,
          bubbles: true,
          cancelable: true,
          clientX: centerX,
          clientY: centerY,
          button: 0
        });
        
        const clickEvent = new MouseEvent('click', {
          view: window,
          bubbles: true,
          cancelable: true,
          clientX: centerX,
          clientY: centerY,
          button: 0
        });
        
        // Dispatch events in order (mousedown -> mouseup -> click)
        console.log(`[Content Script - Click Direct] Dispatching mousedown event at coordinates (${centerX}, ${centerY})`);
        const mouseDownResult = targetElement.dispatchEvent(mouseDownEvent);
        console.log(`[Content Script - Click Direct] mousedown event dispatched, cancelled: ${!mouseDownResult}`);
        
        console.log(`[Content Script - Click Direct] Dispatching mouseup event at coordinates (${centerX}, ${centerY})`);
        const mouseUpResult = targetElement.dispatchEvent(mouseUpEvent);
        console.log(`[Content Script - Click Direct] mouseup event dispatched, cancelled: ${!mouseUpResult}`);
        
        console.log(`[Content Script - Click Direct] Dispatching click event at coordinates (${centerX}, ${centerY})`);
        const clickResult = targetElement.dispatchEvent(clickEvent);
        console.log(`[Content Script - Click Direct] click event dispatched, cancelled: ${!clickResult}`);
        
        // Also trigger native click for form elements and links
        if (targetElement instanceof HTMLElement) {
          console.log(`[Content Script - Click Direct] Calling native click() method on HTMLElement:`, targetElement);
          targetElement.click();
        }
        console.log(`[Content Script - Click Direct] Click sequence completed for element with ref: "${ref}"`);
        return {
          success: true,
          message: `Click executed successfully on ${element}`
        };
      } catch (error) {
        console.error(`[Content Script - Click Direct] Error clicking element with ref "${ref}":`, error);
        return {
          success: false,
          error: `Error clicking element: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    }

    // If this code is reached, it means the function was called in an unexpected context,
    // or detectEnvironment returned an unhandled combination.
    console.warn('[Click Tool] Unsupported environment or unhandled case after environment detection.');
    return {
      success: false,
      error: 'Click operation is not supported in this environment or unhandled case.'
    };
  } catch (error) {
    console.error('[Click Tool] Unexpected error in click function (after service worker pre-check):', error);
    return {
      success: false,
      error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Handles click operations when running in background script context
 */
async function handleBackgroundScriptClick(params: ClickParams): Promise<ClickResponse> {
  const { element, ref } = params;
  
  if (!element || !ref) {
    return {
      success: false,
      error: 'Both element description and ref are required'
    };
  }
  
  console.log('[Click Tool - Background] Entered background execution path.');
  return new Promise<ClickResponse>((resolve) => {
    console.log('[Click Tool - Background] Querying for active tab...');
    // Get the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      console.log('[Click Tool - Background] chrome.tabs.query callback executed.');
      if (chrome.runtime.lastError) { // Check for error in tabs.query
        console.error('[Click Tool - Background] Error in chrome.tabs.query:', chrome.runtime.lastError.message);
        resolve({ success: false, error: `Error querying tabs: ${chrome.runtime.lastError.message}` });
        return;
      }
      
      if (!tabs || tabs.length === 0) {
        console.error('[Click Tool - Background] No active tab found.');
        resolve({
          success: false,
          error: 'No active tab found'
        });
        return;
      }
      console.log(`[Click Tool - Background] Active tab found: Tab ID ${tabs[0].id}, URL: ${tabs[0].url}`);

      const tabId = tabs[0].id;
      if (!tabId) {
        console.error('[Click Tool - Background] Invalid tab ID.');
        resolve({
          success: false,
          error: 'Invalid tab'
        });
        return;
      }

      console.log(`[Click Tool - Background] Attempting to execute script in Tab ID: ${tabId}`);
      // Execute script in the tab to click element by reference
      chrome.scripting.executeScript({
        target: { tabId },
        func: (elementDescription: string, ref: string) => {
          console.log(`!!! INJECTED SCRIPT HAS STARTED - Ref: ${ref} !!!`);
          try {
            // Function to find element recursively in document and shadow DOMs
            const findElementInShadowDom = (currentRoot: Document | ShadowRoot, refValue: string): Element | null => {
              console.log(`[Content Script - findElementInShadowDom] Searching for ref: "${refValue}" in root:`, currentRoot);
              console.log(`[Content Script - findElementInShadowDom] Root type: ${currentRoot instanceof Document ? 'Document' : 'ShadowRoot'}`);
              
              // If currentRoot is a ShadowRoot, log its host
              if ('host' in currentRoot) {
                console.log(`[Content Script - findElementInShadowDom] Current root is a ShadowRoot. Host element:`, currentRoot.host);
                console.log(`[Content Script - findElementInShadowDom] Host tag name: ${currentRoot.host.tagName}`);
                console.log(`[Content Script - findElementInShadowDom] Host id: ${currentRoot.host.id || 'none'}`);
                console.log(`[Content Script - findElementInShadowDom] Host class: ${currentRoot.host.className || 'none'}`);
              }
              
              // Log the query we're about to run
              console.log(`[Content Script - findElementInShadowDom] Running querySelector for '[aria-ref="${refValue}"]'`);
              
              try {
                const foundElement = currentRoot.querySelector(`[aria-ref="${refValue}"]`);
                console.log(`[Content Script - findElementInShadowDom] Direct query result for "${refValue}":`, foundElement);
                
                // If we found an element, log more details about it
                if (foundElement) {
                  console.log(`[Content Script - findElementInShadowDom] Found element tag: ${foundElement.tagName}`);
                  console.log(`[Content Script - findElementInShadowDom] Found element outerHTML:`, foundElement.outerHTML);
                  return foundElement;
                }
              } catch (error) {
                console.error(`[Content Script - findElementInShadowDom] Error in querySelector:`, error);
              }
              
              // Search in all open shadow roots within the current root
              console.log(`[Content Script - findElementInShadowDom] Element not found directly, searching in shadow roots...`);
              let shadowHosts;
              try {
                shadowHosts = currentRoot.querySelectorAll('*');
                console.log(`[Content Script - findElementInShadowDom] Found ${shadowHosts.length} potential shadow hosts in current root for "${refValue}".`);
              } catch (error) {
                console.error(`[Content Script - findElementInShadowDom] Error querying for shadow hosts:`, error);
                return null;
              }
              
              // Log the first few hosts for debugging
              if (shadowHosts.length > 0) {
                console.log(`[Content Script - findElementInShadowDom] First 5 potential hosts:`, 
                  Array.from(shadowHosts).slice(0, 5).map(h => ({
                    tag: h.tagName,
                    id: h.id || 'none',
                    class: h.className || 'none',
                    hasShadow: !!h.shadowRoot
                  }))
                );
              }
              
              for (const host of Array.from(shadowHosts)) {
                if (host.shadowRoot && host.shadowRoot.mode === 'open') {
                  console.log(`[Content Script - findElementInShadowDom] Checking shadow DOM of host:`, host);
                  console.log(`[Content Script - findElementInShadowDom] Host tag: ${host.tagName}, id: ${host.id || 'none'}`);
                  
                  const elementInShadow = findElementInShadowDom(host.shadowRoot, refValue);
                  if (elementInShadow) {
                    console.log(`[Content Script - findElementInShadowDom] ✅ Found element in shadow DOM of ${host.tagName}`);
                    return elementInShadow;
                  }
                }
              }
              
              console.log(`[Content Script - findElementInShadowDom] ❌ No element found with ref: "${refValue}" in this root or its shadow DOMs`);
              return null;
            };

            // Find element by aria-ref attribute (matches playwright-mcp locator pattern)
            console.log(`[Content Script - Click] 🔎 Attempting to find element with ref: "${ref}" in document`, {
              documentURL: document.URL,
              documentTitle: document.title,
              documentReadyState: document.readyState
            });
            
            // Log some stats about the document to help debug
            console.log(`[Content Script - Click] Document stats: ${document.querySelectorAll('*').length} elements, ${document.querySelectorAll('[aria-ref]').length} elements with aria-ref`);
            
            const element = findElementInShadowDom(document, ref);
            console.log(`[Content Script - Click] Result of findElementInShadowDom search for ref "${ref}":`, element);
            
            if (!element) {
              console.error(`[Content Script - Click] ❌ Element not found with ref: "${ref}" in document or any shadow DOMs.`);
              
              // Log some data about existing aria-ref elements to help diagnose the issue
              try {
                const allAriaRefs = document.querySelectorAll('[aria-ref]');
                console.log(`[Content Script - Click] Found ${allAriaRefs.length} elements with aria-ref attribute in document:`);
                
                if (allAriaRefs.length > 0) {
                  console.log('[Content Script - Click] List of available aria-ref values:');
                  Array.from(allAriaRefs).slice(0, 20).forEach((el, idx) => {
                    const elRef = el.getAttribute('aria-ref');
                    console.log(`${idx}: Element with aria-ref="${elRef}", tagName=${el.tagName}, id=${el.id || 'none'}`);
                  });
                }
                
                // Try a close match search
                if (ref.length > 2) {
                  console.log(`[Content Script - Click] Searching for partial matches for ref "${ref}"...`);
                  const partialMatches = Array.from(allAriaRefs).filter(el => {
                    const attrValue = el.getAttribute('aria-ref');
                    return attrValue && attrValue.includes(ref.slice(1));
                  });
                  
                  if (partialMatches.length > 0) {
                    console.log(`[Content Script - Click] Found ${partialMatches.length} partial matches:`, 
                      partialMatches.map(el => ({
                        ref: el.getAttribute('aria-ref'),
                        tag: el.tagName,
                        id: el.id || 'none'
                      }))
                    );
                  }
                }
              } catch (err) {
                console.error('[Content Script - Click] Error while logging available aria-refs:', err);
              }
              
              return { 
                success: false, 
                error: `Element not found with ref: ${ref}` 
              };
            }
            console.log(`[Content Script - Click] ✅ Found element for ref "${ref}":`, element);
            console.log(`[Content Script - Click] Element details: tagName=${element.tagName}, id=${element.id || 'none'}, class=${element.className || 'none'}`);
            console.log(`[Content Script - Click] Element outerHTML:`, element.outerHTML);

            // Ensure element is still connected to the DOM
            console.log(`[Content Script - Click] Checking if element is connected to DOM. isConnected=${element.isConnected}`);
            if (!element.isConnected) {
              console.error(`[Content Script - Click] Element with ref: ${ref} is detached from the DOM`);
              return {
                success: false,
                error: `Element with ref: ${ref} is detached from the DOM`
              };
            }
            console.log(`[Content Script - Click] Element is connected to the DOM and ready for interaction`);
            
            // Scroll element into view
            console.log(`[Content Script - Click] Scrolling element into view:`, element);
            element.scrollIntoView({ behavior: 'auto', block: 'center' });
            
            // Get element's bounding rect for click coordinates
            const rect = element.getBoundingClientRect();
            console.log(`[Content Script - Click] Element bounding rect:`, {
              left: rect.left,
              top: rect.top,
              width: rect.width,
              height: rect.height
            });
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            console.log(`[Content Script - Click] Calculated click coordinates: (${centerX}, ${centerY})`);
            
            // Create and dispatch click events (matching playwright behavior)
            const mouseDownEvent = new MouseEvent('mousedown', {
              view: window,
              bubbles: true,
              cancelable: true,
              clientX: centerX,
              clientY: centerY,
              button: 0
            });
            
            const mouseUpEvent = new MouseEvent('mouseup', {
              view: window,
              bubbles: true,
              cancelable: true,
              clientX: centerX,
              clientY: centerY,
              button: 0
            });
            
            const clickEvent = new MouseEvent('click', {
              view: window,
              bubbles: true,
              cancelable: true,
              clientX: centerX,
              clientY: centerY,
              button: 0
            });
            
            // Dispatch events in order (mousedown -> mouseup -> click)
            console.log(`[Content Script - Click] Dispatching mousedown event at coordinates (${centerX}, ${centerY})`);
            const mouseDownResult = element.dispatchEvent(mouseDownEvent);
            console.log(`[Content Script - Click] mousedown event dispatched, cancelled: ${!mouseDownResult}`);
            
            console.log(`[Content Script - Click] Dispatching mouseup event at coordinates (${centerX}, ${centerY})`);
            const mouseUpResult = element.dispatchEvent(mouseUpEvent);
            console.log(`[Content Script - Click] mouseup event dispatched, cancelled: ${!mouseUpResult}`);
            
            console.log(`[Content Script - Click] Dispatching click event at coordinates (${centerX}, ${centerY})`);
            const clickResult = element.dispatchEvent(clickEvent);
            console.log(`[Content Script - Click] click event dispatched, cancelled: ${!clickResult}`);
            
            // Also trigger native click for form elements and links
            if (element instanceof HTMLElement) {
              console.log(`[Content Script - Click] Calling native click() method on HTMLElement:`, element);
              element.click();
            }
            console.log(`[Content Script - Click] Click sequence completed for element with ref: "${ref}"`);
            return { 
              success: true, 
              message: `Click executed successfully on ${elementDescription}` 
            };
          } catch (error) {
            console.error(`[Content Script - Click] Error clicking element with ref "${ref}":`, error);
            return { 
              success: false, 
              error: `Error clicking element: ${error instanceof Error ? error.message : String(error)}`
            };
          }
        },
        args: [element, ref]
      }).then(results => {
        console.log('[Click Tool - Background] chrome.scripting.executeScript THEN block. Results:', JSON.stringify(results));
        if (chrome.runtime.lastError) {
            console.error('[Click Tool - Background] chrome.runtime.lastError after executeScript:', chrome.runtime.lastError.message);
            resolve({ success: false, error: `Runtime error after script execution: ${chrome.runtime.lastError.message}`});
            return;
        }
        
        if (!results || results.length === 0) {
          console.warn('[Click Tool - Background] No result from script execution.');
          resolve({
            success: false,
            error: 'No result from script execution (results array empty or null)'
          });
          return;
        }
        
        console.log('[Click Tool - Background] Script execution result item:', JSON.stringify(results[0]));
        const resultValue = results[0].result as ClickResponse;
        if (!resultValue.success && resultValue.error) {
            console.error('[Click Tool - Background] Error reported in script execution result:', resultValue.error);
            resolve({ success: false, error: `Error in injected script: ${resultValue.error}` });
            return;
        }
        
        // Return the result
        resolve(results[0].result as ClickResponse);
      }).catch(error => {
        console.error('[Click Tool - Background] chrome.scripting.executeScript CATCH block. Error:', error, JSON.stringify(error));
        resolve({
          success: false,
          error: `Error executing script: ${error instanceof Error ? error.message : String(error)}`
        });
      });
    });
    console.log('[Click Tool - Background] After calling chrome.tabs.query (async).');
  });
}

export default click;