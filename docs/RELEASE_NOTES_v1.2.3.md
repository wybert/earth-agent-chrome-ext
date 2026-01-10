# Release Notes v1.2.3

**Release Date:** January 10, 2026

## 🔧 Fixes

### Robust Permission Handling

- **Race Condition Fix**: Resolved an issue where the "Screenshot Permission" tip card would sometimes fail to appear if the extension interface loaded faster than the browser could create the new tab.
- **Session Storage**: Migrated permission tracking to `chrome.storage.session` for greater reliability across extension contexts.
- **Programmatic Switching**: Fixed a logic gap where switching to an _existing_ Earth Engine tab programmatically didn't correctly trigger the permission warning (Chrome requires a user gesture for each tab switch to grant `activeTab`).

This release ensures the user is always correctly guided to click the extension icon when needed, guaranteeing reliable screenshot capabilities.
