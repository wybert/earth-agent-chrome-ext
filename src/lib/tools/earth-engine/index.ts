/**
 * Earth Engine tools for interacting with the Google Earth Engine Code Editor
 * 
 * This module provides tools to:
 * 1. Run code in the Earth Engine editor
 * 2. Inspect the map at specific coordinates
 * 3. Check the console for errors
 * 4. Get tasks from Earth Engine
 * 5. Edit scripts in Earth Engine
 * 
 * Usage example:
 * ```typescript
 * import { runCode, checkConsole } from './lib/tools/earth-engine';
 * 
 * async function executeCodeAndCheckErrors() {
 *   // Run some Earth Engine code
 *   const runResult = await runCode('var image = ee.Image(1); print(image);');
 *   
 *   if (runResult.success) {
 *     // Check if there were any errors
 *     const consoleResult = await checkConsole();
 *     
 *     if (consoleResult.success && consoleResult.errors.length === 0) {
 *       console.log('Code executed successfully with no errors');
 *     }
 *   }
 * }
 * ```
 */

export { default as runCode } from './runCode';
export { default as inspectMap } from './inspectMap';
export { default as checkConsole } from './checkConsole';
export { default as getTasks } from './getTasks';
export { default as editScript } from './editScript';

// Also export the types for better type checking
export type { 
  RunCodeResponse 
} from './runCode';

export type { 
  InspectMapResponse 
} from './inspectMap';

export type { 
  CheckConsoleResponse,
  ConsoleError
} from './checkConsole';

export type { 
  GetTasksResponse,
  Task
} from './getTasks';

export type { 
  EditScriptResponse 
} from './editScript'; 