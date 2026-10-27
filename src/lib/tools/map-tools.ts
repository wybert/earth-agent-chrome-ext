import { tool } from 'ai';
import { mapDescriptions, mapSchemas, type MapToolName } from '../map/contracts';
import { executeMapTool } from './services/map-service';
import type { ToolEventCallback } from './ai-tools';

export function createMapTools(
  getTab: () => Promise<number | null>,
  onEvent?: ToolEventCallback,
  supportsImages = true
) {
  const execute = async (name: MapToolName, args: unknown) => {
    onEvent?.({ type: 'tool_start', toolName: name, args, timestamp: Date.now() });
    let result: any;
    try {
      const tabId = await getTab();
      if (!tabId) throw new Error('No Earth Engine tab found.');
      result = { success: true, data: await executeMapTool(tabId, name, args) };
    } catch (error) {
      result = { success: false, error: error instanceof Error ? error.message : String(error) };
    }
    // Do not duplicate image payloads in chat lifecycle events.
    onEvent?.({
      type: 'tool_finish',
      toolName: name,
      result:
        name === 'mapScreenshot' && result.success
          ? { success: true, frame: result.data.frame }
          : result,
      timestamp: Date.now(),
    });
    return result;
  };
  return {
    mapInspect: tool({
      description: mapDescriptions.mapInspect,
      inputSchema: mapSchemas.mapInspect,
      execute: (args) => execute('mapInspect', args),
    }),
    mapConvert: tool({
      description: mapDescriptions.mapConvert,
      inputSchema: mapSchemas.mapConvert,
      execute: (args) => execute('mapConvert', args),
    }),
    mapAnnotate: tool({
      description: mapDescriptions.mapAnnotate,
      inputSchema: mapSchemas.mapAnnotate,
      execute: (args) => execute('mapAnnotate', args),
    }),
    mapInteract: tool({
      description: mapDescriptions.mapInteract,
      inputSchema: mapSchemas.mapInteract,
      execute: (args) => execute('mapInteract', args),
    }),
    mapGeometry: tool({
      description: mapDescriptions.mapGeometry,
      inputSchema: mapSchemas.mapGeometry,
      execute: (args) => execute('mapGeometry', args),
    }),
    mapScreenshot: tool({
      description: mapDescriptions.mapScreenshot,
      inputSchema: mapSchemas.mapScreenshot,
      execute: (args) => execute('mapScreenshot', args),
      toModelOutput: ({ output }) => {
        if (!output.success) return { type: 'text' as const, value: JSON.stringify(output) };
        const { screenshotDataUrl, ...metadata } = output.data;
        if (!supportsImages)
          return {
            type: 'text' as const,
            value: JSON.stringify({
              ...metadata,
              notice: 'This provider does not support image inputs.',
            }),
          };
        return {
          type: 'content' as const,
          value: [
            { type: 'text' as const, text: JSON.stringify(metadata) },
            {
              type: 'file-data' as const,
              data: screenshotDataUrl.split(',')[1],
              mediaType: 'image/png',
            },
          ],
        };
      },
    }),
  };
}
