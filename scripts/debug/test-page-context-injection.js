// 🔬 测试 Page Context Injection
// 这个方法可以绕过 content script 的 isolated world 限制
// 在 GEE 控制台运行以模拟 extension 的行为

(function testPageContextInjection() {
  console.log('🔬 === Testing Page Context Injection ===\n');

  // ============================================
  // 方法 1: Script Element Injection
  // ============================================
  console.log('📦 Method 1: Injecting via <script> element\n');

  function injectAndClick(lat, lng) {
    console.log(`Injecting click code for (${lat}, ${lng})...`);

    // 创建脚本元素
    const script = document.createElement('script');

    // 注入的代码（运行在 page context，可以访问真实的 window 对象）
    script.textContent = `
      (function() {
        console.log('🎯 [Injected] Running in page context...');

        try {
          // Step 1: 找到地图元素
          const mapElement = document.querySelector('.ui-map');
          if (!mapElement) {
            console.error('[Injected] Map element not found');
            return;
          }

          // Step 2: 尝试找到地图实例
          let mapInstance = null;

          // 尝试多个路径
          const paths = [
            () => window.Map,
            () => window.map,
            () => mapElement.map,
            () => mapElement.gMap,
            () => mapElement.googleMap,
          ];

          for (let getter of paths) {
            try {
              const obj = getter();
              if (obj && typeof obj.getProjection === 'function') {
                console.log('[Injected] ✅ Found map instance');
                mapInstance = obj;
                break;
              }
            } catch (e) {
              // Continue
            }
          }

          // Step 3: 如果找不到实例，只点击中心
          if (!mapInstance) {
            console.warn('[Injected] Map instance not found, clicking center');
            const bounds = mapElement.getBoundingClientRect();
            const centerX = bounds.left + bounds.width / 2;
            const centerY = bounds.top + bounds.height / 2;

            const clickEvent = new MouseEvent('click', {
              bubbles: true,
              cancelable: true,
              view: window,
              clientX: centerX,
              clientY: centerY,
              button: 0
            });

            const result = mapElement.dispatchEvent(clickEvent);
            console.log('[Injected] Click dispatched (center):', result);

            // 存储结果到 DOM
            mapElement.setAttribute('data-click-result', JSON.stringify({
              success: result,
              method: 'center',
              coordinates: { x: centerX, y: centerY }
            }));

            return;
          }

          // Step 4: 如果找到实例，执行坐标转换
          console.log('[Injected] Performing coordinate conversion...');

          const lat = ${lat};
          const lng = ${lng};

          const projection = mapInstance.getProjection();
          const center = mapInstance.getCenter();
          const zoom = mapInstance.getZoom();

          console.log('[Injected] Map state:', {
            center: center.toString(),
            zoom: zoom
          });

          // 转换坐标
          const targetLatLng = new google.maps.LatLng(lat, lng);
          const targetWorld = projection.fromLatLngToPoint(targetLatLng);
          const scale = Math.pow(2, zoom);
          const targetPixel = {
            x: targetWorld.x * scale,
            y: targetWorld.y * scale
          };

          const centerWorld = projection.fromLatLngToPoint(center);
          const centerPixel = {
            x: centerWorld.x * scale,
            y: centerWorld.y * scale
          };

          const mapBounds = mapElement.getBoundingClientRect();
          const mapCenterScreen = {
            x: mapBounds.left + mapBounds.width / 2,
            y: mapBounds.top + mapBounds.height / 2
          };

          const screenCoords = {
            x: Math.round(mapCenterScreen.x + (targetPixel.x - centerPixel.x)),
            y: Math.round(mapCenterScreen.y + (targetPixel.y - centerPixel.y))
          };

          console.log('[Injected] Screen coordinates:', screenCoords);

          // 点击
          const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: screenCoords.x,
            clientY: screenCoords.y,
            button: 0
          });

          const result = mapElement.dispatchEvent(clickEvent);
          console.log('[Injected] Click dispatched (precise):', result);
          console.log('[Injected] isTrusted:', clickEvent.isTrusted);

          // 存储结果到 DOM，供 content script 读取
          mapElement.setAttribute('data-click-result', JSON.stringify({
            success: result,
            method: 'precise',
            targetCoordinates: { lat, lng },
            screenCoordinates: screenCoords,
            isTrusted: clickEvent.isTrusted
          }));

        } catch (error) {
          console.error('[Injected] Error:', error);
          mapElement.setAttribute('data-click-result', JSON.stringify({
            success: false,
            error: error.message
          }));
        }
      })();
    `;

    // 注入到页面
    document.documentElement.appendChild(script);

    // 立即移除脚本元素（代码已经执行）
    script.remove();

    console.log('✅ Script injected and removed\n');

    // 等待结果
    setTimeout(() => {
      const mapElement = document.querySelector('.ui-map');
      const resultStr = mapElement.getAttribute('data-click-result');

      if (resultStr) {
        const result = JSON.parse(resultStr);
        console.log('📊 Result from injected code:', result);

        // 检查 Inspector
        const inspectPanel = document.querySelector('.inspect-panel');
        if (inspectPanel) {
          const panelText = inspectPanel.textContent || '';
          console.log('\n📋 Inspector panel:');

          if (panelText.includes('Point')) {
            console.log('✅ Inspector updated!');
            const pointHeader = inspectPanel.querySelector('.explorer .header');
            if (pointHeader) {
              console.log('   ', pointHeader.textContent);
            }
          } else if (panelText.includes('Click on the map')) {
            console.log('❌ Inspector still empty');
          }
        }

        // 清理
        mapElement.removeAttribute('data-click-result');
      } else {
        console.warn('⚠️  No result found');
      }
    }, 1000);
  }

  // ============================================
  // 方法 2: CustomEvent 通信
  // ============================================
  console.log('\n📦 Method 2: Using CustomEvent for communication\n');

  function injectWithEventCommunication(lat, lng) {
    console.log(`Setting up event-based communication for (${lat}, ${lng})...`);

    // 监听来自注入代码的响应
    window.addEventListener(
      'gee-click-response',
      function (event) {
        console.log('📨 Received response from injected code:', event.detail);

        // 检查 Inspector
        setTimeout(() => {
          const inspectPanel = document.querySelector('.inspect-panel');
          if (inspectPanel) {
            const panelText = inspectPanel.textContent || '';
            if (panelText.includes('Point')) {
              console.log('✅ Inspector updated!');
              const pointHeader = inspectPanel.querySelector('.explorer .header');
              if (pointHeader) {
                console.log('   ', pointHeader.textContent);
              }
            } else {
              console.log('❌ Inspector still empty');
            }
          }
        }, 500);
      },
      { once: true }
    );

    // 注入代码
    const script = document.createElement('script');
    script.textContent = `
      (function() {
        const mapElement = document.querySelector('.ui-map');

        // ... 同样的查找和点击逻辑 ...

        // 通过 CustomEvent 发送结果
        window.dispatchEvent(new CustomEvent('gee-click-response', {
          detail: {
            success: true,
            method: 'event-based',
            coordinates: { lat: ${lat}, lng: ${lng} }
          }
        }));
      })();
    `;

    document.documentElement.appendChild(script);
    script.remove();

    console.log('✅ Event-based injection complete\n');
  }

  // ============================================
  // 测试执行
  // ============================================
  console.log('🧪 Running tests...\n');

  const testLat = 42.3844;
  const testLng = -71.0987;

  console.log('Test 1: Script element injection');
  console.log('=====================================');
  injectAndClick(testLat, testLng);

  console.log('\n\nWaiting for results...');
  console.log('(Check output above after 1 second)\n');

  // 可选：延迟运行第二个测试
  /*
  setTimeout(() => {
    console.log('\n\nTest 2: Event-based communication');
    console.log('=====================================');
    injectWithEventCommunication(testLat, testLng);
  }, 3000);
  */

  return {
    injectAndClick,
    injectWithEventCommunication,
  };
})();
