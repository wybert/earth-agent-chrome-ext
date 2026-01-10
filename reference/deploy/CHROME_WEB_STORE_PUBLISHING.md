# Chrome Web Store 自动发布设置指南

本文档介绍如何设置GitHub Actions自动发布Chrome扩展到Chrome Web Store。

## 前置要求

1. 你的扩展必须已经在Chrome Web Store上发布过至少一次（首次发布必须手动完成）
2. 你需要有Chrome开发者账号
3. 你需要访问Google Cloud Console的权限

## 步骤 1: 获取Chrome扩展ID

1. 访问 [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. 找到你的扩展
3. 扩展ID在URL中，格式为：`https://chrome.google.com/webstore/detail/[EXTENSION_ID]`
4. 保存这个ID，稍后需要用到

## 步骤 2: 创建Google Cloud项目并启用API

### 2.1 创建项目

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 点击项目下拉菜单，选择"新建项目"
3. 输入项目名称（例如："Chrome Extension Publisher"）
4. 点击"创建"

### 2.2 启用Chrome Web Store API

1. 在Cloud Console中，确保已选择刚创建的项目
2. 访问 [Chrome Web Store API](https://console.cloud.google.com/apis/library/chromewebstore.googleapis.com)
3. 点击"启用"按钮

## 步骤 3: 创建OAuth 2.0凭据

### 3.1 配置OAuth同意屏幕

1. 在Cloud Console中，前往 [OAuth同意屏幕](https://console.cloud.google.com/apis/credentials/consent)
2. 选择"外部"用户类型，点击"创建"
3. 填写必填字段：
   - 应用名称：例如 "Chrome Extension Publisher"
   - 用户支持电子邮件：你的邮箱
   - 开发者联系信息：你的邮箱
4. 点击"保存并继续"
5. 在"范围"页面，点击"添加或删除范围"
6. 搜索并添加 `https://www.googleapis.com/auth/chromewebstore`
7. 点击"保存并继续"
8. 在"测试用户"页面，添加你的Google账号邮箱
9. 点击"保存并继续"

### 3.2 创建OAuth客户端ID

1. 前往 [凭据页面](https://console.cloud.google.com/apis/credentials)
2. 点击"创建凭据" > "OAuth客户端ID"
3. 应用类型选择"桌面应用"
4. 名称输入："Chrome Extension Uploader"
5. 点击"创建"
6. **重要**：记录下显示的"客户端ID"和"客户端密钥"
   - 这些是 `CHROME_CLIENT_ID` 和 `CHROME_CLIENT_SECRET`

## 步骤 4: 获取刷新令牌 (Refresh Token)

### 方法1：使用在线工具（推荐）

1. 访问 [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
2. 点击右上角的设置图标（齿轮）
3. 勾选"Use your own OAuth credentials"
4. 输入你的OAuth 2.0客户端ID和客户端密钥
5. 在左侧"Step 1"中，找到"Chrome Web Store API v1.1"
6. 选择 `https://www.googleapis.com/auth/chromewebstore`
7. 点击"Authorize APIs"
8. 登录你的Google账号并授权
9. 在"Step 2"中，点击"Exchange authorization code for tokens"
10. **重要**：复制显示的"Refresh token"
    - 这是 `CHROME_REFRESH_TOKEN`

### 方法2：使用命令行工具

如果你更喜欢使用命令行：

```bash
# 安装chrome-webstore-upload-cli
npm install -g chrome-webstore-upload-cli

# 生成刷新令牌
chrome-webstore-upload-cli get-refresh-token \
  --client-id YOUR_CLIENT_ID \
  --client-secret YOUR_CLIENT_SECRET
```

## 步骤 5: 在GitHub中配置Secrets

1. 访问你的GitHub仓库
2. 前往 `Settings` > `Secrets and variables` > `Actions`
3. 点击"New repository secret"，添加以下4个secrets：

| Secret名称             | 值              | 说明                                       |
| ---------------------- | --------------- | ------------------------------------------ |
| `CHROME_EXTENSION_ID`  | 你的扩展ID      | 从Chrome Web Store Developer Dashboard获取 |
| `CHROME_CLIENT_ID`     | OAuth客户端ID   | 从Google Cloud Console获取                 |
| `CHROME_CLIENT_SECRET` | OAuth客户端密钥 | 从Google Cloud Console获取                 |
| `CHROME_REFRESH_TOKEN` | OAuth刷新令牌   | 从OAuth Playground或CLI工具获取            |

**重要提示**：

- 这些secrets是敏感信息，请勿与任何人分享
- 请勿将它们提交到代码仓库中
- 如果泄露，请立即在Google Cloud Console中撤销并重新生成

## 步骤 6: 测试自动发布

一切配置完成后，可以通过以下方式测试：

### 方法1：创建新标签触发

```bash
# 创建新版本标签
git tag v1.0.1
git push origin v1.0.1
```

### 方法2：手动触发工作流

1. 访问GitHub仓库的 `Actions` 标签
2. 选择"Build and Release Extension"工作流
3. 点击"Run workflow"
4. 选择分支并点击"Run workflow"

## 工作流说明

当你推送一个版本标签（格式：`vX.Y.Z`）时，GitHub Actions会自动：

1. ✅ 检出代码
2. ✅ 安装依赖
3. ✅ 运行类型检查
4. ✅ 构建扩展
5. ✅ 更新manifest.json中的版本号
6. ✅ 创建扩展zip包
7. ✅ **自动上传到Chrome Web Store**
8. ✅ **提交审核（如果`publish: true`）**
9. ✅ 在GitHub上创建Release

## 配置选项

在 `.github/workflows/build-and-release.yml` 中，你可以配置：

```yaml
- name: Publish to Chrome Web Store
  uses: mnao305/chrome-extension-upload@v5.0.0
  with:
    file-path: earth-agent-extension.zip
    extension-id: ${{ secrets.CHROME_EXTENSION_ID }}
    client-id: ${{ secrets.CHROME_CLIENT_ID }}
    client-secret: ${{ secrets.CHROME_CLIENT_SECRET }}
    refresh-token: ${{ secrets.CHROME_REFRESH_TOKEN }}
    publish: true # 设置为false则上传但不自动发布
```

### `publish` 参数说明

- `true`（默认）：上传后自动提交审核
- `false`：仅上传，你需要手动在Developer Dashboard中点击"提交审核"

## 审核时间

- Chrome Web Store审核通常需要 **1-3个工作日**
- 首次发布可能需要更长时间
- 更新通常比首次发布快

## 常见问题

### Q1: 首次发布可以使用自动发布吗？

**A**: 不可以。首次发布必须手动完成，包括填写商店详情、上传截图、隐私政策等。自动发布仅用于已发布扩展的版本更新。

### Q2: 刷新令牌会过期吗？

**A**: 理论上不会过期，但如果长时间未使用或者更改了OAuth配置，可能需要重新生成。

### Q3: 如果发布失败怎么办？

**A**: 检查GitHub Actions日志，常见原因：

- Secrets配置错误
- 扩展包不符合Chrome Web Store政策
- 版本号与已发布版本冲突
- API配额已用完

### Q4: 如何查看发布状态？

**A**:

1. 查看GitHub Actions运行日志
2. 访问Chrome Web Store Developer Dashboard
3. 你会收到Google发送的审核邮件通知

### Q5: 能否跳过某些步骤？

**A**: 可以。如果你只想创建GitHub Release而不发布到Chrome Web Store，可以：

1. 不配置Chrome相关的secrets
2. 或者在workflow中注释掉"Publish to Chrome Web Store"步骤

## 安全建议

1. ✅ 定期检查OAuth凭据的使用情况
2. ✅ 不要在公开的issues或PR中提及secrets
3. ✅ 使用GitHub的环境保护规则限制谁可以触发发布
4. ✅ 启用GitHub Actions的审批要求
5. ✅ 定期审计谁有权访问仓库secrets

## 相关链接

- [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
- [Google Cloud Console](https://console.cloud.google.com/)
- [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
- [Chrome Web Store API文档](https://developer.chrome.com/docs/webstore/using_webstore_api/)
- [GitHub Actions文档](https://docs.github.com/en/actions)

## 工作流文件位置

`.github/workflows/build-and-release.yml`

## 参考资源

- [Chrome Extension Upload Action](https://github.com/marketplace/actions/chrome-extension-upload-action)
- [Automating Chrome Extension Publishing](https://jam.dev/blog/automating-chrome-extension-publishing/)
- [Extension Publishing with GitHub Actions](https://dev.to/jellyfith/simplify-browser-extension-deployment-with-github-actions-37ob)

---

如有任何问题，请查看GitHub Actions运行日志或在仓库中创建issue。
