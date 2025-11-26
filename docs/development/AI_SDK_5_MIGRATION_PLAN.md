# AI SDK 5.0 迁移计划

## 当前状态
- **当前版本**: AI SDK 4.3.13
- **目标版本**: AI SDK 5.0.0
- **影响范围**:
  - `src/background/chat-handler.ts` (核心streaming和tool定义)
  - `src/components/Chat.tsx` (useChat hook使用)
  - `src/components/ui/chat-message.tsx` (Message类型定义)

---

## 🎯 迁移策略

采用**渐进式迁移**策略：
1. 首先更新依赖包
2. 运行自动化codemod工具
3. 手动修复关键Breaking Changes
4. 测试所有AI功能
5. 更新文档

---

## 🎯 额外功能改进

### 启用OpenAI对Screenshot工具的支持

**当前状态**: 你的代码只为Anthropic启用了multi-modal tool results
**目标**: 迁移后同时支持Anthropic和OpenAI

**当前代码** (`chat-handler.ts:1790-1792`):
```typescript
if (provider === 'anthropic') {
  // Enable experimental content for multi-modal tool responses (supported by Anthropic)
  streamOptions.experimental_enableToolContentInResult = true;
}
```

**迁移后**:
```typescript
// ❌ experimental_enableToolContentInResult 在v5中已移除
// ✅ toModelOutput 自动启用multi-modal support

// 不需要额外配置，只要使用toModelOutput即可
// Anthropic和OpenAI都会自动支持
```

**关键点**:
1. AI SDK 5.0中，`experimental_enableToolContentInResult` 已被移除
2. 使用 `toModelOutput` 后，Anthropic和OpenAI都会自动支持multi-modal results
3. 需要确保使用vision-capable模型（如gpt-4, gpt-4.1, claude-sonnet-4）

---

## 📋 详细迁移步骤

### 阶段 1: 准备迁移环境 (15分钟)

#### 1.1 备份当前代码
```bash
git checkout -b migration/ai-sdk-5.0
git add -A
git commit -m "Backup before AI SDK 5.0 migration"
```

#### 1.2 更新package.json依赖
```bash
npm install ai@^5.0.0 @ai-sdk/react@^2.0.0 @ai-sdk/openai@^2.0.0 @ai-sdk/anthropic@^2.0.0 @ai-sdk/google@^2.0.0 zod@^4.1.8
```

**关键包更新**:
- `ai`: ^4.3.13 → ^5.0.0
- `@ai-sdk/openai`: ^1.3.17 → ^2.0.0
- `@ai-sdk/anthropic`: ^1.2.10 → ^2.0.0
- `@ai-sdk/google`: ^1.2.19 → ^2.0.0
- `zod`: (当前版本) → ^4.1.8
- **新增**: `@ai-sdk/react`: ^2.0.0

#### 1.3 运行自动化Codemod
```bash
# 运行所有AI SDK 5.0的自动转换
npx @ai-sdk/codemod v5
```

---

### 阶段 2: 更新核心API调用 (30分钟)

文件: `src/background/chat-handler.ts`

#### 2.1 更新Import语句

**修改前**:
```typescript
import { Message, CoreMessage, streamText, tool, TextPart, ImagePart, FilePart } from 'ai';
```

**修改后**:
```typescript
import { UIMessage, ModelMessage, streamText, tool, TextPart, ImagePart, FilePart } from 'ai';
// Message → UIMessage (UI层消息)
// CoreMessage → ModelMessage (模型层消息)
```

#### 2.2 更新Tool定义 - 关键Breaking Changes

**修改前**:
```typescript
const weatherTool = tool({
  description: 'Get weather for a location',
  parameters: z.object({
    location: z.string().describe('City name')
  }),
  execute: async ({ location }) => {
    // ...
  }
});
```

**修改后**:
```typescript
const weatherTool = tool({
  description: 'Get weather for a location',
  inputSchema: z.object({  // parameters → inputSchema
    location: z.string().describe('City name')
  }),
  execute: async ({ location }) => {
    // ...
  }
});
```

**需要修改的所有tool定义**:
- `earthEngineDatasetTool`
- `screenshotTool` ⚠️ **还需要更新toModelOutput**
- `snapshotTool` ⚠️ **还需要更新toModelOutput**
- `clickByRefIdTool` ⚠️ **还需要更新toModelOutput**
- `clickByCoordinatesTool` ⚠️ **还需要更新toModelOutput**
- `earthEngineScriptTool`
- `earthEngineRunCodeTool`
- `resetMapInspectorConsoleTool` ⚠️ **还需要更新toModelOutput**
- `clearScriptTool` ⚠️ **还需要更新toModelOutput**
- `weatherTool`

