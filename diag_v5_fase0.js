const fs = require('fs');

console.log('--- 1. MODELO DE PEDIDOS Y CANAL (ORDER.TS) ---');
try {
  const o = fs.readFileSync('src/models/order.ts', 'utf8');
  const lines = o.split('\n');
  lines.filter(l => /(channel|canal|mesa|table|delivery|type|tipo|serviceFee)/i.test(l)).slice(0, 15).forEach(l => console.log(l.trim()));
} catch(e) { console.log('Error order.ts:', e.message); }

console.log('\n--- 2. EDITOR DE PLANES HÍBRIDOS (PESTAÑA COSTOS) ---');
try {
  const p = fs.readFileSync('src/app/(admin)/superadmin/hybrid-plans/page.tsx', 'utf8');
  const lines = p.split('\n');
  const costIdx = lines.findIndex(l => l.includes('Tarifa Base Mensual') || l.includes('pricePerOrder') || l.includes('commissionType'));
  if (costIdx !== -1) {
    console.log(lines.slice(Math.max(0, costIdx - 5), costIdx + 30).join('\n'));
  }
} catch(e) { console.log('Error hybrid-plans:', e.message); }

console.log('\n--- 3. RESUMEN DE COMPRA EN PURCHASE-MODAL ---');
try {
  const pm = fs.readFileSync('src/components/catalogo/purchase-modal.tsx', 'utf8');
  const lines = pm.split('\n');
  const sumIdx = lines.findIndex(l => /resumen/i.test(l) || l.includes('Subtotal') || l.includes('totalOrder'));
  if (sumIdx !== -1) {
    console.log(lines.slice(Math.max(0, sumIdx - 2), sumIdx + 25).join('\n'));
  } else {
    lines.filter(l => /(subtotal|shipping|delivery|packaging|tax|total)/i.test(l)).slice(0, 15).forEach(l => console.log(l.trim()));
  }
} catch(e) { console.log('Error purchase-modal:', e.message); }
