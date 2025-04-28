/**
 * Browser Tools Index
 * Exports all browser automation tools
 */

import click, { ClickParams, ClickResponse } from './click';
import getElement, { GetElementParams, GetElementResponse, ElementInfo } from './getElement';
import screenshot, { ScreenshotResponse } from './screenshot';
import typeFunc, { TypeParams, TypeResponse } from './type';

// Export all tools
export {
  click,
  getElement,
  screenshot,
  typeFunc as typeText,
  // Types
  ClickParams,
  ClickResponse,
  GetElementParams,
  GetElementResponse,
  ElementInfo,
  ScreenshotResponse,
  TypeParams,
  TypeResponse
};

// Main export of all browser tools
export default {
  click,
  getElement,
  screenshot,
  typeText: typeFunc
}; 