const fs = require('fs');

console.log('--- 1. MODELO HYBRID-PLAN ---');
try {
  console.log(fs.readFileSync('src/models/hybrid-plan.ts', 'utf8').slice(0, 600));
} catch(e) { console.log(e.message); }

console.log('\n--- 2. TOTALES EN PURCHASE-MODAL JSX ---');
try {
  const pm = fs.readFileSync('src/components/catalogo/purchase-modal.tsx', 'utf8');
  const lines = pm.split('\n');
  const totalsIdx = lines.findIndex(l => l.includes('subtotal') && (l.includes('deliveryFee') || l.includes('packagingFee') || l.includes('totalFinal')));
  if (totalsIdx !== -1) {
    console.log(lines.slice(Math.max(0, totalsIdx - 5), totalsIdx + 35).join('\n'));
  } else {
    lines.filter(l => l.includes('deliveryFee') || l.includes('packagingFee') || l.includes('vatAmount') || l.includes('totalOrder')).slice(0, 15).forEach(l => console.log(l.trim()));
  }
} catch(e) { console.log(e.message); }
