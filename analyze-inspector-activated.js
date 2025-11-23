/**
 * Analyze GEE Inspector AFTER it has been activated
 *
 * BEFORE RUNNING:
 * 1. Load some data in GEE (e.g., Map.addLayer(...))
 * 2. Click the Inspector tab/button in GEE
 * 3. Click somewhere on the map
 * 4. THEN run this script
 */

(function analyzeActivatedInspector() {
  console.log('%c=== Analyzing ACTIVATED Inspector ===', 'font-size: 16px; color: blue; font-weight: bold');
  console.log('');

  // 1. Find Inspector UI
  console.log('1. Looking for Inspector UI...');

  // Try different selectors
  const selectors = [
    '.inspector-panel',
    '[class*="inspector"]',
    '.inspector',
    '[class*="Inspector"]',
    'ee-inspector',
    '[id*="inspector"]',
    '.inspector-tab-panel',
    '.ui-inspector'
  ];

  let inspectorElement = null;
  selectors.forEach(selector => {
    const el = document.querySelector(selector);
    if (el) {
      console.log(`   ✓ Found with selector: "${selector}"`);
      console.log('     Tag:', el.tagName);
      console.log('     Classes:', el.className);
      console.log('     ID:', el.id);
      if (!inspectorElement) inspectorElement = el;
    }
  });

  if (!inspectorElement) {
    console.log('%c   ✗ Inspector UI not found!', 'color: red');
    console.log('   Make sure you:');
    console.log('   1. Clicked the Inspector tab in GEE');
    console.log('   2. Clicked on the map');
    return;
  }

  // 2. Analyze Inspector structure
  console.log('\n2. Inspector element structure:');
  console.log('   HTML preview:', inspectorElement.outerHTML.substring(0, 300) + '...');
  console.log('   Children:', inspectorElement.children.length);

  Array.from(inspectorElement.children).slice(0, 5).forEach((child, i) => {
    console.log(`   Child ${i}:`, child.tagName, child.className || '(no class)');
  });

  // 3. Look for data display
  console.log('\n3. Looking for pixel/data values...');

  // Try to find text content
  const textContent = inspectorElement.textContent;
  console.log('   Text content length:', textContent.length);
  console.log('   Text preview:', textContent.substring(0, 200));

  // Look for specific data patterns
  const dataPatterns = [
    /Point:\s*([-\d.]+),\s*([-\d.]+)/,  // Coordinates
    /Longitude:\s*([-\d.]+)/,
    /Latitude:\s*([-\d.]+)/,
    /[Bb]\d+:\s*([-\d.]+)/,  // Band values like B1: 0.234
    /\w+:\s*([-\d.]+)/  // Generic key: value pairs
  ];

  console.log('\n4. Checking for data patterns...');
  dataPatterns.forEach((pattern, i) => {
    const match = textContent.match(pattern);
    if (match) {
      console.log(`   Pattern ${i} matched:`, match[0]);
    }
  });

  // 5. Find all text nodes with numbers
  console.log('\n5. Looking for numeric data...');
  const walker = document.createTreeWalker(
    inspectorElement,
    NodeFilter.SHOW_TEXT,
    null
  );

  const numericLines = [];
  let node;
  while (node = walker.nextNode()) {
    const text = node.textContent.trim();
    if (text && /[-\d.]+/.test(text)) {
      numericLines.push(text);
    }
  }

  console.log('   Lines with numbers:', numericLines.length);
  numericLines.slice(0, 10).forEach((line, i) => {
    console.log(`   ${i}: ${line}`);
  });

  // 6. Check for lists or tables
  console.log('\n6. Looking for structured data...');
  const lists = inspectorElement.querySelectorAll('ul, ol, dl');
  console.log('   Lists found:', lists.length);

  const tables = inspectorElement.querySelectorAll('table');
  console.log('   Tables found:', tables.length);

  const divs = inspectorElement.querySelectorAll('div[class*="row"], div[class*="item"], div[class*="entry"]');
  console.log('   Row/item divs:', divs.length);

  // 7. Try to extract structured data
  console.log('\n7. Attempting to extract data structure...');

  // Look for key-value pairs in the DOM
  const potentialData = {};
  inspectorElement.querySelectorAll('*').forEach(el => {
    const text = el.textContent?.trim();
    // Match patterns like "B1: 0.234" or "Longitude: -122.4"
    const match = text?.match(/^([^:]+):\s*([-\d.]+)$/);
    if (match && match[1] && match[2]) {
      potentialData[match[1].trim()] = parseFloat(match[2]);
    }
  });

  console.log('   Extracted data:', potentialData);

  // 8. Find map element
  console.log('\n8. Finding map element...');
  const mapDiv = document.querySelector('.ui-map, [class*="ui-map"]');
  if (mapDiv) {
    console.log('   ✓ Map div found:', mapDiv.className);

    // Try to access Google Map instance
    if (window.google && window.google.maps) {
      console.log('   ✓ Google Maps API available');

      // Look for map instance on element
      if (mapDiv.__gm_id || mapDiv.gMap) {
        console.log('   ✓ Map instance attached to element');
      }
    }
  }

  // 9. Check for inspector toggle button
  console.log('\n9. Looking for Inspector toggle/button...');
  const inspectorButtons = document.querySelectorAll('button, div[role="button"], [class*="tab"]');
  const inspectorBtn = Array.from(inspectorButtons).find(btn =>
    btn.textContent?.toLowerCase().includes('inspector')
  );

  if (inspectorBtn) {
    console.log('   ✓ Inspector button found:', inspectorBtn.tagName, inspectorBtn.className);
    console.log('     Text:', inspectorBtn.textContent);
  }

  // 10. Summary and implementation hints
  console.log('\n%c=== Implementation Hints ===', 'font-size: 14px; color: green; font-weight: bold');
  console.log('');
  console.log('To implement inspectMap:');
  console.log('1. Selector to find Inspector:', inspectorElement ? `"${inspectorElement.className.split(' ')[0]}"` : 'Not found');
  console.log('2. Data extraction method:', Object.keys(potentialData).length > 0 ? 'Parse text content' : 'Need to investigate further');
  console.log('3. Click simulation:', mapDiv ? 'Target .ui-map element' : 'Need to find map element');

  return {
    inspectorFound: !!inspectorElement,
    inspectorSelector: inspectorElement?.className,
    dataExtracted: potentialData,
    mapFound: !!mapDiv,
    textPreview: textContent?.substring(0, 500)
  };
})();
