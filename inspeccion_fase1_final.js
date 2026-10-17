const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();

function showSnippet(filePath, filterText = null, linesAround = 25) {
  const full = path.join(ROOT, filePath);
  if (!fs.existsSync(full)) {
    console.log(`[NO EXISTE] ${filePath}`);
    return;
  }
  console.log(`\n==================================================`);
  console.log(`📄 ARCHIVO: ${filePath}`);
  console.log(`==================================================`);
  const content = fs.readFileSync(full, 'utf8');
  const lines = content.split('\n');

  if (!filterText) {
    console.log(lines.slice(0, 50).join('\n'));
    return;
  }

  const idx = lines.findIndex(l => l.toLowerCase().includes(filterText.toLowerCase()));
  if (idx !== -1) {
    const start = Math.max(0, idx - 10);
    const end = Math.min(lines.length, idx + linesAround);
    console.log(`... [Línea ${start + 1} a ${end}] ...`);
    console.log(lines.slice(start, end).join('\n'));
  } else {
    console.log(`[No se encontró match para "${filterText}"]`);
    console.log(lines.slice(0, 40).join('\n'));
  }
}

// 1. Cómo se autorizan módulos en useSubscription
showSnippet('src/hooks/useSubscription.ts', 'isModuleAuthorized', 40);

// 2. Cómo se consultan o guardan pedidos
showSnippet('src/app/(dashboard)/dashboard/pedidos/page.tsx', 'collection', 35);

// 3. Estructura de public-product-card.tsx alrededor del precio
showSnippet('src/components/catalogo/public-product-card.tsx', 'price', 40);

// 4. Estructura de la cabecera y acciones en dashboard catalogo
showSnippet('src/app/(dashboard)/dashboard/catalogo/page.tsx', 'product', 40);

