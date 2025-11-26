# Quick Debug: Find Your Chrome Extension ID

## Step 1: Get Extension ID
1. Open Chrome and go to `chrome://extensions/`
2. Make sure "Developer mode" is enabled (toggle in top right)
3. Find your "Earth Agent AI SDK" extension
4. Copy the ID (long string like: `abcdefghijklmnopqrstuvwxyzabcdef`)

## Step 2: Check Current ID
Your extension ID should be exactly 32 characters of lowercase letters.

Example: `abcdefghijklmnopqrstuvwxyzabcdef`

## Step 3: Compare with Google Cloud Console
Make sure this exact ID is used in your Google Cloud Console OAuth2 credentials. 