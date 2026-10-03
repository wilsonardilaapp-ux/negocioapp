const fs = require('fs');

console.log("=== 1. DEFAULT_MODULES EN module.ts ===");
try {
  console.log(fs.readFileSync('src/models/module.ts', 'utf8'));
} catch(e) {}

console.log("\n=== 2. CÓMO MODULOS/PAGE.TSX SINCRONIZA CON FIRESTORE ===");
try {
  const modPage = fs.readFileSync('src/app/(admin)/superadmin/modulos/page.tsx', 'utf8');
  const lines = modPage.split('\n');
  lines.slice(70, 120).forEach(l => console.log(l));
} catch(e) {}