#### 2.2.1 🔴 重要：更新 experimental_toToolResultContent → toModelOutput

你的代码中有**6个工具**使用了 `experimental_toToolResultContent`，这是一个**重大breaking change**：

**Screenshot工具（返回图像）**:

**修改前**:
```typescript
const screenshotTool = tool({
  description: 'Take a screenshot',
  parameters: z.object({}),
  execute: async () => {
    const imageData = await takeScreenshot();
    return imageData; // base64 string
  },
  experimental_toToolResultContent: (result: any) => {
    if (!result.success) {
      return [{ type: 'text', text: `Error: ${result.error}` }];
    }

    let base64Data = result.screenshotDataUrl;
    // Remove data URL prefix...

    return [{
      type: 'image',
      data: base64Data
    }];
  },
});
```

**修改后**:
```typescript
const screenshotTool = tool({
  description: 'Take a screenshot',
  inputSchema: z.object({}),  // parameters → inputSchema
  execute: async () => {
    const imageData = await takeScreenshot();
    return imageData;
  },
  toModelOutput: (result: any) => {  // experimental_toToolResultContent → toModelOutput
    if (!result.success) {
      return {
        type: 'content',
        value: [{ type: 'text', text: `Error: ${result.error}` }]
      };
    }

    let base64Data = result.screenshotDataUrl;
    // Remove data URL prefix...

    return {
      type: 'content',  // 新增：必须包装在content对象中
      value: [{        // 数组改为value字段
        type: 'media', // image → media
        mediaType: 'image/png',  // 新增：必须指定mediaType
        data: base64Data
      }]
    };
  },
});
```

**关键变化**:
1. `experimental_toToolResultContent` → `toModelOutput`
2. 返回值必须包装在 `{ type: 'content', value: [...] }` 对象中
3. `type: 'image'` → `type: 'media'`
4. 必须添加 `mediaType: 'image/png'` 字段

**其他工具（返回文本）**:

**修改前**:
```typescript
experimental_toToolResultContent: (result: any) => {
  return [{
    type: 'text',
    text: result.success ? '✅ Success' : `❌ Error: ${result.error}`
  }];
}
```

**修改后**:
```typescript
toModelOutput: (result: any) => {
  return {
    type: 'content',
    value: [{
      type: 'text',
      text: result.success ? '✅ Success' : `❌ Error: ${result.error}`
    }]
  };
}
```

**需要更新toModelOutput的工具清单**:
1. ✅ `screenshotTool` - 返回图像
2. ✅ `snapshotTool` - 返回DOM快照（可能也有图像）
3. ✅ `clickByRefIdTool` - 返回文本
4. ✅ `clickByCoordinatesTool` - 返回文本
5. ✅ `resetMapInspectorConsoleTool` - 返回文本
6. ✅ `clearScriptTool` - 返回文本

#### 2.3 更新streamText参数

**修改前**:
```typescript
const result = await streamText({
  model: ...,
  messages: messages,
  maxTokens: 4096,
  maxSteps: 12,  // 控制多步骤执行
  toolCallStreaming: false,  // 禁用工具调用流式传输
  experimental_continueSteps: true,  // 实验性：继续步骤
  // ...
});
```

**修改后**:
```typescript
import { stepCountIs } from 'ai';

const result = await streamText({
  model: ...,
  messages: messages,
  maxOutputTokens: 4096,  // maxTokens → maxOutputTokens
  // ❌ maxSteps已移除，改用stopWhen
  stopWhen: stepCountIs(12),  // 新方式：在12步后停止
  // ❌ toolCallStreaming已移除 (总是启用)
  // ❌ experimental_continueSteps已移除 (使用更高的maxOutputTokens)
  // ...
});
```

**stopWhen条件选项**:
```typescript
import { stepCountIs, hasToolCall } from 'ai';

// 选项1: 步骤数限制
stopWhen: stepCountIs(12)

// 选项2: 当特定工具被调用时停止
stopWhen: hasToolCall('screenshot')

// 选项3: 多个条件（满足任一即停止）
stopWhen: [stepCountIs(10), hasToolCall('clearScript')]

// 选项4: 自定义函数
stopWhen: (steps) => {
  return steps.length >= 5 && steps[steps.length - 1].toolResults.length > 0;
}
```

