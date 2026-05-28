#!/usr/bin/env node
// Run: node generate-icons.js
// Requires: npm install canvas (optional) or use any SVG to PNG tool
// This creates placeholder icons for development

const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, 'public', 'icons');

if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

// Create minimal SVG icons that browsers can use
sizes.forEach((size) => {
  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="#4F46E5"/>
  <text x="50%" y="58%" font-family="Arial" font-size="${size * 0.45}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">B</text>
</svg>`;

  // Write as SVG (for development - production should use real PNG icons)
  fs.writeFileSync(path.join(iconsDir, `icon-${size}.svg`), svg);
  console.log(`Created icon-${size}.svg`);
});

console.log('Icons generated. For production, replace with proper PNG icons.');
