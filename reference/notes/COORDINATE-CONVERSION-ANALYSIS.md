# 地理坐标到屏幕坐标转换分析

## 问题核心

如何将 **地理坐标 (lat, lng)** 转换为 **屏幕像素坐标 (x, y)**，以便在正确的位置模拟点击？

## 当前已实现的工具

### clickByCoordinates Tool

在 `src/lib/tools/ai-tools.ts` 中已经实现了基于**屏幕坐标**的点击工具：

```typescript
clickByCoordinatesTool = tool({
  description: 'Click at specific pixel coordinates on the page',
  inputSchema: z.object({
    x: z.number().describe('X pixel coordinate'),
    y: z.number().describe('Y pixel coordinate'),
  }),
  execute: async ({ x, y }) => {
    // 发送消息到 content script
    chrome.tabs.sendMessage(tabId, {
      type: 'CLICK_BY_COORDINATES',
      payload: { x, y },
    });
  },
});
```

这个工具接受的是 **viewport 像素坐标**：

- `x`: 从浏览器窗口左边缘开始的像素数
- `y`: 从浏览器窗口顶部开始的像素数

## 坐标系统对比

### 1. 地理坐标系统 (Geographic Coordinates)

```javascript
{
  lat: 42.3844,  // 纬度 (-90 到 90)
  lng: -71.0987  // 经度 (-180 到 180)
}
```

### 2. 屏幕坐标系统 (Screen/Viewport Coordinates)

```javascript
{
  x: 617.5,  // 从窗口左边缘的像素距离
  y: 552.5   // 从窗口顶部的像素距离
}
```

### 3. 地图瓦片坐标系统 (Map Tile Coordinates)

Google Maps 使用 Web Mercator 投影：

```javascript
{
  tileX: 1234,  // 瓦片 X 索引
  tileY: 5678,  // 瓦片 Y 索引
  zoom: 10      // 缩放级别
}
```

## 完整的坐标转换流程

### 方法 1: 使用 Google Maps API (理论上最准确)

```javascript
async function convertLatLngToPixel(lat, lng) {
  // Step 1: 找到地图元素
  const mapElement = document.querySelector('.ui-map');
  const mapBounds = mapElement.getBoundingClientRect();

  // Step 2: 获取 Google Maps 实例
  const googleMaps = (window as any).google?.maps;
  if (!googleMaps) {
    throw new Error('Google Maps API not available');
  }

  // Step 3: 创建 LatLng 对象
  const latLng = new googleMaps.LatLng(lat, lng);

  // Step 4: 获取地图投影
  // 问题：我们需要访问 GEE 的内部 Map 对象
  // 这个对象可能存储在某个全局变量或 DOM 元素的属性中
  const geeMap = window.Map || mapElement.gMap || ???;

  // Step 5: 使用投影转换坐标
  const projection = geeMap.getProjection();
  const bounds = geeMap.getBounds();
  const topRight = projection.fromLatLngToPoint(bounds.getNorthEast());
  const bottomLeft = projection.fromLatLngToPoint(bounds.getSouthWest());
  const scale = Math.pow(2, geeMap.getZoom());

  // Step 6: 转换目标坐标
  const worldCoordinate = projection.fromLatLngToPoint(latLng);
  const pixelCoordinate = new googleMaps.Point(
    (worldCoordinate.x - bottomLeft.x) * scale,
    (worldCoordinate.y - topRight.y) * scale
  );

  // Step 7: 加上地图元素的 offset
  return {
    x: mapBounds.left + pixelCoordinate.x,
    y: mapBounds.top + pixelCoordinate.y
  };
}
```

**问题**：

1. 无法可靠地访问 GEE 的内部 Map 对象
2. GEE 可能使用自定义的地图实现，不是标准 Google Maps

### 方法 2: 数学计算 Web Mercator 投影

