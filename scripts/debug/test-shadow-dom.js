// Test script to check if GEE console is in Shadow DOM
// Run this in GEE browser console to test

console.log('🔍 Testing GEE Console DOM Structure...\n');

// Test 1: Check if .console-output exists
const consoleOutput = document.querySelector('.console-output');
console.log('1. Direct .console-output query:', consoleOutput ? '✅ Found' : '❌ Not found');

if (consoleOutput) {
  console.log('   - Tag:', consoleOutput.tagName);
  console.log('   - Classes:', consoleOutput.className);
  console.log('   - Children count:', consoleOutput.children.length);
  console.log(
    '   - Has Shadow Root?:',
    consoleOutput.shadowRoot ? 'Yes (mode: ' + consoleOutput.shadowRoot.mode + ')' : 'No'
  );
}

// Test 2: Find all shadow roots in the page
console.log('\n2. Searching for Shadow DOM hosts...');
const allElements = document.querySelectorAll('*');
let shadowCount = 0;
const shadowHosts = [];

allElements.forEach((el) => {
  if (el.shadowRoot) {
    shadowCount++;
    shadowHosts.push({
      tag: el.tagName,
      id: el.id,
      class: el.className,
      mode: el.shadowRoot.mode,
    });
  }
});

console.log(`   Found ${shadowCount} shadow roots:`);
shadowHosts.forEach((host, i) => {
  console.log(
    `   ${i + 1}. <${host.tag}> id="${host.id}" class="${host.class}" mode="${host.mode}"`
  );
});

// Test 3: Try to find console in shadow DOMs
console.log('\n3. Searching in Shadow DOMs for console...');
function searchInShadowDOM(root, depth = 0) {
  const indent = '   '.repeat(depth);

  // Try to find console-related elements
  const consoleElements = root.querySelectorAll('[class*="console"]');
  if (consoleElements.length > 0) {
    console.log(`${indent}✅ Found ${consoleElements.length} console-related elements`);
    consoleElements.forEach((el, i) => {
      console.log(`${indent}   ${i + 1}. <${el.tagName}> class="${el.className}"`);
    });
  }

  // Recurse into shadow DOMs
  const allEls = root.querySelectorAll('*');
  allEls.forEach((el) => {
    if (el.shadowRoot && el.shadowRoot.mode === 'open') {
      console.log(`${indent}🔍 Entering shadow DOM of <${el.tagName}>`);
      searchInShadowDOM(el.shadowRoot, depth + 1);
    }
  });
}

searchInShadowDOM(document);

// Test 4: Check console content structure
console.log('\n4. Analyzing console content structure...');
if (consoleOutput) {
  const allChildren = consoleOutput.querySelectorAll('*');
  console.log(`   Total elements inside console: ${allChildren.length}`);

  // Group by tag
  const tagCounts = {};
  allChildren.forEach((el) => {
    tagCounts[el.tagName] = (tagCounts[el.tagName] || 0) + 1;
  });

  console.log('   Element types:');
  Object.entries(tagCounts).forEach(([tag, count]) => {
    console.log(`     - ${tag}: ${count}`);
  });

  // Check for print outputs
  const printOutputs = consoleOutput.querySelectorAll(
    '[class*="print"], [class*="output"], .info, .success'
  );
  console.log(`\n   Print/output elements found: ${printOutputs.length}`);
  printOutputs.forEach((el, i) => {
    console.log(
      `     ${i + 1}. <${el.tagName}> class="${el.className}" text="${el.textContent?.substring(0, 50)}..."`
    );
  });
}

console.log('\n✅ Test complete!');
console.log('\n📋 Summary:');
console.log('   - Console accessible via querySelector: ' + (consoleOutput ? 'YES ✅' : 'NO ❌'));
console.log('   - Shadow DOM count: ' + shadowCount);
console.log(
  '   - Recommendation: ' +
    (consoleOutput ? 'Use direct DOM access' : 'Need Shadow DOM traversal or screenshot method')
);
