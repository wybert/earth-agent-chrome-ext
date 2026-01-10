// ⚠️ RUN THIS IN EXTENSION SERVICE WORKER CONSOLE ⚠️
// (Right-click extension icon → Inspect → Console tab)
//
// ⚠️ BEFORE RUNNING:
// 1. Open GEE tab (code.earthengine.google.com)
// 2. Activate Inspector tab (right side panel)
// 3. Manually click on the map where you want to inspect
// 4. THEN run this test

chrome.tabs.query({ url: '*://code.earthengine.google.com/*' }, (tabs) => {
  if (tabs.length === 0) {
    console.error('No GEE tab found! Open code.earthengine.google.com first');
    return;
  }

  console.log('Testing inspectMap (reading existing Inspector data)...');
  console.log('💡 Make sure you clicked on the map first!\n');

  chrome.tabs.sendMessage(
    tabs[0].id,
    {
      type: 'INSPECT_MAP',
      // Coordinates are optional - tool will read whatever is in Inspector
      coordinates: { lat: 42.3844, lng: -71.0987 },
    },
    (response) => {
      console.log('\n=== inspectMap Result ===');
      console.log('Success:', response.success);

      if (response.success) {
        console.log('\n✅ Successfully read Inspector data:');
        console.log('Requested coords:', response.data.requestedCoordinates);
        console.log('Inspected coords:', response.data.inspectedCoordinates);
        console.log('Layers found:', response.data.layerCount);

        response.data.layers.forEach((layer, i) => {
          console.log('\nLayer ' + (i + 1) + ':', layer.name);
          console.log('  Type:', layer.type);
          console.log('  Values:', layer.values);
        });
      } else {
        console.error('\n❌ Error:', response.error);

        if (response.error.includes('Inspector is empty')) {
          console.log('\n💡 Solution: Click on the map first, then run this test again');
        } else if (response.error.includes('different from requested')) {
          console.log('\n💡 Solution: Click on the correct location on the map');
          if (response.data) {
            console.log('   Requested:', response.data.requestedCoordinates);
            console.log('   Found:', response.data.inspectedCoordinates);
          }
        }
      }

      console.log('\n💡 TIP: Check GEE browser console (F12) for detailed logs');
    }
  );
});
