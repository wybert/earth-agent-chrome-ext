# Kimi / MiMo 多模态工具截图接入记录

本文记录 Kimi、MiMo 在 Earth Agent 中接收截图的实现方式、验证结果和已知边界。修改 AI provider、截图工具或 AI SDK 依赖前，请先读本文。

## 为什么需要专门处理

模型能看用户消息里的图片，不代表它也能看工具调用的图片结果。截图由 `screenshot` 或 `mapScreenshot` 工具产生；如果 AI SDK 或 provider 把 `role: tool` 的结果当成纯文本，图片就不会进入模型的视觉输入，某些兼容 API 还会拒绝这种 multipart 工具结果。

因此需要同时确认两件事：

1. provider 接受图片输入。
2. AI SDK 的 provider adapter 会把工具结果中的文本和图片编码成 OpenAI Chat Completions 可接受的 multipart 内容。

不要仅凭“模型支持 vision”就推断工具截图也能工作。

## 当前实现

内置 Kimi 和 MiMo 通过 `@ai-sdk/openai-compatible` 接入，而不是各自使用独立 AI SDK provider：

```ts
const compatible = createOpenAICompatible({
  name: isMimo ? 'xiaomi-mimo' : 'moonshot-kimi',
  apiKey,
  baseURL,
  supportsMultiPartToolContent: true,
});

const model = compatible.chatModel(modelId);
```

关键选项是 `supportsMultiPartToolContent: true`。`@ai-sdk/openai-compatible` 默认不会假定每个兼容服务都接受图片型工具结果；开启后，adapter 会把 multipart 工具内容按 Chat Completions 格式发送。我们把这条接入路径视为实验性能力：SDK 能编码多段工具结果，不等于每家兼容 API 都承诺解析或理解其中的图片。它是 provider 能力开关，不是通用的模型 vision 开关，所以只应给已验证支持的服务开启。

目前依赖版本范围是 `ai` `^7.0.105` 和 `@ai-sdk/openai-compatible` `^3.0.80`。升级 SDK 后要重新检查该选项和消息序列化行为。

### 模型接口要点

`createOpenAICompatible()` 的模型接口是 `.chatModel(modelId)`。不要把它当成 `createOpenAI()` 返回值并调用 `.chat(modelId)`；那会在本地报 `llmProvider.chat is not a function`，请求根本不会发出。

当前 `LanguageModelV4` 类型和 AI SDK core 的 peer 类型存在版本差异，因此 `streamText` 的 model 赋值处有类型断言。若升级依赖，应确认运行时兼容后再移除或调整断言。

### 截图如何进入模型

- `src/lib/tools/ai-tools.ts` 的 `screenshot` 工具从 Chrome 截图结果提取 base64 图片数据，返回文本和 `image/jpeg` 图片内容。
- `src/lib/tools/map-tools.ts` 的 `mapScreenshot` 使用 `toModelOutput`，剥离 data URL 前缀，并返回文本元数据和 `image/png` 图片内容。
- `src/background/chat-handler.ts` 将这两个工具放入 `streamText` 的工具集。工具结果保留图片 part，再由 `@ai-sdk/openai-compatible` 的 multipart 序列化选项发送给模型。
- 目前截图工具输出仍使用 AI SDK 已标记为 deprecated 的 `file-data` part；测试日志会有迁移提示。若改成新的 `file` part，必须同时验证 `role: tool` 下的序列化及两家 API 的实际行为。

`prepareScreenshotObservationStep` / `appendScreenshotObservations` 是把图片改作为下一步 `role: user` 文件消息的辅助路径。当前 Kimi/MiMo 的默认截图工具流使用 multipart 工具结果；不要把辅助路径误认为线上默认路径，也不要在两条路径里重复附加同一张图。

### 服务 endpoint

Kimi 的 API 服务和 Kimi Code 订阅服务使用不同 endpoint 和模型名，见 `KIMI_API_MODE_ENDPOINTS`、`getKimiModelsForMode()` 和 `getDefaultKimiModelForMode()`。不要把 Open Platform key 与 Coding key 混用。

MiMo 普通 API 使用 `https://api.xiaomimimo.com/v1`。`tp-` / `ttp-` Token Plan key 根据所选区域路由到对应的 `token-plan-*.xiaomimimo.com/v1` endpoint。

### 配置读取

`src/lib/config-utils.ts` 的 `loadProviderConfig()` 必须同时读取 `MIMO_API_KEY_STORAGE_KEY` 和 `KIMI_API_KEY_STORAGE_KEY`，并由 `getApiKeyStorageKey()` 映射 `mimo`、`kimi`。漏掉读取字段会让聊天误判为未配置 key，直接进入本地 fallback。

## 验证经验

真实 Chrome 测试分别使用 Kimi Code 中国区订阅和 MiMo Token Plan 中国区。在页面放置唯一标记文字及左右不同颜色的形状后，要求 Agent 调用截图工具并仅根据截图回答。通过条件是：

- 对话记录显示截图工具确实被调用。
- 模型返回唯一标记和两种正确颜色。
- Service Worker 日志中使用了预期 provider、model 和 endpoint，且没有本地模型构造错误。

本次测试中，Kimi 和 MiMo 都能经 multipart 工具结果识别截图。单看 API 成功、文本工具结果或设置页显示 provider，都不足以证明图片已传给模型。

## 回归检查清单

1. `npm run type-check`。
2. 运行 `src/background/chat-handler.test.ts` 和 `src/lib/config-utils.test.ts`。
3. `npm run build`。
4. 使用实际目标 endpoint 在 Chrome 做截图识别；确认 assistant 能答出截图中的随机标记与视觉细节。
5. 检查控制台是否出现 multipart、peer 类型或 deprecated `file-data` 警告；区分兼容性问题与成功请求后的迁移警告。

涉及模型 ID、API key 头、endpoint 或 SDK provider serialization 的改动时，不要只依赖 mock 测试。真实 provider 的行为可能不同。