⚠️ **重要**: `stopWhen` 只在最后一步包含tool results时触发！

#### 2.4 启用OpenAI Multi-modal Tool Results支持

**当前代码** (`chat-handler.ts:1784-1792`):
```typescript
// For Anthropic models, add special headers for browser usage
if (provider === 'anthropic') {
  console.log(`🔧 [Chat Handler] Adding special headers for Anthropic browser usage`);
  streamOptions.headers = {
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true'
  };
  // Enable experimental content for multi-modal tool responses (supported by Anthropic)
  streamOptions.experimental_enableToolContentInResult = true;  // ❌ 在v5中移除
}
```

**迁移后的代码**:
```typescript
// For Anthropic models, add special headers for browser usage
if (provider === 'anthropic') {
  console.log(`🔧 [Chat Handler] Adding special headers for Anthropic browser usage`);
  streamOptions.headers = {
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true'
  };
  // ❌ 移除：experimental_enableToolContentInResult（v5中已不存在）
}

// ✅ 不需要额外配置！
// 在AI SDK 5.0中，使用toModelOutput后，
// Anthropic和OpenAI会自动支持multi-modal tool results
```

**关键变化**:
1. 删除 `experimental_enableToolContentInResult` 设置
2. 在AI SDK 5.0中，只要工具使用了 `toModelOutput` 返回图像，OpenAI和Anthropic都会自动支持
3. 确保使用vision-capable模型：
   - **OpenAI**: `gpt-4`, `gpt-4.1`, `gpt-4o` 等
   - **Anthropic**: `claude-sonnet-4-20250514`, `claude-3-5-sonnet-20241022` 等

#### 2.5 工具错误处理变更

**修改前**:
```typescript
import { ToolExecutionError } from 'ai';

try {
  const result = await generateText({...});
} catch (error) {
  if (error instanceof ToolExecutionError) {
    console.log('Tool error:', error.message);
  }
}
```

**修改后**:
```typescript
// ToolExecutionError类已移除
// 错误现在作为result.steps中的tool-error parts返回

const { steps } = await generateText({...});

const toolErrors = steps.flatMap(step =>
  step.content.filter(part => part.type === 'tool-error')
);

toolErrors.forEach(toolError => {
  console.log('Tool error:', toolError.error);
  console.log('Tool name:', toolError.toolName);
});
```

---

### 阶段 3: 迁移UI组件 (45分钟)

文件: `src/components/Chat.tsx`

#### 3.1 更新import路径

**修改前**:
```typescript
import { useChat, type Message } from 'ai';
// 或 from 'ai/react'
```

**修改后**:
```typescript
import { useChat, type UIMessage } from '@ai-sdk/react';
// 移动到新的@ai-sdk/react包
// Message → UIMessage
```

#### 3.2 更新useChat Hook配置

**修改前**:
```typescript
const {
  messages,
  input,
  handleInputChange,
  handleSubmit,
  append,
  reload,
  isLoading,
  maxSteps: 5
} = useChat({
  api: '/api/chat',
  initialMessages: storedMessages,
  onResponse: (response) => {
    // ...
  }
});
```

**修改后**:
```typescript
import { useChat, DefaultChatTransport } from '@ai-sdk/react';

const {
  messages,
  // ❌ 移除: input, handleInputChange (需要自己管理)
  handleSubmit,
  sendMessage,  // append → sendMessage
  regenerate,   // reload → regenerate
  isGenerating, // isLoading → isGenerating
  // ❌ 移除: maxSteps (改用服务端stopWhen)
} = useChat({
  transport: new DefaultChatTransport({  // 新增transport配置
    api: '/api/chat',
  }),
  messages: storedMessages,  // initialMessages → messages
  // ❌ onResponse已移除
});

// 需要自己管理input状态
const [input, setInput] = useState('');
const handleInputChange = (e) => setInput(e.target.value);
```

#### 3.3 更新Message类型定义

文件: `src/components/ui/chat-message.tsx`

**修改前**:
```typescript
export interface Message {
  id: string
  role: "user" | "assistant" | "tool" | "system"
  content?: string  // 直接的string内容
  parts?: Array<MessagePart>
  toolInvocations?: ToolInvocation[]
}
```

