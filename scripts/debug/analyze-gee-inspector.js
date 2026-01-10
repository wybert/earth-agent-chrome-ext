/**
 * Analyze how GEE Inspector works
 * Run this in GEE browser console (F12)
 */

(function analyzeInspector() {
  console.log('=== Analyzing GEE Inspector ===\n');

  // 1. Find Inspector UI elements
  console.log('1. Looking for Inspector UI elements...');

  const inspectorPanel = document.querySelector(
    '.inspector-panel, [class*="inspector"], .inspector'
  );
  console.log('   Inspector panel:', inspectorPanel ? 'Found' : 'Not found');
  if (inspectorPanel) {
    console.log('   Classes:', inspectorPanel.className);
    console.log('   ID:', inspectorPanel.id);
  }

  // 2. Find Inspector button/toggle
  const inspectorButton = document.querySelector(
    '[title*="Inspector"], [aria-label*="Inspector"], button[class*="inspector"]'
  );
  console.log('\n2. Inspector button:', inspectorButton ? 'Found' : 'Not found');
  if (inspectorButton) {
    console.log('   Text:', inspectorButton.textContent);
    console.log('   Title:', inspectorButton.title);
    console.log('   Classes:', inspectorButton.className);
  }

  // 3. Check for map element
  console.log('\n3. Looking for map element...');
  const mapElements = document.querySelectorAll('[class*="map"], .goog-map, #map');
  console.log('   Map elements found:', mapElements.length);
  mapElements.forEach((el, i) => {
    console.log(`   Map ${i + 1}:`, el.tagName, el.className, el.id);
  });

  // 4. Check for existing Earth Engine map API
  console.log('\n4. Checking for EE map API...');
  if (typeof ee !== 'undefined') {
    console.log('   ee object:', 'Available');
    console.log('   ee.MapLayerOverlay:', typeof ee.MapLayerOverlay);
  }

  // Check window object for map-related properties
  const mapKeys = Object.keys(window).filter(
    (key) => key.toLowerCase().includes('map') || key.toLowerCase().includes('inspector')
  );
  console.log('\n5. Window properties with "map" or "inspector":', mapKeys.length);
  mapKeys.forEach((key) => {
    console.log('   -', key, ':', typeof window[key]);
  });

  // 6. Look for inspector data in DOM
  console.log('\n6. Looking for inspector data display...');
  const inspectorData = document.querySelectorAll(
    '[class*="inspector-data"], [class*="pixel"], [class*="value"]'
  );
  console.log('   Inspector data elements:', inspectorData.length);

  // 7. Check for click event listeners on map
  console.log('\n7. Checking map click handlers...');
  console.log('   Tip: Open GEE Inspector manually and click on the map');
  console.log('   Then run this script again to see the inspector data');

  // 8. Try to find the map instance
  console.log('\n8. Looking for Google Maps instance...');
  if (window.google && window.google.maps) {
    console.log('   Google Maps API: Available');

    // Try to find map instances
    const allElements = document.querySelectorAll('*');
    let foundMaps = 0;
    allElements.forEach((el) => {
      if (el.__gm_id || el.mapObject) {
        foundMaps++;
        console.log('   Found map instance on:', el.tagName, el.className);
      }
    });
    console.log('   Total map instances found:', foundMaps);
  }

  // 9. Instructions for manual testing
  console.log('\n=== Manual Testing Instructions ===');
  console.log('1. Click the Inspector button in GEE (usually top-right of map)');
  console.log('2. Click anywhere on the map');
  console.log('3. Observe the inspector panel that appears');
  console.log('4. Run this in console:');
  console.log('   document.querySelector(".inspector-panel, [class*=inspector]")');
  console.log('5. Inspect the element to see how data is displayed');

  // 10. Test: Simulate clicking at coordinates
  console.log('\n10. Test: How to simulate inspector at coordinates');
  console.log('To inspect at specific coordinates [lng, lat]:');
  console.log('  1. Enable Inspector tool first (click Inspector button)');
  console.log('  2. Find the map element');
  console.log('  3. Simulate click event at pixel position');
  console.log('  4. Read inspector panel data');

  return {
    inspectorPanel: !!inspectorPanel,
    inspectorButton: !!inspectorButton,
    mapElements: mapElements.length,
    eeAvailable: typeof ee !== 'undefined',
    googleMapsAvailable: !!(window.google && window.google.maps),
  };
})();
