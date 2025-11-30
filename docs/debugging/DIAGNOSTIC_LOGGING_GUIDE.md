# Diagnostic Logging Guide - Duplicate Code Execution Bug

## 目的

这份文档说明了我们添加的诊断日志，用于追踪和理解为什么 Agent 会重复执行相同的代码。

## 添加的日志位置

### 1. AI Tools 执行日志 (src/lib/tools/ai-tools.ts)

每次工具调用都会生成唯一的 `executionId`，格式如：
- `exec_1701234567890_abc123def` (earthEngineScript)
- `run_1701234567890_xyz789ghi` (earthEngineRunCode)

#### 日志模式

**工具执行开始：**
```
🔧 [EarthEngineScriptTool][exec_XXX] ========== TOOL EXECUTION START ==========
🔧 [EarthEngineScriptTool][exec_XXX] scriptId: "current"
🔧 [EarthEngineScriptTool][exec_XXX] code length: 1234 characters
🔧 [EarthEngineScriptTool][exec_XXX] code preview: // Sentinel-2 NDVI...
🔧 [EarthEngineScriptTool][exec_XXX] timestamp: 2025-11-30T12:34:56.789Z
🔧 [EarthEngineScriptTool][exec_XXX] Sending tool_start event
🔧 [EarthEngineScriptTool][exec_XXX] Starting execution...
```

**工具执行成功：**
```
✅ [EarthEngineScriptTool][exec_XXX] Successfully edited script "current_editor"
✅ [EarthEngineScriptTool][exec_XXX] Result: {
  "success": true,
  "scriptId": "current_editor",
  "message": "Successfully inserted code..."
}
✅ [EarthEngineScriptTool][exec_XXX] ========== TOOL EXECUTION SUCCESS ==========
```

**工具执行失败：**
```
❌ [EarthEngineScriptTool][exec_XXX] Failed to edit script via content script: ...
❌ [EarthEngineScriptTool][exec_XXX] ========== TOOL EXECUTION FAILED ==========
```

### 2. Chat Handler 流式响应日志 (src/background/chat-handler.ts)

#### onStepStart 回调

当 AI 开始调用工具时触发：

```
🔧 [Chat Handler] ========== onStepStart CALLED ==========
🔧 [Chat Handler] Timestamp: 2025-11-30T12:34:56.789Z
🔧 [Chat Handler] Number of tool calls: 1
🔧 [Chat Handler] toolCalls: [
  {
    "toolName": "earthEngineRunCode",
    "toolCallId": "call_abc123",
    "args": {
      "code": "// Sentinel-2 NDVI..."
    }
  }
]
🛠️ [Tool Start][1/1] earthEngineRunCode
   - Tool ID: call_abc123
   - Args: { code: "..." }
   - Code length: 1234 characters
   - Code preview: // Sentinel-2 NDVI...
🔧 [Chat Handler] ========== onStepStart END ==========
```

#### onStepFinish 回调

当工具执行完成时触发：

```
🔧 [Chat Handler] ========== onStepFinish CALLED ==========
🔧 [Chat Handler] Timestamp: 2025-11-30T12:34:57.123Z
🔧 [Chat Handler] Number of tool calls: 1
🔧 [Chat Handler] Number of tool results: 1
✅ [Tool Finish][1/1] earthEngineRunCode
   - Tool ID: call_abc123
   - Result status: completed
   - Result type: object
   - Result preview: {"success":true,"result":"Code executed successfully"...}
   - Execution ID: run_1701234567890_xyz789ghi
   - Success: true
🔧 [Chat Handler] Calling onToolEvent with tool_finish
🔧 [Chat Handler] ========== onStepFinish END ==========
```

## 如何使用这些日志诊断问题

### 步骤 1: 打开 Chrome DevTools

1. **Background Service Worker 日志**：
   - Right-click 扩展图标 → "Inspect service worker"
   - 或者访问 `chrome://extensions/` → 找到扩展 → "background page" → "service worker"

2. **Content Script 日志**：
   - 在 GEE Code Editor 页面打开 DevTools (F12)
   - 切换到 Console 标签

### 步骤 2: 清空日志并重现问题

1. 在两个 DevTools 中清空控制台 (Clear console)
2. 在 Extension sidepanel 中发送测试请求：
   ```
   Please load the latest Sentinel-2 images and calculate NDVI for Singapore
   ```

### 步骤 3: 分析日志模式

#### 查找重复执行的证据

**正常情况（只执行一次）：**
```
========== onStepStart CALLED ==========
Number of tool calls: 1
...
[Tool Start][1/1] earthEngineRunCode
...
========== onStepStart END ==========

[EarthEngineRunCodeTool][run_XXX] ========== TOOL EXECUTION START ==========
...
[EarthEngineRunCodeTool][run_XXX] ========== TOOL EXECUTION SUCCESS ==========

========== onStepFinish CALLED ==========
Number of tool calls: 1
...
[Tool Finish][1/1] earthEngineRunCode
...
========== onStepFinish END ==========
```

**异常情况（重复执行）：**

**情况 A - 多次 onStepStart**
```
========== onStepStart CALLED ==========
Number of tool calls: 1
[Tool Start][1/1] earthEngineRunCode
========== onStepStart END ==========

========== onStepStart CALLED ==========  ← 第二次！
Number of tool calls: 1
[Tool Start][1/1] earthEngineRunCode
========== onStepStart END ==========

========== onStepStart CALLED ==========  ← 第三次！
...
```
**说明**：AI 模型在流式响应中多次请求调用同一个工具

