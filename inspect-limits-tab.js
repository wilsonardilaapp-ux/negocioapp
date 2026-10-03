const fs = require('fs');
try {
  const content = fs.readFileSync('src/app/(admin)/superadmin/hybrid-plans/page.tsx', 'utf8');
  const lines = content.split('\n');
  let inLimitsTab = false;
  lines.forEach((l, i) => {
    if (l.includes('value="limits"') || l.includes('Límites Técnicos') || l.includes('fidelizacion') || l.includes('Fidelización')) {
      for (let j = Math.max(0, i - 5); j <= Math.min(lines.length - 1, i + 35); j++) {
        console.log(`L${j+1}: ${lines[j]}`);
      }
    }
  });
} catch(e) { console.log(e.message); }
