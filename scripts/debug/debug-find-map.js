// 🔍 手动调试：逐步查找地图实例
// 在 GEE 控制台运行

(function debugFindMap() {
  console.log('🔍 === Manual Map Instance Debug ===\n');

  const mapElement = document.querySelector('.ui-map');
  if (!mapElement) {
    console.error('❌ Map element not found!');
    return;
  }

  console.log('✅ Map element found\n');

  // ============================================
  // Step 1: 列出 mapElement 的所有属性
  // ============================================
  console.log('📋 Step 1: All mapElement properties\n');

  const allKeys = [];
  for (let key in mapElement) {
    allKeys.push(key);
  }

  console.log(`Total properties: ${allKeys.length}`);

  // 按类型分组
  const groups = {
    react: allKeys.filter((k) => k.includes('react') || k.includes('React')),
    angular: allKeys.filter((k) => k.includes('ng') || k.includes('angular')),
    data: allKeys.filter((k) => k.startsWith('data-') || k.startsWith('__data')),
    underscore: allKeys.filter((k) => k.startsWith('_') && !k.startsWith('__')),
    doubleUnderscore: allKeys.filter((k) => k.startsWith('__')),
    map: allKeys.filter((k) => k.toLowerCase().includes('map')),
    other: [],
  };

  // 找出不在任何组的
  groups.other = allKeys.filter(
    (k) =>
      !groups.react.includes(k) &&
      !groups.angular.includes(k) &&
      !groups.data.includes(k) &&
      !groups.underscore.includes(k) &&
      !groups.doubleUnderscore.includes(k) &&
      !groups.map.includes(k)
  );

  Object.entries(groups).forEach(([name, keys]) => {
    if (keys.length > 0) {
      console.log(`\n${name} (${keys.length}):`);
      keys.forEach((key) => {
        const value = mapElement[key];
        const type = typeof value;
        const constructor = value?.constructor?.name;

        console.log(
          `  ${key}: ${type}${constructor && constructor !== 'Object' ? ` (${constructor})` : ''}`
        );

        // 检查是否是地图实例
        if (value && type === 'object') {
          const methods = ['getProjection', 'getCenter', 'getZoom', 'getBounds'];
          const hasMethods = methods.filter((m) => typeof value[m] === 'function');
          if (hasMethods.length > 0) {
            console.log(`    🎯 HAS MAP METHODS: ${hasMethods.join(', ')}`);
          }
        }
      });
    }
  });

  // ============================================
  // Step 2: 检查子元素
  // ============================================
  console.log('\n\n📋 Step 2: Checking child elements\n');

  const children = mapElement.children;
  console.log(`Children count: ${children.length}`);

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    console.log(`\nChild ${i}:`);
    console.log(`  Tag: ${child.tagName}`);
    console.log(`  Class: ${child.className}`);
    console.log(`  ID: ${child.id || 'none'}`);

    // 检查子元素的属性
    for (let key in child) {
      const value = child[key];
      if (value && typeof value === 'object') {
        const methods = ['getProjection', 'getCenter', 'getZoom'];
        const hasMethods = methods.filter((m) => typeof value[m] === 'function');
        if (hasMethods.length > 0) {
          console.log(`  🎯 FOUND in child.${key}: ${hasMethods.join(', ')}`);
        }
      }
    }
  }

  // ============================================
  // Step 3: 检查 window 对象
  // ============================================
  console.log('\n\n📋 Step 3: Checking window object\n');

  const windowKeys = Object.keys(window).filter(
    (k) =>
      k.toLowerCase().includes('map') ||
      k.toLowerCase().includes('gee') ||
      k.toLowerCase().includes('earth')
  );

  console.log('Map/GEE/Earth related window properties:');
  windowKeys.forEach((key) => {
    const value = window[key];
    const type = typeof value;
    console.log(`  window.${key}: ${type}`);

    if (value && type === 'object') {
      const methods = ['getProjection', 'getCenter', 'getZoom'];
      const hasMethods = methods.filter((m) => typeof value[m] === 'function');
      if (hasMethods.length > 0) {
        console.log(`    🎯 HAS MAP METHODS: ${hasMethods.join(', ')}`);
      }
    }
  });

  // ============================================
  // Step 4: 手动测试特定路径
  // ============================================
  console.log('\n\n📋 Step 4: Testing specific paths\n');

  const testPaths = [
    'mapElement.__reactProps',
    'mapElement._reactProps',
    'mapElement.__reactInternalInstance',
    'mapElement._owner',
    'window.ee.Map',
    'window.ee.MapWidget',
    'window.geeMap',
    'window.earthEngineMap',
  ];

  testPaths.forEach((path) => {
    try {
      const parts = path.split('.');
      let obj = parts[0] === 'window' ? window : mapElement;
      let currentPath = parts[0];

      for (let i = 1; i < parts.length; i++) {
        obj = obj?.[parts[i]];
        currentPath += '.' + parts[i];
        if (!obj) break;
      }

      if (obj) {
        console.log(`✅ ${path}: exists`);
        console.log(`   Type: ${typeof obj}`);

        if (typeof obj === 'object') {
          const methods = ['getProjection', 'getCenter', 'getZoom', 'getBounds'];
          const hasMethods = methods.filter((m) => typeof obj[m] === 'function');
          if (hasMethods.length > 0) {
            console.log(`   🎯 HAS: ${hasMethods.join(', ')}`);
          }

          // 列出所有方法
          const allMethods = Object.getOwnPropertyNames(obj)
            .filter((k) => typeof obj[k] === 'function')
            .slice(0, 10);
          if (allMethods.length > 0) {
            console.log(`   Methods: ${allMethods.join(', ')}`);
          }
        }
      } else {
        console.log(`❌ ${path}: not found`);
      }
    } catch (e) {
      console.log(`❌ ${path}: error - ${e.message}`);
    }
  });

  // ============================================
  // Step 5: 使用 Google Maps API 直接创建
  // ============================================
  console.log('\n\n📋 Step 5: Attempting to access via Google Maps API\n');

  if (window.google?.maps) {
    console.log('✅ Google Maps API available');

    // 检查是否有全局的 Map 实例数组
    console.log('\nChecking for global Map instances:');

    // 尝试获取所有 iframe（Google Maps 有时在 iframe 中）
    const iframes = document.querySelectorAll('iframe');
    console.log(`Found ${iframes.length} iframes`);

    iframes.forEach((iframe, i) => {
      try {
        console.log(`  iframe ${i}: src="${iframe.src?.substring(0, 50)}..."`);

        // 尝试访问 iframe 内容（可能会因为同源策略失败）
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc) {
          console.log(`    ✅ Can access iframe content`);
        }
      } catch (e) {
        console.log(`    ❌ Cannot access iframe (cross-origin)`);
      }
    });

    // 检查 DOM 事件监听器
    console.log('\n🎯 Attempting alternative approach...');
    console.log('Looking for map through event listeners...');

    // 创建一个测试点击来触发事件
    console.log('\n💡 Suggestion: Manually click on the map now');
    console.log('   Then check Inspector to see what coordinates appear');
    console.log('   This will help us verify the map is working\n');
  } else {
    console.error('❌ Google Maps API not available');
  }

  // ============================================
  // Step 6: 总结和建议
  // ============================================
  console.log('\n📋 === Summary ===\n');

  console.log('Map instance search completed.');
  console.log('\nNext actions:');
  console.log('1. Review the output above for any 🎯 markers');
  console.log('2. If found, tell me the path (e.g., "mapElement.__someProperty")');
  console.log("3. If not found, we'll use an alternative approach\n");

  console.log('Alternative approaches if map instance not found:');
  console.log('- Inject code into page context (bypasses isolated world)');
  console.log('- Use visual markers to guide user clicks');
  console.log('- Monitor map pan/zoom events to track coordinates\n');

  return {
    mapElement,
    allKeys,
    groups,
  };
})();
