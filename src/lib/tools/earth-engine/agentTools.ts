/**
 * Wrapper functions for Earth Engine tools specifically designed for AI agent usage
 * These functions are simplified versions of the base tools that are formatted
 * to be easily called by an AI assistant agent
 */

import { runCode, inspectMap, checkConsole, getTasks, editScript } from './index';
import { detectEnvironment } from '@/lib/utils';

/**
 * Runs Earth Engine code in the Code Editor
 * Simplified wrapper for AI agents
 * 
 * @param code - JavaScript code to run in Earth Engine
 * @returns Object with success status and results
 */
export async function runEarthEngineCode(code: string) {
  try {
    if (!code || typeof code !== 'string') {
      return {
        success: false,
        message: 'Code is required and must be a string'
      };
    }

    // Run the code in Earth Engine
    const result = await runCode(code);
    
    return {
      success: result.success,
      message: result.success 
        ? `Code executed successfully: ${result.result || 'No output'}`
        : `Code execution failed: ${result.error || 'Unknown error'}`
    };
  } catch (error) {
    return {
      success: false,
      message: `Error running Earth Engine code: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Inspects the Earth Engine map at a specific location
 * Simplified wrapper for AI agents
 * 
 * @param latitude - Latitude coordinate to inspect
 * @param longitude - Longitude coordinate to inspect
 * @returns Object with inspection data
 */
export async function inspectEarthEngineMap(latitude: number, longitude: number) {
  try {
    // Validate coordinates
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return {
        success: false,
        message: 'Valid latitude and longitude coordinates are required'
      };
    }
    
    if (latitude < -90 || latitude > 90) {
      return {
        success: false,
        message: 'Latitude must be between -90 and 90 degrees'
      };
    }
    
    if (longitude < -180 || longitude > 180) {
      return {
        success: false,
        message: 'Longitude must be between -180 and 180 degrees'
      };
    }
    
    // Inspect map at the specified coordinates
    const coordinates = { lat: latitude, lng: longitude };
    const result = await inspectMap(coordinates);
    
    return {
      success: result.success,
      data: result.data,
      message: result.success 
        ? `Map inspected at ${latitude}, ${longitude}`
        : `Map inspection failed: ${result.error || 'Unknown error'}`
    };
  } catch (error) {
    return {
      success: false,
      message: `Error inspecting Earth Engine map: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Checks the Earth Engine console for errors
 * Simplified wrapper for AI agents
 * 
 * @returns Object with console errors and warnings
 */
export async function checkEarthEngineConsole() {
  try {
    // Check the console for errors
    const result = await checkConsole();
    
    return {
      success: result.success,
      errors: result.errors || [],
      message: result.success 
        ? result.errors && result.errors.length > 0
          ? `Found ${result.errors.length} errors/warnings in the console`
          : 'No errors found in the console'
        : `Console check failed: ${result.error || 'Unknown error'}`
    };
  } catch (error) {
    return {
      success: false,
      message: `Error checking Earth Engine console: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Gets Earth Engine tasks and their status
 * Simplified wrapper for AI agents
 * 
 * @returns Object with task information
 */
export async function getEarthEngineTasks() {
  try {
    // Get tasks from Earth Engine
    const result = await getTasks();
    
    return {
      success: result.success,
      tasks: result.tasks || [],
      message: result.success 
        ? result.tasks && result.tasks.length > 0
          ? `Found ${result.tasks.length} Earth Engine tasks`
          : 'No tasks found in Earth Engine'
        : `Task retrieval failed: ${result.error || 'Unknown error'}`
    };
  } catch (error) {
    return {
      success: false,
      message: `Error getting Earth Engine tasks: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Edits a script in Earth Engine
 * Simplified wrapper for AI agents
 * 
 * @param scriptId - ID of the script to edit
 * @param code - New code content for the script
 * @returns Object with success status and result message
 */
export async function editEarthEngineScript(scriptId: string, code: string) {
  try {
    // Validate inputs
    if (!scriptId || typeof scriptId !== 'string') {
      return {
        success: false,
        message: 'Script ID is required and must be a string'
      };
    }
    
    if (!code || typeof code !== 'string') {
      return {
        success: false,
        message: 'Code content is required and must be a string'
      };
    }
    
    // Edit the script
    const result = await editScript(scriptId, code);
    
    return {
      success: result.success,
      message: result.success 
        ? `Script "${scriptId}" updated successfully: ${result.message || ''}`
        : `Script update failed: ${result.error || 'Unknown error'}`
    };
  } catch (error) {
    return {
      success: false,
      message: `Error editing Earth Engine script: ${error instanceof Error ? error.message : String(error)}`
    };
  }
} 