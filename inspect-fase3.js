const fs = require('fs');

console.log("=== 1. IMPORTACIONES DE FIREBASE EN contextAggregatorWhatsapp.ts ===");
try {
  const content = fs.readFileSync('src/jev/contextAggregatorWhatsapp.ts', 'utf8');
  const lines = content.split('\n');
  lines.slice(0, 30).forEach((l, i) => console.log(`L${i+1}: ${l}`));
} catch(e) { console.log(e.message); }

console.log("\n=== 2. CÓMO LEE NEGOCIO Y PLAN EN negocios/page.tsx ===");
try {
  const content = fs.readFileSync('src/app/(admin)/superadmin/negocios/page.tsx', 'utf8');
  const lines = content.split('\n');
  lines.slice(0, 35).forEach((l, i) => console.log(`L${i+1}: ${l}`));
} catch(e) { console.log(e.message); }
