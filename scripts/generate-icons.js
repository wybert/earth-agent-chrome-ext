#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');

// Check if we have the required tools
try {
  execSync('which convert', { stdio: 'ignore' });
} catch (error) {
  console.log('ImageMagick not found. Installing via Homebrew...');
  try {
    execSync('brew install imagemagick', { stdio: 'inherit' });
  } catch (installError) {
    console.error('Failed to install ImageMagick. Please install it manually:');
    console.error('brew install imagemagick');
    process.exit(1);
  }
}

const sizes = [16, 32, 48, 128];
const inputSvg = 'src/assets/icon-optimized.svg';

console.log('Generating PNG icons from optimized SVG...');

sizes.forEach(size => {
  const outputFile = `src/assets/icon${size}.png`;
  const command = `convert -background transparent -density 300 "${inputSvg}" -resize ${size}x${size} "${outputFile}"`;
  
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✓ Generated ${outputFile}`);
  } catch (error) {
    console.error(`✗ Failed to generate ${outputFile}:`, error.message);
  }
});

console.log('\nIcon generation complete!');
console.log('New PNG files have been created with improved clarity and contrast.');