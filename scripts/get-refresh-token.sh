#!/bin/bash

# Script to get Chrome Web Store refresh token
# This script helps you obtain the refresh token needed for GitHub Actions

echo "=========================================="
echo "Chrome Web Store Refresh Token Generator"
echo "=========================================="
echo ""
echo "This script will help you get the refresh token for GitHub Actions."
echo ""

# Check if chrome-webstore-upload-cli is installed
if ! command -v chrome-webstore-upload &> /dev/null; then
    echo "❌ chrome-webstore-upload-cli is not installed."
    echo "Installing now..."
    npm install -g chrome-webstore-upload-cli
fi

echo ""
echo "📋 You will need:"
echo "  1. OAuth Client ID (from Google Cloud Console)"
echo "  2. OAuth Client Secret (from Google Cloud Console)"
echo ""
echo "⚠️  Make sure you created a Desktop App OAuth client, not Web Application!"
echo ""

# Prompt for Client ID
read -p "Enter your OAuth Client ID: " CLIENT_ID

# Prompt for Client Secret
read -sp "Enter your OAuth Client Secret (hidden): " CLIENT_SECRET
echo ""

echo ""
echo "🔄 Generating refresh token..."
echo ""
echo "A browser window will open. Please:"
echo "  1. Sign in with your Google account"
echo "  2. Click 'Allow' to authorize"
echo "  3. You'll see the authorization code"
echo "  4. The refresh token will be displayed"
echo ""

# Run the command
chrome-webstore-upload get-refresh-token \
  --client-id "$CLIENT_ID" \
  --client-secret "$CLIENT_SECRET"

echo ""
echo "=========================================="
echo "✅ Done!"
echo "=========================================="
echo ""
echo "📝 Next steps:"
echo "  1. Copy the refresh token shown above"
echo "  2. Go to your GitHub repository"
echo "  3. Settings > Secrets and variables > Actions"
echo "  4. Add the following secrets:"
echo "     - CHROME_CLIENT_ID"
echo "     - CHROME_CLIENT_SECRET"
echo "     - CHROME_REFRESH_TOKEN (the token you just got)"
echo "     - CHROME_EXTENSION_ID (from Chrome Web Store)"
echo ""
