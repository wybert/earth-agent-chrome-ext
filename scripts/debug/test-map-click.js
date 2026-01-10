// Test clicking the map
// Run in GEE browser console

(function testMapClick() {
  console.log('=== Testing Map Click ===\n');

  // 1. Find map
  const mapElement = document.querySelector('.ui-map');
  if (!mapElement) {
    console.error('Map element not found!');
    return;
  }

  console.log('1. Map element found:', mapElement);

  // 2. Get map bounds
  const mapBounds = mapElement.getBoundingClientRect();
  console.log('2. Map bounds:', {
    left: mapBounds.left,
    top: mapBounds.top,
    width: mapBounds.width,
    height: mapBounds.height,
  });

  // 3. Calculate center point
  const centerX = mapBounds.left + mapBounds.width / 2;
  const centerY = mapBounds.top + mapBounds.height / 2;
  console.log('3. Map center in viewport:', { x: centerX, y: centerY });

  // 4. Create and dispatch click event
  console.log('4. Simulating click at map center...');

  const clickEvent = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX: centerX,
    clientY: centerY,
  });

  const clicked = mapElement.dispatchEvent(clickEvent);
  console.log('   Click dispatched:', clicked);

  // 5. Wait and check Inspector panel
  setTimeout(() => {
    const inspectPanel = document.querySelector('.inspect-panel');
    if (inspectPanel) {
      const text = inspectPanel.textContent;
      console.log('\n5. Inspector panel after click:');
      console.log('   Text preview:', text.substring(0, 200));

      if (text.includes('Point')) {
        console.log('   ✅ SUCCESS! Inspector shows data');
      } else if (text.includes('Click on the map')) {
        console.log('   ❌ FAILED: Still shows empty state');
        console.log('   This means click simulation did not work');
      }
    }
  }, 1000);

  console.log('\n6. Alternative: Try direct click on map');
  console.log('   Please click on the map MANUALLY');
  console.log('   Then check if Inspector shows data');

  return {
    mapFound: true,
    clickAttempted: true,
  };
})();