```javascript
function latLngToPixel(lat, lng, zoom, mapWidth, mapHeight) {
  // Step 1: Web Mercator 投影公式
  // 将地理坐标转换为 0-1 的标准化坐标
  const latRad = (lat * Math.PI) / 180;
  const n = Math.pow(2, zoom);

  const worldX = (lng + 180) / 360;
  const worldY = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2;

  // Step 2: 获取当前地图中心和边界
  const mapCenter = getMapCenter(); // 需要实现
  const centerWorldX = (mapCenter.lng + 180) / 360;
  const centerWorldY =
    (1 -
      Math.log(
        Math.tan((mapCenter.lat * Math.PI) / 180) + 1 / Math.cos((mapCenter.lat * Math.PI) / 180)
      ) /
        Math.PI) /
    2;

  // Step 3: 计算相对于地图中心的像素偏移
  const pixelX = (worldX - centerWorldX) * mapWidth * n;
  const pixelY = (worldY - centerWorldY) * mapHeight * n;

  // Step 4: 加上地图中心的屏幕坐标
  const mapBounds = document.querySelector('.ui-map').getBoundingClientRect();
  const centerScreenX = mapBounds.left + mapBounds.width / 2;
  const centerScreenY = mapBounds.top + mapBounds.height / 2;

  return {
    x: centerScreenX + pixelX,
    y: centerScreenY + pixelY,
  };
}
```

**问题**：

1. 需要准确知道当前地图的中心点
2. 需要准确知道当前缩放级别
3. 投影公式假设标准 Web Mercator，GEE 可能有变化

### 方法 3: 使用 GEE 的现有功能（最实用）

```javascript
// 检查 GEE 是否提供了现成的坐标转换 API
function findGEECoordinateConverter() {
  // 1. 检查全局对象
  console.log('window.ee:', window.ee);
  console.log('window.Map:', window.Map);
  console.log('window.google:', window.google);

  // 2. 检查地图元素的属性
  const mapElement = document.querySelector('.ui-map');
  console.log('Map element properties:', Object.keys(mapElement));

  // 3. 查找事件监听器
  // 当我们手动点击地图时，GEE 肯定会调用某个函数来转换坐标
  // 我们可以通过监听器找到这个函数

  // 4. 查找 Inspector 相关代码
  // Inspector 能显示坐标，说明 GEE 内部有转换逻辑
}
```

## 之前方案为什么失败

### 简化版本（已测试）

之前的实现只是简单地点击地图中心：

```javascript
// 这就是之前方案的全部逻辑
const mapBounds = mapElement.getBoundingClientRect();
const centerX = mapBounds.left + mapBounds.width / 2;
const centerY = mapBounds.top + mapBounds.height / 2;

const clickEvent = new MouseEvent('click', {
  bubbles: true,
  cancelable: true,
  view: window,
  clientX: centerX,
  clientY: centerY,
  button: 0,
});

mapElement.dispatchEvent(clickEvent);
```

### 测试结果

#### ✅ 在浏览器控制台直接运行

```javascript
// 在 GEE 页面按 F12，运行上面的代码
// 结果：Inspector 成功更新！
```

#### ❌ 通过 Extension 消息传递运行

```javascript
// Extension background script → content script → 运行相同代码
// 结果：Inspector 不更新
```

### 失败原因分析

1. **事件来源检查**

   ```javascript
   // GEE 可能检查事件的 isTrusted 属性
   clickEvent.isTrusted; // 用户真实点击：true
   // 程序模拟点击：false
   ```

2. **执行上下文隔离**

   ```javascript
   // 浏览器控制台：在 page context 运行
   // Content script：在 isolated world 运行
   // GEE 的事件监听器可能只接受 page context 的事件
   ```

3. **时间戳检查**
   ```javascript
   // GEE 可能检查点击事件和其他用户交互的时间关系
   // 防止自动化脚本
   ```

## 解决方案探索

### 方案 A: 使用 Page Context Injection

