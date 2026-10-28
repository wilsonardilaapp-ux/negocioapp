const fs = require('fs');

console.log('--- 1. Búsqueda de POS en client-nav.tsx ---');
if (fs.existsSync('src/components/layout/client-nav.tsx')) {
  const lines = fs.readFileSync('src/components/layout/client-nav.tsx', 'utf8').split('\n');
  lines.forEach((l, i) => {
    if (/pos|terminal/i.test(l)) {
      console.log(`L${i+1}: ${l.trim()}`);
    }
  });
}

console.log('\n--- 2. Búsqueda de POS en src/models/module.ts ---');
if (fs.existsSync('src/models/module.ts')) {
  const lines = fs.readFileSync('src/models/module.ts', 'utf8').split('\n');
  lines.forEach((l, i) => {
    if (/pos|terminal/i.test(l)) {
      console.log(`L${i+1}: ${l.trim()}`);
    }
  });
}

console.log('\n--- 3. Primeras 80 líneas de src/app/(dashboard)/dashboard/pos/page.tsx ---');
if (fs.existsSync('src/app/(dashboard)/dashboard/pos/page.tsx')) {
  const lines = fs.readFileSync('src/app/(dashboard)/dashboard/pos/page.tsx', 'utf8').split('\n');
  console.log(lines.slice(0, 80).join('\n'));
}
