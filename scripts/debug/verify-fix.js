// Verification script to test the fixed getConsoleOutput
// Run this in Browser DevTools Console after reloading the extension

(function verifyFix() {
  console.log('=== Verifying getConsoleOutput Fix ===');
  console.log('');

  const eeConsole = document.querySelector('ee-console');
  if (!eeConsole) {
    console.error('ee-console not found');
    return;
  }

  const consoleLogElements = eeConsole.querySelectorAll('ee-console-log');
  console.log('Total entries in DOM:', consoleLogElements.length);
  console.log('');

  // Test the new extraction method on each entry
  console.log('Testing new extraction method:');
  consoleLogElements.forEach((logElement, index) => {
    // Method 1: Full textContent (what we now use)
    let message = logElement.textContent || '';
    message = message.replace(/^JSON/, '').trim();

    // Method 2: All .trivial divs (fallback)
    const trivialDivs = logElement.querySelectorAll('.trivial');
    let trivialMessage = '';
    if (trivialDivs.length > 0) {
      const trivialTexts = [];
      trivialDivs.forEach((div) => {
        const text = div.textContent?.trim();
        if (text) trivialTexts.push(text);
      });
      trivialMessage = trivialTexts.join(' ');
    }

    // Use trivial method if available, otherwise use full textContent
    const finalMessage = trivialMessage || message;
    const preview =
      finalMessage.length > 100 ? finalMessage.substring(0, 100) + '...' : finalMessage;

    console.log(index + 1 + '. ' + preview);
  });

  console.log('');
  console.log('Expected outputs:');
  console.log('  Entry 3 should show: "Entry 2: Number: 42"');
  console.log('  Entry 4 should show: "Entry 3: Boolean: true"');
  console.log('  Entry 5 should show: "Entry 4: Image: ..." (with Image info)');
  console.log('');
  console.log('If you see the values (42, true, Image info), the fix works!');

  return { totalEntries: consoleLogElements.length };
})();
