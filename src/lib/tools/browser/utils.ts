/**
 * Helper functions for browser automation tools
 */

/**
 * Validates coordinates to ensure they are valid numbers within the viewport
 * @param x The x coordinate
 * @param y The y coordinate 
 * @returns True if coordinates are valid, false otherwise
 */
export function validateCoordinates(x: number, y: number): boolean {
  // Check if coordinates are numbers
  if (typeof x !== 'number' || typeof y !== 'number') {
    return false;
  }

  // Check if coordinates are finite
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return false;
  }

  // Check if coordinates are non-negative
  if (x < 0 || y < 0) {
    return false;
  }

  return true;
}

/**
 * Gets the viewport dimensions
 * @returns An object containing the viewport width and height
 */
export function getViewportDimensions(): { width: number, height: number } {
  return {
    width: window.innerWidth || document.documentElement.clientWidth,
    height: window.innerHeight || document.documentElement.clientHeight
  };
}

/**
 * Checks if coordinates are within the viewport
 * @param x The x coordinate
 * @param y The y coordinate
 * @returns True if coordinates are within viewport, false otherwise
 */
export function isWithinViewport(x: number, y: number): boolean {
  const { width, height } = getViewportDimensions();
  return x >= 0 && x <= width && y >= 0 && y <= height;
} 