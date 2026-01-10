// 🎯 专门寻找 Google Maps 实例和坐标转换方法
// 在 GEE 浏览器控制台运行

(function findMapInstance() {
  console.log('🎯 === Finding Google Maps Instance ===\n');

  const mapElement = document.querySelector('.ui-map');
  if (!mapElement) {
    console.error('❌ Map element not found!');
    return;
  }

  // ============================================
  // Part 1: 深度搜索所有可能的地图实例
  // ============================================
  console.log('🔍 Part 1: Deep Search for Map Instance\n');

  function searchForMapInstance(obj, path = '', depth = 0, visited = new Set()) {
    if (depth > 3 || !obj || visited.has(obj)) return null;
    visited.add(obj);

    // 检查是否是 Google Maps 实例
    if (obj.constructor?.name === 'Map' || obj instanceof google.maps.Map) {
      console.log(`✅ FOUND Google Maps instance at: ${path}`);
      return { path, instance: obj };
    }

    // 检查常见的方法
    const mapMethods = ['getProjection', 'getBounds', 'getCenter', 'getZoom'];
    const hasMapMethods = mapMethods.filter((m) => typeof obj[m] === 'function');
    if (hasMapMethods.length >= 3) {
      console.log(`✅ FOUND map-like object at: ${path}`);
      console.log(`   Has methods: ${hasMapMethods.join(', ')}`);
      return { path, instance: obj };
    }

    // 递归搜索
    try {
      for (let key in obj) {
        if (key.startsWith('_') || key.includes('map') || key.includes('Map')) {
          const result = searchForMapInstance(obj[key], `${path}.${key}`, depth + 1, visited);
          if (result) return result;
        }
      }
    } catch (e) {
      // Ignore errors
    }

    return null;
  }

  // 搜索多个起点
  const searchPaths = [
    { name: 'mapElement', obj: mapElement },
    { name: 'window', obj: window },
  ];

  let mapInstance = null;
  for (let { name, obj } of searchPaths) {
    console.log(`Searching from ${name}...`);
    const result = searchForMapInstance(obj, name, 0);
    if (result) {
      mapInstance = result.instance;
      console.log(`\n✅ Found map instance via: ${result.path}\n`);
      break;
    }
  }

  if (!mapInstance) {
    console.warn('⚠️  Could not find map instance automatically');
    console.log('   Trying alternative methods...\n');
  }

  // ============================================
  // Part 2: 尝试所有可能的访问路径
  // ============================================
  console.log('🔍 Part 2: Trying All Possible Access Paths\n');

  const candidates = [
    () => window.Map,
    () => window.map,
    () => window.geeMap,
    () => window.earthEngineMap,
    () => mapElement.map,
    () => mapElement.gMap,
    () => mapElement.googleMap,
    () => mapElement.__map,
    () => mapElement._map,
    // React/Angular 框架属性
    () => {
      const reactKey = Object.keys(mapElement).find((k) => k.startsWith('__react'));
      return reactKey ? mapElement[reactKey]?.memoizedProps?.map : null;
    },
    () => {
      const angularKey = Object.keys(mapElement).find((k) => k.startsWith('__ng'));
      return angularKey ? mapElement[angularKey]?.map : null;
    },
  ];

  candidates.forEach((getter, i) => {
    try {
      const obj = getter();
      if (obj) {
        console.log(`✅ Candidate ${i + 1}:`, obj);
        console.log(`   Constructor: ${obj.constructor?.name}`);

        // 检查是否有地图方法
        ['getProjection', 'getBounds', 'getCenter', 'getZoom'].forEach((method) => {
          if (typeof obj[method] === 'function') {
            console.log(`   ✓ Has ${method}()`);
            if (!mapInstance) mapInstance = obj;
          }
        });
        console.log('');
      }
    } catch (e) {
      // Ignore
    }
  });

  // ============================================
  // Part 3: 如果找到实例，测试坐标转换
  // ============================================
  if (mapInstance) {
    console.log('\n✅ Part 3: Testing Coordinate Conversion\n');
    console.log('Map instance found! Testing methods...\n');

    try {
      // 获取当前地图状态
      const center = mapInstance.getCenter();
      const zoom = mapInstance.getZoom();
      const bounds = mapInstance.getBounds();

      console.log('📊 Current Map State:');
      console.log(`   Center: ${center.toString()}`);
      console.log(`   Zoom: ${zoom}`);
      console.log(`   Bounds: ${bounds.toString()}`);
      console.log('');

      // 测试投影
      const projection = mapInstance.getProjection();
      if (projection) {
        console.log('✅ Projection object available');
        console.log(`   Type: ${projection.constructor?.name}`);

        // 检查投影方法
        const projMethods = ['fromLatLngToPoint', 'fromPointToLatLng'];
        projMethods.forEach((method) => {
          if (typeof projection[method] === 'function') {
            console.log(`   ✓ Has ${method}()`);
          }
        });

        // 测试转换
        console.log('\n🧪 Testing Conversion:');
        const testLat = 42.3844;
        const testLng = -71.0987;
        const testLatLng = new google.maps.LatLng(testLat, testLng);

        console.log(`   Input: (${testLat}, ${testLng})`);

        // World coordinates (0-256 at zoom 0)
        const worldPoint = projection.fromLatLngToPoint(testLatLng);
        console.log(`   World Point: (${worldPoint.x}, ${worldPoint.y})`);

        // 转换为当前缩放级别的像素
        const scale = Math.pow(2, zoom);
        console.log(`   Scale at zoom ${zoom}: ${scale}`);

        const pixelPoint = {
          x: worldPoint.x * scale,
          y: worldPoint.y * scale,
        };
        console.log(`   Pixel Point (world space): (${pixelPoint.x}, ${pixelPoint.y})`);

        // 现在需要转换为屏幕坐标
        // 获取地图中心的世界坐标
        const centerWorldPoint = projection.fromLatLngToPoint(center);
        const centerPixelPoint = {
          x: centerWorldPoint.x * scale,
          y: centerWorldPoint.y * scale,
        };

        // 计算偏移
        const mapBounds = mapElement.getBoundingClientRect();
        const mapCenterScreen = {
          x: mapBounds.left + mapBounds.width / 2,
          y: mapBounds.top + mapBounds.height / 2,
        };

        const offset = {
          x: pixelPoint.x - centerPixelPoint.x,
          y: pixelPoint.y - centerPixelPoint.y,
        };

        const screenPoint = {
          x: mapCenterScreen.x + offset.x,
          y: mapCenterScreen.y + offset.y,
        };

        console.log(`\n✅ FINAL SCREEN COORDINATES:`);
        console.log(`   x: ${screenPoint.x}`);
        console.log(`   y: ${screenPoint.y}`);

        // 保存转换函数到全局
        window.latLngToScreenPixel = function (lat, lng) {
          const latLng = new google.maps.LatLng(lat, lng);
          const worldPoint = projection.fromLatLngToPoint(latLng);
          const scale = Math.pow(2, mapInstance.getZoom());
          const pixelPoint = {
            x: worldPoint.x * scale,
            y: worldPoint.y * scale,
          };

          const center = mapInstance.getCenter();
          const centerWorldPoint = projection.fromLatLngToPoint(center);
          const centerPixelPoint = {
            x: centerWorldPoint.x * scale,
            y: centerWorldPoint.y * scale,
          };

          const mapBounds = mapElement.getBoundingClientRect();
          const mapCenterScreen = {
            x: mapBounds.left + mapBounds.width / 2,
            y: mapBounds.top + mapBounds.height / 2,
          };

          const offset = {
            x: pixelPoint.x - centerPixelPoint.x,
            y: pixelPoint.y - centerPixelPoint.y,
          };

          return {
            x: mapCenterScreen.x + offset.x,
            y: mapCenterScreen.y + offset.y,
          };
        };

        console.log('\n✅ Function saved: window.latLngToScreenPixel(lat, lng)');
        console.log(`   Try: latLngToScreenPixel(${testLat}, ${testLng})`);

        // 测试点击
        console.log('\n🖱️  Testing Click at Calculated Position:');
        console.log('   Creating click event...');

        const clickEvent = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: screenPoint.x,
          clientY: screenPoint.y,
          button: 0,
        });

        mapElement.dispatchEvent(clickEvent);
        console.log('   ✅ Click dispatched!');
        console.log('   💡 Check Inspector panel to see if it worked');
      } else {
        console.warn('⚠️  Projection not available');
      }
    } catch (error) {
      console.error('❌ Error testing conversion:', error);
    }
  } else {
    console.warn('\n❌ Could not find map instance');
    console.log('   Please check the console output above for clues');
  }

  // ============================================
  // Part 4: 返回结果
  // ============================================
  console.log('\n📋 === Summary ===\n');

  if (mapInstance) {
    console.log('✅ Map instance found and tested');
    console.log('✅ Coordinate conversion function created');
    console.log('\nNext steps:');
    console.log('1. Test: latLngToScreenPixel(42.3844, -71.0987)');
    console.log('2. Check if Inspector panel updated');
    console.log('3. If it worked, integrate into extension');
  } else {
    console.log('❌ Map instance not found');
    console.log('\nNext steps:');
    console.log('1. Manually inspect window and mapElement objects');
    console.log('2. Look for properties containing "map" in their name');
    console.log('3. Check browser DevTools Elements panel');
  }

  return {
    mapInstance,
    mapElement,
    latLngToScreenPixel: window.latLngToScreenPixel,
  };
})();
