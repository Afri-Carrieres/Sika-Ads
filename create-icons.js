const fs = require('fs');
const path = require('path');

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="20" fill="#22c55e"/>
  <text x="50" y="65" font-family="Arial, sans-serif" font-size="50" font-weight="bold" fill="white" text-anchor="middle">A</text>
  <circle cx="75" cy="25" r="15" fill="#fbbf24"/>
  <text x="75" y="31" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#22c55e" text-anchor="middle">$</text>
</svg>`;

const publicDir = path.join(__dirname, 'public');

fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgContent);
fs.writeFileSync(path.join(publicDir, 'mask-icon.svg'), svgContent);

console.log('Icons created successfully!');

