// ⚠️ RUN THIS IN EXTENSION SERVICE WORKER CONSOLE ⚠️
// (Right-click extension icon → Inspect → Console tab)

chrome.tabs.query({url: "*://code.earthengine.google.com/*"}, (tabs) => {
  if (tabs.length === 0) {
    console.error('No GEE tab found! Open code.earthengine.google.com first');
    return;
  }

  console.log('Sending INSPECT_MAP message to GEE tab...');

  chrome.tabs.sendMessage(tabs[0].id, {
    type: 'INSPECT_MAP',
    coordinates: { lat: 42.3844, lng: -71.0987 }
  }, (response) => {
    console.log('\n=== inspectMap Result ===');
    console.log('Success:', response.success);

    if (response.success) {
      console.log('\nRequested coords:', response.data.requestedCoordinates);
      console.log('Inspected coords:', response.data.inspectedCoordinates);
      console.log('Layers found:', response.data.layerCount);

      response.data.layers.forEach((layer, i) => {
        console.log('\nLayer ' + (i+1) + ':', layer.name);
        console.log('  Type:', layer.type);
        console.log('  Values:', layer.values);
      });
    } else {
      console.error('\nError:', response.error);
    }

    console.log('\n💡 TIP: Check GEE browser console (F12) for detailed logs');
  });
});
