const fs = require('fs');
const path = require('path');

const root = process.cwd();
const exts = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.html', '.css', '.env', '.toml', '.yml', '.yaml']);

function replaceSikaAds(match) {
  if (match === match.toUpperCase()) return 'SIKAADS';
  if (match === match.toLowerCase()) return 'sikaads';
  return 'SikaAds';
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      walk(full);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (exts.has(ext) || entry.name === '.env' || entry.name.endsWith('env.local')) {
        try {
          const txt = fs.readFileSync(full, 'utf8');
          if (/adwallet/i.test(txt)) {
            const newTxt = txt.replace(/adwallet/gi, replaceSikaAds);
            fs.writeFileSync(full, newTxt, 'utf8');
            console.log('Updated:', full);
          }
        } catch (err) {
          console.error('Err', full, err.message);
        }
      }
    }
  }
}

walk(root);
console.log('Done');
