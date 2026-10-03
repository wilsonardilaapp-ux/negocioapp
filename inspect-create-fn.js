const fs = require('fs');
try {
  const content = fs.readFileSync('src/app/(admin)/superadmin/negocios/page.tsx', 'utf8');
  const lines = content.split('\n');
  lines.forEach((l, i) => {
    if (l.includes('async function') || l.includes('const handle') || l.includes('create') || l.includes('add')) {
      if (l.toLowerCase().includes('business') || l.toLowerCase().includes('negocio')) {
        console.log(`L${i+1}: ${l.trim()}`);
      }
    }
  });
} catch(e) { console.log(e.message); }
