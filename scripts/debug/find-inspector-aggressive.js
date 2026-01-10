/**
 * Aggressive search for Inspector UI
 * Run this AFTER clicking Inspector tab and clicking on map
 */

(function aggressiveInspectorSearch() {
  console.log(
    '%c=== Aggressive Inspector Search ===',
    'font-size: 16px; color: blue; font-weight: bold'
  );
  console.log('');

  // 1. Search ALL elements for "inspector" text
  console.log('1. Searching for elements containing "inspector" text...');
  const allElements = document.querySelectorAll('*');
  const elementsWithInspector = [];

  allElements.forEach((el) => {
    // Check class name
    if (
      el.className &&
      typeof el.className === 'string' &&
      el.className.toLowerCase().includes('inspector')
    ) {
      elementsWithInspector.push({ el, reason: 'class', value: el.className });
    }
    // Check id
    else if (el.id && el.id.toLowerCase().includes('inspector')) {
      elementsWithInspector.push({ el, reason: 'id', value: el.id });
    }
    // Check aria-label
    else if (el.getAttribute('aria-label')?.toLowerCase().includes('inspector')) {
      elementsWithInspector.push({
        el,
        reason: 'aria-label',
        value: el.getAttribute('aria-label'),
      });
    }
  });

  console.log(`   Found ${elementsWithInspector.length} elements with "inspector"`);
  elementsWithInspector.slice(0, 5).forEach(({ el, reason, value }, i) => {
    console.log(`   ${i + 1}. ${el.tagName} (${reason}: "${value}")`);
  });

  // 2. Look for tabs/panels on the right side
  console.log('\n2. Looking for right-side panels/tabs...');
  const rightPanels = document.querySelectorAll(
    '[class*="panel"], [class*="tab"], [class*="pane"]'
  );
  console.log(`   Found ${rightPanels.length} panels/tabs`);

  // Filter for visible ones
  const visiblePanels = Array.from(rightPanels).filter((el) => {
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden';
  });
  console.log(`   Visible panels: ${visiblePanels.length}`);

  // 3. Look for elements with coordinate-like text
  console.log('\n3. Looking for elements with coordinate patterns...');
  const coordPattern = /[-]?\d+\.\d{3,}/; // Decimal numbers like -122.456
  const elementsWithCoords = [];

  Array.from(allElements).forEach((el) => {
    const text = el.textContent;
    if (text && text.length < 200 && coordPattern.test(text)) {
      // Avoid script tags and very long text
      if (el.tagName !== 'SCRIPT' && !el.querySelector('script')) {
        elementsWithCoords.push({ el, text: text.substring(0, 100) });
      }
    }
  });

  console.log(`   Found ${elementsWithCoords.length} elements with coordinate-like text`);
  elementsWithCoords.slice(0, 5).forEach(({ el, text }, i) => {
    console.log(`   ${i + 1}. ${el.tagName}.${el.className || '(no class)'}`);
    console.log(`      Text: "${text}"`);
  });

  // 4. Look for UI tabs structure
  console.log('\n4. Looking for tab structure...');
  const tabs = document.querySelectorAll('[role="tab"], .tab, [class*="tab"]');
  console.log(`   Found ${tabs.length} tab elements`);

  tabs.forEach((tab, i) => {
    if (i < 10) {
      // Show first 10
      const text = tab.textContent?.trim();
      console.log(`   ${i + 1}. "${text}" - ${tab.tagName}.${tab.className}`);
      if (text?.toLowerCase().includes('inspector')) {
        console.log('      ⭐ THIS MIGHT BE THE INSPECTOR TAB!');
      }
    }
  });

  // 5. Look for recently added/modified elements
  console.log('\n5. Checking for recently shown elements...');
  console.log('   Elements visible with data attributes:');

  const dataElements = document.querySelectorAll(
    '[data-value], [data-lat], [data-lng], [data-point]'
  );
  console.log(`   Found ${dataElements.length} elements with data attributes`);

  // 6. Look in the right sidebar area
  console.log('\n6. Checking right sidebar area...');
  const sidebar = document.querySelector('.ui-panel-right, [class*="right"], [class*="sidebar"]');
  if (sidebar) {
    console.log('   ✓ Right sidebar found:', sidebar.className);
    console.log('   Children:', sidebar.children.length);

    // Look for tabs inside
    const sidebarTabs = sidebar.querySelectorAll('[role="tab"], .tab, [class*="tab"]');
    console.log('   Tabs in sidebar:', sidebarTabs.length);

    sidebarTabs.forEach((tab, i) => {
      const text = tab.textContent?.trim();
      console.log(`     Tab ${i + 1}: "${text}"`);
    });

    // Get all visible text in sidebar
    console.log('\n   Sidebar text content (first 500 chars):');
    console.log('   "' + sidebar.textContent?.substring(0, 500) + '"');
  }

  // 7. Check for drawer/collapsible panels
  console.log('\n7. Looking for drawer/collapsible panels...');
  const drawers = document.querySelectorAll(
    '[class*="drawer"], [class*="collapse"], [class*="accordion"]'
  );
  console.log(`   Found ${drawers.length} drawer-like elements`);

  // 8. Try to find map click listener info
  console.log('\n8. Checking for map element...');
  const mapElement = document.querySelector('.ui-map');
  if (mapElement) {
    console.log('   ✓ Map element found');
    console.log('   Has click listener:', mapElement.onclick ? 'Yes' : 'Unknown');

    // Check for event listeners (Chrome only)
    if (typeof getEventListeners === 'function') {
      const listeners = getEventListeners(mapElement);
      console.log('   Event listeners:', Object.keys(listeners));
    }
  }

  // 9. Manual inspection helper
  console.log(
    '\n%c=== Manual Inspection Helper ===',
    'font-size: 14px; color: orange; font-weight: bold'
  );
  console.log('');
  console.log('Please do this manually:');
  console.log('1. Look at the GEE interface - do you see Inspector data?');
  console.log('2. Right-click on the Inspector panel → Inspect Element');
  console.log('3. Note the element classes/structure');
  console.log('4. Run: document.querySelector("YOUR_SELECTOR_HERE")');
  console.log('');
  console.log('Common places Inspector might be:');
  console.log('- Right sidebar with tabs');
  console.log('- Collapsible panel');
  console.log('- Overlay/modal');
  console.log('- Shadow DOM (check custom elements)');

  // 10. Check for Shadow DOM
  console.log('\n10. Checking for Shadow DOM...');
  const customElements = document.querySelectorAll('*');
  let shadowCount = 0;
  const elementsWithShadow = [];

  customElements.forEach((el) => {
    if (el.shadowRoot) {
      shadowCount++;
      elementsWithShadow.push({
        tag: el.tagName,
        class: el.className,
        shadowMode: el.shadowRoot.mode,
      });
    }
  });

  console.log(`   Elements with Shadow DOM: ${shadowCount}`);
  elementsWithShadow.slice(0, 5).forEach((info, i) => {
    console.log(`   ${i + 1}. <${info.tag}> class="${info.class}" (${info.shadowMode})`);
  });

  // If we found Shadow DOMs, search inside them
  if (shadowCount > 0) {
    console.log('\n   Searching inside Shadow DOMs for inspector...');
    elementsWithShadow.forEach(({ tag, class: className }, i) => {
      const el = document.querySelector(tag + (className ? `.${className.split(' ')[0]}` : ''));
      if (el && el.shadowRoot) {
        const inspectorInShadow = el.shadowRoot.querySelector('[class*="inspector"]');
        if (inspectorInShadow) {
          console.log(`   ⭐ Found inspector in Shadow DOM of <${tag}>!`);
          console.log('      ', inspectorInShadow);
        }
      }
    });
  }

  return {
    elementsWithInspectorText: elementsWithInspector.length,
    visiblePanels: visiblePanels.length,
    elementsWithCoords: elementsWithCoords.length,
    shadowDOMCount: shadowCount,
    sidebar: !!sidebar,
  };
})();
