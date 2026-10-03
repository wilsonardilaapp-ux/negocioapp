const fs = require('fs');
try {
  const content = fs.readFileSync('src/app/(admin)/superadmin/negocios/page.tsx', 'utf8');
  const lines = content.split('\n');
  lines.forEach((l, i) => {
    if (l.includes('displayedModules.map') || l.includes('businessModulesState[') || l.includes('onCheckedChange')) {
      for (let j = Math.max(0, i - 5); j <= Math.min(lines.length - 1, i + 15); j++) {
        console.log(`L${j+1}: ${lines[j]}`);
      }
    }
  });
} catch(e) { console.log(e.message); }
