#!/usr/bin/env node

/**
 * Version Synchronization Script for Earth Agent
 *
 * Synchronizes version across:
 * - package.json (source of truth)
 * - src/manifest.json (Chrome extension)
 * - mcp-server/package.json (npm package)
 *
 * Usage:
 *   node scripts/version-sync.js           # Sync from package.json
 *   node scripts/version-sync.js 1.2.3     # Set specific version
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');

const FILES = {
  root: path.join(ROOT_DIR, 'package.json'),
  manifest: path.join(ROOT_DIR, 'src/manifest.json'),
  mcp: path.join(ROOT_DIR, 'mcp-server/package.json'),
};

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));

const writeJson = (filePath, data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
};

const isValidSemver = (version) =>
  /^\d+\.\d+\.\d+(-[\w.]+)?(\+[\w.]+)?$/.test(version);

const main = () => {
  const argVersion = process.argv[2];

  // Determine target version
  let version;
  if (argVersion) {
    if (!isValidSemver(argVersion)) {
      console.error(`Invalid semver: ${argVersion}`);
      process.exit(1);
    }
    version = argVersion;
  } else {
    version = readJson(FILES.root).version;
  }

  console.log(`Synchronizing version: ${version}\n`);

  // Update all files
  Object.entries(FILES).forEach(([name, filePath]) => {
    const data = readJson(filePath);
    const oldVersion = data.version;

    if (oldVersion === version) {
      console.log(`  ${name}: ${version} (unchanged)`);
    } else {
      data.version = version;
      writeJson(filePath, data);
      console.log(`  ${name}: ${oldVersion} -> ${version}`);
    }
  });

  console.log('\nVersion synchronization complete!');
};

main();
