const fs = require('fs');
const code = fs.readFileSync('src/app/(admin)/superadmin/hybrid-plans/page.tsx', 'utf8');
const lines = code.split('\n');

const dialogIdx = lines.findIndex(l => l.includes('function HybridPlanDialog') || l.includes('const HybridPlanDialog'));
if (dialogIdx !== -1) {
  console.log('--- ENCABEZADO Y FORM DEL DIALOG ---');
  console.log(lines.slice(dialogIdx, dialogIdx + 45).join('\n'));
}

const tabCostIdx = lines.findIndex(l => l.includes('value="costs"') || l.includes('value="costos"') || l.includes('Configuración de Comisión'));
if (tabCostIdx !== -1) {
  console.log('\n--- PESTAÑA COSTOS EN JSX ---');
  console.log(lines.slice(Math.max(0, tabCostIdx - 5), tabCostIdx + 45).join('\n'));
}
