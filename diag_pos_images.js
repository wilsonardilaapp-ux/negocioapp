const fs = require('fs');

console.log('--- 1. ARCHIVOS DE POS ---');
function findFiles(dir, match) {
  let res = [];
  try {
    for (const f of fs.readdirSync(dir)) {
      const full = `${dir}/${f}`;
      if (['node_modules', '.git', '.next'].includes(f)) continue;
      if (fs.statSync(full).isDirectory()) res = res.concat(findFiles(full, match));
      else if (match(full)) res.push(full);
    }
  } catch(e) {}
  return res;
}

const posFiles = findFiles('src', (f) => f.includes('pos') && /\.(tsx?)$/.test(f));
console.log(posFiles);

console.log('\n--- 2. RENDER DE PRODUCTO EN POS PAGE ---');
try {
  const posPage = fs.readFileSync('src/app/(dashboard)/dashboard/pos/page.tsx', 'utf8');
  const lines = posPage.split('\n');
  lines.forEach((l, i) => {
    if (l.includes('images') || l.includes('Image') || l.includes('img') || l.includes('placeholder') || l.includes('Package') || l.includes('aspect-square')) {
      if (i > 100) console.log(`Línea ${i}:`, l.trim());
    }
  });
} catch(e) { console.log('Error pos page:', e.message); }
