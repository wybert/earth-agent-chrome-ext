/**
 * Comprehensive test script to verify getConsoleOutput captures all content
 *
 * HOW TO USE:
 * 1. Open Google Earth Engine Code Editor (code.earthengine.google.com)
 * 2. Run this entire script in the GEE code editor
 * 3. Wait for all outputs to appear in the console
 * 4. Open browser DevTools console and run the verification script below
 * 5. Compare the counts and content
 */

// ========================================
// PART 1: Run this in GEE Code Editor
// ========================================

print('========== TEST START ==========');
print('Test 1: Simple string');
print('Test 2: Number:', 123);
print('Test 3: Boolean:', true);
print('Test 4: Null:', null);
print('Test 5: Undefined:', undefined);

// Test with Earth Engine objects
print('Test 6: Image:', ee.Image(0));
print('Test 7: Geometry:', ee.Geometry.Point([0, 0]));
print('Test 8: Feature:', ee.Feature(ee.Geometry.Point([0, 0]), { name: 'test' }));

// Test with collections
print('Test 9: ImageCollection:', ee.ImageCollection('LANDSAT/LC08/C02/T1_TOA'));
print('Test 10: FeatureCollection:', ee.FeatureCollection('TIGER/2010/Blocks'));

// Test with lists and dictionaries
print('Test 11: List:', ee.List([1, 2, 3, 4, 5]));
print('Test 12: Dictionary:', ee.Dictionary({ key1: 'value1', key2: 'value2' }));

// Test with long text
print(
  'Test 13: Long text:',
  'This is a very long string that might exceed normal display limits. '.repeat(10)
);

// Test with special characters
print('Test 14: Special chars:', '特殊字符 🌍 🛰️ ①②③');

// Test with multi-line output
print('Test 15: Multi-line:\nLine 1\nLine 2\nLine 3');

// Test with complex object
var complexObject = {
  name: 'Complex Test',
  value: 999,
  nested: {
    level1: {
      level2: {
        deep: 'value',
      },
    },
  },
  array: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
};
print('Test 16: Complex object:', complexObject);

// Test with computation results
var image = ee.Image('LANDSAT/LC08/C02/T1_TOA/LC08_044034_20140318');
print('Test 17: Band names:', image.bandNames());
print('Test 18: Image info:', image.getInfo());

// Test with dates
print('Test 19: Date:', ee.Date('2024-01-01'));

// Test with errors (intentional)
try {
  print('Test 20: Before error');
  ee.Number('not a number').getInfo(); // This will error
  print('Test 21: After error (should not appear)');
} catch (e) {
  print('Test 21: Caught error:', e.message);
}

print('========== TEST END (Total: 21+ tests) ==========');

// ========================================
// PART 2: Run this in Browser DevTools Console AFTER running Part 1
// ========================================

/*
console.log('🔍 Verifying Console Output Capture\n');

// Get the ee-console element
const eeConsole = document.querySelector('ee-console');

if (!eeConsole) {
  console.error('❌ ee-console element not found!');
} else {
  console.log('✅ ee-console element found');

  // Get all console log entries
  const consoleLogElements = eeConsole.querySelectorAll('ee-console-log');
  console.log(`📊 Total console entries found: ${consoleLogElements.length}`);

  // Expected number based on the test script
  const expectedCount = 21; // Adjust if you add/remove tests

  if (consoleLogElements.length >= expectedCount) {
    console.log(`✅ All ${expectedCount}+ entries captured!`);
  } else {
    console.warn(`⚠️ Only ${consoleLogElements.length} entries found, expected ${expectedCount}+`);
  }

  // Check each entry
  console.log('\n📋 Detailed Entry Analysis:');
  consoleLogElements.forEach((logElement, index) => {
    const trivialDiv = logElement.querySelector('.trivial');
    const message = trivialDiv?.textContent || logElement.textContent || '';
    const messagePreview = message.length > 60 ? message.substring(0, 60) + '...' : message;

    console.log(`${index + 1}. "${messagePreview}"`);

    // Check for potential truncation
    if (message.includes('...') || message.endsWith('…')) {
      console.warn(`   ⚠️ Entry ${index + 1} might be truncated`);
    }
  });

  // Check for Shadow DOM content
  if (eeConsole.shadowRoot) {
    console.log('\n🔍 Checking Shadow DOM...');
    const shadowContent = eeConsole.shadowRoot.querySelectorAll('*');
    console.log(`   Shadow DOM elements: ${shadowContent.length}`);

    // Look for additional console entries in shadow DOM
    const shadowConsoleEntries = eeConsole.shadowRoot.querySelectorAll('ee-console-log, .console-entry, [class*="console"]');
    if (shadowConsoleEntries.length > 0) {
      console.warn(`   ⚠️ Found ${shadowConsoleEntries.length} additional entries in Shadow DOM that might be missed!`);
    }
  }

  // Check for scrollable content (might indicate more entries)
  console.log('\n📏 Checking for scrollable content...');
  const consoleContainer = eeConsole.querySelector('.console-entries') || eeConsole;
  if (consoleContainer.scrollHeight > consoleContainer.clientHeight) {
    console.warn(`   ⚠️ Console has scroll (${consoleContainer.scrollHeight}px vs ${consoleContainer.clientHeight}px)`);
    console.warn('   Some entries might be outside viewport but should still be in DOM');
  }

  // Summary
  console.log('\n📊 Summary:');
  console.log(`   Total entries: ${consoleLogElements.length}`);
  console.log(`   Expected: ${expectedCount}+`);
  console.log(`   Status: ${consoleLogElements.length >= expectedCount ? '✅ PASS' : '❌ FAIL'}`);
}

// Test the actual getConsoleOutput implementation
console.log('\n🧪 Testing Actual Implementation:');
console.log('Run this in the extension context to test the tool:');
console.log('chrome.tabs.query({url: "*://code.earthengine.google.com/*"}, (tabs) => {');
console.log('  chrome.tabs.sendMessage(tabs[0].id, {type: "GET_CONSOLE_OUTPUT"}, (response) => {');
console.log('    console.log("Tool result:", response);');
console.log('  });');
console.log('});');
*/
