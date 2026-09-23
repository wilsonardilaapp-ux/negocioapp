const fs = require('fs');

console.log('--- 1. IMPORT DE PRODUCTCATALOG EN POS/PAGE.TSX ---');
const posPage = fs.readFileSync('src/app/(dashboard)/dashboard/pos/page.tsx', 'utf8');
const lines = posPage.split('\n');
lines.filter(l => l.includes('ProductCatalog')).forEach(l => console.log(l));

console.log('\n--- 2. LÍNEAS DE RENDER EN BILLING/PRODUCTCATALOG.TSX ---');
const catalogCode = fs.readFileSync('src/components/billing/ProductCatalog.tsx', 'utf8');
const cLines = catalogCode.split('\n');
const idx = cLines.findIndex(l => l.includes('ProductItemImage') || l.includes('aspect-square'));
if (idx !== -1) {
  console.log(cLines.slice(Math.max(0, idx - 5), idx + 25).join('\n'));
} else {
  console.log('No se encontró ProductItemImage en ProductCatalog.tsx');
}
