const fs = require('fs');

console.log("=== MODELO DE MÓDULOS (src/models/module.ts) ===");
try {
  const mod = fs.readFileSync('src/models/module.ts', 'utf8');
  console.log(mod.slice(0, 1200));
} catch(e) { console.log(e.message); }

console.log("\n=== LÍMITES TÉCNICOS EXTRA EN hybrid-plans/page.tsx ===");
try {
  const plans = fs.readFileSync('src/app/(admin)/superadmin/hybrid-plans/page.tsx', 'utf8');
  const lines = plans.split('\n');
  lines.forEach((l, i) => {
    if (l.toLowerCase().includes('técnicos extra') || l.toLowerCase().includes('technical') || l.includes('fideliz') || l.includes('limite') || l.includes('limit')) {
      if (i > 250 && i < 450) console.log(`L${i+1}: ${l.trim()}`);
    }
  });
} catch(e) { console.log(e.message); }
