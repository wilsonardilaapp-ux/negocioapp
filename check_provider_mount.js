const fs = require('fs');

function search(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = dir + '/' + f;
    if (fs.statSync(full).isDirectory()) {
      if (!['node_modules', '.next', '.git'].includes(f)) search(full);
    } else if (f.endsWith('.tsx') || f.endsWith('.ts')) {
      const c = fs.readFileSync(full, 'utf8');
      if (c.includes('<FirebaseProvider') || c.includes('FirebaseClientProvider')) {
        console.log(`Coincidencia en: ${full}`);
        c.split('\n').forEach((l, i) => {
          if (l.includes('FirebaseProvider') || l.includes('FirebaseClientProvider')) {
            console.log(`  L${i+1}: ${l.trim()}`);
          }
        });
      }
    }
  }
}
search('src');
