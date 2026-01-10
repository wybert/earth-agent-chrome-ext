# Release Notes v1.2.2

**Release Date:** January 10, 2026

## 📸 Screenshot Tool Fix

- **Problem**: Users were encountering "Permission 'activeTab' required" errors when trying to take screenshots, even with the Earth Engine tab open.
- **Root Cause**: The extension was sometimes attempting to capture a background tab (or the wrong window), which Chrome security policies block.
- **Fix**: The screenshot tool now explicitly targets the **currently active tab in the user's focused window**. This aligns perfectly with Chrome's `activeTab` permission model, ensuring screenshots work reliably when the user is interacting with the extension.
