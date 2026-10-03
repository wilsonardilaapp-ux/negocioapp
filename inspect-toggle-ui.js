const fs = require('fs');
try {
  const content = fs.readFileSync('src/app/(admin)/superadmin/negocios/page.tsx', 'utf8');
  const lines = content.split('\n');
  lines.forEach((l, i) => {
    if (l.includes('businessModulesState') || l.includes('toggleModuleAssignment') || l.includes('Switch') || l.includes('checked=')) {
      if (i > 150 && i < 350) console.log(`L${i+1}: ${l}`);
    }
  });
} catch(e) { console.log(e.message); }
