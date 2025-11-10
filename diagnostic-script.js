// 诊断脚本 - 在Extension的Background Service Worker Console中运行
// 打开方式: chrome://extensions → 找到你的extension → 点击 "service worker"

(async function diagnose() {
  console.log('🔍 Starting Earth Engine Extension Diagnostic...\n');

  // 1. 查找GEE标签页
  console.log('Step 1: Finding GEE tabs...');
  const tabs = await chrome.tabs.query({ url: "*://code.earthengine.google.com/*" });

  if (tabs.length === 0) {
    console.log('❌ No GEE tab found. Please open https://code.earthengine.google.com/');
    return;
  }

  console.log(`✅ Found ${tabs.length} GEE tab(s)`);
  const tab = tabs[0];
  console.log(`   Tab ID: ${tab.id}, URL: ${tab.url}\n`);

  // 2. 测试PING
  console.log('Step 2: Testing content script with PING...');
  try {
    const pingResponse = await new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tab.id, { type: 'PING' }, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
    console.log('✅ PING successful:', pingResponse);
  } catch (error) {
    console.log('❌ PING failed:', error.message);
    console.log('   Content script may not be loaded. Trying to inject...\n');

    // 尝试注入content script
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
      console.log('✅ Content script injected successfully');

      // 等待一下让content script初始化
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (injectError) {
      console.log('❌ Failed to inject content script:', injectError.message);
      return;
    }
  }

  // 3. 测试EDIT_SCRIPT
  console.log('\nStep 3: Testing EDIT_SCRIPT...');
  const testCode = `// Diagnostic test injection
var geometry = ee.Geometry.Point([-71.0589, 42.3601]); // Boston
Map.setCenter(-71.0589, 42.3601, 10);
print('✅ EDIT_SCRIPT diagnostic test successful!');
print('If you see this, the extension is working correctly.');`;

  try {
    const editResponse = await new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tab.id, {
        type: 'EDIT_SCRIPT',
        scriptId: 'current',
        content: testCode
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });

    console.log('✅ EDIT_SCRIPT response:', editResponse);

    if (editResponse.success) {
      console.log('\n✅ SUCCESS: Editor should now contain the test code!');
      console.log('   Check the GEE Code Editor to verify.');
    } else {
      console.log('\n❌ EDIT_SCRIPT reported failure:', editResponse.error);
    }
  } catch (error) {
    console.log('❌ EDIT_SCRIPT failed:', error.message);
  }

  // 4. 测试RUN_CODE
  console.log('\nStep 4: Testing RUN_CODE...');
  try {
    const runResponse = await new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tab.id, {
        type: 'RUN_CODE'
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });

    console.log('✅ RUN_CODE response:', runResponse);

    if (runResponse.success) {
      console.log('\n✅ SUCCESS: Code executed!');
      console.log('   Check the GEE Console and Map to see the results.');
    } else {
      console.log('\n❌ RUN_CODE reported failure:', runResponse.error);
    }
  } catch (error) {
    console.log('❌ RUN_CODE failed:', error.message);
  }

  // 5. 获取页面信息用于进一步诊断
  console.log('\nStep 5: Gathering page information...');
  try {
    const pageInfo = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        return {
          hasAceEditor: document.querySelectorAll('.ace_editor').length > 0,
          aceEditorCount: document.querySelectorAll('.ace_editor').length,
          hasMonacoEditor: document.querySelectorAll('.monaco-editor').length > 0,
          monacoEditorCount: document.querySelectorAll('.monaco-editor').length,
          hasWindowAce: typeof (window as any).ace !== 'undefined',
          hasWindowMonaco: typeof (window as any).monaco !== 'undefined',
          contentScriptLoaded: !!(window as any)['earth-engine-ai-assistant-content-script'],
          contentScriptTimestamp: (window as any)['earth-engine-ai-assistant-content-script'],
          url: window.location.href,
          title: document.title
        };
      }
    });

    const info = pageInfo[0].result;
    console.log('📊 Page Information:');
    console.log('   URL:', info.url);
    console.log('   Title:', info.title);
    console.log('   Ace Editor:', info.hasAceEditor, `(${info.aceEditorCount} elements)`);
    console.log('   Monaco Editor:', info.hasMonacoEditor, `(${info.monacoEditorCount} elements)`);
    console.log('   window.ace:', info.hasWindowAce);
    console.log('   window.monaco:', info.hasWindowMonaco);
    console.log('   Content Script Loaded:', info.contentScriptLoaded);
    if (info.contentScriptTimestamp) {
      console.log('   Content Script Timestamp:', new Date(info.contentScriptTimestamp).toISOString());
    }
  } catch (error) {
    console.log('❌ Failed to gather page info:', error.message);
  }

  console.log('\n🏁 Diagnostic completed!');
})();
