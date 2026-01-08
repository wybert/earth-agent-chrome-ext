import { executeInContentScript } from '../../executor';

export interface InteractionResult {
    success: boolean;
    message?: string;
    error?: string;
    data?: any;
}

export async function runCode(tabId: number): Promise<InteractionResult> {
    const result = await executeInContentScript(tabId, { type: 'CLICK_RUN_BUTTON' });
    if (!result.success) {
        return { success: false, error: result.error || 'Failed to run code' };
    }
    return { success: true, message: 'Code execution started' };
}

export async function clearAll(tabId: number): Promise<InteractionResult> {
    // Use CLICK_BY_SELECTOR as confirmed in the analysis to fix the bug
    const result = await executeInContentScript(tabId, {
        type: 'CLICK_BY_SELECTOR',
        payload: {
            selector: 'button.goog-button.reset-button[title="Clear map, inspector, and console"]',
            elementDescription: 'Reset button to clear map, inspector, and console'
        }
    });

    if (!result.success) {
        return { success: false, error: result.error || 'Failed to clear environment' };
    }
    return { success: true, message: 'Environment cleared' };
}

export async function getConsoleOutput(tabId: number): Promise<InteractionResult> {
    const result = await executeInContentScript(tabId, { type: 'GET_CONSOLE_OUTPUT' });

    if (!result.success) {
        return { success: false, error: result.error };
    }

    return {
        success: true,
        data: {
            outputs: result.outputs || [],
            count: result.count || 0
        },
        message: `Read ${result.count} console entries`
    };
}

export async function getInspectorOutput(tabId: number): Promise<InteractionResult> {
    const result = await executeInContentScript(tabId, { type: 'INSPECT_MAP' });
    return result; // Pass through raw result structure from content script
}

export async function getMapInfo(tabId: number): Promise<InteractionResult> {
    const result = await executeInContentScript(tabId, { type: 'GET_MAP_INFO' });
    return result;
} 
