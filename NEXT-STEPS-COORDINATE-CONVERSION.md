# 下一步：实现坐标转换和自动点击

## 当前发现

从你运行的 `explore-gee-coordinate-api.js` 结果，我们知道：

✅ **Google Maps API 可用**
- 版本：3.62.13e
- `window.google.maps.Map` 存在
- 可以创建 `LatLng` 对象

✅ **地图元素存在**
- 选择器：`.ui-map`
- 位置：viewport (left: 0, top: 397, width: 1226, height: 310)
- 中心：(613, 552)

❓ **地图实例未找到**
- `window.Map` 是一个 Function，不是地图实例
- 需要找到实际的 Google Maps 对象

## 需要运行的测试

### 测试 1: 找到地图实例
```javascript
// 在 GEE 控制台粘贴并运行
// 文件: find-map-instance.js
```

这个脚本会：
1. 深度搜索 `mapElement` 和 `window` 的所有属性
2. 寻找包含 `getProjection()`, `getCenter()`, `getZoom()` 的对象
3. 如果找到，立即测试坐标转换
4. 自动保存 `window.latLngToScreenPixel(lat, lng)` 函数

**预期结果**：
- 如果成功：会显示 "✅ Map instance found and tested"
- 会自动尝试点击指定坐标
- 检查 Inspector 是否更新

### 测试 2: 直接测试坐标点击
```javascript
// 在 GEE 控制台粘贴并运行
// 文件: test-coordinate-click.js
```

这个脚本会：
1. 尝试多种方法找地图实例
2. 执行完整的坐标转换（地理 → 世界 → 像素 → 屏幕）
3. 在计算出的位置模拟点击
4. 验证 Inspector 是否更新
5. 计算点击精度

**预期结果**：
- 如果成功：会显示实际点击的坐标和目标坐标的差异
- 创建可重用的 `window.clickAtLatLng(lat, lng)` 函数

## 关键问题：Extension Context 限制

即使我们成功在**浏览器控制台**实现了坐标转换和点击，仍然可能在 **extension content script** 中失败，原因：

### 问题 1: Isolated World
```javascript
// 浏览器控制台（page context）
window.google.maps.Map  // ✅ 可访问

// Content script (isolated world)
window.google.maps.Map  // ✅ 可访问（shared）
mapElement.someMapInstance  // ❌ 可能不可访问（DOM 属性在 page context）
```

### 问题 2: Event isTrusted
```javascript
// 浏览器控制台
event.isTrusted = false  // 但仍被 GEE 接受 ✅

// Content script
event.isTrusted = false  // 可能被 GEE 拒绝 ❌
```

## 三种可能的结果

### 结果 A: 完全成功 🎉
- 在浏览器控制台成功 ✅
- 在 extension content script 也成功 ✅

**行动**：直接集成到 `inspectMap` 工具

### 结果 B: 部分成功 ⚠️
- 在浏览器控制台成功 ✅
- 在 extension content script 失败 ❌

**行动**：使用 Page Context Injection

```javascript
// content script 注入代码到 page context
function injectClickCode(lat, lng) {
  const script = document.createElement('script');
  script.textContent = `
    (function() {
      // 粘贴整个坐标转换 + 点击逻辑
      const mapInstance = /* 找到地图实例 */;
      const projection = mapInstance.getProjection();
      // ... 转换逻辑 ...
      mapElement.dispatchEvent(clickEvent);
    })();
  `;
  document.documentElement.appendChild(script);
  script.remove();
}
```

### 结果 C: 完全失败 ❌
- 坐标转换成功，但点击被拒绝

**行动**：保持当前的手动点击方案，但改进用户体验

```javascript
// 1. 计算屏幕坐标
const screenCoords = latLngToScreenPixel(lat, lng);

// 2. 在地图上显示目标位置（用视觉标记）
showTargetMarker(screenCoords.x, screenCoords.y);

// 3. 提示用户点击标记位置
return {
  success: false,
  error: 'Please click on the red marker on the map',
  targetCoordinates: { x: screenCoords.x, y: screenCoords.y }
};
```

## 立即执行的步骤

### Step 1: 运行测试脚本（你来做）

在 GEE 浏览器控制台按顺序运行：

1. **find-map-instance.js**
   - 复制整个文件内容
   - 粘贴到 GEE 控制台
   - 按 Enter
   - 观察输出

2. **test-coordinate-click.js**
   - 复制整个文件内容
   - 粘贴到 GEE 控制台
   - 按 Enter
   - **检查 Inspector 面板**是否更新

### Step 2: 报告结果（你来做）

请告诉我：

1. **地图实例是否找到？**
   ```
   输出包含：
   ✅ Found map instance in: mapElement.XXX
   或
   ❌ Map instance not found
   ```

2. **坐标转换是否成功？**
   ```
   输出包含：
   ✅ FINAL SCREEN COORDINATES: x: XXX, y: YYY
   ```

3. **点击是否触发 Inspector 更新？**
   ```
   Inspector 面板显示：
   Point (lng, lat) at zoom
   或仍然显示：
   Click on the map to inspect...
   ```

4. **如果成功，精度如何？**
   ```
   输出包含：
   Difference: lat=X.XXXXXX, lng=Y.YYYYYY
   Accuracy: EXCELLENT/GOOD/POOR
   ```

### Step 3: 根据结果实现（我来做）

#### 如果测试成功
我会：
1. 在 `content/index.ts` 中实现完整的坐标转换逻辑
2. 修改 `handleInspectMap` 函数，添加自动点击
3. 更新 `inspectMap` tool 的描述
4. 创建测试用例

#### 如果测试失败
我会：
1. 分析具体失败原因
2. 实现 page context injection（如果是 isolated world 问题）
3. 或者保持手动点击，但添加视觉辅助（显示目标位置）
4. 或者探索 Chrome DevTools Protocol 方案

## 文件清单

| 文件名 | 用途 | 运行位置 |
|--------|------|----------|
| `explore-gee-coordinate-api.js` | ❌ 有 bug，已废弃 | - |
| `find-map-instance.js` | ✅ 深度搜索地图实例 | GEE 控制台 |
| `test-coordinate-click.js` | ✅ 完整测试（推荐） | GEE 控制台 |
| `COORDINATE-CONVERSION-ANALYSIS.md` | 技术分析文档 | 阅读 |
| `NEXT-STEPS-COORDINATE-CONVERSION.md` | 本文件 | 阅读 |

## 期待的最佳结果

```javascript
// 最终我们希望实现这样的 API：

// 在 extension 中调用
const result = await inspectMap({ lat: 42.3844, lng: -71.0987 });

// 背后发生的事情：
// 1. Background script → Content script
// 2. Content script 找到地图实例
// 3. 转换坐标：(42.3844, -71.0987) → (617, 552)
// 4. 在 (617, 552) 模拟点击（或注入 page context 代码点击）
// 5. 等待 Inspector 更新
// 6. 读取并返回 Inspector 数据

// 返回结果：
{
  success: true,
  data: {
    coordinates: { lat: 42.3844, lng: -71.0987 },
    layers: [
      { name: "VIIRS Nighttime Lights", values: { maximum: 97.16 } }
    ]
  }
}
```

## 现在就去测试！

请运行 `test-coordinate-click.js` 然后把完整的控制台输出发给我！🚀
