// 🔍 探测 Google Earth Engine 的坐标转换 API
// 在 GEE 浏览器控制台 (F12) 运行此脚本
// 目的：找到内部的 latLng ↔ pixel 转换函数

(function exploreGEECoordinateAPI() {
  console.log('🔍 === Exploring GEE Coordinate Conversion API ===\n');

  // ============================================
  // Part 1: 检查全局对象
  // ============================================
  console.log('📦 Part 1: Checking Global Objects\n');

  const globalObjects = ['ee', 'Map', 'google', 'goog', 'geeMap'];
  globalObjects.forEach((name) => {
    if (window[name]) {
      console.log(`✅ Found: window.${name}`);
      console.log(`   Type: ${typeof window[name]}`);
      console.log(`   Constructor: ${window[name].constructor?.name || 'N/A'}`);

      // 列出所有方法
      if (typeof window[name] === 'object') {
        const methods = Object.getOwnPropertyNames(window[name]).filter(
          (key) => typeof window[name][key] === 'function'
        );
        if (methods.length > 0) {
          console.log(`   Methods (${methods.length}):`, methods.slice(0, 10));
        }
      }
      console.log('');
    }
  });

  // ============================================
  // Part 2: 检查地图元素
  // ============================================
  console.log('\n🗺️  Part 2: Inspecting Map Element\n');

  const mapElement = document.querySelector('.ui-map');
  if (!mapElement) {
    console.error('❌ Map element not found!');
    return;
  }

  console.log('✅ Map element found');
  console.log('   Class:', mapElement.className);
  console.log('   ID:', mapElement.id || 'N/A');

  // 检查所有属性
  console.log('\n📋 Map Element Properties:');
  const allProps = [];
  for (let key in mapElement) {
    allProps.push(key);
  }

  // 按类型分类
  const dataProps = allProps.filter((k) => k.startsWith('data-') || k.startsWith('__'));
  const reactProps = allProps.filter((k) => k.includes('react') || k.includes('React'));
  const mapProps = allProps.filter((k) => k.toLowerCase().includes('map'));
  const geeProps = allProps.filter(
    (k) => k.toLowerCase().includes('gee') || k.toLowerCase().includes('earth')
  );

  if (dataProps.length > 0) console.log('   Data props:', dataProps);
  if (reactProps.length > 0) console.log('   React props:', reactProps);
  if (mapProps.length > 0) console.log('   Map-related props:', mapProps);
  if (geeProps.length > 0) console.log('   GEE-related props:', geeProps);

  // ============================================
  // Part 3: 查找 Google Maps 实例
  // ============================================
  console.log('\n🌍 Part 3: Looking for Google Maps Instance\n');

  // 尝试多种方式找到 Map 对象
  const mapCandidates = [
    { name: 'mapElement.map', obj: mapElement.map },
    { name: 'mapElement.gMap', obj: mapElement.gMap },
    { name: 'mapElement.googleMap', obj: mapElement.googleMap },
    { name: 'window.google?.maps?.Map', obj: window.google?.maps?.Map },
  ];

  mapCandidates.forEach(({ name, obj }) => {
    if (obj) {
      console.log(`✅ Found: ${name}`);
      console.log(`   Type: ${typeof obj}`);

      // 检查是否有地图方法
      const mapMethods = [
        'getProjection',
        'getBounds',
        'getCenter',
        'getZoom',
        'latLngToPixel',
        'pixelToLatLng',
      ];
      mapMethods.forEach((method) => {
        if (typeof obj[method] === 'function') {
          console.log(`   ✓ Has method: ${method}`);
        }
      });
      console.log('');
    }
  });

  // ============================================
  // Part 4: 监控 Inspector 更新
  // ============================================
  console.log('\n👁️  Part 4: Setting up Inspector Monitor\n');

  const inspectPanel = document.querySelector('.inspect-panel');
  if (!inspectPanel) {
    console.warn('⚠️  Inspector panel not found - activate Inspector tab first');
  } else {
    console.log('✅ Inspector panel found - setting up monitor...');
    console.log('   💡 Now manually CLICK on the map');
    console.log('   💡 The call stack will show which functions are triggered\n');

    const observer = new MutationObserver((mutations) => {
      console.log('🔔 Inspector updated!');
      console.log('   Mutations:', mutations.length);

      // 打印调用栈
      console.log('   📞 Call stack:');
      console.trace();

      // 读取新坐标
      const pointHeader = inspectPanel.querySelector('.explorer .header');
      if (pointHeader) {
        console.log('   📍 New coordinates:', pointHeader.textContent);
      }

      console.log('');
    });

    observer.observe(inspectPanel, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    console.log('✅ Monitor active - waiting for map clicks...\n');
  }

  // ============================================
  // Part 5: 尝试读取地图状态
  // ============================================
  console.log('\n📊 Part 5: Reading Map State\n');

  // 尝试获取当前地图信息
  try {
    const mapBounds = mapElement.getBoundingClientRect();
    console.log('Map viewport:', {
      left: mapBounds.left,
      top: mapBounds.top,
      width: mapBounds.width,
      height: mapBounds.height,
      centerX: mapBounds.left + mapBounds.width / 2,
      centerY: mapBounds.top + mapBounds.height / 2,
    });

    // 检查 Google Maps API
    if (window.google?.maps) {
      console.log('\n✅ Google Maps API available');
      console.log('   Version:', window.google.maps.version || 'N/A');

      // 尝试创建坐标转换示例
      console.log('\n🧪 Testing coordinate conversion:');

      const testLat = 42.3844;
      const testLng = -71.0987;
      console.log(`   Input: (${testLat}, ${testLng})`);

      // 创建 LatLng 对象
      const latLng = new google.maps.LatLng(testLat, testLng);
      console.log('   LatLng object created:', latLng.toString());

      // 如果能找到地图实例，尝试转换
      // (这部分需要实际的地图实例，我们留作占位符)
      console.log('   ⚠️  Need map instance to convert to pixels');
    }
  } catch (error) {
    console.error('Error reading map state:', error);
  }

  // ============================================
  // Part 6: 查找事件监听器
  // ============================================
  console.log('\n🎯 Part 6: Analyzing Event Listeners\n');

  function getEventListeners(element) {
    // Chrome DevTools 提供的函数（只在控制台有效）
    if (typeof getEventListeners === 'function') {
      return getEventListeners(element);
    } else {
      console.warn('   ⚠️  getEventListeners not available (try Chrome DevTools)');
      return null;
    }
  }

  const listeners = getEventListeners(mapElement);
  if (listeners) {
    console.log('Event listeners on map element:');
    Object.keys(listeners).forEach((eventType) => {
      console.log(`   ${eventType}: ${listeners[eventType].length} listener(s)`);

      // 显示点击事件的详细信息
      if (eventType === 'click' && listeners[eventType].length > 0) {
        console.log('   📍 Click listener details:');
        listeners[eventType].forEach((listener, i) => {
          console.log(`      Listener ${i + 1}:`, {
            useCapture: listener.useCapture,
            passive: listener.passive,
            once: listener.once,
            type: listener.type,
          });
        });
      }
    });
  }

  // ============================================
  // Part 7: 提供测试函数
  // ============================================
  console.log('\n🧰 Part 7: Test Functions Available\n');

  // 将测试函数挂载到 window
  window.testLatLngToPixel = function (lat, lng) {
    console.log(`\n🧪 Testing conversion: (${lat}, ${lng}) → (x, y)`);

    const mapBounds = mapElement.getBoundingClientRect();

    // 方法 1: 简单的地图中心
    const centerX = mapBounds.left + mapBounds.width / 2;
    const centerY = mapBounds.top + mapBounds.height / 2;
    console.log(`   Map center (simplified): (${centerX}, ${centerY})`);

    // 方法 2: 如果有 Google Maps API
    if (window.google?.maps) {
      const latLng = new google.maps.LatLng(lat, lng);
      console.log(`   LatLng created: ${latLng.toString()}`);

      // 尝试从全局找地图实例
      let mapInstance = null;
      if (window.Map && typeof window.Map.getProjection === 'function') {
        mapInstance = window.Map;
        console.log('   ✅ Found map instance: window.Map');
      } else if (mapElement.map) {
        mapInstance = mapElement.map;
        console.log('   ✅ Found map instance: mapElement.map');
      }

      if (mapInstance) {
        try {
          const projection = mapInstance.getProjection();
          const bounds = mapInstance.getBounds();
          const zoom = mapInstance.getZoom();

          console.log('   Map info:', {
            zoom,
            bounds: bounds.toString(),
            center: mapInstance.getCenter().toString(),
          });

          // 实际的投影转换
          // (这里需要更复杂的数学，留作占位符)
          console.log('   ⚠️  Full conversion requires more complex math');
        } catch (error) {
          console.error('   ❌ Error accessing map properties:', error);
        }
      } else {
        console.warn('   ⚠️  Could not find map instance');
      }
    }

    return { centerX, centerY };
  };

  console.log('✅ Test function available: testLatLngToPixel(lat, lng)');
  console.log('   Example: testLatLngToPixel(42.3844, -71.0987)\n');

  // ============================================
  // 总结
  // ============================================
  console.log('\n📋 === Summary ===\n');
  console.log('Next steps:');
  console.log('1. Manually click on the map to see Inspector update stack trace');
  console.log('2. Run: testLatLngToPixel(42.3844, -71.0987)');
  console.log('3. Check if window.Map or mapElement has conversion methods');
  console.log('4. Look for "latLng", "pixel", "projection" in property names\n');

  return {
    mapElement,
    inspectPanel,
    testLatLngToPixel: window.testLatLngToPixel,
  };
})();
