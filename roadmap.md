
### 🗺️ Roadmap

- [ ] Ship minimal A2A interface so other agents can call core actions (catalog + execute endpoints)
- [ ] Add lightweight virtual workspace: snapshots/diff preview, quick rollback, and current script sync
- [ ] Improve context capture: file/symbol index from GEE editor buffer, selection-aware prompts, long-file chunking
- [ ] Add run-test-feedback loop: capture console/logs/errors after execute and feed back into suggestions
- [ ] Harden UX: persistent chat sessions, better side panel open/EE tab detection, clearer failure messages
- [ ] Permission transparency: key/token revoke, host_permissions minimization, confirmations for downloads/Drive writes
- [ ] Cross-browser targets: manifest variants + API shims for Firefox/Safari (side panel/OAuth/scripting fallbacks)
- [ ] Automated QA: one end-to-end test (open EE → inject → run → collect screenshot/log) in CI
- [ ] Publish artifacts: versioning + changelog + auto-build pipeline for store uploads

- [ ] Enable persistent chat sessions  
- [ ] Support output as APIs  
- [ ] Identify and consider target users  
- [ ] Review and refine agent design  
- [ ] Develop a code debugging agent  
- [ ] Implement a summarization agent  
- [ ] Integrate Retrieval-Augmented Generation (RAG) for Google Earth Engine (GEE) API  
- [ ] Build developer tools: console, inspector, task checker, and browser utility (e.g., screenshot capture) check: https://github.com/nanobrowser/nanobrowser
- [ ] MCP server for interaction with the GEE + agent framework with Python; break changes
- [ ] Fine-tune the model for generating GEE code.
- [ ] Websearch Agent, eg, perplexity, etc.
- [ ] Basic spectral index relationships and pre-processing like cloud masking.

### Details


目前相较 Codex/Cursor/Claude Code/OpenCode，编辑/代码笔记能力的主要短板在这些方面：

  - 代码上下文收集不足：缺少快速的项目索引/符号表（文件列表、函数/类定义、依赖图），也没有“当前选中/当前文件”自动提取和增量更新的记忆。
  - 定位与跳转弱：没有“跳转到定义/引用/调用链”或按符号/文件模糊搜索的入口，用户无法像 IDE 那样精准指令。
  - 结构化笔记/变更记录缺失：没有“附着在代码片段上的笔记/问题/决策”以及历史变更记录；也缺少自动生成/维护 TODO 清单的机制。
  - 编辑器级动作少：没有常用的 IDE 助手动作（提炼函数、重命名符号、插入/替换选区、应用 diff）和批量多文件编辑；也缺少对生成修改的预览/接受/回滚。
  - 质量反馈链路短：运行代码后的错误/日志/测试结果未被自动抓取并反馈给模型，无法形成“尝试-修复-再测”的闭环。
  - 长上下文策略不足：大文件或多文件编辑缺少切片/摘要/分段重写的能力，容易超上下文或漏改。

  可以先补的能力（按投入/收益排序）：

  1. 自动上下文采集：构建文件/符号索引，提供“当前文件/选区/光标”抓取接口；为大文件做分块摘要。
  2. 结构化操作：支持“插入/替换/删除选区”和“预览 diff 决定是否应用”，并保留操作历史。
  3. 代码附注与 TODO：允许给选区/函数挂载笔记，自动生成/维护 TODO 列表并可跳转。
  4. 运行-反馈闭环：捕获执行/测试/console 输出并回传给模型，提示下一步修复。
  5. 导航：符号/文件模糊搜索，跳转到定义/引用。
  6. 长文策略：对大文件自动摘要+局部重写，避免整体重写失败。

  这样能让“代码笔记”和“编辑”体验更接近主流 IDE 助手。


