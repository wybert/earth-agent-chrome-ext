#!/usr/bin/env bash
# Install extension and MCP server dependencies. Matches CI for the extension.
set -euo pipefail
cd "$(dirname "$0")/.."

if ! node -e 'const [major]=process.versions.node.split(".").map(Number); if (major < 22) process.exit(1)'; then
  echo "Node.js 22 or newer is required (found $(node -v))." >&2
  exit 1
fi

npm ci --legacy-peer-deps
npm ci --prefix mcp-server
