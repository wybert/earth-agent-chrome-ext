/**
 * Get Google Earth Engine map information including bounds, center point, and viewport dimensions.
 * This is useful for determining where to click on the map programmatically.
 */

import { detectEnvironment } from '@/lib/utils';

export interface MapInfo {
  mapBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  centerPoint: {
    x: number;
    y: number;
  };
  viewport: {
    width: number;
    height: number;
  };
}

export interface GetMapInfoResult {
  success: boolean;
  data?: MapInfo;
  error?: string;
}

/**
 * Get map information from the current Earth Engine page
 */
export async function getMapInfo(): Promise<GetMapInfoResult> {
  const env = detectEnvironment();

  if (env.isContentScript) {
    // Running in content script - access DOM directly
    return getMapInfoFromDOM();
  } else if (env.useBackgroundProxy) {
    // Running in background/sidepanel - use message passing
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'GET_MAP_INFO' }, (response: GetMapInfoResult) => {
        resolve(response);
      });
    });
  } else {
    return {
      success: false,
      error: 'getMapInfo can only be called from extension contexts',
    };
  }
}

/**
 * Get map info directly from DOM (called in content script)
 */
function getMapInfoFromDOM(): GetMapInfoResult {
  try {
    const mapElement = document.querySelector('.ui-map') as HTMLElement;

    if (!mapElement) {
      return {
        success: false,
        error: 'Map element not found. Please ensure you are on the Earth Engine Code Editor page.',
      };
    }

    const rect = mapElement.getBoundingClientRect();

    const mapInfo: MapInfo = {
      mapBounds: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      },
      centerPoint: {
        x: rect.x + rect.width / 2,
        y: rect.y + rect.height / 2,
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    };

    return {
      success: true,
      data: mapInfo,
    };
  } catch (error) {
    return {
      success: false,
      error: `Error getting map info: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