**修改后**:
```typescript
import { UIMessage } from '@ai-sdk/react';

// 使用官方类型或自定义扩展
export interface Message {
  id: string
  role: "user" | "assistant" | "tool" | "system"
  parts: Array<MessagePart>  // 现在是必需的，不再有content string
  // ❌ 移除: content直接字段
}

// 如果需要显示文本，从parts中提取
function getTextFromMessage(message: UIMessage): string {
  return message.parts
    .filter(part => part.type === 'text')
    .map(part => part.text)
    .join('');
}
```

#### 3.4 更新Tool Invocation状态

**修改前**:
```typescript
message.parts?.map((part, index) => {
  if (part.type === 'tool-invocation') {
    switch (part.toolInvocation.state) {
      case 'partial-call':
        return <div>Loading...</div>;
      case 'call':
        return <div>Calling {part.toolName} with {part.args}</div>;
      case 'result':
        return <div>Result: {part.result}</div>;
    }
  }
})
```

**修改后**:
```typescript
message.parts?.map((part, index) => {
  // Tool invocation类型现在是 tool-{toolName}
  if (part.type.startsWith('tool-')) {
    switch (part.state) {
      case 'input-streaming':  // partial-call → input-streaming
        return <div>Streaming input...</div>;
      case 'input-available':  // call → input-available
        return <div>Calling {part.toolName} with {part.input}</div>; // args → input
      case 'output-available': // result → output-available
        return <div>Result: {part.output}</div>; // result → output
      case 'output-error':     // 新增错误状态
        return <div>Error: {part.errorText}</div>;
    }
  }
})
```

---

### 阶段 4: 更新类型定义 (20分钟)

#### 4.1 更新全局类型文件

文件: `src/types/extension.ts`

**需要更新的类型**:
- `Message` → `UIMessage`
- `CoreMessage` → `ModelMessage`
- 移除 `data` role
- 更新 tool invocation 相关类型

#### 4.2 Message Parts结构变更

**旧的content结构**:
```typescript
{
  role: 'user',
  content: 'Hello'  // 直接string
}
```

**新的parts结构**:
```typescript
{
  role: 'user',
  parts: [
    { type: 'text', text: 'Hello' }
  ]
}
```

**Reasoning移至parts**:
```typescript
// 旧
{
  role: 'assistant',
  content: 'Hello',
  reasoning: 'I will greet the user'
}

// 新
{
  role: 'assistant',
  parts: [
    { type: 'reasoning', text: 'I will greet the user' },
    { type: 'text', text: 'Hello' }
  ]
}
```

---

### 阶段 5: 测试和验证 (30分钟)

#### 5.1 功能测试清单

- [ ] **基础对话测试**
  - [ ] 发送简单文本消息
  - [ ] 接收AI回复
  - [ ] 流式响应正常显示

- [ ] **工具调用测试**
  - [ ] earthEngineDataset工具正常工作
  - [ ] screenshot工具正常工作
  - [ ] earthEngineScript工具正常工作
  - [ ] earthEngineRunCode工具正常工作
  - [ ] 工具错误能正确显示

- [ ] **多步骤测试**
  - [ ] 工具链式调用工作正常
  - [ ] 多个工具连续执行

- [ ] **UI测试**
  - [ ] 消息正确渲染
  - [ ] 代码块格式正确
  - [ ] Tool invocation状态显示正确
  - [ ] Loading状态正确

- [ ] **Provider测试**
  - [ ] OpenAI provider正常
    - [ ] **✨ 新功能：测试screenshot工具返回图像**
    - [ ] 使用vision模型（gpt-4, gpt-4.1）
    - [ ] 验证AI能"看到"并分析截图
  - [ ] Anthropic provider正常
    - [ ] 测试screenshot工具返回图像（已有功能）
    - [ ] 使用Claude Sonnet 4或Claude 3.5 Sonnet
  - [ ] Google provider正常
    - [ ] ⚠️ 注意：screenshot工具执行但AI无法看到图像
  - [ ] Qwen provider正常
    - [ ] ⚠️ 注意：screenshot工具执行但AI无法看到图像
  - [ ] Ollama provider正常
    - [ ] ⚠️ 注意：screenshot工具执行但AI无法看到图像

#### 5.2 构建测试
```bash
npm run type-check  # TypeScript类型检查
npm run build       # 构建测试
npm test            # 运行单元测试
```

#### 5.3 OpenAI Screenshot功能测试

**测试步骤**:

1. **切换到OpenAI provider**:
   - 在Settings中选择OpenAI
   - 选择vision模型（gpt-4, gpt-4.1, 或 gpt-4o）

