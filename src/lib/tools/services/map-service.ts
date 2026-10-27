import { executeInContentScript } from '../../executor';
import { mapSchemas, type MapToolName } from '../../map/contracts';
import type { MapView, ScreenshotFrame } from '../../map/spatial';
import { probeGeePageRuntime } from '../../map/runtime-probe';

async function content(tabId: number, name: MapToolName, args: unknown) {
  const result = await executeInContentScript(
    tabId,
    { type: 'MAP_ACTION', payload: { name, args } },
    25000
  );
  if (!result.success) throw new Error(result.error || 'Map operation failed.');
  return result.data;
}

export async function executeMapTool(
  tabId: number,
  name: MapToolName,
  input: unknown
): Promise<any> {
  const args = mapSchemas[name].parse(input);
  if (name === 'mapInspect' && 'action' in args && args.action === 'runtime_probe') {
    const tab = await chrome.tabs.get(tabId);
    if (!tab.url || new URL(tab.url).hostname !== 'code.earthengine.google.com')
      throw new Error('Runtime probe is restricted to the GEE Code Editor.');
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: probeGeePageRuntime,
    });
    if (!results[0]?.result) throw new Error('No runtime probe result returned.');
    return results[0].result;
  }
  if (name !== 'mapScreenshot') return content(tabId, name, args);
  const tab = await chrome.tabs.get(tabId);
  if (!tab.active || tab.windowId === undefined)
    throw new Error('Activate the Earth Engine tab before taking a map screenshot.');
  const before = (await content(tabId, 'mapInspect', {
    action: 'context',
    mapId: args.mapId,
  })) as MapView;
  let activatedDuringCapture = false;
  const onActivated = (info: chrome.tabs.TabActiveInfo) => {
    if (info.windowId === tab.windowId) activatedDuringCapture = true;
  };
  chrome.tabs.onActivated.addListener(onActivated);
  let dataUrl: string;
  let after: MapView;
  try {
    // Recheck after attaching the listener to cover a switch before capture starts.
    if (!(await chrome.tabs.get(tabId)).active)
      throw new Error('Activate the Earth Engine tab before capture.');
    dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
    const tabAfter = await chrome.tabs.get(tabId);
    after = (await content(tabId, 'mapInspect', {
      action: 'context',
      mapId: before.mapId,
    })) as MapView;
    if (
      activatedDuringCapture ||
      !tabAfter.active ||
      tabAfter.windowId !== tab.windowId ||
      before.revision !== after.revision
    )
      throw new Error(
        'STALE_MAP_VIEW: map or active tab changed during screenshot. Capture again.'
      );
  } finally {
    chrome.tabs.onActivated.removeListener(onActivated);
  }
  // PNG IHDR stores the encoded image dimensions, independent of DPR or browser zoom.
  if (dataUrl.length > 10 * 1024 * 1024)
    throw new Error(
      'Map screenshot exceeds 10 MB. Reduce the browser window size and capture again.'
    );
  const bytes = Uint8Array.from(atob(dataUrl.split(',')[1].slice(0, 32)), (c) => c.charCodeAt(0));
  if (bytes.length < 24 || bytes[0] !== 137 || bytes[1] !== 80)
    throw new Error('Unexpected screenshot encoding.');
  const header = new DataView(bytes.buffer);
  const width = header.getUint32(16),
    height = header.getUint32(20);
  if (!width || !height) throw new Error('Screenshot dimensions are invalid.');
  const frame: ScreenshotFrame = {
    mapId: after.mapId,
    revision: after.revision,
    width,
    height,
    viewportWidth: after.viewport.width,
    viewportHeight: after.viewport.height,
  };
  return { context: after, frame, screenshotDataUrl: dataUrl };
}
