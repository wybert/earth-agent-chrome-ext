# Release Notes v1.2.1 (Hotfix)

**Release Date:** January 10, 2026

This is a hotfix release to address critical UI/UX issues and improve stability.

## 🔧 Improvements & Fixes

### 🌟 Onboarding Experience

- Fixed an issue where the Settings pane would hide the Welcome Modal/Tour for new users. The tour now has priority.

### 📸 Screenshot Tool

- Improved reliability of the screenshot tool.
- Added **Retry Logic**: If capturing a specific window fails, the agent now attempts a fallback to the current window context.
- Added explicit validation to ensure the Earth Engine tab is active before attempting capture.

### ⚙️ Settings UX Polish

- **Auto-Save**: API keys and settings are now automatically saved when the input field loses focus (`onBlur`). No more manual "Save" clicks required!
- **Visual Feedback**: Added animated success/error icons next to each field to provide immediate confirmation when data is saved.
- **Cleaner UI**: Removed redundant "Save" buttons from the API key section.

### 🐛 Other Fixes

- Fixed a syntax error in the `diagnostic-script.js` debug utility.
- Better validation of tab IDs during tool execution.
