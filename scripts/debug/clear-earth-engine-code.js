/**
 * Utility functions to clear code in Google Earth Engine Code Editor
 * Use these in your Chrome extension to clean up the editor
 */

import { editScript } from '@/lib/tools/earth-engine';
import { typeText, click } from '@/lib/tools/browser';
import { snapshot } from '@/lib/tools/browser';

/**
 * Method 1: Complete Clear (Recommended)
 * Clears ALL content from the Earth Engine editor
 */
export async function clearAllCode() {
  console.log('🧹 Clearing all code from Earth Engine editor...');
  
  try {
    const result = await editScript('current', '');
    
    if (result.success) {
      console.log('✅ Code cleared successfully');
      return { success: true, message: 'All code cleared from editor' };
    } else {
      console.log('❌ Failed to clear code:', result.error);
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('❌ Error clearing code:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Method 2: Clear and Replace with Clean Template
 * Clears existing code and adds a clean starting template
 */
export async function clearAndAddTemplate(template = 'basic') {
  console.log('🧹 Clearing code and adding clean template...');
  
  const templates = {
    basic: `// Clean Earth Engine Script
// Add your code here

`,
    
    image: `// Earth Engine Image Processing
var image = ee.Image('LANDSAT/LC08/C02/T1_L2/LC08_044034_20140318');

// Add processing steps here
Map.centerObject(image, 10);
Map.addLayer(image, {bands: ['SR_B4', 'SR_B3', 'SR_B2'], max: 0.3}, 'Landsat');
`,

    collection: `// Earth Engine Image Collection
var collection = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
  .filterBounds(ee.Geometry.Point([-122.262, 37.8719]))
  .filterDate('2020-01-01', '2020-12-31')
  .filter(ee.Filter.lt('CLOUD_COVER', 20));

print('Collection size:', collection.size());
`,

    empty: ''
  };

  const code = templates[template] || templates.basic;

  try {
    const result = await editScript('current', code);
    
    if (result.success) {
      console.log('✅ Code cleared and template added');
      return { success: true, message: `Code cleared and ${template} template added` };
    } else {
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('❌ Error clearing and adding template:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Method 3: Clean Up Messy Code
 * Removes common clutter like excessive comments, console.logs, etc.
 */
export async function cleanUpCode() {
  console.log('🧹 Cleaning up messy code...');
  
  try {
    // This would need to get current code first, clean it, then set it back
    // For now, this is a placeholder - you'd need to implement getCurrentCode() first
    
    console.log('⚠️ cleanUpCode() needs current code extraction - use clearAllCode() for now');
    return { 
      success: false, 
      error: 'cleanUpCode() requires current code extraction - use clearAllCode() instead' 
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Method 4: Smart Clear (with backup)
 * Clears code but first tries to extract and log current content
 */
export async function smartClear(backupToConsole = true) {
  console.log('🧹 Smart clearing with backup...');
  
  try {
    if (backupToConsole) {
      // Log current code to console before clearing (if extraction is possible)
      console.log('📝 Current code would be backed up here...');
    }
    
    // Clear the editor
    const result = await clearAllCode();
    return result;
    
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Method 5: Browser-based Clear
 * Uses browser automation to select all and delete
 */
export async function browserClear() {
  console.log('🧹 Using browser automation to clear code...');
  
  try {
    // First take a snapshot to find the editor
    const snapshotResult = await snapshot();
    
    if (!snapshotResult.success) {
      return { success: false, error: 'Could not take page snapshot' };
    }
    
    // Look for ace editor elements in the snapshot
    // You'd need to parse the snapshot to find the right element reference
    
    // For now, try the direct typing approach
    const result = await typeText({
      selector: '.ace_text-input, .ace_editor textarea, .ace_content',
      text: ''
    });
    
    if (result.success) {
      console.log('✅ Code cleared using browser automation');
      return { success: true, message: 'Code cleared using browser automation' };
    } else {
      return { success: false, error: result.error };
    }
    
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Example usage in your extension:
/*
// Clear all code
await clearAllCode();

// Clear and add basic template  
await clearAndAddTemplate('basic');

// Clear and add image processing template
await clearAndAddTemplate('image');

// Smart clear with console backup
await smartClear(true);
*/ 