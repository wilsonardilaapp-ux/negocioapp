const fs = require('fs');
const path = require('path');

function findFiles(dir, filter) {
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    for (const file of list) {
      if (['node_modules', '.git', '.next'].includes(file)) continue;
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        results = results.concat(findFiles(fullPath, filter));
      } else if (filter(file, fullPath)) {
        results.push(fullPath.replace(/\\/g, '/'));
      }
    }
  } catch(e) {}
  return results;
}

console.log('--- 1. RUTAS EN APP ---');
const appFiles = findFiles('src/app', (name) => name.endsWith('.tsx') || name.endsWith('.ts'));
appFiles.forEach(f => {
  if (/(dish|plat|menu|cart|order|checkout|plan|subscri|bill)/i.test(f)) {
    console.log(f);
  }
});

console.log('\n--- 2. PRIMERAS LÍNEAS E IMPORTS DE HYBRID-BILLING ---');
try {
  const billingCode = fs.readFileSync('src/app/(admin)/superadmin/hybrid-billing/page.tsx', 'utf8');
  console.log(billingCode.slice(0, 1200));
} catch(e) {
  console.log('No se pudo leer hybrid-billing:', e.message);
}
