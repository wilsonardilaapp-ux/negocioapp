const fs = require('fs');
try {
  const content = fs.readFileSync('src/app/(admin)/superadmin/negocios/page.tsx', 'utf8');
  const lines = content.split('\n');
  lines.forEach((l, i) => {
    if (l.includes('modules') || l.includes('businessModulesState') || l.includes('moduleExtras')) {
      if (i > 130 && i < 260) console.log(`L${i+1}: ${l}`);
    }
  });
} catch(e) { console.log(e.message); }