```javascript
// 在 content script 中注入代码到 page context
function clickInPageContext(x, y) {
  const script = document.createElement('script');
  script.textContent = `
    (function() {
      const mapElement = document.querySelector('.ui-map');
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: ${x},
        clientY: ${y},
        button: 0
      });
      mapElement.dispatchEvent(clickEvent);
    })();
  `;
  document.documentElement.appendChild(script);
  script.remove();
}
```

**可能性**：中等。可能绕过 isolated world 限制，但仍可能被 `isTrusted` 检查阻止。

### 方案 B: 找到 GEE 内部 API

```javascript
// 探测脚本
(function exploreGEEInternals() {
  // 1. 找到地图对象
  const mapElement = document.querySelector('.ui-map');

  // 2. 遍历所有属性
  for (let key in mapElement) {
    if (key.startsWith('__') || key.includes('react') || key.includes('angular')) {
      console.log(`Found framework property: ${key}`, mapElement[key]);
    }
  }

  // 3. 查找 Inspector 相关函数
  // GEE 肯定有一个函数类似于：
  // inspectAtLatLng(lat, lng) 或 inspectAtPixel(x, y)

  // 4. 监控 Inspector 面板的变化
  const inspectPanel = document.querySelector('.inspect-panel');
  const observer = new MutationObserver((mutations) => {
    console.log('Inspector updated!');
    console.trace(); // 打印调用栈，找到触发函数
  });
  observer.observe(inspectPanel, { childList: true, subtree: true });
})();
```

### 方案 C: 使用 Chrome DevTools Protocol

```javascript
// 从 background script 使用 CDP 模拟真实用户点击
chrome.debugger.attach({ tabId }, '1.3', () => {
  chrome.debugger.sendCommand({ tabId }, 'Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x: x,
    y: y,
    button: 'left',
    clickCount: 1,
  });

  chrome.debugger.sendCommand({ tabId }, 'Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x: x,
    y: y,
    button: 'left',
    clickCount: 1,
  });
});
```

**可能性**：高。CDP 模拟的事件更接近真实用户操作。
**缺点**：需要用户允许 debugger 权限，会显示"Chrome is being controlled by automated test software"警告。

## 当前最佳方案

### 组合方案：手动点击 + 坐标验证

```javascript
// 1. 用户手动点击地图
// 2. 从 Inspector 读取实际点击的坐标
// 3. 验证坐标是否匹配预期（允许一定误差）
// 4. 如果不匹配，给出明确指示让用户点击正确位置

if (Math.abs(inspectedLat - requestedLat) > tolerance) {
  return {
    success: false,
    error: `Please click closer to (${requestedLat}, ${requestedLng})`,
    current: `Current click is at (${inspectedLat}, ${inspectedLng})`,
    suggestion: `Move your click ${direction} by approximately ${distance} km`,
  };
}
```

## 未来改进方向

### 1. 找到 GEE 的坐标转换 API

```javascript
// 可能存在的 API：
ee.MapWidget.latLngToPixel(lat, lng);
ee.MapWidget.pixelToLatLng(x, y);
// 需要深入研究 GEE 源码或反编译
```

### 2. 使用 AI 视觉定位

```javascript
// 1. 截图当前地图
// 2. 使用 AI 识别地图上的特征
// 3. 计算目标坐标在图像中的位置
// 4. 转换为屏幕坐标
```

### 3. 创建代理服务器

```javascript
// 拦截 GEE 的网络请求
// 分析 Inspector 请求的参数格式
// 直接调用 GEE 的后端 API 获取数据
// 绕过前端点击限制
```

## 结论

**当前状态**：

- ✅ 我们有 `clickByCoordinates(x, y)` 可以点击屏幕坐标
- ❌ 我们无法可靠地将 `(lat, lng)` 转换为 `(x, y)`
- ❌ 程序化点击会被 GEE 拒绝

**实用方案**：

- 用户手动点击 → inspectMap 读取数据 ✅
- 提供坐标验证和指导 ✅

**未来可能**：

- 如果找到 GEE 内部 API → 完美解决
- 如果使用 CDP → 需要权限权衡
- 如果注入 page context → 可能部分解决
