#!/usr/bin/env node
// Keep local integrations available in the store build, with explicit user consent.
// This prepares the package; it does not assert or guarantee Web Store approval.
const fs = require('fs');
const path = require('path');

function prepareManifest(manifest) {
  const local = (permission) => /^http:\/\/(localhost|127\.0\.0\.1)(:\*)?\//.test(permission);
  const removed = (manifest.host_permissions || []).filter(local);
  return {
    ...manifest,
    host_permissions: (manifest.host_permissions || []).filter((permission) => !local(permission)),
    optional_host_permissions: [
      ...new Set([
        ...(manifest.optional_host_permissions || []),
        ...removed.map((permission) => permission.replace(':*', '')),
        'http://127.0.0.1/*',
        'http://localhost/*',
      ]),
    ],
  };
}

if (require.main === module) {
  const manifestPath = path.join(__dirname, '../dist/manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  fs.writeFileSync(manifestPath, JSON.stringify(prepareManifest(manifest), null, 2));
  console.log('Store manifest prepared: local integrations require optional permission consent.');
}
module.exports = { prepareManifest };
