const fs = require('fs');
const s = fs.readFileSync('views/LegalView.tsx', 'utf8');
const lines = s.split('\n');
const pattern = /(?:\b[dlnt] (?:[a-zàâçéèêëîïôûùüÿœ]{2,}))/g;
let found = 0;
lines.forEach((line, i) => {
  const inText = /['>][^<>]*\b[dlnt] [a-zàâçéèêëîïôûùüÿœ]/.test(line);
  const m = line.match(/\b(?:d|l|n|t) (?:[a-zàâçéèêëîïôûùüÿœ]{2,})/g);
  if (m && inText) {
    m.forEach((x) => {
      if (!/\bdonne|d date/.test(x)) {
        console.log(`L${i + 1}: ${x}`);
        found++;
      }
    });
  }
});
if (!found) console.log('OK: aucune élision avec espace simple détectée');
