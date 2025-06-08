/**
 * Browser Tools Index
 * Exports all browser automation tools
 */

import { click, clickByCoordinates, type ClickParams, type ClickResponse, type ClickByCoordinatesParams, type ClickByCoordinatesResponse } from './click';
import { getElement, getElementByRefId, type GetElementParams, type GetElementResponse, type ElementInfo, type GetElementByRefIdParams } from './getElement';
import { snapshot, type SnapshotResponse } from './snapshot';
import { type as typeText, type TypeParams, type TypeResponse } from './type';
import { hover, type HoverParams, type HoverResponse } from './hover';
import { screenshot, type ScreenshotResponse } from './screenshot';
import { clickByRef, type ClickByRefParams } from './clickByRef';
import { clickBySelector, type ClickBySelectorParams, type ClickBySelectorResponse } from './clickBySelector';

// Export all tools
export {
  click,
  clickByCoordinates,
  clickBySelector,
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
  ClickByCoordinatesParams,
  ClickByCoordinatesResponse,
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
  clickBySelector,
  getElement,
  getElementByRefId,
  snapshot,
  typeText,
  hover,
  screenshot,
  clickByRef
};