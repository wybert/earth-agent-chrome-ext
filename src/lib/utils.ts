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