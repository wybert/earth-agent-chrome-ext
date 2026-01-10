import { executeInContentScript } from '../../executor';

export interface BrowserResult {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
}

export async function getMapPosition(tabId: number): Promise<BrowserResult> {
  const result = await executeInContentScript(tabId, { type: 'GET_MAP_INFO' });
  return result;
}

export async function clickAtPosition(tabId: number, x: number, y: number): Promise<BrowserResult> {
  const result = await executeInContentScript(tabId, {
    type: 'CLICK_BY_COORDINATES',
    payload: { x, y },
  });
  return result;
}

export async function clickByRefId(tabId: number, refId: string): Promise<BrowserResult> {
  const result = await executeInContentScript(tabId, {
    type: 'CLICK_BY_REF_ID',
    payload: { refId },
  });
  return result;
}

export async function captureSnapshot(tabId: number): Promise<BrowserResult> {
  const result = await executeInContentScript(tabId, { type: 'TAKE_ACCESSIBILITY_SNAPSHOT' });
  // Ensure the result structure is normalized
  if (result.success && result.snapshot) {
    return {
      success: true,
      data: { snapshot: result.snapshot },
    };
  }
  return result;
}

export async function captureScreenshot(tabId: number, windowId: number): Promise<BrowserResult> {
  const capture = async (wid?: number) => {
    return new Promise<string>((resolve, reject) => {
      // @ts-ignore - captureVisibleTab accepts null/undefined for current window
      chrome.tabs.captureVisibleTab(wid, { format: 'jpeg', quality: 50 }, (url) => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else if (!url) reject(new Error('Empty data URL'));
        else resolve(url);
      });
    });
  };

  try {
    let dataUrl: string;
    try {
      // Attempt to ensure the window is focused before capturing
      // This can sometimes resolve 'activeTab' permission issues if the window lost focus
      await chrome.windows.update(windowId, { focused: true }).catch(() => {});

      // 1. Try capturing the specific window of the tab
      dataUrl = await capture(windowId);
    } catch (specificError) {
      console.warn(
        `[Screenshot] Failed to capture specific window ${windowId}, retrying with current window context...`,
        specificError
      );
      try {
        // 2. Fallback: Capture "current" window (undefined/null)
        // This often works if the background script context implies the active window
        dataUrl = await capture(undefined);
      } catch (fallbackError) {
        throw new Error(
          `Screenshot failed. Chrome requires user interaction to grant permission. \n\n👉 FIX: Click the Earth Agent extension icon in the toolbar again to re-authorize.`
        );
      }
    }

    // 3. Resize in content script (logic ported from ai-tools.ts)
    let resizedDataUrl = dataUrl;
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: function (imgSrc: string, maxWidth: number) {
          return new Promise<string>((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              let width = img.width;
              let height = img.height;

              if (width > maxWidth) {
                const ratio = maxWidth / width;
                width = maxWidth;
                height = Math.floor(height * ratio);
              }

              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              if (!ctx) {
                reject('No context');
                return;
              }
              ctx.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL('image/jpeg', 0.5));
            };
            img.onerror = () => reject('Load failed');
            img.src = imgSrc;
          });
        },
        args: [dataUrl, 640],
      });

      if (results && results[0] && results[0].result) {
        resizedDataUrl = results[0].result;
      }
    } catch (resizeErr) {
      console.warn('Screenshot resize failed, using original', resizeErr);
    }

    return {
      success: true,
      data: { screenshotDataUrl: resizedDataUrl },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
