const fs = require('fs');
const path = require('path');

function searchFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (['node_modules', '.git', '.next', 'dist'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      searchFiles(full);
    } else if (entry.isFile() && /\.(ts|tsx|js)$/.test(entry.name)) {
      const content = fs.readFileSync(full, 'utf8');
      if (content.includes('DEFAULT_MODULES') || content.includes('/modules')) {
        const lines = content.split('\n');
        lines.forEach((l, i) => {
          if (l.includes('DEFAULT_MODULES') || l.includes('modules')) {
            console.log(`${path.relative(process.cwd(), full)}:L${i+1} -> ${l.trim()}`);
          }
        });
      }
    }
  }
}
searchFiles(process.cwd());
