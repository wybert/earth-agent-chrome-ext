// 🎯 直接测试：地理坐标 → 屏幕坐标 → 点击
// 在 GEE 浏览器控制台运行

(async function testCoordinateClick() {
  console.log('🎯 === Testing Coordinate-based Click ===\n');

  // 测试坐标（波士顿）
  const testLat = 42.3844;
  const testLng = -71.0987;

  console.log(`📍 Target coordinates: (${testLat}, ${testLng})\n`);

  // ============================================
  // Step 1: 找到地图实例
  // ============================================
  console.log('Step 1: Finding map instance...');

  const mapElement = document.querySelector('.ui-map');
  if (!mapElement) {
    console.error('❌ Map element not found!');
    return;
  }

  // 尝试多种方式获取地图实例
  let mapInstance = null;

  // 方法 1: 检查所有属性
  for (let key in mapElement) {
    const prop = mapElement[key];
    if (prop && typeof prop === 'object') {
      // 检查是否有地图方法
      if (typeof prop.getProjection === 'function' &&
          typeof prop.getCenter === 'function' &&
          typeof prop.getZoom === 'function') {
        console.log(`✅ Found map instance in: mapElement.${key}`);
        mapInstance = prop;
        break;
      }
    }
  }

  // 方法 2: 检查 window 对象
  if (!mapInstance && window.Map && typeof window.Map.getProjection === 'function') {
    console.log('✅ Found map instance in: window.Map');
    mapInstance = window.Map;
  }

  if (!mapInstance) {
    console.warn('⚠️  Map instance not found, will use simplified approach');
    console.log('   (This will only click map center, not exact coordinates)\n');

    // 简化方案：只点击地图中心
    const mapBounds = mapElement.getBoundingClientRect();
    const centerX = mapBounds.left + mapBounds.width / 2;
    const centerY = mapBounds.top + mapBounds.height / 2;

    console.log('🖱️  Clicking map center...');
    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: centerX,
      clientY: centerY,
      button: 0
    });

    mapElement.dispatchEvent(clickEvent);
    console.log('✅ Click dispatched at center');
    console.log('   Please check Inspector panel\n');
    return;
  }

  console.log('✅ Map instance found!\n');

  // ============================================
  // Step 2: 获取地图信息
  // ============================================
  console.log('Step 2: Reading map state...');

  const center = mapInstance.getCenter();
  const zoom = mapInstance.getZoom();
  const projection = mapInstance.getProjection();

  console.log(`   Center: ${center.lat()}, ${center.lng()}`);
  console.log(`   Zoom: ${zoom}`);
  console.log(`   Projection: ${projection ? 'Available' : 'Not available'}\n`);

  if (!projection) {
    console.error('❌ Projection not available!');
    return;
  }

  // ============================================
  // Step 3: 坐标转换
  // ============================================
  console.log('Step 3: Converting coordinates...');

  // 创建目标 LatLng
  const targetLatLng = new google.maps.LatLng(testLat, testLng);
  console.log(`   Target LatLng: ${targetLatLng.toString()}`);

  // 转换为世界坐标（0-256 at zoom 0）
  const targetWorld = projection.fromLatLngToPoint(targetLatLng);
  console.log(`   World coordinates: (${targetWorld.x}, ${targetWorld.y})`);

  // 转换为当前缩放级别的像素坐标
  const scale = Math.pow(2, zoom);
  const targetPixel = {
    x: targetWorld.x * scale,
    y: targetWorld.y * scale
  };
  console.log(`   Pixel (world): (${targetPixel.x}, ${targetPixel.y})`);

  // 获取地图中心的像素坐标
  const centerWorld = projection.fromLatLngToPoint(center);
  const centerPixel = {
    x: centerWorld.x * scale,
    y: centerWorld.y * scale
  };
  console.log(`   Center pixel: (${centerPixel.x}, ${centerPixel.y})`);

  // 计算偏移量
  const offset = {
    x: targetPixel.x - centerPixel.x,
    y: targetPixel.y - centerPixel.y
  };
  console.log(`   Offset from center: (${offset.x}, ${offset.y})`);

  // 转换为屏幕坐标
  const mapBounds = mapElement.getBoundingClientRect();
  const mapCenterScreen = {
    x: mapBounds.left + mapBounds.width / 2,
    y: mapBounds.top + mapBounds.height / 2
  };
  console.log(`   Map center (screen): (${mapCenterScreen.x}, ${mapCenterScreen.y})`);

  const screenCoords = {
    x: Math.round(mapCenterScreen.x + offset.x),
    y: Math.round(mapCenterScreen.y + offset.y)
  };

  console.log(`\n✅ Final screen coordinates: (${screenCoords.x}, ${screenCoords.y})\n`);

  // 检查是否在地图范围内
  if (screenCoords.x < mapBounds.left || screenCoords.x > mapBounds.right ||
      screenCoords.y < mapBounds.top || screenCoords.y > mapBounds.bottom) {
    console.warn('⚠️  WARNING: Calculated position is outside map viewport!');
    console.log(`   Map bounds: left=${mapBounds.left}, right=${mapBounds.right}, top=${mapBounds.top}, bottom=${mapBounds.bottom}`);
    console.log('   The target location may not be visible on current map view\n');
  }

  // ============================================
  // Step 4: 模拟点击
  // ============================================
  console.log('Step 4: Simulating click...');

  const clickEvent = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX: screenCoords.x,
    clientY: screenCoords.y,
    button: 0
  });

  const dispatched = mapElement.dispatchEvent(clickEvent);
  console.log(`   Click dispatched: ${dispatched}`);
  console.log(`   At screen position: (${screenCoords.x}, ${screenCoords.y})\n`);

  // ============================================
  // Step 5: 验证结果
  // ============================================
  console.log('Step 5: Waiting for Inspector to update...');

  await new Promise(resolve => setTimeout(resolve, 1000));

  const inspectPanel = document.querySelector('.inspect-panel');
  if (!inspectPanel) {
    console.error('❌ Inspector panel not found!');
    return;
  }

  const panelText = inspectPanel.textContent || '';
  console.log(`   Inspector text: "${panelText.substring(0, 100)}..."\n`);

  if (panelText.includes('Click on the map')) {
    console.error('❌ FAILED: Inspector still shows empty state');
    console.log('   The click did not trigger Inspector update');
    console.log('   This confirms the extension context limitation\n');
  } else if (panelText.includes('Point')) {
    console.log('✅ SUCCESS: Inspector shows data!');

    const pointHeader = inspectPanel.querySelector('.explorer .header');
    if (pointHeader) {
      const pointText = pointHeader.textContent;
      const match = pointText.match(/Point\s*\(([-\d.]+),\s*([-\d.]+)\)/);
      if (match) {
        const clickedLng = parseFloat(match[1]);
        const clickedLat = parseFloat(match[2]);
        console.log(`   Clicked coordinates: (${clickedLat}, ${clickedLng})`);

        const latDiff = Math.abs(clickedLat - testLat);
        const lngDiff = Math.abs(clickedLng - testLng);

        console.log(`   Target coordinates: (${testLat}, ${testLng})`);
        console.log(`   Difference: lat=${latDiff.toFixed(6)}, lng=${lngDiff.toFixed(6)}`);

        if (latDiff < 0.01 && lngDiff < 0.01) {
          console.log('   ✅ Accuracy: EXCELLENT (< 1km)');
        } else if (latDiff < 0.1 && lngDiff < 0.1) {
          console.log('   ✅ Accuracy: GOOD (< 10km)');
        } else {
          console.log('   ⚠️  Accuracy: POOR (> 10km)');
        }
      }
    }
  }

  // ============================================
  // Step 6: 保存转换函数
  // ============================================
  console.log('\n📦 Creating reusable function...\n');

  window.clickAtLatLng = function(lat, lng) {
    console.log(`\n🎯 Clicking at (${lat}, ${lng})...`);

    const targetLatLng = new google.maps.LatLng(lat, lng);
    const targetWorld = projection.fromLatLngToPoint(targetLatLng);
    const scale = Math.pow(2, mapInstance.getZoom());
    const targetPixel = { x: targetWorld.x * scale, y: targetWorld.y * scale };

    const center = mapInstance.getCenter();
    const centerWorld = projection.fromLatLngToPoint(center);
    const centerPixel = { x: centerWorld.x * scale, y: centerWorld.y * scale };

    const mapBounds = mapElement.getBoundingClientRect();
    const mapCenterScreen = {
      x: mapBounds.left + mapBounds.width / 2,
      y: mapBounds.top + mapBounds.height / 2
    };

    const screenCoords = {
      x: Math.round(mapCenterScreen.x + (targetPixel.x - centerPixel.x)),
      y: Math.round(mapCenterScreen.y + (targetPixel.y - centerPixel.y))
    };

    console.log(`   Screen coordinates: (${screenCoords.x}, ${screenCoords.y})`);

    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: screenCoords.x,
      clientY: screenCoords.y,
      button: 0
    });

    mapElement.dispatchEvent(clickEvent);
    console.log('   ✅ Click dispatched\n');

    return screenCoords;
  };

  console.log('✅ Function created: window.clickAtLatLng(lat, lng)');
  console.log(`   Example: clickAtLatLng(42.3844, -71.0987)\n`);

  console.log('📋 === Test Complete ===\n');
})();
