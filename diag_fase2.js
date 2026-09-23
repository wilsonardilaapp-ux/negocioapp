const fs = require('fs');

console.log('--- 1. DASHBOARD CATALOGO PAGE ---');
try {
  const p = fs.readFileSync('src/app/(dashboard)/dashboard/catalogo/page.tsx', 'utf8');
  console.log(p.slice(0, 1000));
} catch(e) { console.log('Error catalogo page:', e.message); }

console.log('\n--- 2. INPUT DE PRECIO EN PRODUCT-FORM ---');
try {
  const f = fs.readFileSync('src/components/catalogo/product-form.tsx', 'utf8');
  const lines = f.split('\n');
  const priceIndex = lines.findIndex(l => l.includes('name="price"') || l.includes("name='price'") || l.includes('price:'));
  if (priceIndex !== -1) {
    console.log(lines.slice(Math.max(0, priceIndex - 5), priceIndex + 25).join('\n'));
  } else {
    console.log('No se encontró price directamente. Buscando "price":');
    lines.filter(l => l.includes('price')).slice(0, 10).forEach(l => console.log(l.trim()));
  }
} catch(e) { console.log('Error product-form:', e.message); }
