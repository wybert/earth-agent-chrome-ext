# Inspector DOM Method - 完整实现计划

## 目标
实现完整的 DOM 解析方法，提取 Inspector 面板的所有数据，包括：
- Point 信息（坐标、缩放级别等）
- Pixels 数据（像素值）
- **Objects 数据（包括 EPSG/CRS 信息）**

## 实现步骤

### Step 1: 递归 JSON 提取函数
创建 `extractInspectorTreeAsJSON()` 函数来递归解析 GEE 的 explorer 树结构。

**关键功能**:
- 处理简单节点（`.simple` 类）
- 处理复杂节点（嵌套的 `.zippy`）
- 解析数组（`[1,2,3]` 格式）
- 解析 band 摘要（`"maximum", float, EPSG:4326, 2x1 px`）
- 处理 Lists 和 Objects

### Step 2: 更新 handleInspectMap
增强现有的 `handleInspectMap` 函数：

1. **滚动和展开**
   - 滚动到底部触发延迟加载
   - 展开所有 collapsed zippies
   - 等待内容渲染

2. **提取三个部分**
   - Point: 第一个 explorer
   - Pixels: `.inspect-view.inspect-image`
   - Objects: `.inspect-view.inspect-object`

3. **检测空 Objects**
   - 如果 Objects 为空，返回建议消息
   - 提示用户手动展开

### Step 3: 更新 AI Tool
更新 `getInspectorOutputTool` 的描述和输出格式：

1. **描述更新**
   - 说明需要手动展开 Objects
   - 列出所有可获取的数据类型

2. **输出格式**
   - Point 信息
   - Pixel 值
   - Object 元数据（包括 CRS）
   - 显示建议消息（如果 Objects 空）

## 测试计划

### Test 1: 基础提取
1. 运行 Boston nightlights 脚本
2. 点击地图
3. **不展开 Objects**
4. 调用工具
5. 验证：
   - ✅ Point 数据正确
   - ✅ Pixels 数据正确
   - ❌ Objects 为空
   - ✅ 显示建议消息

### Test 2: 完整提取
1. 运行 Boston nightlights 脚本
2. 点击地图
3. **手动展开 Objects 部分**
4. 调用工具
5. 验证：
   - ✅ Point 数据正确
   - ✅ Pixels 数据正确
   - ✅ Objects 包含 EPSG:4326
   - ✅ Objects 包含 crs_transform, data_type, dimensions, origin

### Test 3: 多层图层
1. 添加多个图层到地图
2. 点击地图
3. 展开 Objects
4. 调用工具
5. 验证所有图层的数据都被提取

## 实现文件

1. `/src/content/index.ts`
   - `extractInspectorTreeAsJSON()` 函数
   - 更新 `handleInspectMap()` 函数

2. `/src/lib/tools/ai-tools.ts`
   - 更新 `getInspectorOutputTool` 描述
   - 更新 `toModelOutput` 格式化

## 预期结果

### 工具输出示例（Objects 已展开）
```
✅ Inspector Data at (-71.0596, 42.3606):

**Point Information:**
  - Longitude: -71.0595866455078
  - Latitude: 42.36060737730246
  - Zoom Level: 10
  - Scale (approx. m/px): 152.8740565703525

**Pixel Values:**
  Layer 1: Boston Nightlights 2020
    maximum: 256.30450439453125

**Object Metadata (includes CRS/EPSG):**
  Layer 1: Boston Nightlights 2020
    {
      "type": "Image",
      "bands": [
        {
          "id": "maximum",
          "data_type": "float",
          "crs": "EPSG:4326",
          "dimensions": [2, 1],
          "crs_transform": [1, 0, 0, 0, 1, 0],
          "origin": [-72, 42]
        }
      ],
      "properties": {
        "system:footprint": "Polygon, 5 vertices",
        "system:index": "0"
      }
    }
```

### 工具输出示例（Objects 未展开）
```
✅ Inspector Data at (-71.0596, 42.3606):

**Point Information:**
  - Longitude: -71.0595866455078
  - Latitude: 42.36060737730246
  - Zoom Level: 10
  - Scale (approx. m/px): 152.8740565703525

**Pixel Values:**
  Layer 1: Boston Nightlights 2020
    maximum: 256.30450439453125

**Object Metadata (includes CRS/EPSG):**
  (No objects found)

⚠️ **Note:** Objects section appears empty or not expanded. To get CRS/EPSG information, manually click on "Objects" in the Inspector panel to expand it, then call this tool again.
```

## 成功标准

- ✅ Point 数据完整提取
- ✅ Pixels 数据完整提取
- ✅ Objects 数据在展开时完整提取（包括 EPSG）
- ✅ Objects 为空时显示有用的提示
- ✅ 代码类型安全（TypeScript）
- ✅ 完整的控制台日志用于调试
- ✅ 构建成功无错误
