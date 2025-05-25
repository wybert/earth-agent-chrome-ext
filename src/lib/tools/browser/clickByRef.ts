/**
 * ClickByRef tool for browser automation
 * This tool clicks an element on the page using only the element reference
 * from an accessibility snapshot. It's a convenience wrapper around the main click tool.
 * Matches the playwright-mcp interaction pattern.
 *
 * @returns Promise with success status and result message
 */

import { click, ClickParams, ClickResponse } from './click';

export interface ClickByRefParams {
  ref: string; // Exact target element reference from the page snapshot
}

/**
 * Perform click on a web page using only the element reference from an accessibility snapshot.
 *
 * @param params.ref Exact target element reference from the page snapshot
 * @returns Promise with success status and result message/error
 */
export async function clickByRef(params: ClickByRefParams): Promise<ClickResponse> {
  const { ref } = params;

  if (!ref) {
    return {
      success: false,
      error: 'Element ref is required',
    };
  }

  // Call the original click tool with a generic element description
  const clickParams: ClickParams = {
    element: `Element with ref ${ref}`, // Generic description
    ref: ref,
  };

  return click(clickParams);
}

export default clickByRef;