const fs = require('fs');

const code = fs.readFileSync('src/app/(admin)/superadmin/hybrid-billing/page.tsx', 'utf8');
const lines = code.split('\n');

console.log('--- 1. CÁLCULO ACTUAL DE COMISIONES Y FILTROS ---');
const calcIdx = lines.findIndex(l => l.includes('calculateBilling') || l.includes('isSameMonth') || l.includes('recalculate'));
if (calcIdx !== -1) {
  console.log(lines.slice(Math.max(0, calcIdx - 5), calcIdx + 30).join('\n'));
}

console.log('\n--- 2. PLANTILLA ACTUAL DE WHATSAPP ---');
const waIdx = lines.findIndex(l => l.includes('whatsapp') || l.includes('api.whatsapp.com') || l.includes('wa.me') || l.includes('Enviar Cobro'));
if (waIdx !== -1) {
  console.log(lines.slice(Math.max(0, waIdx - 5), waIdx + 25).join('\n'));
}

console.log('\n--- 3. FILTRO DE NEGOCIOS ---');
const bIdx = lines.findIndex(l => l.includes('businesses.map') || l.includes('businesses.filter') || l.includes('for (const business of businesses)'));
if (bIdx !== -1) {
  console.log(lines.slice(Math.max(0, bIdx - 2), bIdx + 15).join('\n'));
}
