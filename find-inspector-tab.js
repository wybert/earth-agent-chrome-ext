// Find the Inspector tab/button
// Run in GEE browser console

(function findInspectorTab() {
  console.log('=== Finding Inspector Tab ===\n');

  // Method 1: Look for text "Inspector"
  console.log('1. Searching for elements with "Inspector" text...');
  const allElements = document.querySelectorAll('*');
  const inspectorElements = [];

  allElements.forEach(el => {
    const text = el.textContent;
    if (text && text.includes('Inspector') && text.length < 50) {
      inspectorElements.push({
        el,
        tag: el.tagName,
        class: el.className,
        text: text.trim()
      });
    }
  });

  console.log('   Found', inspectorElements.length, 'elements');
  inspectorElements.slice(0, 10).forEach((info, i) => {
    console.log(`   ${i+1}. <${info.tag}> class="${info.class}"`);
    console.log(`      Text: "${info.text}"`);
    console.log('      Element:', info.el);
  });

  // Method 2: Check the right sidebar tabs
  console.log('\n2. Looking in right sidebar...');

  // GEE usually has tabs like "Console", "Tasks", "Inspector"
  // They might be in a tab container
  const tabContainers = document.querySelectorAll('[class*="tab"]');
  console.log('   Tab-related elements:', tabContainers.length);

  // Method 3: Look for the actual visible tabs
  console.log('\n3. Looking for visible tab elements...');

  // In your screenshot, I see tabs at the top: Inspector, Console, Tasks
  // Let's find those
  const topBarElements = [];
  allElements.forEach(el => {
    const rect = el.getBoundingClientRect();
    // Check if element is near the top and has "Inspector" text
    if (rect.top < 200 && rect.top > 50 && el.textContent?.includes('Inspector')) {
      topBarElements.push({
        el,
        tag: el.tagName,
        class: el.className,
        top: rect.top,
        text: el.textContent.trim().substring(0, 100)
      });
    }
  });

  console.log('   Elements near top with "Inspector":', topBarElements.length);
  topBarElements.forEach((info, i) => {
    console.log(`   ${i+1}. <${info.tag}> at y=${info.top}px`);
    console.log(`      Class: "${info.class}"`);
    console.log(`      Text: "${info.text}"`);
  });

  // Method 4: Try to click what we found
  if (topBarElements.length > 0) {
    console.log('\n4. Found clickable element!');
    const inspectorEl = topBarElements[0].el;
    console.log('   Element to click:', inspectorEl);
    console.log('   Try clicking it manually to verify it works');
    console.log('   Then run: $0.click() in console after selecting it');
  }

  // Method 5: Check if Inspector is already active
  console.log('\n5. Checking if Inspector is already active...');
  const inspectPanel = document.querySelector('.inspect-panel');
  if (inspectPanel) {
    const panelText = inspectPanel.textContent;
    if (panelText.includes('Click on the map')) {
      console.log('   ✓ Inspector IS ACTIVE but waiting for map click');
    } else if (panelText.length > 100) {
      console.log('   ✓ Inspector IS ACTIVE and showing data');
    } else {
      console.log('   ? Inspector state unclear');
    }
  }

  return {
    inspectorElements: inspectorElements.length,
    topBarElements: topBarElements.length,
    firstElement: topBarElements[0]?.el
  };
})();
