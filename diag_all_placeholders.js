const fs = require('fs');

function searchFiles(dir) {
  let results = [];
  for (const f of fs.readdirSync(dir)) {
    const full = `${dir}/${f}`;
    if (['node_modules', '.git', '.next'].includes(f)) continue;
    if (fs.statSync(full).isDirectory()) results = results.concat(searchFiles(full));
    else if (/\.(tsx?)$/.test(f)) {
      const c = fs.readFileSync(full, 'utf8');
      if (c.includes('Package') && (c.includes('product') || c.includes('item'))) {
        results.push(full);
      }
    }
  }
  return results;
}

const matches = searchFiles('src');
console.log('Archivos con Package + product/item:');
matches.forEach(m => {
  console.log(`\n--- ${m} ---`);
  const lines = fs.readFileSync(m, 'utf8').split('\n');
  lines.forEach((l, i) => {
    if (l.includes('<Package') || l.includes('Package size') || l.includes('text-muted-foreground/20') || l.includes('bg-muted')) {
      console.log(`L${i}:`, lines.slice(Math.max(0, i - 1), i + 3).join('\n'));
    }
  });
});
