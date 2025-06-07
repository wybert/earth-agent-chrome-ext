# Google Drive Setup for Earth Agent Testing Panel

This guide explains how to set up Google Drive integration for screenshot storage in the Earth Agent Chrome Extension testing panel.

## Why Google Drive Integration?

The Google Drive integration allows you to:
- ✅ **Store unlimited screenshots** in the cloud
- ✅ **Share test results** with your team via Drive links
- ✅ **Access screenshots** from any device
- ✅ **Organize test runs** in dedicated folders
- ✅ **Search and filter** screenshots using Drive's search

## Prerequisites

1. **Google Account** with access to Google Drive
2. **Google Cloud Console** access for creating OAuth2 credentials
3. **Chrome Extension** loaded in developer mode

## Step-by-Step Setup

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Select a project"** → **"New Project"**
3. Enter project name: `Earth Agent Testing` (or your preferred name)
4. Click **"Create"**

### 2. Enable Google Drive API

1. In your project, go to **APIs & Services** → **Library**
2. Search for **"Google Drive API"**
3. Click on **"Google Drive API"** → **"Enable"**

### 3. Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **"External"** user type → **"Create"**
3. Fill in required fields:
   - **App name:** `Earth Agent Testing Panel`
   - **User support email:** Your email
   - **Developer contact email:** Your email
4. Click **"Save and Continue"**
5. On **Scopes** page, click **"Add or Remove Scopes"**
6. Search and select: `https://www.googleapis.com/auth/drive.file`
7. Click **"Update"** → **"Save and Continue"**
8. On **Test users** page, add your email address
9. Click **"Save and Continue"**

### 4. Create OAuth2 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **"+ Create Credentials"** → **"OAuth client ID"**
3. Select **"Chrome Extension"** as application type
4. Enter:
   - **Name:** `Earth Agent Extension`
   - **Application ID:** Your Chrome extension ID (see instructions below)
5. Click **"Create"**
6. **Copy the Client ID** - you'll need this for the manifest

### 5. Find Your Chrome Extension ID

1. Open Chrome and go to `chrome://extensions/`
2. Enable **"Developer mode"** (toggle in top right)
3. Load your extension if not already loaded
4. Find your extension and **copy the ID** (string like `abcdefghijklmnopqrstuvwxyzabcdef`)

### 6. Update Extension Manifest

1. Open `src/manifest.json` in your project
2. Replace the OAuth2 section with your actual client ID:

```json
{
  "oauth2": {
    "client_id": "YOUR_ACTUAL_CLIENT_ID.apps.googleusercontent.com",
    "scopes": ["https://www.googleapis.com/auth/drive.file"]
  }
}
```

**Example:**
```json
{
  "oauth2": {
    "client_id": "123456789012-abcdefghijklmnopqrstuvwxyz123456.apps.googleusercontent.com",
    "scopes": ["https://www.googleapis.com/auth/drive.file"]
  }
}
```

### 7. Update OAuth Credentials with Extension ID

1. Go back to **Google Cloud Console** → **Credentials**
2. Click on your OAuth client ID to edit it
3. Update the **Application ID** field with your actual Chrome extension ID
4. Click **"Save"**

### 8. Rebuild and Reload Extension

1. Run `npm run build` to rebuild the extension
2. Go to `chrome://extensions/`
3. Click **"Reload"** on your extension
4. The extension now has Google Drive OAuth2 capabilities

## Using Google Drive Storage

### In the Agent Test Panel:

1. Open the testing panel (🧪 icon)
2. Go to the **Setup** tab
3. Enable **Screenshots**
4. Select **"Google Drive (Cloud)"** as storage method
5. Optionally set a **Drive Folder ID** for organization
6. Click **"Test Google Drive Authentication"** button
7. Follow the OAuth consent flow when prompted

### First-Time Authentication:

1. When you first use Google Drive storage, Chrome will open a popup
2. You'll see Google's OAuth consent screen
3. Click **"Allow"** to grant Drive file access permissions
4. The authentication token is stored securely by Chrome

### Folder Organization (Optional):

To organize screenshots in a specific Drive folder:

1. Create a folder in Google Drive
2. Open the folder and copy the ID from the URL:
   ```
   https://drive.google.com/drive/folders/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
   ```
   The folder ID is: `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`
3. Paste this ID in the **Drive Folder ID** field in the Setup tab

## File Organization in Drive

Screenshots will be saved with descriptive names:

```
earth-agent-test-001-weather-query-2024-12-17T14-30-15Z.png
earth-agent-test-002-map-search-2024-12-17T14-30-45Z.png
earth-agent-test-003-satellite-view-2024-12-17T14-31-15Z.png
```

## Viewing and Sharing Screenshots

### Individual Screenshots:
- Click the **"View"** button next to any test result
- Opens the screenshot directly in Google Drive
- You can share the Drive link with others

### All Screenshots:
- Test results export includes Drive file IDs
- Use Drive's search to find specific test screenshots
- Create shared folders for team collaboration

## Troubleshooting

### Authentication Fails:
- **Check manifest.json** has correct client_id
- **Verify Extension ID** matches in Google Cloud Console
- **Ensure Drive API** is enabled in your project
- **Check OAuth scopes** include `drive.file`

### Upload Fails:
- **Test authentication** using the test button first
- **Check network connection** and Drive quotas
- **Verify permissions** - extension needs drive.file scope
- **Check file size** - large screenshots may fail

### Permission Errors:
- **Re-run OAuth flow** by testing authentication again
- **Check OAuth consent screen** is properly configured
- **Verify test user** email is added to the project

### Extension ID Mismatch:
- **Copy exact Extension ID** from chrome://extensions/
- **Update Google Cloud Console** credentials with correct ID
- **Rebuild and reload** extension after changes

## Security Considerations

### What the Extension Can Access:
- ✅ **Only files it creates** - the `drive.file` scope limits access
- ✅ **Cannot read your existing Drive files**
- ✅ **Cannot modify files created by other apps**

### Data Privacy:
- ✅ **Screenshots stored in your Drive** - you maintain full control
- ✅ **No data sent to third parties** - direct Drive API communication
- ✅ **OAuth tokens managed by Chrome** - secure token storage

### Revoking Access:
1. Go to [Google Account Security](https://myaccount.google.com/permissions)
2. Find "Earth Agent Testing Panel" (or your app name)
3. Click **"Remove access"**

## Advanced Configuration

### Multiple Test Environments:
Create separate Google Cloud projects for:
- Development testing
- Staging validation
- Production monitoring

### Team Sharing:
1. Create a shared Google Drive folder
2. Use the folder ID in all team members' extensions
3. Screenshots automatically appear in the shared folder

### Automated Cleanup:
Use Google Drive's features for:
- **Auto-delete** old screenshots after X days
- **Organize** screenshots by date/session
- **Archive** completed test runs

## API Limits and Quotas

### Google Drive API Limits:
- **1,000 requests per 100 seconds per user**
- **10,000 requests per 100 seconds** (shared across all users)
- **1 billion requests per day**

### For 1000+ Screenshot Tests:
- **Recommended interval:** 10+ seconds between tests
- **Monitor usage** in Google Cloud Console
- **Consider batch uploads** for high-volume testing

## Cost Considerations

### Google Drive Storage:
- **15 GB free** with every Google account
- **100 GB = $1.99/month** for Google One
- **Screenshots ~200-500KB each** = ~2,000-7,500 screenshots per GB

### API Usage:
- **Google Drive API is free** up to quota limits
- **No additional costs** for standard usage

This setup provides unlimited cloud storage for your testing screenshots while maintaining security and team collaboration capabilities. 