import { executeMapTool } from './map-service';
import { executeInContentScript } from '../../executor';
jest.mock('../../executor', () => ({ executeInContentScript: jest.fn() }));

const view = {
  mapId: 'map',
  revision: 'r1',
  viewport: { width: 1200, height: 900, devicePixelRatio: 2 },
};
beforeEach(() => {
  jest.clearAllMocks();
  chrome.tabs.get = jest.fn().mockResolvedValue({ id: 1, active: true, windowId: 2 });
  chrome.tabs.onActivated = { addListener: jest.fn(), removeListener: jest.fn() } as any;
  const bytes = new Uint8Array(24);
  bytes[0] = 137;
  bytes[1] = 80;
  const data = new DataView(bytes.buffer);
  data.setUint32(16, 2400);
  data.setUint32(20, 1800);
  chrome.tabs.captureVisibleTab = jest
    .fn()
    .mockResolvedValue('data:image/png;base64,' + btoa(String.fromCharCode(...bytes)));
  (executeInContentScript as jest.Mock).mockResolvedValue({ success: true, data: view });
});
it('uses encoded image dimensions rather than guessing DPR/resize scaling', async () => {
  const result = await executeMapTool(1, 'mapScreenshot', {});
  expect(result.frame).toEqual({
    mapId: 'map',
    revision: 'r1',
    width: 2400,
    height: 1800,
    viewportWidth: 1200,
    viewportHeight: 900,
  });
  expect(chrome.tabs.captureVisibleTab).toHaveBeenCalledWith(2, { format: 'png' });
});
it('runs the read-only runtime probe in MAIN without requiring the setup or content script', async () => {
  (chrome.tabs.get as jest.Mock).mockResolvedValue({
    id: 1,
    url: 'https://code.earthengine.google.com/',
  });
  chrome.scripting.executeScript = jest
    .fn()
    .mockResolvedValue([{ result: { readOnly: true, candidates: [] } }]);
  expect(await executeMapTool(1, 'mapInspect', { action: 'runtime_probe' })).toEqual({
    readOnly: true,
    candidates: [],
  });
  expect(chrome.scripting.executeScript).toHaveBeenCalledWith(
    expect.objectContaining({ target: { tabId: 1 }, world: 'MAIN', func: expect.any(Function) })
  );
  expect(executeInContentScript).not.toHaveBeenCalled();
  (chrome.tabs.get as jest.Mock).mockResolvedValue({ id: 1, url: 'https://example.com/' });
  await expect(executeMapTool(1, 'mapInspect', { action: 'runtime_probe' })).rejects.toThrow(
    'restricted'
  );
});
it('does not capture another active tab and rejects changed map frames', async () => {
  (chrome.tabs.get as jest.Mock).mockResolvedValueOnce({ id: 1, active: false, windowId: 2 });
  await expect(executeMapTool(1, 'mapScreenshot', {})).rejects.toThrow('Activate');
  expect(chrome.tabs.captureVisibleTab).not.toHaveBeenCalled();
  (executeInContentScript as jest.Mock)
    .mockResolvedValueOnce({ success: true, data: view })
    .mockResolvedValueOnce({ success: true, data: { ...view, revision: 'r2' } });
  await expect(executeMapTool(1, 'mapScreenshot', {})).rejects.toThrow('STALE_MAP_VIEW');
});
it('checks active tab again after capture and propagates bridge failures', async () => {
  (chrome.tabs.get as jest.Mock)
    .mockResolvedValueOnce({ id: 1, active: true, windowId: 2 })
    .mockResolvedValueOnce({ id: 1, active: true, windowId: 2 })
    .mockResolvedValueOnce({ id: 1, active: false, windowId: 2 });
  await expect(executeMapTool(1, 'mapScreenshot', {})).rejects.toThrow('STALE_MAP_VIEW');
  (executeInContentScript as jest.Mock).mockResolvedValue({
    success: false,
    error: 'MAP_BRIDGE_REQUIRED',
  });
  await expect(executeMapTool(1, 'mapInspect', { action: 'context' })).rejects.toThrow(
    'MAP_BRIDGE_REQUIRED'
  );
});
it('rejects switching away and back during capture and always removes its listener', async () => {
  const data = await chrome.tabs.captureVisibleTab(2, { format: 'png' });
  (chrome.tabs.captureVisibleTab as jest.Mock).mockImplementation(async () => {
    const listener = (chrome.tabs.onActivated.addListener as jest.Mock).mock.calls[0][0];
    listener({ windowId: 2, tabId: 3 });
    listener({ windowId: 2, tabId: 1 });
    return data;
  });
  await expect(executeMapTool(1, 'mapScreenshot', {})).rejects.toThrow('STALE_MAP_VIEW');
  expect(chrome.tabs.onActivated.removeListener).toHaveBeenCalledWith(
    (chrome.tabs.onActivated.addListener as jest.Mock).mock.calls[0][0]
  );
});
