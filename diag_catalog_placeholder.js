const fs = require('fs');

function searchCatalog(dir) {
  let res = [];
  for (const f of fs.readdirSync(dir)) {
    const full = `${dir}/${f}`;
    if (fs.statSync(full).isDirectory()) res = res.concat(searchCatalog(full));
    else if (/\.(tsx?)$/.test(f)) {
      const c = fs.readFileSync(full, 'utf8');
      if (c.includes('Package') || c.includes('ImageIcon') || c.includes('placeholder') || c.includes('no-image') || c.includes('hasImage')) {
        res.push(full);
      }
    }
  }
  return res;
}

const files = searchCatalog('src/components/catalogo');
console.log('Archivos con lógica de imagen en catálogo:', files);

files.forEach(f => {
  console.log(`\n--- ${f} ---`);
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  lines.forEach((l, i) => {
    if (l.includes('Package') || l.includes('hasImage') || l.includes('imgError') || l.includes('Image') || l.includes('placeholder')) {
      console.log(`L${i}:`, l.trim());
    }
  });
});
