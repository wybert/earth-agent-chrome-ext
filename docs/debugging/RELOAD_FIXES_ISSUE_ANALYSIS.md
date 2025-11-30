# "重新加载扩展修复问题" - 根本原因分析

## 问题描述

用户发现：**重新加载扩展后，代码重复执行的问题消失了**

这是一个非常重要的发现，说明问题与**状态累积**或**缓存**有关，而不是逻辑错误。

## 🔍 可能的根本原因

### 1. ⚠️ Content Script 重复监听器问题（最可能）

**发现**：在 `src/content/index.ts` 中有**两个** `chrome.runtime.onMessage.addListener` 调用：

```typescript
// Line 144-161: setupPingResponse()
function setupPingResponse() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message && message.type === 'PING') {
      // ...
    }
  });
}

// Line 164-260: 主消息监听器
chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
  // 处理所有消息类型
  switch (message.type) {
    case 'PING': // ...
    case 'RUN_CODE': // ...
    case 'EDIT_SCRIPT': // ...
  }
});
```

**问题**：
1. **重复处理 PING 消息**：两个监听器都处理 PING
2. **热重载时监听器累积**：
   - 开发模式下，每次代码更新时 content script 会重新注入
   - 旧的监听器可能没有被移除
   - 导致同一个消息被多个监听器处理

**为什么重新加载扩展会修复**：
- 完全重新加载会清除所有旧的监听器
- Chrome 重新注入 content script，只有一套干净的监听器

### 2. Service Worker 状态累积

**可能的场景**：

在 `src/background/chat-handler.ts` 中，我们添加了去重机制：

```typescript
const recentToolCalls = new Map<string, RecentToolCall>();
```

**问题**：
- 这是一个全局 Map
- 在 service worker 的生命周期中持久化
- 如果有 bug，可能导致某些调用被错误地标记为重复或非重复

**为什么重新加载会修复**：
- 重新加载会清空 service worker 的所有全局状态
- Map 被重置为空

### 3. AI Tools 实例累积

在 `chat-handler.ts` 中：

```typescript
const { earthEngineScriptTool, earthEngineRunCodeTool, ... } = createAITools(onToolEvent);
```

**可能的问题**：
- 如果 `createAITools` 在某些情况下被多次调用
- 可能创建了多个工具实例
- 每个实例都可能处理消息

**验证方法**：
在 `createAITools` 函数开头添加日志：
```typescript
export function createAITools(onToolEvent?: ToolEventCallback) {
  console.log('🔧 [createAITools] Creating new tool instances at:', new Date().toISOString());
  console.log('🔧 [createAITools] Stack trace:', new Error().stack);
  // ...
}
```

### 4. Chrome 扩展开发模式的已知问题

**Chrome 的行为**：
- 开发模式下，文件更改时会自动重新加载扩展
- 但**不会**自动清理所有旧状态
- Content scripts 可能被多次注入到同一个页面

**相关 Chrome Bug**：
- Content script 可能在页面刷新前被多次注入
- Service worker 可能在休眠/唤醒时保留部分状态

## 🔧 诊断步骤

### 步骤 1: 验证监听器累积

在 content script 中添加计数器：

```typescript
// 在文件顶部添加
let listenerCount = 0;

// 在每个 addListener 前添加
listenerCount++;
console.log(`🔧 [Content Script] Adding listener #${listenerCount} at:`, new Date().toISOString());
console.log(`🔧 [Content Script] Total listeners should be: 1 (or 2 if using setupPingResponse)`);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log(`🔧 [Listener #${listenerCount}] Handling message:`, message.type);
  // ...
});
```

**测试**：
1. 重新加载扩展
2. 修改代码（触发热重载）
3. 再次修改代码
4. 查看 `listenerCount` 是否超过 2

### 步骤 2: 验证 Service Worker 状态

在 `chat-handler.ts` 中添加：

```typescript
// 在文件顶部添加
let chatHandlerInitCount = 0;
chatHandlerInitCount++;
console.log(`🔧 [Chat Handler] Module loaded/reloaded #${chatHandlerInitCount} at:`, new Date().toISOString());

export async function handleChatRequest(...) {
  console.log(`🔧 [handleChatRequest] Called. Module init count: ${chatHandlerInitCount}`);
  console.log(`🔧 [handleChatRequest] recentToolCalls size: ${recentToolCalls.size}`);
  // ...
}
```

### 步骤 3: 监控重复消息

在 content script 的消息处理器中：

```typescript
const processedMessages = new Set<string>();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const messageId = `${message.type}_${Date.now()}`;

  if (processedMessages.has(messageId)) {
    console.warn(`⚠️ [Duplicate Message] ${message.type} already processed!`);
    return false;
  }

  processedMessages.add(messageId);
  setTimeout(() => processedMessages.delete(messageId), 1000); // 清理旧消息

  // 正常处理...
});
```

## 🛠️ 可能的修复方案

### 修复 1: 移除重复的 PING 监听器（推荐）

**问题**：`setupPingResponse()` 创建了一个专门的 PING 监听器，但主监听器也处理 PING

**修复**：移除 `setupPingResponse()` 或者确保只有一个监听器

```typescript
// 方案 A: 移除 setupPingResponse()，只使用主监听器
// 删除第 144-161 行

