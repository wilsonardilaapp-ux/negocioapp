const fs = require('fs');
const pm = fs.readFileSync('src/components/catalogo/purchase-modal.tsx', 'utf8');
const lines = pm.split('\n');

console.log('--- 1. CÁLCULO DE TOTALES EN PURCHASE-MODAL ---');
const totIdx = lines.findIndex(l => l.includes('subtotalBeforeVat') || l.includes('finalDiscountAmount'));
if (totIdx !== -1) {
  console.log(lines.slice(Math.max(0, totIdx - 2), totIdx + 20).join('\n'));
}

console.log('\n--- 2. OBJETO NEWORDER Y WHATSAPP EN ONSUBMIT ---');
const subIdx = lines.findIndex(l => l.includes('onSubmit = async') || l.includes('const newOrder'));
if (subIdx !== -1) {
  console.log(lines.slice(subIdx, subIdx + 45).join('\n'));
}