2. **测试prompt示例**:
   ```
   "Please take a screenshot of the current page and describe what you see"
   ```

3. **期望行为**:
   - ✅ Screenshot工具被调用
   - ✅ AI收到图像并能描述内容
   - ✅ 响应包含对截图的详细分析

4. **对比测试Anthropic**:
   - 切换到Anthropic provider（Claude Sonnet 4）
   - 使用相同的prompt
   - 验证两个provider的行为一致

5. **验证其他provider的行为**:
   - 切换到Google Gemini
   - 使用相同的prompt
   - ⚠️ 工具会执行，但AI只能看到文本描述，无法看到图像

**成功标准**:
- [ ] OpenAI能正确接收和分析screenshot
- [ ] Anthropic能正确接收和分析screenshot（已有功能）
- [ ] Google/Qwen/Ollama正常执行但只返回文本（预期行为）

---

## ⚠️ 关键Breaking Changes总结

### 🔴 高优先级 (必须修改)

1. **Package结构变更**
   - `ai/react` → `@ai-sdk/react`
   - 需要安装新包

2. **参数重命名**
   - `parameters` → `inputSchema` (所有tool定义)
   - `maxTokens` → `maxOutputTokens`
   - `args` → `input` (tool calls)
   - `result` → `output` (tool results)
   - `experimental_toToolResultContent` → `toModelOutput` ⚠️ **返回格式完全改变**

3. **类型重命名**
   - `Message` → `UIMessage`
   - `CoreMessage` → `ModelMessage`

4. **useChat Hook重大变更**
   - 移除 `input`, `handleInputChange` (需要自己管理)
   - `append` → `sendMessage`
   - `reload` → `regenerate`
   - `initialMessages` → `messages`
   - 新增必需的 `transport` 配置
   - 移除 `maxSteps` (改用服务端 `stopWhen`)

4b. **streamText多步骤控制变更**
   - `maxSteps` → `stopWhen` (条件函数)
   - 移除 `toolCallStreaming` (总是启用)
   - 移除 `experimental_continueSteps` (改用更高的maxOutputTokens)

5. **Message结构变更**
   - `content: string` → `parts: Array<Part>`
   - Reasoning移至parts数组

6. **Tool状态变更**
   - `partial-call` → `input-streaming`
   - `call` → `input-available`
   - `result` → `output-available`
   - 新增 `output-error` 状态

### 🟡 中优先级 (建议修改)

7. **Tool Result Content转换** ⚠️ **影响6个工具**
   - `experimental_toToolResultContent` → `toModelOutput`
   - 返回格式从 `[{type, data}]` 改为 `{type: 'content', value: [{type, data}]}`
   - 图像类型：`type: 'image'` → `type: 'media'` + `mediaType: 'image/png'`
   - 影响的工具：
     - `screenshotTool` (返回图像)
     - `snapshotTool` (可能返回图像)
     - `clickByRefIdTool` (返回文本)
     - `clickByCoordinatesTool` (返回文本)
     - `resetMapInspectorConsoleTool` (返回文本)
     - `clearScriptTool` (返回文本)

8. **错误处理变更**
   - 移除 `ToolExecutionError` class
   - 错误现在在 `steps` 中作为 `tool-error` parts

9. **Provider Options**
   - `providerMetadata` → `providerOptions` (输入参数)

### 🟢 低优先级 (可选)

10. **稳定化的API**
   - `experimental_wrapLanguageModel` → `wrapLanguageModel`

## ✨ 新功能增强

### OpenAI Screenshot支持

迁移到AI SDK 5.0后的额外收益：

1. **Multi-modal Tool Results自动启用**
   - 移除 `experimental_enableToolContentInResult`
   - OpenAI和Anthropic都自动支持工具返回图像

2. **扩展的Provider支持**
   - **之前**: 只有Anthropic能接收screenshot图像
   - **之后**: Anthropic + OpenAI 都能接收screenshot图像
   - Google/Qwen/Ollama: 工具正常执行但只返回文本

3. **推荐的Vision模型**
   - OpenAI: `gpt-4`, `gpt-4.1`, `gpt-4o`
   - Anthropic: `claude-sonnet-4-20250514`, `claude-3-5-sonnet-20241022`

---

## 📝 迁移检查清单

