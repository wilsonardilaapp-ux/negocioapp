const fs = require('fs');
const path = require('path');

function searchInFiles(dir, pattern) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      if (['node_modules', '.git', '.next'].includes(e.name)) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) searchInFiles(full, pattern);
      else if (/\.(tsx|ts|jsx|js)$/.test(e.name)) {
        const txt = fs.readFileSync(full, 'utf8');
        if (pattern.test(txt)) {
          console.log(`• En ${full.replace(process.cwd(), '')}`);
          const lines = txt.split('\n');
          lines.forEach((l, i) => {
            if (pattern.test(l)) console.log(`   L${i+1}: ${l.trim()}`);
          });
        }
      }
    }
  } catch(e) {}
}

console.log('--- Buscando chatbot-menu-publico ---');
searchInFiles('src', /chatbot-menu-publico/i);

console.log('\n--- Buscando chatbot-menu en client-nav ---');
if (fs.existsSync('src/components/layout/client-nav.tsx')) {
  const lines = fs.readFileSync('src/components/layout/client-nav.tsx', 'utf8').split('\n');
  lines.forEach((l, i) => {
    if (/chatbot/i.test(l)) console.log(`   L${i+1}: ${l.trim()}`);
  });
}