// 方案 B: 确保 setupPingResponse 不重复调用
let pingListenerAdded = false;
function setupPingResponse() {
  if (pingListenerAdded) {
    console.log('Ping listener already added, skipping...');
    return;
  }
  pingListenerAdded = true;
  chrome.runtime.onMessage.addListener(...);
}
```

### 修复 2: 清理旧监听器

在添加新监听器前，移除旧的：

```typescript
// 保存监听器引用
let messageListener: ((message: any, sender: any, sendResponse: any) => void) | null = null;

// 添加监听器前，先移除旧的
if (messageListener) {
  chrome.runtime.onMessage.removeListener(messageListener);
  console.log('Removed old message listener');
}

// 创建新监听器
messageListener = (message, sender, sendResponse) => {
  // ...
};

chrome.runtime.onMessage.addListener(messageListener);
```

### 修复 3: Singleton 工具实例

确保 `createAITools` 只被调用一次：

```typescript
// In chat-handler.ts
let toolsCache: ReturnType<typeof createAITools> | null = null;

export async function handleChatRequest(...) {
  // ...

  // 创建或重用工具实例
  if (!toolsCache) {
    console.log('🔧 [Chat Handler] Creating AI tools for the first time');
    toolsCache = createAITools(onToolEvent);
  } else {
    console.log('🔧 [Chat Handler] Reusing cached AI tools');
  }

  const { earthEngineScriptTool, ... } = toolsCache;
  // ...
}
```

### 修复 4: 添加消息去重（防御性编程）

在 content script 中：

```typescript
const DEDUPE_WINDOW_MS = 500; // 500ms 去重窗口
const recentMessages = new Map<string, number>();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 生成消息指纹
  const messageFingerprint = `${message.type}_${JSON.stringify(message)}`;
  const now = Date.now();

  // 清理旧消息
  for (const [key, timestamp] of recentMessages.entries()) {
    if (now - timestamp > DEDUPE_WINDOW_MS * 2) {
      recentMessages.delete(key);
    }
  }

  // 检查是否是重复消息
  const lastSeen = recentMessages.get(messageFingerprint);
  if (lastSeen && now - lastSeen < DEDUPE_WINDOW_MS) {
    console.warn(`⚠️ [Dedupe] Ignoring duplicate message: ${message.type} (within ${now - lastSeen}ms)`);
    return false;
  }

  recentMessages.set(messageFingerprint, now);

  // 正常处理消息
  // ...
});
```

## 🧪 测试计划

### 测试 1: 热重载压力测试

1. 重新加载扩展
2. 在 content script 中添加监控日志
3. 修改代码 10 次（触发 10 次热重载）
4. 发送测试请求
5. 检查是否有重复执行

**预期**：
- 如果是监听器累积问题，重复次数会随热重载次数增加
- 重新加载扩展后问题消失

### 测试 2: 长时间运行测试

1. 重新加载扩展
2. 使用扩展 1 小时（发送多个请求）
3. 观察是否出现重复
4. 重新加载扩展
5. 再次测试

**预期**：
- 如果是状态累积问题，长时间运行后会出现重复
- 重新加载后恢复正常

## 📊 预期诊断结果

基于"重新加载修复问题"这个现象，最可能的原因排序：

1. **90% 可能性**：Content script 监听器累积（有两个 addListener）
2. **5% 可能性**：Service worker 状态累积
3. **3% 可能性**：Chrome 开发模式 bug
4. **2% 可能性**：AI Tools 实例重复创建

## 🎯 推荐行动计划

**立即实施**：
1. 移除 `setupPingResponse()` 中的重复 PING 监听器
2. 添加监听器计数日志验证

**短期实施**：
1. 添加消息去重机制作为安全网
2. 监控 service worker 状态

**长期实施**：
1. 考虑使用单例模式管理工具实例
2. 添加完整的生命周期管理

## 相关文件

- `src/content/index.ts:144-161` - setupPingResponse (重复监听器)
- `src/content/index.ts:164` - 主消息监听器
- `src/background/chat-handler.ts:30-64` - 去重机制（我们添加的）
- `src/lib/tools/ai-tools.ts` - 工具定义

## 后续跟踪

如果修复后问题仍然存在，需要：
1. 使用新添加的诊断日志
2. 记录详细的重现步骤
3. 检查是否与特定 AI 模型有关
4. 考虑提交 Chrome extension bug report
