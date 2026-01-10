/**
 * Simple Console Output Test
 *
 * STEP 1: Run this in Google Earth Engine Code Editor
 * Copy and paste the code below into GEE and click "Run"
 */

// Clear any previous output first (optional)
// You can click the "Clear" button in GEE console

print('=== START TEST ===');
print('Entry 1: Simple text');
print('Entry 2: Number:', 42);
print('Entry 3: Boolean:', true);
print('Entry 4: Image:', ee.Image(0));
print('Entry 5: Geometry:', ee.Geometry.Point([0, 0]));
print('Entry 6: Long text:', 'A'.repeat(100));
print('Entry 7: Special chars: 你好 🌍');
print('Entry 8: List:', ee.List([1, 2, 3]));
print('Entry 9: Dictionary:', ee.Dictionary({ a: 1, b: 2 }));
print('Entry 10: Final entry');
print('=== END TEST (10 entries total) ===');

/**
 * STEP 2: After running the above in GEE, run this in Browser DevTools Console
 * (Press F12 or right-click -> Inspect, then go to Console tab)
 */

/*

// Copy everything below and paste in Browser DevTools Console:

(function testConsoleCapture() {
  console.log('%c🔍 Testing Console Output Capture', 'font-size: 16px; font-weight: bold; color: blue;');
  console.log('');

  // Find the console element
  const eeConsole = document.querySelector('ee-console');

  if (!eeConsole) {
    console.error('❌ ERROR: ee-console element not found!');
    console.log('Make sure you are on code.earthengine.google.com');
    return;
  }

  console.log('✅ Found ee-console element');

  // Get all console log entries
  const consoleLogElements = eeConsole.querySelectorAll('ee-console-log');
  const totalEntries = consoleLogElements.length;

  console.log('');
  console.log(`%c📊 RESULT: Found ${totalEntries} console entries`, 'font-size: 14px; font-weight: bold; color: green;');
  console.log('');

  // Show each entry
  console.log('📋 All entries:');
  consoleLogElements.forEach((logElement, index) => {
    // Try to get message text
    const trivialDiv = logElement.querySelector('.trivial');
    let message = '';

    if (trivialDiv) {
      message = trivialDiv.textContent || '';
    } else {
      message = logElement.textContent || '';
      message = message.replace(/^JSON/, '').trim();
    }

    // Truncate long messages for display
    const displayMessage = message.length > 80 ? message.substring(0, 80) + '...' : message;

    console.log(`  ${index + 1}. ${displayMessage}`);
  });

  console.log('');
  console.log('Expected: 12 entries (START message + 10 test entries + END message)');

  if (totalEntries === 12) {
    console.log('%c✅ SUCCESS: All entries captured!', 'font-size: 14px; font-weight: bold; color: green;');
  } else if (totalEntries < 12) {
    console.log('%c⚠️ WARNING: Missing some entries!', 'font-size: 14px; font-weight: bold; color: orange;');
    console.log(`Missing: ${12 - totalEntries} entries`);
  } else {
    console.log('%c⚠️ NOTE: More entries than expected (might have old entries)', 'font-size: 14px; font-weight: bold; color: orange;');
    console.log('Try clicking "Clear" in GEE console and re-running the test');
  }

  return {
    success: true,
    totalEntries: totalEntries,
    expectedEntries: 12,
    status: totalEntries === 12 ? 'PASS' : (totalEntries < 12 ? 'FAIL - MISSING ENTRIES' : 'WARNING - EXTRA ENTRIES')
  };
})();

*/
