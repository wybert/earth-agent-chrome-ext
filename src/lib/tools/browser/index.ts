/**
 * Browser Tools Index
 * Exports all browser automation tools
 */

import { click, type ClickParams, type ClickResponse } from './click';
import { getElement, getElementByRefId, type GetElementParams, type GetElementResponse, type ElementInfo, type GetElementByRefIdParams } from './getElement';
import { snapshot, type SnapshotResponse } from './snapshot';
import { type as typeText, type TypeParams, type TypeResponse } from './type';
import { hover, type HoverParams, type HoverResponse } from './hover';
import { screenshot, type ScreenshotResponse } from './screenshot';
import { clickByRef, type ClickByRefParams } from './clickByRef';

// Export all tools
export {
  click,
  getElement,
  getElementByRefId,
  snapshot,
  typeText,
  hover,
  screenshot,
  clickByRef
};

export type {
  ClickParams,
  ClickResponse,
  GetElementParams,
  GetElementResponse,
  ElementInfo,
  GetElementByRefIdParams,
  SnapshotResponse,
  TypeParams,
  TypeResponse,
  HoverParams,
  HoverResponse,
  ScreenshotResponse,
  ClickByRefParams
};

// Main export of all browser tools
export default {
  click,
  getElement,
  getElementByRefId,
  snapshot,
  typeText,
  hover,
  screenshot,
  clickByRef
};