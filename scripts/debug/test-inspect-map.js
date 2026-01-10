// Test inspectMap functionality
// Run this in Extension Service Worker Console

chrome.tabs.query({ url: '*://code.earthengine.google.com/*' }, (tabs) => {
  chrome.tabs.sendMessage(
    tabs[0].id,
    {
      type: 'INSPECT_MAP',
      coordinates: { lat: 42.3844, lng: -71.0987 },
    },
    (response) => {
      console.log('=== inspectMap Result ===');
      console.log('Success:', response.success);
      if (response.success) {
        console.log('Requested coords:', response.data.requestedCoordinates);
        console.log('Inspected coords:', response.data.inspectedCoordinates);
        console.log('Layers found:', response.data.layerCount);
        console.log('Layer data:');
        response.data.layers.forEach((layer, i) => {
          console.log('  Layer ' + (i + 1) + ': ' + layer.name);
          console.log('    Type: ' + layer.type);
          console.log('    Values:', layer.values);
        });
      } else {
        console.error('Error:', response.error);
      }
    }
  );
});
