const fs = require('fs');

console.log("=== 1. MOTOR Y LLAMADA IA (jevEngineWhatsapp.ts) ===");
try {
  const engine = fs.readFileSync('src/jev/jevEngineWhatsapp.ts', 'utf8');
  const lines = engine.split('\n');
  lines.slice(0, 100).forEach((l, i) => {
    if (l.includes('export') || l.includes('function') || l.includes('fetch') || l.includes('async')) {
      console.log(`L${i+1}: ${l.trim()}`);
    }
  });
} catch(e) { console.log(e.message); }

console.log("\n=== 2. MÓDULOS Y LÍMITES EN hybrid-plans/page.tsx ===");
try {
  const plans = fs.readFileSync('src/app/(admin)/superadmin/hybrid-plans/page.tsx', 'utf8');
  const lines = plans.split('\n');
  lines.forEach((l, i) => {
    if (l.toLowerCase().includes('fideliz') || l.toLowerCase().includes('técnic') || l.toLowerCase().includes('technical') || l.includes('modules') || l.includes('modulos')) {
      if (i < 300) console.log(`L${i+1}: ${l.trim()}`);
    }
  });
} catch(e) { console.log(e.message); }

console.log("\n=== 3. MODAL GESTIONAR NEGOCIO (negocios/page.tsx) ===");
try {
  const neg = fs.readFileSync('src/app/(admin)/superadmin/negocios/page.tsx', 'utf8');
  const lines = neg.split('\n');
  lines.forEach((l, i) => {
    if (l.toLowerCase().includes('total') || l.toLowerCase().includes('extra') || l.toLowerCase().includes('modulo') || l.toLowerCase().includes('module')) {
      if (i < 200) console.log(`L${i+1}: ${l.trim()}`);
    }
  });
} catch(e) { console.log(e.message); }
