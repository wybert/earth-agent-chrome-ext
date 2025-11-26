// Analyze the detailed structure of GEE console entries
// Run this in Browser DevTools Console after running print() statements in GEE

(function analyzeConsoleStructure() {
  console.log('=== Analyzing GEE Console Structure ===');
  console.log('');

  const eeConsole = document.querySelector('ee-console');
  if (!eeConsole) {
    console.error('ee-console not found');
    return;
  }

  const consoleLogElements = eeConsole.querySelectorAll('ee-console-log');
  console.log('Total entries:', consoleLogElements.length);
  console.log('');

  // Analyze first 3 entries in detail
  const entriesToAnalyze = Math.min(3, consoleLogElements.length);

  for (let i = 0; i < entriesToAnalyze; i++) {
    const logElement = consoleLogElements[i];
    console.log('--- Entry ' + (i + 1) + ' ---');

    // Show the full HTML structure
    console.log('HTML:', logElement.outerHTML.substring(0, 200));

    // Show all child elements
    console.log('Children:', logElement.children.length);
    Array.from(logElement.children).forEach((child, idx) => {
      console.log('  Child ' + idx + ':', child.tagName, 'class=' + child.className);
      console.log('    textContent:', (child.textContent || '').substring(0, 100));
    });

    // Check for .trivial
    const trivialDiv = logElement.querySelector('.trivial');
    console.log('.trivial div:', trivialDiv ? 'Found' : 'Not found');
    if (trivialDiv) {
      console.log('  .trivial text:', trivialDiv.textContent);
    }

    // Check for other common classes
    const classes = ['.value', '.key', '.object', '.string', '.number', '.boolean',
                    '.expandable', '.json', 'ee-console-value', 'ee-value'];
    classes.forEach(cls => {
      const el = logElement.querySelector(cls);
      if (el) {
        console.log('Found ' + cls + ':', (el.textContent || '').substring(0, 50));
      }
    });

    // Try to get all text content
    console.log('Full textContent:', logElement.textContent.substring(0, 150));
    console.log('');
  }

  // Try different extraction methods for entry 2 (the one with Number: 42)
  if (consoleLogElements.length >= 3) {
    console.log('=== Trying different extraction methods for Entry 2 (Number: 42) ===');
    const entry2 = consoleLogElements[2];

    console.log('Method 1 - textContent:', entry2.textContent);
    console.log('Method 2 - innerText:', entry2.innerText);
    console.log('Method 3 - innerHTML:', entry2.innerHTML.substring(0, 200));

    // Try to find all text nodes
    const walker = document.createTreeWalker(
      entry2,
      NodeFilter.SHOW_TEXT,
      null
    );

    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      if (node.textContent.trim()) {
        textNodes.push(node.textContent.trim());
      }
    }
    console.log('Method 4 - All text nodes:', textNodes);
  }

  return { totalEntries: consoleLogElements.length };
})();
