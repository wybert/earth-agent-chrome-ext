// Run this script in the Chrome Extension Background Console
// Right-click extension icon -> Inspect service worker -> Console

console.log('=== Testing Tab Status Indicator ===');

// Test 1: Check if message handler exists
console.log('\n1. Testing GET_TARGET_TAB_STATUS message...');

chrome.runtime.sendMessage(
  { type: 'GET_TARGET_TAB_STATUS' },
  (response) => {
    if (chrome.runtime.lastError) {
      console.error('❌ Error:', chrome.runtime.lastError);
      return;
    }

    console.log('✅ Response received:', response);

    if (response.success) {
      console.log('✅ Message handler working!');
      console.log('   - Has GEE Tab:', response.hasGEETab);
      console.log('   - Is Active Tab:', response.isActiveTab);
      console.log('   - Selected Tab ID:', response.selectedTabId);
      console.log('   - Selected Tab Title:', response.selectedTabTitle);
      console.log('   - Total GEE Tabs:', response.totalGEETabs);
    } else {
      console.error('❌ Request failed:', response.error);
    }
  }
);

// Test 2: List all GEE tabs
console.log('\n2. Listing all Google Earth Engine tabs...');

chrome.tabs.query(
  { url: "*://code.earthengine.google.com/*" },
  (tabs) => {
    console.log(`Found ${tabs.length} GEE tab(s):`);
    tabs.forEach((tab, index) => {
      console.log(`   ${index + 1}. Tab ${tab.id}:`);
      console.log(`      - Active: ${tab.active}`);
      console.log(`      - Title: ${tab.title}`);
      console.log(`      - Last Accessed: ${tab.lastAccessed}`);
      console.log(`      - Window ID: ${tab.windowId}`);
    });
  }
);

// Test 3: Check active tab
console.log('\n3. Checking active tab...');

chrome.tabs.query(
  { active: true, currentWindow: true },
  (tabs) => {
    if (tabs.length > 0) {
      const tab = tabs[0];
      console.log('Active tab:');
      console.log(`   - Tab ${tab.id}: ${tab.title}`);
      console.log(`   - URL: ${tab.url}`);
      console.log(`   - Is GEE: ${tab.url?.includes('code.earthengine.google.com')}`);
    } else {
      console.log('❌ No active tab found');
    }
  }
);

console.log('\n=== Test Complete ===');
console.log('If you see errors above, please share them.');
