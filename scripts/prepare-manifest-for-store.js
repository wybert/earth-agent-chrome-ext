#!/usr/bin/env node

/**
 * Prepare manifest.json for Chrome Web Store submission
 *
 * Removes localhost/127.0.0.1 host_permissions that are not allowed in Web Store
 * but are useful for local development (e.g., Ollama)
 */

const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '../dist/manifest.json');

console.log('📝 Preparing manifest.json for Chrome Web Store...');

// Read the manifest file
if (!fs.existsSync(manifestPath)) {
  console.error('❌ Error: manifest.json not found at:', manifestPath);
  console.error('Make sure to run this script after building the extension.');
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// Check if host_permissions exist
if (!manifest.host_permissions || !Array.isArray(manifest.host_permissions)) {
  console.log('✅ No host_permissions found, nothing to clean up.');
  process.exit(0);
}

// Filter out localhost and 127.0.0.1 URLs
const originalPermissions = [...manifest.host_permissions];
const filteredPermissions = manifest.host_permissions.filter(permission => {
  const isLocalhost = permission.includes('localhost') || permission.includes('127.0.0.1');
  if (isLocalhost) {
    console.log('🗑️  Removing:', permission);
  }
  return !isLocalhost;
});

// Update manifest
manifest.host_permissions = filteredPermissions;

// Write back to file
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

console.log('');
console.log('✅ Manifest cleaned for Chrome Web Store!');
console.log('');
console.log('Original host_permissions count:', originalPermissions.length);
console.log('Cleaned host_permissions count:', filteredPermissions.length);
console.log('Removed:', originalPermissions.length - filteredPermissions.length, 'localhost URLs');
console.log('');
console.log('⚠️  Note: Ollama (localhost) functionality will not work in this build.');
console.log('   Users will need to use cloud-based AI providers (OpenAI, Anthropic, Google, Qwen).');
console.log('');
