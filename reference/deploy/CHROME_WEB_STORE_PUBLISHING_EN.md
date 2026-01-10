# Chrome Web Store Auto-Publishing Setup Guide

This guide shows how to set up GitHub Actions to automatically publish your Chrome extension to the Chrome Web Store.

## Prerequisites

1. Your extension must be published to Chrome Web Store at least once (initial publication must be manual)
2. You need a Chrome Developer account
3. You need access to Google Cloud Console

## Step 1: Get Your Chrome Extension ID

1. Visit [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Find your extension
3. The extension ID is in the URL: `https://chrome.google.com/webstore/detail/[EXTENSION_ID]`
4. Save this ID for later

## Step 2: Create Google Cloud Project and Enable API

### 2.1 Create Project

1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project dropdown, select "New Project"
3. Enter project name (e.g., "Chrome Extension Publisher")
4. Click "Create"

### 2.2 Enable Chrome Web Store API

1. In Cloud Console, ensure your new project is selected
2. Visit [Chrome Web Store API](https://console.cloud.google.com/apis/library/chromewebstore.googleapis.com)
3. Click "Enable"

## Step 3: Create OAuth 2.0 Credentials

### 3.1 Configure OAuth Consent Screen

1. In Cloud Console, go to [OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent)
2. Select "External" user type, click "Create"
3. Fill required fields:
   - App name: e.g., "Chrome Extension Publisher"
   - User support email: your email
   - Developer contact information: your email
4. Click "Save and Continue"
5. On "Scopes" page, click "Add or Remove Scopes"
6. Search and add `https://www.googleapis.com/auth/chromewebstore`
7. Click "Save and Continue"
8. On "Test users" page, add your Google account email
9. Click "Save and Continue"

### 3.2 Create OAuth Client ID

1. Go to [Credentials page](https://console.cloud.google.com/apis/credentials)
2. Click "Create Credentials" > "OAuth client ID"
3. Application type: select "Desktop app"
4. Name: "Chrome Extension Uploader"
5. Click "Create"
6. **Important**: Record the "Client ID" and "Client Secret"
   - These are your `CHROME_CLIENT_ID` and `CHROME_CLIENT_SECRET`

## Step 4: Get Refresh Token

### Method 1: Using Online Tool (Recommended)

1. Visit [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
2. Click the settings icon (gear) in the top right
3. Check "Use your own OAuth credentials"
4. Enter your OAuth 2.0 Client ID and Client Secret
5. In "Step 1" on the left, find "Chrome Web Store API v1.1"
6. Select `https://www.googleapis.com/auth/chromewebstore`
7. Click "Authorize APIs"
8. Sign in to your Google account and authorize
9. In "Step 2", click "Exchange authorization code for tokens"
10. **Important**: Copy the "Refresh token"
    - This is your `CHROME_REFRESH_TOKEN`

### Method 2: Using Command Line

If you prefer command line:

```bash
# Install chrome-webstore-upload-cli
npm install -g chrome-webstore-upload-cli

# Generate refresh token
chrome-webstore-upload-cli get-refresh-token \
  --client-id YOUR_CLIENT_ID \
  --client-secret YOUR_CLIENT_SECRET
```

## Step 5: Configure GitHub Secrets

1. Go to your GitHub repository
2. Navigate to `Settings` > `Secrets and variables` > `Actions`
3. Click "New repository secret" and add these 4 secrets:

| Secret Name            | Value               | Description                               |
| ---------------------- | ------------------- | ----------------------------------------- |
| `CHROME_EXTENSION_ID`  | Your extension ID   | From Chrome Web Store Developer Dashboard |
| `CHROME_CLIENT_ID`     | OAuth client ID     | From Google Cloud Console                 |
| `CHROME_CLIENT_SECRET` | OAuth client secret | From Google Cloud Console                 |
| `CHROME_REFRESH_TOKEN` | OAuth refresh token | From OAuth Playground or CLI tool         |

**Important Notes**:

- These secrets are sensitive - never share them
- Never commit them to your repository
- If leaked, revoke and regenerate them immediately in Google Cloud Console

## Step 6: Test Auto-Publishing

After configuration, test using either method:

### Method 1: Create New Tag

```bash
# Create new version tag
git tag v1.0.1
git push origin v1.0.1
```

### Method 2: Manual Workflow Trigger

1. Go to your GitHub repository's `Actions` tab
2. Select "Build and Release Extension" workflow
3. Click "Run workflow"
4. Select branch and click "Run workflow"

## Workflow Details

When you push a version tag (format: `vX.Y.Z`), GitHub Actions will automatically:

1. ✅ Checkout code
2. ✅ Install dependencies
3. ✅ Run type check
4. ✅ Build extension
5. ✅ Update manifest.json version
6. ✅ Create extension zip
7. ✅ **Upload to Chrome Web Store**
8. ✅ **Submit for review (if `publish: true`)**
9. ✅ Create GitHub Release

## Configuration Options

In `.github/workflows/build-and-release.yml`:

```yaml
- name: Publish to Chrome Web Store
  uses: mnao305/chrome-extension-upload@v5.0.0
  with:
    file-path: earth-agent-extension.zip
    extension-id: ${{ secrets.CHROME_EXTENSION_ID }}
    client-id: ${{ secrets.CHROME_CLIENT_ID }}
    client-secret: ${{ secrets.CHROME_CLIENT_SECRET }}
    refresh-token: ${{ secrets.CHROME_REFRESH_TOKEN }}
    publish: true # Set to false to upload without auto-publishing
```

### `publish` Parameter

- `true` (default): Auto-submit for review after upload
- `false`: Upload only, manual submission required in Developer Dashboard

## Review Timeline

- Chrome Web Store review typically takes **1-3 business days**
- Initial publication may take longer
- Updates are usually faster than initial publication

## FAQ

### Q1: Can I use auto-publish for initial publication?

**A**: No. Initial publication must be manual, including store details, screenshots, privacy policy, etc. Auto-publish is only for version updates.

### Q2: Does the refresh token expire?

**A**: Theoretically no, but you may need to regenerate if unused for long periods or OAuth config changes.

### Q3: What if publishing fails?

**A**: Check GitHub Actions logs. Common causes:

- Incorrect secrets configuration
- Extension violates Chrome Web Store policies
- Version number conflicts with published version
- API quota exceeded

### Q4: How to check publishing status?

**A**:

1. Check GitHub Actions run logs
2. Visit Chrome Web Store Developer Dashboard
3. You'll receive Google email notifications about review status

### Q5: Can I skip certain steps?

**A**: Yes. If you only want GitHub releases without Chrome Web Store publishing:

1. Don't configure Chrome-related secrets
2. Or comment out the "Publish to Chrome Web Store" step in the workflow

## Security Recommendations

1. ✅ Regularly review OAuth credential usage
2. ✅ Never mention secrets in public issues or PRs
3. ✅ Use GitHub environment protection rules to limit who can trigger releases
4. ✅ Enable GitHub Actions approval requirements
5. ✅ Regularly audit who has access to repository secrets

## Related Links

- [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
- [Google Cloud Console](https://console.cloud.google.com/)
- [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
- [Chrome Web Store API Documentation](https://developer.chrome.com/docs/webstore/using_webstore_api/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

## Workflow File Location

`.github/workflows/build-and-release.yml`

## Resources

- [Chrome Extension Upload Action](https://github.com/marketplace/actions/chrome-extension-upload-action)
- [Automating Chrome Extension Publishing](https://jam.dev/blog/automating-chrome-extension-publishing/)
- [Extension Publishing with GitHub Actions](https://dev.to/jellyfith/simplify-browser-extension-deployment-with-github-actions-37ob)

---

If you have any questions, check the GitHub Actions run logs or create an issue in the repository.
