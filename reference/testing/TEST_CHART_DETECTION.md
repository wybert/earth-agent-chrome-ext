# 图表检测功能测试指南

## 功能说明

`getConsoleOutput` 工具现在可以检测 GEE 控制台中的图表和可视化内容，包括：

- Canvas 图表
- SVG 图形
- 图片
- iframe 嵌入内容

## 已实现的功能

### 1. 接口更新

```typescript
interface ConsoleOutputEntry {
  type: 'info' | 'error' | 'warning' | 'log' | 'chart';
  message: string;
  hasVisualContent?: boolean;
  visualElementType?: 'canvas' | 'svg' | 'img' | 'iframe' | 'unknown';
  chartDescription?: string;
}
```

### 2. 检测逻辑

- 自动扫描控制台条目中的可视化元素
- 识别元素类型（canvas, svg, img, iframe）
- 提取图表描述（如果有标题）
- 在消息中添加提示：`[📊 Chart/visualization detected]`

### 3. AI 输出格式

```
📋 Console Output (5 entries):

1. ℹ️ === START TEST ===
2. ℹ️ Entry 1: Simple text
3. 📊 Time series chart [📊 Chart/visualization detected - use screenshot tool to view details]
   Type: canvas
   Description: Time Series
4. ℹ️ Entry 2: Number: 42

💡 Tip: 1 chart(s) detected. Use the screenshot tool to capture and view the visualizations.
```

## 测试步骤

### Step 1: 重新加载扩展

1. 打开 `chrome://extensions/`
2. 找到 "Earth Agent" 扩展
3. 点击刷新按钮 🔄

### Step 2: 在 GEE 中生成图表

打开 https://code.earthengine.google.com 并运行以下代码：

```javascript
// 清除之前的输出
print('=== Chart Detection Test ===');

// 生成一个简单的时间序列图表
var chart = ui.Chart.image.series({
  imageCollection: ee
    .ImageCollection('LANDSAT/LC08/C02/T1_TOA')
    .filterBounds(ee.Geometry.Point([-122.262, 37.8719]))
    .filterDate('2014-01-01', '2014-12-31')
    .select(['B4', 'B3', 'B2']),
  region: ee.Geometry.Point([-122.262, 37.8719]),
  reducer: ee.Reducer.mean(),
  scale: 200,
});
print('Chart Example:', chart);

// 添加一些普通输出作为对比
print('Regular text output');
print('Number:', 42);

// 生成直方图
var histogram = ui.Chart.image.histogram({
  image: ee.Image('LANDSAT/LC08/C02/T1_TOA/LC08_044034_20140318').select(['B4']),
  region: ee.Geometry.Rectangle([-122.45, 37.74, -122.38, 37.84]),
  scale: 30,
  maxBuckets: 100,
});
print('Histogram:', histogram);

print('=== End Test ===');
```

### Step 3: 使用浏览器控制台验证 DOM 结构

按 F12 打开 DevTools，在 Console 中运行：

```javascript
(function checkChartDetection() {
  const eeConsole = document.querySelector('ee-console');
  const logs = eeConsole.querySelectorAll('ee-console-log');

  console.log('Total entries:', logs.length);

  logs.forEach((log, i) => {
    const hasCanvas = log.querySelector('canvas');
    const hasSvg = log.querySelector('svg');
    const hasImg = log.querySelector('img');

    if (hasCanvas || hasSvg || hasImg) {
      console.log(`Entry ${i + 1}: HAS VISUAL CONTENT`);
      console.log('  Canvas:', !!hasCanvas);
      console.log('  SVG:', !!hasSvg);
      console.log('  IMG:', !!hasImg);
    }
  });
})();
```

### Step 4: 测试扩展工具

右键点击扩展图标 → "Inspect" 打开 service worker 控制台，运行：

```javascript
chrome.tabs.query({ url: '*://code.earthengine.google.com/*' }, (tabs) => {
  chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_CONSOLE_OUTPUT' }, (response) => {
    console.log('=== getConsoleOutput Result ===');
    console.log('Success:', response.success);
    console.log('Count:', response.count);
    console.log('');

    response.outputs.forEach((output, i) => {
      console.log(`${i + 1}. Type: ${output.type}`);
      console.log(`   Message: ${output.message.substring(0, 80)}`);
      if (output.hasVisualContent) {
        console.log(`   📊 Visual: ${output.visualElementType}`);
        if (output.chartDescription) {
          console.log(`   Description: ${output.chartDescription}`);
        }
      }
      console.log('');
    });
  });
});
```

### Step 5: 在 AI Chat 中测试

1. 打开扩展的 side panel
2. 确保选择了支持工具的模型（如 gpt-4o, claude-sonnet-4）
3. 发送消息：`"检查一下控制台输出"`
4. AI 应该能看到图表并提示使用 screenshot 工具查看

期望的 AI 响应：

```
我检查了控制台，发现了 6 个条目，其中包括 2 个图表：

1. ℹ️ === Chart Detection Test ===
2. 📊 Chart Example: [图表] (canvas 类型)
3. ℹ️ Regular text output
4. ℹ️ Number: 42
5. 📊 Histogram: [图表] (canvas 类型)
6. ℹ️ === End Test ===

💡 检测到 2 个图表。我可以使用 screenshot 工具来查看这些可视化内容，需要我截图查看吗？
```

## 预期结果

### ✅ 成功标准：

1. **检测准确**：能正确识别所有图表条目
2. **类型正确**：visualElementType 准确（canvas/svg/img）
3. **消息清晰**：包含 `[📊 Chart detected]` 提示
4. **图标正确**：图表条目使用 📊 图标
5. **提示有效**：在输出末尾显示 "Use screenshot tool" 提示

### ❌ 常见问题：

1. **图表未检测到**
   - 检查 DOM 结构是否正确
   - 确认 `querySelectorAll('canvas, svg, img, iframe')` 能找到元素

2. **type 不是 'chart'**
   - 检查 `hasVisualContent` 变量
   - 确认条件判断逻辑

3. **工具调用失败**
   - 确认扩展已重新加载
   - 检查 content script 是否注入成功

## 下一步

测试成功后，可以：

1. 让 AI 自动调用 screenshot 工具查看图表
2. 添加更多图表类型的测试用例
3. 考虑添加图表数据提取功能（高级功能）
