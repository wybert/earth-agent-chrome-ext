# getMapInfo 和 Inspector 工作流程

## 📋 实现总结

我们实现了两个新工具来支持程序化的 Inspector 数据获取工作流程。

### ✅ 已实现的工具

1. **`getMapInfo`** - 获取地图信息
   - 返回地图边界、中心点坐标、视口尺寸
   - AI 友好的输出格式

2. **`getInspectorOutput`** (原 `inspectMap`) - 读取 Inspector 输出
   - 读取现有的 Inspector 面板数据
   - 验证坐标匹配
   - 提取所有图层的像素值

### 🔑 关键发现

通过测试发现：
- ❌ 外部工具（CDP, browsermcp）无法触发 GEE Inspector
- ✅ **Chrome Extension 的 content script 可以成功触发 Inspector**
- ✅ `clickByCoordinates` 工具在 extension 内部工作正常

## 🎯 推荐的工作流程

### 方案：Map.setCenter + clickByCoordinates + getInspectorOutput

这个方案利用了：
1. GEE 的 `Map.setCenter(lng, lat, zoom)` - 将地图居中到目标坐标
2. Extension 的 `clickByCoordinates(x, y)` - 点击地图中心
3. Extension 的 `getInspectorOutput()` - 读取 Inspector 数据

### 完整工作流程

```
用户请求: "Inspect pixel values at lat=42.36, lng=-71.05"

Agent 执行步骤:
1. getMapInfo()
   → 获取地图中心坐标: {x: 418.5, y: 668.5}

2. earthEngineScript
   → 添加代码: "Map.setCenter(-71.05, 42.36, Map.getZoom());"

3. earthEngineRunCode
   → 运行脚本，地图居中到目标坐标

4. clickByCoordinates(418.5, 668.5)
   → 点击地图中心（即目标坐标）

5. [可选] 等待 500ms 让 Inspector 更新

6. getInspectorOutput({lat: 42.36, lng: -71.05})
   → 读取并验证 Inspector 数据

7. 返回像素值给用户
```

## 📦 新增的代码文件

### 1. `src/lib/tools/browser/getMapInfo.ts`
```typescript
export interface MapInfo {
  mapBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  centerPoint: {
    x: number;
    y: number;
  };
  viewport: {
    width: number;
    height: number;
  };
}
```

**功能**：
- 在 content script 中直接读取 DOM
- 在 background/sidepanel 中通过消息传递
- 返回完整的地图位置和尺寸信息

### 2. Content Script 更新

**`src/content/index.ts` 新增**：
- `handleGetMapInfo()` 函数 (lines 1772-1818)
- `GET_MAP_INFO` 消息处理 (line 257-259)

### 3. AI Tools 更新

**`src/lib/tools/ai-tools.ts`**：
- `getMapInfoTool` (lines 1550-1677)
- `getInspectorOutputTool` (重命名自 `inspectMapTool`)

### 4. Chat Handler 更新

**`src/background/chat-handler.ts`**：
- 添加 `getMapInfoTool` 到工具列表
- 重命名 `inspectMap` → `getInspectorOutput`

## 🔧 工具接口

### getMapInfo

**输入**: 无参数

**输出**:
```json
{
  "success": true,
  "data": {
    "mapBounds": {
      "x": 0,
      "y": 471,
      "width": 837,
      "height": 395
    },
    "centerPoint": {
      "x": 418.5,
      "y": 668.5
    },
    "viewport": {
      "width": 837,
      "height": 866
    }
  }
}
```

### getInspectorOutput

**输入**:
```typescript
{
  coordinates?: {
    lat: number;
    lng: number;
  }
}
```

**输出** (成功):
```json
{
  "success": true,
  "data": {
    "requestedCoordinates": { "lat": 42.3844, "lng": -71.0987 },
    "inspectedCoordinates": { "lng": -71.118, "lat": 42.3713 },
    "layerCount": 1,
    "layers": [
      {
        "name": "Boston Nightlights 2020",
        "type": "Image (1 band)",
        "values": { "maximum": 256.30 }
      }
    ]
  }
}
```

**输出** (需要手动点击):
```json
{
  "success": false,
  "error": "Inspector is empty. Please manually click on the map at the location you want to inspect, then try again."
}
```

## 📝 工具描述更新

### getMapInfo Tool Description
```
Get information about the Google Earth Engine map including its screen bounds,
center point coordinates, and viewport dimensions. Useful for programmatic map
interactions and determining where to click on the map.
```

### getInspectorOutput Tool Description
```
Read pixel values from the Google Earth Engine Inspector panel. IMPORTANT: This
tool reads EXISTING Inspector data - the user must manually click on the map at
the desired location BEFORE calling this tool. The tool will verify that the
Inspector coordinates match the requested coordinates (within tolerance) and
extract all layer values.
```

## 💡 使用示例

### 示例 1: 自动 Inspect 工作流程

**用户请求**: "Inspect the VIIRS data at Boston downtown (lat: 42.3601, lng: -71.0589)"

**Agent 执行**:
```javascript
// 1. 获取地图信息
const mapInfo = await getMapInfo();
// Result: centerPoint = {x: 418.5, y: 668.5}

// 2. 生成居中代码
const code = `Map.setCenter(-71.0589, 42.3601, Map.getZoom());`;
await earthEngineScript({ code, mode: 'insert' });

// 3. 运行代码
await earthEngineRunCode({ code });

// 4. 点击地图中心
await clickByCoordinates({ x: 418.5, y: 668.5 });

// 5. 读取 Inspector
const result = await getInspectorOutput({
  coordinates: { lat: 42.3601, lng: -71.0589 }
});

// 6. 返回结果
return result.data.layers;
```

### 示例 2: 手动点击工作流程（当前实现）

**用户请求**: "Inspect the pixel values at the location I clicked"

**Agent 执行**:
```javascript
// 1. 直接读取 Inspector（用户已经手动点击）
const result = await getInspectorOutput();

// 2. 返回结果
return result.data.layers;
```

## 🔮 未来改进

### 可选的增强功能

1. **自动等待机制**
   - 在 `clickByCoordinates` 后自动等待 Inspector 更新
   - 或在 `getInspectorOutput` 中实现重试逻辑

2. **坐标转换工具**
   - 实现 lat/lng 到屏幕 x/y 的直接转换
   - 不依赖 `Map.setCenter`
   - 需要访问 Google Maps 实例或实现投影计算

3. **批量 Inspect**
   - 支持一次检查多个坐标点
   - 自动遍历点列表

## ✅ 构建验证

```bash
npm run build
# webpack 5.99.7 compiled successfully in 8372 ms
```

所有 TypeScript 类型检查通过 ✅

## 📚 相关文档

| 文件 | 说明 |
|------|------|
| `FINAL-CONCLUSION-INSPECTMAP.md` | 程序化点击测试结论 |
| `INSPECTMAP-IMPLEMENTATION.md` | Inspector 实现详细文档 |
| `GETMAPINFO-AND-INSPECTOR-WORKFLOW.md` | 本文档 |

---

**实现日期**: 2025-01-23
**状态**: ✅ 完成并通过构建测试
