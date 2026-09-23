const fs = require('fs');

console.log('--- BUSCANDO ESCRITURA EN publicData EN CATALOGO/PAGE.TSX ---');
const code = fs.readFileSync('src/app/(dashboard)/dashboard/catalogo/page.tsx', 'utf8');
const lines = code.split('\n');

lines.forEach((l, i) => {
  if (l.includes('publicData') || l.includes('publicCatalogRef') || l.includes("'catalog'")) {
    console.log(`Línea ${i}:`, lines.slice(Math.max(0, i - 3), i + 15).join('\n'));
    console.log('==============================');
  }
});
