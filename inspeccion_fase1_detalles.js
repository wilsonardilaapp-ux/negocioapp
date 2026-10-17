const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

function showFile(filePath, maxLines = 120) {
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
  console.log(lines.slice(0, maxLines).join('\n'));
  if (lines.length > maxLines) {
    console.log(`\n... [truncado: ${lines.length - maxLines} líneas más] ...`);
  }
}

// 1. Modelo de módulos y acciones
showFile('src/models/module.ts');
showFile('src/actions/modules.ts', 80);

// 2. Modelo de productos y órdenes
const models = fs.readdirSync(path.join(ROOT, 'src/models')).filter(f => f.endsWith('.ts'));
console.log('\nModelos en src/models:', models);

['product.ts', 'dish.ts', 'order.ts', 'business.ts'].forEach(m => {
  if (fs.existsSync(path.join(ROOT, 'src/models', m))) {
    showFile(path.join('src/models', m), 70);
  }
});

// 3. Inspeccionar el catálogo público
showFile('src/app/(public)/catalog/[businessId]/page.tsx', 80);

// 4. Buscar componentes del catálogo público y tarjeta de producto
function findProductCard(dir) {
  try {
    const list = fs.readdirSync(dir);
    for (const item of list) {
      const full = path.join(dir, item);
      if (fs.statSync(full).isDirectory()) {
        if (!['node_modules', '.git', '.next'].includes(item)) findProductCard(full);
      } else if (item.toLowerCase().includes('card') || item.toLowerCase().includes('item') || item.toLowerCase().includes('product')) {
        const rel = path.relative(ROOT, full);
        if (rel.includes('catalog') || rel.includes('product')) {
          console.log('Componente producto candidato:', rel);
        }
      }
    }
  } catch(e) {}
}
console.log('\nBuscando componentes de tarjetas de producto:');
findProductCard(path.join(ROOT, 'src'));

