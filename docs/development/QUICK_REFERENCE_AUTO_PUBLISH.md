# Chrome Web Store Auto-Publish Quick Reference

## 🎯 Quick Setup Checklist

- [ ] Extension published manually at least once on Chrome Web Store
- [ ] Created Google Cloud project
- [ ] Enabled Chrome Web Store API
- [ ] Created OAuth 2.0 credentials
- [ ] Got refresh token
- [ ] Added 4 secrets to GitHub repository
- [ ] Tested with a version tag

## 🔑 Required GitHub Secrets

| Secret | Where to Get |
|--------|-------------|
| `CHROME_EXTENSION_ID` | Chrome Web Store Developer Dashboard URL |
| `CHROME_CLIENT_ID` | Google Cloud Console > Credentials |
| `CHROME_CLIENT_SECRET` | Google Cloud Console > Credentials |
| `CHROME_REFRESH_TOKEN` | OAuth 2.0 Playground |

## 🚀 How to Publish New Version

```bash
# 1. Update your code
# 2. Commit changes
git add .
git commit -m "feat: new feature"

# 3. Create and push version tag
git tag v1.0.1
git push origin v1.0.1

# That's it! GitHub Actions will:
# - Build the extension
# - Upload to Chrome Web Store
# - Submit for review
# - Create GitHub release
```

## 🔗 Essential Links

- **Get OAuth Token**: [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
- **Chrome Dashboard**: [Developer Dashboard](https://chrome.google.com/webstore/devconsole)
- **Google Cloud**: [Cloud Console](https://console.cloud.google.com/)
- **Enable API**: [Chrome Web Store API](https://console.cloud.google.com/apis/library/chromewebstore.googleapis.com)

## ⚙️ OAuth 2.0 Playground Setup (Quick Steps)

1. Click settings (gear icon)
2. Check "Use your own OAuth credentials"
3. Enter Client ID and Client Secret
4. Find "Chrome Web Store API v1.1" on left
5. Select `https://www.googleapis.com/auth/chromewebstore`
6. Click "Authorize APIs"
7. Sign in and authorize
8. Click "Exchange authorization code for tokens"
9. Copy "Refresh token"

## 📝 Workflow Configuration

Location: `.github/workflows/build-and-release.yml`

```yaml
- name: Publish to Chrome Web Store
  uses: mnao305/chrome-extension-upload@v5.0.0
  with:
    file-path: earth-agent-extension.zip
    extension-id: ${{ secrets.CHROME_EXTENSION_ID }}
    client-id: ${{ secrets.CHROME_CLIENT_ID }}
    client-secret: ${{ secrets.CHROME_CLIENT_SECRET }}
    refresh-token: ${{ secrets.CHROME_REFRESH_TOKEN }}
    publish: true  # false = upload only, no auto-submit
```

## 🐛 Common Issues

| Problem | Solution |
|---------|----------|
| "Invalid credentials" | Regenerate OAuth credentials in Cloud Console |
| "Extension ID not found" | Verify ID matches published extension |
| "API not enabled" | Enable Chrome Web Store API in Cloud Console |
| "Quota exceeded" | Wait or request quota increase |
| "Version already exists" | Use a different version number |

## ⏱️ Timeline

- **Build & Upload**: ~2-5 minutes
- **Chrome Review**: 1-3 business days
- **Total**: 1-3 days from tag push to live

## 📚 Full Documentation

- Chinese: `docs/development/CHROME_WEB_STORE_PUBLISHING.md`
- English: `docs/development/CHROME_WEB_STORE_PUBLISHING_EN.md`

## 🔒 Security Reminders

- ✅ Never commit secrets to repository
- ✅ Never share secrets in issues/PRs
- ✅ Use GitHub environment protection
- ✅ Regularly audit secret access
- ✅ Revoke and regenerate if leaked

---

**Need help?** See full documentation or check GitHub Actions logs.
