const fs = require('fs');
try {
  const utils = fs.readFileSync('src/lib/utils.ts', 'utf8');
  const lines = utils.split('\n');
  lines.forEach((l, i) => {
    if (l.toLowerCase().includes('normalize') || l.toLowerCase().includes('module')) {
      console.log(`L${i+1}: ${l}`);
    }
  });
} catch(e) { console.log(e.message); }
