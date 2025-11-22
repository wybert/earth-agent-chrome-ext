# GEE Console Chart Handling Analysis

## 问题
GEE 控制台可以显示多种可视化内容：
- 时间序列图表 (Time series charts)
- 直方图 (Histograms)
- 散点图 (Scatter plots)
- 特征图表 (Feature charts)
- 其他 Google Charts 可视化

当前的 `getConsoleOutput` 工具只能提取文本内容，无法处理这些图表。

## 可能的解决方案

### 方案 1: 截图法 (Screenshot-based) ⭐ 推荐
**优点**:
- ✅ 简单可靠
- ✅ 适用于所有类型的可视化
- ✅ AI 可以直接"看到"图表（多模态能力）
- ✅ 已有 screenshot 工具，可直接使用

**缺点**:
- ❌ 无法获取原始数据
- ❌ AI 只能进行视觉分析，不能做精确计算

**实现方式**:
```typescript
// 在 getConsoleOutput 中检测图表
const hasChart = logElement.querySelector('canvas, svg, img, [class*="chart"]');
if (hasChart) {
  output.type = 'chart';
  output.message = 'Chart visualization (use screenshot to view)';
  output.hasVisualContent = true;
}
```

### 方案 2: Canvas/SVG 提取法
**优点**:
- ✅ 可以提取为图片（base64）
- ✅ 可以直接在响应中包含图片
- ✅ AI 可以分析图片内容

**缺点**:
- ❌ 响应体积会变大
- ❌ 只适用于 canvas/svg，不适用于 iframe
- ❌ 需要处理跨域问题

**实现方式**:
```typescript
const canvas = logElement.querySelector('canvas');
if (canvas) {
  try {
    const imageData = canvas.toDataURL('image/png');
    output.chartImage = imageData; // base64 image
  } catch (e) {
    // CORS error handling
  }
}
```

### 方案 3: 元数据提取法
**优点**:
- ✅ 提供图表类型信息
- ✅ 响应体积小
- ✅ AI 可以理解有图表存在

**缺点**:
- ❌ 不包含实际图表内容
- ❌ AI 无法"看到"图表

**实现方式**:
```typescript
// 在 ConsoleOutputEntry 中添加字段
interface ConsoleOutputEntry {
  type: 'info' | 'error' | 'warning' | 'log' | 'chart';
  message: string;
  hasVisualContent?: boolean;
  visualElementType?: 'canvas' | 'svg' | 'img' | 'unknown';
  timestamp?: number;
}
```

### 方案 4: 混合方案 ⭐⭐ 最佳方案
结合方案 1 和方案 3：
1. **检测图表存在** - 在输出中标记
2. **提供元数据** - 告诉 AI 有图表
3. **建议使用 screenshot** - AI 可以自主决定是否需要截图查看

**实现流程**:
```
1. getConsoleOutput 检测到图表
   ↓
2. 返回: {type: 'chart', message: 'Chart: Time series', hasVisualContent: true}
   ↓
3. AI 看到有图表
   ↓
4. AI 决定: 需要查看细节
   ↓
5. AI 调用 screenshot 工具截取控制台
   ↓
6. AI 分析图表内容
```

## 推荐实现

### 修改 ConsoleOutputEntry 接口
```typescript
export interface ConsoleOutputEntry {
  type: 'info' | 'error' | 'warning' | 'log' | 'chart';
  message: string;
  timestamp?: number;
  // 新增字段
  hasVisualContent?: boolean;
  visualElementType?: 'canvas' | 'svg' | 'img' | 'iframe' | 'unknown';
  chartDescription?: string; // 例如: "Time series chart", "Histogram"
}
```

### 在 handleGetConsoleOutput 中添加图表检测
```typescript
// 检测可视化元素
const visualElements = logElement.querySelectorAll('canvas, svg, img, iframe, [class*="chart"]');

if (visualElements.length > 0) {
  type = 'chart';
  hasVisualContent = true;

  // 确定图表类型
  if (logElement.querySelector('canvas')) {
    visualElementType = 'canvas';
  } else if (logElement.querySelector('svg')) {
    visualElementType = 'svg';
  } else if (logElement.querySelector('img')) {
    visualElementType = 'img';
  } else if (logElement.querySelector('iframe')) {
    visualElementType = 'iframe';
  }

  // 尝试获取图表描述
  const chartTitle = logElement.querySelector('[class*="title"], h3, h4');
  if (chartTitle) {
    chartDescription = chartTitle.textContent;
  }

  // 提示 AI 使用 screenshot 查看
  message = message + ' [Visual chart detected - use screenshot tool to view details]';
}
```

## 测试计划
1. 运行 `analyze-chart-structure.js` 中的 GEE 代码生成图表
2. 运行浏览器控制台分析脚本
3. 确认图表的 DOM 结构
4. 实现图表检测逻辑
5. 测试 AI 能否识别并使用 screenshot 工具查看

## 优先级
- **P0**: 检测图表存在并标记（元数据方案）
- **P1**: 提示 AI 使用 screenshot 工具
- **P2**: 可选 - 提取 canvas/svg 为 base64 图片
