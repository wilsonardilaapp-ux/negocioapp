const fs = require('fs');

console.log('--- 1. CARGA DE BUSINESS EN CATALOG/[BUSINESSID]/PAGE.TSX ---');
try {
  const page = fs.readFileSync('src/app/(public)/catalog/[businessId]/page.tsx', 'utf8');
  const lines = page.split('\n');
  const bIdx = lines.findIndex(l => l.includes("useDoc") || l.includes("businessDoc") || l.includes("'businesses'"));
  if (bIdx !== -1) {
    console.log(lines.slice(bIdx - 2, bIdx + 15).join('\n'));
  }
} catch(e) { console.log(e.message); }

console.log('\n--- 2. RENDER DE PRECIO EN PUBLIC-PRODUCT-CARD ---');
try {
  const card = fs.readFileSync('src/components/catalogo/public-product-card.tsx', 'utf8');
  const lines = card.split('\n');
  const pIdx = lines.findIndex(l => l.includes('{formatCurrency(product.price)}'));
  if (pIdx !== -1) {
    console.log(lines.slice(Math.max(0, pIdx - 10), pIdx + 10).join('\n'));
  }
} catch(e) { console.log(e.message); }

console.log('\n--- 3. SUBTOTAL Y FOOTER EN CART-DRAWER ---');
try {
  const cart = fs.readFileSync('src/components/catalogo/cart-drawer.tsx', 'utf8');
  const lines = cart.split('\n');
  const sIdx = lines.findIndex(l => l.includes('Subtotal aproximado'));
  if (sIdx !== -1) {
    console.log(lines.slice(Math.max(0, sIdx - 5), sIdx + 15).join('\n'));
  }
} catch(e) { console.log(e.message); }
