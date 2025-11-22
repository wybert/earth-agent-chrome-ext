// Copy and paste this entire block into Browser DevTools Console
// (Press F12, go to Console tab, paste this)

(function testConsoleCapture() {
  console.log('Testing Console Output Capture');
  console.log('');

  const eeConsole = document.querySelector('ee-console');

  if (!eeConsole) {
    console.error('ERROR: ee-console element not found!');
    return;
  }

  console.log('Found ee-console element');

  const consoleLogElements = eeConsole.querySelectorAll('ee-console-log');
  const totalEntries = consoleLogElements.length;

  console.log('');
  console.log('RESULT: Found ' + totalEntries + ' console entries');
  console.log('');

  console.log('All entries:');
  consoleLogElements.forEach((logElement, index) => {
    const trivialDiv = logElement.querySelector('.trivial');
    let message = trivialDiv ? trivialDiv.textContent : logElement.textContent;
    if (!message) message = '';
    message = message.replace(/^JSON/, '').trim();

    const displayMessage = message.length > 80 ? message.substring(0, 80) + '...' : message;
    console.log('  ' + (index + 1) + '. ' + displayMessage);
  });

  console.log('');
  console.log('Expected: 12 entries');

  if (totalEntries === 12) {
    console.log('SUCCESS: All entries captured!');
  } else if (totalEntries < 12) {
    console.log('WARNING: Missing entries! Found: ' + totalEntries);
  } else {
    console.log('NOTE: Extra entries found: ' + totalEntries);
  }

  return { totalEntries: totalEntries, expectedEntries: 12 };
})();