**情况 B - 单次 onStepStart，多个工具调用**
```
========== onStepStart CALLED ==========
Number of tool calls: 20  ← 一次性调用 20 个！
[Tool Start][1/20] earthEngineRunCode
[Tool Start][2/20] earthEngineRunCode
[Tool Start][3/20] earthEngineRunCode
...
[Tool Start][20/20] earthEngineRunCode
========== onStepStart END ==========
```
**说明**：AI 模型在单次响应中生成了 20 个相同的工具调用

**情况 C - 工具内部循环**
```
[EarthEngineRunCodeTool][run_XXX_1] ========== TOOL EXECUTION START ==========
[EarthEngineRunCodeTool][run_XXX_1] ========== TOOL EXECUTION SUCCESS ==========

[EarthEngineRunCodeTool][run_XXX_2] ========== TOOL EXECUTION START ==========  ← 新的 executionId
[EarthEngineRunCodeTool][run_XXX_2] ========== TOOL EXECUTION SUCCESS ==========

[EarthEngineRunCodeTool][run_XXX_3] ========== TOOL EXECUTION START ==========
...
```
**说明**：工具本身被多次调用（每次都有新的 executionId）

### 步骤 4: 记录关键信息

创建一个问题报告，包含：

1. **执行次数**：数一下有多少个不同的 `executionId`
2. **时间间隔**：计算连续执行之间的时间差
3. **调用模式**：是单次 step 多次调用，还是多次 step？
4. **Tool ID**：记录 `toolCallId` 是否相同
5. **代码内容**：确认每次调用的代码是否完全相同

### 步骤 5: 使用搜索过滤

在 DevTools Console 中使用过滤器：

**只看工具执行开始：**
```
TOOL EXECUTION START
```

**只看 onStepStart：**
```
onStepStart CALLED
```

**只看 executionId：**
```
[exec_
```
或
```
[run_
```

**计数特定 executionId：**
1. 复制一个 executionId（如 `exec_1701234567890_abc123def`）
2. Ctrl+F 搜索
3. 看看出现了多少次

## 预期诊断结果

根据日志模式，我们能判断问题出在哪个层面：

### 诊断结果 1: AI 模型层问题

**现象**：
- 单次 `onStepStart` 包含 20 个相同工具调用
- 或者多次 `onStepStart`，每次都调用相同工具

**根本原因**：
- AI 模型的 text generation 本身生成了重复的工具调用
- 可能是提示词问题，或者模型的推理错误

**修复方向**：
- 改进系统提示
- 添加反模式约束
- 考虑使用不同的 AI 模型

### 诊断结果 2: 流式响应处理问题

**现象**：
- 工具执行的 `executionId` 完全不同
- 时间间隔很短（几毫秒到几秒）
- 日志显示工具被重复调用，但 `onStepStart` 只出现一次

**根本原因**：
- `streamText()` 的流式处理中出现了某种循环
- 可能是事件监听器被多次触发

**修复方向**：
- 检查 `chat-handler.ts` 中的流式响应处理
- 添加去重机制
- 检查是否有事件监听器泄漏

### 诊断结果 3: Content Script 问题

**现象**：
- Background logs 显示只调用了一次
- Content script logs 显示 `handleEditScript` 被调用多次
- 编辑器内容被重复更新

**根本原因**：
- Content script 的消息处理有问题
- 可能是消息监听器被重复注册

**修复方向**：
- 检查 `src/content/index.ts` 中的消息监听器
- 确认 singleton 模式是否正常工作

## 示例诊断场景

### 场景：用户报告代码重复 20 次

**Step 1: 收集日志**

在 Background Service Worker console 搜索 `onStepStart CALLED`，发现：
```
========== onStepStart CALLED ==========
Number of tool calls: 20
```

**Step 2: 查看工具调用详情**

展开 `toolCalls` JSON，发现所有 20 个调用都是：
```json
{
  "toolName": "earthEngineRunCode",
  "toolCallId": "call_abc123_1",
  "args": { "code": "// Sentinel-2 NDVI for Singapore..." }
}
{
  "toolName": "earthEngineRunCode",
  "toolCallId": "call_abc123_2",
  "args": { "code": "// Sentinel-2 NDVI for Singapore..." }
}
...
{
  "toolName": "earthEngineRunCode",
  "toolCallId": "call_abc123_20",
  "args": { "code": "// Sentinel-2 NDVI for Singapore..." }
}
```

**Step 3: 诊断结论**

- ✅ 所有工具调用在**同一个** `onStepStart` 中
- ✅ 代码内容完全相同
- ✅ Tool IDs 不同（说明是不同的调用）

**结论**：AI 模型在生成响应时，一次性生成了 20 个重复的工具调用。这是 AI 模型层的问题。

**修复建议**：
1. 改进系统提示，明确禁止重复工具调用
2. 添加去重机制作为安全网
3. 考虑切换到不同的 AI 模型测试

## 清理日志

如果日志太多影响性能，可以在诊断完成后注释掉部分日志：

```typescript
// 保留关键日志
console.log(`🔧 [EarthEngineScriptTool][${executionId}] ========== TOOL EXECUTION START ==========`);

// 可以注释掉详细日志
// console.log(`🔧 [EarthEngineScriptTool][${executionId}] code length: ${code.length} characters`);
// console.log(`🔧 [EarthEngineScriptTool][${executionId}] code preview: ${code.substring(0, 150)}...`);
```

## 相关文件

- `src/lib/tools/ai-tools.ts` - 工具执行日志
- `src/background/chat-handler.ts` - 流式响应日志
- `docs/debugging/DUPLICATE_CODE_EXECUTION_BUG.md` - 问题分析文档
