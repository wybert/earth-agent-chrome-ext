# Localhost Permissions Issue - Chrome Web Store

## 🚨 问题描述

Chrome Web Store **不允许**扩展在manifest.json中包含以下host_permissions：

- `http://localhost:*/*`
- `http://127.0.0.1:*/*`

### 错误信息

```
Error: The manifest defines an invalid url: http://127.0.0.1:*/*. (PKG_MANIFEST_PARSE_ERROR)
Error: The manifest defines an invalid url: http://localhost:*/*. (PKG_MANIFEST_PARSE_ERROR)
```

## 🔍 为什么我们有这些权限？

这些权限是为了支持**Ollama本地AI服务器**：

- Ollama默认运行在 `http://localhost:11434`
- 需要这些权限才能与本地Ollama通信

## 🎯 解决方案

### 方案1：自动清理（推荐）

使用提供的脚本在构建后自动移除localhost权限：

```bash
# 在构建后运行
node scripts/prepare-manifest-for-store.js
```

这个脚本会：

- ✅ 自动移除localhost/127.0.0.1权限
- ✅ 保留其他所有权限
- ✅ 使manifest符合Web Store要求

### 方案2：更新GitHub Actions Workflow

修改 `.github/workflows/build-and-release.yml`，在构建后添加清理步骤：

在 "Update manifest version" 步骤之后添加：

```yaml
- name: Clean manifest for Chrome Web Store
  run: |
    echo "Removing localhost permissions from manifest..."
    node scripts/prepare-manifest-for-store.js
```

完整的步骤顺序应该是：

```yaml
- name: Build extension for production
  run: npm run build

- name: Update manifest version
  run: |
    VERSION=${GITHUB_REF#refs/tags/v}
    sed -i "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" dist/manifest.json

- name: Clean manifest for Chrome Web Store
  run: |
    echo "Removing localhost permissions from manifest..."
    node scripts/prepare-manifest-for-store.js

- name: Verify extension files
  run: |
    # ...现有的验证代码
```

### 方案3：手动编辑源文件

直接编辑 `src/manifest.json`，移除第20-21行：

```json
// 移除这两行：
"http://localhost:*/*",
"http://127.0.0.1:*/*"
```

**缺点**：

- ❌ 本地开发时Ollama功能将无法使用
- ❌ 需要维护两个版本的manifest

## ⚠️ 影响分析

### 移除localhost权限的影响：

**✅ 正面影响：**

- 可以成功发布到Chrome Web Store
- 符合Google的安全政策
- 减少潜在的安全风险

**❌ 负面影响：**

- Ollama本地服务器功能将无法使用
- 用户必须使用云端AI提供商：
  - OpenAI
  - Anthropic
  - Google Gemini
  - Qwen

### 替代方案：

对于想使用Ollama的用户：

1. 可以从GitHub下载开发版（保留localhost权限）
2. 使用"Load unpacked"方式手动安装
3. 在README中说明Web Store版本不支持Ollama

## 📝 建议的用户沟通策略

在发布说明中添加：

```markdown
## ⚠️ Important Notice - Ollama Support

**Chrome Web Store Version:**

- Does NOT support Ollama (local AI server)
- Requires cloud-based AI providers (OpenAI, Anthropic, Google, Qwen)

**For Ollama Users:**

- Download the development version from [GitHub Releases]
- Install manually using "Load unpacked" method
- See installation guide for details
```

## 🔄 未来的解决方案

Chrome正在开发新的API来支持本地服务通信：

- [Private Network Access](https://developer.chrome.com/docs/extensions/develop/concepts/private-network-access)
- 目前仍在实验阶段

当这些API正式发布后，可以考虑迁移。

## 📚 相关链接

- [Chrome Web Store Developer Policies](https://developer.chrome.com/docs/webstore/program-policies/)
- [Manifest V3 Host Permissions](https://developer.chrome.com/docs/extensions/develop/concepts/match-patterns)
- [Chrome Extension Security](https://developer.chrome.com/docs/extensions/develop/concepts/security)

## ✅ 推荐实施步骤

1. **立即**：在GitHub Actions中添加manifest清理步骤
2. **短期**：在README中说明Web Store版本的限制
3. **中期**：在GitHub Releases提供包含Ollama支持的开发版
4. **长期**：关注Chrome的Private Network Access API发展

---

**总结**：为了能够发布到Chrome Web Store，必须移除localhost权限。建议通过自动化脚本在构建时处理，同时在文档中明确说明限制。
