// Debug inspectMap - Run this in GEE browser console (F12)
// This will help us see what's happening

(function debugInspectMap() {
  console.log('=== Debugging inspectMap ===\n');

  // 1. Check if Inspector panel exists
  console.log('1. Checking for Inspector panel...');
  const inspectPanel = document.querySelector('.inspect-panel');
  console.log('   Inspector panel:', inspectPanel ? 'FOUND' : 'NOT FOUND');

  if (inspectPanel) {
    console.log('   Panel HTML length:', inspectPanel.innerHTML.length);
    console.log('   Panel text preview:', inspectPanel.textContent.substring(0, 200));

    // 2. Check for point header
    console.log('\n2. Checking for point coordinates...');
    const pointHeader = inspectPanel.querySelector('.explorer .header');
    console.log('   Point header element:', pointHeader ? 'FOUND' : 'NOT FOUND');
    if (pointHeader) {
      console.log('   Point header text:', pointHeader.textContent);
    }

    // 3. Check for inspect views
    console.log('\n3. Checking for layer data...');
    const inspectViews = inspectPanel.querySelectorAll('.inspect-view');
    console.log('   Inspect views found:', inspectViews.length);

    inspectViews.forEach((view, i) => {
      console.log(`\n   View ${i+1}:`);
      const labelEl = view.querySelector('.header .label');
      const messageEl = view.querySelector('.header .message');
      console.log('     Label:', labelEl ? labelEl.textContent : 'NOT FOUND');
      console.log('     Message:', messageEl ? messageEl.textContent : 'NOT FOUND');

      const trivials = view.querySelectorAll('.trivial');
      console.log('     Trivial elements:', trivials.length);
      trivials.forEach((t, j) => {
        console.log(`       Trivial ${j+1}:`, t.textContent.substring(0, 100));
      });
    });
  } else {
    console.log('\n⚠️ Inspector panel not found!');
    console.log('Please:');
    console.log('  1. Click the "Inspector" tab in GEE');
    console.log('  2. Click somewhere on the map');
    console.log('  3. Run this script again');
  }

  // 4. Check Inspector tab status
  console.log('\n4. Looking for Inspector tab...');
  const allTabs = document.querySelectorAll('[role="tab"], .tab, button');
  const inspectorTab = Array.from(allTabs).find(el =>
    el.textContent?.toLowerCase().includes('inspector')
  );
  console.log('   Inspector tab:', inspectorTab ? 'FOUND' : 'NOT FOUND');
  if (inspectorTab) {
    console.log('   Tab text:', inspectorTab.textContent);
    console.log('   Tab is button?:', inspectorTab.tagName === 'BUTTON');
  }

  // 5. Check map element
  console.log('\n5. Checking map element...');
  const mapElement = document.querySelector('.ui-map');
  console.log('   Map element:', mapElement ? 'FOUND' : 'NOT FOUND');

  return {
    inspectPanelExists: !!inspectPanel,
    inspectorTabExists: !!inspectorTab,
    mapExists: !!mapElement
  };
})();
