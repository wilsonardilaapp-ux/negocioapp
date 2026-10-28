const fs = require('fs');
const path = require('path');

function search(dir, pattern) {
  try {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (['node_modules', '.git', '.next'].includes(e.name)) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) search(full, pattern);
      else if (/\.(tsx|ts|jsx|js)$/.test(e.name)) {
        const txt = fs.readFileSync(full, 'utf8');
        if (pattern.test(txt)) {
          console.log(`• ${full.replace(process.cwd(), '')}`);
        }
      }
    }
  } catch(e) {}
}

search('src', /business-directory/i);
