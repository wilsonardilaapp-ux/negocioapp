const fs = require('fs');

console.log('--- 1. CÓMO CARGA EL NEGOCIO CATALOG/[BUSINESSID]/PAGE.TSX ---');
try {
  const page = fs.readFileSync('src/app/(public)/catalog/[businessId]/page.tsx', 'utf8');
  const lines = page.split('\n');
  console.log(lines.slice(0, 50).filter(l => l.includes('business') || l.includes('Business') || l.includes('use') || l.includes('params')).join('\n'));
} catch(e) { console.log('Error page:', e.message); }

console.log('\n--- 2. PRECIO EN PUBLIC-PRODUCT-CARD.TSX ---');
try {
  const card = fs.readFileSync('src/components/catalogo/public-product-card.tsx', 'utf8');
  const lines = card.split('\n');
  lines.filter(l => l.includes('price') || l.includes('Precio') || l.includes('formatCurrency') || l.includes('$')).slice(0, 10).forEach(l => console.log(l.trim()));
} catch(e) { console.log('Error public card:', e.message); }

console.log('\n--- 3. LÍNEAS DE TOTAL EN CART-DRAWER.TSX ---');
try {
  const cart = fs.readFileSync('src/components/catalogo/cart-drawer.tsx', 'utf8');
  const lines = cart.split('\n');
  lines.filter(l => l.includes('total') || l.includes('Total') || l.includes('subtotal') || l.includes('price')).slice(0, 15).forEach(l => console.log(l.trim()));
} catch(e) { console.log('Error cart drawer:', e.message); }
