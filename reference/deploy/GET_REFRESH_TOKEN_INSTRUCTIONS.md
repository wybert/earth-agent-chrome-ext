# 获取Chrome Web Store Refresh Token指南

## 📋 准备工作

在开始之前，你需要从Google Cloud Console获取：

1. **OAuth Client ID**
2. **OAuth Client Secret**

### 如何获取Client ID和Secret

1. 访问：https://console.cloud.google.com/apis/credentials?project=chrome-extension-publisher
2. 找到你创建的OAuth 2.0 Client ID（类型应该是"Desktop app"）
3. 点击客户端名称或编辑图标
4. 复制 **Client ID** 和 **Client secret**

## 🚀 方法1：使用命令行工具（推荐）

### 步骤1：打开终端

在你的项目目录中打开终端。

### 步骤2：运行命令

```bash
chrome-webstore-upload get-refresh-token
```

### 步骤3：按照提示操作

1. 命令会提示你输入 **Client ID**，粘贴并按Enter
2. 然后提示输入 **Client Secret**，粘贴并按Enter
3. 浏览器会自动打开授权页面
4. 登录你的Google账号
5. 点击 **"允许"** 授权
6. 你会看到一个授权码（authorization code）
7. **复制这个授权码**，回到终端粘贴并按Enter
8. 终端会显示 **Refresh Token**

### 步骤4：保存Refresh Token

复制显示的refresh token，你需要将它添加到GitHub Secrets中。

## 🔄 方法2：手动操作（如果命令行工具失败）

### 步骤1：获取授权码

访问以下URL（**替换YOUR_CLIENT_ID**）：

```
https://accounts.google.com/o/oauth2/auth?client_id=YOUR_CLIENT_ID&redirect_uri=urn:ietf:wg:oauth:2.0:oob&response_type=code&scope=https://www.googleapis.com/auth/chromewebstore
```

1. 登录你的Google账号
2. 点击"允许"
3. 复制显示的授权码

### 步骤2：交换授权码获取Refresh Token

使用curl命令（**替换下面的占位符**）：

```bash
curl -X POST https://oauth2.googleapis.com/token \
  -d "code=YOUR_AUTHORIZATION_CODE" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "redirect_uri=urn:ietf:wg:oauth:2.0:oob" \
  -d "grant_type=authorization_code"
```

响应中会包含 `refresh_token`，复制它。

## 📝 添加到GitHub Secrets

获取refresh token后：

1. 访问你的GitHub仓库
2. 进入 `Settings` > `Secrets and variables` > `Actions`
3. 点击 `New repository secret`
4. 添加以下secrets：

| Secret名称             | 值                      | 来源                       |
| ---------------------- | ----------------------- | -------------------------- |
| `CHROME_CLIENT_ID`     | 你的OAuth客户端ID       | Google Cloud Console       |
| `CHROME_CLIENT_SECRET` | 你的OAuth客户端密钥     | Google Cloud Console       |
| `CHROME_REFRESH_TOKEN` | 刚刚获取的refresh token | 上述步骤                   |
| `CHROME_EXTENSION_ID`  | 你的扩展ID              | Chrome Web Store Dashboard |

## ✅ 验证

完成后，你可以通过推送一个版本标签来测试：

```bash
git tag v1.0.1
git push origin v1.0.1
```

GitHub Actions会自动构建并发布到Chrome Web Store。

## 🐛 常见问题

### Q: 命令行工具没有打开浏览器

**A**: 手动访问显示的URL，完成授权后复制授权码回到终端。

### Q: 错误 "redirect_uri_mismatch"

**A**: 确保你创建的是 **Desktop app** 类型的OAuth客户端，不是Web application。

### Q: 错误 "invalid_client"

**A**: 检查Client ID和Client Secret是否正确复制，没有多余的空格。

### Q: 浏览器显示 "This app isn't verified"

**A**: 点击 "Advanced" > "Go to [Your App Name] (unsafe)"。这是正常的，因为这是你自己的应用。

## 🔒 安全提示

- ✅ Refresh token和Client Secret都是敏感信息
- ✅ 不要分享或提交到代码仓库
- ✅ 如果泄露，立即在Google Cloud Console中撤销并重新生成

---

如有问题，请查看完整文档或在仓库中创建issue。
