const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();

const catPage = path.join(ROOT, 'src/app/(dashboard)/dashboard/catalogo/page.tsx');
if (!fs.existsSync(catPage)) {
  console.log('No existe page.tsx de catalogo');
  process.exit(1);
}

const lines = fs.readFileSync(catPage, 'utf8').split('\n');

console.log('--- Buscando botones o cabecera de la tabla de productos ---');
lines.forEach((l, i) => {
  if (l.includes('<TableHead') || l.includes('PlusCircle') || l.includes('Acciones') || l.includes('setDocumentNonBlocking')) {
    console.log(`Línea ${i + 1}: ${l.trim()}`);
  }
});

console.log('\n--- Buscando renderizado de acciones por fila de producto ---');
lines.forEach((l, i) => {
  if (l.includes('handleDeleteProduct') || l.includes('handleEdit') || (l.includes('<Button') && lines.slice(Math.max(0, i-5), i+5).some(x => x.includes('Trash') || x.includes('Edit')))) {
    console.log(`Línea ${i + 1}: ${l.trim()}`);
  }
});
