const fs = require('fs');

console.log('--- 1. HYBRID PLAN SIMULATOR (REVISIÓN DE %) ---');
try {
  const s = fs.readFileSync('src/app/(dashboard)/dashboard/subscription/components/HybridPlanSimulator.tsx', 'utf8');
  console.log(s.split('\n').filter(l => l.includes('%') || l.includes('Comisión') || l.includes('comision')).slice(0, 10).join('\n'));
} catch(e) { console.log(e.message); }

console.log('\n--- 2. PLAN COMPARISON TABLE (REVISIÓN DE %) ---');
try {
  const t = fs.readFileSync('src/app/(dashboard)/dashboard/subscription/components/PlanComparisonTable.tsx', 'utf8');
  console.log(t.split('\n').filter(l => l.includes('%') || l.includes('Comisión') || l.includes('comision') || l.includes('pricePerOrder')).slice(0, 10).join('\n'));
} catch(e) { console.log(e.message); }