### 依赖更新
- [ ] 更新 `ai` 到 5.0.0
- [ ] 更新所有 `@ai-sdk/*` 到 2.0.0
- [ ] 安装 `@ai-sdk/react`
- [ ] 更新 `zod` 到 4.1.8+
- [ ] 运行 `npm install`

### 代码修改
- [ ] 运行 codemod: `npx @ai-sdk/codemod v5`
- [ ] 更新 `chat-handler.ts` 中的tool定义
- [ ] 更新 `Chat.tsx` 中的useChat使用
- [ ] 更新 `chat-message.tsx` 中的类型定义
- [ ] 更新所有 `parameters` → `inputSchema` (10个工具)
- [ ] 更新所有 `maxTokens` → `maxOutputTokens`
- [ ] 更新 `maxSteps` → `stopWhen` (使用stepCountIs)
- [ ] 移除 `toolCallStreaming` 和 `experimental_continueSteps`
- [ ] **✨ 移除 `experimental_enableToolContentInResult` 并启用OpenAI screenshot支持**
  - [ ] 删除 `if (provider === 'anthropic')` 中的 `experimental_enableToolContentInResult`
  - [ ] 验证OpenAI和Anthropic都能使用screenshot工具
- [ ] **更新所有 `experimental_toToolResultContent` → `toModelOutput` (6个工具)**
  - [ ] `screenshotTool` - 图像返回格式
  - [ ] `snapshotTool` - 可能包含图像
  - [ ] `clickByRefIdTool` - 文本返回格式
  - [ ] `clickByCoordinatesTool` - 文本返回格式
  - [ ] `resetMapInspectorConsoleTool` - 文本返回格式
  - [ ] `clearScriptTool` - 文本返回格式
- [ ] 实现自己的input状态管理
- [ ] 更新tool invocation状态处理

### 测试
- [ ] Type checking通过
- [ ] Build成功
- [ ] 所有provider测试通过
- [ ] 工具调用测试通过
- [ ] UI渲染测试通过
- [ ] 手动端到端测试

### 文档
- [ ] 更新 `CLAUDE.md`
  - [ ] 更新AI SDK版本到5.0
  - [ ] 添加OpenAI screenshot支持说明
- [ ] 更新 `README.md`
  - [ ] 更新AI Model Tool Support章节
  - [ ] 说明OpenAI和Anthropic都支持screenshot功能
- [ ] 更新 `memory-bank/techContext.md`
  - [ ] 更新AI SDK版本信息
  - [ ] 更新multi-modal支持provider列表

---

## 🚀 执行命令

```bash
# 1. 创建迁移分支
git checkout -b migration/ai-sdk-5.0

# 2. 更新依赖
npm install ai@^5.0.0 @ai-sdk/react@^2.0.0 @ai-sdk/openai@^2.0.0 @ai-sdk/anthropic@^2.0.0 @ai-sdk/google@^2.0.0 zod@^4.1.8

# 3. 运行自动化转换
npx @ai-sdk/codemod v5

# 4. 手动修复
# (按照上述步骤修改代码)

# 5. 测试
npm run type-check
npm run build
npm test

# 6. 提交
git add -A
git commit -m "feat: Migrate to AI SDK 5.0"

# 7. 合并到main
git checkout main
git merge migration/ai-sdk-5.0
```

---

## 📚 参考资源

- [AI SDK 5.0 Migration Guide](https://ai-sdk.dev/docs/migration-guides/migration-guide-5-0)
- [AI SDK 5.0 Documentation](https://ai-sdk.dev/docs)
- [Codemod Documentation](https://github.com/vercel/ai/tree/main/packages/codemod)
- [Breaking Changes Summary](https://ai-sdk.dev/docs/migration-guides/migration-guide-5-0#breaking-changes)

---

## ⏱️ 预计时间

- **总计**: 约2-3小时
  - 依赖更新和codemod: 15分钟
  - 核心API更新: 30分钟
  - UI组件迁移: 45分钟
  - 类型定义更新: 20分钟
  - 测试和验证: 30-60分钟

---

## 🆘 如果遇到问题

1. **类型错误**: 确保所有 `@ai-sdk/*` 包版本一致
2. **运行时错误**: 检查是否所有 `parameters` 都改成了 `inputSchema`
3. **UI不更新**: 检查 `useChat` 的 `transport` 配置
4. **Tool不工作**: 检查tool state的状态名称是否更新
5. **Build失败**: 运行 `npm run type-check` 查看详细错误

需要帮助？参考migration guide或创建issue。
