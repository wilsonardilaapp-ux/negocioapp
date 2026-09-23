const fs = require('fs');

console.log('--- 1. CÓMO SE INVOCA PURCHASE-MODAL EN CATALOG PAGE ---');
try {
  const page = fs.readFileSync('src/app/(public)/catalog/[businessId]/page.tsx', 'utf8');
  const lines = page.split('\n');
  const pIdx = lines.findIndex(l => l.includes('<PurchaseModal'));
  if (pIdx !== -1) {
    console.log(lines.slice(pIdx, pIdx + 15).join('\n'));
  }
} catch(e) { console.log(e.message); }

console.log('\n--- 2. PLANCONTEXT Y PRICINGCONTEXT EN CATALOG PAGE ---');
try {
  const page = fs.readFileSync('src/app/(public)/catalog/[businessId]/page.tsx', 'utf8');
  const lines = page.split('\n');
  const prIdx = lines.findIndex(l => l.includes('pricingContext =') || l.includes('const pricingContext'));
  if (prIdx !== -1) {
    console.log(lines.slice(Math.max(0, prIdx - 3), prIdx + 15).join('\n'));
  }
} catch(e) { console.log(e.message); }

console.log('\n--- 3. CÁLCULO DE SERVICEFEE EN PURCHASE-MODAL ---');
try {
  const pm = fs.readFileSync('src/components/catalogo/purchase-modal.tsx', 'utf8');
  const lines = pm.split('\n');
  const sIdx = lines.findIndex(l => l.includes('const serviceFee ='));
  if (sIdx !== -1) {
    console.log(lines.slice(Math.max(0, sIdx - 3), sIdx + 20).join('\n'));
  }
} catch(e) { console.log(e.message); }
