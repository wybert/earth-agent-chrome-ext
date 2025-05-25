/**
 * Browser Tools Index
 * Exports all browser automation tools
 */

import click, { ClickParams, ClickResponse } from './click';
import clickByRef, { ClickByRefParams } from './clickByRef'; // Added import for clickByRef
import getElement, { GetElementParams, GetElementResponse, ElementInfo } from './getElement';
import screenshot, { ScreenshotResponse } from './screenshot';
import { snapshot, SnapshotResponse } from './snapshot';
import typeFunc, { TypeParams, TypeResponse } from './type';

// Export all tools
export {
  click,
  clickByRef, // Added clickByRef
  getElement,
  screenshot,
  snapshot,
  typeFunc as typeText,
  // Types
  ClickParams,
  ClickResponse,
  ClickByRefParams, // Added ClickByRefParams
  GetElementParams,
  GetElementResponse,
  ElementInfo,
  ScreenshotResponse,
  SnapshotResponse,
  TypeParams,
  TypeResponse
};

// Main export of all browser tools
export default {
  click,
  clickByRef, // Added clickByRef
  getElement,
  screenshot,
  snapshot,
  typeText: typeFunc
};