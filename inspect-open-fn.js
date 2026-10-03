const fs = require('fs');
try {
  const content = fs.readFileSync('src/app/(admin)/superadmin/negocios/page.tsx', 'utf8');
  const lines = content.split('\n');
  let found = false;
  let count = 0;
  lines.forEach((l, i) => {
    if (l.includes('const openManageBusiness')) found = true;
    if (found && count < 55) {
      console.log(`L${i+1}: ${l}`);
      count++;
    }
  });
} catch(e) { console.log(e.message); }
