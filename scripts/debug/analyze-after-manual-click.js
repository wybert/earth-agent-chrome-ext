// Run this AFTER manually clicking the map
// This will show us what changed

(function analyzeAfterClick() {
  console.log('=== Analyzing After Manual Click ===\n');

  const inspectPanel = document.querySelector('.inspect-panel');
  if (!inspectPanel) {
    console.error('Inspector panel not found!');
    return;
  }

  console.log('1. Inspector panel text:');
  console.log(inspectPanel.textContent.substring(0, 300));

  console.log('\n2. Inspector panel HTML:');
  console.log(inspectPanel.innerHTML.substring(0, 500));

  console.log('\n3. Point coordinates:');
  const pointHeader = inspectPanel.querySelector('.explorer .header');
  console.log('   Point header:', pointHeader ? pointHeader.textContent : 'NOT FOUND');

  console.log('\n4. Inspect views:');
  const inspectViews = inspectPanel.querySelectorAll('.inspect-view');
  console.log('   Count:', inspectViews.length);

  inspectViews.forEach((view, i) => {
    console.log(`\n   View ${i + 1}:`);
    const label = view.querySelector('.header .label');
    const message = view.querySelector('.header .message');
    console.log('     Layer:', label ? label.textContent : 'N/A');
    console.log('     Type:', message ? message.textContent : 'N/A');

    const trivials = view.querySelectorAll('.trivial');
    console.log('     Values:', trivials.length);
    trivials.forEach((t, j) => {
      console.log(`       ${j}: ${t.textContent}`);
    });
  });

  console.log("\n5. Now let's try to understand what triggered it...");
  console.log('   Check the Network tab or Event Listeners');

  return {
    hasData: inspectPanel.textContent.length > 100,
    viewCount: inspectViews.length,
  };
})();
