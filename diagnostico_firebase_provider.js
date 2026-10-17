const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();

function searchInFiles(dir, needle) {
  const matches = [];
  function rec(d) {
    try {
      const items = fs.readdirSync(d);
      for (const item of items) {
        if (['node_modules', '.git', '.next', 'dist', 'build'].includes(item)) continue;
        const full = path.join(d, item);
        if (fs.statSync(full).isDirectory()) {
          rec(full);
        } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
          const content = fs.readFileSync(full, 'utf8');
          if (content.includes(needle)) {
            matches.push(path.relative(ROOT, full));
          }
        }
      }
    } catch (e) {}
  }
  rec(dir);
  return matches;
}

const provFiles = searchInFiles(path.join(ROOT, 'src'), 'isNetworkEnabled');
console.log('Archivos con isNetworkEnabled:', provFiles);

provFiles.forEach(f => {
  if (f.includes('provider') || f.includes('firebase') || f.includes('context')) {
    console.log(`\n--- ${f} ---`);
    const lines = fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n');
    lines.slice(0, 50).forEach((l, i) => console.log(`${i+1}: ${l}`));
  }
});
