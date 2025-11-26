// Test different methods to trigger Inspector
// Run in GEE browser console

(async function testClickMethods() {
  console.log('=== Testing Different Click Methods ===\n');

  const mapElement = document.querySelector('.ui-map');
  if (!mapElement) {
    console.error('Map not found!');
    return;
  }

  const mapBounds = mapElement.getBoundingClientRect();
  const centerX = mapBounds.left + mapBounds.width / 2;
  const centerY = mapBounds.top + mapBounds.height / 2;

  console.log('Testing at coordinates:', { x: centerX, y: centerY });

  // Method 1: MouseEvent with different settings
  console.log('\n1. Testing MouseEvent (standard)...');
  const evt1 = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX: centerX,
    clientY: centerY,
    button: 0
  });
  mapElement.dispatchEvent(evt1);
  await checkInspectorAfterDelay(500, 'Method 1');

  // Method 2: Try mousedown + mouseup sequence
  console.log('\n2. Testing mousedown + mouseup sequence...');
  const mousedown = new MouseEvent('mousedown', {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX: centerX,
    clientY: centerY,
    button: 0
  });
  const mouseup = new MouseEvent('mouseup', {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX: centerX,
    clientY: centerY,
    button: 0
  });
  const click = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX: centerX,
    clientY: centerY,
    button: 0
  });

  mapElement.dispatchEvent(mousedown);
  await new Promise(r => setTimeout(r, 10));
  mapElement.dispatchEvent(mouseup);
  await new Promise(r => setTimeout(r, 10));
  mapElement.dispatchEvent(click);
  await checkInspectorAfterDelay(500, 'Method 2');

  // Method 3: Try PointerEvent
  console.log('\n3. Testing PointerEvent...');
  const pointerEvent = new PointerEvent('click', {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX: centerX,
    clientY: centerY,
    button: 0,
    buttons: 1,
    isPrimary: true
  });
  mapElement.dispatchEvent(pointerEvent);
  await checkInspectorAfterDelay(500, 'Method 3');

  // Method 4: Find Google Map instance and trigger event directly
  console.log('\n4. Testing Google Maps API method...');
  console.log('   Checking for Google Maps instance...');

  // Try to find the map instance
  let gmap = null;
  if (mapElement.gMap) {
    gmap = mapElement.gMap;
  } else if (window.Map) {
    gmap = window.Map;
  }

  if (gmap && gmap.getProjection) {
    console.log('   ✓ Found Google Map instance');
    console.log('   Zoom:', gmap.getZoom ? gmap.getZoom() : 'N/A');
    console.log('   Center:', gmap.getCenter ? gmap.getCenter() : 'N/A');

    // Try to trigger a click event on the map
    if (typeof google !== 'undefined' && google.maps && google.maps.event) {
      console.log('   Trying google.maps.event.trigger...');
      const center = gmap.getCenter();
      google.maps.event.trigger(gmap, 'click', {
        latLng: center
      });
      await checkInspectorAfterDelay(500, 'Method 4');
    }
  } else {
    console.log('   ✗ Could not find Google Map instance');
  }

  console.log('\n=== Test Complete ===');
  console.log('If none worked, Inspector might use a custom event system');

  async function checkInspectorAfterDelay(ms, methodName) {
    await new Promise(r => setTimeout(r, ms));
    const panel = document.querySelector('.inspect-panel');
    if (panel) {
      const text = panel.textContent;
      if (text.includes('Point')) {
        console.log(`   ✅ ${methodName} SUCCESS!`);
        return true;
      } else {
        console.log(`   ❌ ${methodName} failed`);
        return false;
      }
    }
  }
})();
